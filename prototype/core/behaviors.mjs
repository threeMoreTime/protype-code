import { z } from 'zod';
import { designEvidenceId as id, evidenceRecordMap } from './design-catalog.mjs';

const source = z.object({ sceneId: id, nodeId: id }).strict();
const evidenceIds = z.array(id).min(1).max(100);
export const BehaviorsSchema = z.array(z.discriminatedUnion('type', [
  z.object({ id, type: z.literal('truncate-tooltip'), source, maxCharacters: z.literal(12), evidenceIds }).strict(),
  z.object({ id, type: z.literal('sticky-copy'), source, targetNodeId: id, evidenceIds }).strict(),
])).max(2000);

// Behaviors are explicit presentation bindings, never inferred business actions.
export function validatePresentationBehaviors(model, presentation = model.presentation) {
  const behaviors = presentation.behaviors ?? [];
  evidenceRecordMap(behaviors, 'behaviors');
  const nodes = new Map(presentation.nodes.map(n => [n.id, n]));
  const scenes = new Map(presentation.scenes.map(s => [s.id, s]));
  const evidence = new Set(model.evidenceIds ?? []), bindings = new Set(), fixedTargets = new Set();
  for (const b of behaviors) {
    const node = nodes.get(b.source.nodeId), scene = scenes.get(b.source.sceneId);
    if (!scene || !node || node.sceneId !== scene.id || !b.evidenceIds.length || b.evidenceIds.some(e => !evidence.has(e))) throw new Error('PRESENTATION_BEHAVIOR_REFERENCE');
    const binding = `${b.type}/${node.id}`;
    if (bindings.has(binding)) throw new Error('PRESENTATION_BEHAVIOR_DUPLICATE');
    bindings.add(binding);
    if (b.type === 'truncate-tooltip') {
      if (node.kind !== 'text' || !node.text) throw new Error('PRESENTATION_BEHAVIOR_TEXT');
    } else {
      const target = nodes.get(b.targetNodeId);
      if (!target || target.id === node.id || target.sceneId !== scene.id || !target.layout?.fixed || target.parentId !== scene.rootNodeId) throw new Error('PRESENTATION_BEHAVIOR_FIXED_TARGET');
      if (fixedTargets.has(target.id)) throw new Error('PRESENTATION_BEHAVIOR_FIXED_TARGET_DUPLICATE');
      fixedTargets.add(target.id);
      // A descendant of its own hidden bar cannot act as the threshold anchor.
      let parent = node;
      while (parent) { if (parent.id === target.id) throw new Error('PRESENTATION_BEHAVIOR_ANCHOR'); parent = nodes.get(parent.parentId); }
    }
  }
  return behaviors;
}
