import { constants } from 'node:fs';
import { lstat, realpath, open } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { digest, stableId, validatePrototype } from '../core/model.mjs';
import { DesignCatalogSchema, designEvidenceId as id, assertEvidenceData, evidenceRecordMap, assertEvidenceAcyclic, validateDesignCatalog } from '../core/design-catalog.mjs';

export const FIGMA_EVIDENCE_LIMITS = Object.freeze({ inputBytes: 10 * 1024 * 1024, nodes: 25000, components: 25000, interactions: 30000, assets: 2000 });
const hash = z.string().regex(/^[0-9a-f]{64}$/);
const text = z.string().max(65536);
const resolved = z.object({ status: z.literal('RESOLVED'), nodeId: id }).strict();
const unresolved = z.object({ status: z.literal('UNRESOLVED'), rawTarget: z.string().min(1).max(1000) }).strict();
const target = z.discriminatedUnion('status', [resolved, unresolved]);
const geometry = z.object({ x: z.number().finite().min(-1e7).max(1e7), y: z.number().finite().min(-1e7).max(1e7), width: z.number().finite().min(0).max(1e6), height: z.number().finite().min(0).max(1e6) }).strict();
const node = z.object({
  id, sourceNodeId: id, pageId: id, parentId: id.nullable(), name: z.string().max(4000),
  type: z.enum(['FRAME', 'TEXT', 'INSTANCE', 'SYMBOL', 'COMPONENT', 'COMPONENT_SET', 'VECTOR', 'ROUNDED_RECTANGLE', 'RECTANGLE', 'ELLIPSE', 'BOOLEAN_OPERATION', 'REGULAR_POLYGON', 'VARIABLE', 'VARIABLE_SET', 'SECTION', 'LINE']),
  text: text.optional(), visible: z.boolean().optional(), opacity: z.number().min(0).max(1).optional(), geometry: geometry.optional(),
  readback: z.object({ source: z.literal('PluginAPI'), readVersion: z.literal('scope-evidence-1.0'), fileIdentity: z.string().min(1).max(256), sha256: hash, complete: z.boolean() }).strict().optional(),
}).strict();
const component = z.discriminatedUnion('kind', [
  z.object({ id, kind: z.literal('state-group'), nodeId: id, memberNodeIds: z.array(id).max(5000) }).strict(),
  z.object({ id, kind: z.literal('component'), nodeId: id, stateGroupId: id.optional(), variantValues: z.array(z.object({ name: z.string().min(1).max(200), value: z.string().max(1000) }).strict()).max(100).default([]) }).strict(),
  z.object({ id, kind: z.literal('instance'), nodeId: id, master: target }).strict(),
]);
const interaction = z.object({
  id, kind: z.enum(['native', 'override', 'annotation', 'inferred']), scope: z.enum(['component', 'business', 'unresolved']), nodeId: id,
  nativeInteractionId: id.optional(), recordPath: z.string().max(1000).optional(),
  event: z.enum(['ON_CLICK', 'ON_HOVER', 'ON_PRESS', 'MOUSE_ENTER', 'MOUSE_LEAVE', 'MOUSE_OUT', 'AFTER_TIMEOUT', 'UNKNOWN']).optional(),
  effect: z.enum(['SWAP_STATE', 'CHANGE_TO', 'NAVIGATE', 'URL', 'SCROLL_TO', 'UNKNOWN']).optional(),
  delayMs: z.number().finite().min(0).max(3600000).optional(),
  target: target.optional(), deleted: z.boolean().optional(), text: text.optional(),
}).strict();
function safeAssetPath(value) {
  return !/[\\:\x00-\x1f]/.test(value) && !value.startsWith('/') && value.split('/').every(part => part && part !== '.' && part !== '..' && !/[. ]$/.test(part));
}
const asset = z.object({ id, sourceAssetKey: id, path: z.string().min(1).max(1000).refine(safeAssetPath, 'Unsafe asset path'), sha256: hash,
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']), bytes: z.number().int().positive().max(20 * 1024 * 1024),
  width: z.number().int().positive().max(100000), height: z.number().int().positive().max(100000),
}).strict();
const diagnostic = z.object({ code: z.string().regex(/^[A-Z][A-Z0-9_]{0,79}$/), severity: z.enum(['info', 'warning', 'error']),
  message: z.string().min(1).max(4000), evidenceId: id.optional(), status: z.enum(['NOT_VERIFIED', 'UNRESOLVED']).optional(),
}).strict();
export const DesignEvidenceSchema = z.object({
  schemaVersion: z.literal('DesignEvidence1.0'), sourceHash: hash,
  source: z.object({ kind: z.enum(['figma-export', 'figma-plugin', 'manual']), fileKey: id, name: z.string().min(1).max(512), capturedAt: z.string().datetime({ offset: true }), revision: z.string().max(256).optional() }).strict(),
  catalog: DesignCatalogSchema, nodeEvidence: z.array(node).max(FIGMA_EVIDENCE_LIMITS.nodes),
  componentEvidence: z.array(component).max(FIGMA_EVIDENCE_LIMITS.components),
  interactionEvidence: z.array(interaction).max(FIGMA_EVIDENCE_LIMITS.interactions),
  assetIndex: z.array(asset).max(FIGMA_EVIDENCE_LIMITS.assets), diagnostics: z.array(diagnostic).max(10000).default([]),
}).strict();

function validateEvidence(input) {
  assertEvidenceData(input);
  const parsed = DesignEvidenceSchema.safeParse(input);
  if (!parsed.success) throw new Error(`EVIDENCE_SCHEMA: ${parsed.error.issues.slice(0, 5).map(issue => `${issue.path.join('.')}: ${issue.code}`).join('; ')}`);
  const data = parsed.data;
  data.catalog = validateDesignCatalog(data.catalog);
  const pages = new Map(data.catalog.pages.map(page => [page.id, page]));
  const catalog = new Map(data.catalog.entries.map(entry => [entry.id, entry]));
  const catalogBySource = new Map(data.catalog.entries.map(entry => [entry.sourceNodeId, entry]));
  const pageSources = new Set(data.catalog.pages.map(page => page.sourceNodeId));
  const nodes = evidenceRecordMap(data.nodeEvidence, 'node evidence');
  evidenceRecordMap(data.nodeEvidence, 'node source IDs', 'sourceNodeId');
  const edges = new Map(data.nodeEvidence.map(n => [n.id, []]));
  const parentEdges = new Map();
  const requireNode = nodeId => { if (!nodes.has(nodeId)) throw new Error('EVIDENCE_NODE_REFERENCE'); return nodes.get(nodeId); };
  for (const n of data.nodeEvidence) {
    if (pages.has(n.id) || pageSources.has(n.sourceNodeId)) throw new Error('EVIDENCE_DUPLICATE: page/node identity');
    if (!pages.has(n.pageId)) throw new Error('EVIDENCE_NODE_PAGE');
    if (n.parentId === n.pageId) n.parentId = null;
    if (n.parentId !== null) {
      const parent = requireNode(n.parentId);
      if (parent.pageId !== n.pageId) throw new Error('EVIDENCE_NODE_PAGE_MISMATCH');
      edges.get(parent.id).push(n.id);
    }
    parentEdges.set(n.id, n.parentId === null ? [] : [n.parentId]);
    const entry = catalog.get(n.id);
    if (entry && (entry.sourceNodeId !== n.sourceNodeId || entry.pageId !== n.pageId || entry.parentId !== n.parentId)) throw new Error('EVIDENCE_CATALOG_NODE_MISMATCH');
    const sourceEntry = catalogBySource.get(n.sourceNodeId);
    if (sourceEntry && sourceEntry.id !== n.id) throw new Error('EVIDENCE_SOURCE_IDENTITY');
  }
  assertEvidenceAcyclic(parentEdges, 'node parent');
  evidenceRecordMap(data.componentEvidence, 'component evidence');
  evidenceRecordMap(data.componentEvidence, 'component evidence owner', 'nodeId');
  const groups = new Map(data.componentEvidence.filter(item => item.kind === 'state-group').map(group => [group.nodeId, group]));
  const diagnosticKeys = new Set(data.diagnostics.map(value => `${value.code}\0${value.evidenceId ?? ''}`));
  const addDiagnostic = value => {
    const key = `${value.code}\0${value.evidenceId ?? ''}`;
    if (diagnosticKeys.has(key)) return;
    if (data.diagnostics.length >= 10000) throw new Error('EVIDENCE_DIAGNOSTIC_LIMIT');
    diagnosticKeys.add(key); data.diagnostics.push(value);
  };
  for (const item of data.componentEvidence) {
    const n = requireNode(item.nodeId);
    if (item.kind === 'state-group') {
      if (!['FRAME', 'COMPONENT_SET'].includes(n.type)) throw new Error('EVIDENCE_COMPONENT_TYPE');
      if (new Set(item.memberNodeIds).size !== item.memberNodeIds.length) throw new Error('EVIDENCE_DUPLICATE: state members');
      for (const member of item.memberNodeIds) {
        const target = requireNode(member);
        if (!['SYMBOL', 'COMPONENT'].includes(target.type) || target.parentId !== n.id) throw new Error('EVIDENCE_STATE_MEMBER');
      }
    } else if (item.kind === 'component') {
      if (!['SYMBOL', 'COMPONENT'].includes(n.type)) throw new Error('EVIDENCE_COMPONENT_TYPE');
      if (item.stateGroupId && (!groups.get(item.stateGroupId)?.memberNodeIds.includes(n.id) || n.parentId !== item.stateGroupId)) throw new Error('EVIDENCE_STATE_GROUP_REFERENCE');
      evidenceRecordMap(item.variantValues, 'variant property', 'name');
    } else {
      if (n.type !== 'INSTANCE') throw new Error('EVIDENCE_COMPONENT_TYPE');
      if (item.master.status === 'RESOLVED') {
        const master = requireNode(item.master.nodeId);
        if (!['SYMBOL', 'COMPONENT'].includes(master.type)) throw new Error('EVIDENCE_MASTER_TYPE');
        edges.get(item.nodeId).push(master.id);
      } else addDiagnostic({ code: 'UNRESOLVED_MASTER', severity: 'warning', status: 'UNRESOLVED', evidenceId: item.id, message: 'Instance master has no verified node in this evidence scope.' });
    }
  }
  assertEvidenceAcyclic(edges, 'component dependency');
  evidenceRecordMap(data.interactionEvidence, 'interaction occurrence');
  for (const item of data.interactionEvidence) {
    requireNode(item.nodeId);
    if (item.target?.status === 'RESOLVED') requireNode(item.target.nodeId);
    else if (item.target?.status === 'UNRESOLVED') addDiagnostic({ code: 'UNRESOLVED_TARGET', severity: 'warning', status: 'UNRESOLVED', evidenceId: item.id, message: 'Source target remains unresolved; no executable action is synthesized.' });
    if (item.kind === 'override') addDiagnostic({ code: 'PARTIAL_INTERACTION', severity: 'warning', status: 'NOT_VERIFIED', evidenceId: item.id, message: 'Instance override is partial evidence, not an additional executable interaction.' });
    if (item.kind === 'inferred') addDiagnostic({ code: 'INFERRED_BEHAVIOR', severity: 'warning', status: 'NOT_VERIFIED', evidenceId: item.id, message: 'Visible control does not establish its business behavior or target.' });
    if (['native', 'override'].includes(item.kind)) {
      if (['SWAP_STATE', 'CHANGE_TO'].includes(item.effect)) {
        if (item.scope !== 'component') throw new Error('EVIDENCE_INTERACTION_SCOPE');
        if (item.target?.status === 'RESOLVED' && !['SYMBOL', 'COMPONENT'].includes(requireNode(item.target.nodeId).type)) throw new Error('EVIDENCE_INTERACTION_TARGET');
      }
      if (['NAVIGATE', 'URL', 'SCROLL_TO'].includes(item.effect) && item.scope !== 'business') throw new Error('EVIDENCE_INTERACTION_SCOPE');
    }
    if (item.kind === 'native' && (!item.nativeInteractionId || !item.event || !item.effect || !item.target || item.event === 'UNKNOWN' || item.effect === 'UNKNOWN')) addDiagnostic({ code: 'INCOMPLETE_NATIVE_INTERACTION', severity: 'warning', status: 'NOT_VERIFIED', evidenceId: item.id, message: 'Native record lacks an identity, trigger, effect or target.' });
    if (item.kind === 'native' && item.event === 'AFTER_TIMEOUT' && item.delayMs === undefined) addDiagnostic({ code: 'MISSING_INTERACTION_DELAY', severity: 'warning', status: 'NOT_VERIFIED', evidenceId: item.id, message: 'No verified delay is supplied; animation duration is not a trigger delay.' });
  }
  evidenceRecordMap(data.assetIndex, 'asset evidence');
  evidenceRecordMap(data.assetIndex, 'asset path', 'path');
  evidenceRecordMap(data.assetIndex, 'source asset key', 'sourceAssetKey');
  if (data.assetIndex.length) addDiagnostic({ code: 'ASSET_CONTENT_NOT_VERIFIED', severity: 'info', status: 'NOT_VERIFIED', message: 'Only asset index metadata and relative paths were checked; files, bytes, MIME signatures and content hashes were not read.' });
  const diagnosticRefs = new Set([...nodes.keys(), ...pages.keys(), ...catalog.keys(), ...data.interactionEvidence.map(item => item.id), ...data.componentEvidence.map(item => item.id), ...data.assetIndex.map(item => item.id)]);
  for (const item of data.diagnostics) if (item.evidenceId && !diagnosticRefs.has(item.evidenceId)) throw new Error('EVIDENCE_DIAGNOSTIC_REFERENCE');
  if (data.diagnostics.length > 10000) throw new Error('EVIDENCE_DIAGNOSTIC_LIMIT');
  return data;
}

const optionsSchema = z.object({ inputRoot: z.string().min(1), expectedEvidenceHash: hash, expectedSourceHash: hash }).strict();
const within = (root, file) => { const relative = path.relative(root, file); return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)); };

export async function loadFigmaEvidence(file, options) {
  assertEvidenceData(options);
  const checked = optionsSchema.safeParse(options);
  if (!checked.success || typeof file !== 'string' || !file || file.includes('\0')) throw new Error('EVIDENCE_OPTIONS');
  const opts = checked.data, lexicalRoot = path.resolve(opts.inputRoot), lexicalFile = path.resolve(lexicalRoot, file);
  if (!within(lexicalRoot, lexicalFile)) throw new Error('EVIDENCE_BOUNDARY');
  const rootInfo = await lstat(lexicalRoot);
  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) throw new Error('EVIDENCE_SYMLINK_OR_ROOT');
  const root = await realpath(lexicalRoot);
  let current = lexicalRoot;
  for (const segment of path.relative(lexicalRoot, lexicalFile).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    if ((await lstat(current)).isSymbolicLink()) throw new Error('EVIDENCE_SYMLINK');
  }
  const realFile = await realpath(lexicalFile);
  if (!within(root, realFile)) throw new Error('EVIDENCE_BOUNDARY');
  const before = await lstat(realFile);
  if (!before.isFile()) throw new Error('EVIDENCE_FILE');
  if (before.size > FIGMA_EVIDENCE_LIMITS.inputBytes) throw new Error('EVIDENCE_INPUT_LIMIT');
  const handle = await open(realFile, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  let bytes;
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino) throw new Error('EVIDENCE_FILE_CHANGED');
    const chunks = []; let length = 0;
    while (true) {
      const buffer = Buffer.alloc(Math.min(65536, FIGMA_EVIDENCE_LIMITS.inputBytes + 1 - length));
      const result = await handle.read(buffer, 0, buffer.length, null);
      if (!result.bytesRead) break;
      length += result.bytesRead;
      if (length > FIGMA_EVIDENCE_LIMITS.inputBytes) throw new Error('EVIDENCE_INPUT_LIMIT');
      chunks.push(buffer.subarray(0, result.bytesRead));
    }
    const after = await handle.stat();
    if (after.size !== length || after.size !== opened.size || after.mtimeMs !== opened.mtimeMs || after.ctimeMs !== opened.ctimeMs || await realpath(lexicalFile) !== realFile) throw new Error('EVIDENCE_FILE_CHANGED');
    bytes = Buffer.concat(chunks, length);
  } finally { await handle.close(); }
  const evidenceHash = digest(bytes);
  if (evidenceHash !== opts.expectedEvidenceHash) throw new Error('EVIDENCE_HASH_MISMATCH');
  let jsonText;
  try { jsonText = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { throw new Error('EVIDENCE_UTF8'); }
  let raw;
  try { raw = JSON.parse(jsonText); } catch { throw new Error('EVIDENCE_JSON'); }
  const evidence = validateEvidence(raw);
  if (evidence.sourceHash !== opts.expectedSourceHash) throw new Error('SOURCE_HASH_MISMATCH');
  return { evidence, integrity: { evidenceHash, sourceHash: evidence.sourceHash } };
}

const selectionSchema = z.object({ id: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.-]{0,39}$/), name: z.string().min(1).max(200).optional(),
  scenes: z.array(z.object({ sourceNodeId: id, pageId: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.-]{0,39}$/),
    title: z.string().min(1).max(200), path: z.string().regex(/^\/(?!\/)[^\s?#]*$/).max(500), sceneId: id,
    stateId: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.-]{0,39}$/).default('default'), variantId: id.optional(),
    device: z.enum(['desktop', 'mobile']), viewport: z.object({ width: z.number().int().min(1).max(10000), height: z.number().int().min(1).max(10000) }).strict(),
    role: z.enum(['screen', 'reference']).default('screen'),
  }).strict()).min(1).max(100),
}).strict();

// Selection and provenance, not a .fig parser or an invented visual renderer.
export function prototypeFromFigmaEvidence(input, options) {
  const evidence = validateEvidence(input); assertEvidenceData(options);
  const parsed = selectionSchema.safeParse(options);
  if (!parsed.success) throw new Error('FIGMA_SELECTION_SCHEMA');
  const opts = parsed.data;
  evidenceRecordMap(opts.scenes, 'selected scenes', 'sceneId');
  const sourceNodes = new Map(evidence.nodeEvidence.map(n => [n.id, n]));
  const bySource = new Map(evidence.nodeEvidence.map(n => [n.sourceNodeId, n]));
  const children = new Map(evidence.nodeEvidence.map(n => [n.id, []]));
  for (const n of evidence.nodeEvidence) if (n.parentId !== null) children.get(n.parentId).push(n.id);
  const components = new Map(evidence.componentEvidence.map(c => [c.nodeId, c]));
  const groups = new Map(evidence.componentEvidence.filter(c => c.kind === 'state-group').map(c => [c.nodeId, c]));
  const memberGroups = new Map();
  for (const group of groups.values()) for (const member of group.memberNodeIds) {
    if (memberGroups.has(member)) throw new Error('FIGMA_AMBIGUOUS_STATE_GROUP');
    memberGroups.set(member, group);
  }
  const catalogBySource = new Map(evidence.catalog.entries.map(e => [e.sourceNodeId, e]));
  const evidenceIds = [...new Set([...evidence.catalog.pages, ...evidence.catalog.entries, ...evidence.nodeEvidence, ...evidence.componentEvidence, ...evidence.interactionEvidence, ...evidence.assetIndex].flatMap(e => e.sourceNodeId ? [e.id, e.sourceNodeId] : [e.id]))];
  const diagnostics = evidence.diagnostics.map(d => ({ code: d.code, severity: d.severity, message: d.message, ...(d.evidenceId ? { evidenceIds: [d.evidenceId] } : {}) }));
  const add = (code, message) => { if (!diagnostics.some(d => d.code === code)) diagnostics.push({ code, severity: 'warning', message }); };
  add('VISUAL_EVIDENCE_INCOMPLETE', 'Metadata does not contain verified paints, native vector paths, layout or rich text ranges. Readback hashes alone do not supply those values.');
  if (evidence.assetIndex.length) add('ASSET_BINDINGS_UNRESOLVED', 'Asset index retained without guessing node bindings or scene use; unbound assets are not loaded.');
  const pages = new Map(), scenes = [], nodes = [], families = [], actions = [];
  const kind = { FRAME: 'frame', SECTION: 'frame', COMPONENT_SET: 'frame', TEXT: 'text', SYMBOL: 'component', COMPONENT: 'component', INSTANCE: 'instance',
    VECTOR: 'vector', ROUNDED_RECTANGLE: 'shape', RECTANGLE: 'shape', ELLIPSE: 'shape', LINE: 'shape', REGULAR_POLYGON: 'shape', BOOLEAN_OPERATION: 'shape' };
  const shape = { ROUNDED_RECTANGLE: 'rectangle', RECTANGLE: 'rectangle', ELLIPSE: 'ellipse', LINE: 'line', REGULAR_POLYGON: 'polygon', BOOLEAN_OPERATION: 'boolean' };
  const selectedBoards = new Map();
  for (const s of opts.scenes) {
    const n = bySource.get(s.sourceNodeId), entry = catalogBySource.get(s.sourceNodeId);
    if (!n || !entry || !entry.independentBoard || !['FRAME', 'SYMBOL', 'COMPONENT', 'INSTANCE', 'SECTION'].includes(n.type)) throw new Error('FIGMA_SELECTION_SOURCE');
    if (selectedBoards.has(s.sourceNodeId)) throw new Error('FIGMA_SELECTION_DUPLICATE_BOARD');
    selectedBoards.set(s.sourceNodeId, s.sceneId);
  }
  for (const s of opts.scenes) {
    const root = bySource.get(s.sourceNodeId), included = new Set(), pending = [root.id];
    while (pending.length) {
      const key = pending.pop(); if (included.has(key)) continue;
      const n = sourceNodes.get(key); if (!n) throw new Error('FIGMA_DEPENDENCY_REFERENCE');
      included.add(key); pending.push(...children.get(key));
      const relation = components.get(key);
      if (relation?.kind === 'instance') {
        if (relation.master.status !== 'RESOLVED') throw new Error('FIGMA_UNRESOLVED_MASTER');
        pending.push(relation.master.nodeId);
      }
      if (memberGroups.has(key)) pending.push(...memberGroups.get(key).memberNodeIds);
    }
    const viewId = key => stableId('view', [s.sceneId, key]);
    const page = pages.get(s.pageId);
    if (page && (page.title !== s.title || page.path !== s.path)) throw new Error('FIGMA_SELECTION_PAGE_CONFLICT');
    if (!page) pages.set(s.pageId, { id: s.pageId, title: s.title, path: s.path, states: [{ id: 'default', kind: 'default', label: '默认' }] });
    if (!pages.get(s.pageId).states.some(state => state.id === s.stateId)) pages.get(s.pageId).states.push({ id: s.stateId, kind: 'custom', label: s.stateId });
    scenes.push({ id: s.sceneId, pageId: s.pageId, stateId: s.stateId, ...(s.variantId ? { variantId: s.variantId } : {}), device: s.device,
      viewport: s.viewport, rootNodeId: viewId(root.id), sourceBoardId: catalogBySource.get(s.sourceNodeId).id, role: s.role });
    for (const key of included) {
      const n = sourceNodes.get(key), relation = components.get(key);
      if (!kind[n.type]) throw new Error('FIGMA_UNSUPPORTED_VIEW_KIND');
      if (n.type === 'INSTANCE' && relation?.kind !== 'instance') throw new Error('FIGMA_MISSING_MASTER_EVIDENCE');
      if (n.type === 'INSTANCE') add('INSTANCE_VISUAL_OVERRIDES_NOT_VERIFIED', 'Master and family dependencies are preserved; metadata does not supply verified instance visual overrides.');
      nodes.push({ id: viewId(key), sourceNodeId: n.sourceNodeId, sceneId: s.sceneId,
        parentId: key === root.id || !included.has(n.parentId) ? null : viewId(n.parentId), kind: kind[n.type],
        ...(n.geometry ? { geometry: { ...n.geometry } } : {}), ...(shape[n.type] ? { shape: shape[n.type] } : {}),
        ...(typeof n.visible === 'boolean' || n.opacity !== undefined ? { style: { ...(typeof n.visible === 'boolean' ? { visible: n.visible } : {}), ...(n.opacity !== undefined ? { opacity: n.opacity } : {}) } } : {}),
        ...(n.type === 'TEXT' && n.text !== undefined ? { text: { characters: n.text } } : {}),
        ...(relation?.kind === 'instance' ? { componentId: viewId(relation.master.nodeId) } : {}), evidenceIds: [n.id] });
    }
    const familyOf = new Map();
    for (const group of groups.values()) if (group.memberNodeIds.some(key => included.has(key))) {
      const members = group.memberNodeIds.filter(key => included.has(key)), axes = new Map();
      for (const key of members) {
        familyOf.set(key, group.nodeId);
        for (const pair of components.get(key)?.variantValues ?? []) {
          if (!axes.has(pair.name)) axes.set(pair.name, new Set()); axes.get(pair.name).add(pair.value);
        }
      }
      families.push({ id: stableId('family', [s.sceneId, group.id]), memberNodeIds: members.map(viewId), axes: [...axes].map(([name, values]) => ({ name, values: [...values] })) });
    }
    const triggers = { ON_CLICK: 'click', ON_HOVER: 'hover', MOUSE_ENTER: 'mouse-enter', MOUSE_LEAVE: 'mouse-leave', AFTER_TIMEOUT: 'timeout' };
    for (const action of evidence.interactionEvidence) if (included.has(action.nodeId)) {
      if (action.kind !== 'native' || action.deleted) { add('NON_EXECUTABLE_EVIDENCE', 'Annotations, inferred behavior, deleted records and partial overrides are retained as evidence and do not create actions.'); continue; }
      if (!action.nativeInteractionId || !triggers[action.event] || !action.effect || action.event === 'AFTER_TIMEOUT' && action.delayMs === undefined) { add('INCOMPLETE_ACTION_EVIDENCE', 'Incomplete trigger, identity, delay or effect cannot be compiled into an executable action.'); continue; }
      let effect = { type: 'unresolved', reason: 'No verified selected-scene target or supported local state mapping.' };
      const target = action.target?.status === 'RESOLVED' ? sourceNodes.get(action.target.nodeId) : null;
      let owner = sourceNodes.get(action.nodeId);
      while (owner && !['SYMBOL', 'COMPONENT', 'INSTANCE'].includes(owner.type)) owner = sourceNodes.get(owner.parentId);
      const current = owner?.type === 'INSTANCE' ? components.get(owner.id)?.master?.nodeId : owner?.id;
      if (['SWAP_STATE', 'CHANGE_TO'].includes(action.effect) && owner && target && included.has(target.id) && familyOf.has(current) && familyOf.get(current) === familyOf.get(target.id)) {
        effect = { type: 'change-state', nodeId: viewId(owner.id), stateNodeId: viewId(target.id) };
      } else if (action.effect === 'NAVIGATE' && target && selectedBoards.has(target.sourceNodeId) && opts.scenes.find(s => s.sourceNodeId === target.sourceNodeId).role === 'screen') effect = { type: 'navigate', sceneId: selectedBoards.get(target.sourceNodeId) };
      actions.push({ id: stableId('action', [s.sceneId, action.id]), source: { sceneId: s.sceneId, nodeId: viewId(action.nodeId) },
        trigger: { type: triggers[action.event], ...(action.event === 'AFTER_TIMEOUT' ? { delayMs: action.delayMs } : {}) }, effect, evidenceIds: [action.id] });
    }
  }
  return validatePrototype({ schemaVersion: '1.1', id: opts.id, name: opts.name ?? evidence.source.name.slice(0, 200),
    sources: [{ file: evidence.source.name, kind: 'figma', sha256: evidence.sourceHash }], requirements: [], pages: [...pages.values()],
    catalog: evidence.catalog, presentation: { scenes, nodes, componentFamilies: families }, tokens: [],
    assets: evidence.assetIndex.map(asset => ({ id: asset.id, sha256: asset.sha256, mimeType: asset.mimeType, width: asset.width, height: asset.height, bytes: asset.bytes, path: asset.path,
      source: { kind: 'figma', sourceId: asset.sourceAssetKey }, sceneIds: [] })),
    actions, flows: [], evidenceIds, diagnostics, assumptions: ['Scene selection is explicit. No business routes, flows, fonts, paints or instance visual overrides are inferred from annotations or hashes.'],
  });
}
