import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import { WebSocket } from "ws";
import { startBridge } from "../relay/bridge-server.mjs";
import { PairingStore, createPairingProof, verifyPairingProof } from "../relay/pairing-store.mjs";
import { FIGMA_PLUGIN_ORIGIN, TASK_ID, WORKSPACE_ID } from "../relay/protocol.mjs";

async function waitFor(predicate, timeoutMs = 1_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("Plugin did not become ready before timeout");
}

const TEST_ALLOWED_FILE_IDENTITIES = new Set(["figma-file:test-file-key", "figma-file:other-file-key"]);

function startTestBridge(options = {}) {
  return startBridge({ allowedFileIdentities: TEST_ALLOWED_FILE_IDENTITIES, ...options });
}

async function connectUnpairedPlugin(bridge, {
  sessionId = "pairing-test-session",
  clientId = "client-pairing-test-1",
  fileIdentity = "figma-file:test-file-key",
} = {}) {
  const socket = new WebSocket(`ws://127.0.0.1:${bridge.port}`, { origin: FIGMA_PLUGIN_ORIGIN });
  await once(socket, "open");
  const welcome = once(socket, "message").then(([raw]) => JSON.parse(raw.toString()));
  socket.send(JSON.stringify({
    type: "hello",
    protocolVersion: "1",
    workspaceId: WORKSPACE_ID,
    taskId: TASK_ID,
    sessionId,
    clientId,
    metadata: {
      fileIdentity,
      fileIdentityQuality: "stable",
      documentName: "Dedicated Pairing Test File",
      currentPageId: "1:1",
      currentPageName: "Page 1",
    },
  }));
  const greeting = await welcome;
  socket.send(JSON.stringify({
    type: "ready",
    workspaceId: WORKSPACE_ID,
    taskId: TASK_ID,
    sessionId,
    clientId,
    fileIdentity,
    connectionId: greeting.connectionId,
  }));
  await waitFor(() => bridge.connection?.ready === true);
  return { socket, greeting };
}

async function waitForMessage(socket, type, timeoutMs = 1_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off("message", onMessage);
      reject(new Error(`Timed out waiting for ${type}`));
    }, timeoutMs);
    const onMessage = (raw) => {
      const message = JSON.parse(raw.toString());
      if (message.type !== type) return;
      clearTimeout(timer);
      socket.off("message", onMessage);
      resolve(message);
    };
    socket.on("message", onMessage);
  });
}

test("allows status reads but denies an unpaired write before it reaches the plugin", async (t) => {
  const trace = [];
  const bridge = await startTestBridge({ port: 0, requestTimeoutMs: 100, logger: (event) => trace.push(event) });
  const fake = await connectUnpairedPlugin(bridge);
  t.after(async () => {
    fake.socket.close();
    await bridge.close();
  });

  let pluginRequests = 0;
  fake.socket.on("message", (raw) => {
    const message = JSON.parse(raw.toString());
    if (message.type !== "request") return;
    pluginRequests += 1;
    fake.socket.send(JSON.stringify({
      type: "result",
      workspaceId: message.workspaceId,
      taskId: message.taskId,
      connectionId: message.connectionId,
      sessionId: message.sessionId,
      fileIdentity: message.fileIdentity,
      requestId: message.requestId,
      ok: true,
      result: { simulated: true },
    }));
  });

  const read = await bridge.callPlugin("status", {});
  assert.deepEqual(read, { simulated: true });
  await assert.rejects(
    bridge.callPlugin("create_poc", { expectedFileIdentity: "figma-file:test-file-key" }),
    /PAIRING_REQUIRED/,
  );
  assert.equal(pluginRequests, 1, "only the status read should reach the plugin");
  assert.equal(trace.some((event) => event.event === "request" && event.command === "create_poc"), false);
});

test("rejects a second unpaired localhost plugin while a connection is active", async (t) => {
  const trace = [];
  const bridge = await startTestBridge({ port: 0, logger: (event) => trace.push(event) });
  const active = await connectUnpairedPlugin(bridge);
  t.after(async () => {
    active.socket.close();
    await bridge.close();
  });

  const second = new WebSocket(`ws://127.0.0.1:${bridge.port}`, { origin: "null" });
  const secondClosed = once(second, "close");
  await once(second, "open");
  const [code] = await secondClosed;
  assert.equal(code, 1013);
  assert.equal(bridge.connection?.ready, true);
  assert.equal(trace.filter((event) => event.event === "connection_rejected" &&
    event.reason === "active_plugin_connection" &&
    event.activeConnectionId === active.greeting.connectionId).length, 1);
});

test("one-time pairing authenticates the plugin and keeps bootstrap values out of logs", async (t) => {
  const trace = [];
  const pairingStore = new PairingStore();
  await pairingStore.initialize();
  const bridge = await startTestBridge({ port: 0, pairingStore, logger: (event) => trace.push(event) });
  const fake = await connectUnpairedPlugin(bridge);
  t.after(async () => {
    fake.socket.close();
    await bridge.close();
  });

  const bootstrap = bridge.beginPairing();
  const issuedPromise = waitForMessage(fake.socket, "pairing_issued");
  fake.socket.send(JSON.stringify({
    type: "pairing_code",
    clientId: "client-pairing-test-1",
    code: bootstrap.code,
  }));
  const issued = await issuedPromise;
  assert.equal(issued.serverId, pairingStore.serverId);
  assert.equal(issued.clientId, "client-pairing-test-1");
  assert.ok(issued.pairingId);
  assert.ok(issued.secret);

  const challengePromise = waitForMessage(fake.socket, "auth_challenge");
  fake.socket.send(JSON.stringify({
    type: "pairing_stored",
    serverId: issued.serverId,
    clientId: issued.clientId,
    pairingId: issued.pairingId,
  }));
  const challenge = await challengePromise;
  const authResultPromise = waitForMessage(fake.socket, "auth_result");
  fake.socket.send(JSON.stringify({
    type: "auth_proof",
    protocolVersion: challenge.protocolVersion,
    serverId: issued.serverId,
    clientId: issued.clientId,
    pairingId: issued.pairingId,
    nonce: challenge.nonce,
    proof: createPairingProof({ secret: issued.secret, protocolVersion: challenge.protocolVersion,
      serverId: issued.serverId, clientId: issued.clientId, pairingId: issued.pairingId,
      nonce: challenge.nonce, role: "client" }),
  }));
  const authResult = await authResultPromise;
  assert.equal(authResult.authenticated, true);
  assert.equal(verifyPairingProof({ secret: issued.secret, protocolVersion: challenge.protocolVersion,
    serverId: issued.serverId, clientId: issued.clientId, pairingId: issued.pairingId,
    nonce: challenge.nonce, role: "server", proof: authResult.serverProof }), true);
  const authCompletePromise = waitForMessage(fake.socket, "auth_complete");
  fake.socket.send(JSON.stringify({ type: "auth_confirm", serverId: issued.serverId,
    clientId: issued.clientId, pairingId: issued.pairingId, nonce: challenge.nonce }));
  assert.equal((await authCompletePromise).authenticated, true);
  assert.equal(bridge.connection.authenticated, true);
  const serializedLogs = JSON.stringify(trace);
  assert.equal(serializedLogs.includes(bootstrap.code), false);
  assert.equal(serializedLogs.includes(issued.secret), false);
});

test("pairing code survives reconnect only for the original client and file", async (t) => {
  const pairingStore = new PairingStore();
  await pairingStore.initialize();
  const bridge = await startTestBridge({ port: 0, pairingStore });
  let current = await connectUnpairedPlugin(bridge);
  t.after(async () => {
    current.socket.close();
    await bridge.close();
  });

  const originalConnectionId = current.greeting.connectionId;
  const bootstrap = bridge.beginPairing();
  const closedOriginal = once(current.socket, "close");
  current.socket.close();
  await closedOriginal;
  await waitFor(() => bridge.connection === null);

  current = await connectUnpairedPlugin(bridge, {
    sessionId: "pairing-test-session-reconnected",
    fileIdentity: "figma-file:other-file-key",
  });
  assert.notEqual(current.greeting.connectionId, originalConnectionId);
  const rejectedPromise = waitForMessage(current.socket, "pairing_error");
  current.socket.send(JSON.stringify({
    type: "pairing_code",
    clientId: "client-pairing-test-1",
    code: bootstrap.code,
  }));
  assert.equal((await rejectedPromise).code, "PAIRING_CODE_INVALID");

  const closedWrongFile = once(current.socket, "close");
  current.socket.close();
  await closedWrongFile;
  await waitFor(() => bridge.connection === null);

  current = await connectUnpairedPlugin(bridge, {
    sessionId: "pairing-test-session-reconnected-again",
  });
  const issuedPromise = waitForMessage(current.socket, "pairing_issued");
  current.socket.send(JSON.stringify({
    type: "pairing_code",
    clientId: "client-pairing-test-1",
    code: bootstrap.code,
  }));
  const issued = await issuedPromise;
  assert.equal(issued.clientId, "client-pairing-test-1");
  assert.equal(issued.serverId, pairingStore.serverId);
});

test("persistent pairing challenges require a fresh HMAC proof before writes", async (t) => {
  const pairingStore = new PairingStore();
  await pairingStore.initialize();
  const bootstrap = pairingStore.beginPairing({ clientId: "client-paired-1" });
  const pairing = await pairingStore.completePairing({ clientId: "client-paired-1", code: bootstrap.code });
  const bridge = await startTestBridge({ port: 0, pairingStore });
  t.after(async () => bridge.close());

  const socket = new WebSocket(`ws://127.0.0.1:${bridge.port}`, { origin: FIGMA_PLUGIN_ORIGIN });
  await once(socket, "open");
  const welcomePromise = waitForMessage(socket, "welcome");
  socket.send(JSON.stringify({
    type: "hello",
    protocolVersion: "1",
    workspaceId: WORKSPACE_ID,
    taskId: TASK_ID,
    sessionId: "paired-session-1",
    clientId: pairing.clientId,
    serverId: pairing.serverId,
    pairingId: pairing.pairingId,
    metadata: {
      fileIdentity: "figma-file:test-file-key",
      fileIdentityQuality: "stable",
      documentName: "Dedicated Pairing Test File",
      currentPageId: "1:1",
      currentPageName: "Page 1",
    },
  }));
  const welcome = await welcomePromise;
  assert.equal(welcome.authState, "challenge");
  const challengePromise = waitForMessage(socket, "auth_challenge");
  socket.send(JSON.stringify({
    type: "ready",
    workspaceId: WORKSPACE_ID,
    taskId: TASK_ID,
    sessionId: "paired-session-1",
    clientId: pairing.clientId,
    fileIdentity: "figma-file:test-file-key",
    connectionId: welcome.connectionId,
  }));
  const challenge = await challengePromise;

  const rejectedPromise = waitForMessage(socket, "auth_result");
  socket.send(JSON.stringify({
    type: "auth_proof",
    protocolVersion: challenge.protocolVersion,
    serverId: pairing.serverId,
    clientId: pairing.clientId,
    pairingId: pairing.pairingId,
    nonce: challenge.nonce,
    proof: "invalid-proof",
  }));
  const rejected = await rejectedPromise;
  assert.equal(rejected.authenticated, false);
  assert.equal(bridge.connection.authenticated, false);
  await assert.rejects(
    bridge.callPlugin("create_poc", { expectedFileIdentity: "figma-file:test-file-key" }),
    /PAIRING_REQUIRED/,
  );
  socket.close();
});
