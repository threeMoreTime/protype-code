import test from 'node:test';
import assert from 'node:assert/strict';
import { enrichFromArchivedHTML } from '../capture/archive-html.mjs';
import { captureDOM } from '../capture/dom-capture.mjs';
import { adaptCaptures } from '../capture/adapter.mjs';

const capture = () => ({ id: 'review', root: { id: 'wrap', tag: 'div', style: { position: 'relative' }, children: [
  { id: 'overlay', tag: 'div', attrs: { class: 'al-viewer-overlays extra' }, style: { position: 'absolute' }, children: [{ id: 'toolbar', tag: 'div', children: [] }] },
  { id: 'positioner', tag: 'div', style: { position: 'absolute' }, children: [{ id: 'image', tag: 'img', kind: 'image', dataUrl: 'data:image/png;base64,AA==', children: [] }] },
] } });
const rule = '<style>.al-viewer-overlays { position: absolute; z-index: 3; top: 10px; }</style>';
const element = '<div class="al-viewer-overlays extra" data-design-id="overlay"></div>';
const archivedFlexCapture = () => {
  const style = { display: 'block', position: 'static', transform: 'none', opacity: '1', color: '#333333', backgroundColor: 'transparent', overflowX: 'visible', overflowY: 'visible' };
  const rect = { x: 0, y: 0, width: 600, height: 400 };
  return { id: 'search', viewport: { width: 600, height: 400 }, root: { id: 'root', kind: 'element', tag: 'body', style, rect, children: [
    { id: 'viewer', kind: 'element', tag: 'div', rect, style: { ...style, display: 'flex', position: 'relative' }, children: [
      { id: 'overlay', kind: 'element', tag: 'div', attrs: { class: 'al-viewer-overlays extra' }, rect, style: { ...style, position: 'absolute' }, children: [] },
      { id: 'flow', kind: 'element', tag: 'div', attrs: { class: 'al-search-viewer-scroll' }, rect, style: { ...style, display: 'flex' }, children: [
        { id: 'canvas', kind: 'element', tag: 'div', attrs: { class: 'al-search-page-canvas' }, rect, style: { ...style, position: 'relative' }, children: [] },
      ] },
    ] },
  ] } };
};

test('archived flex search overlay evidence alone cannot invent auto z-index for the static flow branch', () => {
  const source = archivedFlexCapture(), derived = enrichFromArchivedHTML(source, rule + element);
  assert.equal(derived.root.children[0].children[0].style.zIndex, '3');
  assert.equal(derived.root.children[0].children[1].style.zIndex, undefined);
  const before = adaptCaptures([derived]), after = adaptCaptures([derived], { paintOrder: 'positioned-siblings' });
  assert.deepEqual(after.spec, before.spec); assert.equal(after.manifest.paintOrder.changedParentCount, 0);
});

test('separately proven archived auto z-index for every static flow descendant enables source-preserving flex ordering', () => {
  const derived = enrichFromArchivedHTML(archivedFlexCapture(), rule + element), flow = derived.root.children[0].children[1];
  for (const node of [flow, ...flow.children]) {
    node.style.zIndex = 'auto';
    node.styleEvidence = { zIndex: { kind: 'STATIC_CSS_DERIVED', nodeId: node.id, selector: `.${node.attrs.class}`, declaration: 'z-index: auto', positionDeclaration: `position: ${node.style.position}`, derivation: 'Explicit test fixture proof; converter must not supply this evidence' } };
  }
  const source = structuredClone(derived), before = adaptCaptures([derived]), after = adaptCaptures([derived], { paintOrder: 'positioned-siblings' });
  assert.deepEqual(after.spec.nodes.filter(n => n.parentKey === 'search/viewer').map(n => n.key), ['search/flow', 'search/overlay']);
  assert.deepEqual(Object.fromEntries(after.spec.nodes.map(n => [n.key,n])), Object.fromEntries(before.spec.nodes.map(n => [n.key,n])));
  assert.deepEqual(after.manifest.mappings, before.manifest.mappings); assert.deepEqual(derived, source);
  assert.equal(after.manifest.paintOrder.changedParents[0].flowZIndices.length, 2);
});

test('archived overlay supplements carry static evidence without changing tree order or input', () => {
  const input = capture(); const before = structuredClone(input);
  const result = enrichFromArchivedHTML(input, rule + element);
  assert.deepEqual(input, before);
  const expected = structuredClone(before);
  expected.root.children[0].style.zIndex = '3';
  expected.root.children[0].styleEvidence = { zIndex: { kind: 'STATIC_CSS_DERIVED', selector: '.al-viewer-overlays', positionDeclaration: 'position: absolute', declaration: 'z-index: 3', nodeId: 'overlay' } };
  assert.deepEqual(result, expected);
  assert.deepEqual(result.root.children.map(node => node.id), ['overlay', 'positioner']);
  assert.equal(result.root.children[1].children[0].dataUrl, before.root.children[1].children[0].dataUrl);
});

test('already captured zIndex values including zero and negatives are never overwritten', () => {
  for (const value of ['0', '-3', 'auto', '3', 0, -2]) {
    const input = capture(); input.root.children[0].style.zIndex = value;
    assert.deepEqual(enrichFromArchivedHTML(input, rule + element), input);
  }
});

test('inline position and z-index declarations leave legacy capture unchanged', () => {
  for (const style of ['z-index: 0', 'z-index: -4;', 'position: static', 'color: red; z-index: 5 !important']) {
    const input = capture();
    const html = rule + element.replace('data-design-id', `style="${style}" data-design-id`);
    assert.deepEqual(enrichFromArchivedHTML(input, html), input);
  }
});

test('conflicting rules and conditional media rules are not called computed style', () => {
  for (const extra of [
    '<style>.al-viewer-overlays { position: absolute; z-index: 0; }</style>',
    '<style>.al-page-wrap .al-viewer-overlays { z-index: -1; }</style>',
    '<style>@media (max-width: 1200px) { .al-viewer-overlays { z-index: 7; } }</style>',
    '<style media="screen">.al-viewer-overlays { z-index: 7; }</style>',
    '<style>.al-viewer-overlays:hover { z-index: 7; }</style>',
  ]) {
    const input = capture(); assert.deepEqual(enrichFromArchivedHTML(input, rule + extra + element), input);
  }
});

test('only exact known CSS and matching archived node attributes permit the supplement', () => {
  for (const html of [
    rule.replace('z-index: 3', 'z-index: 4') + element,
    rule.replace('position: absolute', 'position: fixed') + element,
    rule + element.replace('al-viewer-overlays extra', 'unrelated'),
    rule + element.replace('data-design-id="overlay"', 'data-design-id="missing"'),
    rule + element.replace('<div', '<section').replace('</div>', '</section>'),
    '<!--' + rule + '-->' + element,
    '<script type="text/plain">' + rule + '</script>' + element,
    rule + '<!--' + element + '-->',
    rule + '<script type="text/plain">' + element + '</script>',
  ]) {
    const input = capture(); assert.deepEqual(enrichFromArchivedHTML(input, html), input);
  }
  const input = capture(); input.root.children[0].attrs.class = 'unrelated';
  assert.deepEqual(enrichFromArchivedHTML(input, rule + element), input);
});

test('legacy HTML without the known rule remains completely compatible', () => {
  const input = capture();
  for (const html of [element, '<link rel="stylesheet" href="https://invalid.example/style.css">' + element, '<style>.other { z-index: 3; }</style>' + element]) {
    assert.deepEqual(enrichFromArchivedHTML(input, html), input);
  }
});

test('modern DOM collector retains the actual computed zIndex', () => {
  class ElementStub {
    tagName = 'DIV'; childNodes = []; scrollLeft = 0; scrollTop = 0; scrollWidth = 100; scrollHeight = 80;
    matches() { return false; }
    getBoundingClientRect() { return { x: 0, y: 0, width: 100, height: 80 }; }
    getAttribute() { return null; }
    hasAttribute() { return false; }
  }
  const elementStub = new ElementStub();
  const globals = { Element: ElementStub, document: { querySelector: () => elementStub }, getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1', position: 'absolute', zIndex: '-4' }), innerWidth: 100, innerHeight: 80 };
  const previous = Object.fromEntries(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  try {
    for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    const result = captureDOM({ id: 'modern', revision: 'test' });
    assert.equal(result.root.style.zIndex, '-4');
    assert.equal(result.root.styleEvidence, undefined);
  } finally {
    for (const key of Object.keys(globals)) { if (previous[key]) Object.defineProperty(globalThis, key, previous[key]); else delete globalThis[key]; }
  }
});
