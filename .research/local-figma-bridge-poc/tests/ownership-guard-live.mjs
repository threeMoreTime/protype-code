// Real Figma Desktop validation. Only the pinned, empty dedicated test file is writable.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { appendFile, mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { TaskAuthorizationStore } from "../relay/task-authorization-store.mjs";
import { WORKSPACE_ID } from "../relay/protocol.mjs";

import { requireLocalTestClientId, requireLocalTestFileIdentity, requireLocalTestNodeId, requireLocalTestOperationId, requireLocalTestValue } from "../scripts/issue-test-authorization.mjs";

const TEST_FILE_A_IDENTITY = requireLocalTestFileIdentity("FIGMA_TEST_FILE_A_IDENTITY");
const TEST_FILE_B_IDENTITY = requireLocalTestFileIdentity("FIGMA_TEST_FILE_B_IDENTITY");
const TEST_CLIENT_ID_1 = requireLocalTestClientId("FIGMA_TEST_OWNERSHIP_GUARD_LIVE_CLIENT_ID_1");
const TEST_NODE_ID_1 = requireLocalTestNodeId("FIGMA_TEST_OWNERSHIP_GUARD_LIVE_NODE_ID_1");
const TEST_NODE_ID_2 = requireLocalTestNodeId("FIGMA_TEST_OWNERSHIP_GUARD_LIVE_NODE_ID_2");
const TEST_NODE_ID_3 = requireLocalTestNodeId("FIGMA_TEST_OWNERSHIP_GUARD_LIVE_NODE_ID_3");
const TEST_OPERATION_ID_1 = requireLocalTestOperationId("FIGMA_TEST_OWNERSHIP_GUARD_LIVE_OPERATION_ID_1");
const TEST_DOCUMENT_NAME_1 = requireLocalTestValue("FIGMA_TEST_OWNERSHIP_GUARD_LIVE_DOCUMENT_NAME_1");
const TEST_DOCUMENT_NAME_2 = requireLocalTestValue("FIGMA_TEST_OWNERSHIP_GUARD_LIVE_DOCUMENT_NAME_2");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEDICATED_FILES = new Map([
  [TEST_FILE_A_IDENTITY, TEST_DOCUMENT_NAME_1],
  [TEST_FILE_B_IDENTITY, TEST_DOCUMENT_NAME_2],
]);
const PAGE = TEST_NODE_ID_1;
const RESUME = process.argv.includes("--resume");
const CLIENT = TEST_CLIENT_ID_1;
const AUTH_PATH = path.join(ROOT, "state", "ownership-guard-authorizations.json");
const STAMP = new Date().toISOString().replaceAll(":", "-");
const LOG = path.join(ROOT, "logs", `phase8-0e-live-${STAMP}.jsonl`);
const SUMMARY = path.join(ROOT, "logs", `phase8-0e-results-${STAMP}.json`);
await mkdir(path.dirname(LOG), { recursive: true });
await writeFile(LOG, "", { flag: "wx" });
const evidence = (event, fields = {}) => appendFile(LOG,
  `${JSON.stringify({ timestamp: new Date().toISOString(), event, ...fields })}\n`, "utf8");

const store = new TaskAuthorizationStore({ filePath: AUTH_PATH });
await store.initialize();
async function issue(fileIdentity, taskId, allowedActions) {
  const scope = { fileIdentity, pageId: PAGE, rootNodeId: PAGE };
  const record = await store.issueForLocalControl({ workspaceId: WORKSPACE_ID, taskId, fileIdentity,
    clientId: CLIENT, scope, allowedActions, revision: "1",
    expiresAt: new Date(Date.now() + 40 * 60_000).toISOString() });
  await evidence("trusted_grant", { authorizationId: record.authorizationId, taskId,
    allowedActions, scope, expiresAt: record.expiresAt });
  return record;
}

let client;
let summary = { status: "NOT VERIFIED", evidence: LOG, testFile: null,
  protectedFileMutation: 0, businessRepoMutation: 0, figmaUiAutomation: 0, restWrite: 0 };
try {
  const grants = new Map();
  for (const fileIdentity of DEDICATED_FILES.keys()) {
    grants.set(fileIdentity, {
      taskA: await issue(fileIdentity, "ownership-task-A", ["create", "update", "delete", "prototype"]),
      taskB: await issue(fileIdentity, "ownership-task-B", ["create", "update", "delete"]),
      fixture: await issue(fileIdentity, "ownership-fixture", ["test_fixture"]),
    });
  }
  const transport = new StdioClientTransport({ command: process.execPath,
    args: [path.join(ROOT, "mcp", "server.mjs")], cwd: ROOT,
    env: { ...process.env, LOCAL_FIGMA_BRIDGE_AUTHORIZATION_STATE_PATH: AUTH_PATH,
      LOCAL_FIGMA_BRIDGE_ENABLE_TEST_FIXTURES: "1" }, stderr: "pipe" });
  client = new Client({ name: "phase8-0e-real-figma", version: "0.0.1" });
  await client.connect(transport);
  async function call(name, args = {}) {
    const start = Date.now();
    const result = await client.callTool({ name, arguments: args });
    const raw = result.content?.find((item) => item.type === "text")?.text || "";
    let value;
    try { value = JSON.parse(raw); } catch { value = raw; }
    const response = { isError: result.isError === true, value };
    await evidence("mcp_call", { name, args, response, latencyMs: Date.now() - start });
    return response;
  }
  let statusResult;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    statusResult = await call("figma_status");
    if (!statusResult.isError && statusResult.value.connected &&
        statusResult.value.bridgeAuth?.authenticated) break;
    await delay(1_000);
  }
  assert.equal(statusResult?.isError, false);
  const status = statusResult.value;
  assert.equal(status.connected, true);
  assert.equal(status.bridgeAuth?.authenticated, true);
  assert.equal(status.documentName, DEDICATED_FILES.get(status.fileIdentity),
    "HARD FAIL: not one of the two pinned dedicated test documents");
  assert.ok(DEDICATED_FILES.has(status.fileIdentity));
  const FILE = status.fileIdentity;
  if (RESUME) assert.equal(FILE, TEST_FILE_B_IDENTITY,
    "Resume is pinned to the file with the two existing test nodes");
  const { taskA, taskB, fixture } = grants.get(FILE);
  assert.equal(status.clientId, CLIENT);
  assert.equal(status.currentPageId, PAGE);
  assert.equal(status.ownershipGuardVersion, "8.0-E", "Plugin main must load current ownership code");
  summary.testFile = FILE;
  summary.sessionId = status.sessionId;
  summary.connectionId = status.connectionId;
  await evidence("identity_pin", { documentName: status.documentName, fileIdentity: FILE,
    pageId: PAGE, sessionId: status.sessionId, connectionId: status.connectionId, clientId: CLIENT });

  async function read(id) {
    const result = await call("figma_scope_read_node", { targetNodeId: id });
    assert.equal(result.isError, false, `read ${id}`);
    return result.value;
  }
  const originalPage = await read(PAGE);
  assert.deepEqual(originalPage.childIds, RESUME ? [TEST_NODE_ID_2, TEST_NODE_ID_3] : [],
    "Dedicated test Page has unexpected nodes");
  const originalDocument = await call("figma_read_document");
  assert.equal(originalDocument.isError, false);
  if (!RESUME) assert.equal(originalDocument.value.ownedPocNodes.length, 0);
  await evidence("preflight", { page: originalPage, pages: originalDocument.value.pages });

  function input(grant, fields = {}) {
    return { expectedFileIdentity: FILE, workspaceId: WORKSPACE_ID, taskId: grant.taskId,
      authorizationId: grant.authorizationId, revision: grant.revision,
      operationId: `op-${randomUUID()}`, ...fields };
  }
  async function positive(test, name, grant, fields, verify) {
    const args = input(grant, fields);
    const response = await call(name, args);
    if (response.isError) throw new Error(`${test}: outcome unknown; no blind retry: ${response.value}`);
    assert.equal(response.value.operationId, args.operationId);
    await verify(response.value);
    await evidence("positive_verified", { test, operationId: args.operationId,
      requestId: response.value.requestId, result: response.value });
    return response.value;
  }
  async function denied(test, name, grant, fields, errorCode, targetIds) {
    const before = await Promise.all(targetIds.map(read));
    const beforeStatus = (await call("figma_status")).value;
    const args = input(grant, fields);
    const response = await call(name, args);
    assert.equal(response.isError, true, test);
    assert.match(String(response.value), new RegExp(errorCode), test);
    const after = await Promise.all(targetIds.map(read));
    const afterStatus = (await call("figma_status")).value;
    assert.deepEqual(after, before, `${test}: Figma node state changed`);
    assert.equal(afterStatus.scopedMutationAttemptCount, beforeStatus.scopedMutationAttemptCount,
      `${test}: Plugin attempted a mutation`);
    await evidence("negative_verified", { test, errorCode, operationId: args.operationId,
      response, before, after, mutationCount: 0 });
  }

  const ownedA = RESUME ? { id: TEST_NODE_ID_2 } : await positive("E01_owned_create", "figma_scope_create_frame", taskA,
    { parentId: PAGE, name: "Ownership E Shared Name" }, async (result) => {
      const node = await read(result.id);
      assert.equal(node.type, "FRAME");
      assert.equal(node.parentId, PAGE);
      assert.equal(node.owner, "local-codex-figma-bridge-poc");
      assert.equal(node.workspaceId, WORKSPACE_ID);
      assert.equal(node.taskId, taskA.taskId);
      assert.equal(node.createdOperationId, result.operationId);
      assert.equal(node.revision, "1");
      assert.ok(node.specNodeKey);
    });
  const ownedB = RESUME ? { id: TEST_NODE_ID_3 } : await positive("setup_task_B", "figma_scope_create_frame", taskB,
    { parentId: PAGE, name: "Ownership E Task B" }, async (result) => {
      assert.equal((await read(result.id)).taskId, taskB.taskId);
    });
  if (RESUME) {
    const nodeA = await read(ownedA.id);
    const nodeB = await read(ownedB.id);
    assert.equal(nodeA.owner, "local-codex-figma-bridge-poc");
    assert.equal(nodeA.workspaceId, WORKSPACE_ID);
    assert.equal(nodeA.taskId, taskA.taskId);
    assert.equal(nodeA.createdOperationId, TEST_OPERATION_ID_1);
    assert.equal(nodeB.owner, "local-codex-figma-bridge-poc");
    assert.equal(nodeB.workspaceId, WORKSPACE_ID);
    assert.equal(nodeB.taskId, taskB.taskId);
    await evidence("resume_reconciled", { ownedA: nodeA, ownedB: nodeB,
      priorEvidence: "phase8-0e-live-2026-09-28T07-21-37.248Z.jsonl" });
  }
  const foreign = await positive("setup_foreign", "figma_scope_create_foreign_fixture", fixture,
    { parentId: PAGE, name: "Ownership E Shared Name" }, async (result) => {
      const node = await read(result.id);
      assert.equal(node.owner, "");
      assert.equal(node.testFixture, "8.0-E");
      assert.equal(node.parentId, PAGE);
    });
  await positive("E02_same_task_update", "figma_scope_update_frame", taskA,
    { targetNodeId: ownedA.id, name: "Ownership E Updated" }, async (result) => {
      assert.equal((await read(result.id)).name, "Ownership E Updated");
    });
  await denied("E04_foreign_update", "figma_scope_update_frame", taskA,
    { targetNodeId: foreign.id, name: "forbidden" }, "OWNERSHIP_REQUIRED", [foreign.id, PAGE]);
  await denied("E05_foreign_delete", "figma_scope_delete_node", taskA,
    { targetNodeId: foreign.id }, "OWNERSHIP_REQUIRED", [foreign.id, PAGE]);
  await denied("E06_wrong_task_update", "figma_scope_update_frame", taskB,
    { targetNodeId: ownedA.id, name: "forbidden" }, "OWNERSHIP_TASK_MISMATCH", [ownedA.id, PAGE]);
  await denied("E06_wrong_task_delete", "figma_scope_delete_node", taskB,
    { targetNodeId: ownedA.id }, "OWNERSHIP_TASK_MISMATCH", [ownedA.id, PAGE]);
  await denied("E07_owner_spoof", "figma_scope_update_frame", taskA,
    { targetNodeId: foreign.id, name: "forbidden", owner: "local-codex-figma-bridge-poc",
      taskId: taskA.taskId }, "OWNERSHIP_REQUIRED", [foreign.id, PAGE]);
  const mixedParent = await positive("setup_mixed_parent", "figma_scope_create_frame", taskA,
    { parentId: PAGE, name: "Ownership E Mixed Parent" }, async (result) => {
      assert.equal((await read(result.id)).taskId, taskA.taskId);
    });
  const mixedChild = await positive("setup_mixed_child", "figma_scope_create_foreign_fixture", fixture,
    { parentId: mixedParent.id, name: "Ownership E Foreign Child" }, async (result) => {
      assert.equal((await read(result.id)).owner, "");
    });
  await denied("E08_mixed_subtree_delete", "figma_scope_delete_node", taskA,
    { targetNodeId: mixedParent.id }, "OWNERSHIP_SUBTREE_VIOLATION", [mixedParent.id, mixedChild.id, PAGE]);
  await denied("E09_foreign_prototype_source", "figma_scope_set_prototype", taskA,
    { sourceNodeId: foreign.id, destinationNodeId: ownedA.id }, "OWNERSHIP_REQUIRED", [foreign.id, PAGE]);
  await positive("cleanup_mixed_child", "figma_scope_delete_foreign_fixture", fixture,
    { targetNodeId: mixedChild.id }, async (result) => assert.equal((await read(result.id)).exists, false));
  await positive("cleanup_mixed_parent", "figma_scope_delete_node", taskA,
    { targetNodeId: mixedParent.id }, async (result) => assert.equal((await read(result.id)).exists, false));
  await positive("cleanup_foreign", "figma_scope_delete_foreign_fixture", fixture,
    { targetNodeId: foreign.id }, async (result) => assert.equal((await read(result.id)).exists, false));
  await positive("cleanup_task_B", "figma_scope_delete_node", taskB,
    { targetNodeId: ownedB.id }, async (result) => assert.equal((await read(result.id)).exists, false));
  await positive("E03_same_task_delete", "figma_scope_delete_node", taskA,
    { targetNodeId: ownedA.id }, async (result) => assert.equal((await read(result.id)).exists, false));
  const finalPage = await read(PAGE);
  assert.deepEqual(finalPage.childIds, []);
  summary = { ...summary, status: "VERIFIED", tests: ["E01", "E02", "E03", "E04", "E05", "E06", "E07", "E08", "E09"],
    finalPageId: PAGE, finalChildIds: finalPage.childIds };
  await evidence("final_verified", summary);
} catch (error) {
  summary = { ...summary, status: "BLOCKED", error: error instanceof Error ? error.message : String(error) };
  await evidence("failure", summary);
  process.exitCode = 1;
} finally {
  if (client) {
    const closeOutcome = await Promise.race([
      client.close().then(() => "closed", (error) => `error:${String(error)}`),
      delay(1_500).then(() => "timeout"),
    ]);
    await evidence("mcp_client_close", { closeOutcome });
  }
  // Grants are development-only and must not survive the validation run.
  await unlink(AUTH_PATH).catch((error) => { if (error?.code !== "ENOENT") throw error; });
  await writeFile(SUMMARY, `${JSON.stringify(summary, null, 2)}\n`, { flag: "wx" });
  process.stdout.write(`${JSON.stringify({ summary: SUMMARY, ...summary })}\n`);
}
