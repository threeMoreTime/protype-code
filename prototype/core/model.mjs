import { createHash } from 'node:crypto';
import { z } from 'zod';

// Business semantics live here; no Figma API, HTML, repository name or selectors.
const id = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,39}$/);
const text = z.string().min(1).max(4000);
const refIds = z.array(id).max(500).default([]);
const source = z.object({ file: text, line: z.number().int().positive().optional(), kind: z.enum(['prd', 'code', 'capture', 'manual']) }).strict();
const evidence = z.array(source).max(100).default([]);
const element = z.object({
  id, kind: z.enum(['heading', 'text', 'field', 'button', 'list']), label: text,
  fieldType: z.enum(['text', 'email', 'number', 'date', 'select', 'checkbox', 'textarea', 'password']).optional(),
  required: z.boolean().optional(), items: z.array(text).max(100).optional(),
  requirementIds: refIds, evidence,
}).strict();
const state = z.object({ id, label: text, kind: z.enum(['default', 'loading', 'error', 'empty', 'success', 'custom']), message: text.optional(), requirementIds: refIds }).strict();
const page = z.object({
  id, title: z.string().min(1).max(200), path: z.string().regex(/^\/(?!\/)[^\s?#]*$/).max(500),
  viewport: z.object({ width: z.number().int().min(280).max(2560), height: z.number().int().min(400).max(2560) }).strict().default({ width: 1280, height: 800 }),
  elements: z.array(element).max(200), states: z.array(state).min(1).max(20), requirementIds: refIds, evidence,
}).strict();
export const PrototypeSchema = z.object({
  schemaVersion: z.literal('1.0'), id, name: z.string().min(1).max(200),
  sources: z.array(z.object({ file: text, kind: source.shape.kind, sha256: z.string().regex(/^[0-9a-f]{64}$/) }).strict()).max(1000),
  requirements: z.array(z.object({ id, text, evidence }).strict()).max(2000),
  pages: z.array(page).min(1).max(100),
  actions: z.array(z.object({
    id, pageId: id, elementId: id, fromState: id, targetPageId: id, targetState: id,
    trigger: z.enum(['click', 'submit', 'timeout']).default('click'), delaySeconds: z.number().min(0.1).max(60).optional(), requirementIds: refIds,
  }).strict()).max(2000),
  flows: z.array(z.object({ id, name: z.string().min(1).max(200), startPageId: id, startState: id, actionIds: refIds }).strict()).max(100),
  theme: z.object({ primary: z.string().regex(/^#[0-9a-fA-F]{6}$/), fontFamily: z.string().min(1).max(80) }).strict().default({ primary: '#315bea', fontFamily: 'Noto Sans SC' }),
  assumptions: z.array(text).max(500).default([]),
  diagnostics: z.array(z.object({ code: id, severity: z.enum(['info', 'warning', 'error']), message: text, source: source.optional(), requirementId: id.optional() }).strict()).max(3000).default([]),
}).strict();

export function validatePrototype(input) {
  const model = PrototypeSchema.parse(input);
  if (model.pages.reduce((n, p) => n + p.states.length, 0) > 200 || model.pages.reduce((n, p) => n + p.states.length * p.elements.length, 0) > 6000) throw new Error('Prototype render budget exceeded; split the project');
  const unique = (items, label, key = 'id') => {
    const values = items.map(item => item[key]);
    if (new Set(values).size !== values.length) throw new Error(`Duplicate ${label}`);
  };
  for (const name of ['pages', 'actions', 'flows', 'requirements']) unique(model[name], name);
  unique(model.pages, 'page path', 'path');
  const pages = new Map(model.pages.map(p => [p.id, p]));
  const requirements = new Set(model.requirements.map(r => r.id));
  const checkRefs = object => { for (const ref of object.requirementIds ?? []) if (!requirements.has(ref)) throw new Error(`Unknown requirement ${ref}`); };
  const pageState = (pid, sid) => {
    if (!pages.get(pid)?.states.some(s => s.id === sid)) throw new Error(`Unknown page/state ${pid}/${sid}`);
  };
  for (const p of model.pages) {
    unique(p.elements, `element in ${p.id}`); unique(p.states, `state in ${p.id}`);
    if (p.states.filter(s => s.kind === 'default').length !== 1 || p.states.find(s => s.kind === 'default').id !== 'default') throw new Error(`Page ${p.id} needs exactly one default state with id default`);
    [p, ...p.elements, ...p.states].forEach(checkRefs);
  }
  const triggers = new Set();
  for (const a of model.actions) {
    pageState(a.pageId, a.fromState); pageState(a.targetPageId, a.targetState); checkRefs(a);
    const origin = pages.get(a.pageId).elements.find(e => e.id === a.elementId);
    if (!origin || origin.kind !== 'button') throw new Error(`Action ${a.id} requires a button element`);
    if (a.trigger === 'timeout' && a.delaySeconds === undefined) throw new Error(`Action ${a.id} needs delaySeconds`);
    const trigger = `${a.pageId}/${a.fromState}/${a.trigger === 'timeout' ? 'timeout' : a.elementId}`;
    if (triggers.has(trigger)) throw new Error(`Ambiguous action ${trigger}`);
    triggers.add(trigger);
  }
  const actions = new Map(model.actions.map(a => [a.id, a]));
  for (const flow of model.flows) {
    pageState(flow.startPageId, flow.startState);
    let current = `${flow.startPageId}/${flow.startState}`;
    for (const aid of flow.actionIds) {
      const action = actions.get(aid);
      if (!action || current !== `${action.pageId}/${action.fromState}`) throw new Error(`Broken flow ${flow.id} at ${aid}`);
      current = `${action.targetPageId}/${action.targetState}`;
    }
  }
  return model;
}

export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
export const digest = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : canonical(value)).digest('hex');
export const stableId = (prefix, value) => `${prefix}-${digest(value).slice(0, 16)}`;
