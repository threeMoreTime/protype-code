import { test } from 'node:test';
import assert from 'node:assert/strict';
import { designPayload } from '../design/commands.mjs';
import { readSessionConfig } from '../scripts/workflow.mjs';
import { validateDesignPng } from '../mcp/server.mjs';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { WORKSPACE_ID, TASK_ID } from '../relay/protocol.mjs';
const input = { spec: { schemaVersion: '1.0', id: 'demo', name: 'Demo', nodes: [
  { key: 'frame', type: 'FRAME', parentKey: null, x: 0, y: 0, width: 10, height: 10, props: {} },
] }, runId: 'run-1' };
test('design envelope rejects unsafe fields, invalid batching and wrong export node', () => {
  assert.equal(designPayload('scope_design_apply', input).spec.id, 'demo');
  for (const bad of [{ code: 'eval' }, { batchSize: 0 }, { batchSize: 501 }, { batchSize: 1000 }, { batchSize: 499.5 }, { batchSize: '500' }, { batchSize: null }, { runId: '../secret' }, { runId: true }, { runId: 123 }, { timerUnit: 'minutes' }]) {
    assert.throws(() => designPayload('scope_design_apply', { ...input, ...bad }));
  }
  assert.throws(() => designPayload('scope_design_plan', { ...input, reconcile: true }));
  assert.throws(() => designPayload('scope_design_export_png', { ...input, nodeKey: 'missing' }));
  assert.equal(designPayload('scope_design_export_png', { ...input, nodeKey: 'frame', scale: 2 }).scale, 2);
});

test('design envelope accepts integer batches through 500 without changing the omitted default', () => {
  for (const batchSize of [1, 250, 251, 499, 500]) {
    assert.equal(designPayload('scope_design_apply', { ...input, batchSize }).batchSize, batchSize);
  }
  assert.equal(Object.hasOwn(designPayload('scope_design_apply', input), 'batchSize'), false);
});
test('workflow requires exact stable file identity and rejects config typos', () => {
  assert.throws(() => readSessionConfig({ fileIdentity: '*' }, process.cwd()));
  assert.throws(() => readSessionConfig({ fileIdentity: 'figma-file:demo', fileIdentitiy: 'other' }, process.cwd()));
  assert.throws(() => readSessionConfig({ fileIdentity: 'figma-file:demo', runId: '../escape' }, process.cwd()));
  assert.throws(() => readSessionConfig({ fileIdentity: 'figma-file:demo', runId: 123 }, process.cwd()));
  assert.equal(readSessionConfig({ fileIdentity: 'figma-file:demo' }, process.cwd()).fileIdentity, 'figma-file:demo');
  assert.equal(readSessionConfig({ fileIdentity: 'figma-file:demo', auditLimit: 2000 }, process.cwd()).auditLimit, 2000);
  for (const auditLimit of [0, 2001, 1.5, '2000', null, Infinity]) {
    assert.throws(() => readSessionConfig({ fileIdentity: 'figma-file:demo', auditLimit }, process.cwd()), /SESSION_AUDIT_LIMIT_INVALID/);
  }
});
test('design PNG export refuses a bare magic header instead of emitting a corrupt image', () => {
  assert.throws(() => validateDesignPng({ bytesBase64: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString('base64') }), /PNG_IEND_MISSING/);
});

const adoption = { pendingOperationId: 'op-legacy-unknown', flowSnapshotSignature: 'a'.repeat(64), reactionSnapshotSignature: 'b'.repeat(64) };
test('native flow adoption has exactly three bounded fields and requires an explicit apply reconciliation', () => {
  const args = { ...input, reconcile: true, adoptNativeFlow: adoption };
  assert.deepEqual(designPayload('scope_design_apply', args).adoptNativeFlow, adoption);
  assert.equal(Object.hasOwn(designPayload('scope_design_apply', { ...input, reconcile: true }), 'adoptNativeFlow'), false);
  for (const pendingOperationId of [`op-${'x'.repeat(8)}`, `op-${'x'.repeat(100)}`]) {
    assert.equal(designPayload('scope_design_apply', { ...args, adoptNativeFlow: { ...adoption, pendingOperationId } }).adoptNativeFlow.pendingOperationId, pendingOperationId);
  }
  for (const bad of [null, undefined, [], true, 'adopt', {}, { ...adoption, ignoreGuard: true },
    { ...adoption, pendingOperationId: 'op-short' }, { ...adoption, pendingOperationId: `op-${'x'.repeat(101)}` },
    { ...adoption, pendingOperationId: 'op-../escape' }, { ...adoption, pendingOperationId: 123 },
    { ...adoption, flowSnapshotSignature: 'A'.repeat(64) }, { ...adoption, flowSnapshotSignature: 'a'.repeat(63) },
    { ...adoption, reactionSnapshotSignature: 'b'.repeat(65) }, { ...adoption, reactionSnapshotSignature: 'g'.repeat(64) }]) {
    assert.throws(() => designPayload('scope_design_apply', { ...args, adoptNativeFlow: bad }), /DESIGN_NATIVE_FLOW_ADOPTION_INVALID/);
  }
  for (const reconcile of [undefined, false]) {
    assert.throws(() => designPayload('scope_design_apply', { ...input, reconcile, adoptNativeFlow: adoption }), /DESIGN_NATIVE_FLOW_ADOPTION_INVALID/);
  }
  for (const command of ['scope_design_plan', 'scope_design_audit', 'scope_design_export_png']) {
    assert.throws(() => designPayload(command, { ...input, adoptNativeFlow: adoption }), /DESIGN_NATIVE_FLOW_ADOPTION_INVALID/);
  }
});

test('MCP publishes strict adoption fields and refuses malformed or read-only adoption before transport', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'figma-adoption-schema-'));
  const root = fileURLToPath(new URL('../', import.meta.url));
  const transport = new StdioClientTransport({ command: process.execPath, args: [path.join(root, 'mcp/server.mjs')],
    cwd: root, env: { ...process.env, LOCAL_FIGMA_BRIDGE_PORT: '0',
      LOCAL_FIGMA_BRIDGE_ALLOWED_FILE_IDENTITIES: 'figma-file:adoption-schema-test',
      LOCAL_FIGMA_BRIDGE_PAIRING_STATE_PATH: path.join(directory, 'pairing.json'),
      LOCAL_FIGMA_BRIDGE_AUTHORIZATION_STATE_PATH: path.join(directory, 'grants.json'),
      LOCAL_FIGMA_BRIDGE_AUDIT_PATH: path.join(directory, 'audit.jsonl') }, stderr: 'ignore' });
  const client = new Client({ name: 'adoption-schema-test', version: '0.0.1' });
  t.after(async () => { await client.close(); await rm(directory, { recursive: true, force: true }); });
  await client.connect(transport);
  const apply = (await client.listTools()).tools.find(tool => tool.name === 'figma_scope_design_apply');
  const schema = apply.inputSchema.properties.adoptNativeFlow;
  assert.equal(schema.type, 'object'); assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.required.sort(), ['flowSnapshotSignature', 'pendingOperationId', 'reactionSnapshotSignature']);
  const args = { ...input, expectedFileIdentity: 'figma-file:adoption-schema-test', workspaceId: WORKSPACE_ID, taskId: TASK_ID,
    reconcile: true, adoptNativeFlow: adoption };
  for (const bad of [{ ...adoption, ignoreGuard: true }, { ...adoption, pendingOperationId: 'op-short' },
    { ...adoption, flowSnapshotSignature: 'A'.repeat(64) }]) {
    const result = await client.callTool({ name: 'figma_scope_design_apply', arguments: { ...args, adoptNativeFlow: bad } });
    assert.equal(result.isError, true); assert.doesNotMatch(result.content[0].text, /not connected/);
  }
  const readOnly = await client.callTool({ name: 'figma_scope_design_audit', arguments: { ...args, reconcile: undefined } });
  assert.equal(readOnly.isError, true); assert.match(readOnly.content[0].text, /DESIGN_NATIVE_FLOW_ADOPTION_INVALID/);
  const permitted = await client.callTool({ name: 'figma_scope_design_apply', arguments: args });
  assert.equal(permitted.isError, true); assert.match(permitted.content[0].text, /not connected/);
});
