import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { MutationAudit } from '../relay/mutation-audit.mjs';

test('mutation audit persists correlated JSONL without credentials or arbitrary payload', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'figma-audit-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const filePath = path.join(directory, 'audit.jsonl');
  const audit = new MutationAudit({ filePath });
  audit.record({ state: 'OUTCOME_UNKNOWN', requestId: 'req-1', operationId: 'op-audit-test-001',
    authorizationId: 'auth-1', workspaceId: 'test', taskId: 'task', fileIdentity: 'figma-file:test',
    command: 'scope_create_frame', action: 'create', target: { parentId: '0:1' },
    errorCode: 'TRANSPORT_TIMEOUT', pairingSecret: 'do-not-log-this-secret',
    proof: 'do-not-log-this-proof', payload: { secret: 'do-not-log-this-payload' } });
  const raw = await readFile(filePath, 'utf8');
  const entries = raw.trimEnd().split('\n').map(JSON.parse);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].state, 'OUTCOME_UNKNOWN');
  assert.equal(entries[0].operationId, 'op-audit-test-001');
  assert.equal(entries[0].requestId, 'req-1');
  assert.match(entries[0].timestamp, /^\d{4}-\d\d-\d\dT/);
  assert.equal(raw.includes('do-not-log'), false);
  assert.deepEqual(new MutationAudit({ filePath }).latest('op-audit-test-001'), entries[0]);
});

test('mutation audit fails closed on invalid state and corrupted existing JSONL', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'figma-audit-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const filePath = path.join(directory, 'audit.jsonl');
  const audit = new MutationAudit({ filePath });
  assert.throws(() => audit.record({ state: 'SUCCESS', operationId: 'op-audit-test-002' }), /AUDIT_STATE_INVALID/);
  await import('node:fs/promises').then(({ writeFile }) => writeFile(filePath, 'not-json\n'));
  assert.throws(() => new MutationAudit({ filePath }), /AUDIT_CORRUPT/);
});
