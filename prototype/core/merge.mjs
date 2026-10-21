import { canonical, digest, validatePrototype, assertPrototypePhase } from './model.mjs';
import { assertEvidenceData } from './design-catalog.mjs';

const absent = Symbol('absent');
const same = (a, b) => a === absent || b === absent ? a === b : canonical(a) === canonical(b);
const clone = value => value === absent ? absent : structuredClone(value);
const object = value => value !== absent && value !== null && typeof value === 'object' && !Array.isArray(value);
const pack = value => value === absent ? { present: false } : { present: true, value };
const escape = key => key.replace(/~/g, '~0').replace(/\//g, '~1');
const withoutEvidence = value => {
  if (Array.isArray(value)) return value.map(withoutEvidence);
  if (object(value)) return Object.fromEntries(Object.entries(value).filter(([key]) => !['evidence', 'requirementIds'].includes(key)).map(([k, v]) => [k, withoutEvidence(v)]));
  return value;
};
export function pageProjection(model, page) {
  assertPrototypePhase(model, 5);
  return { theme: model.theme, page: withoutEvidence(page), actions: model.actions.filter(a => a.pageId === page.id).map(withoutEvidence) };
}
export function changedPages(before, after) {
  assertPrototypePhase(before, 5); assertPrototypePhase(after, 5);
  const old = new Map(before.pages.map(p => [p.id, digest(pageProjection(before, p))])), current = new Map(after.pages.map(p => [p.id, digest(pageProjection(after, p))]));
  const changes = { added: [], removed: [], changed: [], unchanged: [] };
  for (const [id, hash] of current) changes[!old.has(id) ? 'added' : old.get(id) === hash ? 'unchanged' : 'changed'].push(id);
  for (const id of old.keys()) if (!current.has(id)) changes.removed.push(id);
  return changes;
}

function presentationIndex(model) {
  assertEvidenceData(model);
  if (model.schemaVersion !== '1.1') throw new Error('Scene projections require PrototypeSpec 1.1');
  const nodes = new Map(model.presentation.nodes.map(node => [node.id, node]));
  const children = new Map(), families = new Map();
  for (const node of nodes.values()) {
    if (!children.has(node.parentId)) children.set(node.parentId, []);
    children.get(node.parentId).push(node.id);
  }
  for (const family of model.presentation.componentFamilies) for (const member of family.memberNodeIds) families.set(member, family);
  return { model, nodes, children, families, scenes: new Map(model.presentation.scenes.map(scene => [scene.id, scene])),
    catalog: new Map(model.catalog.entries.map(entry => [entry.id, entry])),
    sourceEntries: new Map(model.catalog.entries.map(entry => [entry.sourceNodeId, entry])) };
}

function projectScene(index, sceneId) {
  const { model, nodes, children, families } = index, scene = index.scenes.get(sceneId);
  if (!scene) throw new Error(`PRESENTATION_SCENE_REFERENCE: ${sceneId}`);
  const nodeIds = new Set(), familyIds = new Set(), missing = new Set(), pending = [scene.rootNodeId];
  while (pending.length) {
    const id = pending.pop();
    if (nodeIds.has(id)) continue;
    nodeIds.add(id);
    const node = nodes.get(id);
    if (!node) { missing.add(`node:${id}`); continue; }
    pending.push(...(children.get(id) ?? []));
    if (node.componentId) pending.push(node.componentId);
    const family = families.get(id);
    if (family && !familyIds.has(family.id)) { familyIds.add(family.id); pending.push(...family.memberNodeIds); }
  }
  const selectedNodes = model.presentation.nodes.filter(node => nodeIds.has(node.id));
  const assetIds = new Set(), tokenIds = new Set(), evidenceIds = new Set();
  const inspect = [...selectedNodes];
  while (inspect.length) {
    const value = inspect.pop();
    if (!value || typeof value !== 'object') continue;
    if (Array.isArray(value)) { inspect.push(...value); continue; }
    if (typeof value.assetId === 'string') assetIds.add(value.assetId);
    for (const id of value.tokenIds ?? []) tokenIds.add(id);
    inspect.push(...Object.values(value));
  }
  const actions = model.actions.filter(action => action.source.sceneId === scene.id);
  const behaviors = (model.presentation.behaviors ?? []).filter(behavior => behavior.source.sceneId === scene.id);
  const actionIds = new Set(actions.map(action => action.id));
  const flows = model.flows.filter(flow => flow.entrySceneId === scene.id || flow.actionIds.some(id => actionIds.has(id)))
    .map(flow => ({ ...flow, actionIds: flow.actionIds.filter(id => actionIds.has(id)) }));
  for (const item of [...selectedNodes, ...actions, ...behaviors]) {
    if (item.sourceNodeId) evidenceIds.add(item.sourceNodeId);
    for (const id of item.evidenceIds ?? []) evidenceIds.add(id);
  }
  const entries = new Set(), entryPending = [scene.sourceBoardId];
  for (const node of selectedNodes) {
    const entry = index.sourceEntries.get(node.sourceNodeId);
    if (entry) entryPending.push(entry.id);
  }
  while (entryPending.length) {
    const id = entryPending.pop();
    if (entries.has(id)) continue;
    entries.add(id);
    const entry = index.catalog.get(id);
    if (!entry) { missing.add(`catalog:${id}`); continue; }
    evidenceIds.add(entry.sourceNodeId);
    if (entry.parentId !== null) entryPending.push(entry.parentId);
  }
  const selectedEntries = model.catalog.entries.filter(entry => entries.has(entry.id));
  const sourcePages = new Set(selectedEntries.map(entry => entry.pageId));
  const page = model.pages.find(item => item.id === scene.pageId);
  if (!page) missing.add(`page:${scene.pageId}`);
  for (const id of assetIds) if (!model.assets.some(asset => asset.id === id)) missing.add(`asset:${id}`);
  for (const id of tokenIds) if (!model.tokens.some(token => token.id === id)) missing.add(`token:${id}`);
  // sceneIds is an ownership allowance, not a rendering dependency. An asset
  // declaration alone must not invalidate scenes that do not use its bytes.
  const assets = model.assets.filter(asset => assetIds.has(asset.id)).map(({ sceneIds: _sceneIds, ...asset }) => asset);
  return structuredClone({ schemaVersion: '1.1', projectId: model.id, scene,
    ...(page ? { page: { ...page, states: page.states.filter(state => state.id === scene.stateId) } } : {}),
    catalog: { pages: model.catalog.pages.filter(item => sourcePages.has(item.id)), entries: selectedEntries },
    presentation: { nodes: selectedNodes, componentFamilies: model.presentation.componentFamilies.filter(family => familyIds.has(family.id)),
      ...(model.presentation.behaviors === undefined ? {} : { behaviors }) },
    tokens: model.tokens.filter(token => tokenIds.has(token.id)), assets, actions, flows, evidenceIds: [...evidenceIds].sort(),
    ...(missing.size ? { missingReferences: [...missing].sort() } : {}) });
}

/** A scene-local dependency projection; global model/source revisions are omitted. */
export function sceneProjection(model, sceneOrId) {
  const index = presentationIndex(model);
  assertEvidenceData(sceneOrId);
  return projectScene(index, typeof sceneOrId === 'string' ? sceneOrId : sceneOrId.id);
}

export function changedScenes(before, after) {
  const oldIndex = presentationIndex(before), newIndex = presentationIndex(after);
  const old = new Map([...oldIndex.scenes.keys()].map(id => [id, digest(projectScene(oldIndex, id))]));
  const current = new Map([...newIndex.scenes.keys()].map(id => [id, digest(projectScene(newIndex, id))]));
  const changes = { added: [], removed: [], changed: [], unchanged: [] };
  for (const [id, hash] of current) changes[!old.has(id) ? 'added' : old.get(id) === hash ? 'unchanged' : 'changed'].push(id);
  for (const id of old.keys()) if (!current.has(id)) changes.removed.push(id);
  return changes;
}

/** Merge by stable object IDs, never by array index. No source files are mutated. */
export function mergePrototype(baseInput, generatedInput, editedInput, resolutions = {}) {
  const versions = [baseInput, generatedInput, editedInput].map(input => {
    const version = input && typeof input === 'object' ? Object.getOwnPropertyDescriptor(input, 'schemaVersion') : undefined;
    if (version?.get || version?.set) throw new Error('PROTOTYPE_DATA_ONLY');
    return version?.value;
  });
  if (versions.includes('1.1') && versions.some(version => version !== '1.1')) throw new Error('Cannot mix PrototypeSpec 1.0 and 1.1');
  if (!versions.includes('1.1')) for (const input of [baseInput, generatedInput, editedInput]) assertPrototypePhase(input, 5);
  const base = validatePrototype(baseInput), generated = validatePrototype(generatedInput), edited = validatePrototype(editedInput);
  if (base.id !== generated.id || base.id !== edited.id) throw new Error('Incremental merge requires the same project id; pass --id explicitly');
  assertEvidenceData(resolutions);
  if (!object(resolutions) || Object.values(resolutions).some(v => !['edited', 'generated'].includes(v))) throw new Error('Resolutions must map conflict paths to edited or generated');
  const conflicts = [], preserved = [], used = new Set();
  const arrayIdentity = (lists, path) => {
    if (!lists.every(Array.isArray)) return null;
    const all = lists.flat();
    if (all.every(item => object(item) && typeof item.id === 'string')) return item => item.id;
    if (base.schemaVersion !== '1.1') return null;
    const keyed = /^\/presentation\/nodes\/@[^/]+\/overrides$/.test(path) ? 'nodeId'
      : /^\/presentation\/componentFamilies\/@[^/]+\/axes$/.test(path) ? 'name' : null;
    if (keyed && all.every(item => object(item) && typeof item[keyed] === 'string')) return item => item[keyed];
    const references = path === '/evidenceIds' || /^\/assets\/@[^/]+\/sceneIds$/.test(path)
      || /^\/presentation\/componentFamilies\/@[^/]+\/memberNodeIds$/.test(path)
      || /^\/(?:actions\/@[^/]+|presentation\/(?:nodes|behaviors)\/@[^/]+)\/evidenceIds$/.test(path)
      || path.startsWith('/presentation/nodes/@') && path.endsWith('/tokenIds');
    if (references && all.every(item => typeof item === 'string') && lists.every(list => new Set(list).size === list.length)) return item => item;
    return null;
  };
  function conflict(path, b, g, e, kind = 'EDIT_EDIT') {
    const choice = Object.hasOwn(resolutions, path) ? resolutions[path] : null;
    if (choice) used.add(path);
    conflicts.push({ path, kind, base: pack(b), generated: pack(g), edited: pack(e), resolution: choice ?? 'UNRESOLVED' });
    return clone(choice === 'generated' ? g : e);
  }
  function recordPreserved(b, e, path) {
    if (same(b, e)) return;
    if (object(b) && object(e)) {
      for (const key of new Set([...Object.keys(b), ...Object.keys(e)])) recordPreserved(Object.hasOwn(b, key) ? b[key] : absent, Object.hasOwn(e, key) ? e[key] : absent, `${path}/${escape(key)}`);
    } else if (arrayIdentity([b, e], path)) {
      const key = arrayIdentity([b, e], path), bm = new Map(b.map(i => [key(i), i])), em = new Map(e.map(i => [key(i), i]));
      for (const id of new Set([...bm.keys(), ...em.keys()])) recordPreserved(bm.get(id) ?? absent, em.get(id) ?? absent, `${path}/@${escape(id)}`);
      if (!same(b.map(key), e.map(key))) preserved.push(`${path}/$order`);
    } else preserved.push(path);
  }
  function merge(b, g, e, path) {
    if (same(g, e)) return clone(e);
    if (same(e, b)) return clone(g);
    if (same(g, b)) { recordPreserved(b, e, path); return clone(e); }
    if (g === absent || e === absent || b === absent) return conflict(path, b, g, e, b === absent ? 'ADD_ADD' : 'DELETE_EDIT');
    if (object(b) && object(g) && object(e)) {
      const result = {};
      for (const key of new Set([...Object.keys(b), ...Object.keys(g), ...Object.keys(e)])) {
        const value = merge(Object.hasOwn(b, key) ? b[key] : absent, Object.hasOwn(g, key) ? g[key] : absent, Object.hasOwn(e, key) ? e[key] : absent, `${path}/${escape(key)}`);
        if (value !== absent) result[key] = value;
      }
      return result;
    }
    const key = arrayIdentity([b, g, e], path);
    if (key) {
      const bm = new Map(b.map(i => [key(i), i])), gm = new Map(g.map(i => [key(i), i])), em = new Map(e.map(i => [key(i), i]));
      const result = new Map();
      for (const id of new Set([...bm.keys(), ...gm.keys(), ...em.keys()])) {
        const value = merge(bm.get(id) ?? absent, gm.get(id) ?? absent, em.get(id) ?? absent, `${path}/@${escape(id)}`);
        if (value !== absent) result.set(id, value);
      }
      const common = new Set([...bm.keys()].filter(id => gm.has(id) && em.has(id) && result.has(id)));
      const sequence = list => list.map(key).filter(id => common.has(id));
      const bo = sequence(b), go = sequence(g), eo = sequence(e);
      let preferred;
      if (!same(bo, go) && !same(bo, eo) && !same(go, eo)) preferred = conflict(`${path}/$order`, bo, go, eo, 'ORDER');
      else preferred = !same(bo, eo) ? e.map(key) : g.map(key);
      const order = preferred.filter(id => result.has(id));
      // Insert new IDs relative to their nearest known predecessor.
      for (const list of [g, e]) for (const [index, item] of list.entries()) if (result.has(key(item)) && !order.includes(key(item))) {
        const previous = list.slice(0, index).map(key).reverse().find(id => order.includes(id));
        order.splice(previous ? order.indexOf(previous) + 1 : 0, 0, key(item));
      }
      return order.map(id => result.get(id));
    }
    return conflict(path, b, g, e);
  }
  const candidate = merge(base, generated, edited, '');
  for (const path of Object.keys(resolutions)) if (!used.has(path)) throw new Error(`Stale or unknown conflict resolution: ${path}`);
  const unresolved = conflicts.filter(c => c.resolution === 'UNRESOLVED');
  let model = null, validationError = null;
  try { const valid = validatePrototype(candidate); if (!unresolved.length) model = valid; }
  catch (error) { validationError = error.message; }
  return { model, candidate, conflicts, validationError, preserved, changes: base.schemaVersion === '1.1' ? changedScenes(edited, candidate) : changedPages(edited, candidate), revisions: { base: digest(base), generated: digest(generated), edited: digest(edited) }, status: model ? 'MERGED' : 'NEEDS_RESOLUTION' };
}
