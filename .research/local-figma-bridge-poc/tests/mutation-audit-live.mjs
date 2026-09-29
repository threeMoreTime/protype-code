// Real MCP -> Figma Desktop validation. Writes only to the pinned empty dedicated test file.
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
const TEST_CLIENT_ID_1 = requireLocalTestClientId("FIGMA_TEST_MUTATION_AUDIT_LIVE_CLIENT_ID_1");
const TEST_NODE_ID_1 = requireLocalTestNodeId("FIGMA_TEST_MUTATION_AUDIT_LIVE_NODE_ID_1");
const TEST_NODE_ID_2 = requireLocalTestNodeId("FIGMA_TEST_MUTATION_AUDIT_LIVE_NODE_ID_2");
const TEST_DOCUMENT_NAME_1 = requireLocalTestValue("FIGMA_TEST_MUTATION_AUDIT_LIVE_DOCUMENT_NAME_1");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fileIdentity = TEST_FILE_A_IDENTITY;
const documentName = TEST_DOCUMENT_NAME_1;
const clientId = TEST_CLIENT_ID_1;
const pageId = TEST_NODE_ID_1;
const stamp = new Date().toISOString().replaceAll(':', '-');
const evidencePath = path.join(root, 'logs', `phase8-0f-mcp-live-${stamp}.jsonl`);
const auditPath = path.join(root, 'logs', `phase8-0f-mutation-audit-${stamp}.jsonl`);
const authPath = path.join(root, 'state', `phase8-0f-grants-${stamp}.json`);
await mkdir(path.dirname(evidencePath), { recursive: true });
await writeFile(evidencePath, '', { flag: 'wx' });
const evidence = (event, details = {}) => appendFile(evidencePath,
  `${JSON.stringify({ timestamp: new Date().toISOString(), event, ...details })}\n`, 'utf8');

const store = new TaskAuthorizationStore({ filePath: authPath });
await store.initialize();
async function grant(taskId, actions, rootNodeId = pageId) {
  return store.issueForLocalControl({ workspaceId: WORKSPACE_ID, taskId, fileIdentity, clientId,
    scope: { fileIdentity, pageId, rootNodeId }, allowedActions: actions, revision: '1',
    expiresAt: new Date(Date.now() + 10 * 60_000).toISOString() });
}
const ownedGrant = await grant('audit-task-A', ['create', 'update', 'delete']);
const fixtureGrant = await grant('audit-fixture', ['test_fixture']);
const wrongPageRootId = TEST_NODE_ID_2;
const badRootGrant = await grant('audit-task-A', ['update'], wrongPageRootId);

const transport = new StdioClientTransport({ command: process.execPath,
  args: [path.join(root, 'mcp', 'server.mjs')], cwd: root,
  env: { ...process.env, LOCAL_FIGMA_BRIDGE_AUTHORIZATION_STATE_PATH: authPath,
    LOCAL_FIGMA_BRIDGE_AUDIT_PATH: auditPath,
    LOCAL_FIGMA_BRIDGE_ENABLE_TEST_FIXTURES: '1' }, stderr: 'pipe' });
const client = new Client({ name: 'phase8-0f-real-figma-audit', version: '0.0.1' });
let status;
let ownedId;
let fixtureId;
let result = { status: 'BLOCKED', evidencePath, auditPath, authPath,
  protectedFileMutation: 0, businessRepoMutation: 0, figmaComputerUse: 0, forbiddenFallback: 0 };
try {
  await client.connect(transport);
  async function call(name, args = {}) {
    const started = Date.now();
    const raw = await client.callTool({ name, arguments: args });
    const text = raw.content?.find((item) => item.type === 'text')?.text ?? '';
    let value;
    try { value = JSON.parse(text); } catch { value = text; }
    const response = { isError: raw.isError === true, value };
    await evidence('mcp_call', { name, args, response, latencyMs: Date.now() - started });
    return response;
  }
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await call('figma_status');
    if (!response.isError && response.value.connected) { status = response.value; break; }
    await delay(1_000);
  }
  assert.ok(status, 'Figma Development Plugin is not connected');
  assert.equal(status.documentName, documentName, "Connected document changed");
  assert.equal(status.fileIdentity, fileIdentity, 'HARD FAIL: wrong persistent file identity');
  assert.equal(status.currentPageId, pageId);
  assert.equal(status.clientId, clientId);
  assert.equal(status.bridgeAuth?.authenticated, true);
  assert.equal(status.mutationAuditVersion, '8.0-F', 'Plugin main must be reloaded with audit code');
  const document = await call('figma_read_document');
  assert.equal(document.isError, false);
  assert.equal(document.value.pages.some((entry) => entry.id === wrongPageRootId), true,
    'Other test page must exist before using it as a mismatched scope root');
  const page = await call('figma_scope_read_node', { targetNodeId: pageId });
  assert.equal(page.isError, false);
  assert.deepEqual(page.value.childIds, [], 'Dedicated test Page must be empty before mutation');
  await evidence('preflight_pin', { fileIdentity, documentName, pageId,
    sessionId: status.sessionId, connectionId: status.connectionId,
    initialMutationCount: status.scopedMutationAttemptCount });

  function input(grantRecord, fields = {}) {
    return { expectedFileIdentity: fileIdentity, workspaceId: WORKSPACE_ID,
      taskId: grantRecord.taskId, authorizationId: grantRecord.authorizationId,
      revision: grantRecord.revision, operationId: `op-${randomUUID()}`, ...fields };
  }
  async function read(id) {
    const response = await call('figma_scope_read_node', { targetNodeId: id });
    assert.equal(response.isError, false);
    return response.value;
  }
  async function denied(label, name, args, code, targetId) {
    const before = await read(targetId);
    const beforeStatus = (await call('figma_status')).value;
    const response = await call(name, args);
    assert.equal(response.isError, true, label);
    assert.match(String(response.value), new RegExp(code));
    const after = await read(targetId);
    const afterStatus = (await call('figma_status')).value;
    assert.deepEqual(after, before, `${label}: Figma changed`);
    assert.equal(afterStatus.scopedMutationAttemptCount, beforeStatus.scopedMutationAttemptCount);
    const audit = await call('figma_operation_status', { operationId: args.operationId });
    assert.equal(audit.isError, false);
    assert.equal(audit.value.state, 'REJECTED');
    assert.equal(audit.value.errorCode, code);
    await evidence('denied_verified', { label, operationId: args.operationId, audit: audit.value,
      before, after, mutationCountDelta: 0 });
  }

  const createdArgs = input(ownedGrant, { parentId: pageId, name: 'Audit F Owned' });
  const created = await call('figma_scope_create_frame', createdArgs);
  assert.equal(created.isError, false, 'real create response failed; do not retry blindly');
  assert.equal(created.value.auditBefore?.exists, false);
  ownedId = created.value.id;
  assert.equal((await read(ownedId)).createdOperationId, createdArgs.operationId);
  const applied = await call('figma_operation_status', { operationId: createdArgs.operationId });
  assert.equal(applied.value.state, 'APPLIED');
  assert.equal(applied.value.before.exists, false);
  assert.equal(applied.value.after.id, ownedId);
  const reconciled = await call('figma_reconcile_create_operation', { operationId: createdArgs.operationId });
  assert.equal(reconciled.isError, false);
  assert.equal(reconciled.value.state, 'VERIFIED');
  assert.equal(reconciled.value.nodeId, ownedId);
  await evidence('positive_create_verified', { operationId: createdArgs.operationId, nodeId: ownedId,
    audit: (await call('figma_operation_status', { operationId: createdArgs.operationId })).value });

  const missingAuth = input(ownedGrant, { authorizationId: undefined,
    targetNodeId: ownedId, name: 'Denied missing auth' });
  await denied('auth_rejection', 'figma_scope_update_frame', missingAuth, 'AUTH_REQUIRED', ownedId);
  const badRoot = input(badRootGrant, { targetNodeId: ownedId, name: 'Denied bad root' });
  await denied('scope_rejection', 'figma_scope_update_frame', badRoot, 'SCOPE_ROOT_PAGE_MISMATCH', ownedId);

  const fixtureArgs = input(fixtureGrant, { parentId: pageId, name: 'Audit F Foreign' });
  const fixture = await call('figma_scope_create_foreign_fixture', fixtureArgs);
  assert.equal(fixture.isError, false);
  fixtureId = fixture.value.id;
  const foreign = input(ownedGrant, { targetNodeId: fixtureId, name: 'Denied foreign update' });
  await denied('ownership_rejection', 'figma_scope_update_frame', foreign, 'OWNERSHIP_REQUIRED', fixtureId);

  const fixtureDelete = await call('figma_scope_delete_foreign_fixture',
    input(fixtureGrant, { targetNodeId: fixtureId }));
  assert.equal(fixtureDelete.isError, false);
  assert.equal((await read(fixtureId)).exists, false);
  const ownedDelete = await call('figma_scope_delete_node', input(ownedGrant, { targetNodeId: ownedId }));
  assert.equal(ownedDelete.isError, false);
  assert.equal((await read(ownedId)).exists, false);
  assert.deepEqual((await read(pageId)).childIds, []);
  const rawAudit = await readFile(auditPath, 'utf8');
  const entries = rawAudit.trimEnd().split('\n').map(JSON.parse);
  assert.equal(entries.some((entry) => entry.state === 'VERIFIED' &&
    entry.operationId === createdArgs.operationId), true);
  assert.equal(/"(?:pairingSecret|secret|proof|code)"\s*:/.test(rawAudit), false);
  result = { ...result, status: 'VERIFIED', fileIdentity, pageId,
    operationId: createdArgs.operationId, auditEntries: entries.length,
    finalPageChildIds: [], sessionId: status.sessionId, connectionId: status.connectionId };
  await evidence('final_verified', result);
} catch (error) {
  result = { ...result, status: 'BLOCKED', error: String(error), ownedId, fixtureId };
  await evidence('failure', result);
  process.exitCode = 1;
} finally {
  const closeOutcome = await Promise.race([
    client.close().then(() => 'closed', (error) => `error:${String(error)}`),
    delay(1_500).then(() => 'timeout'),
  ]);
  await evidence('mcp_client_close', { closeOutcome });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
