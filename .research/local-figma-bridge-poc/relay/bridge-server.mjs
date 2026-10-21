import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { WebSocket, WebSocketServer } from "ws";
import {
  ALLOWED_COMMANDS,
  FIGMA_PLUGIN_ORIGIN,
  LOOPBACK_HOST,
  TASK_ID,
  WORKSPACE_ID,
} from "./protocol.mjs";
import {
  createPairingNonce,
  createPairingProof,
  PairingStore,
  PAIRING_PROTOCOL_VERSION,
  verifyPairingProof,
} from "./pairing-store.mjs";
import { TaskAuthorizationStore } from "./task-authorization-store.mjs";
import { MutationAudit } from "./mutation-audit.mjs";
import { DESIGN_ACTIONS, designPayload } from "../design/commands.mjs";
import { ASSET_TRANSFER_COMMANDS, ASSET_TRANSFER_LIMITS } from "../design/asset-transfer.mjs";
import { MAX_DESIGN_TIMEOUT_MS } from "../design/request-timeout.mjs";

const MAX_MESSAGE_BYTES = 8 * 1024 * 1024;
const DENIED_FILE_IDENTITIES_ENV = "LOCAL_FIGMA_BRIDGE_DENIED_FILE_IDENTITIES";
const ALLOWED_FILE_IDENTITIES_ENV = "LOCAL_FIGMA_BRIDGE_ALLOWED_FILE_IDENTITIES";
const STABLE_FILE_IDENTITY = /^figma-file:[A-Za-z0-9_-]+$/;
const HANDSHAKE_TIMEOUT_MS = 8_000;
const CONNECTION_IDLE_TIMEOUT_MS = 35_000;
const AUTH_CHALLENGE_TTL_MS = 10_000;
const READ_COMMANDS = new Set(["status", "read_document", "scope_read_node"]);
const TEST_FIXTURE_COMMANDS = new Set(["scope_create_foreign_fixture", "scope_delete_foreign_fixture"]);
const ACTION_BY_COMMAND = Object.freeze({
  ...DESIGN_ACTIONS,
  create_poc: "create", create_text: "create", set_layout: "update", update_poc: "update",
  create_prototype_sample: "prototype", export_poc: "export", delete_poc_owned: "delete",
  scope_create_frame: "create", scope_update_frame: "update", scope_delete_node: "delete",
  scope_set_prototype: "prototype",
  scope_create_foreign_fixture: "test_fixture", scope_delete_foreign_fixture: "test_fixture",
});

function boundedString(value, maxLength = 240) {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}

function configuredFileIdentities(envName, env = process.env) {
  const raw = env[envName] ?? "";
  if (typeof raw !== "string") throw new Error(`${envName}_INVALID`);
  const identities = new Set();
  for (const value of raw.split(/[\r\n,]/)) {
    const identity = value.trim();
    if (!identity) continue;
    if (!STABLE_FILE_IDENTITY.test(identity)) throw new Error(`${envName}_INVALID`);
    identities.add(identity);
  }
  return identities;
}

function validFileIdentitySet(identities) {
  return identities instanceof Set && [...identities].every((identity) =>
    typeof identity === "string" && STABLE_FILE_IDENTITY.test(identity));
}

function writeTargetPolicyError(metadata, deniedFileIdentities, allowedFileIdentities) {
  if (typeof metadata?.fileIdentity === "string" &&
      deniedFileIdentities.has(metadata.fileIdentity)) return "FILE_IDENTITY_DENIED";
  if (metadata?.fileIdentityQuality !== "stable" ||
      typeof metadata.fileIdentity !== "string" || !STABLE_FILE_IDENTITY.test(metadata.fileIdentity)) {
    return "WRITE_REQUIRES_STABLE_FILE_IDENTITY";
  }
  if (!allowedFileIdentities.has(metadata.fileIdentity)) return "FILE_IDENTITY_NOT_ALLOWLISTED";
  return null;
}

function validClientId(value) {
  return typeof value === "string" && /^client-[a-z0-9-]{8,100}$/.test(value);
}

function parseJson(raw) {
  try {
    return JSON.parse(raw.toString());
  } catch {
    return null;
  }
}

function auditErrorCode(error, fallback = "MUTATION_REJECTED") {
  const message = error instanceof Error ? error.message : String(error);
  return /^[A-Z][A-Z0-9_]+/.exec(message)?.[0] ?? fallback;
}

function rejectStalePending(connection, pending) {
  if (pending.connection !== connection) return true;
  return (
    pending.connectionId !== connection.connectionId ||
    pending.sessionId !== connection.metadata.sessionId ||
    pending.fileIdentity !== connection.metadata.fileIdentity
  );
}

// A synchronous DesignSpec operation can pause the plugin iframe's heartbeat.
// Defer only for its original bounded request deadline; never renew lastSeen.
export function deferIdleCloseForDesignRequest(connection, pending, now = Date.now()) {
  if (!connection?.metadata || connection.authenticated !== true || connection.ready !== true ||
      connection.socket.readyState !== WebSocket.OPEN || !Number.isFinite(now)) return false;
  for (const entry of pending.values()) {
    if (!Object.hasOwn(DESIGN_ACTIONS, entry.command) || rejectStalePending(connection, entry)) continue;
    const duration = entry.deadlineAt - entry.startedAt;
    if (Number.isFinite(entry.startedAt) && Number.isFinite(entry.deadlineAt) &&
        entry.startedAt <= now && duration > 0 && duration <= MAX_DESIGN_TIMEOUT_MS &&
        now < entry.deadlineAt) return true;
  }
  return false;
}

export async function startBridge({ port, requestTimeoutMs = 12_000, logger, allowTestFixtures = false,
  deniedFileIdentities = configuredFileIdentities(DENIED_FILE_IDENTITIES_ENV),
  allowedFileIdentities = configuredFileIdentities(ALLOWED_FILE_IDENTITIES_ENV),
  pairingStore: suppliedPairingStore, authorizationStore: suppliedAuthorizationStore,
  auditJournal: suppliedAuditJournal } = {}) {
  if (!validFileIdentitySet(deniedFileIdentities)) throw new Error("DENIED_FILE_IDENTITIES_INVALID");
  if (!validFileIdentitySet(allowedFileIdentities)) throw new Error("ALLOWED_FILE_IDENTITIES_INVALID");
  const pending = new Map();
  const pairingStore = suppliedPairingStore ?? new PairingStore();
  await pairingStore.initialize();
  const authorizationStore = suppliedAuthorizationStore ?? new TaskAuthorizationStore();
  await authorizationStore.initialize();
  const auditJournal = suppliedAuditJournal ?? new MutationAudit({
    filePath: fileURLToPath(new URL('../state/mutation-audit.jsonl', import.meta.url)),
  });
  let pairingBootstrap = null;
  let activeConnection = null;
  let closed = false;
  const record = (entry) => {
    const event = { time: new Date().toISOString(), ...entry };
    try {
      if (logger) logger(event);
      else process.stderr.write(`[local-figma-bridge-poc/ws] ${JSON.stringify(event)}\n`);
    } catch {
      // Diagnostics must never interrupt the MCP protocol or a Figma operation.
    }
  };

  const wss = new WebSocketServer({
    host: LOOPBACK_HOST,
    port,
    maxPayload: MAX_MESSAGE_BYTES,
    verifyClient: (info, done) => {
      if (info.origin !== FIGMA_PLUGIN_ORIGIN && info.origin !== "null") {
        done(false, 403, "Only the Figma Desktop plugin origin is allowed");
        return;
      }
      done(true);
    },
  });

  await new Promise((resolve, reject) => {
    const onError = (error) => {
      wss.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      wss.off("error", onError);
      resolve();
    };
    wss.once("error", onError);
    wss.once("listening", onListening);
  });

  function closePendingFor(connection, reason) {
    for (const [requestId, entry] of pending) {
      if (entry.connection !== connection) continue;
      clearTimeout(entry.timer);
      pending.delete(requestId);
      try {
        entry.audit?.("OUTCOME_UNKNOWN", { errorCode: "TRANSPORT_DISCONNECTED",
          result: "unknown", latencyMs: Date.now() - entry.startedAt });
        entry.reject(new Error(reason));
      } catch (error) { entry.reject(new Error(`AUDIT_WRITE_FAILED: ${error.message}`)); }
    }
  }

  function pairingFor(connection) {
    const metadata = connection.metadata;
    if (!metadata?.serverId || metadata.serverId !== pairingStore.serverId || !metadata.pairingId) return null;
    const pairing = pairingStore.getPairing({ clientId: metadata.clientId, pairingId: metadata.pairingId });
    return pairing?.serverId === metadata.serverId ? pairing : null;
  }

  function issueAuthChallenge(connection, pairing) {
    const nonce = createPairingNonce();
    connection.authChallenge = {
      nonce,
      pairingId: pairing.pairingId,
      expiresAtMs: Date.now() + AUTH_CHALLENGE_TTL_MS,
    };
    connection.authConfirmation = null;
    connection.socket.send(JSON.stringify({
      type: "auth_challenge",
      protocolVersion: PAIRING_PROTOCOL_VERSION,
      serverId: pairing.serverId,
      clientId: pairing.clientId,
      pairingId: pairing.pairingId,
      nonce,
    }));
    record({ event: "auth_challenge", clientId: pairing.clientId, pairingId: pairing.pairingId,
      connectionId: connection.connectionId });
  }

  wss.on("connection", (socket) => {
    if (activeConnection?.socket.readyState === WebSocket.OPEN) {
      record({ event: "connection_rejected", reason: "active_plugin_connection",
        activeConnectionId: activeConnection.connectionId,
        remoteAddress: socket._socket?.remoteAddress });
      socket.close(1013, "A POC plugin session is already connected");
      return;
    }

    const connection = {
      socket,
      connectionId: null,
      metadata: null,
      ready: false,
      authenticated: false,
      authChallenge: null,
      authConfirmation: null,
      pairingIssued: null,
      lastSeen: Date.now(),
      handshakeTimer: null,
    };
    activeConnection = connection;

    connection.handshakeTimer = setTimeout(() => {
      if (!connection.metadata && socket.readyState === WebSocket.OPEN) {
        socket.close(1008, "Plugin handshake timed out");
      }
    }, HANDSHAKE_TIMEOUT_MS);
    connection.handshakeTimer.unref?.();

    socket.on("message", (raw) => {
      const message = parseJson(raw);
      if (!message || typeof message.type !== "string") {
        socket.close(1008, "Malformed bridge message");
        return;
      }
      connection.lastSeen = Date.now();

      if (message.type === "hello") {
        if (connection.metadata) {
          socket.close(1008, "Duplicate plugin handshake");
          return;
        }
        const meta = message.metadata;
        const valid =
          message.protocolVersion === PAIRING_PROTOCOL_VERSION &&
          message.workspaceId === WORKSPACE_ID &&
          message.taskId === TASK_ID &&
          boundedString(message.sessionId, 120) &&
          validClientId(message.clientId) &&
          boundedString(meta?.fileIdentity, 300) &&
          ["stable", "session-only"].includes(meta?.fileIdentityQuality) &&
          boundedString(meta?.documentName) &&
          boundedString(meta?.currentPageId, 120) &&
          boundedString(meta?.currentPageName);
        if (!valid) {
          socket.close(1008, "Plugin handshake did not match the POC identity");
          return;
        }
        connection.connectionId = randomUUID();
        connection.metadata = {
          ...meta,
          sessionId: message.sessionId,
          clientId: message.clientId,
          serverId: boundedString(message.serverId, 120) ? message.serverId : null,
          pairingId: boundedString(message.pairingId, 120) ? message.pairingId : null,
          workspaceId: message.workspaceId,
          taskId: message.taskId,
        };
        const pairing = pairingFor(connection);
        clearTimeout(connection.handshakeTimer);
        socket.send(
          JSON.stringify({
            type: "welcome",
            workspaceId: WORKSPACE_ID,
            taskId: TASK_ID,
            connectionId: connection.connectionId,
            sessionId: message.sessionId,
            fileIdentity: meta.fileIdentity,
            clientId: message.clientId,
            serverId: pairingStore.serverId,
            authState: pairing ? "challenge" : "unpaired",
          }),
        );
        record({ event: "handshake", connectionId: connection.connectionId,
          sessionId: message.sessionId, clientId: message.clientId, fileIdentity: meta.fileIdentity,
          authState: pairing ? "challenge" : "unpaired",
          remoteAddress: socket._socket?.remoteAddress });
        return;
      }

      if (!connection.metadata) {
        socket.close(1008, "Plugin handshake required");
        return;
      }

      if (message.type === "ready") {
        if (connection.ready) {
          socket.close(1008, "Duplicate plugin ready message");
          return;
        }
        if (
          message.workspaceId === WORKSPACE_ID &&
          message.taskId === TASK_ID &&
          message.connectionId === connection.connectionId &&
          message.sessionId === connection.metadata.sessionId &&
          message.clientId === connection.metadata.clientId &&
          message.fileIdentity === connection.metadata.fileIdentity
        ) {
          connection.ready = true;
          const pairing = pairingFor(connection);
          if (pairing) issueAuthChallenge(connection, pairing);
        } else {
          socket.close(1008, "Plugin ready message did not match the active session");
        }
        return;
      }

      if (message.type === "heartbeat") {
        if (
          message.connectionId === connection.connectionId &&
          message.sessionId === connection.metadata.sessionId
        ) {
          socket.send(
            JSON.stringify({
              type: "heartbeat_ack",
              connectionId: connection.connectionId,
              sessionId: connection.metadata.sessionId,
            }),
          );
        }
        return;
      }

      if (message.type === "pairing_code") {
        const bootstrap = pairingBootstrap;
        if (
          !connection.ready || !bootstrap ||
          bootstrap.clientId !== connection.metadata.clientId || bootstrap.fileIdentity !== connection.metadata.fileIdentity ||
          message.clientId !== connection.metadata.clientId
        ) {
          socket.send(JSON.stringify({ type: "pairing_error", code: "PAIRING_CODE_INVALID" }));
          return;
        }
        void pairingStore.completePairing({ clientId: message.clientId, code: message.code }).then((pairing) => {
          if (!pairing) {
            socket.send(JSON.stringify({ type: "pairing_error", code: "PAIRING_CODE_INVALID" }));
            return;
          }
          pairingBootstrap = null;
          connection.pairingIssued = pairing;
          connection.metadata.serverId = pairing.serverId;
          connection.metadata.pairingId = pairing.pairingId;
          record({ event: "pairing_issued", clientId: pairing.clientId,
            pairingId: pairing.pairingId, connectionId: connection.connectionId });
          socket.send(JSON.stringify({
            type: "pairing_issued",
            serverId: pairing.serverId,
            clientId: pairing.clientId,
            pairingId: pairing.pairingId,
            secret: pairing.secret,
          }));
        }).catch((error) => {
          record({ event: "pairing_persist_failed", clientId: message.clientId,
            connectionId: connection.connectionId, error: error instanceof Error ? error.message : "unknown" });
          socket.send(JSON.stringify({ type: "pairing_error", code: "PAIRING_PERSIST_FAILED" }));
        });
        return;
      }

      if (message.type === "pairing_stored") {
        const pairing = connection.pairingIssued;
        if (
          !pairing || message.serverId !== pairing.serverId || message.clientId !== pairing.clientId ||
          message.pairingId !== pairing.pairingId
        ) {
          socket.send(JSON.stringify({ type: "pairing_error", code: "PAIRING_RECORD_MISMATCH" }));
          return;
        }
        connection.pairingIssued = null;
        socket.send(JSON.stringify({ type: "pairing_stored_ack", serverId: pairing.serverId,
          clientId: pairing.clientId, pairingId: pairing.pairingId }));
        issueAuthChallenge(connection, pairing);
        return;
      }

      if (message.type === "pairing_storage_failed") {
        const pairing = connection.pairingIssued;
        connection.pairingIssued = null;
        if (pairing) {
          void pairingStore.revokePairing({ clientId: pairing.clientId, pairingId: pairing.pairingId })
            .catch(() => {});
        }
        pairingBootstrap = null;
        record({ event: "pairing_storage_failed", connectionId: connection.connectionId,
          clientId: connection.metadata.clientId });
        return;
      }

      if (message.type === "auth_proof") {
        const challenge = connection.authChallenge;
        connection.authChallenge = null;
        const pairing = challenge && pairingStore.getPairing({
          clientId: connection.metadata.clientId,
          pairingId: challenge.pairingId,
        });
        const valid = Boolean(
          challenge && pairing && Date.now() < challenge.expiresAtMs &&
          message.protocolVersion === PAIRING_PROTOCOL_VERSION &&
          message.serverId === pairing.serverId && message.clientId === pairing.clientId &&
          message.pairingId === pairing.pairingId && message.nonce === challenge.nonce &&
          verifyPairingProof({ secret: pairing.secret, protocolVersion: message.protocolVersion,
            serverId: message.serverId, clientId: message.clientId, pairingId: message.pairingId,
            nonce: message.nonce, role: "client", proof: message.proof })
        );
        if (!valid) {
          socket.send(JSON.stringify({ type: "auth_result", authenticated: false }));
          record({ event: "auth_rejected", clientId: connection.metadata.clientId,
            connectionId: connection.connectionId });
          return;
        }
        connection.authConfirmation = { nonce: challenge.nonce, pairingId: pairing.pairingId };
        const serverProof = createPairingProof({ secret: pairing.secret,
          protocolVersion: PAIRING_PROTOCOL_VERSION, serverId: pairing.serverId,
          clientId: pairing.clientId, pairingId: pairing.pairingId, nonce: challenge.nonce, role: "server" });
        socket.send(JSON.stringify({ type: "auth_result", authenticated: true,
          protocolVersion: PAIRING_PROTOCOL_VERSION, serverId: pairing.serverId,
          clientId: pairing.clientId, pairingId: pairing.pairingId,
          nonce: challenge.nonce, serverProof }));
        return;
      }

      if (message.type === "auth_confirm") {
        const confirmation = connection.authConfirmation;
        const pairing = confirmation && pairingStore.getPairing({
          clientId: connection.metadata.clientId,
          pairingId: confirmation.pairingId,
        });
        if (
          !confirmation || !pairing || message.serverId !== pairing.serverId ||
          message.clientId !== pairing.clientId || message.pairingId !== pairing.pairingId ||
          message.nonce !== confirmation.nonce
        ) {
          socket.send(JSON.stringify({ type: "auth_result", authenticated: false }));
          return;
        }
        connection.authConfirmation = null;
        connection.authenticated = true;
        socket.send(JSON.stringify({ type: "auth_complete", authenticated: true,
          serverId: pairing.serverId, clientId: pairing.clientId, pairingId: pairing.pairingId,
          nonce: confirmation.nonce }));
        record({ event: "authenticated", clientId: pairing.clientId, pairingId: pairing.pairingId,
          connectionId: connection.connectionId });
        return;
      }

      if (message.type !== "result") {
        socket.close(1008, "Message type is not allowed");
        return;
      }

      const entry = pending.get(message.requestId);
      if (!entry || entry.connection !== connection) {
        record({ event: "late_or_unknown_response", requestId: message.requestId,
          connectionId: connection.connectionId, sessionId: connection.metadata.sessionId });
        return;
      }
      if (
        message.workspaceId !== WORKSPACE_ID ||
        message.taskId !== TASK_ID ||
        message.connectionId !== entry.connectionId ||
        message.sessionId !== entry.sessionId ||
        message.fileIdentity !== entry.fileIdentity ||
        rejectStalePending(connection, entry) ||
        (entry.operationId && message.operationId !== entry.operationId)
      ) {
        clearTimeout(entry.timer);
        pending.delete(message.requestId);
        record({ event: "rejected_response", requestId: message.requestId, connectionId: connection.connectionId });
        try { entry.audit?.("OUTCOME_UNKNOWN", { result: "unknown", errorCode: "STALE_RESPONSE",
          latencyMs: Date.now() - entry.startedAt }); }
        catch (error) { entry.reject(new Error(`AUDIT_WRITE_FAILED: ${error.message}`)); return; }
        entry.reject(new Error("Rejected stale or misrouted plugin response"));
        return;
      }

      clearTimeout(entry.timer);
      pending.delete(message.requestId);
      if (entry.operationId) {
        try {
          if (message.ok === true) entry.audit("APPLIED", { result: "plugin_ack",
            before: message.result?.auditBefore, after: message.result,
            latencyMs: Date.now() - entry.startedAt });
          else {
            const code = auditErrorCode(message.error, "PLUGIN_ERROR");
            const rejected = /^(AUTH_|PAIRING_|SCOPE_|OWNERSHIP_|CREATE_PARENT_|PROTOTYPE_|TEST_FIXTURE_|OPERATION_)/.test(code);
            entry.audit(rejected ? "REJECTED" : "OUTCOME_UNKNOWN", {
              result: rejected ? "denied" : "unknown", errorCode: code,
              latencyMs: Date.now() - entry.startedAt });
          }
        } catch (error) {
          entry.reject(new Error(`AUDIT_WRITE_FAILED: ${error.message}`));
          return;
        }
      }
      record({ event: "response", requestId: message.requestId, command: entry.command,
        ...(entry.operationId ? { operationId: entry.operationId } : {}),
        connectionId: connection.connectionId, sessionId: connection.metadata.sessionId,
        ok: message.ok === true, latencyMs: Date.now() - entry.startedAt });
      if (message.ok === true) entry.resolve(entry.operationId
        ? { ...message.result, requestId: message.requestId, operationId: entry.operationId }
        : message.result);
      else entry.reject(new Error(boundedString(message.error, 1_000) ? message.error : "Figma plugin command failed"));
    });

    socket.on("close", () => {
      clearTimeout(connection.handshakeTimer);
      closePendingFor(connection, "Figma plugin disconnected");
      if (activeConnection === connection) activeConnection = null;
      record({ event: "disconnect", connectionId: connection.connectionId,
        sessionId: connection.metadata?.sessionId });
    });

    socket.on("error", () => {
      closePendingFor(connection, "Figma plugin WebSocket error");
    });
  });

  const idleWatchdog = setInterval(() => {
    if (!activeConnection?.metadata) return;
    const now = Date.now();
    if (now - activeConnection.lastSeen > CONNECTION_IDLE_TIMEOUT_MS &&
        !deferIdleCloseForDesignRequest(activeConnection, pending, now)) {
      activeConnection.socket.close(4000, "Plugin heartbeat timed out");
    }
  }, 5_000);
  idleWatchdog.unref?.();

  return {
    host: LOOPBACK_HOST,
    port: wss.address().port,
    address: wss.address(),
    get connection() {
      return activeConnection?.metadata
        ? {
        connectionId: activeConnection.connectionId,
        ready: activeConnection.ready,
        authenticated: activeConnection.authenticated,
        authState: activeConnection.authenticated ? "authenticated" : pairingFor(activeConnection) ? "challenge" : "unpaired",
        metadata: activeConnection.metadata,
          }
        : null;
    },
    beginPairing() {
      const connection = activeConnection;
      if (!connection?.ready || connection.socket.readyState !== WebSocket.OPEN) {
        throw new Error("Figma Development Plugin is not connected");
      }
      if (connection.authenticated) throw new Error("Client is already paired and authenticated");
      const policyError = writeTargetPolicyError(connection.metadata,
        deniedFileIdentities, allowedFileIdentities);
      if (policyError) throw new Error(policyError);
      const issued = pairingStore.beginPairing({ clientId: connection.metadata.clientId });
      pairingBootstrap = {
        clientId: connection.metadata.clientId,
        fileIdentity: connection.metadata.fileIdentity,
        expiresAt: issued.expiresAt,
      };
      record({ event: "pairing_bootstrap_started", clientId: connection.metadata.clientId,
        connectionId: connection.connectionId, expiresAt: issued.expiresAt });
      return { ...issued, clientId: connection.metadata.clientId };
    },
    operationStatus(operationId) {
      if (!TaskAuthorizationStore.validOperationId(operationId)) throw new Error("OPERATION_ID_REQUIRED");
      const entry = auditJournal.latest(operationId);
      if (!entry) throw new Error("OPERATION_NOT_FOUND");
      const connection = activeConnection;
      if (!connection?.authenticated || !connection.ready ||
          connection.socket.readyState !== WebSocket.OPEN) throw new Error("PAIRING_REQUIRED");
      const policyError = writeTargetPolicyError(connection.metadata,
        deniedFileIdentities, allowedFileIdentities);
      if (policyError) throw new Error(policyError);
      if (connection.metadata.fileIdentity !== entry.fileIdentity) throw new Error("AUDIT_FILE_MISMATCH");
      return entry;
    },
    async reconcileCreateOperation(operationId) {
      if (!TaskAuthorizationStore.validOperationId(operationId)) throw new Error("OPERATION_ID_REQUIRED");
      const entry = auditJournal.latest(operationId);
      if (!entry || entry.command !== "scope_create_frame") throw new Error("OPERATION_NOT_FOUND");
      if (!["OUTCOME_UNKNOWN", "APPLIED", "VERIFIED"].includes(entry.state)) {
        throw new Error("OPERATION_NOT_RECONCILABLE");
      }
      const connection = activeConnection;
      if (!connection?.authenticated || !connection.ready ||
          connection.socket.readyState !== WebSocket.OPEN) throw new Error("PAIRING_REQUIRED");
      const policyError = writeTargetPolicyError(connection.metadata,
        deniedFileIdentities, allowedFileIdentities);
      if (policyError) throw new Error(policyError);
      if (connection.metadata.fileIdentity !== entry.fileIdentity) throw new Error("AUDIT_FILE_MISMATCH");
      if (!entry.rootNodeId || !entry.taskId || !entry.workspaceId) throw new Error("AUDIT_SCOPE_MISSING");
      const queue = [entry.rootNodeId];
      const found = [];
      let visited = 0;
      while (queue.length) {
        if (++visited > 200) throw new Error("RECONCILE_SCAN_LIMIT");
        const id = queue.shift();
        const node = await this.callPlugin("scope_read_node", { targetNodeId: id });
        if (!node || node.exists === false || !Array.isArray(node.childIds)) {
          throw new Error("RECONCILE_READ_INCONCLUSIVE");
        }
        if (node.createdOperationId === operationId && node.workspaceId === entry.workspaceId &&
            node.taskId === entry.taskId) found.push(node);
        queue.push(...node.childIds);
      }
      if (found.length !== 1) return { state: "OUTCOME_UNKNOWN", matches: found.length,
        reason: found.length ? "DUPLICATE_OPERATION_NODES" : "NODE_NOT_YET_OBSERVED" };
      const node = found[0];
      auditJournal.record({ ...entry, state: "VERIFIED", result: "read_back_confirmed",
        errorCode: undefined, before: { exists: false }, after: node });
      return { state: "VERIFIED", operationId, nodeId: node.id, node };
    },
    callPlugin(command, payload = {}, timeoutMs = requestTimeoutMs) {
      const mutation = !READ_COMMANDS.has(command);
      const requestId = randomUUID();
      const connection = activeConnection;
      const previousAudit = mutation && TaskAuthorizationStore.validOperationId(payload?.operationId)
        ? auditJournal.latest?.(payload.operationId) : null;
      // Preserve a durable unknown/applied outcome even if a later call using the
      // same id has invalid input or authorization. A rejection must not erase
      // the state that prevents replay after a disconnect or process restart.
      if (["EXECUTING", "APPLIED", "VERIFIED", "OUTCOME_UNKNOWN"].includes(previousAudit?.state)) {
        try { auditJournal.record({ ...previousAudit, requestId, result: "retry_blocked",
          errorCode: "OPERATION_OUTCOME_UNKNOWN" }); }
        catch (error) { return Promise.reject(error); }
        return Promise.reject(new Error("OPERATION_OUTCOME_UNKNOWN: reconcile before retry"));
      }
      let trustedScope;
      let trustedOwnership;
      let checkedDesignPayload;
      const audit = (state, extra = {}) => {
        if (!mutation) return;
        auditJournal.record({ state, requestId, operationId: payload?.operationId,
          authorizationId: payload?.authorizationId, serverId: pairingStore.serverId,
          clientId: connection?.metadata?.clientId, pairingId: connection?.metadata?.pairingId,
          sessionId: connection?.metadata?.sessionId, connectionId: connection?.connectionId,
          workspaceId: WORKSPACE_ID, taskId: payload?.taskId,
          fileIdentity: connection?.metadata?.fileIdentity, pageId: trustedScope?.pageId,
          rootNodeId: trustedScope?.rootNodeId, command, action: ACTION_BY_COMMAND[command],
          target: { id: payload?.targetNodeId, parentId: payload?.parentId,
            sourceNodeId: payload?.sourceNodeId, destinationNodeId: payload?.destinationNodeId },
          ...extra });
      };
      const fail = (error, errorCode) => {
        try { audit("REJECTED", { result: "denied", errorCode: errorCode ?? auditErrorCode(error) }); }
        catch (auditFailure) { return Promise.reject(auditFailure); }
        return Promise.reject(error);
      };
      try {
        audit("RECEIVED");
        audit("VALIDATING");
      } catch (error) { return Promise.reject(error); }
      if (!ALLOWED_COMMANDS.has(command)) {
        return fail(new Error("Plugin command is not allowlisted"), "COMMAND_NOT_ALLOWED");
      }
      if (Object.hasOwn(DESIGN_ACTIONS, command)) {
        try { checkedDesignPayload = designPayload(command, payload); }
        catch (error) { return fail(error, "DESIGN_INPUT_INVALID"); }
      }
      if (TEST_FIXTURE_COMMANDS.has(command) && !allowTestFixtures) {
        return fail(new Error("TEST_FIXTURE_DISABLED"));
      }
      if (
        !connection?.metadata ||
        !connection.ready ||
        connection.socket.readyState !== WebSocket.OPEN
      ) {
        return fail(new Error("Figma Development Plugin is not connected"));
      }
      if (!READ_COMMANDS.has(command)) {
        if (typeof connection.metadata.fileIdentity === "string" &&
            deniedFileIdentities.has(connection.metadata.fileIdentity)) {
          return fail(new Error("FILE_IDENTITY_DENIED"));
        }
      }
      if (!READ_COMMANDS.has(command) &&
          payload?.expectedFileIdentity !== connection.metadata.fileIdentity) {
        return fail(new Error("Expected file identity is missing or does not match the connected Figma document"));
      }
      if (!READ_COMMANDS.has(command)) {
        const policyError = writeTargetPolicyError(connection.metadata,
          deniedFileIdentities, allowedFileIdentities);
        if (policyError) return fail(new Error(policyError));
      }
      if (!READ_COMMANDS.has(command) && !connection.authenticated) {
        return fail(new Error("PAIRING_REQUIRED: Figma client has not completed pairing authentication"));
      }
      if (mutation) {
        if (!TaskAuthorizationStore.validOperationId(payload?.operationId)) {
          return fail(new Error("OPERATION_ID_REQUIRED"));
        }
        if (payload.workspaceId !== WORKSPACE_ID || !boundedString(payload.taskId, 160)) {
          return fail(new Error("AUTH_TASK_MISMATCH"));
        }
        try {
          const authorization = authorizationStore.validate({
            authorizationId: payload.authorizationId, workspaceId: WORKSPACE_ID, taskId: payload.taskId,
            fileIdentity: connection.metadata.fileIdentity, clientId: connection.metadata.clientId,
            action: ACTION_BY_COMMAND[command], revision: payload.revision,
          });
          trustedScope = authorization.scope;
          if (command === "scope_design_apply" && checkedDesignPayload?.allowGlobalResources &&
              !authorization.allowedActions.includes("metadata_write")) {
            throw new Error("GLOBAL_RESOURCES_NOT_AUTHORIZED");
          }
          trustedOwnership = { workspaceId: authorization.workspaceId,
            taskId: authorization.taskId, revision: authorization.revision };
          if (!trustedScope) throw new Error("SCOPE_REQUIRED");
          if (trustedScope.fileIdentity !== connection.metadata.fileIdentity) throw new Error("SCOPE_FILE_MISMATCH");
        } catch (error) {
          return fail(error?.message === "AUTH_FILE_MISMATCH" && command.startsWith("scope_")
            ? new Error("SCOPE_FILE_MISMATCH") : error);
        }
      }
      const envelope = {
        type: "request",
        workspaceId: WORKSPACE_ID,
        taskId: TASK_ID,
        connectionId: connection.connectionId,
        sessionId: connection.metadata.sessionId,
        fileIdentity: connection.metadata.fileIdentity,
        requestId,
        ...(mutation ? { operationId: payload.operationId, authorizationId: payload.authorizationId,
          revision: payload.revision, trustedScope, trustedOwnership,
          ...(TEST_FIXTURE_COMMANDS.has(command) ? { testFixture: true } : {}) } : {}),
        command,
        payload: mutation ? {
          expectedFileIdentity: payload.expectedFileIdentity,
          parentId: payload.parentId, targetNodeId: payload.targetNodeId,
          sourceNodeId: payload.sourceNodeId, destinationNodeId: payload.destinationNodeId,
          name: payload.name,
          ...(checkedDesignPayload || {}),
        } : payload,
      };

      if (ASSET_TRANSFER_COMMANDS.has(command) && Buffer.byteLength(JSON.stringify(envelope), 'utf8') > ASSET_TRANSFER_LIMITS.requestBytes) {
        return fail(new Error('DESIGN_TRANSPORT_BUDGET_EXCEEDED'), 'DESIGN_INPUT_INVALID');
      }
      try { audit("EXECUTING"); } catch (error) { return Promise.reject(error); }
      return new Promise((resolve, reject) => {
        const startedAt = Date.now();
        const timer = setTimeout(() => {
          pending.delete(requestId);
          try { audit("OUTCOME_UNKNOWN", { result: "unknown", errorCode: "TRANSPORT_TIMEOUT",
            latencyMs: Date.now() - startedAt }); }
          catch (error) { reject(new Error(`AUDIT_WRITE_FAILED: ${error.message}`)); return; }
          record({ event: "timeout", requestId, command, connectionId: connection.connectionId,
            sessionId: connection.metadata.sessionId, elapsedMs: Date.now() - startedAt });
          reject(new Error(`Figma plugin command timed out after ${timeoutMs}ms`));
        }, timeoutMs);
        timer.unref?.();
        pending.set(requestId, {
          requestId,
          connection,
          connectionId: connection.connectionId,
          sessionId: connection.metadata.sessionId,
          fileIdentity: connection.metadata.fileIdentity,
          command,
          ...(mutation ? { operationId: payload.operationId } : {}),
          audit,
          startedAt,
          deadlineAt: startedAt + timeoutMs,
          timer,
          resolve,
          reject,
        });
        record({ event: "request", requestId, command, connectionId: connection.connectionId,
          ...(mutation ? { operationId: payload.operationId, authorizationId: payload.authorizationId } : {}),
          sessionId: connection.metadata.sessionId, fileIdentity: connection.metadata.fileIdentity });
        const sendFailed = (error) => {
          if (!pending.has(requestId)) return;
          clearTimeout(timer);
          pending.delete(requestId);
          try { audit("OUTCOME_UNKNOWN", { result: "unknown", errorCode: "TRANSPORT_SEND_ERROR",
            latencyMs: Date.now() - startedAt }); }
          catch (auditFailure) { reject(new Error(`AUDIT_WRITE_FAILED: ${auditFailure.message}`)); return; }
          reject(error);
        };
        try { connection.socket.send(JSON.stringify(envelope), (error) => {
          if (error) sendFailed(error);
        }); } catch (error) { sendFailed(error); }
      });
    },
    async close() {
      if (closed) return;
      closed = true;
      clearInterval(idleWatchdog);
      for (const entry of pending.values()) {
        clearTimeout(entry.timer);
        try { entry.audit?.("OUTCOME_UNKNOWN", { result: "unknown",
          errorCode: "SERVER_SHUTDOWN", latencyMs: Date.now() - entry.startedAt }); }
        catch (error) { record({ event: "audit_failure", requestId: entry.requestId,
          error: String(error) }); }
        entry.reject(new Error("Local bridge is shutting down"));
      }
      pending.clear();
      activeConnection?.socket.close(1001, "MCP server shutting down");
      if (pairingBootstrap) pairingStore.cancelPendingPairing({ clientId: pairingBootstrap.clientId });
      pairingBootstrap = null;
      await new Promise((resolve) => wss.close(resolve));
    },
  };
}
