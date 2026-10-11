import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { once } from "node:events";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import WebSocket from "ws";
import { decodePngBase64 } from "../mcp/server.mjs";
import { startBridge } from "../relay/bridge-server.mjs";
import { createPairingProof, verifyPairingProof } from "../relay/pairing-store.mjs";
import { TaskAuthorizationStore } from "../relay/task-authorization-store.mjs";
import { FIGMA_PLUGIN_ORIGIN, TASK_ID, WORKSPACE_ID } from "../relay/protocol.mjs";

const POC_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MCP_ENTRY = path.join(POC_ROOT, "mcp", "server.mjs");

test('1 ms create timeout fixture is exposed only by an explicitly enabled development MCP process', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'figma-timeout-fixture-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const transport = new StdioClientTransport({ command: process.execPath, args: [MCP_ENTRY],
    cwd: POC_ROOT, env: { ...process.env, LOCAL_FIGMA_BRIDGE_PORT: '0',
      LOCAL_FIGMA_BRIDGE_ENABLE_TEST_FIXTURES: '1',
      LOCAL_FIGMA_BRIDGE_PAIRING_STATE_PATH: path.join(directory, 'pairing.json'),
      LOCAL_FIGMA_BRIDGE_AUTHORIZATION_STATE_PATH: path.join(directory, 'grants.json'),
      LOCAL_FIGMA_BRIDGE_AUDIT_PATH: path.join(directory, 'audit.jsonl') }, stderr: 'ignore' });
  const client = new Client({ name: 'timeout-fixture-registration-test', version: '0.0.1' });
  t.after(() => client.close());
  await client.connect(transport);
  const names = (await client.listTools()).tools.map((tool) => tool.name);
  assert.equal(names.includes('figma_test_scope_create_frame_1ms_timeout'), true);
  assert.equal(names.includes('figma_scope_design_apply'), true);
  const invalid = await client.callTool({ name: 'figma_scope_design_plan', arguments: {
    expectedFileIdentity: 'figma-file:synthetic', workspaceId: WORKSPACE_ID, taskId: TASK_ID,
    runId: 'test', spec: {}, unexpectedExecutable: 'figma.root.remove()',
  } });
  assert.equal(invalid.isError, true);
  assert.match(invalid.content[0].text, /Unrecognized key|unrecognized_keys/);
});

async function getFreePort() {
  const server = net.createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const port = address.port;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

function waitForSocketOpen(socket, timeoutMs = 2_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("WebSocket open timed out")), timeoutMs);
    socket.once("open", () => { clearTimeout(timer); resolve(); });
    socket.once("error", (error) => { clearTimeout(timer); reject(error); });
  });
}

async function connectFakePlugin(url, { sessionId = "test-session-001", clientId = "client-protocol-test-1",
  fileIdentity = "session-file:test", fileIdentityQuality = "session-only", origin = FIGMA_PLUGIN_ORIGIN,
  documentName = "Fake document (protocol test only)" } = {}) {
  const socket = new WebSocket(url, { origin });
  await waitForSocketOpen(socket);
  const welcomePromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Bridge welcome timed out")), 2_000);
    socket.on("message", (raw) => {
      const message = JSON.parse(raw.toString());
      if (message.type === "welcome") { clearTimeout(timer); resolve(message); }
    });
  });
  socket.send(JSON.stringify({
    type: "hello",
    protocolVersion: "1",
    workspaceId: WORKSPACE_ID,
    taskId: TASK_ID,
    sessionId,
    clientId,
    metadata: {
      fileIdentity,
      fileIdentityQuality,
      documentName,
      currentPageId: "1:1",
      currentPageName: "Page 1",
    },
  }));
  const welcome = await welcomePromise;
  socket.send(JSON.stringify({
    type: "ready",
    workspaceId: WORKSPACE_ID,
    taskId: TASK_ID,
    sessionId,
    clientId,
    fileIdentity,
    connectionId: welcome.connectionId,
  }));
  return { socket, welcome, sessionId, clientId, fileIdentity };
}

function waitForBridgeMessage(socket, type, timeoutMs = 1_500) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off("message", onMessage);
      reject(new Error(`Timed out waiting for bridge message ${type}`));
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

async function pairFakePlugin(fake, code) {
  const issuedPromise = waitForBridgeMessage(fake.socket, "pairing_issued");
  fake.socket.send(JSON.stringify({ type: "pairing_code", clientId: fake.clientId, code }));
  const issued = await issuedPromise;
  const challengePromise = waitForBridgeMessage(fake.socket, "auth_challenge");
  fake.socket.send(JSON.stringify({ type: "pairing_stored", serverId: issued.serverId,
    clientId: issued.clientId, pairingId: issued.pairingId }));
  const challenge = await challengePromise;
  const fields = { protocolVersion: challenge.protocolVersion, serverId: issued.serverId,
    clientId: issued.clientId, pairingId: issued.pairingId, nonce: challenge.nonce };
  const authResultPromise = waitForBridgeMessage(fake.socket, "auth_result");
  fake.socket.send(JSON.stringify({ type: "auth_proof", ...fields,
    proof: createPairingProof({ secret: issued.secret, ...fields, role: "client" }) }));
  const authResult = await authResultPromise;
  assert.equal(authResult.authenticated, true);
  assert.equal(verifyPairingProof({ secret: issued.secret, ...fields, role: "server",
    proof: authResult.serverProof }), true);
  const completePromise = waitForBridgeMessage(fake.socket, "auth_complete");
  fake.socket.send(JSON.stringify({ type: "auth_confirm", ...fields }));
  assert.equal((await completePromise).authenticated, true);
}

async function waitFor(predicate, timeoutMs = 1_500) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("Condition did not become true before timeout");
}

function parseToolText(result) {
  assert.equal(result.isError, undefined);
  const text = result.content.find((item) => item.type === "text")?.text;
  assert.ok(text, "expected a text tool result");
  return JSON.parse(text);
}

test("MCP stdio ↔ loopback WebSocket simulated plugin round-trip", async (t) => {
  const port = await getFreePort();
  const pairingDir = await mkdtemp(path.join(os.tmpdir(), "figma-bridge-protocol-"));
  t.after(async () => rm(pairingDir, { recursive: true, force: true }));
  const authorizationPath = path.join(pairingDir, "task-authorizations.json");
  const authorizationStore = new TaskAuthorizationStore({ filePath: authorizationPath });
  await authorizationStore.initialize();
  const authorization = await authorizationStore.issueForLocalControl({
    workspaceId: WORKSPACE_ID, taskId: TASK_ID, fileIdentity: "figma-file:protocol-test-key",
    scope: { fileIdentity: "figma-file:protocol-test-key", pageId: "1:1", rootNodeId: "1:2" },
    clientId: "client-protocol-test-1", allowedActions: ["create", "update", "delete", "prototype"],
    revision: "1", expiresAt: new Date(Date.now() + 60_000).toISOString(),
  });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [MCP_ENTRY],
    cwd: POC_ROOT,
    env: { ...process.env, LOCAL_FIGMA_BRIDGE_PORT: String(port),
      LOCAL_FIGMA_BRIDGE_ALLOWED_FILE_IDENTITIES: "figma-file:protocol-test-key",
      LOCAL_FIGMA_BRIDGE_PAIRING_STATE_PATH: path.join(pairingDir, "pairing-store.json"),
      LOCAL_FIGMA_BRIDGE_AUTHORIZATION_STATE_PATH: authorizationPath,
      LOCAL_FIGMA_BRIDGE_AUDIT_PATH: path.join(pairingDir, "mutation-audit.jsonl") },
    stderr: "ignore",
  });
  const client = new Client({ name: "local-figma-bridge-protocol-test", version: "0.0.1" });
  let fake = null;
  t.after(async () => {
    fake?.socket.close();
    await client.close().catch(() => {});
  });

  await client.connect(transport);
  fake = await connectFakePlugin(`ws://127.0.0.1:${port}`, {
    fileIdentity: "figma-file:protocol-test-key", fileIdentityQuality: "stable",
  });
  const seenCommands = [];
  fake.socket.on("message", (raw) => {
    const request = JSON.parse(raw.toString());
    if (request.type !== "request") return;
    seenCommands.push(request.command);
    const values = {
      status: { documentName: "Fake document (protocol test only)", currentPageName: "Page 1", fileIdentityQuality: "session-only" },
      read_document: { documentName: "Fake document (protocol test only)", pages: [{ id: "1:1", name: "Page 1" }], selection: [] },
      create_poc: { type: "FRAME", name: "C2C Bridge POC", width: 375, height: 812, simulated: true },
      create_text: { type: "TEXT", characters: "Local Codex → Local Figma", fontLoaded: true, simulated: true },
      set_layout: { layoutMode: "VERTICAL", paddingTop: 24, itemSpacing: 16, simulated: true },
      update_poc: { frame: { paddingTop: 32, itemSpacing: 20 }, text: { characters: "Bridge update and read-back verified" }, simulated: true },
      create_prototype_sample: { reaction: { trigger: { type: "ON_CLICK" }, action: { type: "NODE", navigation: "NAVIGATE" } }, simulated: true },
      delete_poc_owned: { deletedNodes: 3, simulated: true },
    };
    const result = values[request.command];
    if (!result) return;
    setTimeout(() => fake.socket.send(JSON.stringify({
      type: "result",
      workspaceId: WORKSPACE_ID,
      taskId: TASK_ID,
      connectionId: request.connectionId,
      sessionId: request.sessionId,
      fileIdentity: request.fileIdentity,
      requestId: request.requestId,
      ...(request.operationId ? { operationId: request.operationId } : {}),
      ok: true,
      result,
    })), request.command === "status" ? 25 : 0);
  });

  const tools = await client.listTools();
  const names = tools.tools.map((tool) => tool.name);
  assert.ok(names.includes("figma_status"));
  assert.ok(names.includes("figma_pairing_begin"));
  assert.ok(names.includes("figma_create_prototype_sample"));
  assert.ok(names.includes("figma_export_poc"));
  assert.equal(tools.tools.find((tool) => tool.name === "figma_status")?.annotations?.readOnlyHint, true);
  assert.equal(tools.tools.find((tool) => tool.name === "figma_read_document")?.annotations?.readOnlyHint, true);
  assert.notEqual(tools.tools.find((tool) => tool.name === "figma_create_poc")?.annotations?.readOnlyHint, true);
  assert.equal(names.some((name) => /eval|arbitrary/i.test(name)), false);
  assert.ok(names.includes("figma_scope_delete_node"));
  assert.ok(names.includes("figma_operation_status"));
  assert.ok(names.includes("figma_reconcile_create_operation"));
  assert.equal(names.includes("figma_test_scope_create_frame_1ms_timeout"), false,
    "timeout fixture must not be exposed by the normal MCP server");

  const results = await Promise.all([
    client.callTool({ name: "figma_status", arguments: {} }),
    client.callTool({ name: "figma_read_document", arguments: {} }),
  ]);
  assert.equal(parseToolText(results[0]).documentName, "Fake document (protocol test only)");
  assert.equal(parseToolText(results[0]).connected, true);
  assert.equal(parseToolText(results[1]).pages[0].name, "Page 1");

  const bootstrap = parseToolText(await client.callTool({ name: "figma_pairing_begin", arguments: {} }));
  assert.equal(bootstrap.clientId, fake.clientId);
  await pairFakePlugin(fake, bootstrap.code);

  const boundFile = { expectedFileIdentity: fake.fileIdentity, workspaceId: WORKSPACE_ID,
    taskId: TASK_ID, authorizationId: authorization.authorizationId, revision: "1" };
  const args = (index) => ({ ...boundFile, operationId: `op-protocol-test-${index}` });
  assert.equal(parseToolText(await client.callTool({ name: "figma_create_poc", arguments: args("create-frame") })).simulated, true);
  assert.equal(parseToolText(await client.callTool({ name: "figma_create_text", arguments: args("create-text") })).fontLoaded, true);
  assert.equal(parseToolText(await client.callTool({ name: "figma_set_layout", arguments: args("set-layout") })).layoutMode, "VERTICAL");
  assert.equal(parseToolText(await client.callTool({ name: "figma_update_poc", arguments: args("update") })).frame.paddingTop, 32);
  assert.equal(parseToolText(await client.callTool({ name: "figma_create_prototype_sample", arguments: args("prototype") })).simulated, true);
  assert.equal(parseToolText(await client.callTool({ name: "figma_delete_poc_owned", arguments: args("delete") })).simulated, true);
  assert.ok(seenCommands.includes("create_prototype_sample"));
  assert.equal(seenCommands.includes("export_poc"), false, "the simulated peer must not be reported as a Figma export");
});

test("loopback identity, Origin allowlist, request correlation, and timeout fail closed", async (t) => {
  const trace = [];
  const bridge = await startBridge({ port: 0, requestTimeoutMs: 100, logger: (entry) => trace.push(entry) });
  const fake = await connectFakePlugin(`ws://127.0.0.1:${bridge.port}`, { sessionId: "unit-session-01", fileIdentity: "unit-file" });
  t.after(async () => {
    fake.socket.close();
    await bridge.close();
  });

  await waitFor(() => bridge.connection?.ready === true);
  assert.equal(bridge.host, "127.0.0.1");
  assert.equal(bridge.address.address, "127.0.0.1");
  assert.equal(bridge.connection.ready, true);
  await assert.rejects(
    bridge.callPlugin("create_poc", { expectedFileIdentity: "wrong-file" }, 50),
    /file identity/i,
  );
  await assert.rejects(bridge.callPlugin("create_poc", {}, 50), /file identity/i);
  await assert.rejects(
    bridge.callPlugin("create_poc", { expectedFileIdentity: fake.fileIdentity }, 50),
    /WRITE_REQUIRES_STABLE_FILE_IDENTITY/,
  );

  const rejected = new WebSocket(`ws://127.0.0.1:${bridge.port}`, { origin: "https://untrusted.example" });
  const rejectedResult = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve("timeout"), 1_500);
    rejected.once("open", () => { clearTimeout(timer); resolve("open"); });
    rejected.once("error", () => { clearTimeout(timer); resolve("rejected"); });
    rejected.once("close", () => { clearTimeout(timer); resolve("rejected"); });
  });
  assert.equal(rejectedResult, "rejected");

  const requestReceived = new Promise((resolve) => {
    const onMessage = (raw) => {
      const request = JSON.parse(raw.toString());
      if (request.type !== "request") return;
      fake.socket.off("message", onMessage);
      resolve(request);
    };
    fake.socket.on("message", onMessage);
  });
  const pending = bridge.callPlugin("status", {}, 50);
  const lateRequest = await requestReceived;
  await assert.rejects(pending, /timed out/);
  assert.ok(trace.some((entry) => entry.event === "request" && entry.requestId === lateRequest.requestId && entry.command === "status"));
  assert.ok(trace.some((entry) => entry.event === "timeout" && entry.requestId === lateRequest.requestId));
  fake.socket.send(JSON.stringify({
    type: "result",
    workspaceId: WORKSPACE_ID,
    taskId: TASK_ID,
    connectionId: lateRequest.connectionId,
    sessionId: lateRequest.sessionId,
    fileIdentity: lateRequest.fileIdentity,
    requestId: lateRequest.requestId,
    ok: true,
    result: { stale: true },
  }));
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(bridge.connection.ready, true, "a late response is ignored without replacing the live session");
  await assert.rejects(bridge.callPlugin("execute_code", {}), /not allowlisted/);
});

test("accepts a null-origin development plugin iframe after the identity handshake", async (t) => {
  const bridge = await startBridge({ port: 0 });
  t.after(async () => bridge.close());
  const fake = await connectFakePlugin(`ws://127.0.0.1:${bridge.port}`, { origin: "null" });
  t.after(() => fake.socket.close());
  await waitFor(() => bridge.connection?.ready === true);
  assert.equal(bridge.connection.metadata.fileIdentity, fake.fileIdentity);
});

test("a denied stable identity overrides the write allowlist regardless of document name", async (t) => {
  const protectedIdentity = "figma-file:synthetic-protected-file";
  const bridge = await startBridge({ port: 0,
    deniedFileIdentities: new Set([protectedIdentity]),
    allowedFileIdentities: new Set([protectedIdentity]) });
  t.after(async () => bridge.close());
  const names = ["Original Synthetic Document", "Renamed Synthetic Document"];
  for (const documentName of names) {
    const fake = await connectFakePlugin(`ws://127.0.0.1:${bridge.port}`, {
      documentName, fileIdentity: protectedIdentity, fileIdentityQuality: "stable",
    });
    await waitFor(() => bridge.connection?.ready === true);
    let requests = 0;
    fake.socket.on("message", (raw) => {
      if (JSON.parse(raw.toString()).type === "request") requests += 1;
    });
    assert.throws(() => bridge.beginPairing(), /FILE_IDENTITY_DENIED/);
    await assert.rejects(
      bridge.callPlugin("create_poc", { expectedFileIdentity: protectedIdentity }, 50),
      /FILE_IDENTITY_DENIED/,
    );
    assert.equal(requests, 0, "a denied write must never reach the plugin");
    const closed = once(fake.socket, "close");
    fake.socket.close();
    await closed;
    await waitFor(() => bridge.connection === null);
  }
});

test("an empty write allowlist rejects pairing and mutations before plugin requests", async (t) => {
  const bridge = await startBridge({ port: 0 });
  t.after(async () => bridge.close());
  const identity = "figma-file:synthetic-unlisted-file";
  const fake = await connectFakePlugin(`ws://127.0.0.1:${bridge.port}`, {
    fileIdentity: identity, fileIdentityQuality: "stable",
  });
  t.after(() => fake.socket.close());
  await waitFor(() => bridge.connection?.ready === true);
  let requests = 0;
  fake.socket.on("message", (raw) => {
    if (JSON.parse(raw.toString()).type === "request") requests += 1;
  });
  assert.throws(() => bridge.beginPairing(), /FILE_IDENTITY_NOT_ALLOWLISTED/);
  await assert.rejects(bridge.callPlugin("create_poc", { expectedFileIdentity: identity }),
    /FILE_IDENTITY_NOT_ALLOWLISTED/);
  assert.equal(requests, 0);
});

test("export validator rejects non-PNG and oversized data", () => {
  assert.throws(() => decodePngBase64(Buffer.from("not a png").toString("base64")), /not a valid PNG/);
  assert.throws(() => decodePngBase64("!"), /valid base64/);
  assert.throws(() => decodePngBase64("A".repeat(7_000_000)), /exceeds the POC export limit/);
});
