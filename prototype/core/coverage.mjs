import { validatePrototype } from './model.mjs';

// A mapping is traceability, not evidence that the rendered behavior is correct.
export function coverageReport(input) {
  const model = validatePrototype(input), mapped = new Map();
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
