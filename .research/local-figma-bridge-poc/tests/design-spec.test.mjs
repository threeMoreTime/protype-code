import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateDesignSpec, safeValidateDesignSpec, orderDesignNodes } from '../design/spec.mjs';
const sample = JSON.parse(await readFile(new URL('../examples/two-size-prototype.json', import.meta.url), 'utf8'));
const fresh = () => structuredClone(sample);
test('DesignSpec validates editable components, text, tokens and two flows', () => { const input = fresh(); assert.equal(validateDesignSpec(input), input); const order = orderDesignNodes(input).map(x => x.key); assert.ok(order.indexOf('button') < order.indexOf('default/start')); });
test('DesignSpec rejects unknown executable properties and prototype keys', () => { for (const mutate of [x => { x.nodes[0].props.script = 'alert(1)'; }, x => { x.run = ''; }, x => { x.nodes[0].props = JSON.parse('{"__proto__":{}}'); }]) { const input = fresh(); mutate(input); assert.equal(safeValidateDesignSpec(input).success, false); } });
test('DesignSpec rejects duplicate keys, cycles, references and nonfinite geometry', () => { for (const mutate of [x => x.nodes.push(x.nodes[0]), x => { x.nodes[0].parentKey = 'button'; }, x => { x.nodes[3].props.componentKey = 'missing'; }, x => { x.nodes[0].width = Infinity; }, x => { x.reactions[0].destinationKey = 'button/label'; }]) { const input = fresh(); mutate(input); assert.equal(safeValidateDesignSpec(input).success, false); } });
test('DesignSpec rejects component recursion through instances', () => { const input = fresh(); input.nodes[0].parentKey = 'default'; input.nodes[3].parentKey = 'button'; assert.throws(() => validateDesignSpec(input), /Cyclic/); });
test('component descendants are fully built before instances', () => { const input = fresh(); input.nodes.push({ key: 'button/nested', type: 'FRAME', parentKey: 'button', x: 0, y: 0, width: 100, height: 30, props: {} }); input.nodes[1].parentKey = 'button/nested'; const order = orderDesignNodes(validateDesignSpec(input)).map(x => x.key); assert.ok(order.indexOf('button/label') < order.indexOf('default/start')); });
test('DesignSpec allows exact Unicode content and bounds timers in seconds', () => { const input = fresh(); input.nodes[1].props.characters = '𠮷\n<literal>& "引用"'; input.reactions.push({ sourceKey: 'complete', trigger: { type: 'AFTER_TIMEOUT', delaySeconds: 1 }, destinationKey: 'default' }); validateDesignSpec(input); input.reactions.at(-1).trigger.delaySeconds = 0; assert.throws(() => validateDesignSpec(input), /delaySeconds/); });
test('DesignSpec rejects remote assets, spoofed MIME and duplicate triggers', () => { const input = fresh(); input.assets.push({ key: 'bad', mimeType: 'image/png', dataBase64: 'PHNjcmlwdD4=' }); assert.throws(() => validateDesignSpec(input), /signature/); const duplicate = fresh(); duplicate.reactions.push(duplicate.reactions[0]); assert.throws(() => validateDesignSpec(duplicate), /Duplicate source/); });
test('source URL cannot carry query credentials file or JavaScript URLs', () => { for (const url of ['file:///private/file', 'javascript:alert(1)', 'https://u:p@example.com/', 'https://example.com/?token=x', 'https://example.com/#secret']) { const input = fresh(); input.source.url = url; assert.throws(() => validateDesignSpec(input), /source.url/); } const input = fresh(); input.source.url = 'http://localhost:3000/demo'; validateDesignSpec(input); });
test('fixed children require scroll parent and root flow', () => { const input = fresh(); input.nodes[3].props.isFixed = true; validateDesignSpec(input); input.nodes[2].props.overflowDirection = 'NONE'; assert.throws(() => validateDesignSpec(input), /scrolling parent/); });
test('type-specific props reject impossible host operations before writes', () => { for (const mutate of [x => { x.nodes[1].props.cornerRadius = 2; }, x => { x.nodes[1].props.clipsContent = true; }, x => { x.reactions[0].destinationKey = 'button'; }, x => { x.flows[0].nodeKey = 'button'; }, x => { x.nodes[1].props.fontWeight = 700; }]) { const input = fresh(); mutate(input); assert.equal(safeValidateDesignSpec(input).success, false); } });
test('instance overrides are bounded to typed descendants and reject ownership fields', () => {
  const input = fresh(); input.nodes[3].props.overrides = [{ sourceKey: 'button/label', characters: 'Compact label', visible: true, fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }] }]; validateDesignSpec(input);
  for (const override of [{ sourceKey: 'complete/message', characters: 'outside' }, { sourceKey: 'button', characters: 'not text' }, { sourceKey: 'button/label', pluginData: {} }, { sourceKey: 'button/label' }]) { const bad = fresh(); bad.nodes[3].props.overrides = [override]; assert.equal(safeValidateDesignSpec(bad).success, false); }
  input.nodes[3].props.overrides.push(input.nodes[3].props.overrides[0]); assert.throws(() => validateDesignSpec(input), /Duplicate override/);
});
test('shadow effects and stroke alignment accept bounded native values', () => {
  const input = fresh(); input.nodes[0].props.strokeAlign = 'INSIDE'; input.nodes[0].props.effects = [{ type: 'INNER_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.2 }, offset: { x: 2, y: -1 }, radius: 4, spread: -1 }]; validateDesignSpec(input);
  input.nodes[0].props.effects[0].radius = -1; assert.throws(() => validateDesignSpec(input), /radius/);
  input.nodes[0].props.effects[0].radius = 2; input.nodes[0].props.effects[0].pluginData = {}; assert.throws(() => validateDesignSpec(input), /Unknown property/);
});
test('dash patterns are finite numeric arrays of one to sixteen bounded lengths', () => {
  for (const pattern of [[0], [3, 3], Array(16).fill(10000)]) { const input = fresh(); input.nodes[0].props.dashPattern = pattern; validateDesignSpec(input); }
  for (const pattern of [[], Array(17).fill(1), [-1], [10001], [NaN], [Infinity], ['3'], null, 3]) {
    const input = fresh(); input.nodes[0].props.dashPattern = pattern; assert.throws(() => validateDesignSpec(input), /dashPattern/);
  }
});
