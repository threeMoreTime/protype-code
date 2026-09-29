// Phase 8.0-G2: real stdio MCP/WS processes with distinct PIDs and one logical create.
// The only Figma target is the pinned, empty dedicated test Page.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { TaskAuthorizationStore } from '../relay/task-authorization-store.mjs';
import { WORKSPACE_ID } from '../relay/protocol.mjs';

import { requireLocalTestClientId, requireLocalTestFileIdentity, requireLocalTestNodeId, requireLocalTestValue } from "../scripts/issue-test-authorization.mjs";

const TEST_FILE_A_IDENTITY = requireLocalTestFileIdentity("FIGMA_TEST_FILE_A_IDENTITY");
const TEST_CLIENT_ID_1 = requireLocalTestClientId("FIGMA_TEST_HARDENING_PROCESS_RESTART_LIVE_CLIENT_ID_1");
const TEST_NODE_ID_1 = requireLocalTestNodeId("FIGMA_TEST_HARDENING_PROCESS_RESTART_LIVE_NODE_ID_1");
const TEST_DOCUMENT_NAME_1 = requireLocalTestValue("FIGMA_TEST_HARDENING_PROCESS_RESTART_LIVE_DOCUMENT_NAME_1");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fileIdentity = TEST_FILE_A_IDENTITY;
const documentName = TEST_DOCUMENT_NAME_1;
const pageId = TEST_NODE_ID_1;
const clientId = TEST_CLIENT_ID_1;
const taskId = 'hardening-cross-process';
const stamp = new Date().toISOString().replaceAll(':', '-');
const evidencePath = path.join(root, 'logs', `phase8-0g2-process-restart-live-${stamp}.jsonl`);
const auditPath = path.join(root, 'logs', `phase8-0g2-process-restart-audit-${stamp}.jsonl`);
const authPath = path.join(root, 'state', `phase8-0g2-process-restart-grants-${stamp}.json`);
const stderrPaths = Object.fromEntries(['A', 'B'].map((label) => [label,
  path.join(root, 'logs', `phase8-0g2-process-${label}-stderr-${stamp}.log`)]));
const operationId = `op-${randomUUID()}`;
await mkdir(path.dirname(evidencePath), { recursive: true });
await writeFile(evidencePath, '', { flag: 'wx' });
const evidence = (event, details = {}) => appendFile(evidencePath,
  `${JSON.stringify({ timestamp: new Date().toISOString(), event, ...details })}\n`, 'utf8');

const store = new TaskAuthorizationStore({ filePath: authPath });
await store.initialize();
const grant = await store.issueForLocalControl({ workspaceId: WORKSPACE_ID, taskId,
  fileIdentity, clientId, scope: { fileIdentity, pageId, rootNodeId: pageId },
  allowedActions: ['create', 'delete'], revision: '1',
  expiresAt: new Date(Date.now() + 10 * 60_000).toISOString() });
const input = (logicalOperationId, fields = {}) => ({ expectedFileIdentity: fileIdentity,
  workspaceId: WORKSPACE_ID, taskId, authorizationId: grant.authorizationId,
  revision: '1', operationId: logicalOperationId, ...fields });
const createInput = input(operationId, { parentId: pageId,
  name: 'Hardening G2 Cross Process' });

async function start(label) {
  const transport = new StdioClientTransport({ command: process.execPath,
    args: [path.join(root, 'mcp', 'server.mjs')], cwd: root,
    env: { ...process.env, LOCAL_FIGMA_BRIDGE_PORT: '41731',
      LOCAL_FIGMA_BRIDGE_ENABLE_TEST_FIXTURES: '1',
      LOCAL_FIGMA_BRIDGE_AUTHORIZATION_STATE_PATH: authPath,
      LOCAL_FIGMA_BRIDGE_AUDIT_PATH: auditPath }, stderr: 'pipe' });
  transport.stderr.on('data', (chunk) => {
    void appendFile(stderrPaths[label], chunk);
  });
  const client = new Client({ name: `phase8-0g2-${label}`, version: '0.0.1' });
  await client.connect(transport);
  const pid = transport.pid;
  assert.ok(Number.isInteger(pid), `${label}: missing child PID`);
  await evidence('mcp_process_started', { label, pid, auditPath, authPath });
  return { label, transport, client, pid };
}

async function call(instance, name, args = {}) {
  const started = Date.now();
  const raw = await instance.client.callTool({ name, arguments: args });
  const message = raw.content?.find((item) => item.type === 'text')?.text ?? '';
  let value;
  try { value = JSON.parse(message); } catch { value = message; }
  const response = { isError: raw.isError === true, value };
  await evidence('mcp_call', { label: instance.label, pid: instance.pid, name, args,
    response, latencyMs: Date.now() - started });
  return response;
}

async function connected(instance) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await call(instance, 'figma_status');
    if (!response.isError && response.value.connected &&
        response.value.bridgeAuth?.authenticated) {
      const status = response.value;
      assert.equal(status.documentName, documentName, "Connected document changed");
      assert.equal(status.fileIdentity, fileIdentity, 'HARD FAIL: wrong persistent file');
      assert.equal(status.currentPageId, pageId, 'HARD FAIL: wrong Page');
      assert.equal(status.clientId, clientId, 'HARD FAIL: wrong paired client');
      await evidence('connected', { label: instance.label, pid: instance.pid,
        sessionId: status.sessionId, connectionId: status.connectionId,
        fileIdentity: status.fileIdentity,
        mutationCount: status.scopedMutationAttemptCount });
      return status;
    }
    await delay(1_000);
  }
  throw new Error(`${instance.label}: paired Development Plugin unavailable`);
}

async function readPage(instance) {
  const response = await call(instance, 'figma_scope_read_node', { targetNodeId: pageId });
  assert.equal(response.isError, false);
  return response.value;
}

async function closeAndVerifyExit(instance) {
  if (!instance) return;
  const closeResult = await Promise.race([
    instance.client.close().then(() => 'closed', (error) => `error:${String(error)}`),
    delay(5_000).then(() => 'timeout'),
  ]);
  if (closeResult === 'timeout') await instance.transport.close();
  let exited = false;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try { process.kill(instance.pid, 0); }
    catch (error) {
      if (error?.code === 'ESRCH') { exited = true; break; }
      throw error;
    }
    await delay(100);
  }
  await evidence('mcp_process_closed', { label: instance.label, pid: instance.pid,
    closeResult, exited });
  assert.equal(exited, true, `${instance.label}: previous MCP/Node PID still alive`);
}

let first;
let second;
let firstPid;
let nodeId;
let outcome = 'BLOCKED';
try {
  first = await start('A');
  firstPid = first.pid;
  const firstStatus = await connected(first);
  assert.deepEqual((await readPage(first)).childIds, [], 'dedicated test Page must be empty');
  const timedOut = await call(first, 'figma_test_scope_create_frame_1ms_timeout', createInput);
  assert.equal(timedOut.isError, true);
  assert.match(String(timedOut.value), /timed out/);
  const firstAudit = await call(first, 'figma_operation_status', { operationId });
  assert.equal(firstAudit.isError, false);
  assert.equal(firstAudit.value.state, 'OUTCOME_UNKNOWN');
  assert.equal(firstAudit.value.errorCode, 'TRANSPORT_TIMEOUT');
  await evidence('timeout_audit', { operationId, audit: firstAudit.value });
  let pageAfterCreate;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    pageAfterCreate = await readPage(first);
    if (pageAfterCreate.childIds.length === 1) break;
    await delay(500);
  }
  assert.equal(pageAfterCreate.childIds.length, 1);
  nodeId = pageAfterCreate.childIds[0];
  const createdNode = await call(first, 'figma_scope_read_node', { targetNodeId: nodeId });
  assert.equal(createdNode.isError, false);
  assert.equal(createdNode.value.createdOperationId, operationId);
  assert.equal(createdNode.value.workspaceId, WORKSPACE_ID);
  assert.equal(createdNode.value.taskId, taskId);
  await evidence('created_before_process_exit', { pid: first.pid, node: createdNode.value,
    page: pageAfterCreate });
  await closeAndVerifyExit(first);
  first = null;

  second = await start('B');
  assert.notEqual(second.pid, firstPid);
  const secondStatus = await connected(second);
  assert.notEqual(second.pid, firstPid);
  assert.notEqual(secondStatus.connectionId, firstStatus.connectionId);
  assert.equal(secondStatus.sessionId, firstStatus.sessionId);
  const reloadedAudit = await call(second, 'figma_operation_status', { operationId });
  assert.equal(reloadedAudit.isError, false);
  assert.equal(reloadedAudit.value.state, 'OUTCOME_UNKNOWN');
  const pageBeforeRetry = await readPage(second);
  const countBeforeRetry = secondStatus.scopedMutationAttemptCount;
  const retry = await call(second, 'figma_scope_create_frame', createInput);
  const pageAfterRetry = await readPage(second);
  const statusAfterRetry = await connected(second);
  const retryAudit = await call(second, 'figma_operation_status', { operationId });
  await evidence('same_operation_denied_after_pid_restart', { firstPid,
    secondPid: second.pid, operationId, retry,
    pageBeforeRetry, pageAfterRetry, countBeforeRetry,
    countAfterRetry: statusAfterRetry.scopedMutationAttemptCount,
    audit: retryAudit.value });
  assert.equal(retry.isError, true);
  assert.match(String(retry.value), /OPERATION_OUTCOME_UNKNOWN/);
  assert.deepEqual(pageAfterRetry.childIds, pageBeforeRetry.childIds);
  assert.equal(statusAfterRetry.scopedMutationAttemptCount, countBeforeRetry);
  assert.equal(retryAudit.value.state, 'OUTCOME_UNKNOWN');
  assert.equal(retryAudit.value.result, 'retry_blocked');
  const reconciled = await call(second, 'figma_reconcile_create_operation', { operationId });
  assert.equal(reconciled.isError, false);
  assert.equal(reconciled.value.state, 'VERIFIED');
  assert.equal(reconciled.value.nodeId, nodeId);
  assert.deepEqual((await readPage(second)).childIds, [nodeId]);

  const deleteOperationId = `op-${randomUUID()}`;
  const deleted = await call(second, 'figma_scope_delete_node',
    input(deleteOperationId, { targetNodeId: nodeId }));
  let finalPage;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    finalPage = await readPage(second);
    await evidence('cleanup_page_read_back', { attempt, deleteOperationId,
      deleteResponse: deleted, page: finalPage });
    if (!finalPage.childIds.includes(nodeId)) break;
    await delay(500);
  }
  assert.deepEqual(finalPage.childIds, [], 'owned test Page must be empty after cleanup');
  const rawAudit = await readFile(auditPath, 'utf8');
  assert.equal(/"(?:pairingSecret|secret|proof|code)"\s*:/.test(rawAudit), false);
  outcome = 'VERIFIED';
  await evidence('final', { outcome, firstPid, secondPid: second.pid,
    operationId, nodeId, deleteOperationId, deleteResponse: deleted,
    firstConnectionId: firstStatus.connectionId,
    secondConnectionId: secondStatus.connectionId,
    finalPageChildIds: [], protectedFileMutation: 0, businessRepoMutation: 0,
    forbiddenFallback: 0 });
} catch (error) {
  await evidence('failure', { outcome, operationId, nodeId,
    firstPid, secondPid: second?.pid, error: String(error) });
  process.exitCode = 1;
} finally {
  if (first) await closeAndVerifyExit(first);
  if (second) await closeAndVerifyExit(second);
  process.stdout.write(`${JSON.stringify({ outcome, operationId, nodeId,
    evidencePath, auditPath, stderrPaths })}\n`);
}
