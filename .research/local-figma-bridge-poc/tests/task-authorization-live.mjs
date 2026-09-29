// Real Figma Development Plugin validation. This is not a node:test mock.
// Run only after verifying port 41731 is free and the named dedicated test file is open.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { TaskAuthorizationStore } from "../relay/task-authorization-store.mjs";
import { TASK_ID, WORKSPACE_ID } from "../relay/protocol.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
import { requireLocalTestClientId, requireLocalTestFileIdentity, requireLocalTestValue } from "../scripts/issue-test-authorization.mjs";

const expectedFileIdentity = requireLocalTestFileIdentity("FIGMA_TEST_FILE_A_IDENTITY");
const expectedClientId = requireLocalTestClientId("FIGMA_TEST_CLIENT_ID");
const expectedDocumentName = requireLocalTestValue("FIGMA_TEST_FILE_A_NAME");
const otherTestFileIdentity = requireLocalTestFileIdentity("FIGMA_TEST_FILE_B_IDENTITY");
if (expectedFileIdentity === otherTestFileIdentity) {
  throw new Error("The two local test file identities must be different");
}

const logPath = path.join(ROOT, "logs", `phase8-0c-live-${new Date().toISOString().replaceAll(":", "-")}.jsonl`);
await mkdir(path.dirname(logPath), { recursive: true });
async function log(entry) {
  await appendFile(logPath, `${JSON.stringify({ time: new Date().toISOString(), ...entry })}\n`, "utf8");
}
const store = new TaskAuthorizationStore({ filePath: path.join(ROOT, "state", "task-authorizations.json") });
await store.initialize();
const base = { workspaceId: WORKSPACE_ID, taskId: TASK_ID, clientId: expectedClientId,
  fileIdentity: expectedFileIdentity, revision: "1" };
const expiresAt = new Date(Date.now() + 20 * 60_000).toISOString();
const valid = await store.issueForLocalControl({ ...base, allowedActions: ["create", "delete"], expiresAt });
const wrongFile = await store.issueForLocalControl({ ...base, fileIdentity: otherTestFileIdentity,
  allowedActions: ["create"], expiresAt });
const expired = await store.issueForLocalControl({ ...base, allowedActions: ["create"],
  expiresAt: new Date(Date.now() - 1_000).toISOString() });
const createOnly = await store.issueForLocalControl({ ...base, allowedActions: ["create"], expiresAt });
await log({ event: "trusted_local_authorizations_issued", records: [valid, wrongFile, expired, createOnly],
  controlPath: "local test runner before MCP process launch; no MCP issuance tool" });

const transport = new StdioClientTransport({ command: process.execPath,
  args: [path.join(ROOT, "mcp", "server.mjs")], cwd: ROOT, stderr: "pipe" });
const client = new Client({ name: "phase8-0c-live-validation", version: "0.0.1" });
const stderr = [];
transport.stderr?.on("data", (chunk) => {
  const value = chunk.toString();
  if (!value.includes("secret") && !value.includes("proof")) stderr.push(value);
});
try {
  await client.connect(transport);
  async function call(name, args = {}) {
    const started = Date.now();
    const response = await client.callTool({ name, arguments: args });
    const text = response.content?.find((item) => item.type === "text")?.text || "";
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = text; }
    const result = { isError: response.isError === true, value: parsed };
    await log({ event: "mcp_tool", name, input: args, result, latencyMs: Date.now() - started });
    return result;
  }
  let status;
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const result = await call("figma_status");
    if (!result.isError && result.value.connected && result.value.bridgeAuth?.authenticated) {
      status = result.value;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  assert.ok(status, "real plugin did not reconnect and authenticate");
  assert.equal(status.documentName, expectedDocumentName);
  assert.equal(status.fileIdentity, expectedFileIdentity);
  assert.equal(status.bridgeAuth.clientId, expectedClientId);
  assert.equal(status.fileIdentityQuality, "stable");
  await log({ event: "identity_pin", documentName: status.documentName, fileIdentity: status.fileIdentity,
    clientId: status.bridgeAuth.clientId, sessionId: status.sessionId, connectionId: status.connectionId });

  async function snapshot() {
    const result = await call("figma_read_document");
    assert.equal(result.isError, false);
    assert.equal(result.value.documentName, expectedDocumentName);
    return result.value;
  }
  function designState(doc) {
    return JSON.stringify({ pages: doc.pages, ownedPocNodes: doc.ownedPocNodes });
  }
  const initial = await snapshot();
  assert.equal(initial.ownedPocNodes?.length, 0, "pre-existing owned nodes need human review before mutation");
  const required = { expectedFileIdentity, workspaceId: WORKSPACE_ID, taskId: TASK_ID,
    revision: "1", authorizationId: valid.authorizationId };
  const negative = [
    ["C02_missing", "AUTH_REQUIRED", { authorizationId: undefined }],
    ["C03_unknown", "AUTH_NOT_FOUND", { authorizationId: "auth-unknown" }],
    ["C04_wrong_task", "AUTH_TASK_MISMATCH", { taskId: "task-b" }],
    ["C05_wrong_workspace", "AUTH_TASK_MISMATCH", { workspaceId: "workspace-b" }],
    ["C06_wrong_file", "AUTH_FILE_MISMATCH", { authorizationId: wrongFile.authorizationId }],
    ["C07_expired", "AUTH_EXPIRED", { authorizationId: expired.authorizationId }],
    ["C09_self_authorize", "AUTH_NOT_FOUND", { authorizationId: "auth-unknown", allowedActions: ["create"],
      workspaceId: WORKSPACE_ID, taskId: TASK_ID, fileIdentity: expectedFileIdentity }],
    ["C10_wrong_revision", "AUTH_REVISION_MISMATCH", { revision: "2" }],
    ["C12_missing_operation_id", "OPERATION_ID_REQUIRED", { operationId: undefined }],
  ];
  for (const [name, code, changes] of negative) {
    const before = await snapshot();
    const args = { ...required, operationId: `op-${randomUUID()}`, ...changes };
    const denied = await call("figma_create_poc", args);
    assert.equal(denied.isError, true, name);
    assert.match(String(denied.value), new RegExp(code), name);
    const after = await snapshot();
    assert.equal(designState(after), designState(before), `${name} changed Figma state`);
    await log({ event: "negative_verified", name, code, mutationCount: 0,
      before: designState(before), after: designState(after) });
  }
  const beforeDelete = await snapshot();
  const deniedDelete = await call("figma_delete_poc_owned", { ...required,
    authorizationId: createOnly.authorizationId, operationId: `op-${randomUUID()}`,
    allowedActions: ["delete"] });
  assert.equal(deniedDelete.isError, true);
  assert.match(String(deniedDelete.value), /ACTION_NOT_ALLOWED/);
  assert.equal(designState(await snapshot()), designState(beforeDelete));
  await log({ event: "negative_verified", name: "C08_action_not_allowed_and_self_expand",
    code: "ACTION_NOT_ALLOWED", mutationCount: 0,
    before: designState(beforeDelete), after: designState(await snapshot()) });

  const createOperationId = `op-${randomUUID()}`;
  const created = await call("figma_create_poc", { ...required, operationId: createOperationId });
  if (created.isError) throw new Error(`Create failed or outcome unknown; do not retry: ${created.value}`);
  assert.equal(created.value.operationId, createOperationId);
  const afterCreate = await snapshot();
  assert.equal(afterCreate.ownedPocNodes?.some((node) => node.id === created.value.id && node.type === "FRAME" &&
    node.owner === "local-codex-figma-bridge-poc" && node.width === 375 && node.height === 812), true);
  await log({ event: "positive_create_verified", operationId: createOperationId,
    requestId: created.value.requestId, nodeId: created.value.id, readBack: afterCreate.ownedPocNodes });
  const deleteOperationId = `op-${randomUUID()}`;
  const deleted = await call("figma_delete_poc_owned", { ...required, operationId: deleteOperationId });
  if (deleted.isError) {
    await log({ event: "delete_result_unknown", operationId: deleteOperationId,
      error: deleted.value, retry: false });
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  } else {
    assert.equal(deleted.value.operationId, deleteOperationId);
    assert.equal(deleted.value.readBackAbsent, true);
  }
  const afterDelete = await snapshot();
  if (afterDelete.ownedPocNodes?.length !== 0) {
    throw new Error("Delete outcome remains unresolved; do not retry without read-back review");
  }
  await log({ event: deleted.isError ? "delete_absence_reconciled_after_error" : "positive_delete_verified",
    operationId: deleteOperationId, requestId: deleted.isError ? null : deleted.value.requestId,
    readBack: afterDelete.ownedPocNodes });
  const bridgeTrace = stderr.join("").split(/\r?\n/).filter((line) =>
    (line.includes(createOperationId) || line.includes(deleteOperationId)) &&
    !line.includes("secret") && !line.includes("proof"));
  assert.equal(bridgeTrace.some((line) => line.includes('"event":"request"') && line.includes(createOperationId)), true);
  assert.equal(bridgeTrace.some((line) => line.includes('"event":"response"') && line.includes(createOperationId)), true);
  await log({ event: "relay_operation_correlation", lines: bridgeTrace });
  await log({ event: "complete", result: "VERIFIED", deleteApiResponse: deleted.isError ? "ERROR" : "VERIFIED",
    protectedFileMutation: 0, forbiddenFallback: 0 });
  process.stdout.write(`LIVE_EVIDENCE=${logPath}\n`);
} catch (error) {
  await log({ event: "failed", result: "BLOCKED", error: error instanceof Error ? error.message : String(error),
    stderrTail: stderr.slice(-5) });
  throw error;
} finally {
  await client.close().catch(() => {});
}
