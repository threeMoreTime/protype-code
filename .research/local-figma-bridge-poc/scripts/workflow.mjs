import { readFile, writeFile, mkdir, rename, access, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';
import { spawnSync } from 'node:child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { z } from 'zod';
import { validateDesignSpec } from '../design/spec.mjs';
import { designPayload } from '../design/commands.mjs';
import { createAuditAssembler } from '../design/audit.mjs';
import { TASK_ID, WORKSPACE_ID } from '../relay/protocol.mjs';
import { designRequestTimeout, DESIGN_CLIENT_TIMEOUT_MARGIN_MS } from '../design/request-timeout.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = async file => JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
const output = value => process.stdout.write(`${JSON.stringify(value)}\n`);
async function save(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2), { encoding: 'utf8', mode: 0o600 });
  await rename(temporary, file);
}
export async function doctor() {
  const checks = [];
  checks.push({ name: 'node>=20', status: Number(process.versions.node.split('.')[0]) >= 20 ? 'PASS' : 'FAIL' });
  for (const relative of ['node_modules/@modelcontextprotocol/sdk/package.json', 'plugin/manifest.json', 'plugin/code.js', 'plugin/ui.html']) {
    try { await access(path.join(root, relative)); checks.push({ name: relative, status: 'PASS' }); }
    catch { checks.push({ name: relative, status: 'FAIL' }); }
  }
  const buildCheck = spawnSync(process.execPath, [path.join(root, 'scripts/build-plugin-code.mjs'), '--check'], {
    cwd: root, encoding: 'utf8', windowsHide: true,
  });
  checks.push({ name: 'design-runtime-current', status: buildCheck.status === 0 ? 'PASS' : 'FAIL',
    ...(buildCheck.status === 0 ? {} : { reason: (buildCheck.error?.message || buildCheck.stderr || 'Build check failed').trim().slice(0, 500) }) });
  return { status: checks.some(c => c.status === 'FAIL') ? 'FAIL' : 'PASS', checks,
    liveFigma: 'NOT_RUN', manifest: path.join(root, 'plugin/manifest.json') };
}
export function readSessionConfig(input, directory) {
  const keys = new Set(['fileIdentity', 'grantPath', 'specPath', 'runId', 'outDir', 'batchSize', 'timerUnit', 'allowGlobalResources', 'designTimeoutMs', 'auditLimit']);
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('SESSION_CONFIG_INVALID');
  for (const key of Object.keys(input)) if (!keys.has(key)) throw new Error(`SESSION_CONFIG_UNKNOWN: ${key}`);
  if (!/^figma-file:[A-Za-z0-9_-]+$/.test(input.fileIdentity || '')) throw new Error('SESSION_FILE_IDENTITY_REQUIRED');
  if (input.runId !== undefined && (typeof input.runId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(input.runId))) throw new Error('SESSION_RUN_ID_INVALID');
  const config = { ...input };
  config.designTimeoutMs = designRequestTimeout(input.designTimeoutMs);
  if (input.auditLimit !== undefined && (!Number.isInteger(input.auditLimit) || input.auditLimit < 1 || input.auditLimit > 2000)) {
    throw new Error('SESSION_AUDIT_LIMIT_INVALID: expected an integer from 1 to 2000');
  }
  for (const key of ['grantPath', 'specPath', 'outDir']) if (input[key]) config[key] = path.resolve(directory, input[key]);
  config.outDir ||= path.resolve(directory, 'evidence');
  return config;
}

export function validateSessionRequest(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) throw new Error('SESSION_REQUEST_INVALID');
  if (Object.hasOwn(request, 'adoptNativeFlow') && request.command !== 'reconcile') {
    throw new Error('SESSION_NATIVE_FLOW_ADOPTION_REQUIRES_RECONCILE');
  }
  if (Object.hasOwn(request, 'positionRecovery') &&
      (!['plan', 'reconcile'].includes(request.command) || (request.batches ?? 1) !== 1 || Object.hasOwn(request, 'adoptNativeFlow'))) {
    throw new Error('SESSION_POSITION_RECOVERY_REQUIRES_SINGLE_PLAN_OR_RECONCILE');
  }
}
const readEvidenceSchema = z.object({
  fields: z.array(z.enum(['geometry', 'vectorPaths', 'text', 'paints', 'mask', 'layout', 'component', 'children']))
    .min(1).max(8).refine(fields => new Set(fields).size === fields.length),
  readScope: z.object({ fileIdentity: z.string().min(1).max(512), pageId: z.string().regex(/^[0-9]+:[0-9]+$/),
    rootNodeId: z.string().regex(/^[0-9]+:[0-9]+$/) }).strict(),
  childOffset: z.number().int().min(0).max(25000).optional(), childLimit: z.number().int().min(1).max(1000).optional(),
  segmentOffset: z.number().int().min(0).max(25000).optional(), segmentLimit: z.number().int().min(1).max(1000).optional(),
}).strict();
export function readNodeSessionArgs(request) {
  if (typeof request.targetNodeId !== 'string' || request.targetNodeId.length > 200 || !/^(?:I)?\d+:\d+(?:;\d+:\d+)*$/.test(request.targetNodeId)) throw new Error('SESSION_NODE_ID_INVALID');
  for (const key of Object.keys(request)) if (!['command', 'targetNodeId', 'evidence'].includes(key)) throw new Error('SESSION_READ_NODE_FIELDS_INVALID');
  return { targetNodeId: request.targetNodeId, ...(Object.hasOwn(request, 'evidence') ? { evidence: readEvidenceSchema.parse(request.evidence) } : {}) };
}
// The native receipt signs canonical JSON, rather than the on-disk JSON bytes.
const canonicalReceiptJSON = value => Array.isArray(value) ? `[${value.map(canonicalReceiptJSON).join(',')}]`
  : value && typeof value === 'object' ? `{${Object.keys(value).filter(key => value[key] !== undefined).sort()
    .map(key => `${JSON.stringify(key)}:${canonicalReceiptJSON(value[key])}`).join(',')}}` : JSON.stringify(value);
const receiptSignature = value => createHash('sha256').update(canonicalReceiptJSON(value)).digest('hex');
export function validatePositionRecoveryReceipt(request, result, config, spec, plan) {
  if (!Object.hasOwn(request, 'positionRecovery')) return;
  const invalid = () => { throw new Error('POSITION_RECOVERY_RECEIPT_INVALID'); };
  const recovery = result?.positionRecovery, checkpoint = result?.checkpoint;
  const planning = request.command === 'plan';
  const expectedKeys = request.positionRecovery.nodeKeys;
  if (result?.runId !== config.runId || result.specId !== spec.id || result.specSignature !== receiptSignature(spec) ||
      !['PLANNED', 'NEEDS_RECONCILIATION', 'IN_PROGRESS', 'PARTIAL_FAILURE'].includes(result.status) ||
      planning && (!['PLANNED', 'NEEDS_RECONCILIATION'].includes(result.status) || result.writes !== 0) ||
      !checkpoint || !Number.isInteger(checkpoint.applied) || checkpoint.applied < 1 || checkpoint.applied > spec.nodes.length ||
      checkpoint.total !== spec.nodes.length || checkpoint.finalizedNodes !== 0 || checkpoint.finalized !== false ||
      recovery?.version !== 1 || !['PLANNED', 'IN_PROGRESS', 'COMPLETE'].includes(recovery.status) ||
      typeof recovery.planSignature !== 'string' || !/^[a-f0-9]{64}$/.test(recovery.planSignature) ||
      canonicalReceiptJSON(recovery.nodeKeys) !== canonicalReceiptJSON(expectedKeys) ||
      !Array.isArray(recovery.changes) || recovery.changes.length !== expectedKeys.length ||
      new Set(recovery.changes.map(change => change.id)).size !== expectedKeys.length) invalid();
  for (let index = 0; index < expectedKeys.length; index++) {
    const change = recovery.changes[index], def = spec.nodes.find(node => node.key === expectedKeys[index]);
    if (change?.key !== def?.key || def.type !== 'FRAME' || !/^\d+:\d+$/.test(change.id ?? '') ||
        !['before', 'after'].every(key => /^\d+:\d+$/.test(change[key]?.parentId ?? '') &&
          Number.isFinite(change[key]?.x) && Number.isFinite(change[key]?.y)) ||
        change.after.x !== def.x || change.after.y !== def.y) invalid();
  }
  if (!planning) {
    if (!plan || recovery.acceptedPlanSignature !== request.positionRecovery.planSignature ||
        plan.positionRecovery?.planSignature !== request.positionRecovery.planSignature ||
        canonicalReceiptJSON(recovery.changes) !== canonicalReceiptJSON(plan.positionRecovery.changes) ||
        !['applied', 'total', 'finalizedNodes', 'finalized'].every(key => checkpoint[key] === plan.checkpoint[key])) invalid();
    const checkpointed = Object.hasOwn(recovery, 'checkpointed');
    if (result.status === 'IN_PROGRESS') {
      if (recovery.status === 'COMPLETE') {
        if (checkpointed || checkpoint.pending !== null) invalid();
      } else if (recovery.status === 'IN_PROGRESS') {
        const pending = checkpoint.pending;
        if (recovery.checkpointed !== true || result.nextAction !== 'plan' || !pending ||
            typeof pending !== 'object' || Array.isArray(pending) || pending.kind !== 'position-recovery' ||
            pending.runId !== config.runId ||
            typeof pending.operationId !== 'string' || !/^op-[A-Za-z0-9_-]{8,100}$/.test(pending.operationId) ||
            !Object.keys(pending).every(key => ['kind', 'runId', 'operationId'].includes(key))) invalid();
      } else invalid();
    } else if (result.status === 'PARTIAL_FAILURE') {
      if (checkpointed || recovery.status !== 'IN_PROGRESS' || checkpoint.pending?.kind !== 'position-recovery') invalid();
    } else invalid();
  }
}
export async function loadPositionRecoveryPlan(request, config, spec) {
  if (!Object.hasOwn(request, 'positionRecovery') || request.command === 'plan') return undefined;
  const required = () => { throw new Error('POSITION_RECOVERY_PLAN_REQUIRED'); };
  const files = await readdir(config.outDir).catch(error => { if (error.code === 'ENOENT') return []; throw error; });
  const candidates = files.filter(name => name.startsWith(`${config.runId}.plan.op-`) && name.endsWith('.json'));
  if (candidates.length > 1000) required();
  const valid = [];
  for (const name of candidates) {
    let plan;
    try { plan = await json(path.join(config.outDir, name)); } catch (error) { if (error instanceof SyntaxError) continue; throw error; }
    const captured = Date.parse(plan.collectedAt ?? plan.capturedAt ?? '');
    if (!Number.isFinite(captured) || captured > Date.now() || Date.now() - captured > 5 * 60000 ||
        plan.expectedFileIdentity !== config.fileIdentity || plan.positionRecovery?.maxStagesPerRequest !== 1 ||
        plan.positionRecovery.planSignature !== request.positionRecovery.planSignature) continue;
    try { validatePositionRecoveryReceipt({ command: 'plan', positionRecovery: { nodeKeys: request.positionRecovery.nodeKeys } }, plan, config, spec); }
    catch (error) { if (error.message === 'POSITION_RECOVERY_RECEIPT_INVALID') continue; throw error; }
    valid.push({ plan, captured });
  }
  if (!valid.length) required();
  return valid.sort((a, b) => b.captured - a.captured)[0].plan;
}
export function designSessionArgs(config, request, spec, grant, operationId = `op-${randomUUID()}`) {
  validateSessionRequest(request);
  const command = request.command;
  if (!['plan', 'apply', 'audit', 'reconcile', 'export'].includes(command)) throw new Error('UNKNOWN_SESSION_COMMAND');
  const args = { expectedFileIdentity: config.fileIdentity, workspaceId: WORKSPACE_ID, taskId: TASK_ID,
    authorizationId: grant.authorizationId, revision: grant.revision, operationId,
    spec, runId: config.runId, batchSize: config.batchSize ?? 100,
    timerUnit: config.timerUnit ?? 'milliseconds', allowGlobalResources: config.allowGlobalResources ?? false,
    ...(command === 'audit' && config.auditLimit !== undefined ? { auditLimit: config.auditLimit } : {}),
    ...(command === 'reconcile' ? { reconcile: true } : {}),
    ...(Object.hasOwn(request, 'adoptNativeFlow') ? { adoptNativeFlow: request.adoptNativeFlow } : {}),
    ...(Object.hasOwn(request, 'positionRecovery') ? { positionRecovery: request.positionRecovery } : {}),
    ...(command === 'export' ? { nodeKey: request.nodeKey, scale: request.scale ?? 1 } : {}) };
  designPayload(`scope_design_${command === 'reconcile' ? 'apply' : command === 'export' ? 'export_png' : command}`, args);
  return args;
}

// One session owns one MCP child. This keeps the plugin connected between commands.
// No retries occur after timeouts: durable intent is written BEFORE each apply.
export async function session(configFile) {
  const config = readSessionConfig(await json(configFile), path.dirname(path.resolve(configFile)));
  let client;
  async function start() {
    const transport = new StdioClientTransport({ command: process.execPath,
      args: [path.join(root, 'mcp/server.mjs')], cwd: root, stderr: 'inherit',
      env: { ...process.env, LOCAL_FIGMA_BRIDGE_ALLOWED_FILE_IDENTITIES: config.fileIdentity,
        LOCAL_FIGMA_BRIDGE_DESIGN_TIMEOUT_MS: String(config.designTimeoutMs) } });
    client = new Client({ name: 'design-workflow', version: '1.0.0' });
    await client.connect(transport);
  }
  async function call(name, args = {}) {
    const timeout = name.startsWith('figma_scope_design_')
      ? config.designTimeoutMs + DESIGN_CLIENT_TIMEOUT_MARGIN_MS : 45_000;
    const result = await client.callTool({ name, arguments: args }, undefined, { timeout });
    if (result.isError) throw new Error(result.content?.find(item => item.type === 'text')?.text || 'MCP_ERROR');
    return { value: JSON.parse(result.content.find(item => item.type === 'text').text),
      image: result.content.find(item => item.type === 'image') };
  }
  await start();
  output({ event: 'ready', commands: ['status', 'document', 'read-node', 'pair', 'restart', 'plan', 'apply', 'audit', 'reconcile', 'export', 'operation', 'quit'] });
  const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
  try {
    for await (const line of lines) {
      if (!line.trim()) continue;
      try {
        const request = JSON.parse(line);
        validateSessionRequest(request);
        const command = request.command;
        if (command === 'quit') break;
        if (command === 'restart') { await client.close(); await start(); output({ event: 'restarted', note: 'Wait for plugin reconnect, then status.' }); continue; }
        if (command === 'read-node') {
          const node = (await call('figma_scope_read_node', readNodeSessionArgs(request))).value;
          const evidencePath = path.join(config.outDir, `${config.runId ?? 'session'}.read-node.${encodeURIComponent(request.targetNodeId)}.${Date.now()}.json`);
          await save(evidencePath, { collectedAt: new Date().toISOString(), expectedFileIdentity: config.fileIdentity, node });
          output({ ...node, evidencePath }); continue;
        }
        const simple = { status: 'figma_status', document: 'figma_read_document', pair: 'figma_pairing_begin', operation: 'figma_operation_status' };
        if (simple[command]) {
          output((await call(simple[command], command === 'operation' ? { operationId: request.operationId } : {})).value); continue;
        }
        if (!['plan', 'apply', 'audit', 'reconcile', 'export'].includes(command)) throw new Error('UNKNOWN_SESSION_COMMAND');
        const batches = request.batches ?? 1;
        if (!Number.isInteger(batches) || batches < 1 || batches > 500 || command !== 'apply' && batches !== 1) throw new Error('SESSION_BATCH_COUNT_INVALID');
        for (let batch = 0; batch < batches; batch++) {
        if (!config.specPath || !config.grantPath || !config.runId) throw new Error('SESSION_SPEC_GRANT_RUN_REQUIRED');
        const spec = validateDesignSpec(await json(config.specPath));
        const grant = await json(config.grantPath);
        if (grant.fileIdentity !== config.fileIdentity || grant.workspaceId !== WORKSPACE_ID || grant.taskId !== TASK_ID) throw new Error('GRANT_CONFIG_MISMATCH');
        const commandName = `scope_design_${command === 'reconcile' ? 'apply' : command === 'export' ? 'export_png' : command}`;
        const args = designSessionArgs(config, request, spec, grant);
        const recoveryPlan = await loadPositionRecoveryPlan(request, config, spec);
        const statePath = path.join(config.outDir, `${config.runId}.state.json`);
        let prior = null;
        try { prior = await json(statePath); } catch (error) { if (error.code !== 'ENOENT') throw error; }
        const digest = createHash('sha256').update(JSON.stringify(spec)).digest('hex');
        if (prior && (prior.specSha256 !== digest || prior.fileIdentity !== config.fileIdentity)) throw new Error('RUN_INPUT_CHANGED: use a new run ID and scope');
        if (command === 'apply' && prior?.status === 'OUTCOME_UNKNOWN') throw new Error('OUTCOME_UNKNOWN: audit then reconcile explicitly before another batch');
        const state = { runId: config.runId, specId: spec.id, specSha256: digest,
          fileIdentity: config.fileIdentity, startedAt: prior?.startedAt ?? new Date().toISOString(),
          operationId: args.operationId, status: 'OUTCOME_UNKNOWN' };
        if (commandName === 'scope_design_apply') await save(statePath, state);
        const result = await call(`figma_${commandName}`, args);
        validatePositionRecoveryReceipt(request, result.value, config, spec, recoveryPlan);
        if (command === 'audit') {
          const assembler = createAuditAssembler();
          let next = assembler.add(result.value);
          while (next !== null) {
            const more = await call(`figma_${commandName}`, { ...args, auditOffset: next, operationId: `op-${randomUUID()}` });
            next = assembler.add(more.value);
          }
          result.value = assembler.finish();
        }
        if (['audit', 'export'].includes(command) &&
            result.value.fileIdentity?.fileKey !== config.fileIdentity.slice('figma-file:'.length)) {
          throw new Error('EVIDENCE_FILE_IDENTITY_MISMATCH: missing or unexpected actual Figma file identity');
        }
        if (commandName === 'scope_design_apply') await save(statePath, { ...state, status: result.value.status, result: result.value });
        const reportPath = path.join(config.outDir, `${config.runId}.${command}.${args.operationId}.json`);
        await save(reportPath, { ...result.value, runId: config.runId, specId: spec.id,
          expectedFileIdentity: config.fileIdentity,
          capturedAt: new Date().toISOString() });
        if (result.image) {
          await writeFile(reportPath.replace(/\.json$/, '.png'), Buffer.from(result.image.data, 'base64'), { flag: 'wx' });
        }
        output({ ...result.value, evidencePath: reportPath });
        if (result.value.status !== 'IN_PROGRESS') break;
        }
      } catch (error) { output({ status: 'FAIL', error: error.message }); }
    }
  } finally { lines.close(); await client.close(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, file] = process.argv.slice(2);
  try {
    if (command === 'doctor') { const result = await doctor(); output(result); if (result.status !== 'PASS') process.exitCode = 1; }
    else if (command === 'session' && file) await session(path.resolve(file));
    else if (command === 'configure') {
      const target = path.resolve(file || path.join(root, '../../.local/codex-mcp.toml'));
      const quote = value => JSON.stringify(value.replaceAll('\\', '/'));
      const text = `[mcp_servers.local-figma-bridge-poc]\ncommand = ${quote(process.execPath)}\nargs = [${quote(path.join(root, 'mcp/server.mjs'))}]\ncwd = ${quote(root)}\nstartup_timeout_sec = 30\ntool_timeout_sec = 45\nenabled = true\n# Set an exact dedicated file identity before scoped operations.\n[mcp_servers.local-figma-bridge-poc.env]\nLOCAL_FIGMA_BRIDGE_ALLOWED_FILE_IDENTITIES = ""\n`;
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, text, { encoding: 'utf8', flag: 'wx' }); output({ status: 'PASS', configPath: target });
    } else throw new Error('Usage: node scripts/workflow.mjs doctor | configure [output.toml] | session <session.json>');
  } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
