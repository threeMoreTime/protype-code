import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, writeSync } from 'node:fs';
import path from 'node:path';

const STATES = new Set(['RECEIVED', 'VALIDATING', 'EXECUTING', 'APPLIED', 'VERIFIED',
  'REJECTED', 'FAILED', 'OUTCOME_UNKNOWN']);
const FIELDS = ['requestId', 'operationId', 'authorizationId', 'serverId', 'clientId',
  'pairingId', 'sessionId', 'connectionId', 'workspaceId', 'taskId', 'fileIdentity',
  'pageId', 'rootNodeId', 'command', 'action', 'result', 'errorCode', 'latencyMs'];
const TARGET_FIELDS = ['id', 'parentId', 'sourceNodeId', 'destinationNodeId'];
const NODE_FIELDS = ['id', 'type', 'name', 'exists', 'parentId', 'owner', 'workspaceId',
  'taskId', 'createdOperationId'];

function pick(source, fields) {
  if (!source || typeof source !== 'object') return undefined;
  return Object.fromEntries(fields.filter((key) => source[key] !== undefined)
    .map((key) => [key, source[key]]));
}

export class MutationAudit {
  constructor({ filePath }) {
    if (!filePath) throw new Error('AUDIT_PATH_REQUIRED');
    this.filePath = path.resolve(filePath);
    this.operations = new Map();
    if (!existsSync(this.filePath)) return;
    const raw = readFileSync(this.filePath, 'utf8');
    if (raw && !raw.endsWith('\n')) throw new Error('AUDIT_CORRUPT: incomplete final line');
    for (const line of raw.split('\n').filter(Boolean)) {
      let entry;
      try { entry = JSON.parse(line); } catch { throw new Error('AUDIT_CORRUPT: invalid JSONL'); }
      if (!STATES.has(entry.state)) throw new Error('AUDIT_CORRUPT: invalid state');
      if (entry.operationId) this.operations.set(entry.operationId, entry);
    }
  }

  record(input) {
    if (!STATES.has(input?.state)) throw new Error('AUDIT_STATE_INVALID');
    const entry = { timestamp: new Date().toISOString(), state: input.state,
      ...pick(input, FIELDS) };
    if (input.target) entry.target = pick(input.target, TARGET_FIELDS);
    if (input.before) entry.before = pick(input.before, NODE_FIELDS);
    if (input.after) entry.after = pick(input.after, NODE_FIELDS);
    mkdirSync(path.dirname(this.filePath), { recursive: true });
    const descriptor = openSync(this.filePath, 'a', 0o600);
    try {
      writeSync(descriptor, `${JSON.stringify(entry)}\n`, null, 'utf8');
      fsyncSync(descriptor);
    } finally { closeSync(descriptor); }
    if (entry.operationId) this.operations.set(entry.operationId, entry);
    return entry;
  }

  latest(operationId) {
    return this.operations.get(operationId) ?? null;
  }
}
