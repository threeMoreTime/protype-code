import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { test } from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(path.join(root, "plugin", "ui.html"), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];

test("plugin UI clears an in-flight request when the socket disconnects", () => {
  assert.ok(script);
  const element = () => ({ textContent: "", style: {}, value: "", hidden: false,
    disabled: false, addEventListener() {} });
  class FakeWebSocket {
    constructor() { this.readyState = 0; }
    addEventListener() {}
  }
  const context = {
    WebSocket: FakeWebSocket,
    document: { getElementById: element },
    parent: { postMessage() {} },
    window: {},
    Map, Set, JSON, String,
    setTimeout, clearTimeout, setInterval, clearInterval,
  };
  vm.runInNewContext(`${script}\nuiPending.set("request-1", { connectionId: "c", sessionId: "s", fileIdentity: "f" }); closePending("socket disconnected"); globalThis.remaining = uiPending.size;`, context);
  assert.equal(context.remaining, 0);
});

test("plugin UI forwards one operationId through postMessage and back to WebSocket", () => {
  assert.ok(script);
  const posted = [];
  const element = () => ({ textContent: "", style: {}, value: "", hidden: false,
    disabled: false, addEventListener() {} });
  class FakeWebSocket {
    static OPEN = 1;
    constructor() { this.readyState = 1; this.listeners = new Map(); this.sent = []; }
    addEventListener(type, handler) { this.listeners.set(type, handler); }
    send(value) { this.sent.push(JSON.parse(value)); }
    emit(type, value) { this.listeners.get(type)?.({ data: JSON.stringify(value) }); }
  }
  const context = {
    WebSocket: FakeWebSocket, document: { getElementById: element },
    parent: { postMessage: (value) => posted.push(value.pluginMessage) },
    window: {}, Map, Set, JSON, String,
    setTimeout, clearTimeout, setInterval, clearInterval,
  };
  vm.runInNewContext(`${script}\nsession = { sessionId: "session-1", fileIdentity: "figma-file:test", clientId: "client-test" }; connectionId = "conn-1"; ready = true; authenticated = true; globalThis.testSocket = socket;`, context);
  context.testSocket.emit("message", { type: "request", workspaceId: "protype-code-local",
    taskId: "local-figma-bridge-poc", connectionId: "conn-1", sessionId: "session-1",
    fileIdentity: "figma-file:test", requestId: "req-1", operationId: "op-test-12345678",
    authorizationId: "auth-test", revision: "1", command: "scope_create_foreign_fixture",
    trustedOwnership: { workspaceId: "protype-code-local", taskId: "ownership-task-A", revision: "1" },
    testFixture: true,
    payload: { expectedFileIdentity: "figma-file:test" } });
  assert.equal(posted.at(-1).operationId, "op-test-12345678");
  assert.equal(posted.at(-1).authorizationId, "auth-test");
  assert.equal(posted.at(-1).trustedOwnership.taskId, "ownership-task-A");
  assert.equal(posted.at(-1).testFixture, true);
  context.window.onmessage({ data: { pluginMessage: {
    type: "plugin-result", requestId: "req-1", operationId: "op-test-12345678",
    connectionId: "conn-1", sessionId: "session-1", fileIdentity: "figma-file:test",
    ok: true, result: { id: "1:2" },
  } } });
  assert.equal(context.testSocket.sent.at(-1).operationId, "op-test-12345678");
  assert.equal(context.testSocket.sent.at(-1).requestId, "req-1");
});
