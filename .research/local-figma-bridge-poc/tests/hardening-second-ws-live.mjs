// Phase 8.0-G4: real Plugin plus a separate rogue localhost WebSocket process.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
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
const TEST_CLIENT_ID_1 = requireLocalTestClientId("FIGMA_TEST_HARDENING_SECOND_WS_LIVE_CLIENT_ID_1");
const TEST_NODE_ID_1 = requireLocalTestNodeId("FIGMA_TEST_HARDENING_SECOND_WS_LIVE_NODE_ID_1");
const TEST_DOCUMENT_NAME_1 = requireLocalTestValue("FIGMA_TEST_HARDENING_SECOND_WS_LIVE_DOCUMENT_NAME_1");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fileIdentity = TEST_FILE_A_IDENTITY;
const documentName = TEST_DOCUMENT_NAME_1;
const pageId = TEST_NODE_ID_1;
const clientId = TEST_CLIENT_ID_1;
const taskId = 'hardening-second-ws';
const stamp = new Date().toISOString().replaceAll(':', '-');
const logPath = path.join(root, 'logs', `phase8-0g4-live-${stamp}.jsonl`);
const stderrPath = path.join(root, 'logs', `phase8-0g4-stderr-${stamp}.log`);
const authPath = path.join(root, 'state', `phase8-0g4-grants-${stamp}.json`);
const auditPath = path.join(root, 'logs', `phase8-0g4-audit-${stamp}.jsonl`);
await mkdir(path.dirname(logPath), { recursive: true });
await writeFile(logPath, '', { flag: 'wx' });
const evidence = (event, details = {}) => appendFile(logPath,
  `${JSON.stringify({ timestamp: new Date().toISOString(), event, ...details })}\n`, 'utf8');

const store = new TaskAuthorizationStore({ filePath: authPath });
await store.initialize();
const grant = await store.issueForLocalControl({ workspaceId: WORKSPACE_ID,
  taskId, clientId, fileIdentity,
  scope: { fileIdentity, pageId, rootNodeId: pageId },
  allowedActions: ['create', 'delete'], revision: '1',
  expiresAt: new Date(Date.now() + 12 * 60_000).toISOString() });
const mutationInput = (fields) => ({ expectedFileIdentity: fileIdentity,
  workspaceId: WORKSPACE_ID, taskId, authorizationId: grant.authorizationId,
  revision: '1', operationId: `op-${randomUUID()}`, ...fields });

const transport = new StdioClientTransport({ command: process.execPath,
  args: [path.join(root, 'mcp', 'server.mjs')], cwd: root,
  env: { ...process.env, LOCAL_FIGMA_BRIDGE_PORT: '41731',
    LOCAL_FIGMA_BRIDGE_AUTHORIZATION_STATE_PATH: authPath,
    LOCAL_FIGMA_BRIDGE_AUDIT_PATH: auditPath }, stderr: 'pipe' });
transport.stderr?.on('data', (chunk) => { void appendFile(stderrPath, chunk); });
const client = new Client({ name: 'phase8-0g4-live', version: '0.0.1' });
const call = async (name, args = {}) => {
  const started = Date.now();
  const raw = await client.callTool({ name, arguments: args });
  const message = raw.content?.find((item) => item.type === 'text')?.text ?? '';
  let value;
  try { value = JSON.parse(message); } catch { value = message; }
  const response = { isError: raw.isError === true, value };
  await evidence('mcp_call', { name, args, response, latencyMs: Date.now() - started });
  return response;
};
const read = async (id) => {
  const response = await call('figma_scope_read_node', { targetNodeId: id });
  assert.equal(response.isError, false, `read ${id} failed`);
  return response.value;
};
const status = async () => {
  const response = await call('figma_status');
  return response.isError ? null : response.value;
};

async function rogueClient() {
  const child = spawn(process.execPath,
    [path.join(root, 'tests', 'rogue-ws-client.mjs'), '41731'],
    { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
  child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
  const exit = await Promise.race([
    new Promise((resolve) => child.once('exit', (code, signal) => resolve({ code, signal }))),
    delay(7_000).then(() => { child.kill(); return { code: null, signal: 'timeout' }; }),
  ]);
  const result = { pid: child.pid, exit, stderr, stdout: stdout.trim() };
  await evidence('rogue_process', result);
  assert.equal(exit.code, 0, 'rogue client did not exit normally');
  assert.equal(stderr, '', 'rogue client emitted an error');
  const parsed = JSON.parse(result.stdout);
  assert.deepEqual(parsed.events.map((event) => event.event), ['open', 'close']);
  assert.equal(parsed.events[1].code, 1013);
  assert.equal(parsed.outcome, 'REJECTED');
  return result;
}

let connected = false;
let nodeId;
let outcome = 'BLOCKED';
try {
  await client.connect(transport);
  connected = true;
  await evidence('mcp_process_started', { pid: transport.pid });
  let before;
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = await status();
    if (candidate?.connected && candidate.bridgeAuth?.authenticated) { before = candidate; break; }
    await delay(750);
  }
  assert.ok(before, 'real Plugin did not authenticate');
  assert.equal(before.documentName, documentName, "Connected document changed");
  assert.equal(before.fileIdentity, fileIdentity, 'HARD FAIL: wrong file');
  assert.equal(before.clientId, clientId, 'HARD FAIL: wrong Plugin client');
  const pageBefore = await read(pageId);
  const docBefore = await call('figma_read_document');
  assert.equal(docBefore.isError, false);
  await evidence('baseline', { sessionId: before.sessionId,
    connectionId: before.connectionId, fileIdentity: before.fileIdentity,
    authenticated: before.bridgeAuth.authenticated,
    mutationCount: before.scopedMutationAttemptCount,
    page: pageBefore, document: docBefore.value });

  await rogueClient();
  const after = await status();
  assert.ok(after, 'Plugin disconnected after second WS connection');
  const pageAfter = await read(pageId);
  const docAfter = await call('figma_read_document');
  assert.equal(docAfter.isError, false);
  assert.equal(after.bridgeAuth?.authenticated, true);
  assert.equal(after.connectionId, before.connectionId, 'active Plugin was replaced');
  assert.equal(after.sessionId, before.sessionId, 'Plugin session changed');
  assert.equal(after.clientId, before.clientId);
  assert.equal(after.scopedMutationAttemptCount, before.scopedMutationAttemptCount);
  assert.deepEqual(pageAfter, pageBefore, 'Page changed during rogue connection');
  assert.deepEqual(docAfter.value, docBefore.value, 'document summary changed');
  const serverLog = await readFile(stderrPath, 'utf8');
  const rejection = serverLog.split('\n').filter(Boolean)
    .filter((line) => line.includes('"event":"connection_rejected"'));
  assert.equal(rejection.length, 1, 'server did not log exactly one second-connection rejection');
  assert.match(rejection[0], /"reason":"active_plugin_connection"/);
  assert.ok(rejection[0].includes(before.connectionId), 'server log used another active connection');
  await evidence('second_connection_rejected', { closeCode: 1013,
    originalConnectionId: before.connectionId,
    afterConnectionId: after.connectionId,
    mutationCountDelta: 0, pageUnchanged: true, documentSummaryUnchanged: true,
    serverRejection: rejection[0] });

  const createArgs = mutationInput({ parentId: pageId, name: 'Hardening G4 Connection Control' });
  const created = await call('figma_scope_create_frame', createArgs);
  assert.equal(created.isError, false, 'create response uncertain; no blind retry');
  nodeId = created.value.id;
  const node = await read(nodeId);
  assert.equal(node.id, nodeId);
  assert.equal(node.type, 'FRAME');
  assert.equal(node.parentId, pageId);
  assert.equal(node.owner, 'local-codex-figma-bridge-poc');
  assert.equal(node.createdOperationId, createArgs.operationId);
  await evidence('positive_control_create', { nodeId, operationId: createArgs.operationId,
    readBack: node });
  const deleteArgs = mutationInput({ targetNodeId: nodeId });
  const deleted = await call('figma_scope_delete_node', deleteArgs);
  const absent = await read(nodeId);
  await evidence('positive_control_cleanup', { nodeId, operationId: deleteArgs.operationId,
    response: deleted, readBack: absent });
  assert.equal(deleted.isError, false, 'delete response uncertain');
  assert.equal(absent.exists, false, 'cleanup node remains');
  nodeId = undefined;
  assert.deepEqual(await read(pageId), pageBefore, 'Page did not return to baseline');
  outcome = 'VERIFIED';
  await evidence('final', { outcome, boundedClaim: 'realSecondWsClientRejectedWhilePluginConnected',
    protectedFileMutation: 0, businessRepoMutation: 0, forbiddenFigmaFallback: 0 });
} catch (error) {
  process.exitCode = 1;
  await evidence('failure', { outcome, error: String(error), nodeId,
    mutationRetry: false });
} finally {
  if (connected) {
    const closeResult = await Promise.race([
      client.close().then(() => 'closed', (error) => `error:${String(error)}`),
      delay(5_000).then(() => 'timeout'),
    ]);
    if (closeResult === 'timeout') await transport.close();
    await evidence('mcp_process_closed', { pid: transport.pid, closeResult });
  }
  process.stdout.write(`${JSON.stringify({ outcome, logPath, stderrPath,
    auditPath, nodeId })}\n`);
}
