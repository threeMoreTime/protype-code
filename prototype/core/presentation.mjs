import { z } from 'zod';
import { designEvidenceId as id, assertEvidenceData, evidenceRecordMap, assertEvidenceAcyclic } from './design-catalog.mjs';
import { BehaviorsSchema, validatePresentationBehaviors } from './behaviors.mjs';

const finite = z.number().finite();
const dimension = finite.min(0).max(1e6);
const color = z.string().regex(/^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/);
const matrix = z.array(z.array(finite.min(-1e7).max(1e7)).length(3)).length(2);
const font = z.object({ family: z.string().min(1).max(200), style: z.string().min(1).max(100) }).strict();
const paint = z.discriminatedUnion('type', [
  z.object({ type: z.literal('SOLID'), color, opacity: finite.min(0).max(1).optional() }).strict(),
  z.object({ type: z.literal('IMAGE'), assetId: id, scaleMode: z.enum(['FILL', 'FIT', 'CROP', 'TILE']), transform: matrix.optional(), opacity: finite.min(0).max(1).optional() }).strict(),
  ...['GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND'].map(type => z.object({ type: z.literal(type),
    stops: z.array(z.object({ position: finite.min(0).max(1), color }).strict()).min(2).max(100), transform: matrix }).strict()),
]);
const fills = z.array(paint).max(100);
const geometry = z.object({ x: finite.min(-1e7).max(1e7), y: finite.min(-1e7).max(1e7), width: dimension, height: dimension,
  rotation: finite.min(-3600).max(3600).optional(), transform: matrix.optional() }).strict();
const style = z.object({ fills: fills.optional(), strokes: fills.optional(), strokeWeight: dimension.optional(), cornerRadius: dimension.optional(),
  visible: z.boolean().optional(), opacity: finite.min(0).max(1).optional(), clipsContent: z.boolean().optional(),
  isMask: z.boolean().optional(), maskType: z.enum(['ALPHA', 'VECTOR', 'LUMINANCE']).optional(), tokenIds: z.array(id).max(100).optional() }).strict();
const range = z.object({ start: z.number().int().min(0), end: z.number().int().min(0), font, fontSize: finite.positive().max(1000),
  lineHeight: finite.positive().max(10000).optional(), letterSpacing: finite.min(-1000).max(10000).optional(), fills: fills.optional() }).strict();
const text = z.object({ characters: z.string().max(65536), ranges: z.array(range).max(10000).optional() }).strict();
const layout = z.object({ mode: z.enum(['absolute', 'horizontal', 'vertical']), gap: finite.min(0).max(10000).optional(),
  padding: z.object({ top: dimension, right: dimension, bottom: dimension, left: dimension }).strict().optional(),
  align: z.enum(['start', 'center', 'end', 'stretch', 'baseline']).optional(), justify: z.enum(['start', 'center', 'end', 'space-between']).optional(),
  sizingHorizontal: z.enum(['fixed', 'hug', 'fill']).optional(), sizingVertical: z.enum(['fixed', 'hug', 'fill']).optional(),
  constraints: z.object({ horizontal: z.enum(['MIN', 'CENTER', 'MAX', 'STRETCH', 'SCALE']), vertical: z.enum(['MIN', 'CENTER', 'MAX', 'STRETCH', 'SCALE']) }).strict().optional(),
  positioning: z.enum(['auto', 'absolute']).optional(), overflow: z.enum(['none', 'horizontal', 'vertical', 'both']).optional(),
  wrap: z.boolean().optional(), fixed: z.boolean().optional() }).strict();
const node = z.object({ id, sourceNodeId: id, sceneId: id, parentId: id.nullable(), kind: z.enum(['frame', 'text', 'shape', 'image', 'vector', 'component', 'instance']),
  geometry: geometry.optional(), layout: layout.optional(), style: style.optional(), text: text.optional(), assetId: id.optional(), componentId: id.optional(),
  shape: z.enum(['rectangle', 'ellipse', 'line', 'polygon', 'boolean']).optional(),
  vectorPaths: z.array(z.object({ windingRule: z.enum(['NONZERO', 'EVENODD']), data: z.string().min(1).max(524288) }).strict()).max(4000).optional(),
  overrides: z.array(z.object({ nodeId: id, text: text.optional(), style: style.optional(), geometry: geometry.optional() }).strict()).max(1000).optional(),
  evidenceIds: z.array(id).max(100).default([]),
}).strict();
export const TokensSchema = z.array(z.discriminatedUnion('type', [
  z.object({ id, type: z.literal('color'), value: color }).strict(),
  z.object({ id, type: z.literal('number'), value: finite.min(-10000).max(10000) }).strict(),
  z.object({ id, type: z.literal('text'), value: z.object({ font, fontSize: finite.positive().max(1000) }).strict() }).strict(),
])).max(2000);
export const PresentationSchema = z.object({
  scenes: z.array(z.object({ id, pageId: id, stateId: id, variantId: id.optional(), device: z.enum(['desktop', 'mobile']),
    viewport: z.object({ width: finite.int().min(1).max(10000), height: finite.int().min(1).max(10000) }).strict(),
    rootNodeId: id, sourceBoardId: id, role: z.enum(['screen', 'reference']) }).strict()).min(1).max(500),
  nodes: z.array(node).min(1).max(25000),
  componentFamilies: z.array(z.object({ id, memberNodeIds: z.array(id).min(1).max(5000),
    axes: z.array(z.object({ name: z.string().min(1).max(200), values: z.array(z.string().min(1).max(1000)).min(1).max(100) }).strict()).max(100) }).strict()).max(2000),
  behaviors: BehaviorsSchema.optional(),
}).strict();

function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) throw new Error(`PRESENTATION_SCHEMA: ${result.error.issues.slice(0, 5).map(i => `${i.path.join('.')}:${i.code}`).join('; ')}`);
  return result.data;
}

// A pure shared representation. No DOM selectors, native IDs, IO or fallback styles.
export function compilePresentation(model, options = {}) {
  assertEvidenceData(model); assertEvidenceData(options);
  const opts = parse(z.object({ availableFonts: z.array(font).max(10000).optional() }).strict(), options);
  const presentation = parse(PresentationSchema, model.presentation), tokens = parse(TokensSchema, model.tokens ?? []);
  const scenes = evidenceRecordMap(presentation.scenes, 'scenes'), nodes = evidenceRecordMap(presentation.nodes, 'view nodes');
  const families = evidenceRecordMap(presentation.componentFamilies, 'component families'), tokenMap = evidenceRecordMap(tokens, 'tokens');
  const pages = new Map(model.pages.map(p => [p.id, p])), catalog = new Map(model.catalog.entries.map(e => [e.id, e]));
  const assets = evidenceRecordMap(model.assets ?? [], 'assets'), evidence = new Set(model.evidenceIds ?? []);
  const children = new Map(presentation.nodes.map(n => [n.id, []])), edges = new Map(presentation.nodes.map(n => [n.id, []]));
  const sourceDiagnostics = structuredClone(model.diagnostics ?? []);
  const diagnostics = sourceDiagnostics.slice(0, 2999), diagnosticCounts = Object.create(null), diagnosticKeys = new Set(sourceDiagnostics.map(d => `${d.code}/${d.nodeId ?? ''}`));
  let diagnosticTotal = sourceDiagnostics.length;
  for (const item of sourceDiagnostics) diagnosticCounts[item.code] = (diagnosticCounts[item.code] ?? 0) + 1;
  const add = (code, nodeId) => {
    const key = `${code}/${nodeId}`;
    if (diagnosticKeys.has(key)) return;
    diagnosticKeys.add(key); diagnosticTotal++; diagnosticCounts[code] = (diagnosticCounts[code] ?? 0) + 1;
    if (diagnostics.length < 2999) diagnostics.push({ code, severity: 'warning', message: code.replaceAll('_', ' '), nodeId });
  };
  const requireNode = key => { const item = nodes.get(key); if (!item) throw new Error('PRESENTATION_NODE_REFERENCE'); return item; };
  const memberOwner = new Map();
  for (const family of families.values()) {
    if (new Set(family.memberNodeIds).size !== family.memberNodeIds.length) throw new Error('PRESENTATION_DUPLICATE_MEMBER');
    evidenceRecordMap(family.axes, 'variant axes', 'name');
    const owners = new Set();
    for (const memberId of family.memberNodeIds) {
      const member = requireNode(memberId); owners.add(member.sceneId);
      if (member.kind !== 'component' || memberOwner.has(memberId)) throw new Error('PRESENTATION_COMPONENT_MEMBER');
      memberOwner.set(memberId, family.id);
    }
    if (owners.size !== 1 || family.axes.some(axis => new Set(axis.values).size !== axis.values.length)) throw new Error('PRESENTATION_COMPONENT_FAMILY');
  }
  const sceneKeys = new Set();
  for (const scene of scenes.values()) {
    if (!pages.get(scene.pageId)?.states.some(s => s.id === scene.stateId)) throw new Error('PRESENTATION_PAGE_STATE');
    const sourceBoard = catalog.get(scene.sourceBoardId);
    if (!sourceBoard?.independentBoard || scene.role === 'screen' && !['screen', 'component', 'module'].includes(sourceBoard.role)) throw new Error('PRESENTATION_SOURCE_BOARD');
    const key = `${scene.pageId}/${scene.stateId}/${scene.variantId ?? ''}`;
    if (sceneKeys.has(key)) throw new Error('PRESENTATION_DUPLICATE_SCENARIO'); sceneKeys.add(key);
    const root = requireNode(scene.rootNodeId);
    if (root.sceneId !== scene.id || root.parentId !== null || !['frame', 'component', 'instance'].includes(root.kind)) throw new Error('PRESENTATION_ROOT');
    if (root.sourceNodeId !== sourceBoard.sourceNodeId) throw new Error('PRESENTATION_SOURCE_IDENTITY');
  }
  const sceneAssets = new Map(presentation.scenes.map(s => [s.id, new Set()]));
  const checkPaints = (paints, n) => {
    for (const p of paints ?? []) {
      if (p.type === 'IMAGE') checkAsset(p.assetId, n);
      if (p.stops?.some((stop, i) => i && stop.position < p.stops[i - 1].position)) throw new Error('PRESENTATION_GRADIENT_STOPS');
    }
  };
  const checkAsset = (assetId, n) => {
    const asset = assets.get(assetId);
    if (!asset || !asset.sceneIds.includes(n.sceneId)) throw new Error('PRESENTATION_ASSET_REFERENCE');
    sceneAssets.get(n.sceneId).add(assetId);
  };
  const checkText = (value, n) => {
    if (!value.ranges) { add('MISSING_TEXT_RANGES', n.id); return; }
    let cursor = 0;
    for (const r of value.ranges) {
      const boundary = i => i === 0 || i === value.characters.length || !(/[\uD800-\uDBFF]/.test(value.characters[i - 1]) && /[\uDC00-\uDFFF]/.test(value.characters[i]));
      if (r.start !== cursor || r.end <= r.start || r.end > value.characters.length || !boundary(r.start) || !boundary(r.end)) throw new Error('PRESENTATION_TEXT_RANGE');
      cursor = r.end; checkPaints(r.fills, n);
      if (!opts.availableFonts) add('FONT_NOT_VERIFIED', n.id);
      else if (!opts.availableFonts.some(f => f.family === r.font.family && f.style === r.font.style)) add('MISSING_FONT', n.id);
    }
    if (cursor !== value.characters.length) throw new Error('PRESENTATION_TEXT_RANGE');
  };
  const sourceKeys = new Set(), pageSources = new Set(model.catalog.pages.map(p => p.sourceNodeId));
  for (const n of nodes.values()) {
    if (!scenes.has(n.sceneId)) throw new Error('PRESENTATION_NODE_SCENE');
    const sourceKey = `${n.sceneId}/${n.sourceNodeId}`;
    if (!evidence.has(n.sourceNodeId) || pageSources.has(n.sourceNodeId) || sourceKeys.has(sourceKey)) throw new Error('PRESENTATION_SOURCE_IDENTITY');
    sourceKeys.add(sourceKey);
    if (n.parentId !== null) {
      const parent = requireNode(n.parentId);
      if (parent.sceneId !== n.sceneId) throw new Error('PRESENTATION_CROSS_SCENE_PARENT');
      children.get(parent.id).push(n.id); edges.get(parent.id).push(n.id);
    }
    if (!n.geometry) add('MISSING_GEOMETRY', n.id);
    if (['frame', 'component'].includes(n.kind) && !n.layout) add('MISSING_LAYOUT', n.id);
    if (n.kind === 'text') { if (n.text) checkText(n.text, n); else add('MISSING_TEXT', n.id); }
    else if (n.text) throw new Error('PRESENTATION_TEXT_KIND');
    if (n.kind === 'vector' && !n.vectorPaths?.length) add('MISSING_VECTOR_PATHS', n.id);
    else if (n.vectorPaths && n.kind !== 'vector') throw new Error('PRESENTATION_VECTOR_KIND');
    if (n.assetId) checkAsset(n.assetId, n); else if (n.kind === 'image') add('MISSING_IMAGE_ASSET', n.id);
    if (n.style) {
      checkPaints(n.style.fills, n); checkPaints(n.style.strokes, n);
      for (const token of n.style.tokenIds ?? []) if (!tokenMap.has(token)) throw new Error('PRESENTATION_TOKEN_REFERENCE');
      if (n.style.isMask && !n.style.maskType) add('MISSING_MASK_TYPE', n.id);
    }
    for (const ref of n.evidenceIds) if (!evidence.has(ref)) throw new Error('PRESENTATION_EVIDENCE_REFERENCE');
    if (n.kind === 'instance') {
      const master = requireNode(n.componentId);
      if (master.kind !== 'component' || master.sceneId !== n.sceneId) throw new Error('PRESENTATION_COMPONENT_REFERENCE');
      edges.get(n.id).push(master.id);
    } else if (n.componentId || n.overrides) throw new Error('PRESENTATION_INSTANCE_KIND');
  }
  assertEvidenceAcyclic(edges, 'presentation component');
  validatePresentationBehaviors(model, presentation);
  const reachable = new Set(), visitedFamilies = new Set(), visit = starts => {
    const pending = [...starts];
    while (pending.length) {
      const key = pending.pop(); if (reachable.has(key)) continue;
      reachable.add(key); pending.push(...edges.get(key));
      const familyId = memberOwner.get(key);
      if (familyId && !visitedFamilies.has(familyId)) { visitedFamilies.add(familyId); pending.push(...families.get(familyId).memberNodeIds); }
    }
  };
  visit([...scenes.values()].map(s => s.rootNodeId));
  if (reachable.size !== nodes.size) throw new Error('PRESENTATION_ORPHAN_NODE');
  for (const n of nodes.values()) if (n.overrides) {
    const allowed = new Set(), pending = [n.componentId];
    while (pending.length) { const key = pending.pop(); if (allowed.has(key)) continue; allowed.add(key); pending.push(...children.get(key)); }
    evidenceRecordMap(n.overrides, 'override targets', 'nodeId');
    for (const override of n.overrides) {
      if (!allowed.has(override.nodeId)) throw new Error('PRESENTATION_OVERRIDE_SCOPE');
      if (override.text) { if (requireNode(override.nodeId).kind !== 'text') throw new Error('PRESENTATION_OVERRIDE_KIND'); checkText(override.text, n); }
      checkPaints(override.style?.fills, n); checkPaints(override.style?.strokes, n);
      for (const token of override.style?.tokenIds ?? []) if (!tokenMap.has(token)) throw new Error('PRESENTATION_TOKEN_REFERENCE');
    }
  }
  // Cost each materialized instance as well as component definitions. Empty semantic
  // elements cannot bypass this separate visual budget.
  const costs = new Map();
  for (const start of nodes.keys()) {
    const stack = [{ key: start, exit: false }];
    while (stack.length) {
      const { key, exit } = stack.pop(); if (costs.has(key)) continue;
      if (!exit) { stack.push({ key, exit: true }); for (const child of edges.get(key)) if (!costs.has(child)) stack.push({ key: child, exit: false }); }
      else {
        const cost = 1 + edges.get(key).reduce((sum, child) => sum + costs.get(child), 0);
        if (cost > 25000) throw new Error('PRESENTATION_EXPANSION_BUDGET'); costs.set(key, cost);
      }
    }
  }
  const expandedNodes = presentation.nodes.filter(n => n.parentId === null).reduce((sum, n) => sum + costs.get(n.id), 0);
  if (expandedNodes > 25000) throw new Error('PRESENTATION_EXPANSION_BUDGET');
  const buildTree = key => {
    const result = new Map(), stack = [{ key, exit: false }];
    while (stack.length) {
      const item = stack.pop();
      if (!item.exit) { stack.push({ ...item, exit: true }); for (const child of children.get(item.key)) stack.push({ key: child, exit: false }); }
      else result.set(item.key, { node: nodes.get(item.key), children: children.get(item.key).map(child => result.get(child)) });
    }
    return result.get(key);
  };
  if (diagnosticTotal > diagnostics.length) diagnostics.push({ code: 'PRESENTATION_DIAGNOSTIC_OVERFLOW', severity: 'warning', message: 'Further diagnostics are summarized by code; evidence remains incomplete.', omittedCount: diagnosticTotal - diagnostics.length });
  return { scenes: presentation.scenes.map(scene => ({ ...scene, root: buildTree(scene.rootNodeId), assetIds: [...sceneAssets.get(scene.id)] })),
    nodes: presentation.nodes, componentFamilies: presentation.componentFamilies, tokens, assets: model.assets ?? [], diagnostics, diagnosticCounts,
    budget: { declaredNodes: nodes.size, expandedNodes }, status: diagnostics.length ? 'NEEDS_REVIEW' : 'VALID' };
}
