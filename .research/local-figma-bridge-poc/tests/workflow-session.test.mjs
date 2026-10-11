import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { once } from 'node:events';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { WORKSPACE_ID, TASK_ID } from '../relay/protocol.mjs';
import * as workflow from '../scripts/workflow.mjs';

const adoption = { pendingOperationId: 'op-legacy-unknown', flowSnapshotSignature: 'a'.repeat(64), reactionSnapshotSignature: 'b'.repeat(64) };
test('CLI forwards adoption only from reconcile and never supplies it implicitly', () => {
  const config = { fileIdentity: 'figma-file:synthetic-cli', runId: 'cli-run' };
  const spec = { schemaVersion: '1.0', id: 'fixture', name: 'Fixture', nodes: [
    { key: 'frame', type: 'FRAME', parentKey: null, x: 0, y: 0, width: 100, height: 100, props: {} },
  ] };
  const grant = { authorizationId: 'auth-synthetic', revision: '1' };
  const args = workflow.designSessionArgs(config, { command: 'reconcile', adoptNativeFlow: adoption }, spec, grant, 'op-new-request');
  assert.equal(args.reconcile, true); assert.deepEqual(args.adoptNativeFlow, adoption);
  assert.equal(args.operationId, 'op-new-request'); assert.equal(args.adoptNativeFlow.pendingOperationId, 'op-legacy-unknown');
  for (const command of ['apply', 'reconcile', 'audit', 'plan', 'export']) {
    const request = { command, ...(command === 'export' ? { nodeKey: 'frame' } : {}) };
    assert.equal(Object.hasOwn(workflow.designSessionArgs(config, request, spec, grant, 'op-new-request'), 'adoptNativeFlow'), false);
  }
  for (const command of ['status', 'document', 'read-node', 'pair', 'restart', 'plan', 'apply', 'audit', 'export', 'operation', 'quit', 'unknown']) {
    assert.throws(() => workflow.validateSessionRequest({ command, adoptNativeFlow: adoption }), /SESSION_NATIVE_FLOW_ADOPTION_REQUIRES_RECONCILE/);
  }
  assert.throws(() => workflow.designSessionArgs(config, { command: 'reconcile', adoptNativeFlow: { ...adoption, ignoreGuard: true } }, spec, grant), /DESIGN_NATIVE_FLOW_ADOPTION_INVALID/);
});

test('persistent CLI records intent before failed transport and blocks blind retry across restart', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'design-session-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const spec = { schemaVersion: '1.0', id: 'fixture', name: 'Fixture', nodes: [
    { key: 'frame', type: 'FRAME', parentKey: null, x: 0, y: 0, width: 100, height: 100, props: {} },
  ] };
  const config = { fileIdentity: 'figma-file:synthetic-cli', specPath: 'spec.json', grantPath: 'grant.json', runId: 'cli-run', outDir: 'evidence' };
  await writeFile(path.join(dir, 'spec.json'), JSON.stringify(spec));
  await writeFile(path.join(dir, 'session.json'), JSON.stringify(config));
  // PowerShell 5.1 Set-Content -Encoding utf8 includes a BOM.
  await writeFile(path.join(dir, 'grant.json'), '\uFEFF' + JSON.stringify({ fileIdentity: config.fileIdentity,
    workspaceId: WORKSPACE_ID, taskId: TASK_ID, authorizationId: 'auth-synthetic', revision: '1' }));
  const script = fileURLToPath(new URL('../scripts/workflow.mjs', import.meta.url));
  async function run(commands) {
    const child = spawn(process.execPath, [script, 'session', path.join(dir, 'session.json')], {
      env: { ...process.env, LOCAL_FIGMA_BRIDGE_PORT: '0',
        LOCAL_FIGMA_BRIDGE_PAIRING_STATE_PATH: path.join(dir, 'pairing.json'),
        LOCAL_FIGMA_BRIDGE_AUTHORIZATION_STATE_PATH: path.join(dir, 'auth.json'),
        LOCAL_FIGMA_BRIDGE_AUDIT_PATH: path.join(dir, 'audit.jsonl') },
      stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true,
    });
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; }); child.stderr.on('data', chunk => { stderr += chunk; });
    const timer = setTimeout(() => child.kill(), 10000);
    child.stdin.end(commands.map(command => JSON.stringify(typeof command === 'string' ? { command } : command)).join('\n') + '\n');
    const [code] = await once(child, 'close'); clearTimeout(timer);
    assert.equal(code, 0, stderr);
    return stdout.trim().split('\n').map(line => JSON.parse(line));
  }
  const first = await run(['apply', 'quit']);
  assert.match(first.at(-1).error, /not connected/);
  const state = JSON.parse(await readFile(path.join(dir, 'evidence/cli-run.state.json')));
  assert.equal(state.status, 'OUTCOME_UNKNOWN');
  const second = await run(['apply', 'quit']);
  assert.match(second.at(-1).error, /OUTCOME_UNKNOWN: audit then reconcile/);
  assert.equal(JSON.parse(await readFile(path.join(dir, 'evidence/cli-run.state.json'))).operationId, state.operationId);
  const refused = await run(['status', 'document', 'read-node', 'pair', 'restart', 'plan', 'apply', 'audit', 'export', 'operation', 'quit']
    .map(command => ({ command, adoptNativeFlow: adoption })).concat('quit'));
  assert.equal(refused.length, 12);
  for (const result of refused.slice(1)) assert.match(result.error, /SESSION_NATIVE_FLOW_ADOPTION_REQUIRES_RECONCILE/);
  assert.equal(JSON.parse(await readFile(path.join(dir, 'evidence/cli-run.state.json'))).operationId, state.operationId);
  const explicit = await run([{ command: 'reconcile', adoptNativeFlow: adoption }, 'quit']);
  assert.match(explicit.at(-1).error, /not connected/);
  const explicitState = JSON.parse(await readFile(path.join(dir, 'evidence/cli-run.state.json')));
  assert.equal(explicitState.status, 'OUTCOME_UNKNOWN'); assert.notEqual(explicitState.operationId, state.operationId);
  const afterExplicit = await run(['apply', 'quit']);
  assert.match(afterExplicit.at(-1).error, /OUTCOME_UNKNOWN: audit then reconcile/);
  assert.equal(JSON.parse(await readFile(path.join(dir, 'evidence/cli-run.state.json'))).operationId, explicitState.operationId);
});
