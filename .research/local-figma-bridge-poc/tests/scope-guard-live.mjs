// Live Figma Desktop validation. Run only against the pinned dedicated test file.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { TaskAuthorizationStore } from "../relay/task-authorization-store.mjs";
import { TASK_ID, WORKSPACE_ID } from "../relay/protocol.mjs";

import { requireLocalTestClientId, requireLocalTestFileIdentity, requireLocalTestNodeId, requireLocalTestValue } from "../scripts/issue-test-authorization.mjs";

const TEST_FILE_A_IDENTITY = requireLocalTestFileIdentity("FIGMA_TEST_FILE_A_IDENTITY");
const TEST_FILE_B_IDENTITY = requireLocalTestFileIdentity("FIGMA_TEST_FILE_B_IDENTITY");
const TEST_CLIENT_ID_1 = requireLocalTestClientId("FIGMA_TEST_SCOPE_GUARD_LIVE_CLIENT_ID_1");
const TEST_NODE_ID_1 = requireLocalTestNodeId("FIGMA_TEST_SCOPE_GUARD_LIVE_NODE_ID_1");
const TEST_NODE_ID_2 = requireLocalTestNodeId("FIGMA_TEST_SCOPE_GUARD_LIVE_NODE_ID_2");
const TEST_NODE_ID_3 = requireLocalTestNodeId("FIGMA_TEST_SCOPE_GUARD_LIVE_NODE_ID_3");
const TEST_NODE_ID_4 = requireLocalTestNodeId("FIGMA_TEST_SCOPE_GUARD_LIVE_NODE_ID_4");
const TEST_NODE_ID_5 = requireLocalTestNodeId("FIGMA_TEST_SCOPE_GUARD_LIVE_NODE_ID_5");
const TEST_DOCUMENT_NAME_1 = requireLocalTestValue("FIGMA_TEST_SCOPE_GUARD_LIVE_DOCUMENT_NAME_1");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE = TEST_FILE_A_IDENTITY;
const OTHER_FILE = TEST_FILE_B_IDENTITY;
const CLIENT = TEST_CLIENT_ID_1;
const DOCUMENT = TEST_DOCUMENT_NAME_1;
const AUTH_PATH = path.join(ROOT, "state", "scope-guard-authorizations.json");
const LOG = path.join(ROOT, "logs", `phase8-0d-live-${new Date().toISOString().replaceAll(":", "-")}.jsonl`);
const RESUME = process.argv.includes("--resume");
await mkdir(path.dirname(LOG), { recursive: true });
const evidence = async (event, fields = {}) => appendFile(LOG,
  `${JSON.stringify({ timestamp: new Date().toISOString(), event, ...fields })}\n`, "utf8");
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const store = new TaskAuthorizationStore({ filePath: AUTH_PATH });
await store.initialize();
let stage = null;
let createdIds = [];

async function connect() {
  const transport = new StdioClientTransport({ command: process.execPath,
    args: [path.join(ROOT, "mcp", "server.mjs")], cwd: ROOT,
    env: { ...process.env, LOCAL_FIGMA_BRIDGE_AUTHORIZATION_STATE_PATH: AUTH_PATH }, stderr: "pipe" });
  const client = new Client({ name: "phase8-0d-real-figma", version: "0.0.1" });
  await client.connect(transport);
  const call = async (name, args = {}) => {
    const started = Date.now();
    const response = await client.callTool({ name, arguments: args });
    const raw = response.content?.find((item) => item.type === "text")?.text || "";
    let value;
    try { value = JSON.parse(raw); } catch { value = raw; }
    const result = { isError: response.isError === true, value };
    await evidence("mcp_call", { name, args, result, latencyMs: Date.now() - started });
    return result;
  };
  let status;
  for (let i = 0; i < 30; i += 1) {
    const result = await call("figma_status");
    if (!result.isError && result.value.connected && result.value.bridgeAuth?.authenticated) {
      status = result.value;
      break;
    }
    await pause(1_000);
  }
  assert.ok(status, "Figma plugin did not connect and authenticate within 30 seconds");
  assert.equal(status.documentName, DOCUMENT, "HARD FAIL: active file is not the dedicated test document");
  assert.equal(status.fileIdentity, FILE);
  assert.equal(status.bridgeAuth.clientId, CLIENT);
  assert.equal(status.fileIdentityQuality, "stable");
  assert.equal(status.scopeGuardVersion, "8.0-D", "Figma is still running the previous plugin code; reload the Development Plugin");
  await evidence("identity_pin", { fileIdentity: FILE, documentName: DOCUMENT,
    clientId: CLIENT, sessionId: status.sessionId, connectionId: status.connectionId });
  return { client, call, status };
}

async function readNode(call, id) {
  const result = await call("figma_scope_read_node", { targetNodeId: id });
  assert.equal(result.isError, false, `read ${id}`);
  return result.value;
}

function args(authorization, fields = {}) {
  return { expectedFileIdentity: FILE, workspaceId: WORKSPACE_ID, taskId: TASK_ID,
    authorizationId: authorization.authorizationId, revision: "1",
    operationId: `op-${randomUUID()}`, ...fields };
}

async function issue(fileIdentity, pageId, rootNodeId, actions) {
  const record = await store.issueForLocalControl({ workspaceId: WORKSPACE_ID, taskId: TASK_ID,
    fileIdentity, clientId: CLIENT, scope: { fileIdentity, pageId, rootNodeId },
    allowedActions: actions, revision: "1", expiresAt: new Date(Date.now() + 45 * 60_000).toISOString() });
  await evidence("trusted_authorization_issued", { record });
  return record;
}

async function mutation(call, test, name, authorization, fields, verify) {
  const input = args(authorization, fields);
  const response = await call(name, input);
  if (response.isError) throw new Error(`${test}: outcome unknown, do not blindly retry: ${response.value}`);
  assert.equal(response.value.operationId, input.operationId);
  await verify(response.value);
  await evidence("positive_verified", { test, input, response });
  return response.value;
}

async function denied(call, test, name, authorization, fields, code, observe) {
  const before = await observe();
  const input = args(authorization, fields);
  const response = await call(name, input);
  assert.equal(response.isError, true, test);
  assert.match(String(response.value), new RegExp(code), test);
  const after = await observe();
  assert.deepEqual(after, before, `${test} changed real Figma state`);
  await evidence("negative_verified", { test, code, input, response,
    before, after, mutationCount: 0 });
}

try {
  stage = await connect();
  const document = await stage.call("figma_read_document");
  assert.equal(document.isError, false);
  const pocPage = document.value.pages.find((page) => page.name === "Codex Bridge POC");
  const secondPage = document.value.pages.find((page) => page.id !== pocPage?.id);
  assert.ok(pocPage && secondPage, "Two existing pages are required in the dedicated test document");
  if (RESUME) {
    assert.deepEqual(document.value.ownedPocNodes.map((node) => [node.id, node.name, node.parentId]), [
      [TEST_NODE_ID_1, "Scope D Authorized Root", pocPage.id],
      [TEST_NODE_ID_2, "Scope D Foreign Root", pocPage.id],
      [TEST_NODE_ID_3, "Scope D Foreign Child", TEST_NODE_ID_2],
    ], "Resume only after verifying the three nodes from the previous evidence");
    createdIds = [TEST_NODE_ID_1, TEST_NODE_ID_2, TEST_NODE_ID_3];
  } else {
    assert.equal(document.value.ownedPocNodes.length, 0, "Existing owned nodes need review before this test");
  }
  await evidence("preflight", { pages: document.value.pages, ownedNodes: document.value.ownedPocNodes });
  await stage.client.close(); stage = null;

  const pageAuth = await issue(FILE, pocPage.id, pocPage.id, ["create", "update", "delete", "prototype"]);
  const secondPageAuth = RESUME ? null : await issue(FILE, secondPage.id, secondPage.id, ["create", "delete"]);
  stage = await connect();
  const { call } = stage;
  const setup = async (label, authorization, parentId, name) => {
    const node = await mutation(call, label, "figma_scope_create_frame", authorization,
      { parentId, name }, async (result) => {
        assert.equal(result.type, "FRAME");
        assert.equal(result.parentId, parentId);
        assert.equal(result.owner, "local-codex-figma-bridge-poc");
        assert.equal((await readNode(call, result.id)).parentId, parentId);
      });
    createdIds.push(node.id);
    return node.id;
  };
  const root = RESUME ? TEST_NODE_ID_1 : await setup("setup_authorized_root", pageAuth, pocPage.id, "Scope D Authorized Root");
  const foreign = RESUME ? TEST_NODE_ID_2 : await setup("setup_foreign_root", pageAuth, pocPage.id, "Scope D Foreign Root");
  const foreignChild = RESUME ? TEST_NODE_ID_3 : await setup("setup_foreign_child", pageAuth, foreign, "Scope D Foreign Child");
  const otherPageRoot = RESUME ? null : await setup("setup_other_page_root", secondPageAuth, secondPage.id, "Scope D Other Page Root");
  await stage.client.close(); stage = null;

  const scoped = await issue(FILE, pocPage.id, root, ["create", "update", "delete", "prototype"]);
  const wrongRoot = await issue(FILE, pocPage.id, TEST_NODE_ID_4, ["create"]);
  const wrongPage = otherPageRoot ? await issue(FILE, pocPage.id, otherPageRoot, ["create"]) : null;
  const wrongFile = await issue(OTHER_FILE, TEST_NODE_ID_5, TEST_NODE_ID_5, ["create"]);
  stage = await connect();
  const live = stage.call;
  const inside = await mutation(live, "D01_inside_create", "figma_scope_create_frame", scoped,
    { parentId: root, name: "Scope D Allowed Child" }, async (node) => {
      assert.equal((await readNode(live, node.id)).parentId, root);
    });
  createdIds.push(inside.id);
  await mutation(live, "D02_inside_update", "figma_scope_update_frame", scoped,
    { targetNodeId: inside.id, name: "Scope D Allowed Child Updated" }, async (node) => {
      assert.equal((await readNode(live, node.id)).name, "Scope D Allowed Child Updated");
    });
  const snapshot = async (...ids) => Promise.all(ids.map((id) => readNode(live, id)));
  await denied(live, "D04_wrong_file", "figma_scope_create_frame", wrongFile,
    { parentId: root, name: "Must Not Exist" }, "SCOPE_FILE_MISMATCH", () => snapshot(root));
  if (RESUME) await evidence("blocked", { test: "D05_wrong_page", reason: "Figma getNodeByIdAsync on Page 1 returned a 10-second network error" });
  else await denied(live, "D05_wrong_page", "figma_scope_create_frame", scoped,
    { parentId: secondPage.id, name: "Must Not Exist" }, "SCOPE_PAGE_MISMATCH", () => snapshot(secondPage.id));
  await denied(live, "D06_wrong_root", "figma_scope_update_frame", scoped,
    { targetNodeId: foreign, name: "Must Not Rename" }, "SCOPE_VIOLATION", () => snapshot(foreign));
  await denied(live, "D07_sibling_child", "figma_scope_update_frame", scoped,
    { targetNodeId: foreignChild, name: "Must Not Rename" }, "SCOPE_VIOLATION", () => snapshot(foreignChild));
  await denied(live, "D08_outside_create", "figma_scope_create_frame", scoped,
    { parentId: foreign, name: "Must Not Exist" }, "CREATE_PARENT_SCOPE_VIOLATION", () => snapshot(foreign));
  await denied(live, "D09_outside_update", "figma_scope_update_frame", scoped,
    { targetNodeId: foreignChild, name: "Must Not Rename" }, "SCOPE_VIOLATION", () => snapshot(foreignChild));
  await denied(live, "D10_outside_delete", "figma_scope_delete_node", scoped,
    { targetNodeId: foreignChild }, "SCOPE_VIOLATION", () => snapshot(foreignChild));
  await denied(live, "D11_prototype_target_outside", "figma_scope_set_prototype", scoped,
    { sourceNodeId: inside.id, destinationNodeId: foreignChild }, "PROTOTYPE_TARGET_SCOPE_VIOLATION",
    () => snapshot(inside.id, foreignChild));
  await denied(live, "D12_prototype_source_outside", "figma_scope_set_prototype", scoped,
    { sourceNodeId: foreignChild, destinationNodeId: inside.id }, "PROTOTYPE_SOURCE_SCOPE_VIOLATION",
    () => snapshot(foreignChild, inside.id));
  try {
    await denied(live, "D13_missing_root", "figma_scope_create_frame", wrongRoot,
      { parentId: root, name: "Must Not Exist" }, "SCOPE_ROOT_NOT_FOUND", () => snapshot(root));
  } catch (error) {
    await evidence("blocked", { test: "D13_missing_root", error: String(error), mutationRetry: false });
  }
  if (RESUME) await evidence("blocked", { test: "D14_root_page_mismatch", reason: "Page 1 node could not be resolved by Figma API" });
  else await denied(live, "D14_root_page_mismatch", "figma_scope_create_frame", wrongPage,
    { parentId: root, name: "Must Not Exist" }, "SCOPE_ROOT_PAGE_MISMATCH", () => snapshot(root));
  await denied(live, "D15_client_scope_expansion", "figma_scope_update_frame", scoped,
    { targetNodeId: foreignChild, name: "Must Not Rename",
      scope: { fileIdentity: FILE, pageId: pocPage.id, rootNodeId: foreign } },
    "SCOPE_VIOLATION", () => snapshot(foreignChild));
  await mutation(live, "D03_inside_delete", "figma_scope_delete_node", scoped,
    { targetNodeId: inside.id }, async (result) => {
      assert.equal(result.exists, false);
      assert.equal((await readNode(live, inside.id)).exists, false);
    });
  createdIds = createdIds.filter((id) => id !== inside.id);

  // Cleanup only nodes created by this runner, with explicit owned and scope checks.
  for (const [id, authorization] of [[foreignChild, pageAuth], [foreign, pageAuth],
    [root, pageAuth], ...(otherPageRoot ? [[otherPageRoot, secondPageAuth]] : [])]) {
    await mutation(live, `cleanup_${id}`, "figma_scope_delete_node", authorization,
      { targetNodeId: id }, async (result) => {
        assert.equal(result.exists, false);
        assert.equal((await readNode(live, id)).exists, false);
      });
    createdIds = createdIds.filter((entry) => entry !== id);
  }
  assert.equal(createdIds.length, 0);
  await evidence("complete", { status: RESUME ? "PARTIAL" : "VERIFIED", protectedFileMutation: 0,
    businessRepoMutation: 0, forbiddenFallback: 0, timeoutReconciliation: "NOT VERIFIED" });
  process.stdout.write(`LIVE_EVIDENCE=${LOG}\n`);
} catch (error) {
  await evidence("failed", { status: "BLOCKED", error: error instanceof Error ? error.message : String(error),
    remainingCreatedNodeIds: createdIds, mutationRetry: false });
  process.stderr.write(`LIVE_EVIDENCE=${LOG}\n`);
  throw error;
} finally {
  await stage?.client.close().catch(() => {});
}
