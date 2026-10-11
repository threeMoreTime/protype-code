import test from 'node:test';
import assert from 'node:assert/strict';
import { enrichDesignSystem } from '../design/enrich.mjs';
const paint = () => [{ type: 'SOLID', color: { r: 0.2, g: 0.3, b: 0.4 }, opacity: 0.5 }];
function fixture() {
  const frame = key => ({ key, type: 'FRAME', parentKey: null, x: 0, y: 0, width: 200, height: 200, props: {} });
  const icon = (key, x) => ({ key, type: 'VECTOR', parentKey: 'a', x, y: 10, width: 10, height: 10, props: { fills: paint(), vectorPaths: [{ windingRule: 'NONZERO', data: 'M 0 0 L 10 0 L 10 10 Z' }] } });
  const text = key => ({ key, type: 'TEXT', parentKey: 'a', x: 0, y: 20, width: 100, height: 20, props: { characters: key, fontName: { family: 'Noto Sans SC', style: 'Regular' }, fontSize: 14, fills: paint() } });
  return { schemaVersion: '1.0', id: 'test', name: 'Test', nodes: [frame('a'), frame('b'), icon('a/icon1', 10), icon('a/icon2', 40), text('a/text1'), text('a/text2')], textStyles: [], variables: [], assets: [], reactions: [{ sourceKey: 'a/icon1', destinationKey: 'b', trigger: { type: 'ON_CLICK' } }], flows: [{ nodeKey: 'a', name: 'A' }] };
}
test('exact extraction preserves stable hotspot keys, text, alpha and original source', () => {
  const input = fixture(), original = structuredClone(input), { spec, summary } = enrichDesignSystem(input);
  // Native COLOR bindings resolve RGBA alpha into paint.opacity; it is not a
  // second multiplier. Extracting opaque variables would erase this 0.5 alpha.
  assert.deepEqual(input, original); assert.equal(summary.componentsCreated, 1); assert.equal(summary.instancesCreated, 2); assert.equal(spec.textStyles.length, 1); assert.equal(spec.variables.length, 1); assert.equal(spec.variables[0].value.a, 0.5);
  assert.deepEqual(spec.reactions, input.reactions); assert.deepEqual(spec.flows, input.flows); assert.equal(spec.nodes.find(node => node.key === 'a/icon1').type, 'INSTANCE'); assert.equal(spec.nodes.find(node => node.key === 'a/icon2').x, 40);
  assert.equal(spec.nodes.find(node => node.key === 'a/text1').props.fills[0].opacity, 0.5); assert.equal(spec.nodes.find(node => node.key === 'a/text1').props.characters, 'a/text1');
  assert.deepEqual(enrichDesignSystem(input).spec, spec); assert.deepEqual(enrichDesignSystem(spec).spec, spec);
});
test('approximate geometry or paint similarity never creates shared components', () => {
  const input = fixture(); input.nodes[3].width = 10.01; const { summary } = enrichDesignSystem(input); assert.equal(summary.componentsCreated, 0); assert.equal(summary.instancesCreated, 0);
});

test('vector extraction retains explicit visibility on each original instance key', () => {
  for (const visible of [false, true, undefined]) {
    const input = fixture();
    for (const node of input.nodes.filter(node => node.type === 'VECTOR')) {
      if (visible !== undefined) node.props.visible = visible;
    }
    const original = structuredClone(input), { spec, summary } = enrichDesignSystem(input);
    assert.equal(summary.instancesCreated, 2);
    for (const key of ['a/icon1', 'a/icon2']) {
      const node = spec.nodes.find(node => node.key === key);
      assert.equal(node.type, 'INSTANCE');
      assert.equal(Object.hasOwn(node.props, 'visible'), visible !== undefined);
      if (visible !== undefined) assert.equal(node.props.visible, visible);
    }
    assert.deepEqual(spec.reactions, input.reactions);
    assert.deepEqual(input, original);
    assert.deepEqual(enrichDesignSystem(spec).spec, spec);
  }
});

const black = opacity => ({ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, ...(opacity === undefined ? {} : { opacity }) });
const layer = (key, props, type = 'RECTANGLE', parentKey = 'scene') => ({ key, type, parentKey, x: 0, y: 0, width: 20, height: 20, props });
const paintSpec = nodes => ({ schemaVersion: '1.0', id: 'paint-test', name: 'Paint test', nodes: [layer('scene', {}, 'FRAME', null), ...nodes], variables: [], textStyles: [], assets: [] });

test('exact RGBA extraction separates matching RGB with different alpha across fills and strokes', () => {
  const input = paintSpec([
    layer('scene/fill40', { fills: [black(0.4)] }), layer('scene/stroke40', { strokes: [black(0.4)] }),
    layer('scene/fill70', { fills: [black(0.7)] }), layer('scene/stroke70', { strokes: [black(0.7)] }),
    layer('scene/single20', { fills: [black(0.2)] }),
  ]);
  const original = structuredClone(input), { spec, summary } = enrichDesignSystem(input);
  const byKey = new Map(spec.nodes.map(node => [node.key, node]));
  const fill40 = byKey.get('scene/fill40').props.fills[0], stroke40 = byKey.get('scene/stroke40').props.strokes[0];
  const fill70 = byKey.get('scene/fill70').props.fills[0], stroke70 = byKey.get('scene/stroke70').props.strokes[0];
  assert.equal(summary.variablesCreated, 2); assert.equal(summary.colorBindings, 4);
  assert.equal(fill40.variableKey, stroke40.variableKey); assert.equal(fill70.variableKey, stroke70.variableKey);
  assert.notEqual(fill40.variableKey, fill70.variableKey);
  assert.deepEqual(spec.variables.find(variable => variable.key === fill40.variableKey).value, { r: 0, g: 0, b: 0, a: 0.4 });
  assert.deepEqual(spec.variables.find(variable => variable.key === fill70.variableKey).value, { r: 0, g: 0, b: 0, a: 0.7 });
  assert.equal(fill40.opacity, 0.4); assert.equal(stroke70.opacity, 0.7);
  assert.deepEqual(byKey.get('scene/single20').props.fills, original.nodes.find(node => node.key === 'scene/single20').props.fills);
  assert.deepEqual(spec.nodes.map(node => node.key), original.nodes.map(node => node.key));
  assert.deepEqual(input, original); assert.deepEqual(enrichDesignSystem(input).spec, spec); assert.deepEqual(enrichDesignSystem(spec).spec, spec);
});

test('missing paint opacity shares the exact opaque RGBA value without changing node opacity or explicit fields', () => {
  const input = paintSpec([layer('scene/implicit', { fills: [black()], opacity: 0.37 }), layer('scene/explicit', { fills: [black(1)], opacity: 0.61 })]);
  const original = structuredClone(input), { spec } = enrichDesignSystem(input);
  const implicit = spec.nodes.find(node => node.key === 'scene/implicit'), explicit = spec.nodes.find(node => node.key === 'scene/explicit');
  assert.equal(spec.variables.length, 1); assert.equal(spec.variables[0].value.a, 1);
  assert.equal(implicit.props.fills[0].variableKey, explicit.props.fills[0].variableKey);
  assert.equal(Object.hasOwn(implicit.props.fills[0], 'opacity'), false); assert.equal(explicit.props.fills[0].opacity, 1);
  assert.equal(implicit.props.opacity, 0.37); assert.equal(explicit.props.opacity, 0.61);
  assert.deepEqual(input, original); assert.deepEqual(enrichDesignSystem(spec).spec, spec);
});

test('instance fill overrides share exact RGBA extraction while explicit bindings and their variables remain unchanged', () => {
  const input = paintSpec([
    layer('master', {}, 'COMPONENT', null), layer('master/shape', { fills: [black(0.4)] }, 'RECTANGLE', 'master'),
    layer('scene/stroke', { strokes: [black(0.4)] }),
    layer('scene/instance', { componentKey: 'master', overrides: [{ sourceKey: 'master/shape', fills: [black(0.4)] }] }, 'INSTANCE'),
    layer('scene/bound', { fills: [{ ...black(0.25), variableKey: 'existing' }] }),
  ]);
  input.variables.push({ key: 'existing', name: 'Authored color', value: { r: 0, g: 0, b: 0, a: 0.8 } });
  const original = structuredClone(input), { spec, summary } = enrichDesignSystem(input);
  const master = spec.nodes.find(node => node.key === 'master/shape').props.fills[0];
  const stroke = spec.nodes.find(node => node.key === 'scene/stroke').props.strokes[0];
  const override = spec.nodes.find(node => node.key === 'scene/instance').props.overrides[0];
  assert.equal(summary.variablesCreated, 1); assert.equal(summary.colorBindings, 3);
  assert.equal(master.variableKey, stroke.variableKey); assert.equal(master.variableKey, override.fills[0].variableKey);
  assert.equal(override.sourceKey, 'master/shape'); assert.equal(override.fills[0].opacity, 0.4);
  assert.equal(spec.variables.find(variable => variable.key === master.variableKey).value.a, 0.4);
  assert.deepEqual(spec.variables.find(variable => variable.key === 'existing'), original.variables[0]);
  assert.deepEqual(spec.nodes.find(node => node.key === 'scene/bound'), original.nodes.find(node => node.key === 'scene/bound'));
  assert.deepEqual(spec.nodes.map(node => node.key), original.nodes.map(node => node.key));
  assert.deepEqual(input, original); assert.deepEqual(enrichDesignSystem(input).spec, spec); assert.deepEqual(enrichDesignSystem(spec).spec, spec);
});

test('image and gradient paints retain their alpha and data without becoming color variable bindings', () => {
  const gradient = { type: 'GRADIENT_LINEAR', opacity: 0.6, gradientTransform: [[1, 0, 0], [0, 1, 0]],
    gradientStops: [{ position: 0, color: { r: 0, g: 0, b: 0, a: 0.4 } }, { position: 1, color: { r: 0, g: 0, b: 0, a: 0.8 } }] };
  const image = { type: 'IMAGE', assetKey: 'image', scaleMode: 'FIT', opacity: 0.7 };
  const input = paintSpec([layer('scene/first', { fills: [gradient, image] }), layer('scene/second', { fills: structuredClone([gradient, image]) })]);
  input.assets.push({ key: 'image', mimeType: 'image/png', dataBase64: 'iVBORw0KGgo=' });
  const original = structuredClone(input), { spec, summary } = enrichDesignSystem(input);
  assert.equal(summary.variablesCreated, 0); assert.equal(summary.colorBindings, 0);
  assert.deepEqual(spec, original); assert.deepEqual(input, original); assert.deepEqual(enrichDesignSystem(spec).spec, spec);
});
