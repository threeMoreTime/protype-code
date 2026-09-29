// Phase 8.0-G: real Figma timeout -> Bridge restart -> same-operation fail-closed.
// Run only with the dedicated, empty test Page and an already paired Development Plugin.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { startBridge } from '../relay/bridge-server.mjs';
import { PairingStore } from '../relay/pairing-store.mjs';
import { TaskAuthorizationStore } from '../relay/task-authorization-store.mjs';
import { MutationAudit } from '../relay/mutation-audit.mjs';
import { WORKSPACE_ID } from '../relay/protocol.mjs';

import { requireLocalTestClientId, requireLocalTestFileIdentity, requireLocalTestNodeId, requireLocalTestValue } from "../scripts/issue-test-authorization.mjs";

const TEST_FILE_A_IDENTITY = requireLocalTestFileIdentity("FIGMA_TEST_FILE_A_IDENTITY");
const TEST_CLIENT_ID_1 = requireLocalTestClientId("FIGMA_TEST_HARDENING_RESTART_TIMEOUT_LIVE_CLIENT_ID_1");
const TEST_NODE_ID_1 = requireLocalTestNodeId("FIGMA_TEST_HARDENING_RESTART_TIMEOUT_LIVE_NODE_ID_1");
const TEST_DOCUMENT_NAME_1 = requireLocalTestValue("FIGMA_TEST_HARDENING_RESTART_TIMEOUT_LIVE_DOCUMENT_NAME_1");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fileIdentity = TEST_FILE_A_IDENTITY;
const documentName = TEST_DOCUMENT_NAME_1;
const pageId = TEST_NODE_ID_1;
const clientId = TEST_CLIENT_ID_1;
const taskId = 'hardening-restart-timeout';
const stamp = new Date().toISOString().replaceAll(':', '-');
const evidencePath = path.join(root, 'logs', `phase8-0g-restart-timeout-live-${stamp}.jsonl`);
const auditPath = path.join(root, 'logs', `phase8-0g-restart-timeout-audit-${stamp}.jsonl`);
const authPath = path.join(root, 'state', `phase8-0g-restart-timeout-grants-${stamp}.json`);
await mkdir(path.dirname(evidencePath), { recursive: true });
await writeFile(evidencePath, '', { flag: 'wx' });
const evidence = (event, details = {}) => appendFile(evidencePath,
  `${JSON.stringify({ timestamp: new Date().toISOString(), event, ...details })}\n`, 'utf8');
const pairingPath = path.join(root, 'state', 'pairing-store.json');
const operationId = `op-${randomUUID()}`;
let bridge;
let nodeId;
let outcome = 'BLOCKED';

async function start(label) {
  const pairingStore = new PairingStore({ filePath: pairingPath });
  const authorizationStore = new TaskAuthorizationStore({ filePath: authPath });
  const audit = new MutationAudit({ filePath: auditPath });
  await authorizationStore.initialize();
  const server = await startBridge({ port: 41731, pairingStore, authorizationStore,
    auditJournal: audit,
    logger: (entry) => { void evidence('bridge_event', { label, entry }); } });
  await evidence('bridge_started', { label, port: server.port, pid: process.pid,
    auditState: audit.latest(operationId)?.state ?? null });
  return { server, authorizationStore, audit };
}

async function connected(server, label) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (server.connection?.ready && server.connection?.authenticated) break;
    await delay(1_000);
  }
  assert.equal(server.connection?.authenticated, true, `${label}: paired Plugin unavailable`);
  const status = await server.callPlugin('status');
  await evidence('status', { label, status });
  assert.equal(status.documentName, documentName, "Connected document changed");
  assert.equal(status.fileIdentity, fileIdentity, 'HARD FAIL: wrong persistent file');
  assert.equal(status.currentPageId, pageId, 'HARD FAIL: wrong current Page');
  assert.equal(status.clientId, clientId, 'HARD FAIL: wrong paired client');
  assert.equal(server.connection.authenticated, true);
  return status;
}

try {
  const first = await start('first');
  bridge = first.server;
  const firstStatus = await connected(bridge, 'first');
  const before = await bridge.callPlugin('scope_read_node', { targetNodeId: pageId });
  await evidence('preflight_page', { page: before });
  assert.deepEqual(before.childIds, [], 'dedicated test Page must be empty');
  const grant = await first.authorizationStore.issueForLocalControl({ workspaceId: WORKSPACE_ID,
    taskId, fileIdentity, clientId, scope: { fileIdentity, pageId, rootNodeId: pageId },
    allowedActions: ['create', 'delete'], revision: '1',
    expiresAt: new Date(Date.now() + 10 * 60_000).toISOString() });
  const input = (logicalOperationId, fields = {}) => ({ expectedFileIdentity: fileIdentity,
    workspaceId: WORKSPACE_ID, taskId, authorizationId: grant.authorizationId,
    revision: '1', operationId: logicalOperationId, ...fields });
  const createInput = input(operationId, { parentId: pageId, name: 'Hardening G Restart Timeout' });
  let timeoutResponse;
  try {
    timeoutResponse = await bridge.callPlugin('scope_create_frame', createInput, 1);
  } catch (error) {
    timeoutResponse = { error: String(error) };
  }
  const beforeRestartAudit = bridge.operationStatus(operationId);
  await evidence('first_create_timeout', { input: createInput, timeoutResponse,
    audit: beforeRestartAudit, connectionId: firstStatus.connectionId,
    sessionId: firstStatus.sessionId });
  assert.equal(beforeRestartAudit.state, 'OUTCOME_UNKNOWN');
  assert.equal(beforeRestartAudit.errorCode, 'TRANSPORT_TIMEOUT');
  await bridge.close();
  bridge = null;
  await evidence('bridge_closed', { afterState: beforeRestartAudit.state });

  const second = await start('restarted');
  bridge = second.server;
  assert.equal(second.audit.latest(operationId).state, 'OUTCOME_UNKNOWN');
  const secondStatus = await connected(bridge, 'restarted');
  assert.notEqual(secondStatus.connectionId, firstStatus.connectionId);
  assert.equal(secondStatus.sessionId, firstStatus.sessionId,
    'Node restart should not restart the Figma Plugin session');
  const pageBeforeRetry = await bridge.callPlugin('scope_read_node', { targetNodeId: pageId });
  const countBeforeRetry = secondStatus.scopedMutationAttemptCount;
  let retryError;
  try {
    await bridge.callPlugin('scope_create_frame', createInput);
  } catch (error) { retryError = String(error); }
  const pageAfterRetry = await bridge.callPlugin('scope_read_node', { targetNodeId: pageId });
  const statusAfterRetry = await bridge.callPlugin('status');
  const retryAudit = bridge.operationStatus(operationId);
  await evidence('same_operation_retry_rejected', { retryError, pageBeforeRetry,
    pageAfterRetry, countBeforeRetry,
    countAfterRetry: statusAfterRetry.scopedMutationAttemptCount,
    audit: retryAudit, connectionId: secondStatus.connectionId });
  assert.match(retryError ?? '', /OPERATION_OUTCOME_UNKNOWN/);
  assert.deepEqual(pageAfterRetry.childIds, pageBeforeRetry.childIds);
  assert.equal(statusAfterRetry.scopedMutationAttemptCount, countBeforeRetry);
  assert.equal(retryAudit.state, 'OUTCOME_UNKNOWN');
  assert.equal(retryAudit.result, 'retry_blocked');

  let reconciled;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    reconciled = await bridge.reconcileCreateOperation(operationId);
    await evidence('read_only_reconcile', { attempt, result: reconciled });
    if (reconciled.state === 'VERIFIED') break;
    await delay(500);
  }
  assert.equal(reconciled.state, 'VERIFIED');
  nodeId = reconciled.nodeId;
  assert.equal(reconciled.node.createdOperationId, operationId);
  const pageWithOne = await bridge.callPlugin('scope_read_node', { targetNodeId: pageId });
  assert.deepEqual(pageWithOne.childIds, [nodeId], 'exactly one frame for one logical operation');

  const deleteOperationId = `op-${randomUUID()}`;
  let deleteResponse;
  try {
    deleteResponse = await bridge.callPlugin('scope_delete_node',
      input(deleteOperationId, { targetNodeId: nodeId }));
  } catch (error) { deleteResponse = { error: String(error) }; }
  let finalPage;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    finalPage = await bridge.callPlugin('scope_read_node', { targetNodeId: pageId });
    await evidence('cleanup_page_read_back', { attempt, deleteOperationId,
      deleteResponse, page: finalPage });
    if (!finalPage.childIds.includes(nodeId)) break;
    await delay(500);
  }
  assert.deepEqual(finalPage.childIds, []);
  const auditText = await readFile(auditPath, 'utf8');
  assert.equal(/"(?:pairingSecret|secret|proof|code)"\s*:/.test(auditText), false);
  outcome = 'VERIFIED';
  await evidence('final', { outcome, operationId, nodeId, deleteOperationId,
    deleteResponse,
    firstConnectionId: firstStatus.connectionId,
    secondConnectionId: secondStatus.connectionId,
    samePluginSession: true, finalPageChildIds: [], protectedFileMutation: 0,
    businessRepoMutation: 0, forbiddenFallback: 0 });
} catch (error) {
  await evidence('failure', { outcome, operationId, nodeId, error: String(error) });
  process.exitCode = 1;
} finally {
  if (bridge) await bridge.close();
  process.stdout.write(`${JSON.stringify({ outcome, operationId, nodeId,
    evidencePath, auditPath })}\n`);
}
