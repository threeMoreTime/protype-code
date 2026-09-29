import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const source = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "../plugin/code.js"), "utf8");
const OWNER = "local-codex-figma-bridge-poc";

function fixture() {
  const nodes = new Map();
  let mutations = 0;
  function node(id, type, parent = null) {
    const data = new Map();
    const item = { id, type, parent, name: id, children: [], reactions: [],
      setPluginData(key, value) { data.set(key, value); mutations += 1; },
      getPluginData(key) { return data.get(key) || ""; },
      appendChild(child) { child.parent.children = child.parent.children.filter((entry) => entry !== child);
        child.parent = this; this.children.push(child); mutations += 1; },
      resize() {},
      remove() { this.parent.children = this.parent.children.filter((entry) => entry !== this);
        nodes.delete(id); mutations += 1; },
      async setReactionsAsync(reactions) { this.reactions = reactions; mutations += 1; },
    };
    nodes.set(id, item);
    parent?.children.push(item);
    return item;
  }
  const page = node("1:1", "PAGE");
  const figma = { fileKey: "ownership-test", root: { name: "Dedicated test", children: [page] },
    currentPage: page, showUI() {}, on() {}, ui: { postMessage() {} },
    async getNodeByIdAsync(id) { return nodes.get(id) || null; },
    async setCurrentPageAsync(nextPage) { this.currentPage = nextPage; },
    createFrame() { const frame = node(`2:${nodes.size}`, "FRAME", this.currentPage); mutations += 1; return frame; },
  };
  const context = { figma, __html__: "", Set, String };
  vm.runInNewContext(`${source}\nglobalThis.executeScopedTest = executeScopedMutation; globalThis.executeReadTest = execute;`, context);
  const scope = { fileIdentity: "figma-file:ownership-test", pageId: page.id, rootNodeId: page.id };
  const run = (command, payload, { taskId = "task-A", operationId = "op-ownership-test-01" } = {}) =>
    context.executeScopedTest({ command, payload, trustedScope: scope,
      trustedOwnership: { workspaceId: "protype-code-local", taskId, revision: "1" }, operationId,
      testFixture: command.includes("foreign_fixture") });
  const read = (id) => context.executeReadTest("scope_read_node", { payload: { targetNodeId: id } });
  return { run, read, node, getNode: (id) => nodes.get(id), page, mutations: () => mutations };
}

test("scoped create stamps trusted task ownership and ignores client metadata claims", async () => {
  const f = fixture();
  const result = await f.run("scope_create_frame", { parentId: f.page.id, name: "owned",
    owner: "attacker", workspaceId: "other", taskId: "other", revision: "99" });
  const node = await f.read(result.id);
  assert.equal(node.owner, OWNER);
  assert.equal(node.workspaceId, "protype-code-local");
  assert.equal(node.taskId, "task-A");
  assert.equal(node.createdOperationId, "op-ownership-test-01");
  assert.equal(node.revision, "1");
  assert.ok(node.specNodeKey);
  assert.equal(node.parentId, f.page.id);
});

test("same-task update and delete work; another task cannot change the node", async () => {
  const f = fixture();
  const owned = await f.run("scope_create_frame", { parentId: f.page.id, name: "before" });
  const before = f.mutations();
  await assert.rejects(f.run("scope_update_frame", { targetNodeId: owned.id, name: "wrong task" },
    { taskId: "task-B" }), /OWNERSHIP_TASK_MISMATCH/);
  await assert.rejects(f.run("scope_delete_node", { targetNodeId: owned.id },
    { taskId: "task-B" }), /OWNERSHIP_TASK_MISMATCH/);
  assert.equal(f.mutations(), before);
  assert.equal((await f.read(owned.id)).name, "before");
  const updated = await f.run("scope_update_frame", { targetNodeId: owned.id, name: "after" });
  assert.equal(updated.name, "after");
  assert.equal(updated.auditBefore.name, "before");
  const deleted = await f.run("scope_delete_node", { targetNodeId: owned.id });
  assert.equal(deleted.exists, false);
  assert.equal(deleted.auditBefore.name, "after");
});

test("foreign same-name node inside scope rejects update, delete, and prototype source mutation", async () => {
  const f = fixture();
  const owned = await f.run("scope_create_frame", { parentId: f.page.id, name: "same name" });
  const foreign = f.node("9:1", "FRAME", f.page);
  foreign.name = "same name";
  const before = f.mutations();
  await assert.rejects(f.run("scope_update_frame", { targetNodeId: foreign.id, name: "spoofed",
    owner: OWNER, workspaceId: "protype-code-local", taskId: "task-A" }), /OWNERSHIP_REQUIRED/);
  await assert.rejects(f.run("scope_delete_node", { targetNodeId: foreign.id,
    owner: OWNER, workspaceId: "protype-code-local", taskId: "task-A" }), /OWNERSHIP_REQUIRED/);
  await assert.rejects(f.run("scope_set_prototype", { sourceNodeId: foreign.id,
    destinationNodeId: owned.id }), /OWNERSHIP_REQUIRED/);
  assert.equal(f.mutations(), before);
  assert.equal((await f.read(foreign.id)).name, "same name");
  assert.equal(foreign.reactions.length, 0);
});

test("delete rejects a mixed-owned subtree without removing either node", async () => {
  const f = fixture();
  const parent = await f.run("scope_create_frame", { parentId: f.page.id, name: "parent" });
  const foreignChild = f.node("9:2", "FRAME", f.getNode(parent.id));
  assert.equal((await f.read(parent.id)).owner, OWNER);
  const before = f.mutations();
  await assert.rejects(f.run("scope_delete_node", { targetNodeId: parent.id }), /OWNERSHIP_SUBTREE_VIOLATION/);
  assert.equal(f.mutations(), before);
  assert.equal((await f.read(parent.id)).id, parent.id);
  assert.equal((await f.read(foreignChild.id)).id, foreignChild.id);
});

test("development fixture creates an unowned frame and only removes its own marked leaf", async () => {
  const f = fixture();
  const created = await f.run("scope_create_foreign_fixture", { parentId: f.page.id, name: "foreign" });
  assert.equal((await f.read(created.id)).owner, "");
  await assert.rejects(f.run("scope_delete_node", { targetNodeId: created.id }), /OWNERSHIP_REQUIRED/);
  const removed = await f.run("scope_delete_foreign_fixture", { targetNodeId: created.id });
  assert.equal(removed.exists, false);
});
