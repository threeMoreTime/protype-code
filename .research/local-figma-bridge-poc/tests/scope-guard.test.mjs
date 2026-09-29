import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { TaskAuthorizationStore } from "../relay/task-authorization-store.mjs";

const source = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "../plugin/code.js"), "utf8");

function fixture() {
  const nodes = new Map();
  let mutations = 0;
  function node(id, type, parent = null) {
    const data = new Map();
    const value = { id, type, parent, name: id, children: [], reactions: [],
      setPluginData(key, item) { data.set(key, item); },
      getPluginData(key) { return data.get(key) || ""; },
      appendChild(child) { if (child.parent) child.parent.children = child.parent.children.filter((entry) => entry !== child); child.parent = this; this.children.push(child); mutations += 1; },
      resize() {}, remove() { this.parent.children = this.parent.children.filter((entry) => entry !== this); nodes.delete(id); mutations += 1; },
      async setReactionsAsync(reactions) { this.reactions = reactions; mutations += 1; },
    };
    nodes.set(id, value);
    parent?.children.push(value);
    return value;
  }
  const pageA = node("1:1", "PAGE");
  const pageB = node("2:1", "PAGE");
  const root = node("1:2", "FRAME", pageA);
  const child = node("1:3", "FRAME", root);
  const foreign = node("1:4", "FRAME", pageA);
  const foreignChild = node("1:5", "FRAME", foreign);
  const otherPageRoot = node("2:2", "FRAME", pageB);
  for (const item of [root, child, foreign, foreignChild, otherPageRoot]) {
    item.setPluginData("local-codex-figma-bridge-poc-owner", "local-codex-figma-bridge-poc");
    item.setPluginData("local-codex-figma-bridge-poc-workspace-id", "protype-code-local");
    item.setPluginData("local-codex-figma-bridge-poc-task-id", "local-figma-bridge-poc");
  }
  const figma = { fileKey: "scope-test", root: { name: "Dedicated test", children: [pageA, pageB] },
    currentPage: pageA, showUI() {}, on() {}, ui: { postMessage() {} },
    async getNodeByIdAsync(id) { return nodes.get(id) || null; },
    async setCurrentPageAsync(page) { this.currentPage = page; },
    createFrame() { const frame = node(`3:${nodes.size}`, "FRAME", this.currentPage); mutations += 1; return frame; },
  };
  const context = { figma, __html__: "", Set, String };
  vm.runInNewContext(`${source}\nglobalThis.resolveScopeTest = resolveScope; globalThis.executeScopedTest = executeScopedMutation; globalThis.executeReadTest = execute;`, context);
  const scope = { fileIdentity: "figma-file:scope-test", pageId: pageA.id, rootNodeId: root.id };
  const run = (command, payload, trustedScope = scope) => context.executeScopedTest({ command, payload, trustedScope,
    trustedOwnership: { workspaceId: "protype-code-local", taskId: "local-figma-bridge-poc", revision: "1" },
    operationId: "op-scope-regression-01" });
  return { run, read: (id) => context.executeReadTest("scope_read_node", { payload: { targetNodeId: id } }),
    scope, nodes, root, child, foreign, foreignChild, otherPageRoot, pageA, pageB,
    mutations: () => mutations };
}

test("trusted authorization requires a matching file/page/root scope", async () => {
  const store = new TaskAuthorizationStore();
  await store.initialize();
  const base = { workspaceId: "w", taskId: "t", fileIdentity: "figma-file:scope-test", clientId: "client-test-12345678",
    allowedActions: ["create"], revision: "1", expiresAt: new Date(Date.now() + 60_000).toISOString() };
  await assert.rejects(store.issueForLocalControl(base), /AUTH_INVALID/);
  await assert.rejects(store.issueForLocalControl({ ...base, scope: { fileIdentity: "figma-file:other", pageId: "1:1", rootNodeId: "1:2" } }), /AUTH_INVALID/);
  const record = await store.issueForLocalControl({ ...base, scope: { fileIdentity: base.fileIdentity, pageId: "1:1", rootNodeId: "1:2" } });
  assert.equal(record.scope.rootNodeId, "1:2");
});

test("create, update and delete inside subtree; sibling and other page fail without mutation", async () => {
  const f = fixture();
  const created = await f.run("scope_create_frame", { parentId: f.child.id, name: "inside" });
  assert.equal(created.parentId, f.child.id);
  const updated = await f.run("scope_update_frame", { targetNodeId: created.id, name: "updated" });
  assert.equal(updated.name, "updated");
  const before = f.mutations();
  for (const [command, payload, code] of [
    ["scope_create_frame", { parentId: f.foreign.id, name: "outside" }, "CREATE_PARENT_SCOPE_VIOLATION"],
    ["scope_update_frame", { targetNodeId: f.foreignChild.id, name: "outside" }, "SCOPE_VIOLATION"],
    ["scope_delete_node", { targetNodeId: f.foreignChild.id }, "SCOPE_VIOLATION"],
    ["scope_update_frame", { targetNodeId: f.otherPageRoot.id, name: "outside" }, "SCOPE_PAGE_MISMATCH"],
    ["scope_create_frame", { parentId: f.pageB.id, name: "outside" }, "SCOPE_PAGE_MISMATCH"],
  ]) await assert.rejects(f.run(command, payload), new RegExp(code));
  assert.equal(f.mutations(), before);
  const deleted = await f.run("scope_delete_node", { targetNodeId: created.id });
  assert.equal(deleted.exists, false);
});

test("prototype validates both ends before writing and rejects missing/mismatched roots", async () => {
  const f = fixture();
  const before = f.mutations();
  await assert.rejects(f.run("scope_set_prototype", { sourceNodeId: f.child.id, destinationNodeId: f.foreignChild.id }), /PROTOTYPE_TARGET_SCOPE_VIOLATION/);
  await assert.rejects(f.run("scope_set_prototype", { sourceNodeId: f.foreignChild.id, destinationNodeId: f.child.id }), /PROTOTYPE_SOURCE_SCOPE_VIOLATION/);
  await assert.rejects(f.run("scope_update_frame", { targetNodeId: f.child.id, name: "x" }, { ...f.scope, rootNodeId: "9:9" }), /SCOPE_ROOT_NOT_FOUND/);
  await assert.rejects(f.run("scope_update_frame", { targetNodeId: f.child.id, name: "x" }, { ...f.scope, rootNodeId: f.otherPageRoot.id }), /SCOPE_ROOT_PAGE_MISMATCH/);
  await assert.rejects(f.run("scope_create_frame", { parentId: f.root.id, name: "x" }, { ...f.scope, rootNodeId: f.pageB.id }), /SCOPE_ROOT_PAGE_MISMATCH/);
  await assert.rejects(f.run("scope_update_frame", { targetNodeId: f.child.id, name: "x" }, { ...f.scope, fileIdentity: "figma-file:other" }), /SCOPE_FILE_MISMATCH/);
  assert.equal(f.mutations(), before);
  assert.equal(f.child.reactions.length, 0);
  await f.run("scope_set_prototype", { sourceNodeId: f.child.id, destinationNodeId: f.root.id });
  assert.equal(f.child.reactions[0].actions[0].destinationId, f.root.id);
});

test("inactive page ID is readable without loading its children", async () => {
  const f = fixture();
  const page = await f.read(f.pageB.id);
  assert.equal(page.type, "PAGE");
  assert.equal(page.id, f.pageB.id);
  assert.equal(page.childIds, "NOT VERIFIED");
});

test("legacy implicit write command fails closed before any Figma mutation", async () => {
  const f = fixture();
  const before = f.mutations();
  await assert.rejects(f.run("create_poc", {}), /SCOPE_VIOLATION/);
  await assert.rejects(f.run("delete_poc_owned", {}), /SCOPE_VIOLATION/);
  assert.equal(f.mutations(), before);
});
