// One-time read-back and owned-node cleanup after the interrupted 8.0-F live run.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { setTimeout as delay } from 'node:timers/promises';
import { TaskAuthorizationStore } from '../relay/task-authorization-store.mjs';
import { WORKSPACE_ID } from '../relay/protocol.mjs';

import { requireLocalTestClientId, requireLocalTestFileIdentity, requireLocalTestNodeId, requireLocalTestOperationId, requireLocalTestValue } from "../scripts/issue-test-authorization.mjs";

const TEST_FILE_A_IDENTITY = requireLocalTestFileIdentity("FIGMA_TEST_FILE_A_IDENTITY");
const TEST_CLIENT_ID_1 = requireLocalTestClientId("FIGMA_TEST_CLEANUP_PHASE8_0F_ORPHAN_CLIENT_ID_1");
const TEST_NODE_ID_1 = requireLocalTestNodeId("FIGMA_TEST_CLEANUP_PHASE8_0F_ORPHAN_NODE_ID_1");
const TEST_NODE_ID_2 = requireLocalTestNodeId("FIGMA_TEST_CLEANUP_PHASE8_0F_ORPHAN_NODE_ID_2");
const TEST_OPERATION_ID_1 = requireLocalTestOperationId("FIGMA_TEST_CLEANUP_PHASE8_0F_ORPHAN_OPERATION_ID_1");
const TEST_DOCUMENT_NAME_1 = requireLocalTestValue("FIGMA_TEST_CLEANUP_PHASE8_0F_ORPHAN_DOCUMENT_NAME_1");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fileIdentity = TEST_FILE_A_IDENTITY;
const pageId = TEST_NODE_ID_1;
const nodeId = TEST_NODE_ID_2;
const creationOperationId = TEST_OPERATION_ID_1;
const taskId = 'audit-task-A';
const storePath = path.join(root, 'state', 'phase8-0f-grants-2026-09-28T08-00-47.749Z.json');
const auditPath = path.join(root, 'logs', 'phase8-0f-cleanup-audit-2026-09-28.jsonl');
const store = new TaskAuthorizationStore({ filePath: storePath });
await store.initialize();
const grant = await store.issueForLocalControl({ workspaceId: WORKSPACE_ID, taskId,
  fileIdentity, clientId: TEST_CLIENT_ID_1,
  scope: { fileIdentity, pageId, rootNodeId: pageId }, allowedActions: ['delete'],
  revision: '1', expiresAt: new Date(Date.now() + 60_000).toISOString() });
const transport = new StdioClientTransport({ command: process.execPath,
  args: [path.join(root, 'mcp', 'server.mjs')], cwd: root,
  env: { ...process.env, LOCAL_FIGMA_BRIDGE_AUTHORIZATION_STATE_PATH: storePath,
    LOCAL_FIGMA_BRIDGE_AUDIT_PATH: auditPath }, stderr: 'pipe' });
const client = new Client({ name: 'phase8-0f-orphan-cleanup', version: '0.0.1' });
async function call(name, args = {}) {
  const raw = await client.callTool({ name, arguments: args });
  const text = raw.content?.find((item) => item.type === 'text')?.text ?? '';
  let value;
  try { value = JSON.parse(text); } catch { value = text; }
  return { isError: raw.isError === true, value };
}
try {
  await client.connect(transport);
  let status;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    status = await call('figma_status');
    if (!status.isError && status.value.connected) break;
    await delay(1_000);
  }
  assert.equal(status.isError, false);
  assert.equal(status.value.connected, true);
  assert.equal(status.value.documentName, TEST_DOCUMENT_NAME_1);
  assert.equal(status.value.fileIdentity, fileIdentity);
  assert.equal(status.value.currentPageId, pageId);
  assert.equal(status.value.bridgeAuth?.authenticated, true);
  const before = await call('figma_scope_read_node', { targetNodeId: nodeId });
  assert.equal(before.isError, false);
  assert.equal(before.value.owner, 'local-codex-figma-bridge-poc');
  assert.equal(before.value.taskId, taskId);
  assert.equal(before.value.createdOperationId, creationOperationId);
  assert.equal(before.value.parentId, pageId);
  assert.deepEqual(before.value.childIds, []);
  const operationId = `op-${randomUUID()}`;
  const deleted = await call('figma_scope_delete_node', { expectedFileIdentity: fileIdentity,
    workspaceId: WORKSPACE_ID, taskId, authorizationId: grant.authorizationId,
    revision: '1', operationId, targetNodeId: nodeId });
  assert.equal(deleted.isError, false, 'delete response uncertain; inspect read-back before retry');
  const after = await call('figma_scope_read_node', { targetNodeId: nodeId });
  assert.equal(after.isError, false);
  assert.equal(after.value.exists, false);
  console.log(JSON.stringify({ status: 'VERIFIED', nodeId, operationId, before: before.value,
    deleteResponse: deleted.value, after: after.value }));
} finally {
  await client.close();
}
