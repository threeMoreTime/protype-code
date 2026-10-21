import { validatePrototype, digest, stableId } from './model.mjs';
import { compilePresentation } from './presentation.mjs';
import { validateAssetContent } from './assets.mjs';
import { assertEvidenceData } from './design-catalog.mjs';

const contexts = new WeakMap();
const blockers = new Set(['MISSING_GEOMETRY', 'MISSING_LAYOUT', 'MISSING_TEXT', 'MISSING_TEXT_RANGES', 'MISSING_VECTOR_PATHS', 'MISSING_IMAGE_ASSET',
  'MISSING_MASK_TYPE', 'VISUAL_EVIDENCE_INCOMPLETE', 'VISUAL_FIELDS_NOT_IMPORTED', 'INSTANCE_OVERRIDES_NOT_IMPORTED',
  'INSTANCE_VISUAL_OVERRIDES_NOT_VERIFIED', 'ASSET_BINDINGS_UNRESOLVED']);
const clone = value => structuredClone(value);

function freezeData(value) {
  const pending = [value], seen = new Set();
  while (pending.length) {
    const current = pending.pop();
    if (!current || typeof current !== 'object' || seen.has(current) || Buffer.isBuffer(current)) continue;
    seen.add(current);
    if (current instanceof Map) pending.push(...current.values());
    else pending.push(...Object.values(current));
    Object.freeze(current);
  }
  return value;
}

function trustedContext(model, compiled, renderScenes, resolvedAssets, fontKey, componentStates) {
  const context = freezeData({ model, compiled, modelRevision: compiled.modelRevision, renderScenes, componentStates, resolvedAssets });
  // A private Map prevents callers from replacing the asset lookup. Buffers are
  // deliberately revalidated on every reuse; freezing a Map alone cannot do so.
  contexts.set(context, { byId: new Map(resolvedAssets.byId), fontKey });
  return context;
}

function resolvedFor(compiled, supplied) {
  const ids = new Set(compiled.scenes.flatMap(scene => scene.assetIds)), byId = new Map(), unique = new Map();
  if (ids.size && !(supplied?.byId instanceof Map)) throw new Error('PRESENTATION_ASSETS_REQUIRED');
  const definitions = new Map(compiled.assets.map(asset => [asset.id, asset]));
  let decodedBytes = 0;
  for (const id of ids) {
    const definition = definitions.get(id), provided = supplied.byId.get(id);
    if (!provided) throw new Error('PRESENTATION_ASSET_MISSING');
    validateAssetContent(provided.bytes, definition);
    let value = unique.get(definition.sha256);
    if (!value) {
      value = { sha256: definition.sha256, mimeType: definition.mimeType, width: definition.width, height: definition.height,
        bytes: provided.bytes, assetIds: [] };
      unique.set(definition.sha256, value); decodedBytes += provided.bytes.length;
    } else if (value.mimeType !== definition.mimeType || value.width !== definition.width || value.height !== definition.height) throw new Error('PRESENTATION_ASSET_METADATA');
    value.assetIds.push(id); byId.set(id, value);
  }
  if (decodedBytes > 80 * 1024 * 1024) throw new Error('PRESENTATION_ASSET_BUDGET');
  return { assets: [...unique.values()], byId, budget: { assetCount: ids.size, uniqueAssets: unique.size, decodedBytes } };
}

function materializationIndex(compiled) {
  const nodes = new Map(compiled.nodes.map(n => [n.id, n])), children = new Map(compiled.nodes.map(n => [n.id, []]));
  for (const node of nodes.values()) if (node.parentId !== null) children.get(node.parentId).push(node.id);
  return { nodes, children };
}

function materialize(compiled, requests, instanceDefinitions = new Map(), index = materializationIndex(compiled), maxNodes = 25000) {
  const { nodes, children } = index;
  let total = 0;
  return (requests ?? compiled.scenes).map(scene => {
    let root;
    const tasks = [{ id: scene.nodeId ?? scene.rootNodeId, target: value => { root = value; }, occurrence: '', instanceId: null, overrides: new Map() }];
    while (tasks.length) {
      const task = tasks.pop(), stateRoot = scene.nodeId === task.id, original = stateRoot ? scene.targetNode : nodes.get(task.id);
      const definition = stateRoot ? { ...original, kind: 'instance', componentId: scene.stateNodeId,
        ...(original.kind === 'component' ? { style: clone(nodes.get(scene.stateNodeId).style ?? {}) } : {}) } : original;
      const override = task.overrides.get(task.id);
      if (++total > maxNodes) throw new Error('PRESENTATION_MATERIALIZATION_BUDGET');
      let node = { ...clone(definition), ...(override?.geometry ? { geometry: clone(override.geometry) } : {}),
        ...(override?.style ? { style: { ...clone(definition.style ?? {}), ...clone(override.style) } } : {}),
        ...(override?.text ? { text: clone(override.text) } : {}), definitionId: original.definitionId ?? definition.id,
        id: task.occurrence ? stableId('occurrence', [task.occurrence, definition.id]) : definition.id,
        ...(task.instanceId ? { instanceId: task.instanceId } : {}) };
      let childIds = children.get(definition.id), nextOverrides = task.overrides, instanceId = task.instanceId, occurrence = task.occurrence;
      if (definition.kind === 'instance') {
        if (!stateRoot) instanceDefinitions.set(node.id, { ...clone(definition), id: node.id, definitionId: definition.id,
          geometry: clone(node.geometry), ...(override?.style ? { style: { ...clone(definition.style ?? {}), ...clone(override.style) } } : {}) });
        const master = nodes.get(definition.componentId);
        node = { ...clone(master), ...node, layout: clone(node.layout ?? master.layout),
          style: { ...clone(master.style ?? {}), ...clone(node.style ?? {}) } };
        delete node.overrides;
        childIds = children.get(master.id); nextOverrides = new Map((definition.overrides ?? []).map(value => [value.nodeId, value]));
        occurrence = node.id; instanceId = node.id;
      }
      if (stateRoot && original.kind === 'component') { node.kind = 'component'; delete node.componentId; }
      const tree = { node, children: new Array(childIds.length) }; task.target(tree);
      for (let i = childIds.length - 1; i >= 0; i--) tasks.push({ id: childIds[i], occurrence, instanceId, overrides: nextOverrides, target: value => { tree.children[i] = value; } });
    }
    if (!requests) {
      root.node.geometry.x = 0; root.node.geometry.y = 0;
      if (root.node.geometry.transform) { root.node.geometry.transform[0][2] = 0; root.node.geometry.transform[1][2] = 0; }
    }
    return { ...scene, root };
  });
}

// Both renderers enter here. Caller-supplied compiled objects are never trusted.
// Only this module's contexts can be reused, and image bytes are rechecked.
export function getPresentationRenderContext(input, options = {}) {
  const model = validatePrototype(input);
  if (model.schemaVersion !== '1.1') throw new Error('PRESENTATION_VERSION');
  if (options.availableFonts !== undefined) assertEvidenceData(options.availableFonts);
  const modelRevision = digest(model), fontKey = options.availableFonts === undefined ? null : digest(options.availableFonts);
  const prior = options.context && contexts.get(options.context);
  if (prior && options.context.modelRevision === modelRevision && prior.fontKey === fontKey) {
    const context = options.context, resolvedAssets = resolvedFor(context.compiled, prior);
    return trustedContext(context.model, context.compiled, context.renderScenes, resolvedAssets, fontKey, context.componentStates);
  }
  const compiled = compilePresentation(model, options.availableFonts === undefined ? {} : { availableFonts: options.availableFonts });
  compiled.modelRevision = modelRevision;
  if (Object.keys(compiled.diagnosticCounts).some(code => blockers.has(code))) throw new Error('PRESENTATION_VISUAL_NOT_VERIFIED: incomplete source fields');
  const instances = new Set(compiled.nodes.filter(node => node.kind === 'instance').map(node => node.id));
  if (compiled.nodes.some(node => instances.has(node.parentId))) throw new Error('PRESENTATION_INSTANCE_CHILDREN_UNSUPPORTED');
  const index = materializationIndex(compiled), instanceDefinitions = new Map(), renderScenes = materialize(compiled, undefined, instanceDefinitions, index);
  const nodesById = new Map(compiled.nodes.map(n => [n.id, n]));
  const families = new Map(compiled.componentFamilies.flatMap(f => f.memberNodeIds.map(id => [id, f])));
  const targets = new Set(model.actions.flatMap(a => [
    ...(a.effect.type === 'change-state' ? [a.effect.nodeId] : []), ...(a.guard ? [a.guard.nodeId] : []),
  ]));
  const targetNodes = new Map([...targets].map(id => [id, nodesById.get(id)]));
  const activeFamilies = new Set([...targetNodes.values()].map(n => families.get(n.kind === 'instance' ? n.componentId : n.id)?.id));
  const componentStates = [], processed = new Set();
  let remaining = 25000, requestCount = 0, discovered = renderScenes;
  // Discover instances in every selected state, including states that have not
  // yet appeared on screen. Bound both request creation and expanded trees.
  while (discovered.length) {
    const occurrences = discovered.map(s => s.root);
    while (occurrences.length) {
      const tree = occurrences.pop(), n = tree.node;
      if (n.kind === 'instance' && activeFamilies.has(families.get(n.componentId)?.id) && !targetNodes.has(n.id)) targetNodes.set(n.id, instanceDefinitions.get(n.id));
      occurrences.push(...tree.children);
    }
    const stateRequests = [];
    for (const [nodeId, targetNode] of targetNodes) {
      if (processed.has(nodeId)) continue;
      processed.add(nodeId);
      const family = families.get(targetNode.kind === 'instance' ? targetNode.componentId : targetNode.id);
      if (requestCount + family.memberNodeIds.length > 25000) throw new Error('PRESENTATION_STATE_TEMPLATE_BUDGET');
      requestCount += family.memberNodeIds.length;
      for (const stateNodeId of family.memberNodeIds) stateRequests.push({ nodeId, stateNodeId, targetNode });
    }
    discovered = materialize(compiled, stateRequests, instanceDefinitions, index, remaining);
    const pendingStates = discovered.map(s => s.root);
    while (pendingStates.length) { const tree = pendingStates.pop(); remaining--; pendingStates.push(...tree.children); }
    componentStates.push(...discovered.map(({ nodeId, stateNodeId, root }) => ({ nodeId, stateNodeId, root })));
  }
  const pending = [...compiled.nodes, ...renderScenes.map(scene => scene.root)];
  while (pending.length) {
    const value = pending.pop(), node = value.node ?? value;
    if (value.children) pending.push(...value.children);
    if (node.kind === 'text' && node.text.characters.length && node.text.ranges.some(range => !Array.isArray(range.fills ?? node.style?.fills))) {
      throw new Error('PRESENTATION_VISUAL_NOT_VERIFIED: missing text paint');
    }
  }
  for (const scene of renderScenes) {
    const root = scene.root.node;
    if ((root.geometry.width > scene.viewport.width || root.geometry.height > scene.viewport.height) && !root.layout?.overflow) throw new Error('PRESENTATION_VIEWPORT_NOT_VERIFIED');
  }
  const resolvedAssets = resolvedFor(compiled, options.resolvedAssets);
  return trustedContext(model, compiled, renderScenes, resolvedAssets, fontKey, componentStates);
}
