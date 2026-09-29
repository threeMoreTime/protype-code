// Narrow real Figma test for D05 and D14 after PageNode lookup fallback.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { appendFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { TaskAuthorizationStore } from "../relay/task-authorization-store.mjs";
import { TASK_ID, WORKSPACE_ID } from "../relay/protocol.mjs";

import { requireLocalTestClientId, requireLocalTestFileIdentity, requireLocalTestValue } from "../scripts/issue-test-authorization.mjs";

const TEST_FILE_A_IDENTITY = requireLocalTestFileIdentity("FIGMA_TEST_FILE_A_IDENTITY");
const TEST_CLIENT_ID_1 = requireLocalTestClientId("FIGMA_TEST_SCOPE_CROSS_PAGE_LIVE_CLIENT_ID_1");
const TEST_DOCUMENT_NAME_1 = requireLocalTestValue("FIGMA_TEST_SCOPE_CROSS_PAGE_LIVE_DOCUMENT_NAME_1");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE = TEST_FILE_A_IDENTITY;
const CLIENT = TEST_CLIENT_ID_1;
const AUTH_PATH = path.join(ROOT, "state", "scope-guard-authorizations.json");
const LOG = path.join(ROOT, "logs", `phase8-0d-cross-page-${new Date().toISOString().replaceAll(":", "-")}.jsonl`);
const log = async (event, fields = {}) => appendFile(LOG,
  `${JSON.stringify({ timestamp: new Date().toISOString(), event, ...fields })}\n`, "utf8");
const store = new TaskAuthorizationStore({ filePath: AUTH_PATH });
await store.initialize();
let current = null;
let rootId = null;

async function connect() {
  const transport = new StdioClientTransport({ command: process.execPath,
    args: [path.join(ROOT, "mcp", "server.mjs")], cwd: ROOT,
    env: { ...process.env, LOCAL_FIGMA_BRIDGE_AUTHORIZATION_STATE_PATH: AUTH_PATH }, stderr: "pipe" });
  const client = new Client({ name: "phase8-0d-cross-page", version: "0.0.1" });
  await client.connect(transport);
  const call = async (name, args = {}) => {
    const response = await client.callTool({ name, arguments: args });
    const raw = response.content?.find((item) => item.type === "text")?.text || "";
    let value;
    try { value = JSON.parse(raw); } catch { value = raw; }
    const result = { isError: response.isError === true, value };
    await log("call", { name, args, result });
    return result;
  };
  let status;
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const reply = await call("figma_status");
    if (!reply.isError && reply.value.bridgeAuth?.authenticated) { status = reply.value; break; }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  assert.ok(status, "plugin not connected and authenticated");
  assert.equal(status.documentName, TEST_DOCUMENT_NAME_1);
  assert.equal(status.fileIdentity, FILE);
  assert.equal(status.bridgeAuth.clientId, CLIENT);
  assert.equal(status.pageNodeFallback, true);
  return { client, call, status };
}

async function issue(pageId, rootNodeId) {
  const record = await store.issueForLocalControl({ workspaceId: WORKSPACE_ID, taskId: TASK_ID,
    fileIdentity: FILE, clientId: CLIENT, scope: { fileIdentity: FILE, pageId, rootNodeId },
    allowedActions: ["create", "delete"], revision: "1",
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString() });
  await log("trusted_authorization_issued", { record });
  return record;
}

function input(record, fields) {
  return { expectedFileIdentity: FILE, workspaceId: WORKSPACE_ID, taskId: TASK_ID,
    authorizationId: record.authorizationId, revision: "1", operationId: `op-${randomUUID()}`,
    ...fields };
}

async function read(call, nodeId) {
  const result = await call("figma_scope_read_node", { targetNodeId: nodeId });
  assert.equal(result.isError, false);
  return result.value;
}

try {
  current = await connect();
  const doc = await current.call("figma_read_document");
  assert.equal(doc.isError, false);
  const pageA = doc.value.pages.find((page) => page.name === "Codex Bridge POC");
  const pageB = doc.value.pages.find((page) => page.id !== pageA?.id);
  assert.ok(pageA && pageB);
  assert.equal(doc.value.ownedPocNodes.length, 0, "previous scoped nodes must be absent");
  const pageBRead = await read(current.call, pageB.id);
  assert.equal(pageBRead.type, "PAGE", "inactive Page must be readable by ID");
  await current.client.close(); current = null;

  const pageGrant = await issue(pageA.id, pageA.id);
  current = await connect();
  const created = await current.call("figma_scope_create_frame",
    input(pageGrant, { parentId: pageA.id, name: "Scope D Cross Page Root" }));
  if (created.isError) throw new Error(`root create outcome uncertain; no retry: ${created.value}`);
  rootId = created.value.id;
  assert.equal((await read(current.call, rootId)).parentId, pageA.id);
  await log("root_created", { nodeId: rootId, response: created.value });
  await current.client.close(); current = null;

  const scoped = await issue(pageA.id, rootId);
  const mismatch = await issue(pageA.id, pageB.id);
  current = await connect();
  const checkDenied = async (test, record, parentId, code) => {
    const before = { pageA: await read(current.call, pageA.id),
      pageB: await read(current.call, pageB.id), root: await read(current.call, rootId),
      attempts: (await current.call("figma_status")).value.scopedMutationAttemptCount };
    const args = input(record, { parentId, name: "Must Not Exist" });
    const response = await current.call("figma_scope_create_frame", args);
    assert.equal(response.isError, true);
    assert.match(String(response.value), new RegExp(code));
    const after = { pageA: await read(current.call, pageA.id),
      pageB: await read(current.call, pageB.id), root: await read(current.call, rootId),
      attempts: (await current.call("figma_status")).value.scopedMutationAttemptCount };
    assert.deepEqual(after, before, `${test} changed Figma state or attempted a mutation`);
    await log("negative_verified", { test, code, args, response, before, after, mutationCount: 0 });
  };
  await checkDenied("D05_wrong_page", scoped, pageB.id, "SCOPE_PAGE_MISMATCH");
  await checkDenied("D14_root_page_mismatch", mismatch, rootId, "SCOPE_ROOT_PAGE_MISMATCH");
  const deleted = await current.call("figma_scope_delete_node", input(pageGrant, { targetNodeId: rootId }));
  if (deleted.isError) throw new Error(`root cleanup outcome uncertain; no retry: ${deleted.value}`);
  assert.equal(deleted.value.exists, false);
  assert.equal((await read(current.call, rootId)).exists, false);
  await log("cleanup_verified", { nodeId: rootId, response: deleted.value });
  rootId = null;
  await log("complete", { status: "VERIFIED", protectedFileMutation: 0, forbiddenFallback: 0 });
  process.stdout.write(`CROSS_PAGE_EVIDENCE=${LOG}\n`);
} catch (error) {
  await log("failed", { status: "BLOCKED", error: String(error), uncertainOwnedNodeId: rootId,
    mutationRetry: false });
  process.stderr.write(`CROSS_PAGE_EVIDENCE=${LOG}\n`);
  throw error;
} finally {
  await current?.client.close().catch(() => {});
}
