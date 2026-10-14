import { canonical, digest, validatePrototype } from './model.mjs';

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
  return { theme: model.theme, page: withoutEvidence(page), actions: model.actions.filter(a => a.pageId === page.id).map(withoutEvidence) };
}
export function changedPages(before, after) {
  const old = new Map(before.pages.map(p => [p.id, digest(pageProjection(before, p))])), current = new Map(after.pages.map(p => [p.id, digest(pageProjection(after, p))]));
  const changes = { added: [], removed: [], changed: [], unchanged: [] };
  for (const [id, hash] of current) changes[!old.has(id) ? 'added' : old.get(id) === hash ? 'unchanged' : 'changed'].push(id);
  for (const id of old.keys()) if (!current.has(id)) changes.removed.push(id);
  return changes;
}

/** Merge by stable object IDs, never by array index. No source files are mutated. */
export function mergePrototype(baseInput, generatedInput, editedInput, resolutions = {}) {
  const base = validatePrototype(baseInput), generated = validatePrototype(generatedInput), edited = validatePrototype(editedInput);
  if (base.id !== generated.id || base.id !== edited.id) throw new Error('Incremental merge requires the same project id; pass --id explicitly');
  if (!object(resolutions) || Object.values(resolutions).some(v => !['edited', 'generated'].includes(v))) throw new Error('Resolutions must map conflict paths to edited or generated');
  const conflicts = [], preserved = [], used = new Set();
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
    } else if ([b, e].every(Array.isArray) && [b, e].flat().every(i => object(i) && typeof i.id === 'string')) {
      const bm = new Map(b.map(i => [i.id, i])), em = new Map(e.map(i => [i.id, i]));
      for (const id of new Set([...bm.keys(), ...em.keys()])) recordPreserved(bm.get(id) ?? absent, em.get(id) ?? absent, `${path}/@${escape(id)}`);
      if (!same(b.map(i => i.id), e.map(i => i.id))) preserved.push(`${path}/$order`);
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
    if ([b, g, e].every(Array.isArray) && [b, g, e].flat().every(item => object(item) && typeof item.id === 'string')) {
      const bm = new Map(b.map(i => [i.id, i])), gm = new Map(g.map(i => [i.id, i])), em = new Map(e.map(i => [i.id, i]));
      const result = new Map();
      for (const id of new Set([...bm.keys(), ...gm.keys(), ...em.keys()])) {
        const value = merge(bm.get(id) ?? absent, gm.get(id) ?? absent, em.get(id) ?? absent, `${path}/@${escape(id)}`);
        if (value !== absent) result.set(id, value);
      }
      const common = new Set([...bm.keys()].filter(id => gm.has(id) && em.has(id) && result.has(id)));
      const sequence = list => list.map(i => i.id).filter(id => common.has(id));
      const bo = sequence(b), go = sequence(g), eo = sequence(e);
      let preferred;
      if (!same(bo, go) && !same(bo, eo) && !same(go, eo)) preferred = conflict(`${path}/$order`, bo, go, eo, 'ORDER');
      else preferred = !same(bo, eo) ? e.map(i => i.id) : g.map(i => i.id);
      const order = preferred.filter(id => result.has(id));
      // Insert new IDs relative to their nearest known predecessor.
      for (const list of [g, e]) for (const [index, item] of list.entries()) if (result.has(item.id) && !order.includes(item.id)) {
        const previous = list.slice(0, index).map(i => i.id).reverse().find(id => order.includes(id));
        order.splice(previous ? order.indexOf(previous) + 1 : 0, 0, item.id);
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
  return { model, candidate, conflicts, validationError, preserved, changes: changedPages(edited, candidate), revisions: { base: digest(base), generated: digest(generated), edited: digest(edited) }, status: model ? 'MERGED' : 'NEEDS_RESOLUTION' };
}
