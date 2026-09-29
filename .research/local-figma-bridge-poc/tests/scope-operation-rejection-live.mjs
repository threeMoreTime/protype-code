// Real Plugin-side scope rejection with operationId correlation across MCP/WS/Plugin response.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { appendFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { TaskAuthorizationStore } from "../relay/task-authorization-store.mjs";
import { TASK_ID, WORKSPACE_ID } from "../relay/protocol.mjs";

import { requireLocalTestClientId, requireLocalTestFileIdentity, requireLocalTestNodeId } from "../scripts/issue-test-authorization.mjs";

const TEST_FILE_A_IDENTITY = requireLocalTestFileIdentity("FIGMA_TEST_FILE_A_IDENTITY");
const TEST_FILE_B_IDENTITY = requireLocalTestFileIdentity("FIGMA_TEST_FILE_B_IDENTITY");
const TEST_CLIENT_ID_1 = requireLocalTestClientId("FIGMA_TEST_SCOPE_OPERATION_REJECTION_LIVE_CLIENT_ID_1");
const TEST_NODE_ID_1 = requireLocalTestNodeId("FIGMA_TEST_SCOPE_OPERATION_REJECTION_LIVE_NODE_ID_1");
const PROTECTED_FILE_IDENTITY = requireLocalTestFileIdentity("FIGMA_TEST_PROTECTED_FILE_IDENTITY");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TEST_FILES = [TEST_FILE_A_IDENTITY, TEST_FILE_B_IDENTITY];
const CLIENT_ID = TEST_CLIENT_ID_1;
const AUTH_PATH = path.join(ROOT, "state", "scope-guard-authorizations.json");
const LOG = path.join(ROOT, "logs", `phase8-0d-operation-rejection-${new Date().toISOString().replaceAll(":", "-")}.jsonl`);
const log = async (event, fields = {}) => appendFile(LOG,
  `${JSON.stringify({ timestamp: new Date().toISOString(), event, ...fields })}\n`, "utf8");

async function session() {
  const transport = new StdioClientTransport({ command: process.execPath,
    args: [path.join(ROOT, "mcp", "server.mjs")], cwd: ROOT,
    env: { ...process.env, LOCAL_FIGMA_BRIDGE_AUTHORIZATION_STATE_PATH: AUTH_PATH }, stderr: "pipe" });
  const client = new Client({ name: "phase8-0d-op-rejection", version: "0.0.1" });
  const stderr = [];
  transport.stderr?.on("data", (chunk) => stderr.push(chunk.toString()));
  await client.connect(transport);
  const call = async (name, args = {}) => {
    const response = await client.callTool({ name, arguments: args });
    const raw = response.content?.find((item) => item.type === "text")?.text || "";
    let value;
    try { value = JSON.parse(raw); } catch { value = raw; }
    const result = { isError: response.isError === true, value };
    await log("mcp_call", { name, args, result });
    return result;
  };
  let status;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const reply = await call("figma_status");
    if (!reply.isError && reply.value.bridgeAuth?.authenticated) { status = reply.value; break; }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  assert.ok(status);
  assert.ok(TEST_FILES.includes(status.fileIdentity), "Only dedicated test files are allowed");
  assert.equal(status.bridgeAuth.clientId, CLIENT_ID);
  assert.notEqual(status.fileIdentity, PROTECTED_FILE_IDENTITY);
  return { client, call, status, stderr };
}

let active = null;
try {
  const store = new TaskAuthorizationStore({ filePath: AUTH_PATH });
  await store.initialize();
  const authorizations = new Map();
  for (const fileIdentity of TEST_FILES) {
    const record = await store.issueForLocalControl({ workspaceId: WORKSPACE_ID, taskId: TASK_ID,
      fileIdentity, clientId: CLIENT_ID,
      scope: { fileIdentity, pageId: TEST_NODE_ID_1, rootNodeId: TEST_NODE_ID_1 },
      allowedActions: ["create"], revision: "1", expiresAt: new Date(Date.now() + 20 * 60_000).toISOString() });
    authorizations.set(fileIdentity, record);
    await log("trusted_test_authorization", { record });
  }
  active = await session();
  const fileIdentity = active.status.fileIdentity;
  const authorization = authorizations.get(fileIdentity);
  const before = await active.call("figma_read_document");
  assert.equal(before.isError, false);
  const outsidePageId = before.value.pages.find((page) => page.id !== TEST_NODE_ID_1)?.id;
  assert.ok(outsidePageId, "A second test Page is required for the negative check");
  const operationId = `op-${randomUUID()}`;
  const args = { expectedFileIdentity: fileIdentity, workspaceId: WORKSPACE_ID, taskId: TASK_ID,
    authorizationId: authorization.authorizationId, revision: "1", operationId,
    parentId: outsidePageId, name: "Must Not Exist" };
  const denied = await active.call("figma_scope_create_frame", args);
  assert.equal(denied.isError, true);
  assert.match(String(denied.value), /SCOPE_PAGE_MISMATCH/);
  const after = await active.call("figma_read_document");
  assert.equal(after.isError, false);
  assert.deepEqual({ pages: before.value.pages, ownedPocNodes: before.value.ownedPocNodes },
    { pages: after.value.pages, ownedPocNodes: after.value.ownedPocNodes });
  const lines = active.stderr.join("").split(/\r?\n/).filter((line) => line.includes(operationId));
  assert.equal(lines.some((line) => line.includes('"event":"request"')), true);
  assert.equal(lines.some((line) => line.includes('"event":"response"')), true);
  await log("operation_rejection_verified", { operationId, error: denied.value,
    requestAndResponseTrace: lines, before: before.value, after: after.value, mutationCount: 0 });
  process.stdout.write(`OPERATION_REJECTION_EVIDENCE=${LOG}\n`);
} catch (error) {
  await log("failed", { status: "BLOCKED", error: String(error), mutationRetry: false });
  process.stderr.write(`OPERATION_REJECTION_EVIDENCE=${LOG}\n`);
  throw error;
} finally {
  await active?.client.close().catch(() => {});
}
