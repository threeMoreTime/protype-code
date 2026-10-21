import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { readZip } from '../../.research/local-figma-bridge-poc/delivery/zip.mjs';
import { validateDesignSpec } from '../../.research/local-figma-bridge-poc/design/spec.mjs';
import { assertEvidenceData } from './design-catalog.mjs';
import { digest, validatePrototype } from './model.mjs';
import { planOutputPackages, selectOutputPackage } from './output-packages.mjs';
import { sceneProjection } from './merge.mjs';
import { getPresentationRenderContext } from './presentation-render.mjs';
import { assetReferencesForNode, validateAssetContent } from './assets.mjs';

const MiB = 1024 * 1024;
export const DELIVERY_LIMITS = Object.freeze({ deliveryBytes: 32 * MiB, logicalSpecBytes: 6.5 * MiB, requestBytes: 7 * MiB,
  imageBytes: 80 * MiB, singleImageBytes: 20 * MiB, assetCount: 2000, nodeCount: 25000, reactionCount: 30000 });
const ENVELOPE_BYTES = 512 * 1024;
const fail = code => { throw new Error(code); };
const hash = value => createHash('sha256').update(value).digest('hex');
const bytesFor = value => Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8');

function localData(value, code, maxBytes = Infinity) {
  // Renderer output may safely share a font object. Track the active path,
  // rather than all visited objects, while bounding repeated expansion too.
  const active = new WeakSet(), pending = [{ value, depth: 0 }];
  let visits = 0, stringBytes = 0;
  while (pending.length) {
    const item = pending.pop(), data = item.value;
    if (item.exit) { active.delete(data); continue; }
    if (++visits > 1000000 || item.depth > 64) fail(`${code}_DATA`);
    if (typeof data === 'string') { stringBytes += Buffer.byteLength(data); if (stringBytes > maxBytes) fail(`${code}_BUDGET`); continue; }
    if (data === null || typeof data === 'boolean' || typeof data === 'number' && Number.isFinite(data)) continue;
    if (!data || typeof data !== 'object' || active.has(data)) fail(`${code}_DATA`);
    const array = Array.isArray(data), prototype = Object.getPrototypeOf(data);
    if (array ? prototype !== Array.prototype : ![Object.prototype, null].includes(prototype)) fail(`${code}_DATA`);
    const descriptors = Object.getOwnPropertyDescriptors(data);
    if (Reflect.ownKeys(descriptors).some(key => typeof key !== 'string')) fail(`${code}_DATA`);
    active.add(data); pending.push({ value: data, exit: true });
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (array && key === 'length') continue;
      if (['__proto__', 'constructor', 'prototype'].includes(key) || descriptor.get || descriptor.set || !descriptor.enumerable || array && !/^(0|[1-9]\d*)$/.test(key)) fail(`${code}_DATA`);
      pending.push({ value: descriptor.value, depth: item.depth + 1 });
    }
  }
}

export function assertOutputPaths(filesMapOrNames) {
  const names = filesMapOrNames instanceof Map ? [...filesMapOrNames.keys()] : Array.isArray(filesMapOrNames) ? [...filesMapOrNames] : null;
  if (!names) fail('DELIVERY_PATH_INPUT');
  const folded = new Set();
  for (const name of names) {
    if (typeof name !== 'string' || !name || name.length > 2000 || !/^[A-Za-z0-9_./-]+$/.test(name) || name.startsWith('/')) fail('DELIVERY_PATH_UNSAFE');
    const parts = name.split('/');
    if (parts.some(part => !part || ['.', '..'].includes(part) || /[ .]$/.test(part) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) fail('DELIVERY_PATH_UNSAFE');
    const lower = name.toLowerCase();
    if (folded.has(lower)) fail('DELIVERY_PATH_COLLISION');
    folded.add(lower);
  }
  for (const name of folded) {
    const parts = name.split('/');
    for (let i = 1; i < parts.length; i++) if (folded.has(parts.slice(0, i).join('/'))) fail('DELIVERY_PATH_FILE_DIRECTORY_CONFLICT');
  }
  return names;
}

function limitsFor(options) {
  try { assertEvidenceData(options); } catch { fail('DELIVERY_LIMITS_DATA'); }
  if (!options || typeof options !== 'object' || Array.isArray(options) || Object.keys(options).some(key => key !== 'limits')) fail('DELIVERY_LIMITS_OPTIONS');
  const overrides = options.limits ?? {};
  if (!overrides || Array.isArray(overrides) || typeof overrides !== 'object') fail('DELIVERY_LIMITS_INVALID');
  for (const [key, value] of Object.entries(overrides)) {
    if (!Object.hasOwn(DELIVERY_LIMITS, key) || !Number.isSafeInteger(value) || value < 0 || value > DELIVERY_LIMITS[key]) fail('DELIVERY_LIMITS_INVALID');
  }
  return { ...DELIVERY_LIMITS, ...overrides };
}

function parseJSON(files, file, code) {
  if (!files.has(file)) fail(`${code}_MISSING`);
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytesFor(files.get(file)))); }
  catch { fail(`${code}_JSON`); }
}

function verifyManifest(files, manifest, archive) {
  const bound = parseJSON(files, 'manifest.json', 'DELIVERY_MANIFEST');
  if (!isDeepStrictEqual(bound, manifest) || !Array.isArray(manifest.files)) fail('DELIVERY_MANIFEST_BINDING');
  const expected = new Set([...files.keys()].filter(file => file !== archive && file !== 'manifest.json'));
  const records = manifest.files.map(record => record?.file);
  try { assertOutputPaths(records); } catch { fail('DELIVERY_MANIFEST_PATHS'); }
  if (records.length !== expected.size || records.some(file => !expected.has(file))) fail('DELIVERY_MANIFEST_COVERAGE');
  for (const record of manifest.files) {
    const content = bytesFor(files.get(record.file));
    if (!Number.isSafeInteger(record.bytes) || record.bytes !== content.length || !/^[a-f0-9]{64}$/.test(record.sha256) || record.sha256 !== hash(content)) fail('DELIVERY_MANIFEST_INTEGRITY');
  }
}

function verifyArchive(files, archive, limit) {
  if (!files.has(archive)) fail('DELIVERY_ZIP_MISSING');
  const bytes = bytesFor(files.get(archive));
  if (bytes.length > limit) fail('DELIVERY_BUDGET_ZIP');
  let entries;
  try {
    entries = readZip(bytes, { maxEntries: 10000, maxEntryBytes: limit, maxTotalBytes: limit });
    assertOutputPaths([...entries.keys()]);
  } catch (error) { fail(`DELIVERY_ZIP_INVALID:${error.message}`); }
  if (entries.size !== files.size - 1 || [...entries.keys()].some(file => file === archive || !files.has(file))) fail('DELIVERY_ZIP_COVERAGE');
  for (const [file, content] of files) if (file !== archive && (!entries.has(file) || !entries.get(file).equals(bytesFor(content)))) fail('DELIVERY_ZIP_INTEGRITY');
  return bytes.length;
}

function assetProjection(record) {
  return { key: record?.key, sha256: record?.sha256, mimeType: record?.mimeType, decodedBytes: record?.decodedBytes, file: record?.file };
}

function verifyAssets(files, spec, manifest, limits) {
  const binaries = new Map([...files].filter(([file]) => file.startsWith('assets/') || /\.(?:png|jpe?g|webp)$/i.test(file)).map(([file, value]) => [file, bytesFor(value)]));
  const byHash = new Map(), unique = new Map(), used = new Set();
  for (const [file, bytes] of binaries) {
    const sha256 = hash(bytes);
    if (byHash.has(sha256)) fail('DELIVERY_ASSET_DUPLICATE_BINARY');
    if (!bytes.length || bytes.length > limits.singleImageBytes) fail('DELIVERY_ASSET_BUDGET_SINGLE');
    byHash.set(sha256, file); unique.set(sha256, bytes.length);
  }
  const staged = (spec?.assets ?? []).filter(asset => asset.dataBase64 === undefined);
  const table = files.has('design-assets.json') ? parseJSON(files, 'design-assets.json', 'DELIVERY_ASSET_MANIFEST') : null;
  if (staged.length && !table || table && (!Array.isArray(table.assets) || spec && table.specId !== spec.id)) fail('DELIVERY_ASSET_MANIFEST_BINDING');
  const records = table?.assets ?? [];
  const keys = new Set();
  for (const record of records) {
    if (!record || typeof record !== 'object' || keys.has(record.key)) fail('DELIVERY_ASSET_MANIFEST_DUPLICATE');
    keys.add(record.key);
    try { assertOutputPaths([record.file]); } catch { fail('DELIVERY_ASSET_PATH'); }
    const bytes = binaries.get(record.file);
    if (!bytes || !/^[a-f0-9]{64}$/.test(record.sha256) || hash(bytes) !== record.sha256 || record.decodedBytes !== bytes.length || !['image/png', 'image/jpeg', 'image/webp'].includes(record.mimeType)) fail('DELIVERY_ASSET_INTEGRITY');
    used.add(record.file);
  }
  if (records.length !== staged.length) fail('DELIVERY_ASSET_SPEC_COVERAGE');
  for (const asset of staged) {
    const record = records.find(value => value.key === asset.key);
    if (!record || !isDeepStrictEqual(assetProjection(record), { ...assetProjection(asset), file: record.file })) fail('DELIVERY_ASSET_SPEC_BINDING');
  }
  if (manifest.assets !== undefined && (!Array.isArray(manifest.assets) || !isDeepStrictEqual(manifest.assets.map(assetProjection).sort((a, b) => String(a.key).localeCompare(String(b.key))), records.map(assetProjection).sort((a, b) => String(a.key).localeCompare(String(b.key)))))) fail('DELIVERY_ASSET_MANIFEST_BINDING');
  if ([...binaries.keys()].some(file => !used.has(file))) fail('DELIVERY_ASSET_UNREFERENCED');
  for (const asset of spec?.assets ?? []) if (asset.dataBase64 !== undefined) {
    const bytes = Buffer.from(asset.dataBase64, 'base64');
    if (bytes.length > limits.singleImageBytes) fail('DELIVERY_ASSET_BUDGET_SINGLE');
    unique.set(hash(bytes), bytes.length);
  }
  const imageBytes = [...unique.values()].reduce((sum, value) => sum + value, 0), uniqueAssetCount = unique.size, assetCount = (spec?.assets ?? []).length;
  if (imageBytes > limits.imageBytes || assetCount > limits.assetCount || uniqueAssetCount > limits.assetCount) fail('DELIVERY_ASSET_BUDGET_TOTAL');
  return { imageBytes, assetCount, uniqueAssetCount };
}

function verifyProductBindings(files, spec, manifest, artifact) {
  const input = files.has('prototype.json') ? parseJSON(files, 'prototype.json', 'DELIVERY_SCENE_MODEL') : artifact.model;
  const scenarioIndex = files.has('scenario-manifest.json') ? parseJSON(files, 'scenario-manifest.json', 'DELIVERY_SCENE_INDEX') : null;
  const product = input?.schemaVersion === '1.1' || artifact.model?.schemaVersion === '1.1' || manifest.scenes !== undefined
    || manifest.modelRevision !== undefined || scenarioIndex?.schemaVersion === '1.1';
  if (manifest.kind === 'PLAN_ONLY') {
    if (spec != null || [...files.keys()].some(file => /\.html$/i.test(file) || file.startsWith('scenes/') || ['design-spec.json', 'design-assets.json', 'node-map.json'].includes(file))
      || !Array.isArray(manifest.scenes) || manifest.scenes.length || manifest.figma !== undefined) fail('DELIVERY_PLAN_ONLY_GENERATED_FILES');
    let plannedModel;
    try { plannedModel = validatePrototype(input); } catch (error) { fail(`DELIVERY_PLAN_ONLY_MODEL:${error.message}`); }
    if (plannedModel.schemaVersion !== '1.1' || !scenarioIndex || !Array.isArray(scenarioIndex.scenarios)
      || !sameIds(scenarioIndex.scenarios.map(scene => scene.sceneId), plannedModel.presentation.scenes.map(scene => scene.id))
      || scenarioIndex.scenarios.some(scene => scene.status !== 'UNRESOLVED' || typeof scene.reason !== 'string' || !scene.reason.trim())) fail('DELIVERY_PLAN_ONLY_SCENARIOS');
    if (manifest.modelRevision !== digest(plannedModel) || manifest.revision !== digest(plannedModel)) fail('DELIVERY_PLAN_ONLY_REVISION');
    return false;
  }
  if (product && spec?.schemaVersion !== '1.1') fail('DELIVERY_SCENE_SPEC_REQUIRED');
  if (spec?.schemaVersion !== '1.1') return false;
  if (!input) {
    if (manifest.scenes !== undefined || spec.source?.sceneIds !== undefined) fail('DELIVERY_SCENE_MODEL_REQUIRED');
    return false;
  }
  let model;
  try { model = validatePrototype(input); } catch (error) { fail(`DELIVERY_SCENE_MODEL:${error.message}`); }
  if (model.schemaVersion !== '1.1' || artifact.model && digest(validatePrototype(artifact.model)) !== digest(model)) fail('DELIVERY_SCENE_MODEL_BINDING');
  const revision = digest(model);
  if (manifest.modelRevision !== revision || manifest.revision !== revision || spec.source?.modelRevision !== revision || spec.source?.revision !== revision) fail('DELIVERY_SCENE_REVISION');
  const scenes = model.presentation.scenes;
  if (!Array.isArray(manifest.scenes) || !sameIds(manifest.scenes.map(scene => scene.sceneId), scenes.map(scene => scene.id))
    || !sameIds(spec.source?.sceneIds, scenes.map(scene => scene.id))) fail('DELIVERY_SCENE_COVERAGE');
  const definitions = new Map(model.assets.map(asset => [asset.id, asset])), used = new Set(model.presentation.nodes.flatMap(assetReferencesForNode));
  const expectedHashes = new Set([...used].map(id => definitions.get(id).sha256));
  if (!sameIds(spec.assets.map(asset => asset.sha256), [...expectedHashes])) fail('DELIVERY_ASSET_MODEL_REFERENCES');
  const table = parseJSON(files, 'design-assets.json', 'DELIVERY_ASSET_MODEL'), byHash = new Map(table.assets.map(record => [record.sha256, record])), byId = new Map();
  for (const id of used) {
    const definition = definitions.get(id), record = byHash.get(definition.sha256);
    if (!record || record.mimeType !== definition.mimeType || record.decodedBytes !== definition.bytes || !files.has(record.file)) fail('DELIVERY_ASSET_MODEL_BINDING');
    const bytes = bytesFor(files.get(record.file));
    try { validateAssetContent(bytes, definition); } catch (error) { fail(`DELIVERY_ASSET_MODEL_CONTENT:${error.message}`); }
    byId.set(id, { bytes });
  }
  const assetIndex = parseJSON(files, 'asset-manifest.json', 'DELIVERY_ASSET_MODEL'), expectedAssets = planOutputPackages(model).assetManifest;
  if (!Array.isArray(assetIndex.assets) || !sameIds(assetIndex.assets.map(asset => asset.id), expectedAssets.map(asset => asset.id))) fail('DELIVERY_ASSET_MODEL_INDEX');
  for (const expected of expectedAssets) {
    const actual = assetIndex.assets.find(asset => asset.id === expected.id), file = byHash.get(expected.sha256)?.file;
    if (['id', 'sha256', 'mimeType', 'bytes', 'path'].some(key => actual[key] !== expected[key]) || !sameIds(actual.sceneIds, expected.sceneIds)
      || expected.sceneIds.length && (actual.file !== file || actual.verification !== 'CONTENT_VERIFIED')) fail('DELIVERY_ASSET_MODEL_INDEX');
  }
  let context;
  try { context = getPresentationRenderContext(model, { resolvedAssets: { byId } }); }
  catch (error) { fail(`DELIVERY_SCENE_CONTEXT:${error.message}`); }
  const roots = new Map(context.renderScenes.map(scene => [scene.id, scene.root])), nativeNodes = new Map(spec.nodes.map(node => [node.key, node]));
  if (!scenarioIndex || !Array.isArray(scenarioIndex.scenarios) || !sameIds(scenarioIndex.scenarios.map(scene => scene.sceneId), scenes.map(scene => scene.id))) fail('DELIVERY_SCENE_INDEX');
  const paths = [];
  for (const record of manifest.scenes) {
    try { assertOutputPaths([record.file]); } catch { fail('DELIVERY_SCENE_PATH'); }
    paths.push(record.file);
    const scene = scenes.find(value => value.id === record.sceneId), projection = parseJSON(files, record.file, 'DELIVERY_SCENE_FILE');
    if (!/^[a-f0-9]{64}$/.test(record.contentHash) || digest(projection) !== record.contentHash) fail('DELIVERY_SCENE_HASH');
    if (['pageId', 'stateId', 'sourceBoardId'].some(key => record[key] !== scene[key])) fail('DELIVERY_SCENE_IDENTITY');
    const { root, ...metadata } = projection, expected = { ...sceneProjection(model, scene.id), sceneId: scene.id, viewport: scene.viewport };
    if (!isDeepStrictEqual(metadata, expected) || !isDeepStrictEqual(root, roots.get(scene.id))) fail('DELIVERY_SCENE_PROJECTION');
    const nodeKey = spec.source?.sceneRoots?.[scene.id], nativeRoot = nativeNodes.get(nodeKey);
    if (record.nodeKey !== nodeKey || nativeRoot?.type !== 'FRAME' || nativeRoot.parentKey !== null || nativeRoot.width !== scene.viewport.width || nativeRoot.height !== scene.viewport.height) fail('DELIVERY_SCENE_NATIVE_ROOT');
    const indexed = scenarioIndex.scenarios.find(value => value.sceneId === scene.id);
    if (indexed.status !== 'GENERATED' || Object.entries(record).some(([key, value]) => !isDeepStrictEqual(indexed[key], value))
      || indexed.source && ['pageId', 'sourceBoardId'].some(key => indexed.source[key] !== scene[key]) || indexed.source && indexed.source.sceneId !== scene.id) fail('DELIVERY_SCENE_INDEX');
  }
  try { assertOutputPaths(paths); } catch { fail('DELIVERY_SCENE_PATH'); }
  return true;
}

// This verifies local artifacts and a conservative envelope allowance. It never
// sends a bridge request or substitutes local evidence for native acceptance.
export function verifyOutputPackage(artifact, options = {}) {
  const limits = limitsFor(options), files = artifact?.files;
  if (!(files instanceof Map) || files.size > 10000) fail('DELIVERY_FILES_INPUT');
  assertOutputPaths(files);
  for (const content of files.values()) if (!Buffer.isBuffer(content) && (typeof content !== 'string' || !content.isWellFormed())) fail('DELIVERY_FILE_CONTENT');
  const manifest = artifact.manifest;
  localData(manifest, 'DELIVERY_MANIFEST', limits.deliveryBytes);
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) fail('DELIVERY_MANIFEST_INPUT');
  const archive = manifest.archive;
  try { assertOutputPaths([archive]); } catch { fail('DELIVERY_MANIFEST_ARCHIVE'); }
  if (archive === 'manifest.json') fail('DELIVERY_MANIFEST_ARCHIVE');
  const unpackedBytes = [...files].filter(([file]) => file !== archive).reduce((sum, [, content]) => sum + bytesFor(content).length, 0);
  if (unpackedBytes > limits.deliveryBytes) fail('DELIVERY_BUDGET_UNPACKED');
  verifyManifest(files, manifest, archive);
  let spec = artifact.spec;
  if (spec == null && files.has('design-spec.json')) spec = parseJSON(files, 'design-spec.json', 'DELIVERY_SPEC');
  let logicalSpecBytes = 0, estimatedRequestBytes = 0, nodeCount = 0, reactionCount = 0;
  if (spec != null) {
    localData(spec, 'DELIVERY_SPEC', limits.logicalSpecBytes);
    logicalSpecBytes = Buffer.byteLength(JSON.stringify(spec));
    if (logicalSpecBytes > limits.logicalSpecBytes) fail('DELIVERY_SPEC_BUDGET');
    estimatedRequestBytes = logicalSpecBytes + ENVELOPE_BYTES;
    if (estimatedRequestBytes > limits.requestBytes) fail('DELIVERY_REQUEST_BUDGET');
    if (!isDeepStrictEqual(parseJSON(files, 'design-spec.json', 'DELIVERY_SPEC'), spec)) fail('DELIVERY_SPEC_BINDING');
    nodeCount = spec.nodes?.length ?? 0; reactionCount = spec.reactions?.length ?? 0;
    if (nodeCount > limits.nodeCount || reactionCount > limits.reactionCount) fail('DELIVERY_SPEC_COUNT_BUDGET');
    try { validateDesignSpec(spec); } catch (error) { fail(`DELIVERY_SPEC_INVALID:${error.message}`); }
  }
  const assets = verifyAssets(files, spec, manifest, limits), productBindings = verifyProductBindings(files, spec, manifest, artifact), zipBytes = verifyArchive(files, archive, limits.deliveryBytes);
  return { status: 'PASS', budget: { unpackedBytes, zipBytes, logicalSpecBytes, estimatedRequestBytes,
    envelopeBytes: spec == null ? 0 : ENVELOPE_BYTES, ...assets, nodeCount, reactionCount, limits },
  checks: { paths: 'PASS', manifest: 'PASS', archive: 'PASS', assets: productBindings ? 'PASS' : 'TRANSPORT_INTEGRITY_ONLY', scenes: productBindings ? 'PASS' : 'NOT_APPLICABLE', spec: spec == null ? 'NOT_APPLICABLE' : 'PASS', transport: spec == null ? 'NOT_APPLICABLE' : 'BOUNDED_ESTIMATE_NOT_SENT' } };
}

const COLLECTION_BYTES = 128 * MiB;
const sameIds = (actual, expected) => Array.isArray(actual) && actual.every(id => typeof id === 'string') && new Set(actual).size === actual.length
  && isDeepStrictEqual([...actual].sort(), [...expected].sort());

function collectionModel(files, file) {
  try {
    const model = validatePrototype(parseJSON(files, file, 'DELIVERY_COLLECTION_BASELINE'));
    if (model.schemaVersion !== '1.1') fail('DELIVERY_COLLECTION_BASELINE_VERSION');
    return model;
  } catch (error) { fail(`DELIVERY_COLLECTION_BASELINE:${error.message}`); }
}

/** Verify an index of complete packages without an aggregate archive or render. */
export function verifyOutputCollection(artifact) {
  const files = artifact?.files, manifest = artifact?.manifest;
  if (!(files instanceof Map) || files.size > 10000) fail('DELIVERY_COLLECTION_FILES');
  assertOutputPaths(files);
  for (const content of files.values()) if (!Buffer.isBuffer(content) && (typeof content !== 'string' || !content.isWellFormed())) fail('DELIVERY_COLLECTION_FILE_CONTENT');
  localData(manifest, 'DELIVERY_COLLECTION_MANIFEST', COLLECTION_BYTES);
  if (manifest?.kind !== 'PACKAGE_COLLECTION' || manifest.archive !== null) fail('DELIVERY_COLLECTION_KIND');
  const stagingLimitBytes = manifest.stagingLimitBytes;
  if (!Number.isSafeInteger(stagingLimitBytes) || stagingLimitBytes < 1 || stagingLimitBytes > COLLECTION_BYTES) fail('DELIVERY_COLLECTION_LIMIT');
  const stagingBytes = [...files.values()].reduce((sum, value) => sum + bytesFor(value).length, 0);
  if (stagingBytes > stagingLimitBytes) fail('DELIVERY_COLLECTION_BUDGET');
  try { verifyManifest(files, manifest, null); } catch (error) { fail(`DELIVERY_COLLECTION_MANIFEST:${error.message}`); }
  const model = collectionModel(files, 'prototype.json'), generated = collectionModel(files, 'generated.json');
  const modelRevision = digest(model), generatedRevision = digest(generated);
  if (model.id !== generated.id || manifest.projectId !== model.id || manifest.modelRevision !== modelRevision || manifest.revision !== modelRevision
    || artifact.model && digest(validatePrototype(artifact.model)) !== modelRevision) fail('DELIVERY_COLLECTION_BASELINE_BINDING');
  const planned = planOutputPackages(model), expected = new Map(planned.packages.map(record => [record.id, record]));
  const storedPlan = parseJSON(files, 'output-packages.json', 'DELIVERY_COLLECTION_PLAN');
  if (storedPlan.modelRevision !== modelRevision) fail('DELIVERY_COLLECTION_BASELINE_PLAN');
  const limits = limitsFor({ limits: storedPlan.limits });
  if (!Array.isArray(manifest.packages) || manifest.packages.length !== expected.size || !Array.isArray(manifest.scenes)
    || !sameIds(manifest.scenes.map(scene => scene.sceneId), model.presentation.scenes.map(scene => scene.id))) fail('DELIVERY_COLLECTION_SCENES');
  if (files.has('scenario-manifest.json') && !isDeepStrictEqual(parseJSON(files, 'scenario-manifest.json', 'DELIVERY_COLLECTION_SCENARIOS').scenarios, manifest.scenes)) fail('DELIVERY_COLLECTION_SCENARIOS');
  if (files.has('changes.json')) {
    const changes = parseJSON(files, 'changes.json', 'DELIVERY_COLLECTION_BASELINE');
    if (changes.revisions?.generated !== undefined && changes.revisions.generated !== generatedRevision) fail('DELIVERY_COLLECTION_BASELINE_GENERATED');
  }
  const packageIds = new Set(), sceneIds = new Set(), archives = new Set(), results = [];
  let generatedPackages = 0, blockedPackages = 0;
  for (const record of manifest.packages) {
    if (!record || typeof record.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,159}$/.test(record.id) || packageIds.has(record.id.toLowerCase())) fail('DELIVERY_COLLECTION_PACKAGE_ID');
    packageIds.add(record.id.toLowerCase());
    const closure = expected.get(record.id), prefix = `packages/${record.id}/`;
    if (!closure || !sameIds(record.sceneIds, closure.sceneIds) || !sameIds(record.actionIds, closure.actionIds) || !sameIds(record.flowIds, closure.flowIds)
      || !record.minimumConnectedClosure || !sameIds(record.minimumConnectedClosure.sceneIds, closure.sceneIds)
      || !sameIds(record.minimumConnectedClosure.actionIds, closure.actionIds) || !sameIds(record.minimumConnectedClosure.flowIds, closure.flowIds)) fail('DELIVERY_COLLECTION_CLOSURE');
    for (const id of record.sceneIds) { if (sceneIds.has(id)) fail('DELIVERY_COLLECTION_SCENE_OVERLAP'); sceneIds.add(id); }
    const scenarios = manifest.scenes.filter(scene => record.sceneIds.includes(scene.sceneId));
    if (scenarios.some(scene => scene.packageId !== record.id)) fail('DELIVERY_COLLECTION_SCENE_PACKAGE');
    const leafFiles = new Map([...files].filter(([file]) => file.startsWith(prefix)).map(([file, value]) => [file.slice(prefix.length), value]));
    if (record.status === 'BLOCKED') {
      if (leafFiles.size || !Array.isArray(record.blockers) || !record.blockers.length || record.blockers.some(blocker => !blocker || ![blocker.reason, blocker.code].some(value => typeof value === 'string' && value.trim()))
        || scenarios.some(scene => scene.status !== 'UNRESOLVED' || typeof scene.reason !== 'string' || !scene.reason.trim())) fail('DELIVERY_COLLECTION_BLOCKED');
      blockedPackages++; results.push({ id: record.id, status: 'BLOCKED', closure: 'PASS' }); continue;
    }
    if (record.status !== 'GENERATED') fail('DELIVERY_COLLECTION_PACKAGE_STATUS');
    const archive = `${prefix}prototype.zip`, archiveBytes = files.get(archive);
    if (record.archive !== archive || !archiveBytes || record.sha256 !== hash(bytesFor(archiveBytes)) || record.bytes !== bytesFor(archiveBytes).length) fail('DELIVERY_COLLECTION_ARCHIVE');
    archives.add(archive);
    const leafManifest = parseJSON(leafFiles, 'manifest.json', 'DELIVERY_COLLECTION_LEAF');
    const leafModel = collectionModel(leafFiles, 'prototype.json'), leafGenerated = collectionModel(leafFiles, 'generated.json');
    const leafRevision = digest(leafModel), selected = selectOutputPackage(model, record.id);
    if (digest(selected) !== leafRevision || digest(leafGenerated) !== leafRevision || leafManifest.modelRevision !== leafRevision
      || leafManifest.revision !== leafRevision || !sameIds(leafManifest.scenes?.map(scene => scene.sceneId), record.sceneIds)) fail('DELIVERY_COLLECTION_LEAF_CLOSURE');
    const lineage = { incrementalScope: 'COLLECTION_ROOT', modelRevision, generatedRevision, partitionInputRevision: leafRevision };
    if (leafManifest.generatedRole !== 'PARTITION_INPUT' || !isDeepStrictEqual(leafManifest.lineage, lineage)) fail('DELIVERY_COLLECTION_LINEAGE');
    const leafSpec = parseJSON(leafFiles, 'design-spec.json', 'DELIVERY_COLLECTION_LEAF');
    if (!sameIds(leafSpec.source?.sceneIds, record.sceneIds)) fail('DELIVERY_COLLECTION_LEAF_SCENES');
    if (leafSpec.source?.modelRevision !== leafRevision || leafSpec.source?.revision !== leafRevision || leafManifest.figma?.specId !== leafSpec.id) fail('DELIVERY_COLLECTION_LEAF_REVISION');
    for (const scene of leafManifest.scenes) {
      const scenario = scenarios.find(value => value.sceneId === scene.sceneId);
      if (scenario.status !== 'GENERATED' || Object.entries(scene).some(([key, value]) => !isDeepStrictEqual(scenario[key], key === 'file' ? prefix + value : value))) fail('DELIVERY_COLLECTION_SCENE_BINDING');
    }
    const verification = verifyOutputPackage({ model: leafModel, spec: leafSpec, manifest: leafManifest, files: leafFiles }, { limits });
    generatedPackages++; results.push({ id: record.id, status: 'PASS', verification });
  }
  for (const file of files.keys()) {
    if (/\.zip$/i.test(file) && !archives.has(file)) fail('DELIVERY_COLLECTION_ARCHIVE');
    if (file.startsWith('packages/') && !manifest.packages.some(record => file.startsWith(`packages/${record.id}/`))) fail('DELIVERY_COLLECTION_ORPHAN_PACKAGE');
  }
  return { status: 'PASS', budget: { stagingBytes, stagingLimitBytes, generatedPackages, blockedPackages },
    checks: { paths: 'PASS', manifest: 'PASS', packages: 'PASS', closures: 'PASS', lineage: 'PASS' }, packages: results };
}
