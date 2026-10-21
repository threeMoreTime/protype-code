import { validatePrototype, assertPrototypePhase } from './model.mjs';
import { compilePresentation } from './presentation.mjs';
import { validateInteractionGraph } from './interactions.mjs';
import { compileInteractionCapabilities } from './interaction-capabilities.mjs';
import { assertEvidenceData } from './design-catalog.mjs';

function presentationCatalog(model, supplied) {
  if (supplied === undefined) return model.catalog.entries.map(entry => ({ status: 'UNRESOLVED', entryId: entry.id }));
  try { assertEvidenceData(supplied); } catch { throw new Error('COVERAGE_CATALOG_DATA'); }
  const byId = new Map(model.catalog.entries.map(entry => [entry.id, entry])), seen = new Set();
  const evidence = new Set([...model.evidenceIds, ...model.catalog.entries.map(e => e.sourceNodeId), ...model.catalog.pages.map(p => p.sourceNodeId)]);
  const bound = new Map();
  for (const node of model.presentation.nodes) { if (!bound.has(node.sourceNodeId)) bound.set(node.sourceNodeId, new Set()); bound.get(node.sourceNodeId).add(node.sceneId); }
  if (!Array.isArray(supplied) || supplied.length !== byId.size) throw new Error('COVERAGE_CATALOG_COMPLETENESS');
  for (const entry of supplied) {
    const original = byId.get(entry?.entryId);
    if (!original || seen.has(entry.entryId) || entry.sourceNodeId !== original.sourceNodeId || !['INCLUDED', 'RESOURCE', 'EXCLUDED', 'UNRESOLVED'].includes(entry.status)
      || !Array.isArray(entry.evidenceIds) || !entry.evidenceIds.length || entry.evidenceIds.some(id => !evidence.has(id))) throw new Error('COVERAGE_CATALOG_BINDING');
    seen.add(entry.entryId);
    if (entry.status !== 'INCLUDED' && (typeof entry.reason !== 'string' || !entry.reason.trim())) throw new Error('COVERAGE_CATALOG_REASON');
    if (entry.status === 'INCLUDED' && (!Array.isArray(entry.sceneIds) || !entry.sceneIds.length || entry.sceneIds.some(id => !bound.get(original.sourceNodeId)?.has(id)))) throw new Error('COVERAGE_CATALOG_SCENES');
    if (entry.status === 'RESOURCE' && !(original.role === 'asset' || original.manuscript === 'resource' || original.role === 'component' && !original.independentBoard)) throw new Error('COVERAGE_CATALOG_RESOURCE');
    if (entry.status === 'EXCLUDED' && bound.has(original.sourceNodeId)) throw new Error('COVERAGE_CATALOG_EXCLUSION');
  }
  return supplied;
}

// A mapping is traceability, not evidence that the rendered behavior is correct.
export function coverageReport(input, options = {}) {
  const model = validatePrototype(input);
  if (model.schemaVersion === '1.1') {
    const compiled = compilePresentation(model), graph = validateInteractionGraph(model);
    const mapped = new Set(model.pages.flatMap(p => [p, ...p.states].flatMap(value => value.requirementIds)));
    const unresolved = model.requirements.filter(r => !mapped.has(r.id)).length;
    const catalog = presentationCatalog(model, options.catalogManifest);
    const inventoryCounts = catalog.reduce((counts, entry) => { counts[entry.status] = (counts[entry.status] ?? 0) + 1; return counts; }, {});
    const capabilities = compileInteractionCapabilities(model), capabilityCounts = { html: {}, figma: {} };
    for (const item of [...capabilities.actions, ...capabilities.behaviors]) for (const platform of ['html', 'figma']) {
      const status = item[platform].status; capabilityCounts[platform][status] = (capabilityCounts[platform][status] ?? 0) + 1;
    }
    return { status: 'NEEDS_REVIEW', counts: { requirements: model.requirements.length, mapped: model.requirements.length - unresolved, unresolved,
      pages: model.pages.length, states: model.pages.reduce((n, p) => n + p.states.length, 0), scenes: compiled.scenes.length, nodes: compiled.nodes.length, actions: model.actions.length },
      requirements: model.requirements.map(r => ({ ...r, status: mapped.has(r.id) ? 'mapped' : 'unresolved' })),
      visual: { status: options.visualRendered ? 'PREVIEW' : 'NOT_RENDERED', diagnostics: compiled.diagnostics, diagnosticCounts: compiled.diagnosticCounts },
      interactionGraph: { status: graph.status, diagnostics: graph.diagnostics }, assumptions: model.assumptions,
      dimensions: { inventory: { status: inventoryCounts.UNRESOLVED ? 'NEEDS_REVIEW' : 'ACCOUNTED', total: catalog.length, counts: inventoryCounts },
        visualGeneration: { status: options.visualRendered ? 'PREVIEW' : 'NOT_GENERATED', comparison: 'NOT_RUN' },
        dualInteractionCapability: { status: 'CAPABILITY_COMPILED', counts: capabilityCounts, execution: 'NOT_RUN' },
        automaticTests: { status: 'NOT_RUN' }, realFigma: { status: 'NOT_RUN' }, humanDifferences: { status: 'NOT_MEASURED' } },
      verification: { schema: 'PASS', visualComparison: 'NOT_RUN', interactionRuntime: options.interactionRuntime ? 'AVAILABLE_NOT_RUN' : 'NOT_GENERATED', incremental: 'SUPPORTED_OFFLINE',
        semanticCorrectness: 'MANUAL_REVIEW', figmaNative: 'NOT_RUN', humanCorrections: 'NOT_MEASURED' } };
  }
  const mapped = new Map();
  const collect = (object, location) => { for (const id of object.requirementIds ?? []) mapped.set(id, [...mapped.get(id) ?? [], location]); };
  for (const page of model.pages) {
    collect(page, `page:${page.id}`);
    page.elements.forEach(e => collect(e, `element:${page.id}/${e.id}`));
    page.states.forEach(s => collect(s, `state:${page.id}/${s.id}`));
  }
  model.actions.forEach(a => collect(a, `action:${a.id}`));
  const requirements = model.requirements.map(r => ({ id: r.id, text: r.text, status: mapped.has(r.id) ? 'mapped' : 'unresolved', locations: mapped.get(r.id) ?? [], evidence: r.evidence }));
  const unboundButtons = model.pages.flatMap(p => p.elements.filter(e => e.kind === 'button' && !model.actions.some(a => a.pageId === p.id && a.elementId === e.id)).map(e => `${p.id}/${e.id}`));
  const reached = new Set(model.flows.map(f => `${f.startPageId}/${f.startState}`));
  let changed = true;
  while (changed) { changed = false; for (const a of model.actions) if (reached.has(`${a.pageId}/${a.fromState}`) && !reached.has(`${a.targetPageId}/${a.targetState}`)) { reached.add(`${a.targetPageId}/${a.targetState}`); changed = true; } }
  const unreachableStates = model.pages.flatMap(p => p.states.map(s => `${p.id}/${s.id}`)).filter(k => !reached.has(k));
  const unresolved = requirements.filter(r => r.status === 'unresolved').length;
  return {
    status: unresolved || unboundButtons.length || model.diagnostics.some(d => d.severity !== 'info') ? 'NEEDS_REVIEW' : 'READY_FOR_REVIEW',
    counts: { requirements: requirements.length, mapped: requirements.length - unresolved, unresolved, pages: model.pages.length, states: model.pages.reduce((n, p) => n + p.states.length, 0), actions: model.actions.length },
    requirements, unboundButtons, unreachableStates, assumptions: model.assumptions, diagnostics: model.diagnostics,
    verification: { schema: 'PASS', flowContinuity: 'PASS', semanticCorrectness: 'MANUAL_REVIEW', figmaNative: 'NOT_RUN', humanCorrections: 'NOT_MEASURED' },
  };
}
