import { validateDesignSpec } from './spec.mjs';

export const DESIGN_ACTIONS = Object.freeze({
  scope_design_plan: 'read', scope_design_audit: 'read',
  scope_design_apply: 'design', scope_design_export_png: 'export',
});
export function designPayload(command, input) {
  if (!Object.hasOwn(DESIGN_ACTIONS, command)) throw new Error('DESIGN_COMMAND_INVALID');
  if (!input || typeof input !== 'object') throw new Error('DESIGN_INPUT_REQUIRED');
  const allowed = new Set(['expectedFileIdentity', 'workspaceId', 'taskId', 'authorizationId',
    'revision', 'operationId', 'spec', 'runId', 'batchSize', 'timerUnit',
    'allowGlobalResources', 'nodeKey', 'scale', 'reconcile', 'adoptNativeFlow', 'auditOffset', 'auditLimit']);
  for (const key of Object.keys(input)) if (!allowed.has(key)) throw new Error(`DESIGN_INPUT_UNKNOWN: ${key}`);
  validateDesignSpec(input.spec);
  if (typeof input.runId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(input.runId)) throw new Error('DESIGN_RUN_ID_INVALID');
  if (input.batchSize !== undefined && (!Number.isInteger(input.batchSize) || input.batchSize < 1 || input.batchSize > 500)) throw new Error('DESIGN_BATCH_INVALID');
  if (input.timerUnit !== undefined && !['seconds', 'milliseconds'].includes(input.timerUnit)) throw new Error('DESIGN_TIMER_UNIT_INVALID');
  for (const key of ['allowGlobalResources', 'reconcile']) if (input[key] !== undefined && typeof input[key] !== 'boolean') throw new Error(`DESIGN_${key}_INVALID`);
  if (Object.hasOwn(input, 'adoptNativeFlow')) {
    const adoption = input.adoptNativeFlow;
    const keys = ['pendingOperationId', 'flowSnapshotSignature', 'reactionSnapshotSignature'];
    if (command !== 'scope_design_apply' || input.reconcile !== true || !adoption || typeof adoption !== 'object' ||
        Array.isArray(adoption) || Object.keys(adoption).length !== keys.length || !keys.every(key => Object.hasOwn(adoption, key)) ||
        typeof adoption.pendingOperationId !== 'string' || !/^op-[A-Za-z0-9._-]{8,100}$/.test(adoption.pendingOperationId) ||
        !['flowSnapshotSignature', 'reactionSnapshotSignature'].every(key => typeof adoption[key] === 'string' && /^[a-f0-9]{64}$/.test(adoption[key]))) {
      throw new Error('DESIGN_NATIVE_FLOW_ADOPTION_INVALID');
    }
  }
  if (input.reconcile && command !== 'scope_design_apply') throw new Error('DESIGN_RECONCILE_REQUIRES_APPLY');
  for (const [key, minimum, maximum] of [['auditOffset', 0, 25000], ['auditLimit', 1, 2000]]) {
    if (input[key] !== undefined && (command !== 'scope_design_audit' || !Number.isInteger(input[key]) || input[key] < minimum || input[key] > maximum)) throw new Error('DESIGN_AUDIT_PAGE_INVALID');
  }
  if (command === 'scope_design_export_png') {
    if (!input.spec.nodes.some(node => node.key === input.nodeKey)) throw new Error('DESIGN_EXPORT_NODE_INVALID');
    if (input.scale !== undefined && (typeof input.scale !== 'number' || !Number.isFinite(input.scale) || input.scale < 1 || input.scale > 4)) throw new Error('DESIGN_EXPORT_SCALE_INVALID');
  } else if (input.nodeKey !== undefined || input.scale !== undefined) throw new Error('DESIGN_EXPORT_FIELDS_INVALID');
  const payload = Object.fromEntries(['spec', 'runId', 'batchSize', 'timerUnit', 'allowGlobalResources', 'nodeKey', 'scale', 'reconcile', 'adoptNativeFlow', 'auditOffset', 'auditLimit']
    .filter(key => input[key] !== undefined).map(key => [key, input[key]]));
  if (Buffer.byteLength(JSON.stringify(payload), 'utf8') > 7 * 1024 * 1024) throw new Error('DESIGN_TRANSPORT_BUDGET_EXCEEDED: split the input into scoped design packages');
  return payload;
}
