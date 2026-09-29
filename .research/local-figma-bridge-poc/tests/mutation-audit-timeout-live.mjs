// Real Figma API write with a deliberately short transport timeout; never retries the mutation.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
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
const TEST_CLIENT_ID_1 = requireLocalTestClientId("FIGMA_TEST_MUTATION_AUDIT_TIMEOUT_LIVE_CLIENT_ID_1");
const TEST_NODE_ID_1 = requireLocalTestNodeId("FIGMA_TEST_MUTATION_AUDIT_TIMEOUT_LIVE_NODE_ID_1");
const TEST_DOCUMENT_NAME_1 = requireLocalTestValue("FIGMA_TEST_MUTATION_AUDIT_TIMEOUT_LIVE_DOCUMENT_NAME_1");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fileIdentity = TEST_FILE_A_IDENTITY;
const pageId = TEST_NODE_ID_1;
const taskId = 'audit-timeout-task';
const stamp = new Date().toISOString().replaceAll(':', '-');
const evidencePath = path.join(root, 'logs', `phase8-0f-timeout-live-${stamp}.jsonl`);
const auditPath = path.join(root, 'logs', `phase8-0f-timeout-audit-${stamp}.jsonl`);
const authPath = path.join(root, 'state', `phase8-0f-timeout-grants-${stamp}.json`);
await mkdir(path.dirname(evidencePath), { recursive: true });
const evidence = (event, details = {}) => appendFile(evidencePath,
  `${JSON.stringify({ timestamp: new Date().toISOString(), event, ...details })}\n`, 'utf8');
const pairStore = new PairingStore({ filePath: path.join(root, 'state', 'pairing-store.json') });
const authStore = new TaskAuthorizationStore({ filePath: authPath });
const audit = new MutationAudit({ filePath: auditPath });
await authStore.initialize();
const grant = await authStore.issueForLocalControl({ workspaceId: WORKSPACE_ID, taskId,
  fileIdentity, clientId: TEST_CLIENT_ID_1,
  scope: { fileIdentity, pageId, rootNodeId: pageId }, allowedActions: ['create', 'delete'],
  revision: '1', expiresAt: new Date(Date.now() + 10 * 60_000).toISOString() });
const bridge = await startBridge({ port: 41731, pairingStore: pairStore,
  authorizationStore: authStore, auditJournal: audit,
  logger: (event) => { void evidence('bridge_event', event); } });
const operationId = `op-${randomUUID()}`;
const input = (actionOperationId, fields) => ({ expectedFileIdentity: fileIdentity,
  workspaceId: WORKSPACE_ID, taskId, authorizationId: grant.authorizationId,
  revision: '1', operationId: actionOperationId, ...fields });
let nodeId;
let outcome = 'BLOCKED';
try {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (bridge.connection?.ready && bridge.connection?.authenticated) break;
    await delay(1_000);
  }
  assert.equal(bridge.connection?.authenticated, true, 'paired Plugin unavailable');
  const status = await bridge.callPlugin('status');
  assert.equal(status.documentName, TEST_DOCUMENT_NAME_1);
  assert.equal(status.fileIdentity, fileIdentity);
  assert.equal(status.currentPageId, pageId);
  assert.equal(status.mutationAuditVersion, '8.0-F');
  const before = await bridge.callPlugin('scope_read_node', { targetNodeId: pageId });
  assert.deepEqual(before.childIds, [], 'test page must be empty');
  await evidence('preflight', { sessionId: status.sessionId,
    connectionId: status.connectionId, fileIdentity, pageId,
    mutationCount: status.scopedMutationAttemptCount });

  let response;
  try {
    response = await bridge.callPlugin('scope_create_frame',
      input(operationId, { parentId: pageId, name: 'Audit F Timed Out' }), 1);
  } catch (error) {
    response = { error: String(error) };
  }
  const initialAudit = bridge.operationStatus(operationId);
  await evidence('short_timeout', { operationId, response, audit: initialAudit });
  assert.equal(initialAudit.state, 'OUTCOME_UNKNOWN');
  assert.equal(initialAudit.errorCode, 'TRANSPORT_TIMEOUT');
  let reconciled;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    reconciled = await bridge.reconcileCreateOperation(operationId);
    await evidence('read_only_reconcile', { attempt, result: reconciled });
    if (reconciled.state === 'VERIFIED') break;
    await delay(500);
  }
  assert.equal(reconciled.state, 'VERIFIED', 'write outcome remains unknown');
  nodeId = reconciled.nodeId;
  assert.equal(reconciled.node.createdOperationId, operationId);
  const pageAfter = await bridge.callPlugin('scope_read_node', { targetNodeId: pageId });
  assert.deepEqual(pageAfter.childIds, [nodeId], 'one logical operation created exactly one node');
  assert.equal(bridge.operationStatus(operationId).state, 'VERIFIED');

  const deleteOperationId = `op-${randomUUID()}`;
  const deleted = await bridge.callPlugin('scope_delete_node',
    input(deleteOperationId, { targetNodeId: nodeId }));
  assert.equal(deleted.exists, false);
  const readBack = await bridge.callPlugin('scope_read_node', { targetNodeId: nodeId });
  assert.equal(readBack.exists, false);
  assert.deepEqual((await bridge.callPlugin('scope_read_node', { targetNodeId: pageId })).childIds, []);
  const rawAudit = await readFile(auditPath, 'utf8');
  assert.equal(/"(?:pairingSecret|secret|proof|code)"\s*:/.test(rawAudit), false);
  outcome = 'VERIFIED';
  await evidence('final', { outcome, operationId, nodeId, deleteOperationId,
    timeoutState: initialAudit.state, reconciledState: reconciled.state,
    finalPageChildIds: [], protectedFileMutation: 0, figmaComputerUse: 0 });
} catch (error) {
  await evidence('failure', { operationId, nodeId, error: String(error), outcome });
  process.exitCode = 1;
} finally {
  await bridge.close();
  process.stdout.write(`${JSON.stringify({ outcome, operationId, nodeId, evidencePath, auditPath })}\n`);
}
