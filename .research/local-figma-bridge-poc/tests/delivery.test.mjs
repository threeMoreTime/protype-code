import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { deflateSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { createZip, readZip, crc32 } from '../delivery/zip.mjs';
import { decodePng, comparePng, PNG_SIGNATURE } from '../delivery/png.mjs';
import { compareAudits, inspectFig, sha256, verifyDelivery, writeDelivery } from '../delivery/verify.mjs';

function chunk(type, bytes) {
  const data = Buffer.concat([Buffer.from(type), bytes]);
  const header = Buffer.alloc(4), footer = Buffer.alloc(4);
  header.writeUInt32BE(bytes.length); footer.writeUInt32BE(crc32(data));
  return Buffer.concat([header, data, footer]);
}
function png(pixels = [255, 0, 0, 255, 0, 255, 0, 255], filter = 0, extra = false) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(2); ihdr.writeUInt32BE(1, 4); ihdr[8] = 8; ihdr[9] = 6;
  const filtered = pixels.map((byte, index) => filter === 1 && index >= 4 ? (byte - pixels[index - 4]) & 255 : byte);
  return Buffer.concat([PNG_SIGNATURE, chunk('IHDR', ihdr), ...(extra ? [chunk('tEXt', Buffer.from('x\0different encoding'))] : []),
    chunk('IDAT', deflateSync(Buffer.from([filter, ...filtered]))), chunk('IEND', Buffer.alloc(0))]);
}
function fig() {
  // Format fixture only: deliberately not a real Figma-importable canvas.
  return createZip([['canvas.fig', Buffer.from('fig-kiwiTEST-FIXTURE')], ['meta.json', Buffer.from('{}')], ['thumbnail.png', png()]]);
}
const startedAt = '2026-01-01T00:00:00.000Z';
const now = Date.parse('2026-01-01T00:00:10.000Z');
function manifest() {
  return { schemaVersion: '1.0', runId: 'run-current', specId: 'spec-one', specSignature: 'a'.repeat(64), startedAt,
    expectedCounts: { nodes: 2, texts: 1, components: 0, instances: 0, reactions: 1, flows: 1 },
    expectedVisualKeys: ['home'], expectedPresentCases: ['open-home'] };
}
function audit(file = 'source', prefix = '1', collectedAt = '2026-01-01T00:00:01.000Z') {
  return { schemaVersion: '1.0', runId: 'run-current', specId: 'spec-one', specSignature: 'a'.repeat(64), collectedAt,
    status: 'PASS', writes: 0, errors: [], fileIdentity: { fileKey: file }, scope: { rootNodeId: `${prefix}:1`, pageId: '0:1' },
    counts: { nodes: 2, texts: 1, components: 0, instances: 0, reactions: 1, flows: 1 },
    nodes: [{ key: 'home', id: `${prefix}:1`, type: 'FRAME', name: 'Home', parentKey: null, props: { fills: [] } },
      { key: 'button', id: `${prefix}:2`, type: 'TEXT', name: 'Action', parentKey: 'home', props: { characters: '1:1' } }],
    reactions: [{ sourceKey: 'button', destinationKey: 'home', trigger: { type: 'ON_CLICK' } }], flows: [{ nodeKey: 'home', name: 'Start' }] };
}
async function fixture(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'figma-delivery-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const m = manifest();
  const image = png(), artifact = fig();
  const evidence = [{ path: 'observation.png', sha256: sha256(image) }];
  const original = audit(), imported = audit('imported', '99', '2026-01-01T00:00:04.000Z');
  const records = {
    'original.json': original, 'imported.json': imported,
    'export.json': { runId: m.runId, specId: m.specId, status: 'PASS', fileIdentity: original.fileIdentity,
      exportedAt: '2026-01-01T00:00:02.000Z', method: 'figma-save-local-copy', sha256: sha256(artifact), evidence },
    'reimport.json': { runId: m.runId, specId: m.specId, status: 'PASS', fileIdentity: imported.fileIdentity,
      importedAt: '2026-01-01T00:00:03.000Z', method: 'figma-import', sourceSha256: sha256(artifact), evidence },
    'present.json': { runId: m.runId, specId: m.specId, status: 'PASS', fileIdentity: imported.fileIdentity,
      observedAt: '2026-01-01T00:00:06.000Z', method: 'figma-present',
      cases: [{ key: 'open-home', status: 'PASS', observed: 'Home visible after click', steps: ['Click Action'], evidence }] },
  };
  for (const [name, record] of Object.entries(records)) await writeFile(path.join(directory, name), JSON.stringify(record));
  await writeFile(path.join(directory, 'observation.png'), image);
  await writeFile(path.join(directory, 'prototype.fig'), artifact);
  Object.assign(m, { artifact: 'prototype.fig', originalAudit: 'original.json', reimportAudit: 'imported.json',
    exportRecord: 'export.json', reimportRecord: 'reimport.json', present: 'present.json',
    visual: [{ key: 'home', nodeKey: 'home', runId: m.runId, specId: m.specId, status: 'PASS',
      capturedAt: '2026-01-01T00:00:05.000Z', fileIdentity: imported.fileIdentity, reference: evidence[0], actual: evidence[0] }] });
  return { directory, manifest: m, records };
}

test('ZIP verifies CRC and refuses traversal, duplicate entries and expansion limits', () => {
  assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926);
  const valid = createZip([['a.txt', Buffer.from('content')]]);
  assert.equal(readZip(valid).get('a.txt').toString(), 'content');
  assert.throws(() => createZip([['../secret', 'x']]), /UNSAFE/);
  assert.throws(() => createZip([['C:/secret', 'x']]), /UNSAFE/);
  assert.throws(() => createZip([['safe\\secret', 'x']]), /UNSAFE/);
  assert.throws(() => createZip([['a', 'x'], ['A', 'y']]), /DUPLICATE/);
  assert.throws(() => readZip(valid, { maxEntryBytes: 2 }), /SIZE_LIMIT/);
  const corrupt = Buffer.from(valid); corrupt[35] ^= 1;
  assert.throws(() => readZip(corrupt), /INTEGRITY/);
  assert.throws(() => readZip(Buffer.from('not a zip')), /MISSING/);
  const traversal = Buffer.from(createZip([['abc', 'x']]));
  for (let i = 0; i < traversal.length - 2; i++) if (traversal.toString('ascii', i, i + 3) === 'abc') traversal.write('../', i);
  assert.throws(() => readZip(traversal), /UNSAFE/);
});

test('native format inspection is distinct from proof of native import', () => {
  const inspected = inspectFig(fig());
  assert.equal(inspected.status, 'PASS');
  assert.match(inspected.scope, /require separate live evidence/);
  assert.throws(() => inspectFig(createZip([['canvas.fig', Buffer.from('bad magic')], ['meta.json', '{}'], ['thumbnail.png', png()]])), /MAGIC/);
});

test('PNG comparison decodes distinct encodings and detects actual pixel changes', () => {
  const a = png(), b = png(undefined, 1, true);
  assert.equal(a.equals(b), false);
  assert.deepEqual(decodePng(a).rgba, decodePng(b).rgba);
  assert.equal(comparePng(a, b).changedPixels, 0);
  const changed = png([254, 0, 0, 255, 0, 255, 0, 255]);
  assert.equal(comparePng(a, changed).status, 'FAIL');
  assert.deepEqual(comparePng(a, changed).bounds, { x: 0, y: 0, width: 1, height: 1 });
  assert.equal(comparePng(a, changed, { maxChannelDelta: 1 }).status, 'PASS');
  const corrupt = Buffer.from(a); corrupt[20] ^= 1;
  assert.throws(() => decodePng(corrupt), /CRC/);
});

test('semantic round trip accepts changed node ids, preserves literal text and rejects changed content', () => {
  const a = audit(), b = audit('new-file', '90');
  assert.equal(compareAudits(a, b).status, 'PASS');
  b.nodes[1].props.characters = 'different';
  assert.equal(compareAudits(a, b).status, 'FAIL');
  assert.throws(() => compareAudits(a, audit()), /DISTINCT_FILE/);
});

test('semantic comparison includes text style and variable values', () => {
  const a = audit(), b = audit('new-file', '90');
  a.textStyles = [{ key: 'body', fontSize: 16 }]; b.textStyles = [{ key: 'body', fontSize: 18 }];
  a.variables = [{ key: 'accent', value: { r: 0, g: 0, b: 1, a: 1 } }];
  b.variables = structuredClone(a.variables);
  assert.deepEqual(compareAudits(a, b).differences, ['textStyles']);
  b.textStyles = structuredClone(a.textStyles); b.variables[0].value.b = 0;
  assert.deepEqual(compareAudits(a, b).differences, ['variables']);
});

test('missing live evidence never passes even when a native-format artifact is present', async (t) => {
  const { directory, manifest: m } = await fixture(t);
  const result = await verifyDelivery({ ...manifest(), artifact: m.artifact }, { baseDirectory: directory, now });
  assert.equal(result.report.status, 'NOT_RUN');
  assert.equal(result.report.checks.find((check) => check.name === 'artifactFormat').status, 'PASS');
  assert.equal(result.report.checks.find((check) => check.name === 'nativeReimport').status, 'NOT_RUN');
});

test('complete submitted evidence validates and produces a verified self-contained ZIP', async (t) => {
  const { directory, manifest: m } = await fixture(t);
  const result = await verifyDelivery(m, { baseDirectory: directory, now });
  assert.equal(result.report.status, 'PASS', JSON.stringify(result.report.checks));
  const output = path.join(directory, 'delivery');
  const written = await writeDelivery(result, output);
  const zip = await readFile(written.packagePath);
  assert.equal(sha256(zip), written.sha256);
  const files = readZip(zip);
  assert.equal(JSON.parse(files.get('verification.json')).status, 'PASS');
  assert.match(files.get('README.md').toString(), /does not create a native/);
  for (const line of files.get('SHA256SUMS').toString().trim().split('\n')) {
    const [expected, name] = line.split('  ');
    assert.equal(sha256(files.get(name)), expected);
  }
  assert.ok((await readdir(output)).includes('delivery.zip.sha256'));
  const replayManifest = JSON.parse(files.get('manifest.json'));
  const replay = await verifyDelivery(replayManifest, { baseDirectory: output, now });
  assert.equal(replay.report.status, 'PASS', JSON.stringify(replay.report.checks));
  assert.deepEqual(replay.report.checks.map(({ name, status }) => ({ name, status })),
    result.report.checks.map(({ name, status }) => ({ name, status })));
  assert.equal(files.get('evidence/export-record.json').toString(),
    await readFile(path.join(directory, 'export.json'), 'utf8'), 'submitted evidence stays byte-identical');
  const portableReferences = JSON.stringify(replayManifest) + files.get('replay/export-record.json').toString()
    + files.get('replay/reimport-record.json').toString() + files.get('replay/present.json').toString();
  assert.equal(portableReferences.includes(directory), false);
  await assert.rejects(writeDelivery(result, output), /OUTPUT_MUST_BE_EMPTY/);
});

test('unknown outcome, stale run, missing screenshot and wrong hashes cannot become PASS', async (t) => {
  const { directory, manifest: m, records } = await fixture(t);
  records['present.json'].cases[0].status = 'OUTCOME_UNKNOWN';
  await writeFile(path.join(directory, 'present.json'), JSON.stringify(records['present.json']));
  let result = await verifyDelivery(m, { baseDirectory: directory, now });
  assert.equal(result.report.status, 'FAIL');
  records['present.json'].cases[0].status = 'PASS';
  records['present.json'].runId = 'old-run';
  await writeFile(path.join(directory, 'present.json'), JSON.stringify(records['present.json']));
  result = await verifyDelivery(m, { baseDirectory: directory, now });
  assert.equal(result.report.checks.find((check) => check.name === 'presentPlayback').reason, 'EVIDENCE_RUN_OR_SPEC_MISMATCH');
  records['present.json'].runId = m.runId;
  records['present.json'].cases[0].evidence[0] = { path: 'missing.png', sha256: '0'.repeat(64) };
  await writeFile(path.join(directory, 'present.json'), JSON.stringify(records['present.json']));
  result = await verifyDelivery(m, { baseDirectory: directory, now });
  assert.equal(result.report.checks.find((check) => check.name === 'presentPlayback').status, 'NOT_RUN');
  m.visual[0].actual = { path: 'observation.png', sha256: '0'.repeat(64) };
  result = await verifyDelivery(m, { baseDirectory: directory, now });
  assert.equal(result.report.checks.find((check) => check.name === 'visual:home').reason, 'EVIDENCE_SHA256_MISMATCH');
});

test('unapproved visual tolerance and duplicate coverage keys are rejected', async (t) => {
  const { directory, manifest: m } = await fixture(t);
  m.visual[0].maxChangedPixels = 500;
  const result = await verifyDelivery(m, { baseDirectory: directory, now });
  assert.equal(result.report.checks.find((check) => check.name === 'visual:home').reason, 'VISUAL_TOLERANCE_REASON_REQUIRED');
  m.expectedVisualKeys.push('home');
  await assert.rejects(verifyDelivery(m, { baseDirectory: directory, now }), /expectedVisualKeys_REQUIRED/);
});

test('evidence from before reimport and wrong spec signature are rejected', async (t) => {
  const { directory, manifest: m, records } = await fixture(t);
  m.visual[0].capturedAt = startedAt;
  let result = await verifyDelivery(m, { baseDirectory: directory, now });
  assert.equal(result.report.checks.find((check) => check.name === 'visual:home').reason, 'VISUAL_PRECEDES_REIMPORT_AUDIT');
  records['imported.json'].specSignature = 'b'.repeat(64);
  await writeFile(path.join(directory, 'imported.json'), JSON.stringify(records['imported.json']));
  result = await verifyDelivery(m, { baseDirectory: directory, now });
  assert.equal(result.report.checks.find((check) => check.name === 'reimportAudit').reason, 'AUDIT_SPEC_SIGNATURE_MISMATCH');
  assert.equal(result.report.status, 'FAIL');
});

test('CLI exits 2 and still delivers NOT_RUN report when evidence is absent', async (t) => {
  const { directory } = await fixture(t);
  const m = manifest();
  await writeFile(path.join(directory, 'manifest.json'), JSON.stringify(m));
  const cli = path.resolve(import.meta.dirname, '../scripts/verify-delivery.mjs');
  const run = spawnSync(process.execPath, [cli, path.join(directory, 'manifest.json'), '--out', path.join(directory, 'pending-delivery')], { encoding: 'utf8' });
  assert.equal(run.status, 2, run.stderr);
  assert.equal(JSON.parse(run.stdout).status, 'NOT_RUN');
});
