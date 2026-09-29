// Read back an uncertain cleanup outcome, then remove only the exact owned leaf if still present.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { startBridge } from '../relay/bridge-server.mjs';
import { PairingStore } from '../relay/pairing-store.mjs';
import { TaskAuthorizationStore } from '../relay/task-authorization-store.mjs';
import { MutationAudit } from '../relay/mutation-audit.mjs';
import { WORKSPACE_ID } from '../relay/protocol.mjs';

const nodeId = requireLocalTestNodeId("FIGMA_TEST_RECOVERY_NODE_ID");
const createOperationId = requireLocalTestOperationId("FIGMA_TEST_RECOVERY_CREATE_OPERATION_ID");

import { requireLocalTestClientId, requireLocalTestFileIdentity, requireLocalTestNodeId, requireLocalTestOperationId, requireLocalTestValue } from "../scripts/issue-test-authorization.mjs";

const TEST_FILE_A_IDENTITY = requireLocalTestFileIdentity("FIGMA_TEST_FILE_A_IDENTITY");
const TEST_CLIENT_ID_1 = requireLocalTestClientId("FIGMA_TEST_HARDENING_RECOVER_OWNED_NODE_CLIENT_ID_1");
const TEST_NODE_ID_1 = requireLocalTestNodeId("FIGMA_TEST_HARDENING_RECOVER_OWNED_NODE_NODE_ID_1");
const TEST_DOCUMENT_NAME_1 = requireLocalTestValue("FIGMA_TEST_HARDENING_RECOVER_OWNED_NODE_DOCUMENT_NAME_1");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fileIdentity = TEST_FILE_A_IDENTITY;
const pageId = TEST_NODE_ID_1;
const clientId = TEST_CLIENT_ID_1;
const taskId = 'hardening-restart-timeout';
const stamp = new Date().toISOString().replaceAll(':', '-');
const evidencePath = path.join(root, 'logs', `phase8-0g-owned-recovery-${stamp}.jsonl`);
const authPath = path.join(root, 'state', `phase8-0g-recovery-grants-${stamp}.json`);
const auditPath = path.join(root, 'logs', `phase8-0g-recovery-audit-${stamp}.jsonl`);
await mkdir(path.dirname(evidencePath), { recursive: true });
await writeFile(evidencePath, '', { flag: 'wx' });
const evidence = (event, details = {}) => appendFile(evidencePath,
  `${JSON.stringify({ timestamp: new Date().toISOString(), event, ...details })}\n`, 'utf8');
const store = new TaskAuthorizationStore({ filePath: authPath });
await store.initialize();
const bridge = await startBridge({ port: 41731,
  pairingStore: new PairingStore({ filePath: path.join(root, 'state', 'pairing-store.json') }),
  authorizationStore: store, auditJournal: new MutationAudit({ filePath: auditPath }),
  logger: (entry) => { void evidence('bridge_event', { entry }); } });
let result = 'BLOCKED';
try {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (bridge.connection?.authenticated && bridge.connection?.ready) break;
    await delay(1_000);
  }
  assert.equal(bridge.connection?.authenticated, true);
  const status = await bridge.callPlugin('status');
  await evidence('status', { status });
  assert.equal(status.documentName, TEST_DOCUMENT_NAME_1);
  assert.equal(status.fileIdentity, fileIdentity);
  assert.equal(status.currentPageId, pageId);
  assert.equal(status.clientId, clientId);
  let page = await bridge.callPlugin('scope_read_node', { targetNodeId: pageId });
  await evidence('first_page_read_back', { page });
  await delay(2_000);
  page = await bridge.callPlugin('scope_read_node', { targetNodeId: pageId });
  await evidence('second_page_read_back', { page });
  if (!page.childIds.includes(nodeId)) {
    assert.deepEqual(page.childIds, [], 'stop if unrelated Page children exist');
    result = 'VERIFIED_ABSENT_FROM_PAGE_NO_NEW_MUTATION';
  } else {
    const node = await bridge.callPlugin('scope_read_node', { targetNodeId: nodeId });
    await evidence('owned_node_read_back', { node });
    assert.equal(node.id, nodeId);
    assert.equal(node.type, 'FRAME');
    assert.equal(node.parentId, pageId);
    assert.equal(node.owner, 'local-codex-figma-bridge-poc');
    assert.equal(node.workspaceId, WORKSPACE_ID);
    assert.equal(node.taskId, taskId);
    assert.equal(node.createdOperationId, createOperationId);
    assert.deepEqual(node.childIds, []);
    assert.deepEqual(page.childIds, [nodeId], 'stop if any unrelated Page child exists');
    const grant = await store.issueForLocalControl({ workspaceId: WORKSPACE_ID, taskId,
      fileIdentity, clientId, scope: { fileIdentity, pageId, rootNodeId: pageId },
      allowedActions: ['delete'], revision: '1',
      expiresAt: new Date(Date.now() + 10 * 60_000).toISOString() });
    const deleteOperationId = `op-${randomUUID()}`;
    let response;
    try {
      response = await bridge.callPlugin('scope_delete_node', { expectedFileIdentity: fileIdentity,
        workspaceId: WORKSPACE_ID, taskId, authorizationId: grant.authorizationId,
        revision: '1', operationId: deleteOperationId, targetNodeId: nodeId });
    } catch (error) { response = { error: String(error) }; }
    const after = await bridge.callPlugin('scope_read_node', { targetNodeId: nodeId });
    const finalPage = await bridge.callPlugin('scope_read_node', { targetNodeId: pageId });
    await evidence('recovery_delete_read_back', { deleteOperationId, response, after, finalPage });
    assert.equal(after.exists, false);
    assert.deepEqual(finalPage.childIds, []);
    result = 'VERIFIED_ABSENT_AFTER_NEW_AUTHORIZED_DELETE';
  }
  await evidence('final', { result, nodeId, createOperationId, finalPageChildIds: [],
    protectedFileMutation: 0, businessRepoMutation: 0, forbiddenFallback: 0 });
} catch (error) {
  await evidence('failure', { result, nodeId, createOperationId, error: String(error) });
  process.exitCode = 1;
} finally {
  await bridge.close();
  process.stdout.write(`${JSON.stringify({ result, evidencePath, auditPath, nodeId })}\n`);
}
