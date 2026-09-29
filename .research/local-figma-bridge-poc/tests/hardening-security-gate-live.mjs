// Phase 8.0-G3: consolidated real-Figma security negatives. Never targets locally protected file.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
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
const TEST_FILE_B_IDENTITY = requireLocalTestFileIdentity("FIGMA_TEST_FILE_B_IDENTITY");
const TEST_CLIENT_ID_1 = requireLocalTestClientId("FIGMA_TEST_HARDENING_SECURITY_GATE_LIVE_CLIENT_ID_1");
const TEST_NODE_ID_1 = requireLocalTestNodeId("FIGMA_TEST_HARDENING_SECURITY_GATE_LIVE_NODE_ID_1");
const TEST_NODE_ID_2 = requireLocalTestNodeId("FIGMA_TEST_HARDENING_SECURITY_GATE_LIVE_NODE_ID_2");
const TEST_DOCUMENT_NAME_1 = requireLocalTestValue("FIGMA_TEST_HARDENING_SECURITY_GATE_LIVE_DOCUMENT_NAME_1");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fileA = TEST_FILE_A_IDENTITY;
const fileB = TEST_FILE_B_IDENTITY;
const documentName = TEST_DOCUMENT_NAME_1;
const pageId = TEST_NODE_ID_1;
const otherPageId = TEST_NODE_ID_2;
const clientId = TEST_CLIENT_ID_1;
const taskId = 'hardening-security-gate';
const stamp = new Date().toISOString().replaceAll(':', '-');
const logPath = path.join(root, 'logs', `phase8-0g3-security-live-${stamp}.jsonl`);
const authPath = path.join(root, 'state', `phase8-0g3-grants-${stamp}.json`);
const auditPath = path.join(root, 'logs', `phase8-0g3-audit-${stamp}.jsonl`);
const stderrPath = path.join(root, 'logs', `phase8-0g3-stderr-${stamp}.log`);
const unpairedStorePath = path.join(root, 'state', `phase8-0g3-unpaired-${stamp}.json`);
const wrongPairStorePath = path.join(root, 'state', `phase8-0g3-wrong-pair-${stamp}.json`);
const normalPairStorePath = path.join(root, 'state', 'pairing-store.json');
await mkdir(path.dirname(logPath), { recursive: true });
await writeFile(logPath, '', { flag: 'wx' });
const evidence = (event, details = {}) => appendFile(logPath,
  `${JSON.stringify({ timestamp: new Date().toISOString(), event, ...details })}\n`, 'utf8');

const store = new TaskAuthorizationStore({ filePath: authPath });
await store.initialize();
async function grant({ task = taskId, client = clientId, file = fileA,
  page = pageId, scopeRoot = pageId, actions = ['create', 'update', 'delete'] } = {}) {
  const record = await store.issueForLocalControl({ workspaceId: WORKSPACE_ID,
    taskId: task, clientId: client, fileIdentity: file,
    scope: { fileIdentity: file, pageId: page, rootNodeId: scopeRoot },
    allowedActions: actions, revision: '1',
    expiresAt: new Date(Date.now() + 12 * 60_000).toISOString() });
  await evidence('trusted_grant', { authorizationId: record.authorizationId,
    taskId: record.taskId, clientId: record.clientId, fileIdentity: record.fileIdentity,
    scope: record.scope, allowedActions: record.allowedActions, expiresAt: record.expiresAt });
  return record;
}
const valid = await grant();
const wrongClient = await grant({ client: TEST_CLIENT_ID_1 });
const wrongTask = await grant({ task: 'hardening-other-task' });
const wrongFile = await grant({ file: fileB, page: TEST_NODE_ID_2, scopeRoot: TEST_NODE_ID_2 });
const wrongScope = await grant({ scopeRoot: otherPageId });
const fixtureGrant = await grant({ task: 'hardening-fixture', actions: ['test_fixture'] });
const input = (record, fields = {}) => ({ expectedFileIdentity: fileA,
  workspaceId: WORKSPACE_ID, taskId: record.taskId,
  authorizationId: record.authorizationId, revision: '1',
  operationId: `op-${randomUUID()}`, ...fields });

async function start(label, pairingPath = normalPairStorePath) {
  const transport = new StdioClientTransport({ command: process.execPath,
    args: [path.join(root, 'mcp', 'server.mjs')], cwd: root,
    env: { ...process.env, LOCAL_FIGMA_BRIDGE_PORT: '41731',
      LOCAL_FIGMA_BRIDGE_ENABLE_TEST_FIXTURES: '1',
      LOCAL_FIGMA_BRIDGE_PAIRING_STATE_PATH: pairingPath,
      LOCAL_FIGMA_BRIDGE_AUTHORIZATION_STATE_PATH: authPath,
      LOCAL_FIGMA_BRIDGE_AUDIT_PATH: auditPath }, stderr: 'pipe' });
  transport.stderr?.on('data', (chunk) => { void appendFile(stderrPath, chunk); });
  const client = new Client({ name: `phase8-0g3-${label}`, version: '0.0.1' });
  await client.connect(transport);
  await evidence('mcp_process_started', { label, pid: transport.pid });
  return { label, client, transport, pid: transport.pid };
}
async function call(stage, name, args = {}) {
  const started = Date.now();
  const raw = await stage.client.callTool({ name, arguments: args });
  const message = raw.content?.find((item) => item.type === 'text')?.text ?? '';
  let value;
  try { value = JSON.parse(message); } catch { value = message; }
  const response = { isError: raw.isError === true, value };
  await evidence('mcp_call', { label: stage.label, pid: stage.pid, name, args,
    response, latencyMs: Date.now() - started });
  return response;
}
async function ready(stage, expectAuthenticated) {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const response = await call(stage, 'figma_status');
    if (!response.isError && response.value.connected &&
        response.value.bridgeAuth?.authenticated === expectAuthenticated) {
      const status = response.value;
      assert.equal(status.documentName, documentName, "Connected document changed");
      assert.equal(status.fileIdentity, fileA, 'HARD FAIL: wrong persistent file');
      assert.ok([pageId, otherPageId].includes(status.currentPageId),
        'HARD FAIL: unexpected current Page in the dedicated file');
      assert.equal(status.clientId, clientId, 'HARD FAIL: wrong Plugin client');
      await evidence('identity_pin', { label: stage.label, pid: stage.pid,
        sessionId: status.sessionId, connectionId: status.connectionId,
        fileIdentity: status.fileIdentity, currentPageId: status.currentPageId,
        authenticated: expectAuthenticated,
        scopedMutationAttemptCount: status.scopedMutationAttemptCount });
      return status;
    }
    await delay(750);
  }
  throw new Error(`${stage.label}: Plugin connection/auth state unavailable`);
}
async function read(stage, id) {
  const response = await call(stage, 'figma_scope_read_node', { targetNodeId: id });
  assert.equal(response.isError, false, `${stage.label}: read ${id} failed`);
  return response.value;
}
async function close(stage) {
  if (!stage) return;
  const closeResult = await Promise.race([
    stage.client.close().then(() => 'closed', (error) => `error:${String(error)}`),
    delay(5_000).then(() => 'timeout'),
  ]);
  if (closeResult === 'timeout') await stage.transport.close();
  let exited = false;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try { process.kill(stage.pid, 0); }
    catch (error) {
      if (error?.code === 'ESRCH') { exited = true; break; }
      throw error;
    }
    await delay(100);
  }
  await evidence('mcp_process_closed', { label: stage.label, pid: stage.pid,
    closeResult, exited });
  assert.equal(exited, true, `${stage.label}: MCP child still running`);
}
async function currentAudit(operationId) {
  const raw = await readFile(auditPath, 'utf8');
  const entries = raw.trimEnd().split('\n').filter(Boolean).map(JSON.parse);
  return entries.filter((entry) => entry.operationId === operationId).at(-1);
}
async function snapshot(stage, ids) {
  if (stage.label === 'paired') return Promise.all(ids.map((id) => read(stage, id)));
  const response = await call(stage, 'figma_read_document');
  assert.equal(response.isError, false, `${stage.label}: read_document failed`);
  assert.equal(response.value.documentName, documentName);
  return { pages: response.value.pages, ownedPocNodes: response.value.ownedPocNodes,
    selection: response.value.selection };
}
async function denied(stage, label, tool, args, code, ids = [pageId]) {
  const before = await snapshot(stage, ids);
  const countBefore = (await ready(stage, stage.label === 'paired')).scopedMutationAttemptCount;
  const response = await call(stage, tool, args);
  assert.equal(response.isError, true, label);
  assert.match(String(response.value), new RegExp(code), label);
  const after = await snapshot(stage, ids);
  const countAfter = (await ready(stage, stage.label === 'paired')).scopedMutationAttemptCount;
  assert.deepEqual(after, before, `${label}: Figma state changed`);
  assert.equal(countAfter, countBefore, `${label}: Plugin mutation attempted`);
  const audit = await currentAudit(args.operationId);
  assert.equal(audit?.state, 'REJECTED');
  assert.equal(audit?.errorCode, code);
  await evidence('negative_verified', { label, code, operationId: args.operationId,
    before, after, mutationCountDelta: 0, audit, response });
}

let stage;
let ownedId;
let foreignId;
let outcome = 'BLOCKED';
try {
  stage = await start('paired');
  const paired = await ready(stage, true);
  const doc = await call(stage, 'figma_read_document');
  assert.equal(doc.isError, false);
  assert.equal(doc.value.pages.some((page) => page.id === pageId), true);
  assert.equal(doc.value.pages.some((page) => page.id === otherPageId), true);
  assert.deepEqual(doc.value.ownedPocNodes, [],
    'pre-existing owned POC nodes need review before G3');
  const pagePreflight = await read(stage, pageId);
  await evidence('read_only_preflight', { currentPageId: paired.currentPageId,
    targetPageId: pageId, targetPage: pagePreflight,
    ownedPocNodes: doc.value.ownedPocNodes });
  const createArgs = input(valid, { parentId: pageId, name: 'Hardening G3 Owned' });
  const created = await call(stage, 'figma_scope_create_frame', createArgs);
  assert.equal(created.isError, false, 'positive create uncertain; no blind retry');
  ownedId = created.value.id;
  assert.equal((await read(stage, ownedId)).createdOperationId, createArgs.operationId);
  const pageAfterCreate = await read(stage, pageId);
  assert.ok(Array.isArray(pageAfterCreate.childIds));
  assert.equal(pageAfterCreate.childIds.filter((id) => id === ownedId).length, 1);
  const originalOtherChildren = pageAfterCreate.childIds.filter((id) => id !== ownedId);
  await evidence('positive_control', { nodeId: ownedId, operationId: createArgs.operationId,
    status: 'VERIFIED' });

  await denied(stage, 'missing_authorization', 'figma_scope_update_frame',
    input(valid, { authorizationId: undefined, targetNodeId: ownedId, name: 'Denied' }),
    'AUTH_REQUIRED', [ownedId, pageId]);
  await denied(stage, 'wrong_client_grant', 'figma_scope_update_frame',
    input(wrongClient, { targetNodeId: ownedId, name: 'Denied' }),
    'AUTH_INVALID', [ownedId, pageId]);
  await denied(stage, 'wrong_task', 'figma_scope_update_frame',
    input(valid, { taskId: wrongTask.taskId, targetNodeId: ownedId, name: 'Denied' }),
    'AUTH_TASK_MISMATCH', [ownedId, pageId]);
  await denied(stage, 'wrong_test_file', 'figma_scope_update_frame',
    input(wrongFile, { targetNodeId: ownedId, name: 'Denied' }),
    'SCOPE_FILE_MISMATCH', [ownedId, pageId]);
  await denied(stage, 'wrong_page_root', 'figma_scope_update_frame',
    input(wrongScope, { targetNodeId: ownedId, name: 'Denied' }),
    'SCOPE_ROOT_PAGE_MISMATCH', [ownedId, pageId]);

  const fixtureArgs = input(fixtureGrant, { parentId: pageId, name: 'Hardening G3 Foreign' });
  const fixture = await call(stage, 'figma_scope_create_foreign_fixture', fixtureArgs);
  assert.equal(fixture.isError, false, 'foreign fixture create uncertain; no blind retry');
  foreignId = fixture.value.id;
  assert.equal((await read(stage, foreignId)).owner, '');
  await denied(stage, 'foreign_update', 'figma_scope_update_frame',
    input(valid, { targetNodeId: foreignId, name: 'Denied' }),
    'OWNERSHIP_REQUIRED', [foreignId, pageId]);
  await denied(stage, 'foreign_delete', 'figma_scope_delete_node',
    input(valid, { targetNodeId: foreignId }),
    'OWNERSHIP_REQUIRED', [foreignId, pageId]);

  const fixtureDelete = await call(stage, 'figma_scope_delete_foreign_fixture',
    input(fixtureGrant, { targetNodeId: foreignId }));
  const foreignAfter = await read(stage, foreignId);
  await evidence('foreign_cleanup', { response: fixtureDelete, readBack: foreignAfter });
  assert.equal(foreignAfter.exists, false, 'foreign fixture remains; stop before next phase');
  foreignId = undefined;
  const ownedDelete = await call(stage, 'figma_scope_delete_node',
    input(valid, { targetNodeId: ownedId }));
  const ownedAfter = await read(stage, ownedId);
  await evidence('owned_cleanup', { response: ownedDelete, readBack: ownedAfter });
  assert.equal(ownedAfter.exists, false, 'owned fixture remains; stop before next phase');
  ownedId = undefined;
  assert.deepEqual((await read(stage, pageId)).childIds, originalOtherChildren);
  await close(stage); stage = null;

  // An isolated empty server store cannot trust the saved Plugin pairing.
  stage = await start('unpaired', unpairedStorePath);
  const unpaired = await ready(stage, false);
  assert.deepEqual((await snapshot(stage, [pageId])).ownedPocNodes, []);
  await denied(stage, 'unpaired_client', 'figma_scope_create_frame',
    input(valid, { parentId: pageId, name: 'Must Not Exist' }),
    'PAIRING_REQUIRED', [pageId]);
  await evidence('unpaired_connection', { authenticated: unpaired.bridgeAuth?.authenticated,
    connectionId: unpaired.connectionId });
  await close(stage); stage = null;

  // Rotate only the *isolated copy* of the server record. Do not log either secret.
  const copied = JSON.parse(await readFile(normalPairStorePath, 'utf8'));
  assert.equal(copied.pairings[clientId]?.clientId, clientId);
  copied.pairings[clientId].secret = randomBytes(32).toString('base64url');
  await writeFile(wrongPairStorePath, `${JSON.stringify(copied)}\n`, { flag: 'wx', mode: 0o600 });
  stage = await start('wrong_pair', wrongPairStorePath);
  const invalid = await ready(stage, false);
  assert.deepEqual((await snapshot(stage, [pageId])).ownedPocNodes, []);
  await denied(stage, 'invalid_pairing_proof', 'figma_scope_create_frame',
    input(valid, { parentId: pageId, name: 'Must Not Exist' }),
    'PAIRING_REQUIRED', [pageId]);
  const stderr = await readFile(stderrPath, 'utf8');
  assert.match(stderr, /"event":"auth_rejected"/,
    'server did not observe a rejected real Plugin HMAC proof');
  await evidence('invalid_pairing_connection', { authenticated: invalid.bridgeAuth?.authenticated,
    connectionId: invalid.connectionId, serverAuthRejected: true });
  await close(stage); stage = null;

  const rawAudit = await readFile(auditPath, 'utf8');
  assert.equal(/"(?:pairingSecret|secret|proof|code|token)"\s*:/.test(rawAudit), false);
  outcome = 'VERIFIED';
  await evidence('final', { outcome, fileIdentity: fileA, pageId,
    pairingAndSecurityCases: 9, protectedFileMutation: 0, businessRepoMutation: 0,
    forbiddenFigmaFallback: 0 });
} catch (error) {
  await evidence('failure', { outcome, error: String(error), ownedId, foreignId,
    mutationRetry: false });
  process.exitCode = 1;
} finally {
  if (stage) await close(stage);
  process.stdout.write(`${JSON.stringify({ outcome, logPath, auditPath,
    stderrPath, ownedId, foreignId })}\n`);
}
