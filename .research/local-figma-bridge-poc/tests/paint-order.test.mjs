import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { adaptCaptures } from '../capture/adapter.mjs';
import { captureCommand } from '../capture/cli.mjs';

const style = { display: 'block', position: 'relative', zIndex: 'auto', transform: 'none', color: 'rgb(12, 20, 30)', backgroundColor: 'transparent', overflowX: 'visible', overflowY: 'visible' };
const bounds = { x: 0, y: 0, width: 600, height: 400 };
const options = { paintOrder: 'positioned-siblings' };
const fixture = (scene = 'review') => {
  const menu = scene.includes('menu'), parentId = menu ? 'd62' : 'd61', overlayId = menu ? 'd63' : 'd62', positionerId = menu ? 'd93' : 'd92';
  const overlay = { id: overlayId, kind: 'element', tag: 'div', rect: { x: 40, y: 30, width: 300, height: 50 }, style: { ...style, position: 'absolute', zIndex: '3' }, children: [
    { id: 'toolbar', kind: 'element', tag: 'button', rect: { x: 45, y: 35, width: 80, height: 30 }, style: { ...style, position: 'static' }, children: [] },
  ] };
  const positioner = { id: positionerId, kind: 'element', tag: 'div', rect: { x: 20, y: 40, width: 400, height: 300 }, style: { ...style, position: 'absolute', transform: 'matrix(1, 0, 0, 1, -20, -40)' }, children: [
    { id: 'page', kind: 'element', tag: 'div', rect: { x: 20, y: 40, width: 400, height: 300 }, style: { ...style, position: 'absolute', transform: 'matrix(1, 0, 0, 1, -20, -40)' }, children: [] },
  ] };
  const parent = { id: parentId, kind: 'element', tag: 'div', rect: bounds, style, children: [overlay, positioner] };
  return { id: scene, viewport: { width: 600, height: 400 }, root: { id: 'root', kind: 'element', tag: 'body', rect: bounds, style, children: [parent] } };
};
const childrenOf = (spec, key) => spec.nodes.filter(node => node.parentKey === key).map(node => node.key);
const keyedNodes = spec => Object.fromEntries(spec.nodes.map(node => [node.key, node]));
const flexFixture = () => {
  const input = fixture('search'), parent = input.root.children[0];
  input.captureVersion = '1.0'; parent.style = { ...style, display: 'flex', opacity: '1' };
  const flow = parent.children[1]; flow.id = 'scroll';
  flow.style = { ...style, display: 'flex', position: 'static', opacity: '1' };
  flow.children = [{ id: 'canvas', kind: 'element', tag: 'div', rect: bounds,
    style: { ...style, position: 'relative', opacity: '1' }, children: [
      { id: 'page-image', kind: 'image', tag: 'img', rect: bounds,
        style: { ...style, position: 'static', opacity: '1' }, dataUrl: 'data:image/png;base64,iVBORw0KGgo=' },
      { id: 'highlight', kind: 'element', tag: 'div', rect: { x: 70, y: 60, width: 20, height: 10 },
        style: { ...style, position: 'absolute', opacity: '1' }, children: [] },
    ] }];
  return input;
};

test('explicit auto static flow paints before a positive absolute overlay under flex without changing source or definitions', () => {
  const input = flexFixture(), source = structuredClone(input), links = [{ sceneId: 'search', sourceId: 'toolbar', targetSceneId: 'search', trigger: 'ON_CLICK' }];
  const before = adaptCaptures([input], { links }), after = adaptCaptures([input], { ...options, links });
  assert.deepEqual(childrenOf(after.spec, 'search/d61'), ['search/scroll', 'search/d62']);
  assert.deepEqual(keyedNodes(after.spec), keyedNodes(before.spec));
  assert.deepEqual({ ...after.spec, nodes: before.spec.nodes }, before.spec);
  assert.deepEqual(after.manifest.mappings, before.manifest.mappings); assert.deepEqual(input, source);
  assert.equal(after.manifest.paintOrder.changedParentCount, 1);
  const change = after.manifest.paintOrder.changedParents[0];
  assert.equal(change.paintPhase, 'POSITIVE_OVERLAY_AFTER_STATIC_FLEX_FLOW');
  assert.deepEqual(change.flowZIndices.map(n => n.sourceId).sort(), ['canvas', 'highlight', 'page-image', 'scroll']);
  assert.ok(change.flowZIndices.every(n => n.value === 'auto' && n.source === 'CAPTURED_STYLE'));
});

test('flex overlay ordering preserves unknown or complex flow branches instead of inventing z-index or isolation', () => {
  const cases = [
    ['missing flow z', p => { delete p.children[1].style.zIndex; }],
    ['missing descendant z', p => { delete p.children[1].children[0].children[0].style.zIndex; }],
    ['positive descendant z', p => { p.children[1].children[0].children[1].style.zIndex = '4'; }],
    ['zero descendant z', p => { p.children[1].children[0].style.zIndex = '0'; }],
    ['transformed descendant', p => { p.children[1].children[0].style.transform = 'matrix(1,0,0,1,0,0)'; }],
    ['translucent descendant', p => { p.children[1].children[0].style.opacity = '0.5'; }],
    ['filtered descendant', p => { p.children[1].children[0].style.filter = 'blur(1px)'; }],
    ['fixed descendant', p => { p.children[1].children[0].children[1].style.position = 'fixed'; }],
    ['unknown descendant position', p => { delete p.children[1].children[0].style.position; }],
    ['unknown descendant opacity', p => { delete p.children[1].children[0].style.opacity; }],
    ['overlay auto', p => { p.children[0].style.zIndex = 'auto'; }],
    ['overlay zero', p => { p.children[0].style.zIndex = '0'; }],
    ['overlay negative', p => { p.children[0].style.zIndex = '-1'; }],
    ['overlay fraction', p => { p.children[0].style.zIndex = '1.5'; }],
    ['third sibling', p => { p.children.push({ ...structuredClone(p.children[1]), id: 'third', children: [] }); }],
  ];
  for (const [name, mutate] of cases) {
    const input = flexFixture(); mutate(input.root.children[0]);
    const before = adaptCaptures([input]), after = adaptCaptures([input], options);
    assert.deepEqual(after.spec, before.spec, name);
    assert.equal(after.manifest.paintOrder.changedParentCount, 0, name);
  }
});

test('flex overlay ordering validates each static provenance and keeps already-correct source order', () => {
  const input = flexFixture(), parent = input.root.children[0], flow = parent.children[1];
  flow.styleEvidence = { zIndex: { kind: 'STATIC_CSS_DERIVED', selector: '.scroll', nodeId: 'scroll', positionDeclaration: 'position: static', declaration: 'z-index: auto' } };
  const after = adaptCaptures([input], options);
  assert.equal(after.manifest.paintOrder.changedParentCount, 1);
  assert.deepEqual(after.manifest.paintOrder.changedParents[0].flowZIndices.find(n => n.sourceId === 'scroll').evidence, flow.styleEvidence.zIndex);
  for (const invalid of [{ declaration: 'z-index: 5' }, { positionDeclaration: 'position: absolute' }, { nodeId: 'other' }, { kind: 'GUESSED' }]) {
    const bad = structuredClone(input); Object.assign(bad.root.children[0].children[1].styleEvidence.zIndex, invalid);
    const before = adaptCaptures([bad]), actual = adaptCaptures([bad], options);
    assert.deepEqual(actual.spec, before.spec); assert.equal(actual.manifest.paintOrder.changedParentCount, 0);
  }
  parent.children.reverse(); const before = adaptCaptures([input]), ordered = adaptCaptures([input], options);
  assert.deepEqual(ordered.spec, before.spec); assert.equal(ordered.manifest.paintOrder.changedParentCount, 0);
});

test('flex overlay ordering refuses branches whose sticky descendants were promoted to another native parent', () => {
  const input = flexFixture(); input.root.style = { ...style, overflowY: 'auto' }; input.root.scroll = { width: 600, height: 700, left: 0, top: 0 };
  input.root.children[0].children[0].children[0].style.position = 'sticky';
  const before = adaptCaptures([input]), after = adaptCaptures([input], options);
  assert.deepEqual(after.spec, before.spec); assert.equal(after.manifest.paintOrder.changedParentCount, 0);
  assert.equal(after.manifest.paintOrder.preservedCounts.CROSS_PARENT_SUBTREE, 1);
});

test('paint-order is opt-in, accepts explicit captured mode and rejects unknown policy', () => {
  const input = fixture(), before = structuredClone(input), normal = adaptCaptures([input]), explicit = adaptCaptures([input], { paintOrder: 'captured' });
  assert.deepEqual(normal.spec, explicit.spec); assert.equal(normal.manifest.paintOrder, undefined); assert.equal(explicit.manifest.paintOrder, undefined);
  const stable = manifest => { const value = structuredClone(manifest); delete value.convertedAt; return value; };
  assert.deepEqual(stable(normal.manifest), stable(explicit.manifest));
  assert.deepEqual(childrenOf(normal.spec, 'review/d61'), ['review/d62', 'review/d92']); assert.deepEqual(input, before);
  assert.throws(() => adaptCaptures([input], { paintOrder: 'global-z-index' }), /paintOrder/);
  assert.throws(() => adaptCaptures([input], { paintOrder: null }), /paintOrder/);
});

test('review and menu positioned siblings put the page before the overlay without changing definitions', () => {
  for (const scene of ['review', 'compact-review', 'extra-review-menu', 'extra-compact-review-menu']) {
    const input = fixture(scene), beforeInput = structuredClone(input), before = adaptCaptures([input]), after = adaptCaptures([input], options);
    const menu = scene.includes('menu'), parentId = menu ? 'd62' : 'd61', overlayId = menu ? 'd63' : 'd62', pageId = menu ? 'd93' : 'd92';
    assert.deepEqual(childrenOf(after.spec, `${scene}/${parentId}`), [`${scene}/${pageId}`, `${scene}/${overlayId}`]);
    assert.deepEqual(keyedNodes(after.spec), keyedNodes(before.spec));
    assert.deepEqual({ ...after.spec, nodes: before.spec.nodes }, before.spec);
    assert.deepEqual(after.manifest.mappings, before.manifest.mappings); assert.deepEqual(after.manifest.warnings, before.manifest.warnings); assert.deepEqual(input, beforeInput);
    const parentChange = after.manifest.paintOrder.changedParents[0];
    assert.equal(after.manifest.paintOrder.changedParentCount, 1); assert.equal(after.manifest.paintOrder.nativeVerification, 'NOT_RUN');
    assert.equal(parentChange.sceneId, scene); assert.equal(parentChange.parentKey, `${scene}/${parentId}`);
    assert.deepEqual(parentChange.beforeSourceIds, [overlayId, pageId]); assert.deepEqual(parentChange.afterSourceIds, [pageId, overlayId]);
    assert.deepEqual(parentChange.zIndices.map(entry => ({ sourceId: entry.sourceId, value: entry.value, numericValue: entry.numericValue, source: entry.source })), [
      { sourceId: overlayId, value: '3', numericValue: 3, source: 'CAPTURED_STYLE' }, { sourceId: pageId, value: 'auto', numericValue: 0, source: 'CAPTURED_STYLE' },
    ]);
    const pageIndex = after.spec.nodes.findIndex(node => node.key === `${scene}/${pageId}`), pageChildIndex = after.spec.nodes.findIndex(node => node.key === `${scene}/page`), overlayIndex = after.spec.nodes.findIndex(node => node.key === `${scene}/${overlayId}`);
    assert.ok(pageIndex < pageChildIndex && pageChildIndex < overlayIndex);
  }
});

test('positioned sibling order is ascending and stable for auto, zero and equal positive z-index', () => {
  const input = fixture(), parent = input.root.children[0];
  parent.children = ['3', 'auto', '3', '0', '1'].map((zIndex, i) => ({ id: `child-${i}`, kind: 'element', tag: 'div', rect: { x: i * 10, y: 10, width: 20, height: 20 }, style: { ...style, position: ['absolute', 'relative', 'fixed', 'sticky', 'absolute'][i], zIndex }, children: [] }));
  const result = adaptCaptures([input], options);
  assert.deepEqual(childrenOf(result.spec, 'review/d61'), ['review/child-1', 'review/child-3', 'review/child-4', 'review/child-0', 'review/child-2']);
  assert.equal(result.manifest.paintOrder.changedParentCount, 1);
  assert.equal(result.spec.nodes.find(node => node.key === 'review/child-3').parentKey, 'review/d61');
});

test('paint-order retains unknown, negative, fractional and mixed CSS groups', () => {
  const cases = [
    ['missing z', parent => { delete parent.children[1].style.zIndex; }],
    ['negative z', parent => { parent.children[1].style.zIndex = '-1'; }],
    ['fractional z', parent => { parent.children[1].style.zIndex = '0.5'; }],
    ['unsafe integer', parent => { parent.children[1].style.zIndex = '9007199254740992'; }],
    ['unknown position', parent => { delete parent.children[1].style.position; }],
    ['static sibling', parent => { parent.children[1].style.position = 'static'; }],
    ['text sibling', parent => { parent.children[1].kind = 'text'; parent.children[1].text = 'mixed text'; }],
    ['image sibling', parent => { parent.children[1].kind = 'image'; }],
    ['flex parent', parent => { parent.style = { ...parent.style, display: 'flex' }; }],
    ['unknown layout', parent => { parent.style = { ...parent.style }; delete parent.style.display; }],
  ];
  for (const [name, change] of cases) {
    const input = fixture(), parent = input.root.children[0]; change(parent);
    const before = adaptCaptures([input]), after = adaptCaptures([input], options);
    assert.deepEqual(after.spec, before.spec, name); assert.equal(after.manifest.paintOrder.changedParentCount, 0, name);
    assert.equal(Object.values(after.manifest.paintOrder.preservedCounts).reduce((a, b) => a + b, 0), 1, name);
  }
});

test('paint-order keeps immutable asset keys and subtrees within their original native parent', () => {
  const input = fixture(), parent = input.root.children[0];
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/9ZkAAAAASUVORK5CYII=';
  parent.children[0].children[0] = { id: 'overlay-image', kind: 'image', rect: { x: 45, y: 35, width: 10, height: 10 }, style, dataUrl: png };
  parent.children[1].children[0] = { id: 'page-image', kind: 'image', rect: { x: 20, y: 40, width: 400, height: 300 }, style, dataUrl: 'data:image/png;base64,iVBORw0KGgo=' };
  const before = adaptCaptures([input]), after = adaptCaptures([input], options);
  assert.deepEqual(keyedNodes(after.spec), keyedNodes(before.spec)); assert.deepEqual(after.spec.assets, before.spec.assets); assert.deepEqual(after.manifest.mappings, before.manifest.mappings);
  assert.equal(after.manifest.paintOrder.changedParentCount, 1);
  const cross = fixture(), enclosing = cross.root.children[0];
  cross.root.style = { ...style, overflowY: 'auto' }; cross.root.scroll = { width: 600, height: 700, left: 0, top: 0 };
  enclosing.children[1].style = { ...style, position: 'sticky', zIndex: 'auto' };
  const crossBefore = adaptCaptures([cross]), crossAfter = adaptCaptures([cross], options);
  assert.deepEqual(crossAfter.spec, crossBefore.spec); assert.equal(crossAfter.manifest.paintOrder.changedParentCount, 0); assert.equal(crossAfter.manifest.paintOrder.preservedCounts.CROSS_PARENT_SUBTREE, 1);
});

test('paint-order rejects unisolated auto branches with positioned descendants', () => {
  for (const zIndex of ['8', '-1', 'auto', undefined]) {
    const input = fixture(), branch = input.root.children[0].children[1]; branch.style.transform = 'none';
    branch.children[0].style.zIndex = zIndex;
    const before = adaptCaptures([input]), after = adaptCaptures([input], options);
    assert.deepEqual(after.spec, before.spec); assert.equal(after.manifest.paintOrder.changedParentCount, 0);
    assert.equal(after.manifest.paintOrder.preservedCounts.COMPLEX_STACKING_SUBTREE, 1);
  }
  const leaf = fixture(); leaf.root.children[0].children[1].style.transform = 'none'; leaf.root.children[0].children[1].children = [];
  assert.equal(adaptCaptures([leaf], options).manifest.paintOrder.changedParentCount, 1);
});

test('paint-order copies matching static z-index provenance and rejects a conflicting derivation', () => {
  const input = fixture(), overlay = input.root.children[0].children[0];
  overlay.styleEvidence = { zIndex: { kind: 'STATIC_CSS_DERIVED', selector: '.al-viewer-overlays', positionDeclaration: 'position: absolute', declaration: 'z-index: 3', nodeId: overlay.id } };
  const result = adaptCaptures([input], options), provenance = result.manifest.paintOrder.changedParents[0].zIndices[0];
  assert.equal(provenance.source, 'STATIC_CSS_DERIVED'); assert.deepEqual(provenance.evidence, overlay.styleEvidence.zIndex);
  overlay.styleEvidence.zIndex.declaration = 'z-index: 5';
  const rejected = adaptCaptures([input], options);
  assert.equal(rejected.manifest.paintOrder.changedParentCount, 0); assert.equal(rejected.manifest.paintOrder.preservedCounts.Z_INDEX_PROVENANCE_UNSUPPORTED, 1);
});

test('capture CLI forwards paint-order and rejects invalid values before reading files or writing output', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'design-capture-paint-order-'));
  try {
    const input = path.join(dir, 'capture.json'), output = path.join(dir, 'out'); await writeFile(input, JSON.stringify(fixture()));
    const result = await captureCommand(['--input', input, '--output', output, '--paint-order', 'positioned-siblings']);
    const spec = JSON.parse(await readFile(path.join(output, 'design-spec.json'), 'utf8')), manifest = JSON.parse(await readFile(path.join(output, 'capture-manifest.json'), 'utf8'));
    assert.deepEqual(childrenOf(spec, 'review/d61'), ['review/d92', 'review/d62']); assert.equal(manifest.paintOrder.changedParentCount, 1); assert.equal(manifest.paintOrder.nativeVerification, 'NOT_RUN');
    assert.deepEqual(result.paintOrder, { mode: 'positioned-siblings', changedParentCount: 1 });
    await assert.rejects(() => captureCommand(['--input', path.join(dir, 'missing.json'), '--output', path.join(dir, 'bad'), '--paint-order', 'global']), /paint-order/);
    await assert.rejects(() => readFile(path.join(dir, 'bad', 'design-spec.json')), /ENOENT/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
