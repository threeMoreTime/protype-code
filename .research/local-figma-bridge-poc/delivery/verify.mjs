import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { readZip, createZip } from './zip.mjs';
import { decodePng, comparePng } from './png.mjs';

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const fileKey = (value) => value && typeof value.fileKey === 'string' && value.fileKey.trim() ? value.fileKey : null;
const aggregate = (checks) => checks.some((item) => item.status === 'FAIL') ? 'FAIL' : checks.some((item) => item.status !== 'PASS') ? 'NOT_RUN' : 'PASS';
const canonical = (value) => JSON.stringify(sortObject(value));
function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortObject(value[key])]));
  return value;
}
function need(condition, reason) { if (!condition) throw new Error(reason); }

export function inspectFig(bytes) {
  const entries = readZip(bytes);
  const canvas = entries.get('canvas.fig');
  need(canvas && canvas.length > 8 && canvas.subarray(0, 8).toString('ascii') === 'fig-kiwi', 'FIG_CANVAS_MAGIC_INVALID');
  need(entries.has('meta.json') && entries.has('thumbnail.png'), 'FIG_REQUIRED_ENTRIES_MISSING');
  const meta = JSON.parse(entries.get('meta.json').toString('utf8'));
  need(meta && typeof meta === 'object' && !Array.isArray(meta), 'FIG_META_INVALID');
  const thumbnail = decodePng(entries.get('thumbnail.png'));
  return { status: 'PASS', format: 'figma-zip32', sha256: sha256(bytes), bytes: bytes.length,
    entries: [...entries.keys()], images: [...entries.keys()].filter((name) => name.startsWith('images/') && !name.endsWith('/')).length,
    thumbnail: { width: thumbnail.width, height: thumbnail.height },
    scope: 'Container, CRC, native canvas magic, metadata and thumbnail integrity only; Figma import and editability require separate live evidence.' };
}

function checkRun(record, manifest, timestampField, now) {
  need(record && typeof record === 'object' && !Array.isArray(record), 'EVIDENCE_RECORD_INVALID');
  need(record.runId === manifest.runId && record.specId === manifest.specId, 'EVIDENCE_RUN_OR_SPEC_MISMATCH');
  need(record.status === 'PASS', `EVIDENCE_NOT_PASS:${record.status ?? 'MISSING'}`);
  const timestamp = Date.parse(record[timestampField]);
  need(Number.isFinite(timestamp) && timestamp >= Date.parse(manifest.startedAt) && timestamp <= now + 300000, 'EVIDENCE_TIMESTAMP_OUTSIDE_RUN');
}

export function validateAudit(audit, manifest, now = Date.now()) {
  checkRun(audit, manifest, 'collectedAt', now);
  need(audit.schemaVersion === '1.0', 'AUDIT_SCHEMA_VERSION_UNSUPPORTED');
  need(fileKey(audit.fileIdentity), 'AUDIT_FILE_IDENTITY_MISSING');
  need(audit.scope && typeof audit.scope.rootNodeId === 'string' && typeof audit.scope.pageId === 'string', 'AUDIT_SCOPE_MISSING');
  need(audit.writes === 0 && Array.isArray(audit.errors) && audit.errors.length === 0, 'AUDIT_NOT_CLEAN_READ_ONLY');
  need(Array.isArray(audit.nodes) && audit.nodes.length > 0 && Array.isArray(audit.reactions) && Array.isArray(audit.flows), 'AUDIT_STRUCTURE_MISSING');
  need(audit.counts && audit.counts.nodes === audit.nodes.length && audit.counts.reactions === audit.reactions.length && audit.counts.flows === audit.flows.length, 'AUDIT_COUNT_MISMATCH');
  const keys = new Set(), ids = new Set();
  for (const node of audit.nodes) {
    need(node && typeof node.key === 'string' && node.key && typeof node.id === 'string' && node.id && typeof node.type === 'string' && node.type, 'AUDIT_NODE_INVALID');
    need(!keys.has(node.key) && !ids.has(node.id), 'AUDIT_DUPLICATE_NODE');
    keys.add(node.key); ids.add(node.id);
  }
  for (const node of audit.nodes) need(!node.parentKey || keys.has(node.parentKey), 'AUDIT_PARENT_NOT_FOUND');
  for (const [type, countKey] of [['TEXT', 'texts'], ['COMPONENT', 'components'], ['INSTANCE', 'instances']]) {
    need(audit.counts[countKey] === audit.nodes.filter((node) => node.type === type).length, `AUDIT_NODE_TYPE_COUNT_MISMATCH:${countKey}`);
  }
  for (const countKey of ['textStyles', 'variables']) {
    if (audit.counts[countKey] !== undefined) need(Array.isArray(audit[countKey]) && audit[countKey].length === audit.counts[countKey], `AUDIT_RESOURCE_COUNT_MISMATCH:${countKey}`);
  }
  for (const reaction of audit.reactions) {
    need(keys.has(reaction.sourceKey) && reaction.trigger && typeof reaction.trigger.type === 'string', 'AUDIT_REACTION_SOURCE_OR_TRIGGER_INVALID');
    if (reaction.destinationKey) need(keys.has(reaction.destinationKey), 'AUDIT_REACTION_DESTINATION_NOT_FOUND');
  }
  for (const flow of audit.flows) need(keys.has(flow.nodeKey ?? flow.startKey), 'AUDIT_FLOW_NODE_NOT_FOUND');
  for (const [key, expected] of Object.entries(manifest.expectedCounts ?? {})) need(audit.counts[key] === expected, `AUDIT_EXPECTED_COUNT_MISMATCH:${key}`);
  if (manifest.specSignature) need(audit.specSignature === manifest.specSignature, 'AUDIT_SPEC_SIGNATURE_MISMATCH');
  return { status: 'PASS', fileIdentity: audit.fileIdentity, scope: audit.scope, counts: audit.counts };
}

function semanticAudit(audit) {
  const nodeIds = new Map(audit.nodes.map((node) => [node.id, node.key]));
  // References to node ids are normalized to stable keys; resource properties must be semantic in the producer.
  const referenceFields = new Set(['nodeId', 'parentId', 'destinationId', 'sourceId', 'componentId', 'mainComponentId']);
  function semantic(value, field) {
    if (referenceFields.has(field) && typeof value === 'string' && nodeIds.has(value)) return { nodeKey: nodeIds.get(value) };
    if (Array.isArray(value)) return value.map((item) => semantic(item, field));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, semantic(item, key)]));
    return value;
  }
  const nodes = audit.nodes.map(({ id: _id, ...node }) => semantic(node)).sort((a, b) => canonical(a.key).localeCompare(canonical(b.key)));
  const ordered = (items) => items.map(semantic).sort((a, b) => canonical(a).localeCompare(canonical(b)));
  return { counts: audit.counts, nodes, reactions: ordered(audit.reactions), flows: ordered(audit.flows),
    fontSubstitutions: ordered(audit.fontSubstitutions ?? []),
    ...(audit.textStyles ? { textStyles: ordered(audit.textStyles) } : {}),
    ...(audit.variables ? { variables: ordered(audit.variables) } : {}) };
}

export function compareAudits(original, imported) {
  need(fileKey(original.fileIdentity) && fileKey(imported.fileIdentity) && fileKey(original.fileIdentity) !== fileKey(imported.fileIdentity), 'REIMPORT_REQUIRES_DISTINCT_FILE_IDENTITY');
  need(original.specId === imported.specId && original.runId === imported.runId, 'AUDIT_RUN_OR_SPEC_MISMATCH');
  const a = semanticAudit(original), b = semanticAudit(imported);
  const differences = Object.keys(a).filter((key) => canonical(a[key]) !== canonical(b[key]));
  for (const key of Object.keys(b)) if (!(key in a)) differences.push(key);
  return { status: differences.length ? 'FAIL' : 'PASS', differences,
    originalFingerprint: sha256(Buffer.from(canonical(a))), importedFingerprint: sha256(Buffer.from(canonical(b))),
    comparison: 'Semantic keys and properties; node ids and scope ids may change on import.' };
}

function validateManifest(manifest) {
  need(manifest?.schemaVersion === '1.0', 'DELIVERY_MANIFEST_VERSION_UNSUPPORTED');
  for (const field of ['runId', 'specId']) need(typeof manifest[field] === 'string' && manifest[field].trim(), `DELIVERY_${field}_REQUIRED`);
  need(typeof manifest.startedAt === 'string' && Number.isFinite(Date.parse(manifest.startedAt)), 'DELIVERY_STARTED_AT_REQUIRED');
  need(typeof manifest.specSignature === 'string' && /^[a-f0-9]{64}$/.test(manifest.specSignature), 'DELIVERY_SPEC_SIGNATURE_REQUIRED');
  for (const field of ['expectedVisualKeys', 'expectedPresentCases']) {
    need(Array.isArray(manifest[field]) && manifest[field].length > 0 && manifest[field].every((key) => typeof key === 'string' && key) && new Set(manifest[field]).size === manifest[field].length, `DELIVERY_${field}_REQUIRED`);
  }
  need(manifest.expectedCounts && typeof manifest.expectedCounts === 'object' && !Array.isArray(manifest.expectedCounts) && Object.keys(manifest.expectedCounts).length > 0, 'DELIVERY_EXPECTED_COUNTS_REQUIRED');
  need(Object.values(manifest.expectedCounts).every((count) => Number.isSafeInteger(count) && count >= 0), 'DELIVERY_EXPECTED_COUNTS_INVALID');
  need(!manifest.visual || Array.isArray(manifest.visual), 'DELIVERY_VISUAL_INVALID');
  need(!manifest.limitations || Array.isArray(manifest.limitations) && manifest.limitations.every((item) => typeof item === 'string'), 'DELIVERY_LIMITATIONS_INVALID');
}

/** Explicit input paths resolve from the manifest directory. Returns every check, including missing evidence. */
export async function verifyDelivery(manifest, { baseDirectory = process.cwd(), now = Date.now() } = {}) {
  validateManifest(manifest);
  need(Date.parse(manifest.startedAt) <= now + 300000, 'DELIVERY_RUN_IN_FUTURE');
  const checks = [];
  const files = new Map();
  const inputEvidence = [];
  async function load(reference, label, { json = false, hashRequired = false } = {}) {
    const target = typeof reference === 'string' ? { path: reference } : reference;
    need(target && typeof target.path === 'string' && target.path, 'EVIDENCE_PATH_REQUIRED');
    const resolved = path.resolve(baseDirectory, target.path);
    const info = await stat(resolved);
    need(info.isFile() && info.size > 0 && info.size <= (json ? 32 : 256) * 1024 * 1024, 'EVIDENCE_FILE_SIZE_INVALID');
    const bytes = await readFile(resolved);
    const digest = sha256(bytes);
    if (hashRequired || target.sha256) need(typeof target.sha256 === 'string' && target.sha256.toLowerCase() === digest, 'EVIDENCE_SHA256_MISMATCH');
    const extension = json ? '.json' : path.extname(resolved).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 12) || '.bin';
    const packagePath = `evidence/${label}${extension}`;
    need(!files.has(packagePath), 'EVIDENCE_LABEL_DUPLICATE');
    files.set(packagePath, bytes);
    inputEvidence.push({ label, packagePath, bytes: bytes.length, sha256: digest });
    return json ? JSON.parse(bytes.toString('utf8')) : bytes;
  }
  async function check(name, available, action) {
    if (!available) { checks.push({ name, status: 'NOT_RUN', reason: 'REQUIRED_EVIDENCE_MISSING' }); return null; }
    try {
      const result = await action();
      checks.push({ name, ...result });
      return result;
    } catch (error) {
      checks.push({ name, status: error.code === 'ENOENT' ? 'NOT_RUN' : 'FAIL', reason: error.code === 'ENOENT' ? 'EVIDENCE_FILE_NOT_FOUND' : error.message });
      return null;
    }
  }

  let artifactBytes, original, imported, exportRecord, reimportRecord, present;
  const format = await check('artifactFormat', manifest.artifact, async () => {
    artifactBytes = await load(manifest.artifact, 'prototype');
    return inspectFig(artifactBytes);
  });
  await check('originalAudit', manifest.originalAudit, async () => {
    original = await load(manifest.originalAudit, 'original-audit', { json: true });
    return validateAudit(original, manifest, now);
  });
  await check('reimportAudit', manifest.reimportAudit, async () => {
    imported = await load(manifest.reimportAudit, 'reimport-audit', { json: true });
    return validateAudit(imported, manifest, now);
  });
  await check('semanticRoundTrip', original && imported, async () => {
    validateAudit(original, manifest, now); validateAudit(imported, manifest, now);
    return compareAudits(original, imported);
  });
  await check('nativeExport', manifest.exportRecord && original && format?.status === 'PASS', async () => {
    exportRecord = await load(manifest.exportRecord, 'export-record', { json: true });
    checkRun(exportRecord, manifest, 'exportedAt', now);
    need(exportRecord.method === 'figma-save-local-copy', 'EXPORT_METHOD_NOT_NATIVE');
    need(fileKey(exportRecord.fileIdentity) === fileKey(original.fileIdentity), 'EXPORT_FILE_IDENTITY_MISMATCH');
    need(exportRecord.sha256 === format.sha256, 'EXPORT_ARTIFACT_HASH_MISMATCH');
    need(Date.parse(exportRecord.exportedAt) >= Date.parse(original.collectedAt), 'EXPORT_PRECEDES_AUDIT');
    need(Array.isArray(exportRecord.evidence) && exportRecord.evidence.length > 0, 'EXPORT_OBSERVATION_MISSING');
    for (let i = 0; i < exportRecord.evidence.length; i++) await load(exportRecord.evidence[i], `export-observation-${i}`, { hashRequired: true });
    return { status: 'PASS', fileIdentity: exportRecord.fileIdentity, artifactSha256: format.sha256, method: exportRecord.method };
  });
  await check('nativeReimport', manifest.reimportRecord && imported && exportRecord && format?.status === 'PASS', async () => {
    reimportRecord = await load(manifest.reimportRecord, 'reimport-record', { json: true });
    checkRun(reimportRecord, manifest, 'importedAt', now);
    need(reimportRecord.method === 'figma-import', 'REIMPORT_METHOD_INVALID');
    need(fileKey(reimportRecord.fileIdentity) === fileKey(imported.fileIdentity) && fileKey(imported.fileIdentity) !== fileKey(original.fileIdentity), 'REIMPORT_FILE_IDENTITY_INVALID');
    need(reimportRecord.sourceSha256 === format.sha256, 'REIMPORT_ARTIFACT_HASH_MISMATCH');
    need(Date.parse(reimportRecord.importedAt) >= Date.parse(exportRecord.exportedAt) && Date.parse(imported.collectedAt) >= Date.parse(reimportRecord.importedAt), 'REIMPORT_SEQUENCE_INVALID');
    need(Array.isArray(reimportRecord.evidence) && reimportRecord.evidence.length > 0, 'REIMPORT_OBSERVATION_MISSING');
    for (let i = 0; i < reimportRecord.evidence.length; i++) await load(reimportRecord.evidence[i], `reimport-observation-${i}`, { hashRequired: true });
    return { status: 'PASS', fileIdentity: imported.fileIdentity, artifactSha256: format.sha256 };
  });

  const visual = manifest.visual ?? [];
  need(new Set(visual.map((entry) => entry.key)).size === visual.length, 'VISUAL_DUPLICATE_KEY');
  for (const key of manifest.expectedVisualKeys) {
    const entry = visual.find((item) => item.key === key);
    await check(`visual:${key}`, entry && imported, async () => {
      checkRun(entry, manifest, 'capturedAt', now);
      need(fileKey(entry.fileIdentity) === fileKey(imported.fileIdentity), 'VISUAL_FILE_IDENTITY_MISMATCH');
      need(Date.parse(entry.capturedAt) >= Date.parse(imported.collectedAt), 'VISUAL_PRECEDES_REIMPORT_AUDIT');
      need(typeof entry.nodeKey === 'string' && imported.nodes.some((node) => node.key === entry.nodeKey), 'VISUAL_NODE_NOT_IN_AUDIT');
      const index = manifest.expectedVisualKeys.indexOf(key);
      const reference = await load(entry.reference, `visual-${index}-reference`, { hashRequired: true });
      const actual = await load(entry.actual, `visual-${index}-actual`, { hashRequired: true });
      need(!entry.maxChangedPixels && !entry.maxChannelDelta || typeof entry.toleranceReason === 'string' && entry.toleranceReason.trim(), 'VISUAL_TOLERANCE_REASON_REQUIRED');
      return { ...comparePng(reference, actual, entry), nodeKey: entry.nodeKey, toleranceReason: entry.toleranceReason ?? null };
    });
  }
  await check('presentPlayback', manifest.present && imported, async () => {
    present = await load(manifest.present, 'present', { json: true });
    checkRun(present, manifest, 'observedAt', now);
    need(fileKey(present.fileIdentity) === fileKey(imported.fileIdentity), 'PRESENT_FILE_IDENTITY_MISMATCH');
    need(Date.parse(present.observedAt) >= Date.parse(imported.collectedAt), 'PRESENT_PRECEDES_REIMPORT_AUDIT');
    need(present.method === 'figma-present' && Array.isArray(present.cases), 'PRESENT_RECORD_INVALID');
    need(new Set(present.cases.map((item) => item.key)).size === present.cases.length, 'PRESENT_DUPLICATE_CASE');
    const results = [];
    for (let i = 0; i < manifest.expectedPresentCases.length; i++) {
      const key = manifest.expectedPresentCases[i];
      const item = present.cases.find((candidate) => candidate.key === key);
      if (!item) { results.push({ key, status: 'NOT_RUN', reason: 'CASE_MISSING' }); continue; }
      if (item.status !== 'PASS') { results.push({ key, status: item.status === 'NOT_RUN' ? 'NOT_RUN' : 'FAIL', reason: `CASE_NOT_PASS:${item.status}` }); continue; }
      need(typeof item.observed === 'string' && item.observed.trim() && Array.isArray(item.steps) && item.steps.length > 0 && item.steps.every((step) => typeof step === 'string' && step.trim()), 'PRESENT_OBSERVATION_REQUIRED');
      need(Array.isArray(item.evidence) && item.evidence.length > 0, 'PRESENT_EVIDENCE_REQUIRED');
      for (let j = 0; j < item.evidence.length; j++) await load(item.evidence[j], `present-${i}-${j}`, { hashRequired: true });
      results.push({ key, status: 'PASS', observed: item.observed, steps: item.steps, evidenceCount: item.evidence.length });
    }
    return { status: aggregate(results), cases: results, coverage: 'Only listed representative cases. Structural reaction count does not mean every reaction was manually exercised.' };
  });
  const report = { schemaVersion: '1.0', runId: manifest.runId, specId: manifest.specId,
    specSignature: manifest.specSignature, startedAt: manifest.startedAt, verifiedAt: new Date(now).toISOString(), status: aggregate(checks),
    expectedCounts: manifest.expectedCounts, checks, inputEvidence, limitations: manifest.limitations ?? [],
    evidencePolicy: 'PASS validates submitted records, hashes and consistency. Actual native UI operations and their truth require the recorded human or automation observations; this command does not operate Figma.' };
  return { report, files, artifactBytes, manifest, records: { exportRecord, reimportRecord, present } };
}

// Keep the submitted bytes unchanged in evidence/. These additional copies only
// translate references to package-relative paths so a recipient can re-run the
// full verifier after extraction, without access to the producer's directories.
function addReplayInputs(result, entries) {
  if (result.report.status !== 'PASS') return false;
  const reference = (label) => {
    const item = result.report.inputEvidence.find((entry) => entry.label === label);
    need(item && entries.has(item.packagePath), `DELIVERY_REPLAY_EVIDENCE_MISSING:${label}`);
    return { path: item.packagePath, sha256: item.sha256 };
  };
  const recordReference = (name, record) => {
    const target = `replay/${name}.json`;
    const bytes = jsonBytes(record);
    entries.set(target, bytes);
    return { path: target, sha256: sha256(bytes) };
  };
  const exportRecord = { ...result.records.exportRecord,
    evidence: result.records.exportRecord.evidence.map((_, index) => reference(`export-observation-${index}`)) };
  const reimportRecord = { ...result.records.reimportRecord,
    evidence: result.records.reimportRecord.evidence.map((_, index) => reference(`reimport-observation-${index}`)) };
  const present = { ...result.records.present,
    cases: result.manifest.expectedPresentCases.map((key, index) => {
      const item = result.records.present.cases.find((entry) => entry.key === key);
      return { ...item, evidence: item.evidence.map((_, evidenceIndex) => reference(`present-${index}-${evidenceIndex}`)) };
    }) };
  const source = result.manifest;
  const manifest = Object.fromEntries(['schemaVersion', 'runId', 'specId', 'specSignature', 'startedAt',
    'expectedCounts', 'expectedVisualKeys', 'expectedPresentCases', 'limitations']
    .filter((key) => source[key] !== undefined).map((key) => [key, source[key]]));
  Object.assign(manifest, { artifact: reference('prototype'), originalAudit: reference('original-audit'),
    reimportAudit: reference('reimport-audit'), exportRecord: recordReference('export-record', exportRecord),
    reimportRecord: recordReference('reimport-record', reimportRecord), present: recordReference('present', present),
    visual: source.expectedVisualKeys.map((key, index) => {
      const item = source.visual.find((entry) => entry.key === key);
      return { ...item, reference: reference(`visual-${index}-reference`), actual: reference(`visual-${index}-actual`) };
    }) });
  entries.set('manifest.json', jsonBytes(manifest));
  return true;
}

export async function writeDelivery(result, outputDirectory) {
  const output = path.resolve(outputDirectory);
  await mkdir(output, { recursive: true });
  need((await readdir(output)).length === 0, 'DELIVERY_OUTPUT_MUST_BE_EMPTY');
  const entries = new Map(result.files);
  const replayable = addReplayInputs(result, entries);
  entries.set('verification.json', jsonBytes(result.report));
  const readme = [
    '# Figma delivery verification', '',
    `Status: **${result.report.status}**`, `Run: ${result.report.runId}`, `Spec: ${result.report.specId}`, '',
    'This package contains the explicitly supplied evidence. The verifier does not create a native .fig, launch Present, or perform an import.', '',
    ...result.report.checks.map((check) => `- ${check.name}: **${check.status}**${check.reason ? ` — ${check.reason}` : ''}`), '',
    'A valid .fig container is not proof of successful Figma import. Live verification additionally requires distinct source/imported file identities, same-run read-only audits, native export/import observations, pixel comparisons and Present observations.', '',
    'Semantic audit comparison allows node ids to change on import. PNG comparison decodes non-interlaced 8-bit RGB/RGBA pixels and reports unsupported formats as failures. Nonzero tolerances require a recorded reason.', '',
    ...(replayable ? ['Run the repository delivery verifier against manifest.json after extraction to repeat all checks. replay/ contains path-normalized copies of export/import/Present records; evidence/ preserves the original submitted bytes.', ''] : []),
    'See verification.json for counts, pixel differences, evidence hashes and representative playback coverage.', '',
    ...(result.report.limitations.length ? ['## Recorded limitations', '', ...result.report.limitations.map((item) => `- ${item}`), ''] : []),
    result.report.evidencePolicy, '',
  ].join('\n');
  entries.set('README.md', Buffer.from(readme));
  entries.set('SHA256SUMS', Buffer.from([...entries].map(([name, bytes]) => `${sha256(bytes)}  ${name}`).join('\n') + '\n'));
  const zip = createZip(entries);
  const readback = readZip(zip, { maxEntryBytes: 256 * 1024 * 1024, maxTotalBytes: 512 * 1024 * 1024 });
  need(readback.size === entries.size && [...entries].every(([name, bytes]) => readback.get(name)?.equals(bytes)), 'DELIVERY_ZIP_READBACK_FAILED');
  // Export all files as well as the self-contained ZIP. No existing file can be overwritten.
  for (const [name, bytes] of entries) {
    const target = path.join(output, ...name.split('/'));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes, { flag: 'wx' });
  }
  const packagePath = path.join(output, 'delivery.zip');
  await writeFile(packagePath, zip, { flag: 'wx' });
  const digest = sha256(zip);
  await writeFile(path.join(output, 'delivery.zip.sha256'), `${digest}  delivery.zip\n`, { flag: 'wx' });
  return { outputDirectory: output, packagePath, sha256: digest, entries: entries.size, status: result.report.status };
}
