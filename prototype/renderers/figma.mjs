import { digest, validatePrototype } from '../core/model.mjs';
import { validateDesignSpec } from '../../.research/local-figma-bridge-poc/design/spec.mjs';

const fill = hex => [{ type: 'SOLID', color: { r: parseInt(hex.slice(1, 3), 16) / 255, g: parseInt(hex.slice(3, 5), 16) / 255, b: parseInt(hex.slice(5, 7), 16) / 255 } }];
export const frameKey = (pageId, stateId) => `${pageId}/${stateId}`;

/** Compile semantic pages into editable native primitives and explicit reactions. */
export function renderFigma(input) {
  const model = validatePrototype(input), revision = digest(model), nodes = [], reactions = [];
  const font = { family: model.theme.fontFamily, style: 'Regular' };
  const add = (key, type, parentKey, x, y, width, height, props = {}, name = key) => nodes.push({ key, type, name: name.slice(0, 512), parentKey, x, y, width, height, props });
  const text = (key, parent, value, x, y, width, size = 16, color = '#17213a') => {
    // Conservative Unicode-aware wrapping estimate; native text remains editable.
    const units = [...value].reduce((sum, c) => sum + (c.charCodeAt(0) > 255 ? 1 : 0.6), 0);
    const height = Math.max(1, Math.ceil(units / Math.max(1, width / size))) * size * 1.5;
    add(key, 'TEXT', parent, x, y, width, height, { characters: value, fontName: font, fontSize: size, lineHeight: { unit: 'PIXELS', value: size * 1.5 }, textAutoResize: 'HEIGHT', fills: fill(color) }, value.slice(0, 80));
    return height;
  };
  let frameIndex = 0;
  for (const page of model.pages) for (const state of page.states) {
    const root = frameKey(page.id, state.id), { width, height } = page.viewport, inner = width - 48;
    add(root, 'FRAME', null, (frameIndex % 3) * 2800, Math.floor(frameIndex / 3) * 2800, width, height, { fills: fill('#f5f7fb'), clipsContent: true, overflowDirection: 'VERTICAL' }, `${page.title} · ${state.label}`);
    frameIndex++;
    let y = 28;
    y += text(`${root}/title`, root, page.title, 24, y, inner, 26) + 14;
    y += text(`${root}/state-label`, root, `状态：${state.label} · 可编辑原型`, 24, y, inner, 13, '#586780') + 24;
    if (state.kind !== 'default') y += text(`${root}/state-message`, root, state.message ?? state.label, 24, y, inner, 18, state.kind === 'error' ? '#b42318' : '#315bea') + 20;
    for (const element of page.elements) {
      const key = `${root}/${element.id}`;
      if (element.kind === 'button') {
        const bound = model.actions.some(a => a.pageId === page.id && a.fromState === state.id && a.elementId === element.id);
        add(key, 'FRAME', root, 24, y, Math.min(inner, 420), 52, { fills: fill(bound ? model.theme.primary : '#7b8496'), cornerRadius: 10 }, element.label);
        text(`${key}/label`, key, element.label, 16, 12, Math.min(inner, 420) - 32, 16, '#ffffff'); y += 66;
      } else if (element.kind === 'field') {
        y += text(`${key}/label`, root, `${element.label}${element.required ? ' *' : ''}`, 24, y, inner, 14) + 8;
        const h = element.fieldType === 'textarea' ? 100 : 48;
        add(key, 'FRAME', root, 24, y, inner, h, { fills: fill('#ffffff'), strokes: fill('#d6ddec'), strokeWeight: 1, cornerRadius: 8 }, element.label);
        text(`${key}/placeholder`, key, element.fieldType === 'checkbox' ? '☐' : element.items?.[0] ?? `请输入${element.label}`, 12, 12, inner - 24, 14, '#66758d'); y += h + 20;
      } else if (element.kind === 'list') {
        y += text(`${key}/title`, root, element.label, 24, y, inner, 18) + 12;
        const items = state.kind === 'empty' ? ['暂无数据'] : element.items?.length ? element.items : ['待补充示例数据'];
        for (const [index, value] of items.entries()) { y += text(`${key}/item-${index}`, root, value, 36, y, inner - 12, 15) + 16; }
      } else y += text(key, root, element.label, 24, y, inner, element.kind === 'heading' ? 22 : 16) + 20;
    }
  }
  for (const a of model.actions) reactions.push({ sourceKey: a.trigger === 'timeout' ? frameKey(a.pageId, a.fromState) : `${frameKey(a.pageId, a.fromState)}/${a.elementId}`, destinationKey: frameKey(a.targetPageId, a.targetState), trigger: a.trigger === 'timeout' ? { type: 'AFTER_TIMEOUT', delaySeconds: a.delaySeconds } : { type: 'ON_CLICK' } });
  const spec = validateDesignSpec({ schemaVersion: '1.0', id: `${model.id}-${revision.slice(0, 12)}`, name: model.name, source: { revision, adapter: 'prototype-1.0' }, fontPolicy: { allowFallback: true, fallback: { family: 'Inter', style: 'Regular' } }, nodes, assets: [], textStyles: [], variables: [], reactions, flows: model.flows.map(f => ({ nodeKey: frameKey(f.startPageId, f.startState), name: f.name })) });
  if (Buffer.byteLength(JSON.stringify(spec)) > 6.5 * 1024 * 1024) throw new Error('Figma spec exceeds bridge payload budget; split the prototype into smaller flows');
  return spec;
}
