import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { WebSocket } from "ws";
import { startBridge } from "../relay/bridge-server.mjs";
import { PairingStore, createPairingProof } from "../relay/pairing-store.mjs";
import { TaskAuthorizationStore } from "../relay/task-authorization-store.mjs";
import { MutationAudit } from "../relay/mutation-audit.mjs";
import { FIGMA_PLUGIN_ORIGIN, TASK_ID, WORKSPACE_ID } from "../relay/protocol.mjs";

const FILE = "figma-file:task-auth-test-b";
const CLIENT = "client-task-auth-test";
const OP = "op-authorization-test-01";
const scope = (fileIdentity) => ({ fileIdentity, pageId: "1:1", rootNodeId: "1:2" });
const designSpec = { schemaVersion: '1.0', id: 'transport-test', name: 'Transport',
  nodes: [{ key: 'frame', type: 'FRAME', parentKey: null, x: 0, y: 0, width: 100, height: 80, props: {} }] };

test('design commands preserve validated data through authenticated scoped transport', async t => {
  const { bridge, authorizationStore, requests } = await fixture(t);
  const grant = await authorizationStore.issueForLocalControl({ workspaceId: WORKSPACE_ID, taskId: TASK_ID,
    fileIdentity: FILE, scope: scope(FILE), clientId: CLIENT, allowedActions: ['design', 'read', 'export'], revision: '1',
    expiresAt: new Date(Date.now() + 60_000).toISOString() });
  const input = { expectedFileIdentity: FILE, workspaceId: WORKSPACE_ID, taskId: TASK_ID,
    authorizationId: grant.authorizationId, revision: '1', operationId: 'op-design-transport-01', spec: designSpec, runId: 'transport-test', batchSize: 20 };
  await bridge.callPlugin('scope_design_apply', input);
  assert.deepEqual(requests.at(-1).payload.spec, designSpec);
  assert.equal(requests.at(-1).payload.batchSize, 20);
  assert.deepEqual(requests.at(-1).trustedScope, scope(FILE));
  await assert.rejects(bridge.callPlugin('scope_design_apply', { ...input, operationId: 'op-design-global-001', allowGlobalResources: true }), /GLOBAL_RESOURCES_NOT_AUTHORIZED/);
  await assert.rejects(bridge.callPlugin('scope_design_apply', { ...input, operationId: 'op-design-unsafe-001', code: 'figma.root.remove()' }), /DESIGN_INPUT_UNKNOWN/);
  await bridge.callPlugin('scope_design_plan', { ...input, operationId: 'op-design-plan-0001' });
  assert.equal(requests.length, 2, 'denied calls never reach the plugin');
});

function nextMessage(socket, type) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off("message", onMessage); reject(new Error(`timeout ${type}`)); }, 2_000);
    function onMessage(raw) {
      const message = JSON.parse(raw.toString());
      if (message.type !== type) return;
      clearTimeout(timer);
      socket.off("message", onMessage);
      resolve(message);
    }
    socket.on("message", onMessage);
  });
}

async function fixture(t, { allowTestFixtures = false, auditJournal, respondToRequests = true,
  responseForRequest, pairingStore: suppliedPairingStore,
  authorizationStore: suppliedAuthorizationStore, existingPairing } = {}) {
  const pairingStore = suppliedPairingStore ?? new PairingStore();
  await pairingStore.initialize();
  const pairing = existingPairing ?? await (async () => {
    const code = pairingStore.beginPairing({ clientId: CLIENT }).code;
    return pairingStore.completePairing({ clientId: CLIENT, code });
  })();
  const authorizationStore = suppliedAuthorizationStore ?? new TaskAuthorizationStore();
  await authorizationStore.initialize();
  const trace = [];
  const isolatedOperations = new Map();
  const journal = auditJournal ?? { record: (entry) => {
    if (entry.operationId) isolatedOperations.set(entry.operationId, entry);
  }, latest: (operationId) => isolatedOperations.get(operationId) ?? null };
  const bridge = await startBridge({ port: 0, pairingStore, authorizationStore, allowTestFixtures,
    allowedFileIdentities: new Set([FILE]),
    auditJournal: journal,
    logger: (event) => trace.push(event) });
  const socket = new WebSocket(`ws://127.0.0.1:${bridge.port}`, { origin: FIGMA_PLUGIN_ORIGIN });
  t.after(async () => { socket.close(); await bridge.close(); });
  await once(socket, "open");
  const welcomePromise = nextMessage(socket, "welcome");
  socket.send(JSON.stringify({ type: "hello", protocolVersion: "1", workspaceId: WORKSPACE_ID,
    taskId: TASK_ID, sessionId: "task-auth-session", clientId: CLIENT,
    serverId: pairing.serverId, pairingId: pairing.pairingId,
    metadata: { fileIdentity: FILE, fileIdentityQuality: "stable", documentName: "Dedicated Test File B",
      currentPageId: "1:1", currentPageName: "Page 1" } }));
  const welcome = await welcomePromise;
  const challengePromise = nextMessage(socket, "auth_challenge");
  socket.send(JSON.stringify({ type: "ready", workspaceId: WORKSPACE_ID, taskId: TASK_ID,
    sessionId: "task-auth-session", clientId: CLIENT, fileIdentity: FILE,
    connectionId: welcome.connectionId }));
  const challenge = await challengePromise;
  const authResultPromise = nextMessage(socket, "auth_result");
  socket.send(JSON.stringify({ type: "auth_proof", protocolVersion: "1", serverId: pairing.serverId,
    clientId: CLIENT, pairingId: pairing.pairingId, nonce: challenge.nonce,
    proof: createPairingProof({ secret: pairing.secret, protocolVersion: "1", serverId: pairing.serverId,
      clientId: CLIENT, pairingId: pairing.pairingId, nonce: challenge.nonce, role: "client" }) }));
  assert.equal((await authResultPromise).authenticated, true);
  const completed = nextMessage(socket, "auth_complete");
  socket.send(JSON.stringify({ type: "auth_confirm", serverId: pairing.serverId,
    clientId: CLIENT, pairingId: pairing.pairingId, nonce: challenge.nonce }));
  await completed;
  assert.equal(bridge.connection.authenticated, true);
  const requests = [];
  socket.on("message", (raw) => {
    const message = JSON.parse(raw.toString());
    if (message.type !== "request") return;
    requests.push(message);
    if (!respondToRequests) return;
    const result = responseForRequest?.(message) ?? { simulated: true };
    if (result === false) return;
    socket.send(JSON.stringify({ type: "result", workspaceId: WORKSPACE_ID, taskId: TASK_ID,
      connectionId: message.connectionId, sessionId: message.sessionId,
      fileIdentity: FILE, requestId: message.requestId, operationId: message.operationId,
      ok: true, result }));
  });
  return { bridge, authorizationStore, pairing, requests, trace, socket };
}

test('persisted timeout blocks the same logical mutation after Bridge restart', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'figma-restart-gate-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const pairingPath = path.join(directory, 'pairing.json');
  const authorizationPath = path.join(directory, 'grants.json');
  const auditPath = path.join(directory, 'audit.jsonl');
  const first = await fixture(t, {
    pairingStore: new PairingStore({ filePath: pairingPath }),
    authorizationStore: new TaskAuthorizationStore({ filePath: authorizationPath }),
    auditJournal: new MutationAudit({ filePath: auditPath }), respondToRequests: false,
  });
  const grant = await first.authorizationStore.issueForLocalControl({ workspaceId: WORKSPACE_ID,
    taskId: TASK_ID, fileIdentity: FILE, scope: scope(FILE), clientId: CLIENT,
    allowedActions: ['create'], revision: '1',
    expiresAt: new Date(Date.now() + 60_000).toISOString() });
  const operationId = 'op-persisted-restart-001';
  const input = { expectedFileIdentity: FILE, parentId: '1:2', name: 'Restart gate',
    workspaceId: WORKSPACE_ID, taskId: TASK_ID, revision: '1',
    authorizationId: grant.authorizationId, operationId };
  await assert.rejects(first.bridge.callPlugin('scope_create_frame', input, 30), /timed out/);
  assert.equal(first.requests.length, 1);
  first.socket.close();
  await first.bridge.close();

  const reloadedAudit = new MutationAudit({ filePath: auditPath });
  assert.equal(reloadedAudit.latest(operationId).state, 'OUTCOME_UNKNOWN');
  const second = await fixture(t, {
    pairingStore: new PairingStore({ filePath: pairingPath }),
    authorizationStore: new TaskAuthorizationStore({ filePath: authorizationPath }),
    auditJournal: reloadedAudit, existingPairing: first.pairing,
  });
  await assert.rejects(second.bridge.callPlugin('scope_create_frame', input),
    /OPERATION_OUTCOME_UNKNOWN/);
  assert.equal(second.requests.length, 0, 'same logical write must not reach plugin after restart');
  assert.equal(reloadedAudit.latest(operationId).state, 'OUTCOME_UNKNOWN');
  assert.equal(reloadedAudit.latest(operationId).result, 'retry_blocked');
  await assert.rejects(second.bridge.callPlugin('scope_design_apply', { ...input, spec: null,
    authorizationId: 'auth-invalid', expectedFileIdentity: 'figma-file:other' }), /OPERATION_OUTCOME_UNKNOWN/);
  assert.equal(reloadedAudit.latest(operationId).state, 'OUTCOME_UNKNOWN', 'invalid input must not erase the earlier unknown outcome');
  assert.equal(reloadedAudit.latest(operationId).fileIdentity, FILE);
  assert.equal(reloadedAudit.latest(operationId).command, 'scope_create_frame');
  await assert.rejects(second.bridge.callPlugin('scope_create_frame', input), /OPERATION_OUTCOME_UNKNOWN/);
  assert.equal(second.requests.length, 0);
});

test('mutation audit records server rejection, applied response, and unknown timeout without blind retry', async (t) => {
  const events = [];
  const auditJournal = { record: (event) => events.push(event),
    latest: (operationId) => events.filter((event) => event.operationId === operationId).at(-1) ?? null };
  const { bridge, authorizationStore, requests } = await fixture(t, { auditJournal });
  const grant = await authorizationStore.issueForLocalControl({ workspaceId: WORKSPACE_ID, taskId: TASK_ID,
    fileIdentity: FILE, scope: scope(FILE), clientId: CLIENT, allowedActions: ["create"], revision: "1",
    expiresAt: new Date(Date.now() + 60_000).toISOString() });
  const input = { expectedFileIdentity: FILE, parentId: "1:2", name: "Audit", workspaceId: WORKSPACE_ID,
    taskId: TASK_ID, revision: "1", operationId: "op-audit-protocol-01" };
  await assert.rejects(bridge.callPlugin("scope_create_frame", input), /AUTH_REQUIRED/);
  assert.equal(requests.length, 0);
  assert.equal(events.at(-1).state, "REJECTED");
  assert.equal(events.at(-1).errorCode, "AUTH_REQUIRED");
  const result = await bridge.callPlugin("scope_create_frame", { ...input,
    authorizationId: grant.authorizationId, operationId: "op-audit-protocol-02" });
  assert.equal(result.operationId, "op-audit-protocol-02");
  assert.deepEqual(events.filter((event) => event.operationId === "op-audit-protocol-02")
    .map((event) => event.state), ["RECEIVED", "VALIDATING", "EXECUTING", "APPLIED"]);
  assert.equal(auditJournal.latest("op-audit-protocol-02").requestId, result.requestId);
});

test('transport timeout remains OUTCOME_UNKNOWN and a late response cannot silently become FAILED', async (t) => {
  const events = [];
  const auditJournal = { record: (event) => events.push(event),
    latest: (operationId) => events.filter((event) => event.operationId === operationId).at(-1) ?? null };
  const { bridge, authorizationStore, requests } = await fixture(t, { auditJournal, respondToRequests: false });
  const grant = await authorizationStore.issueForLocalControl({ workspaceId: WORKSPACE_ID, taskId: TASK_ID,
    fileIdentity: FILE, scope: scope(FILE), clientId: CLIENT, allowedActions: ["create"], revision: "1",
    expiresAt: new Date(Date.now() + 60_000).toISOString() });
  const operationId = "op-audit-protocol-03";
  await assert.rejects(bridge.callPlugin("scope_create_frame", { expectedFileIdentity: FILE, parentId: "1:2",
    name: "Slow", workspaceId: WORKSPACE_ID, taskId: TASK_ID, revision: "1",
    authorizationId: grant.authorizationId, operationId }, 30), /timed out/);
  assert.equal(requests.length, 1);
  assert.equal(auditJournal.latest(operationId).state, "OUTCOME_UNKNOWN");
  assert.equal(auditJournal.latest(operationId).errorCode, "TRANSPORT_TIMEOUT");
  await assert.rejects(bridge.callPlugin("scope_create_frame", { expectedFileIdentity: FILE,
    parentId: "1:2", name: "Slow", workspaceId: WORKSPACE_ID, taskId: TASK_ID, revision: "1",
    authorizationId: grant.authorizationId, operationId }, 30), /OPERATION_OUTCOME_UNKNOWN/);
  await assert.rejects(bridge.callPlugin("scope_create_frame", { expectedFileIdentity: FILE,
    parentId: "1:2", name: "Slow", workspaceId: WORKSPACE_ID, taskId: TASK_ID, revision: "1",
    authorizationId: grant.authorizationId, operationId }, 30), /OPERATION_OUTCOME_UNKNOWN/);
  assert.equal(requests.length, 1, "unknown operation must not be blindly sent twice");
});

test('read-only reconciliation confirms a timed-out create by operationId without retrying mutation', async (t) => {
  const events = [];
  const auditJournal = { record: (event) => events.push(event),
    latest: (operationId) => events.filter((event) => event.operationId === operationId).at(-1) ?? null };
  const operationId = 'op-audit-reconcile-01';
  const { bridge, authorizationStore, requests } = await fixture(t, { auditJournal,
    responseForRequest: (request) => {
      if (request.command === 'scope_create_frame') return false;
      if (request.payload.targetNodeId === '1:2') return { id: '1:2', type: 'FRAME', childIds: ['1:4'] };
      return { id: '1:4', type: 'FRAME', childIds: [], parentId: '1:2',
        createdOperationId: operationId, workspaceId: WORKSPACE_ID, taskId: TASK_ID };
    } });
  const grant = await authorizationStore.issueForLocalControl({ workspaceId: WORKSPACE_ID, taskId: TASK_ID,
    fileIdentity: FILE, scope: scope(FILE), clientId: CLIENT, allowedActions: ['create'], revision: '1',
    expiresAt: new Date(Date.now() + 60_000).toISOString() });
  await assert.rejects(bridge.callPlugin('scope_create_frame', { expectedFileIdentity: FILE,
    parentId: '1:2', name: 'Timeout', workspaceId: WORKSPACE_ID, taskId: TASK_ID,
    revision: '1', authorizationId: grant.authorizationId, operationId }, 30), /timed out/);
  const reconciled = await bridge.reconcileCreateOperation(operationId);
  assert.equal(reconciled.state, 'VERIFIED');
  assert.equal(reconciled.nodeId, '1:4');
  assert.equal(auditJournal.latest(operationId).state, 'VERIFIED');
  assert.equal(requests.filter((request) => request.command === 'scope_create_frame').length, 1);
  assert.equal(requests.filter((request) => request.command === 'scope_read_node').length, 2);
});

test('operation status does not expose an audit record without an authenticated matching file', async (t) => {
  const auditJournal = { record: () => {}, latest: () => ({ state: 'OUTCOME_UNKNOWN',
    operationId: 'op-audit-private-001', fileIdentity: FILE }) };
  const bridge = await startBridge({ port: 0, auditJournal });
  t.after(() => bridge.close());
  assert.throws(() => bridge.operationStatus('op-audit-private-001'), /PAIRING_REQUIRED/);
});

test('disconnect preserves pending mutation as OUTCOME_UNKNOWN', async (t) => {
  const entries = [];
  const auditJournal = { record: (entry) => entries.push(entry),
    latest: (operationId) => entries.filter((entry) => entry.operationId === operationId).at(-1) ?? null };
  const { bridge, authorizationStore, socket, requests } = await fixture(t,
    { auditJournal, respondToRequests: false });
  const grant = await authorizationStore.issueForLocalControl({ workspaceId: WORKSPACE_ID, taskId: TASK_ID,
    fileIdentity: FILE, scope: scope(FILE), clientId: CLIENT, allowedActions: ['create'], revision: '1',
    expiresAt: new Date(Date.now() + 60_000).toISOString() });
  const operationId = 'op-audit-disconnect-01';
  const pending = bridge.callPlugin('scope_create_frame', { expectedFileIdentity: FILE, parentId: '1:2',
    name: 'Pending', workspaceId: WORKSPACE_ID, taskId: TASK_ID, revision: '1',
    authorizationId: grant.authorizationId, operationId }, 2_000);
  await once(socket, 'message');
  socket.close();
  await assert.rejects(pending, /disconnected/);
  assert.equal(requests.length, 1);
  assert.equal(auditJournal.latest(operationId).state, 'OUTCOME_UNKNOWN');
  assert.equal(auditJournal.latest(operationId).errorCode, 'TRANSPORT_DISCONNECTED');
});

test('server shutdown preserves pending mutation as OUTCOME_UNKNOWN', async (t) => {
  const entries = [];
  const auditJournal = { record: (entry) => entries.push(entry),
    latest: (operationId) => entries.filter((entry) => entry.operationId === operationId).at(-1) ?? null };
  const { bridge, authorizationStore, socket, requests } = await fixture(t,
    { auditJournal, respondToRequests: false });
  const grant = await authorizationStore.issueForLocalControl({ workspaceId: WORKSPACE_ID, taskId: TASK_ID,
    fileIdentity: FILE, scope: scope(FILE), clientId: CLIENT, allowedActions: ['create'], revision: '1',
    expiresAt: new Date(Date.now() + 60_000).toISOString() });
  const operationId = 'op-audit-shutdown-01';
  const pending = bridge.callPlugin('scope_create_frame', { expectedFileIdentity: FILE, parentId: '1:2',
    name: 'Pending', workspaceId: WORKSPACE_ID, taskId: TASK_ID, revision: '1',
    authorizationId: grant.authorizationId, operationId }, 2_000);
  await once(socket, 'message');
  assert.equal(requests.length, 1);
  const rejected = assert.rejects(pending, /shutting down/);
  await bridge.close();
  await rejected;
  assert.equal(auditJournal.latest(operationId).state, 'OUTCOME_UNKNOWN');
  assert.equal(auditJournal.latest(operationId).errorCode, 'SERVER_SHUTDOWN');
});

test('stale plugin response keeps mutation outcome unknown for reconciliation', async (t) => {
  const entries = [];
  const auditJournal = { record: (entry) => entries.push(entry),
    latest: (operationId) => entries.filter((entry) => entry.operationId === operationId).at(-1) ?? null };
  const { bridge, authorizationStore, socket, requests } = await fixture(t,
    { auditJournal, respondToRequests: false });
  const grant = await authorizationStore.issueForLocalControl({ workspaceId: WORKSPACE_ID, taskId: TASK_ID,
    fileIdentity: FILE, scope: scope(FILE), clientId: CLIENT, allowedActions: ['create'], revision: '1',
    expiresAt: new Date(Date.now() + 60_000).toISOString() });
  const operationId = 'op-audit-stale-001';
  const pending = bridge.callPlugin('scope_create_frame', { expectedFileIdentity: FILE, parentId: '1:2',
    name: 'Pending', workspaceId: WORKSPACE_ID, taskId: TASK_ID, revision: '1',
    authorizationId: grant.authorizationId, operationId }, 2_000);
  const rejected = assert.rejects(pending, /stale or misrouted/);
  await once(socket, 'message');
  const request = requests.at(-1);
  socket.send(JSON.stringify({ type: 'result', workspaceId: WORKSPACE_ID, taskId: TASK_ID,
    connectionId: request.connectionId, sessionId: request.sessionId, fileIdentity: FILE,
    requestId: request.requestId, operationId: 'op-different-operation', ok: true,
    result: { simulated: true } }));
  await rejected;
  assert.equal(auditJournal.latest(operationId).state, 'OUTCOME_UNKNOWN');
  assert.equal(auditJournal.latest(operationId).errorCode, 'STALE_RESPONSE');
});

test("paired plugin cannot mutate without a trusted task authorization; denied calls never reach WS", async (t) => {
  const { bridge, authorizationStore, requests } = await fixture(t);
  const valid = await authorizationStore.issueForLocalControl({ workspaceId: WORKSPACE_ID, taskId: TASK_ID,
    fileIdentity: FILE, scope: scope(FILE), clientId: CLIENT, allowedActions: ["create"], revision: "1",
    expiresAt: new Date(Date.now() + 60_000).toISOString() });
  const base = { expectedFileIdentity: FILE, workspaceId: WORKSPACE_ID, taskId: TASK_ID,
    revision: "1", authorizationId: valid.authorizationId, operationId: OP };
  for (const [change, code] of [
    [{ authorizationId: undefined }, "AUTH_REQUIRED"],
    [{ authorizationId: "auth-unknown" }, "AUTH_NOT_FOUND"],
    [{ taskId: "other-task" }, "AUTH_TASK_MISMATCH"],
    [{ workspaceId: "other-workspace" }, "AUTH_TASK_MISMATCH"],
    [{ authorizationId: (await authorizationStore.issueForLocalControl({ workspaceId: WORKSPACE_ID, taskId: TASK_ID,
      fileIdentity: "figma-file:task-auth-test-a", scope: scope("figma-file:task-auth-test-a"), clientId: CLIENT, allowedActions: ["create"], revision: "1",
      expiresAt: new Date(Date.now() + 60_000).toISOString() })).authorizationId }, "SCOPE_FILE_MISMATCH"],
    [{ revision: "2" }, "AUTH_REVISION_MISMATCH"],
    [{ operationId: undefined }, "OPERATION_ID_REQUIRED"],
  ]) {
    await assert.rejects(bridge.callPlugin("scope_create_frame", { ...base, parentId: "1:2", name: "Test", ...change }), new RegExp(code));
    assert.equal(requests.length, 0, code);
  }
  await assert.rejects(bridge.callPlugin("delete_poc_owned", { ...base, allowedActions: ["delete"] }), /ACTION_NOT_ALLOWED/);
  assert.equal(requests.length, 0);
  const expired = await authorizationStore.issueForLocalControl({ workspaceId: WORKSPACE_ID, taskId: TASK_ID,
    fileIdentity: FILE, scope: scope(FILE), clientId: CLIENT, allowedActions: ["create"], revision: "1",
    expiresAt: new Date(Date.now() - 1_000).toISOString() });
  await assert.rejects(bridge.callPlugin("scope_create_frame", { ...base, parentId: "1:2", name: "Test", authorizationId: expired.authorizationId }), /AUTH_EXPIRED/);
  assert.equal(requests.length, 0);
});

test("valid authorization propagates operationId independently of requestId", async (t) => {
  const { bridge, authorizationStore, requests, trace } = await fixture(t);
  const valid = await authorizationStore.issueForLocalControl({ workspaceId: WORKSPACE_ID, taskId: TASK_ID,
    fileIdentity: FILE, scope: scope(FILE), clientId: CLIENT, allowedActions: ["create"], revision: "1",
    expiresAt: new Date(Date.now() + 60_000).toISOString() });
  const result = await bridge.callPlugin("scope_create_frame", { expectedFileIdentity: FILE, parentId: "1:2", name: "Test",
    scope: { fileIdentity: FILE, pageId: "1:1", rootNodeId: "9:9" },
    owner: "client-forged-owner", createdOperationId: "op-client-forged",
    workspaceId: WORKSPACE_ID, taskId: TASK_ID, revision: "1",
    authorizationId: valid.authorizationId, operationId: OP });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].operationId, OP);
  assert.equal(requests[0].authorizationId, valid.authorizationId);
  assert.deepEqual(requests[0].trustedScope, scope(FILE));
  assert.deepEqual(requests[0].trustedOwnership, {
    workspaceId: WORKSPACE_ID, taskId: TASK_ID, revision: "1",
  });
  assert.equal(requests[0].payload.scope, undefined, "untrusted client scope must not be forwarded");
  assert.equal(requests[0].payload.owner, undefined, "client owner claim must not be forwarded");
  assert.equal(requests[0].payload.createdOperationId, undefined, "client operation metadata must not be forwarded");
  assert.notEqual(requests[0].requestId, OP);
  assert.equal(result.operationId, OP);
  assert.equal(result.requestId, requests[0].requestId);
  assert.equal(trace.some((event) => event.event === "response" && event.operationId === OP), true);
});

test("two trusted task grants on one paired client carry different ownership task IDs", async (t) => {
  const { bridge, authorizationStore, requests } = await fixture(t);
  for (const taskId of ["task-A", "task-B"]) {
    const grant = await authorizationStore.issueForLocalControl({ workspaceId: WORKSPACE_ID, taskId,
      fileIdentity: FILE, scope: scope(FILE), clientId: CLIENT, allowedActions: ["create"], revision: "1",
      expiresAt: new Date(Date.now() + 60_000).toISOString() });
    await bridge.callPlugin("scope_create_frame", { expectedFileIdentity: FILE, parentId: "1:2", name: taskId,
      workspaceId: WORKSPACE_ID, taskId, revision: "1",
      authorizationId: grant.authorizationId, operationId: `op-ownership-${taskId}-01` });
  }
  assert.deepEqual(requests.map((request) => request.trustedOwnership?.taskId), ["task-A", "task-B"]);
  assert.deepEqual(requests.map((request) => request.taskId), [TASK_ID, TASK_ID],
    "plugin protocol identity remains distinct from authorization task identity");
});

test("foreign-node fixture commands are disabled by default and need a separate trusted action", async (t) => {
  const { bridge, authorizationStore, requests } = await fixture(t);
  const grant = await authorizationStore.issueForLocalControl({ workspaceId: WORKSPACE_ID, taskId: TASK_ID,
    fileIdentity: FILE, scope: scope(FILE), clientId: CLIENT, allowedActions: ["create"], revision: "1",
    expiresAt: new Date(Date.now() + 60_000).toISOString() });
  await assert.rejects(bridge.callPlugin("scope_create_foreign_fixture", {
    expectedFileIdentity: FILE, parentId: "1:2", name: "foreign", workspaceId: WORKSPACE_ID,
    taskId: TASK_ID, revision: "1", authorizationId: grant.authorizationId,
    operationId: "op-foreign-fixture-01" }), /TEST_FIXTURE_DISABLED/);
  assert.equal(requests.length, 0);
});

test("enabled development fixture requires a server-issued test_fixture grant", async (t) => {
  const { bridge, authorizationStore, requests } = await fixture(t, { allowTestFixtures: true });
  const ordinary = await authorizationStore.issueForLocalControl({ workspaceId: WORKSPACE_ID, taskId: TASK_ID,
    fileIdentity: FILE, scope: scope(FILE), clientId: CLIENT, allowedActions: ["create"], revision: "1",
    expiresAt: new Date(Date.now() + 60_000).toISOString() });
  const input = { expectedFileIdentity: FILE, parentId: "1:2", name: "foreign", workspaceId: WORKSPACE_ID,
    taskId: TASK_ID, revision: "1", operationId: "op-foreign-fixture-02" };
  await assert.rejects(bridge.callPlugin("scope_create_foreign_fixture", {
    ...input, authorizationId: ordinary.authorizationId }), /ACTION_NOT_ALLOWED/);
  assert.equal(requests.length, 0);
  const fixtureGrant = await authorizationStore.issueForLocalControl({ workspaceId: WORKSPACE_ID, taskId: TASK_ID,
    fileIdentity: FILE, scope: scope(FILE), clientId: CLIENT, allowedActions: ["test_fixture"], revision: "1",
    expiresAt: new Date(Date.now() + 60_000).toISOString() });
  await bridge.callPlugin("scope_create_foreign_fixture", { ...input, authorizationId: fixtureGrant.authorizationId });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].testFixture, true);
  assert.equal(requests[0].trustedOwnership.taskId, TASK_ID);
});
