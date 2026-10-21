import { z } from 'zod';
import { assertEvidenceData, designEvidenceId } from './design-catalog.mjs';

const id = designEvidenceId;
const trigger = z.discriminatedUnion('type', [
  z.object({ type: z.literal('timeout'), delayMs: z.number().int().min(0).max(3600000) }).strict(),
  ...['click', 'submit', 'hover', 'mouse-enter', 'mouse-leave', 'focus', 'blur'].map(type => z.object({ type: z.literal(type) }).strict()),
]);
const componentState = z.object({ type: z.literal('component-state'), nodeId: id, stateNodeId: id }).strict();
export const ActionSchema = z.object({
  id, source: z.object({ sceneId: id, nodeId: id }).strict(), trigger,
  effect: z.discriminatedUnion('type', [
    z.object({ type: z.literal('navigate'), sceneId: id }).strict(),
    z.object({ type: z.literal('change-state'), nodeId: id, stateNodeId: id }).strict(),
    z.object({ type: z.literal('clipboard'), text: z.string().max(16000) }).strict(),
    z.object({ type: z.literal('unresolved'), reason: z.string().min(1).max(4000) }).strict(),
  ]),
  evidenceIds: z.array(id).max(500).default([]), guard: componentState.optional(),
}).strict();
export const FlowSchema = z.object({
  id, name: z.string().min(1).max(200), entrySceneId: id, actionIds: z.array(id).max(2000),
}).strict();
const graphSchema = z.object({ actions: z.array(ActionSchema).max(30000), flows: z.array(FlowSchema).max(100) }).strict();
const referencesSchema = z.object({
  scenes: z.array(z.object({ id, role: z.enum(['screen', 'reference']) }).strict()).max(2000),
  nodes: z.array(z.object({ id, sceneId: id, kind: z.enum(['frame', 'text', 'shape', 'image', 'vector', 'component', 'instance']), componentId: id.optional() }).strict()).max(25000),
  componentFamilies: z.array(z.object({ id, memberNodeIds: z.array(id).min(1).max(25000) }).strict()).max(25000),
}).strict();

function parse(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success) throw new Error(`INTERACTION_SCHEMA: ${result.error.issues.slice(0, 5).map(issue => `${issue.path.join('.')}: ${issue.code}`).join('; ')}`);
  return result.data;
}
function uniqueMap(records, label) {
  const result = new Map();
  for (const record of records) {
    if (result.has(record.id)) throw new Error(`INTERACTION_DUPLICATE: ${label}`);
    result.set(record.id, record);
  }
  return result;
}

// This validates declared, finite action sequences. It does not execute effects
// or infer navigation from annotations, component variants, or clipboard text.
export function validateInteractionGraph(model) {
  assertEvidenceData(model);
  const { actions, flows } = parse(graphSchema, { actions: model.actions, flows: model.flows });
  const presentation = model.presentation;
  if (!presentation || !Array.isArray(presentation.scenes) || !Array.isArray(presentation.nodes) || !Array.isArray(presentation.componentFamilies)) throw new Error('INTERACTION_SCHEMA: presentation');
  const references = parse(referencesSchema, {
    scenes: presentation.scenes.map(scene => ({ id: scene.id, role: scene.role })),
    nodes: presentation.nodes.map(node => ({ id: node.id, sceneId: node.sceneId, kind: node.kind, ...(node.componentId === undefined ? {} : { componentId: node.componentId }) })),
    componentFamilies: presentation.componentFamilies.map(family => ({ id: family.id, memberNodeIds: family.memberNodeIds })),
  });
  const scenes = uniqueMap(references.scenes, 'scene'), nodes = uniqueMap(references.nodes, 'node');
  const families = uniqueMap(references.componentFamilies, 'component family'), actionMap = uniqueMap(actions, 'action');
  uniqueMap(flows, 'flow');
  const familyByMember = new Map();
  for (const family of families.values()) {
    for (const memberId of family.memberNodeIds) {
      if (familyByMember.has(memberId) || nodes.get(memberId)?.kind !== 'component') throw new Error('INTERACTION_COMPONENT_FAMILY');
      familyByMember.set(memberId, family.id);
    }
  }
  let evidenceIds;
  if (model.evidenceIds !== undefined) {
    const ids = parse(z.array(id).max(100000), model.evidenceIds);
    evidenceIds = new Set(ids);
    if (evidenceIds.size !== ids.length) throw new Error('INTERACTION_DUPLICATE: evidence');
  }
  const componentStateOf = node => {
    if (!node || !['instance', 'component'].includes(node.kind)) throw new Error('INTERACTION_COMPONENT');
    const stateId = node.kind === 'instance' ? node.componentId : node.id;
    const master = nodes.get(stateId);
    if (!master || master.kind !== 'component') throw new Error('INTERACTION_COMPONENT');
    if (master.sceneId !== node.sceneId) throw new Error('INTERACTION_SCENE_BOUNDARY');
    return stateId;
  };
  for (const node of nodes.values()) {
    if (!scenes.has(node.sceneId)) throw new Error('INTERACTION_NODE_SCENE');
    if (node.kind === 'instance') componentStateOf(node);
  }
  const stateReference = (reference, sourceSceneId) => {
    const node = nodes.get(reference.nodeId), state = nodes.get(reference.stateNodeId);
    if (!node || !state) throw new Error('INTERACTION_COMPONENT');
    if (node.sceneId !== sourceSceneId || state.sceneId !== sourceSceneId) throw new Error('INTERACTION_SCENE_BOUNDARY');
    const currentStateId = componentStateOf(node);
    const familyId = familyByMember.get(currentStateId);
    if (!familyId || state.kind !== 'component' || familyByMember.get(state.id) !== familyId) throw new Error('INTERACTION_STATE_FAMILY');
  };
  const diagnostics = [];
  let omittedDiagnostics = 0;
  const diagnostic = (code, message, refs) => {
    if (diagnostics.length < 2999) diagnostics.push({ code, severity: 'warning', message, ...(refs?.length ? { evidenceIds: refs } : {}) });
    else omittedDiagnostics++;
  };
  const triggerGroups = new Map();
  for (const action of actions) {
    const sourceScene = scenes.get(action.source.sceneId), sourceNode = nodes.get(action.source.nodeId);
    if (!sourceScene || !sourceNode || sourceNode.sceneId !== sourceScene.id) throw new Error('INTERACTION_SOURCE');
    if (evidenceIds && action.evidenceIds.some(ref => !evidenceIds.has(ref))) throw new Error('INTERACTION_EVIDENCE_REFERENCE');
    if (action.effect.type === 'navigate') {
      if (scenes.get(action.effect.sceneId)?.role !== 'screen') throw new Error('INTERACTION_TARGET_SCENE');
    } else if (action.effect.type === 'change-state') stateReference(action.effect, sourceScene.id);
    else if (action.effect.type === 'unresolved') diagnostic('UNRESOLVED_ACTION', 'An action has unresolved behavior and needs review.', action.evidenceIds);
    if (action.guard) stateReference(action.guard, sourceScene.id);
    const key = JSON.stringify([sourceScene.id, sourceNode.id, action.trigger.type]);
    let group = triggerGroups.get(key);
    if (!group) { group = { unguarded: false, nodeId: null, states: new Set() }; triggerGroups.set(key, group); }
    if (!action.guard) {
      if (group.unguarded || group.states.size) throw new Error('INTERACTION_TRIGGER_CONFLICT');
      group.unguarded = true;
    } else {
      if (group.unguarded || (group.nodeId !== null && group.nodeId !== action.guard.nodeId) || group.states.has(action.guard.stateNodeId)) throw new Error('INTERACTION_TRIGGER_CONFLICT');
      group.nodeId = action.guard.nodeId; group.states.add(action.guard.stateNodeId);
    }
  }
  // At most 100 flows * 2000 steps; there is no state-space expansion, timer
  // simulation or retry. Each navigation creates the target scene's initial
  // component state, while local transitions update only their addressed node.
  for (const flow of flows) {
    if (scenes.get(flow.entrySceneId)?.role !== 'screen') throw new Error('INTERACTION_FLOW_ENTRY');
    let currentSceneId = flow.entrySceneId, reachable = true, unresolved = false;
    const states = new Map();
    for (const actionId of flow.actionIds) {
      const action = actionMap.get(actionId);
      if (!action) throw new Error('INTERACTION_FLOW_ACTION');
      if (action.source.sceneId !== currentSceneId) throw new Error('INTERACTION_FLOW_CONTINUITY');
      if (reachable && action.guard) {
        const stateId = states.get(action.guard.nodeId) ?? componentStateOf(nodes.get(action.guard.nodeId));
        if (stateId !== action.guard.stateNodeId) reachable = false;
      }
      if (action.effect.type === 'navigate') { currentSceneId = action.effect.sceneId; states.clear(); }
      else if (action.effect.type === 'change-state') states.set(action.effect.nodeId, action.effect.stateNodeId);
      else if (action.effect.type === 'unresolved') unresolved = true;
    }
    if (!reachable) diagnostic('FLOW_GUARD_UNREACHABLE', 'A declared flow cannot satisfy a component-state guard from its entry.');
    if (unresolved) diagnostic('FLOW_REACHABILITY_UNRESOLVED', 'A declared flow includes unresolved behavior; reachability is unverified.');
  }
  if (omittedDiagnostics) diagnostics.push({ code: 'INTERACTION_DIAGNOSTIC_BUDGET', severity: 'warning', message: `${omittedDiagnostics} additional interaction diagnostics were summarized.` });
  return { actions, flows, diagnostics, status: diagnostics.length ? 'NEEDS_REVIEW' : 'VALID' };
}
