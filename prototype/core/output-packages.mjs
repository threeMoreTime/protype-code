import { digest, stableId, validatePrototype } from './model.mjs';
import { assertEvidenceData } from './design-catalog.mjs';
import { nativeActionCapability } from './interaction-capabilities.mjs';
import { sceneProjection } from './merge.mjs';

const MiB = 1024 * 1024;
export const OUTPUT_PACKAGE_LIMITS = Object.freeze({ deliveryBytes: 32 * MiB, logicalSpecBytes: 6.5 * MiB, requestBytes: 7 * MiB,
  imageBytes: 80 * MiB, singleImageBytes: 20 * MiB, assetCount: 2000, nodeCount: 25000, reactionCount: 30000 });
const sorted = values => [...new Set(values)].sort();
const fail = code => { throw new Error(code); };

function validatedInput(input) {
  // Do not ask the legacy validator to reinterpret a plan request as a 1.0 model.
  const descriptor = input && typeof input === 'object' && Object.getOwnPropertyDescriptor(input, 'schemaVersion');
  if (descriptor?.get || descriptor?.set) fail('OUTPUT_PRESENTATION_VERSION');
  if (descriptor?.value !== '1.1') fail('OUTPUT_PRESENTATION_VERSION');
  return validatePrototype(input);
}

function optionsFor(options) {
  assertEvidenceData(options);
  if (!options || typeof options !== 'object' || Array.isArray(options) || Object.keys(options).some(key => !['limits', 'catalogDecisions'].includes(key))) fail('OUTPUT_OPTIONS');
  const limits = { ...OUTPUT_PACKAGE_LIMITS };
  if (options.limits !== undefined) {
    if (!options.limits || typeof options.limits !== 'object' || Array.isArray(options.limits)) fail('OUTPUT_LIMIT');
    for (const [key, value] of Object.entries(options.limits)) {
      if (!Object.hasOwn(limits, key) || !Number.isSafeInteger(value) || value < 1 || value > limits[key]) fail('OUTPUT_LIMIT');
      limits[key] = value;
    }
  }
  if (options.catalogDecisions !== undefined && !Array.isArray(options.catalogDecisions)) fail('OUTPUT_CATALOG_DECISION');
  return { limits, decisions: options.catalogDecisions ?? [] };
}

function sceneDependencies(model) {
  const dependencies = new Map(model.presentation.scenes.map(scene => [scene.id, { nodeIds: [], assetIds: new Set(), tokenIds: new Set() }]));
  const paints = (values, dependency) => { for (const value of values ?? []) if (value.type === 'IMAGE') dependency.assetIds.add(value.assetId); };
  const style = (value, dependency) => { paints(value?.fills, dependency); paints(value?.strokes, dependency); for (const id of value?.tokenIds ?? []) dependency.tokenIds.add(id); };
  const text = (value, dependency) => { for (const range of value?.ranges ?? []) paints(range.fills, dependency); };
  for (const node of model.presentation.nodes) {
    const dependency = dependencies.get(node.sceneId); dependency.nodeIds.push(node.id);
    if (node.assetId) dependency.assetIds.add(node.assetId);
    style(node.style, dependency); text(node.text, dependency);
    for (const override of node.overrides ?? []) { style(override.style, dependency); text(override.text, dependency); }
  }
  return dependencies;
}

function connectedScenes(model) {
  const edges = new Map(model.presentation.scenes.map(scene => [scene.id, new Set()]));
  const connect = (from, to) => { edges.get(from).add(to); edges.get(to).add(from); };
  const actions = new Map(model.actions.map(action => [action.id, action]));
  for (const action of actions.values()) if (action.effect.type === 'navigate') connect(action.source.sceneId, action.effect.sceneId);
  // Explicit flow membership remains atomic even when a future bounded effect
  // visits a scene without a direct navigation edge in this representation.
  for (const flow of model.flows) {
    for (const id of flow.actionIds) {
      const action = actions.get(id); connect(flow.entrySceneId, action.source.sceneId);
      if (action.effect.type === 'navigate') connect(flow.entrySceneId, action.effect.sceneId);
    }
  }
  const visited = new Set(), components = [];
  for (const start of sorted(edges.keys())) {
    if (visited.has(start)) continue;
    const pending = [start], ids = [];
    while (pending.length) {
      const id = pending.pop(); if (visited.has(id)) continue;
      visited.add(id); ids.push(id); pending.push(...edges.get(id));
    }
    components.push(ids.sort());
  }
  return components;
}

function catalogSubset(model, sceneIds) {
  const selected = new Set(sceneIds), sourceBoards = model.presentation.scenes.filter(scene => selected.has(scene.id)).map(scene => scene.sourceBoardId);
  const nodes = model.presentation.nodes.filter(node => selected.has(node.sceneId)), sources = new Set(nodes.map(node => node.sourceNodeId));
  const byId = new Map(model.catalog.entries.map(entry => [entry.id, entry]));
  const ids = new Set([...sourceBoards, ...model.catalog.entries.filter(entry => sources.has(entry.sourceNodeId)).map(entry => entry.id)]);
  for (const start of [...ids]) { let entry = byId.get(start); while (entry?.parentId) { ids.add(entry.parentId); entry = byId.get(entry.parentId); } }
  const entries = model.catalog.entries.filter(entry => ids.has(entry.id)), pages = new Set(entries.map(entry => entry.pageId));
  return { pages: model.catalog.pages.filter(page => pages.has(page.id)), entries };
}

function subsetModel(model, sceneIds, dependencies) {
  const selected = new Set(sceneIds), scenes = model.presentation.scenes.filter(scene => selected.has(scene.id));
  // The 1.1 validator requires scene-local masters and families and already
  // proves every declared node reachable through roots, instances or families.
  // Keeping all selected scene nodes therefore preserves the full state closure.
  const nodes = model.presentation.nodes.filter(node => selected.has(node.sceneId)), nodeIds = new Set(nodes.map(node => node.id));
  const tokenIds = new Set(sceneIds.flatMap(id => [...dependencies.get(id).tokenIds])), assetIds = new Set(sceneIds.flatMap(id => [...dependencies.get(id).assetIds]));
  const pageIds = new Set(scenes.map(scene => scene.pageId));
  const pages = model.pages.filter(page => pageIds.has(page.id)).map(page => ({ ...structuredClone(page), states: page.states.filter(state => state.id === 'default' || scenes.some(scene => scene.pageId === page.id && scene.stateId === state.id)) }));
  const requirements = new Set(pages.flatMap(page => [page, ...page.states].flatMap(value => value.requirementIds)));
  const result = { ...structuredClone(model), pages, requirements: model.requirements.filter(requirement => requirements.has(requirement.id)), catalog: catalogSubset(model, sceneIds),
    tokens: model.tokens.filter(token => tokenIds.has(token.id)),
    assets: model.assets.filter(asset => assetIds.has(asset.id)).map(asset => ({ ...structuredClone(asset), sceneIds: sceneIds.filter(id => dependencies.get(id).assetIds.has(asset.id)) })),
    actions: model.actions.filter(action => selected.has(action.source.sceneId)), flows: model.flows.filter(flow => selected.has(flow.entrySceneId)),
    presentation: { scenes, nodes, componentFamilies: model.presentation.componentFamilies.filter(family => family.memberNodeIds.some(id => nodeIds.has(id))),
      ...(model.presentation.behaviors === undefined ? {} : { behaviors: model.presentation.behaviors.filter(behavior => selected.has(behavior.source.sceneId)) }) } };
  const evidence = new Set([...nodes.flatMap(node => [node.sourceNodeId, ...node.evidenceIds]),
    ...result.catalog.pages.map(page => page.sourceNodeId), ...result.catalog.entries.map(entry => entry.sourceNodeId),
    ...result.actions.flatMap(action => action.evidenceIds), ...(result.presentation.behaviors ?? []).flatMap(behavior => behavior.evidenceIds),
    ...result.assets.map(asset => asset.source.sourceId), ...model.diagnostics.flatMap(diagnostic => diagnostic.evidenceIds ?? [])]);
  result.evidenceIds = model.evidenceIds.filter(id => evidence.has(id));
  // Global diagnostics and their evidence are deliberately retained: lacking a
  // scene ownership field is not permission to discard a real source blocker.
  return validatePrototype(structuredClone(result));
}

function assetIndex(model, dependencies) {
  const hashes = new Map(), paths = new Map();
  for (const asset of model.assets) {
    const metadata = digest([asset.mimeType, asset.width, asset.height, asset.bytes]), previous = hashes.get(asset.sha256);
    if (previous && previous !== metadata) fail('OUTPUT_ASSET_METADATA_COLLISION');
    hashes.set(asset.sha256, metadata);
    const path = asset.path.toLowerCase(), priorPath = paths.get(path);
    if (priorPath && priorPath !== asset.sha256) fail('OUTPUT_ASSET_PATH_COLLISION');
    paths.set(path, asset.sha256);
  }
  return model.assets.map(asset => ({ id: asset.id, sha256: asset.sha256, mimeType: asset.mimeType, bytes: asset.bytes, path: asset.path,
    sceneIds: sorted([...dependencies].filter(([, dependency]) => dependency.assetIds.has(asset.id)).map(([id]) => id)) }));
}

function catalogManifest(model, packages, decisions) {
  const knownEvidence = new Set([...model.evidenceIds, ...model.catalog.entries.map(entry => entry.sourceNodeId), ...model.catalog.pages.map(page => page.sourceNodeId)]);
  const entries = new Map(model.catalog.entries.map(entry => [entry.id, entry])), chosen = new Map();
  for (const decision of decisions) {
    if (!decision || Array.isArray(decision) || Object.keys(decision).some(key => !['entryId', 'status', 'reason', 'evidenceIds'].includes(key))
      || !entries.has(decision.entryId) || chosen.has(decision.entryId) || decision.status !== 'EXCLUDED'
      || typeof decision.reason !== 'string' || !decision.reason.trim() || decision.reason.length > 4000
      || !Array.isArray(decision.evidenceIds) || !decision.evidenceIds.length || decision.evidenceIds.length > 500
      || decision.evidenceIds.some(id => !knownEvidence.has(id))) fail('OUTPUT_CATALOG_DECISION');
    chosen.set(decision.entryId, decision);
  }
  const sourceScenes = new Map();
  for (const node of model.presentation.nodes) {
    if (!sourceScenes.has(node.sourceNodeId)) sourceScenes.set(node.sourceNodeId, new Set());
    sourceScenes.get(node.sourceNodeId).add(node.sceneId);
  }
  return model.catalog.entries.map(entry => {
    const sceneIds = sorted(sourceScenes.get(entry.sourceNodeId) ?? []), packageIds = packages.filter(item => item.sceneIds.some(id => sceneIds.includes(id))).map(item => item.id);
    const base = { entryId: entry.id, sourceNodeId: entry.sourceNodeId, pageId: entry.pageId, name: entry.name, role: entry.role,
      ...(entry.manuscript ? { manuscript: entry.manuscript } : {}), sceneIds, packageIds, evidenceIds: [entry.sourceNodeId] };
    const decision = chosen.get(entry.id);
    if (sceneIds.length) { if (decision) fail('OUTPUT_CATALOG_DECISION'); return { ...base, status: 'INCLUDED' }; }
    if (decision) return { ...base, status: 'EXCLUDED', reason: decision.reason, evidenceIds: sorted(decision.evidenceIds) };
    if (entry.role === 'asset' || entry.manuscript === 'resource' || entry.role === 'component' && !entry.independentBoard) return { ...base, status: 'RESOURCE', reason: 'Explicit catalog role or manuscript classifies this item as a reusable resource.' };
    return { ...base, status: 'UNRESOLVED', reason: 'No scene artifact or explicit evidence-backed exclusion is bound to this catalog entry.' };
  });
}

/** Pure planning only. A PLANNED package has not passed rendered/transport/ZIP budgets. */
export function planOutputPackages(input, options = {}) {
  const { limits, decisions } = optionsFor(options), model = validatedInput(input), dependencies = sceneDependencies(model);
  const assets = assetIndex(model, dependencies), nodes = new Map(model.presentation.nodes.map(node => [node.id, node]));
  const packages = connectedScenes(model).map(sceneIds => {
    const selected = subsetModel(model, sceneIds, dependencies), id = stableId('package', [model.id, sceneIds]);
    const uniqueAssets = new Map(selected.assets.map(asset => [asset.sha256, asset]));
    const summary = { basis: 'MODEL_ONLY', modelBytes: Buffer.byteLength(JSON.stringify(selected)), declaredNodes: selected.presentation.nodes.length,
      nativeNodeLowerBound: selected.presentation.nodes.length + sceneIds.length, reactionCount: selected.actions.filter(action => nativeActionCapability(model, action, nodes).status === 'SUPPORTED').length,
      assetCount: selected.assets.length, uniqueAssetCount: uniqueAssets.size, uniqueImageBytes: [...uniqueAssets.values()].reduce((sum, asset) => sum + asset.bytes, 0) };
    const blockers = [], over = (key, actual, code) => { if (actual > limits[key]) blockers.push({ code, limit: limits[key], observed: actual, basis: 'MODEL_ONLY' }); };
    over('nodeCount', summary.nativeNodeLowerBound, 'OUTPUT_NODE_BUDGET'); over('reactionCount', summary.reactionCount, 'OUTPUT_REACTION_BUDGET');
    over('imageBytes', summary.uniqueImageBytes, 'OUTPUT_IMAGE_BUDGET'); over('assetCount', summary.assetCount, 'OUTPUT_ASSET_COUNT_BUDGET');
    over('singleImageBytes', Math.max(0, ...selected.assets.map(asset => asset.bytes)), 'OUTPUT_SINGLE_IMAGE_BUDGET');
    over('deliveryBytes', summary.modelBytes + summary.uniqueImageBytes, 'OUTPUT_DELIVERY_BUDGET');
    const actionIds = sorted(selected.actions.map(action => action.id)), flowIds = sorted(selected.flows.map(flow => flow.id));
    return { id, sceneIds, nodeIds: sorted(selected.presentation.nodes.map(node => node.id)), componentFamilyIds: sorted(selected.presentation.componentFamilies.map(family => family.id)),
      tokenIds: sorted(selected.tokens.map(token => token.id)), assetIds: sorted(selected.assets.map(asset => asset.id)), actionIds, flowIds,
      catalogEntryIds: sorted(selected.catalog.entries.map(entry => entry.id)), summary,
      budget: { deliveryBytes: { status: 'LOWER_BOUND', value: summary.modelBytes + summary.uniqueImageBytes, limit: limits.deliveryBytes },
        logicalSpecBytes: { status: 'NOT_MEASURED', limit: limits.logicalSpecBytes }, requestBytes: { status: 'NOT_MEASURED', limit: limits.requestBytes },
        imageBytes: { status: 'DECLARED_NOT_CONTENT_VERIFIED', value: summary.uniqueImageBytes, limit: limits.imageBytes },
        nodeCount: { status: 'LOWER_BOUND', value: summary.nativeNodeLowerBound, limit: limits.nodeCount },
        reactionCount: { status: 'COMPILED_FROM_ACTION_GRAPH', value: summary.reactionCount, limit: limits.reactionCount } },
      status: blockers.length ? 'BLOCKED' : 'PLANNED', blockers, minimumConnectedClosure: { sceneIds: [...sceneIds], actionIds: [...actionIds], flowIds: [...flowIds] } };
  });
  const scenarioManifest = model.presentation.scenes.map(scene => {
    const dependency = dependencies.get(scene.id);
    const localActions = model.actions.filter(action => action.source.sceneId === scene.id), packageRecord = packages.find(item => item.sceneIds.includes(scene.id));
    return { sceneId: scene.id, pageId: scene.pageId, sourceBoardId: scene.sourceBoardId, role: scene.role, device: scene.device,
      packageId: packageRecord.id, revision: digest(sceneProjection(model, scene.id)), nodeIds: sorted(dependency.nodeIds), tokenIds: sorted(dependency.tokenIds), assetIds: sorted(dependency.assetIds),
      actionIds: sorted(localActions.map(action => action.id)), status: packageRecord.status, summaryBasis: 'MODEL_ONLY' };
  });
  const catalog = catalogManifest(model, packages, decisions);
  return { schemaVersion: '1.0', modelRevision: digest(model), status: packages.some(item => item.status === 'BLOCKED') ? 'BLOCKED' : 'PLANNED', limits, packages,
    scenarioManifest, assetManifest: assets.map(asset => ({ ...asset, status: asset.sceneIds.length ? 'REFERENCED' : 'UNREFERENCED',
      packageIds: packages.filter(item => item.assetIds.includes(asset.id)).map(item => item.id), verification: 'DECLARED_NOT_CONTENT_VERIFIED' })),
    catalogManifest: catalog, catalogStatus: catalog.some(entry => entry.status === 'UNRESOLVED') ? 'NEEDS_REVIEW' : 'COMPLETE',
    blockers: packages.flatMap(item => item.blockers.map(blocker => ({ packageId: item.id, ...blocker }))) };
}

/** Resolve by stable package identity and rederive the dependency closure. */
export function selectOutputPackage(input, packageRecord) {
  assertEvidenceData(packageRecord);
  const model = validatedInput(input), plan = planOutputPackages(model);
  const id = typeof packageRecord === 'string' ? packageRecord : packageRecord?.id, selected = plan.packages.find(item => item.id === id);
  if (!selected || typeof packageRecord === 'object' && (!Array.isArray(packageRecord.sceneIds) || digest(packageRecord.sceneIds) !== digest(selected.sceneIds))) fail('OUTPUT_PACKAGE');
  return subsetModel(model, selected.sceneIds, sceneDependencies(model));
}
