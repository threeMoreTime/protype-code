// One-time, exact-node cleanup after G4 runner assertion failed after a successful create.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { appendFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

import { requireLocalTestAuthorizationId, requireLocalTestFileIdentity, requireLocalTestNodeId, requireLocalTestOperationId, requireLocalTestValue } from "../scripts/issue-test-authorization.mjs";

const TEST_FILE_A_IDENTITY = requireLocalTestFileIdentity("FIGMA_TEST_FILE_A_IDENTITY");
const TEST_NODE_ID_1 = requireLocalTestNodeId("FIGMA_TEST_HARDENING_G4_RECOVER_OWNED_NODE_ID_1");
const TEST_NODE_ID_2 = requireLocalTestNodeId("FIGMA_TEST_HARDENING_G4_RECOVER_OWNED_NODE_ID_2");
const TEST_OPERATION_ID_1 = requireLocalTestOperationId("FIGMA_TEST_HARDENING_G4_RECOVER_OWNED_OPERATION_ID_1");
const TEST_AUTHORIZATION_ID_1 = requireLocalTestAuthorizationId("FIGMA_TEST_HARDENING_G4_RECOVER_OWNED_AUTHORIZATION_ID_1");
const TEST_DOCUMENT_NAME_1 = requireLocalTestValue("FIGMA_TEST_HARDENING_G4_RECOVER_OWNED_DOCUMENT_NAME_1");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nodeId = TEST_NODE_ID_1;
const createdOperationId = TEST_OPERATION_ID_1;
const authPath = path.join(root, 'state', 'phase8-0g4-grants-2026-09-28T09-15-33.944Z.json');
const logPath = path.join(root, 'logs', 'phase8-0g4-recovery-2026-09-28T09-16.jsonl');
await writeFile(logPath, '', { flag: 'wx' });
const log = (event, value) => appendFile(logPath,
  `${JSON.stringify({ timestamp: new Date().toISOString(), event, value })}\n`);
const transport = new StdioClientTransport({ command: process.execPath,
  args: [path.join(root, 'mcp', 'server.mjs')], cwd: root,
  env: { ...process.env, LOCAL_FIGMA_BRIDGE_PORT: '41731',
    LOCAL_FIGMA_BRIDGE_AUTHORIZATION_STATE_PATH: authPath } });
const client = new Client({ name: 'phase8-0g4-exact-cleanup', version: '0.0.1' });
const call = async (name, args = {}) => {
  const raw = await client.callTool({ name, arguments: args });
  const message = raw.content?.find((item) => item.type === 'text')?.text ?? '';
  let value;
  try { value = JSON.parse(message); } catch { value = message; }
  const response = { isError: raw.isError === true, value };
  await log(name, { args, response });
  return response;
};
let outcome = 'BLOCKED';
try {
  await client.connect(transport);
  let status;
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const response = await call('figma_status');
    if (!response.isError && response.value.connected && response.value.bridgeAuth?.authenticated) {
      status = response.value; break;
    }
    await delay(750);
  }
  assert.ok(status);
  assert.equal(status.documentName, TEST_DOCUMENT_NAME_1);
  assert.equal(status.fileIdentity, TEST_FILE_A_IDENTITY);
  const before = await call('figma_scope_read_node', { targetNodeId: nodeId });
  assert.equal(before.isError, false);
  assert.equal(before.value.id, nodeId);
  assert.equal(before.value.parentId, TEST_NODE_ID_2);
  assert.equal(before.value.owner, 'local-codex-figma-bridge-poc');
  assert.equal(before.value.taskId, 'hardening-second-ws');
  assert.equal(before.value.createdOperationId, createdOperationId);
  const deleted = await call('figma_scope_delete_node', {
    expectedFileIdentity: status.fileIdentity,
    workspaceId: 'protype-code-local', taskId: 'hardening-second-ws',
    authorizationId: TEST_AUTHORIZATION_ID_1,
    revision: '1', operationId: `op-${randomUUID()}`, targetNodeId: nodeId,
  });
  const after = await call('figma_scope_read_node', { targetNodeId: nodeId });
  assert.equal(deleted.isError, false, 'delete response uncertain; do not repeat');
  assert.equal(after.isError, false);
  assert.equal(after.value.exists, false);
  outcome = 'VERIFIED';
  await log('final', { outcome, nodeId, mutationRetry: false });
} catch (error) {
  process.exitCode = 1;
  await log('failure', { outcome, error: String(error), mutationRetry: false });
} finally {
  await client.close();
  process.stdout.write(`${JSON.stringify({ outcome, logPath })}\n`);
}
