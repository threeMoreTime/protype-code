import test from 'node:test';
import assert from 'node:assert/strict';
import { enrichFromArchivedHTML } from '../capture/archive-html.mjs';
import { captureDOM } from '../capture/dom-capture.mjs';

const options = { nativeControls: true };
const accentCss = '<style>:root { --accent: oklch(49% .135 46); } .al-search-job-strip progress { width: min(220px, 28vw); accent-color: var(--accent); } .al-logical-job progress { width: 100%; accent-color: var(--accent); }</style>';
const progressCapture = (id = 'd55', logical = false) => ({ id: logical ? 'extra-logical-results' : 'search', root: { id: 'd1', tag: 'body', attrs: {}, children: [
  { id: 'd5', tag: 'div', attrs: { class: 'al-app' }, children: [
    { id: 'strip', tag: 'section', attrs: { class: logical ? 'al-logical-job' : 'al-search-job-strip' }, children: [
      { id, tag: 'progress', kind: 'element', rect: { x: 164, y: 214.1999969, width: 220, height: 12 }, style: { backgroundColor: 'rgba(0, 0, 0, 0)' }, attrs: {}, children: [] },
    ] },
  ] },
] } });
const progressNode = capture => capture.root.children[0].children[0].children[0];
const progressHtml = (id = 'd55', attributes = 'max="1000" value="1000"', logical = false) => accentCss + `<body data-design-id="d1"><div class="al-app" data-design-id="d5" style="--accent: oklch(49% .135 46)"><section class="${logical ? 'al-logical-job' : 'al-search-job-strip'}" data-design-id="strip"><progress ${attributes} data-design-id="${id}"></progress></section></div></body>`;
const detailsCapture = () => ({ id: 'compact-review-drawer', root: { id: 'd1', tag: 'body', children: [
  { id: 'd156', tag: 'details', attrs: { class: 'al-review-metadata' }, rect: { x: 688, y: 429.1000061, width: 370, height: 36 }, children: [
    { id: 'd157', tag: 'summary', children: [{ id: 'summary-text', kind: 'text', text: '证据与判断' }] },
    { id: 'd158', tag: 'div', rect: { x: 688, y: 465.1000061, width: 370, height: 264 }, children: [{ id: 'd163-t0', kind: 'text', text: 'OCR 置信度' }] },
  ] },
] } });
const detailsHtml = attributes => `<body data-design-id="d1"><details class="al-review-metadata" ${attributes} data-design-id="d156"><summary data-design-id="d157">证据与判断</summary><div data-design-id="d158">OCR 置信度</div></details></body>`;
const enrich = (capture, html) => enrichFromArchivedHTML(capture, html, new Map(), options);

test('native control supplements are opt-in and leave unspecified legacy conversion unchanged', () => {
  for (const [capture, html] of [[progressCapture(), progressHtml()], [detailsCapture(), detailsHtml('')]]) {
    assert.deepEqual(enrichFromArchivedHTML(capture, html), capture);
    assert.deepEqual(enrichFromArchivedHTML(capture, html, new Map(), { nativeControls: false }), capture);
  }
});

test('search and compact search archived progress values retain exact attribute and CSS evidence', () => {
  for (const scene of ['search', 'extra-compact-search']) {
    const input = progressCapture(); input.id = scene; const before = structuredClone(input);
    const output = enrich(input, progressHtml()); const node = progressNode(output);
    assert.deepEqual(input, before);
    assert.deepEqual(node.attrs, { value: 1000, max: 1000, indeterminate: false });
    assert.equal(node.attrsEvidence.value.kind, 'HTML_ATTRIBUTE_DERIVED');
    assert.equal(node.attrsEvidence.value.sourceValue, '1000');
    assert.equal(node.attrsEvidence.indeterminate.present, true);
    assert.equal(node.style.accentColor, 'oklch(49% .135 46)');
    assert.equal(node.styleEvidence.accentColor.kind, 'STATIC_CSS_DERIVED');
    assert.equal(node.styleEvidence.accentColor.selector, '.al-search-job-strip progress');
    assert.deepEqual(node.styleEvidence.accentColor.matchingInlineAncestors, ['d5']);
    assert.deepEqual(node.rect, before.root.children[0].children[0].children[0].rect);
    assert.deepEqual(node.children, []);
  }
});

test('logical progress uses its own exact source selector and numeric attributes', () => {
  const output = enrich(progressCapture('d75', true), progressHtml('d75', 'max="3000" value="3000"', true));
  assert.deepEqual(progressNode(output).attrs, { value: 3000, max: 3000, indeterminate: false });
  assert.equal(progressNode(output).styleEvidence.accentColor.selector, '.al-logical-job progress');
});

test('closed compact drawer details preserve summary and facts with a derived closed state', () => {
  const input = detailsCapture(); const before = structuredClone(input);
  const output = enrich(input, detailsHtml('')); const details = output.root.children[0];
  assert.deepEqual(input, before);
  assert.equal(details.attrs.open, false);
  assert.deepEqual(details.attrsEvidence.open, { kind: 'HTML_ATTRIBUTE_DERIVED', nodeId: 'd156', tag: 'details', attribute: 'open', present: false });
  assert.deepEqual(details.children, before.root.children[0].children);
  assert.deepEqual(details.rect, before.root.children[0].rect);
});

test('details open follows actual boolean attribute presence, including open="false"', () => {
  for (const attribute of ['open', 'open=""', 'open="false"', 'OPEN=0']) {
    const details = enrich(detailsCapture(), detailsHtml(attribute)).root.children[0];
    assert.equal(details.attrs.open, true);
    assert.equal(details.attrsEvidence.open.present, true);
  }
  assert.equal(enrich(detailsCapture(), detailsHtml('data-open="true"')).root.children[0].attrs.open, false);
});

test('existing values, false states and computed accentColor are not overwritten', () => {
  const input = progressCapture(); const node = progressNode(input);
  node.attrs = { value: 0, max: 2, indeterminate: true }; node.style.accentColor = 'auto';
  assert.deepEqual(enrich(input, progressHtml()), input);
  const details = detailsCapture(); details.root.children[0].attrs.open = true;
  assert.deepEqual(enrich(details, detailsHtml('')), details);
});

test('missing progress values remain unknown while indeterminate is backed by attribute absence', () => {
  const node = progressNode(enrich(progressCapture(), progressHtml('d55', '')));
  assert.equal(Object.hasOwn(node.attrs, 'value'), false);
  assert.equal(Object.hasOwn(node.attrs, 'max'), false);
  assert.equal(node.attrs.indeterminate, true);
  assert.equal(node.attrsEvidence.indeterminate.present, false);
  const zero = progressNode(enrich(progressCapture(), progressHtml('d55', 'value=0 max=1')));
  assert.deepEqual(zero.attrs, { value: 0, max: 1, indeterminate: false });
});

test('invalid and malicious numeric attributes are not converted or executed', () => {
  for (const attribute of ['value="Infinity" max="0"', 'value="-1" max="-2"', 'value="0x10" max="1e999"', 'value="" max="javascript:alert(1)"', 'value="1000;globalThis.captureTouched=true" max="calc(100)"']) {
    const node = progressNode(enrich(progressCapture(), progressHtml('d55', attribute)));
    assert.equal(Object.hasOwn(node.attrs, 'value'), false);
    assert.equal(Object.hasOwn(node.attrs, 'max'), false);
    assert.equal(node.attrs.indeterminate, false);
  }
  assert.equal(globalThis.captureTouched, undefined);
});

test('ambiguous IDs, conflicting attributes, wrong tags and inert markup have no supplement', () => {
  for (const html of [
    '<progress value=1 max=2 data-design-id="missing"></progress>',
    '<div value=1 max=2 data-design-id="d55"></div>',
    '<progress value=1 value=2 max=2 data-design-id="d55"></progress>',
    '<progress value=1 max=2 data-design-id="d55"></progress><progress value=2 max=2 data-design-id="d55"></progress>',
    '<progress value=1 max=2 data-design-id="d55"></progress><div data-design-id="d55"></div>',
    '<!--<progress value=1 max=2 data-design-id="d55"></progress>-->',
    '<script><progress value=1 max=2 data-design-id="d55"></progress></script>',
  ]) assert.deepEqual(enrich(progressCapture(), html), progressCapture());
  assert.deepEqual(enrich(detailsCapture(), detailsHtml('open open="false"')), detailsCapture());
});

test('conflicting, conditional or inline accent declarations preserve UNKNOWN color', () => {
  for (const html of [
    progressHtml() + '<style>.al-search-job-strip progress { accent-color: red; }</style>',
    progressHtml() + '<style>@media (max-width:1200px) { .al-search-job-strip progress { accent-color: red; } }</style>',
    progressHtml() + '<style>:root { --accent: rgb(1, 2, 3); }</style>',
    progressHtml().replace('--accent: oklch(49% .135 46)"', '--accent: rgb(1, 2, 3)"'),
    progressHtml().replace('<progress max=', '<progress style="accent-color: red" max='),
    progressHtml().replace('accent-color: var(--accent)', 'accent-color: url(https://invalid.example/color)'),
    progressHtml().replaceAll('oklch(49% .135 46)', '#fffff'),
  ]) {
    const node = progressNode(enrich(progressCapture(), html));
    assert.equal(node.attrs.value, 1000);
    assert.equal(Object.hasOwn(node.style, 'accentColor'), false);
    assert.equal(node.styleEvidence?.accentColor, undefined);
  }
});

const unknownStyleCases = [
  ['global all reset', html => html + '<style>progress { all: initial; }</style>'],
  ['external stylesheet link', html => html + '<link rel="stylesheet" href="unknown.css">'],
  ['CSS import', html => html + '<style>@import url("unknown.css");</style>'],
  ['escaped accent property', html => html + String.raw`<style>progress { accent\-color: red; }</style>`],
  ['escaped global variable', html => html + String.raw`<style>* { --\61 ccent: red; }</style>`],
  ['inline node all reset', html => html.replace('<progress max=', '<progress style="all: initial" max=')],
  ['inline ancestor all reset', html => html.replace('style="--accent:', 'style="all: initial; --accent:')],
  ['inline escaped property', html => html.replace('<progress max=', String.raw`<progress style="accent\-color: red" max=`)],
  ['unsupported style attributes', html => html.replace('<style>', '<style media=print>')],
  ['registered non-inheriting variable', html => html + '<style>@property --accent { syntax: "<color>"; inherits: false; initial-value: red; }</style>'],
];
for (const [name, modify] of unknownStyleCases) test(`unknown static style source: ${name} keeps color UNKNOWN and HTML states`, () => {
  const html = modify(progressHtml() + detailsHtml('').replace('<body data-design-id="d1">', '').replace('</body>', ''));
  const input = progressCapture(); input.root.children.push(detailsCapture().root.children[0]);
  const output = enrich(input, html); const node = progressNode(output);
  assert.deepEqual(node.attrs, { value: 1000, max: 1000, indeterminate: false });
  assert.equal(Object.hasOwn(node.style, 'accentColor'), false);
  assert.equal(node.styleEvidence?.accentColor, undefined);
  assert.equal(output.root.children[1].attrs.open, false);
  assert.equal(output.root.children[1].attrsEvidence.open.kind, 'HTML_ATTRIBUTE_DERIVED');
  assert.deepEqual(enrichFromArchivedHTML(input, html), input);
});

function liveCapture(tag, attributes, properties) {
  class ElementStub {
    tagName = tag.toUpperCase(); childNodes = []; scrollLeft = 0; scrollTop = 0; scrollWidth = 100; scrollHeight = 80;
    matches() { return false; }
    getBoundingClientRect() { return { x: 0, y: 0, width: 100, height: 80 }; }
    getAttribute(name) { return Object.hasOwn(attributes, name) ? attributes[name] : null; }
    hasAttribute(name) { return Object.hasOwn(attributes, name); }
  }
  const element = Object.assign(new ElementStub(), properties);
  const globals = { Element: ElementStub, document: { querySelector: () => element }, getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1', position: 'static', accentColor: 'rgb(174, 65, 4)' }), innerWidth: 100, innerHeight: 80 };
  const previous = Object.fromEntries(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  try {
    for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    return captureDOM({ id: 'live', revision: 'test' });
  } finally {
    for (const key of Object.keys(globals)) { if (previous[key]) Object.defineProperty(globalThis, key, previous[key]); else delete globalThis[key]; }
  }
}

test('modern progress collector retains browser properties and computed accentColor', () => {
  const completed = liveCapture('progress', { value: '1000', max: '1000' }, { value: 1000, max: 1000 });
  assert.deepEqual({ value: completed.root.attrs.value, max: completed.root.attrs.max, indeterminate: completed.root.attrs.indeterminate }, { value: 1000, max: 1000, indeterminate: false });
  assert.equal(completed.root.style.accentColor, 'rgb(174, 65, 4)');
  const indeterminate = liveCapture('progress', {}, { value: 0, max: 1 });
  assert.equal(indeterminate.root.attrs.indeterminate, true);
  assert.equal(indeterminate.root.attrs.max, 1);
});

test('modern details collector trusts real open attribute rather than unrelated property', () => {
  assert.equal(liveCapture('details', {}, { open: true }).root.attrs.open, false);
  assert.equal(liveCapture('details', { open: '' }, { open: false }).root.attrs.open, true);
});
