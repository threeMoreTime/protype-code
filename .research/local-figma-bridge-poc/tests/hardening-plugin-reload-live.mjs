// Phase 8.0-G5: one MCP process, one real Plugin runtime reload, one owned node.
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
const TEST_CLIENT_ID_1 = requireLocalTestClientId("FIGMA_TEST_HARDENING_PLUGIN_RELOAD_LIVE_CLIENT_ID_1");
const TEST_NODE_ID_1 = requireLocalTestNodeId("FIGMA_TEST_HARDENING_PLUGIN_RELOAD_LIVE_NODE_ID_1");
const TEST_DOCUMENT_NAME_1 = requireLocalTestValue("FIGMA_TEST_HARDENING_PLUGIN_RELOAD_LIVE_DOCUMENT_NAME_1");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fileIdentity = TEST_FILE_A_IDENTITY;
const documentName = TEST_DOCUMENT_NAME_1;
const pageId = TEST_NODE_ID_1;
const clientId = TEST_CLIENT_ID_1;
const taskId = 'hardening-plugin-reload';
const stamp = new Date().toISOString().replaceAll(':', '-');
const logPath = path.join(root, 'logs', `phase8-0g5-live-${stamp}.jsonl`);
const stderrPath = path.join(root, 'logs', `phase8-0g5-stderr-${stamp}.log`);
const authPath = path.join(root, 'state', `phase8-0g5-grants-${stamp}.json`);
const auditPath = path.join(root, 'logs', `phase8-0g5-audit-${stamp}.jsonl`);
await mkdir(path.dirname(logPath), { recursive: true });
await writeFile(logPath, '', { flag: 'wx' });
const evidence = (event, details = {}) => appendFile(logPath,
  `${JSON.stringify({ timestamp: new Date().toISOString(), event, ...details })}\n`, 'utf8');

const store = new TaskAuthorizationStore({ filePath: authPath });
await store.initialize();
const grant = await store.issueForLocalControl({ workspaceId: WORKSPACE_ID,
  taskId, clientId, fileIdentity,
  scope: { fileIdentity, pageId, rootNodeId: pageId },
  allowedActions: ['create', 'update', 'delete'], revision: '1',
  expiresAt: new Date(Date.now() + 30 * 60_000).toISOString() });
await evidence('trusted_grant_issued', { authorizationId: grant.authorizationId,
  clientId: grant.clientId, fileIdentity: grant.fileIdentity,
  taskId: grant.taskId, expiresAt: grant.expiresAt });
const input = (fields = {}) => ({ expectedFileIdentity: fileIdentity,
  workspaceId: WORKSPACE_ID, taskId, authorizationId: grant.authorizationId,
  revision: '1', operationId: `op-${randomUUID()}`, ...fields });

const transport = new StdioClientTransport({ command: process.execPath,
  args: [path.join(root, 'mcp', 'server.mjs')], cwd: root,
  env: { ...process.env, LOCAL_FIGMA_BRIDGE_PORT: '41731',
    LOCAL_FIGMA_BRIDGE_AUTHORIZATION_STATE_PATH: authPath,
    LOCAL_FIGMA_BRIDGE_AUDIT_PATH: auditPath }, stderr: 'pipe' });
transport.stderr?.on('data', (chunk) => { void appendFile(stderrPath, chunk); });
const client = new Client({ name: 'phase8-0g5-live', version: '0.0.1' });
let pid;
let connected = false;
let nodeId;
let outcome = 'BLOCKED';

async function rawCall(name, args = {}) {
  const started = Date.now();
  const raw = await client.callTool({ name, arguments: args });
  const message = raw.content?.find((item) => item.type === 'text')?.text ?? '';
  let value;
  try { value = JSON.parse(message); } catch { value = message; }
  return { isError: raw.isError === true, value, latencyMs: Date.now() - started };
}
async function call(name, args = {}) {
  const result = await rawCall(name, args);
  await evidence('mcp_call', { pid, name, args, ...result });
  return result;
}
async function status() {
  const response = await rawCall('figma_status');
  return response.isError ? null : response.value;
}
function pin(value) {
  assert.equal(value?.connected, true, 'Plugin is not connected');
  assert.equal(value.documentName, documentName, "Connected document changed");
  assert.equal(value.fileIdentity, fileIdentity, 'HARD FAIL: wrong file');
  assert.equal(value.clientId, clientId, 'HARD FAIL: wrong client');
  assert.equal(value.bridgeAuth?.authenticated, true, 'Plugin is not authenticated');
  assert.equal(typeof value.bridgeAuth?.pairingId, 'string');
  assert.ok(value.bridgeAuth.pairingId.length > 0);
}
async function ready(previousSessionId = null) {
  const deadline = Date.now() + (previousSessionId ? 15 * 60_000 : 25_000);
  let lastConnectionId;
  while (Date.now() < deadline) {
    const value = await status();
    if (value?.connectionId !== lastConnectionId) {
      lastConnectionId = value?.connectionId;
      await evidence('connection_observed', { pid, sessionId: value?.sessionId,
        connectionId: value?.connectionId, authenticated: value?.bridgeAuth?.authenticated });
    }
    if (value?.connected && value.sessionId !== previousSessionId &&
        value.bridgeAuth?.authenticated === true) {
      pin(value);
      await evidence('identity_pin', { pid, sessionId: value.sessionId,
        connectionId: value.connectionId, fileIdentity: value.fileIdentity,
        clientId: value.clientId, pairingId: value.bridgeAuth.pairingId,
        scopedMutationAttemptCount: value.scopedMutationAttemptCount });
      return value;
    }
    await delay(1_000);
  }
  throw new Error(previousSessionId ? 'PLUGIN_RELOAD_NOT_OBSERVED' : 'PLUGIN_NOT_AUTHENTICATED');
}
async function read(id) {
  const response = await call('figma_scope_read_node', { targetNodeId: id });
  assert.equal(response.isError, false, `read ${id} failed`);
  return response.value;
}
async function auditFor(operationId) {
  const raw = await readFile(auditPath, 'utf8');
  return raw.trimEnd().split('\n').filter(Boolean).map(JSON.parse)
    .filter((entry) => entry.operationId === operationId).at(-1);
}
function assertAlive() {
  process.kill(pid, 0);
  assert.equal(transport.pid, pid, 'MCP process PID changed');
}

try {
  await client.connect(transport);
  connected = true;
  pid = transport.pid;
  await evidence('mcp_process_started', { pid });
  const before = await ready();
  assert.equal(before.currentPageId, pageId, 'HARD FAIL: unexpected Page');
  const pageBefore = await read(pageId);
  const createArgs = input({ parentId: pageId, name: 'Hardening G5 Reload Control' });
  const created = await call('figma_scope_create_frame', createArgs);
  assert.equal(created.isError, false, 'create outcome uncertain; do not retry');
  nodeId = created.value.id;
  const nodeBefore = await read(nodeId);
  assert.equal(nodeBefore.id, nodeId);
  assert.equal(nodeBefore.type, 'FRAME');
  assert.equal(nodeBefore.parentId, pageId);
  assert.equal(nodeBefore.owner, 'local-codex-figma-bridge-poc');
  assert.equal(nodeBefore.workspaceId, WORKSPACE_ID);
  assert.equal(nodeBefore.taskId, taskId);
  assert.equal(nodeBefore.createdOperationId, createArgs.operationId);
  assert.equal((await auditFor(createArgs.operationId))?.state, 'APPLIED');
  await evidence('pre_reload_owned_node', { pid, sessionId: before.sessionId,
    connectionId: before.connectionId, operationId: createArgs.operationId,
    nodeId, readBack: nodeBefore });
  assertAlive();
  await evidence('awaiting_plugin_runtime_reload', { pid, nodeId,
    previousSessionId: before.sessionId, previousConnectionId: before.connectionId,
    documentName, fileIdentity });
  process.stdout.write(`G5_WAITING_FOR_PLUGIN_RELOAD ${JSON.stringify({ pid, nodeId,
    logPath, previousSessionId: before.sessionId })}\n`);

  const after = await ready(before.sessionId);
  assertAlive();
  assert.notEqual(after.connectionId, before.connectionId,
    'WebSocket connection did not change after Plugin runtime reload');
  assert.equal(after.bridgeAuth.pairingId, before.bridgeAuth.pairingId,
    'Pairing did not persist through Plugin runtime reload');
  const nodeAfterReload = await read(nodeId);
  assert.deepEqual(nodeAfterReload, nodeBefore, 'Owned node changed across Plugin reload');
  await evidence('post_reload_owned_node', { pid, sessionId: after.sessionId,
    connectionId: after.connectionId, authenticated: true, readBack: nodeAfterReload });

  const pageBeforeDeny = await read(pageId);
  const countBeforeDeny = (await status()).scopedMutationAttemptCount;
  const deniedArgs = input({ targetNodeId: nodeId,
    name: 'MUST NOT APPLY — no task authorization', authorizationId: undefined });
  const denied = await call('figma_scope_update_frame', deniedArgs);
  const nodeAfterDeny = await read(nodeId);
  const pageAfterDeny = await read(pageId);
  const countAfterDeny = (await status()).scopedMutationAttemptCount;
  const deniedAudit = await auditFor(deniedArgs.operationId);
  assert.equal(denied.isError, true);
  assert.match(String(denied.value), /AUTH_REQUIRED/);
  assert.deepEqual(nodeAfterDeny, nodeAfterReload, 'Denied update changed owned node');
  assert.deepEqual(pageAfterDeny, pageBeforeDeny, 'Denied update changed Page');
  assert.equal(countAfterDeny, countBeforeDeny, 'Denied update reached Plugin mutation');
  assert.equal(deniedAudit?.state, 'REJECTED');
  assert.equal(deniedAudit?.errorCode, 'AUTH_REQUIRED');
  assertAlive();
  await evidence('missing_authorization_rejected', { pid, operationId: deniedArgs.operationId,
    response: denied, audit: deniedAudit, nodeBefore: nodeAfterReload,
    nodeAfter: nodeAfterDeny, pageBefore: pageBeforeDeny, pageAfter: pageAfterDeny,
    mutationCountDelta: 0 });

  const updateArgs = input({ targetNodeId: nodeId, name: 'Hardening G5 Reload Updated' });
  const updated = await call('figma_scope_update_frame', updateArgs);
  assert.equal(updated.isError, false, 'update outcome uncertain; do not retry');
  const updatedNode = await read(nodeId);
  assert.equal(updatedNode.name, updateArgs.name);
  assert.equal(updatedNode.createdOperationId, createArgs.operationId);
  assert.equal((await auditFor(updateArgs.operationId))?.state, 'APPLIED');
  await evidence('post_reload_authorized_update', { pid, operationId: updateArgs.operationId,
    response: updated, readBack: updatedNode });

  const deleteArgs = input({ targetNodeId: nodeId });
  const deleted = await call('figma_scope_delete_node', deleteArgs);
  const absent = await read(nodeId);
  await evidence('post_reload_authorized_cleanup', { pid, operationId: deleteArgs.operationId,
    response: deleted, readBack: absent });
  assert.equal(deleted.isError, false, 'delete outcome uncertain');
  assert.equal(absent.exists, false, 'owned node remains after delete');
  assert.equal((await auditFor(deleteArgs.operationId))?.state, 'APPLIED');
  assert.deepEqual(await read(pageId), pageBefore, 'Page did not return to baseline');
  nodeId = undefined;
  assertAlive();
  outcome = 'VERIFIED';
  await evidence('final', { outcome, pid, originalSessionId: before.sessionId,
    reloadedSessionId: after.sessionId, originalConnectionId: before.connectionId,
    reloadedConnectionId: after.connectionId, protectedFileMutation: 0,
    businessRepoMutation: 0, forbiddenFigmaFallback: 0 });
} catch (error) {
  process.exitCode = 1;
  await evidence('failure', { outcome, pid, nodeId, error: String(error), mutationRetry: false });
} finally {
  if (connected) {
    const closeResult = await Promise.race([
      client.close().then(() => 'closed', (error) => `error:${String(error)}`),
      delay(5_000).then(() => 'timeout'),
    ]);
    if (closeResult === 'timeout') await transport.close();
    await evidence('mcp_process_closed', { pid, closeResult });
  }
  process.stdout.write(`${JSON.stringify({ outcome, pid, logPath, stderrPath,
    auditPath, nodeId })}\n`);
}
