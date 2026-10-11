import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLinearGradient } from '../capture/linear-gradient.mjs';
import { adaptCaptures, parseColor } from '../capture/adapter.mjs';
import { validateDesignSpec } from '../design/spec.mjs';

const css = overrides => ({
  backgroundImage: 'linear-gradient(90deg, rgba(244, 239, 231, 0.96), rgba(244, 239, 231, 0.88))',
  backgroundColor: 'rgba(0, 0, 0, 0)', backgroundSize: 'auto', backgroundRepeat: 'repeat',
  backgroundPosition: '0% 0%', backgroundOrigin: 'padding-box', backgroundClip: 'border-box',
  backgroundAttachment: 'scroll', backgroundBlendMode: 'normal',
  borderTopWidth: '0px', borderRightWidth: '0px', borderBottomWidth: '0px', borderLeftWidth: '0px',
  ...overrides,
});
const parse = overrides => parseLinearGradient(css(overrides), parseColor);
const capture = style => ({ captureVersion: '1.0', id: 'gradient', viewport: { width: 960, height: 72 },
  root: { id: 'root', kind: 'element', tag: 'div', rect: { x: 0, y: 0, width: 960, height: 72 }, style, children: [] } });
const spec = paint => ({ schemaVersion: '1.0', id: 'gradient', name: 'Gradient', nodes: [
  { key: 'root', type: 'FRAME', parentKey: null, x: 0, y: 0, width: 960, height: 72, props: { fills: [paint] } },
] });

test('a proved horizontal opacity fade preserves native RGBA stops and overall opacity', () => {
  const paint = parse();
  assert.equal(paint.type, 'GRADIENT_LINEAR'); assert.equal(paint.opacity, 1);
  assert.deepEqual(paint.gradientTransform, [[1, 0, 0], [0, 1, 0]]);
  assert.deepEqual(paint.gradientStops.map(stop => stop.position), [0, 1]);
  assert.deepEqual(paint.gradientStops[0].color, { r: 244 / 255, g: 239 / 255, b: 231 / 255, a: 0.96 });
  assert.equal(paint.gradientStops[1].color.a, 0.88);
});

test('cardinal CSS directions map the source and destination edges to gradient positions zero and one', () => {
  const directions = [
    ['0deg', [0.5, 1], [0.5, 0]], ['to top', [0.5, 1], [0.5, 0]],
    ['90deg', [0, 0.5], [1, 0.5]], ['to right', [0, 0.5], [1, 0.5]],
    ['180deg', [0.5, 0], [0.5, 1]], ['to bottom', [0.5, 0], [0.5, 1]],
    ['270deg', [1, 0.5], [0, 0.5]], ['to left', [1, 0.5], [0, 0.5]],
  ];
  for (const [direction, start, end] of directions) {
    const row = parse({ backgroundImage: `linear-gradient(${direction}, rgba(4, 5, 6, .8) 0%, rgba(4, 5, 6, .2) 100%)` }).gradientTransform[0];
    const project = point => row[0] * point[0] + row[1] * point[1] + row[2];
    assert.equal(project(start), 0, direction); assert.equal(project(end), 1, direction);
  }
  assert.deepEqual(parse({ backgroundImage: 'linear-gradient(rgba(4, 5, 6, .8), rgba(4, 5, 6, .2))' }).gradientTransform,
    [[0, 1, 0], [-1, 0, 1]]);
});

test('unsupported CSS rendering and unproved legacy backgrounds remain explicit failures', () => {
  for (const change of [
    { backgroundSize: undefined }, { backgroundRepeat: 'no-repeat' }, { backgroundPosition: 'center center' },
    { backgroundSize: '100% 32px' }, { backgroundClip: 'padding-box' }, { backgroundOrigin: 'content-box' },
    { backgroundAttachment: 'fixed' }, { backgroundBlendMode: 'multiply' }, { borderTopWidth: '1px' },
    { backgroundColor: 'rgb(255, 255, 255)' },
    { backgroundImage: 'linear-gradient(45deg, rgba(4,5,6,.8), rgba(4,5,6,.2))' },
    { backgroundImage: 'linear-gradient(90deg, rgba(4,5,6,.8), rgba(4,5,7,.2))' },
    { backgroundImage: 'linear-gradient(90deg, rgba(4,5,6,.8) 10px, rgba(4,5,6,.2) 100%)' },
    { backgroundImage: 'linear-gradient(90deg, rgba(4,5,6,.8), rgba(4,5,6,.2) 100%)' },
    { backgroundImage: 'linear-gradient(90deg, rgba(4,5,6,.8), rgba(4,5,6,.5), rgba(4,5,6,.2))' },
    { backgroundImage: 'linear-gradient(90deg, rgba(4,5,6,.8), rgba(4,5,6,.2)), url(https://example.invalid/private)' },
    { backgroundImage: 'linear-gradient(90deg in oklab, rgba(4,5,6,.8), rgba(4,5,6,.2))' },
    { backgroundImage: 'linear-gradient(90deg, rgba(400,5,6,.8), rgba(400,5,6,.2))' },
  ]) assert.throws(() => parse(change), /Unsupported|Unproved/, JSON.stringify(change));
});

test('the adapter emits the supported native paint and retains unsupported background warnings', () => {
  const input = capture(css()), before = structuredClone(input);
  const supported = adaptCaptures([input]);
  assert.deepEqual(input, before);
  assert.deepEqual(supported.spec.nodes.find(node => node.key === 'gradient/root').props.fills, [parse()]);
  assert.equal(supported.manifest.warnings.length, 0);
  const legacy = css(); delete legacy.backgroundClip;
  const unsupported = adaptCaptures([capture(legacy)]);
  assert.deepEqual(unsupported.spec.nodes.find(node => node.key === 'gradient/root').props.fills, []);
  assert.ok(unsupported.manifest.warnings.some(warning => warning.code === 'CSS_BACKGROUND_IMAGE_UNSUPPORTED' && warning.detail.includes('Unproved')));
});

test('native linear-gradient paints require bounded stops and an invertible finite transform', () => {
  validateDesignSpec(spec(parse()));
  for (const mutate of [
    paint => { paint.color = { r: 1, g: 1, b: 1 }; }, paint => { paint.assetKey = 'image'; },
    paint => { paint.variableKey = 'color'; }, paint => { paint.scaleMode = 'FILL'; },
    paint => { paint.gradientStops = []; }, paint => { paint.gradientStops[1].position = -1; },
    paint => { paint.gradientStops = Array.from({ length: 17 }, (_, index) => ({ position: index / 16, color: { r: 0, g: 0, b: 0, a: 1 } })); },
    paint => { paint.gradientStops[0].position = 0.8; paint.gradientStops[1].position = 0.2; },
    paint => { paint.gradientStops[0].color.a = NaN; }, paint => { paint.gradientStops[0].extra = true; },
    paint => { paint.gradientTransform = [[1, 0, 0], [0, 0, 0]]; },
    paint => { paint.gradientTransform[0][0] = 10001; }, paint => { paint.gradientTransform[0].push(1); },
    paint => { paint.gradientTransform[0][1] = Infinity; },
    paint => { paint.opacity = 2; },
  ]) { const paint = parse(); mutate(paint); assert.throws(() => validateDesignSpec(spec(paint)), /Invalid DesignSpec/); }
  const solid = { type: 'SOLID', color: { r: 1, g: 0, b: 0 }, gradientStops: parse().gradientStops };
  assert.throws(() => validateDesignSpec(spec(solid)), /Invalid DesignSpec/);
  const stroke = spec(parse()); stroke.nodes[0].props.strokes = [parse()];
  assert.throws(() => validateDesignSpec(stroke), /Invalid DesignSpec/);
});
