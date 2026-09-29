import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { test } from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(path.join(root, "plugin", "code.js"), "utf8");

test("plugin main sends a direct message that Figma exposes as event.data.pluginMessage", async () => {
  const sent = [];
  const page = { id: "1:1", name: "Test page", selection: [] };
  const storage = new Map();
  const figma = {
    root: { id: "0:0", name: "Isolated test file", children: [page] },
    currentPage: page,
    clientStorage: { async getAsync(key) { return storage.get(key); }, async setAsync(key, value) { storage.set(key, value); } },
    ui: { postMessage: (message) => sent.push(message), onmessage: null },
    showUI: () => {},
    on: () => {},
  };
  vm.runInNewContext(source, { figma, __html__: "", Date, Math, Set, String });
  await figma.ui.onmessage({ type: "bridge-initialize" });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].type, "bridge-hello");
  assert.equal(sent[0].documentName, "Isolated test file");
  assert.equal(sent[0].mutationAuditVersion, "8.0-F");
});

test("plugin main returns the logical operationId with the transport requestId", () => {
  const sent = [];
  const page = { id: "1:1", name: "Test page", selection: [] };
  const figma = {
    root: { id: "0:0", name: "Dedicated test file", children: [page] }, currentPage: page,
    fileKey: "test-key", ui: { postMessage: (message) => sent.push(message), onmessage: null },
    showUI() {}, on() {},
  };
  const context = { figma, __html__: "", Date, Math, Set, String };
  vm.runInNewContext(`${source}\nglobalThis.respondForTest = respond;`, context);
  context.respondForTest({ requestId: "req-1", operationId: "op-test-12345678" }, true, { id: "1:2" });
  assert.equal(sent[0].requestId, "req-1");
  assert.equal(sent[0].operationId, "op-test-12345678");
});

test("plugin client identity persists through Figma clientStorage across main-thread restarts", async () => {
  const storage = new Map();
  const runPluginMain = async () => {
    const sent = [];
    const page = { id: "1:1", name: "Test page", selection: [] };
    const figma = {
      root: { id: "0:0", name: "Isolated test file", children: [page] },
      currentPage: page,
      fileKey: "pairing-test-key",
      clientStorage: {
        async getAsync(key) { return storage.get(key); },
        async setAsync(key, value) { storage.set(key, value); },
      },
      ui: { postMessage: (message) => sent.push(message), onmessage: null },
      showUI() {}, on() {},
    };
    vm.runInNewContext(source, { figma, __html__: "", Date, Math, Set, String });
    await figma.ui.onmessage({ type: "bridge-initialize" });
    return sent[0];
  };

  const first = await runPluginMain();
  const second = await runPluginMain();
  assert.match(first.clientId, /^client-[a-z0-9-]+$/);
  assert.equal(second.clientId, first.clientId);
  assert.equal(storage.get("local-codex-figma-bridge-poc-client-id"), first.clientId);
});

test("plugin main persists a pairing record through clientStorage without exposing it in status", async () => {
  const storage = new Map();
  const runPluginMain = async () => {
    const sent = [];
    const page = { id: "1:1", name: "Test page", selection: [] };
    const figma = {
      root: { id: "0:0", name: "Isolated test file", children: [page] },
      currentPage: page,
      fileKey: "pairing-test-key",
      clientStorage: { async getAsync(key) { return storage.get(key); }, async setAsync(key, value) { storage.set(key, value); } },
      ui: { postMessage: (message) => sent.push(message), onmessage: null },
      showUI() {}, on() {},
    };
    vm.runInNewContext(source, { figma, __html__: "", Date, Math, Set, String });
    await figma.ui.onmessage({ type: "bridge-initialize" });
    return { figma, sent };
  };

  const first = await runPluginMain();
  const clientId = first.sent[0].clientId;
  const pairingRecord = { serverId: "server-test-1", clientId, pairingId: "pair-test-1", secret: "A".repeat(43) };
  await first.figma.ui.onmessage({ type: "pairing-persist", clientId, pairingRecord });
  assert.equal(first.sent.at(-1).type, "pairing-stored");
  assert.deepEqual(storage.get("local-codex-figma-bridge-poc-pairing"), pairingRecord);

  const second = await runPluginMain();
  assert.equal(second.sent[0].clientId, clientId);
  assert.deepEqual(second.sent[0].pairingRecord, pairingRecord);
  assert.equal(second.sent[0].pairingState, "paired");
  assert.equal(JSON.stringify(second.sent[0]).includes(pairingRecord.secret), true,
    "the bridge hello carries the secret privately to the plugin UI for HMAC; status omits it");
});

test("a read-back summary includes parent, font, and ownership evidence", () => {
  const page = { id: "1:1", name: "Test page", selection: [] };
  const figma = {
    root: { id: "0:0", name: "Isolated test file", children: [page] },
    currentPage: page,
    ui: { postMessage() {}, onmessage: null },
    showUI() {}, on() {},
  };
  const context = { figma, __html__: "", Date, Math, Set, String };
  vm.runInNewContext(`${source}\nglobalThis.summarizeForTest = summarizeNode;`, context);
  const text = {
    id: "1:3", type: "TEXT", name: "POC title", characters: "Local Codex → Local Figma",
    parent: { id: "1:2" }, fontName: { family: "Inter", style: "Regular" },
    getPluginData(key) {
      return key.endsWith("-owner") ? "local-codex-figma-bridge-poc" : "poc-text";
    },
  };
  const summary = context.summarizeForTest(text);
  assert.equal(summary.parentId, "1:2");
  assert.equal(summary.fontName.family, "Inter");
  assert.equal(summary.owner, "local-codex-figma-bridge-poc");
});

test("ownership marker uses the required owner value and rejects foreign nodes", () => {
  const page = { id: "1:1", name: "Test page", selection: [] };
  const figma = {
    root: { id: "0:0", name: "Isolated test file", children: [page] },
    currentPage: page,
    ui: { postMessage() {}, onmessage: null },
    showUI() {}, on() {},
  };
  const context = { figma, __html__: "", Date, Math, Set, String };
  vm.runInNewContext(`${source}\nglobalThis.markOwnedForTest = markOwned; globalThis.isOwnedForTest = isOwned;`, context);
  const data = new Map();
  const node = { setPluginData: (key, value) => data.set(key, value), getPluginData: (key) => data.get(key) || "" };
  context.markOwnedForTest(node, "poc-frame");
  assert.equal(data.get("local-codex-figma-bridge-poc-owner"), "local-codex-figma-bridge-poc");
  assert.equal(context.isOwnedForTest(node), true);
  data.set("local-codex-figma-bridge-poc-owner", "foreign-owner");
  assert.equal(context.isOwnedForTest(node), false);
});

test("renaming a session-only file cannot create stable write authorization", async () => {
  const sent = [];
  let createPageCalls = 0;
  const page = { id: "0:1", name: "Page 1", selection: [] };
  const storage = new Map();
  const figma = {
    root: { id: "0:0", name: "Synthetic protected design", children: [page] },
    currentPage: page,
    clientStorage: { async getAsync(key) { return storage.get(key); }, async setAsync(key, value) { storage.set(key, value); } },
    ui: { postMessage: (message) => sent.push(message), onmessage: null },
    showUI() {}, on() {},
    createPage() { createPageCalls += 1; throw new Error("createPage must not run"); },
  };
  vm.runInNewContext(source, { figma, __html__: "", Date, Math, Set, String });
  await figma.ui.onmessage({ type: "bridge-initialize" });
  const initialHello = sent.at(-1);
  assert.equal(initialHello.fileIdentityQuality, "session-only");
  figma.root.name = "Renamed synthetic design";
  await figma.ui.onmessage({ type: "bridge-initialize" });
  const hello = sent.at(-1);
  assert.notEqual(hello.fileIdentity, initialHello.fileIdentity);
  assert.equal(hello.fileIdentityQuality, "session-only");
  await figma.ui.onmessage({ type: "connection-ready", workspaceId: hello.workspaceId,
    taskId: hello.taskId, sessionId: hello.sessionId, clientId: hello.clientId,
    fileIdentity: hello.fileIdentity, connectionId: "test-connection" });
  await figma.ui.onmessage({ type: "plugin-command", workspaceId: hello.workspaceId,
    taskId: hello.taskId, sessionId: hello.sessionId, fileIdentity: hello.fileIdentity,
    connectionId: "test-connection", requestId: "unstable-identity-write",
    command: "create_poc", expectedFileIdentity: hello.fileIdentity });
  assert.equal(createPageCalls, 0);
  assert.equal(sent.at(-1).ok, false);
  assert.match(sent.at(-1).error, /STABLE_FILE_IDENTITY_REQUIRED/);
});

test("plugin main refuses a write until authenticated by a paired bridge session", async () => {
  const sent = [];
  let createPageCalls = 0;
  const page = { id: "0:1", name: "Page 1", selection: [] };
  const storage = new Map();
  const figma = {
    root: { id: "0:0", name: "Dedicated test file", children: [page] },
    currentPage: page,
    fileKey: "dedicated-test-key",
    clientStorage: { async getAsync(key) { return storage.get(key); }, async setAsync(key, value) { storage.set(key, value); } },
    ui: { postMessage: (message) => sent.push(message), onmessage: null },
    showUI() {}, on() {},
    createPage() { createPageCalls += 1; throw new Error("createPage must not run"); },
  };
  vm.runInNewContext(source, { figma, __html__: "", Date, Math, Set, String });
  await figma.ui.onmessage({ type: "bridge-initialize" });
  const hello = sent.at(-1);
  await figma.ui.onmessage({ type: "connection-ready", workspaceId: hello.workspaceId,
    taskId: hello.taskId, sessionId: hello.sessionId, clientId: hello.clientId,
    fileIdentity: hello.fileIdentity, connectionId: "unpaired-test-connection" });
  await figma.ui.onmessage({ type: "plugin-command", workspaceId: hello.workspaceId,
    taskId: hello.taskId, sessionId: hello.sessionId, fileIdentity: hello.fileIdentity,
    connectionId: "unpaired-test-connection", requestId: "unpaired-write",
    command: "create_poc", expectedFileIdentity: hello.fileIdentity });
  assert.equal(createPageCalls, 0);
  assert.equal(sent.at(-1).ok, false);
  assert.match(sent.at(-1).error, /PAIRING_REQUIRED/);
});

test("preparing an owned POC page does not depend on switching the active Figma page", async () => {
  const pageData = new Map();
  const originalPage = { id: "0:1", name: "Page 1", selection: [] };
  const pocPage = {
    id: "1:1", name: "", children: [],
    setPluginData: (key, value) => pageData.set(key, value),
    getPluginData: (key) => pageData.get(key) || "",
    async loadAsync() {},
  };
  const figma = {
    root: { id: "0:0", name: "Dedicated test file", children: [originalPage] },
    currentPage: originalPage,
    ui: { postMessage() {}, onmessage: null },
    showUI() {}, on() {},
    createPage() { this.root.children.push(pocPage); return pocPage; },
    async setCurrentPageAsync() { throw new Error("page switch must not be required"); },
  };
  const context = { figma, __html__: "", Date, Math, Set, String };
  vm.runInNewContext(`${source}\nglobalThis.preparePocPageForTest = ensurePocPage;`, context);
  assert.equal(await context.preparePocPageForTest(), pocPage);
  assert.equal(figma.currentPage, originalPage);
  assert.equal(pageData.get("local-codex-figma-bridge-poc-owner"), "local-codex-figma-bridge-poc");
});

test("deleting owned POC nodes does not depend on switching the active Figma page", async () => {
  const originalPage = { id: "0:1", name: "Page 1", selection: [] };
  const frame = {
    id: "1:2", type: "FRAME", name: "C2C Bridge POC", children: [],
    getPluginData: (key) => key.endsWith("-owner") ? "local-codex-figma-bridge-poc" : "poc-frame",
    remove() { pocPage.children = []; },
  };
  const pocPage = {
    id: "1:1", name: "Codex Bridge POC", children: [frame],
    getPluginData: (key) => key.endsWith("-owner") ? "local-codex-figma-bridge-poc" : "",
    async loadAsync() {},
  };
  const figma = {
    root: { id: "0:0", name: "Dedicated test file", children: [originalPage, pocPage] },
    currentPage: pocPage,
    ui: { postMessage() {}, onmessage: null },
    showUI() {}, on() {},
    async setCurrentPageAsync() { throw new Error("page switch must not be required"); },
    async getNodeByIdAsync() { return pocPage.children[0] || null; },
  };
  const context = { figma, __html__: "", Date, Math, Set, String };
  vm.runInNewContext(`${source}\nglobalThis.deletePocOwnedForTest = deletePocOwned;`, context);
  const result = await context.deletePocOwnedForTest();
  assert.equal(result.deletedNodes, 1);
  assert.equal(result.readBackAbsent, true);
  assert.equal(result.pageDeleted, false);
  assert.equal(figma.currentPage, pocPage);
  assert.equal(pocPage.children.length, 0);
});
