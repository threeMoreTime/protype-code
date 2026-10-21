import { z } from 'zod';

export const designEvidenceId = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,159}$/)
  .refine(value => !value.split(/[.:/]/).some(part => ['__proto__', 'prototype', 'constructor'].includes(part)), 'Reserved ID');
const name = z.string().max(4000);
const page = z.object({ id: designEvidenceId, sourceNodeId: designEvidenceId, name, internalOnly: z.boolean() }).strict();
const entry = z.object({
  id: designEvidenceId, sourceNodeId: designEvidenceId, pageId: designEvidenceId,
  parentId: designEvidenceId.nullable(), name,
  role: z.enum(['screen', 'section', 'module', 'component', 'asset', 'annotation']),
  independentBoard: z.boolean(), hidden: z.boolean(),
  boardKind: z.string().max(160).optional(),
  manuscript: z.enum(['formal', 'alternative', 'draft', 'reference', 'resource', 'cover']).optional(),
  variant: z.string().max(1000).optional(), state: z.string().max(1000).optional(),
  evidenceText: z.string().max(16000).optional(),
}).strict();
export const DesignCatalogSchema = z.object({ pages: z.array(page).min(1).max(1000), entries: z.array(entry).max(25000) }).strict();

// This also guards direct library callers: inspect descriptors before reading
// values so an evidence-shaped object cannot execute a getter during parsing.
export function assertEvidenceData(value, { maxValues = 1000000, maxDepth = 64 } = {}) {
  const pending = [{ value, depth: 0 }], seen = new WeakSet();
  let count = 0;
  while (pending.length) {
    const item = pending.pop(), data = item.value;
    if (++count > maxValues || item.depth > maxDepth) throw new Error('EVIDENCE_DATA_LIMIT');
    if (data === null || ['string', 'boolean'].includes(typeof data)) continue;
    if (typeof data === 'number' && Number.isFinite(data)) continue;
    if (!data || typeof data !== 'object') throw new Error('EVIDENCE_DATA_ONLY');
    if (seen.has(data)) throw new Error('EVIDENCE_DATA_CYCLE_OR_ALIAS');
    seen.add(data);
    const prototype = Object.getPrototypeOf(data);
    if (Array.isArray(data) ? prototype !== Array.prototype : ![Object.prototype, null].includes(prototype)) throw new Error('EVIDENCE_DATA_ONLY');
    const descriptors = Object.getOwnPropertyDescriptors(data);
    if (Reflect.ownKeys(descriptors).some(key => typeof key !== 'string')) throw new Error('EVIDENCE_DATA_ONLY');
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (Array.isArray(data) && key === 'length') continue;
      if (['__proto__', 'prototype', 'constructor'].includes(key) || descriptor.get || descriptor.set || !descriptor.enumerable) throw new Error('EVIDENCE_DATA_ONLY');
      if (Array.isArray(data) && !/^(0|[1-9]\d*)$/.test(key)) throw new Error('EVIDENCE_DATA_ONLY');
      pending.push({ value: descriptor.value, depth: item.depth + 1 });
    }
  }
}

export function evidenceRecordMap(records, label, key = 'id') {
  const map = new Map();
  for (const record of records) {
    if (map.has(record[key])) throw new Error(`EVIDENCE_DUPLICATE: ${label}`);
    map.set(record[key], record);
  }
  return map;
}

export function assertEvidenceAcyclic(edges, label) {
  const complete = new Set();
  for (const start of edges.keys()) {
    if (complete.has(start)) continue;
    const active = new Set(), pending = [{ id: start, exit: false }];
    while (pending.length) {
      const { id, exit } = pending.pop();
      if (exit) { active.delete(id); complete.add(id); continue; }
      if (active.has(id)) throw new Error(`EVIDENCE_CYCLE: ${label}`);
      if (complete.has(id)) continue;
      active.add(id); pending.push({ id, exit: true });
      for (const target of edges.get(id) ?? []) pending.push({ id: target, exit: false });
    }
  }
}

export function validateDesignCatalog(input) {
  assertEvidenceData(input);
  const parsed = DesignCatalogSchema.safeParse(input);
  if (!parsed.success) throw new Error(`EVIDENCE_CATALOG_SCHEMA: ${parsed.error.issues.slice(0, 5).map(issue => `${issue.path.join('.')}: ${issue.code}`).join('; ')}`);
  const catalog = parsed.data;
  const pages = evidenceRecordMap(catalog.pages, 'catalog pages');
  evidenceRecordMap(catalog.pages, 'catalog page source IDs', 'sourceNodeId');
  const entries = evidenceRecordMap(catalog.entries, 'catalog entries');
  const sources = evidenceRecordMap(catalog.entries, 'catalog entry source IDs', 'sourceNodeId');
  for (const page of pages.values()) if (entries.has(page.id) || sources.has(page.sourceNodeId)) throw new Error('EVIDENCE_DUPLICATE: page/entry identity');
  const edges = new Map();
  for (const entry of catalog.entries) {
    if (!pages.has(entry.pageId)) throw new Error('EVIDENCE_CATALOG_PAGE');
    if (entry.parentId === entry.pageId) entry.parentId = null;
    if (entry.parentId !== null) {
      const parent = entries.get(entry.parentId);
      if (!parent) throw new Error('EVIDENCE_CATALOG_PARENT');
      if (parent.pageId !== entry.pageId) throw new Error('EVIDENCE_CATALOG_PAGE_MISMATCH');
    }
    edges.set(entry.id, entry.parentId === null ? [] : [entry.parentId]);
  }
  assertEvidenceAcyclic(edges, 'catalog parent');
  return catalog;
}
