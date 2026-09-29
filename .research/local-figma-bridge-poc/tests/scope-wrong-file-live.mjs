// D04: authorization for dedicated file A while actual plugin runs in dedicated file B.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { TaskAuthorizationStore } from "../relay/task-authorization-store.mjs";
import { TASK_ID, WORKSPACE_ID } from "../relay/protocol.mjs";

import { requireLocalTestClientId, requireLocalTestFileIdentity, requireLocalTestNodeId, requireLocalTestValue } from "../scripts/issue-test-authorization.mjs";

const TEST_FILE_A_IDENTITY = requireLocalTestFileIdentity("FIGMA_TEST_FILE_A_IDENTITY");
const TEST_FILE_B_IDENTITY = requireLocalTestFileIdentity("FIGMA_TEST_FILE_B_IDENTITY");
const TEST_CLIENT_ID_1 = requireLocalTestClientId("FIGMA_TEST_SCOPE_WRONG_FILE_LIVE_CLIENT_ID_1");
const TEST_NODE_ID_1 = requireLocalTestNodeId("FIGMA_TEST_SCOPE_WRONG_FILE_LIVE_NODE_ID_1");
const PROTECTED_FILE_IDENTITY = requireLocalTestFileIdentity("FIGMA_TEST_PROTECTED_FILE_IDENTITY");
const TEST_DOCUMENT_NAME_1 = requireLocalTestValue("FIGMA_TEST_SCOPE_WRONG_FILE_LIVE_DOCUMENT_NAME_1");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE_A = TEST_FILE_A_IDENTITY;
const FILE_B = TEST_FILE_B_IDENTITY;
const CLIENT_ID = TEST_CLIENT_ID_1;
const LOG = path.join(ROOT, "logs", `phase8-0d-wrong-file-${new Date().toISOString().replaceAll(":", "-")}.jsonl`);
const log = async (event, fields = {}) => appendFile(LOG,
  `${JSON.stringify({ timestamp: new Date().toISOString(), event, ...fields })}\n`, "utf8");
const authPath = path.join(ROOT, "state", "scope-guard-authorizations.json");
const records = JSON.parse(await readFile(authPath, "utf8")).records;
let authorization = records.find((record) => record.fileIdentity === FILE_A &&
  record.clientId === CLIENT_ID && record.allowedActions.includes("create") &&
  Date.parse(record.expiresAt) > Date.now());
if (!authorization) {
  const store = new TaskAuthorizationStore({ filePath: authPath });
  await store.initialize();
  authorization = await store.issueForLocalControl({ workspaceId: WORKSPACE_ID, taskId: TASK_ID,
    fileIdentity: FILE_A, clientId: CLIENT_ID,
    scope: { fileIdentity: FILE_A, pageId: TEST_NODE_ID_1, rootNodeId: TEST_NODE_ID_1 },
    allowedActions: ["create"], revision: "1",
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString() });
  await log("trusted_local_test_authorization_issued", { record: authorization });
}

const transport = new StdioClientTransport({ command: process.execPath,
  args: [path.join(ROOT, "mcp", "server.mjs")], cwd: ROOT,
  env: { ...process.env, LOCAL_FIGMA_BRIDGE_AUTHORIZATION_STATE_PATH: path.join(ROOT, "state", "scope-guard-authorizations.json") },
  stderr: "pipe" });
const client = new Client({ name: "phase8-0d-wrong-file", version: "0.0.1" });
try {
  await client.connect(transport);
  async function call(name, args = {}) {
    const response = await client.callTool({ name, arguments: args });
    const raw = response.content?.find((item) => item.type === "text")?.text || "";
    let value;
    try { value = JSON.parse(raw); } catch { value = raw; }
    const result = { isError: response.isError === true, value };
    await log("call", { name, args, result });
    return result;
  }
  let status;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const reply = await call("figma_status");
    if (!reply.isError && reply.value.bridgeAuth?.authenticated) { status = reply.value; break; }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  assert.ok(status, "second test file plugin did not connect and authenticate");
  assert.equal(status.fileIdentity, FILE_B, "actual file must be dedicated test file B");
  assert.equal(status.bridgeAuth.clientId, CLIENT_ID);
  assert.notEqual(status.fileIdentity, PROTECTED_FILE_IDENTITY);
  assert.notEqual(status.documentName, TEST_DOCUMENT_NAME_1);
  const before = await call("figma_read_document");
  assert.equal(before.isError, false);
  const args = { expectedFileIdentity: FILE_B, workspaceId: WORKSPACE_ID, taskId: TASK_ID,
    authorizationId: authorization.authorizationId, revision: authorization.revision,
    operationId: `op-${randomUUID()}`, parentId: status.currentPageId, name: "Must Not Exist" };
  const denied = await call("figma_scope_create_frame", args);
  assert.equal(denied.isError, true);
  assert.match(String(denied.value), /SCOPE_FILE_MISMATCH/);
  const after = await call("figma_read_document");
  assert.equal(after.isError, false);
  assert.deepEqual({ pages: after.value.pages, ownedPocNodes: after.value.ownedPocNodes },
    { pages: before.value.pages, ownedPocNodes: before.value.ownedPocNodes });
  await log("negative_verified", { test: "D04_actual_B_authorization_A", code: "SCOPE_FILE_MISMATCH",
    actualFileIdentity: FILE_B, authorizedFileIdentity: FILE_A,
    sessionId: status.sessionId, connectionId: status.connectionId,
    args, response: denied, before: before.value, after: after.value, mutationCount: 0 });
  process.stdout.write(`WRONG_FILE_EVIDENCE=${LOG}\n`);
} catch (error) {
  await log("failed", { status: "BLOCKED", error: String(error), mutationRetry: false });
  process.stderr.write(`WRONG_FILE_EVIDENCE=${LOG}\n`);
  throw error;
} finally {
  await client.close().catch(() => {});
}
