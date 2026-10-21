import { validatePrototype } from './model.mjs';

const supported = () => ({ status: 'SUPPORTED' });
const nativeTriggers = new Set(['click', 'hover', 'timeout', 'mouse-enter', 'mouse-leave']);

export function nativeActionCapability(model, a, nodes = new Map(model.presentation.nodes.map(n => [n.id, n]))) {
  if (a.effect.type === 'unresolved') return { status: 'UNRESOLVED', reason: a.effect.reason };
  const unsupported = reason => ({ status: 'UNSUPPORTED', reason });
  if (a.effect.type === 'clipboard') return unsupported('Native reactions cannot write the browser clipboard.');
  if (!nativeTriggers.has(a.trigger.type)) return unsupported('No equivalent native trigger in this bounded adapter.');
  if (a.effect.type === 'change-state') {
    let source = nodes.get(a.source.nodeId);
    while (source && !['component', 'instance'].includes(source.kind)) source = nodes.get(source.parentId);
    if (source?.id !== a.effect.nodeId || a.guard && a.guard.nodeId !== a.effect.nodeId) return unsupported('CHANGE_TO requires the nearest local component occurrence and guard.');
    if (a.guard && (source.kind !== 'component' || a.guard.stateNodeId !== source.id)) return unsupported('This explicit state guard has no verified native member binding.');
  } else if (a.guard) return unsupported('Guarded scene navigation has no equivalent native condition in this adapter.');
  return supported();
}

export function compileInteractionCapabilities(input) {
  const model = validatePrototype(input);
  if (model.schemaVersion !== '1.1') throw new Error('PRESENTATION_VERSION');
  const nodes = new Map(model.presentation.nodes.map(n => [n.id, n]));
  return {
    schemaVersion: '1.1',
    actions: model.actions.map(a => {
      const unresolved = a.effect.type === 'unresolved';
      const html = unresolved ? { status: 'UNRESOLVED', reason: a.effect.reason }
        : a.trigger.type === 'hover' && a.effect.type !== 'change-state' ? { status: 'UNSUPPORTED', reason: 'Temporary hover is limited to reversible local state changes.' } : supported();
      const figma = nativeActionCapability(model, a, nodes);
      return { id: a.id, source: a.source, trigger: a.trigger, effect: a.effect, ...(a.guard ? { guard: a.guard } : {}), evidenceIds: a.evidenceIds, html, figma };
    }),
    behaviors: (model.presentation.behaviors ?? []).map(b => ({ ...b, html: supported(), figma: { status: 'SIMULATED',
      reason: b.type === 'sticky-copy' ? 'Editable before/after boards and fixed bar; automatic threshold switching is not verified.' : 'Editable full-text state; keyboard focus parity is not verified.' } })),
    verification: { browser: 'NOT_RUN', figmaNative: 'NOT_RUN' },
  };
}
