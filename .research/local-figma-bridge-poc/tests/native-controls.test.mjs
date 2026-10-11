import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { adaptCaptures } from '../capture/adapter.mjs';
import { enrichDesignSystem } from '../design/enrich.mjs';
import { captureCommand } from '../capture/cli.mjs';

const style = { display: 'block', position: 'static', transform: 'none', overflowX: 'visible', overflowY: 'visible', opacity: '1', backgroundColor: 'transparent', color: '#2a2017', fontFamily: 'Noto Sans SC', fontSize: '14px', fontWeight: '400', lineHeight: '20px' };
const rect = { x: 0, y: 0, width: 400, height: 300 };
const sampled = { nativeControls: 'sampled' };
const progressCapture = () => ({ id: 'controls', captureVersion: '1.0', viewport: { width: 400, height: 300 }, root: { id: 'root', kind: 'element', tag: 'body', rect, style, children: [
  { id: 'progress', kind: 'element', tag: 'progress', rect: { x: 20, y: 20, width: 220, height: 12 }, style: { ...style, accentColor: '#a97830' }, attrs: { value: 1000, max: 1000, indeterminate: false }, children: [] },
] } });
const detailsCapture = () => ({ id: 'controls', captureVersion: '1.0', viewport: { width: 400, height: 300 }, root: { id: 'root', kind: 'element', tag: 'body', rect, style, children: [
  { id: 'details', kind: 'element', tag: 'details', rect: { x: 20, y: 20, width: 300, height: 36 }, style, attrs: { open: false }, children: [
    { id: 'summary', kind: 'element', tag: 'summary', rect: { x: 20, y: 20, width: 300, height: 36 }, style, children: [
      { id: 'summary-t0', kind: 'text', text: '证据与判断', rect: { x: 25, y: 28, width: 100, height: 19 }, style },
    ] },
    { id: 'facts', kind: 'element', tag: 'div', rect: { x: 20, y: 56, width: 300, height: 200 }, style, children: [
      { id: 'facts-t0', kind: 'text', text: 'OCR 置信度 99%', rect: { x: 25, y: 64, width: 120, height: 19 }, style },
    ] },
  ] },
] } });
const fill = result => result.spec.nodes.find(node => node.key === 'controls/progress/progress-fill');
const byKey = spec => Object.fromEntries(spec.nodes.map(node => [node.key, node]));

test('native-controls defaults to captured without changing structure, metadata or visibility', () => {
  for (const input of [progressCapture(), detailsCapture()]) {
    const before = structuredClone(input), normal = adaptCaptures([input]), explicit = adaptCaptures([input], { nativeControls: 'captured' });
    assert.deepEqual(normal.spec, explicit.spec); assert.equal(normal.manifest.nativeControls, undefined); assert.equal(explicit.manifest.nativeControls, undefined);
    const stable = value => { const copy = structuredClone(value); delete copy.convertedAt; return copy; };
    assert.deepEqual(stable(normal.manifest), stable(explicit.manifest)); assert.deepEqual(input, before);
    assert.ok(normal.spec.nodes.every(node => node.props.visible === undefined)); assert.equal(fill(normal), undefined);
  }
  assert.throws(() => adaptCaptures([progressCapture()], { nativeControls: 'animated' }), /nativeControls/);
  assert.throws(() => adaptCaptures([progressCapture()], { nativeControls: null }), /nativeControls/);
});

test('sampled determinate progress builds editable accent rectangles for completion and partial ratios', () => {
  for (const [value, width] of [[1000, 220], [500, 110]]) {
    const input = progressCapture(); input.root.children[0].attrs.value = value;
    const before = structuredClone(input), result = adaptCaptures([input], sampled), node = fill(result), record = result.manifest.nativeControls.progress[0];
    assert.equal(node.type, 'RECTANGLE'); assert.equal(node.parentKey, 'controls/progress');
    assert.deepEqual([node.x, node.y, node.width, node.height], [0, 0, width, 12]); assert.deepEqual(node.props.strokes, []);
    assert.deepEqual(node.props.fills, [{ type: 'SOLID', color: { r: 169 / 255, g: 120 / 255, b: 48 / 255 }, opacity: 1 }]);
    assert.equal(record.state, 'DETERMINATE'); assert.equal(record.ratio, value / 1000); assert.equal(record.fillNodeKey, node.key);
    assert.equal(record.track, 'UNKNOWN'); assert.equal(record.sources.value.kind, 'CAPTURED'); assert.equal(record.sources.accentColor.kind, 'CAPTURED');
    assert.equal(result.manifest.nativeControls.progressFillCount, 1); assert.equal(result.manifest.nativeControls.nativeVisual, 'NOT_RUN');
    assert.ok(result.manifest.warnings.some(w => w.code === 'PROGRESS_TRACK_UNKNOWN')); assert.deepEqual(input, before);
  }
});

test('sampled progress ratio zero does not invent a minimum fill or a platform track', () => {
  const input = progressCapture(); input.root.children[0].attrs.value = 0;
  const result = adaptCaptures([input], sampled), record = result.manifest.nativeControls.progress[0];
  assert.equal(fill(result), undefined); assert.equal(record.state, 'DETERMINATE'); assert.equal(record.ratio, 0); assert.equal(record.fillNodeKey, null);
  assert.equal(result.manifest.nativeControls.progressFillCount, 0);
  const wrapper = result.spec.nodes.find(n => n.key === 'controls/progress'); assert.deepEqual(wrapper.props.fills, []);
});

test('sampled progress refuses missing or invalid state and numeric ranges instead of clamping', () => {
  const cases = [
    ['missing state', attrs => { delete attrs.indeterminate; }], ['string state', attrs => { attrs.indeterminate = 'false'; }],
    ['missing value', attrs => { delete attrs.value; }], ['string value', attrs => { attrs.value = '1000'; }], ['negative value', attrs => { attrs.value = -1; }],
    ['nonfinite value', attrs => { attrs.value = Infinity; }], ['value beyond max', attrs => { attrs.value = 1001; }],
    ['missing max', attrs => { delete attrs.max; }], ['string max', attrs => { attrs.max = '1000'; }], ['zero max', attrs => { attrs.max = 0; }],
    ['negative max', attrs => { attrs.max = -1; }], ['nonfinite max', attrs => { attrs.max = NaN; }],
  ];
  for (const [name, change] of cases) {
    const input = progressCapture(); change(input.root.children[0].attrs);
    const result = adaptCaptures([input], sampled), record = result.manifest.nativeControls.progress[0];
    assert.equal(fill(result), undefined, name); assert.ok(['UNKNOWN', 'INVALID'].includes(record.state), name); assert.equal(record.fillNodeKey, null, name);
    assert.ok(result.manifest.warnings.some(w => /PROGRESS_(?:STATE|VALUE|MAX|RATIO)/.test(w.code)), name);
  }
});

test('sampled indeterminate progress records an unknown visual and adds no timer or fill', () => {
  const input = progressCapture(); input.root.children[0].attrs = { indeterminate: true };
  const result = adaptCaptures([input], sampled), record = result.manifest.nativeControls.progress[0];
  assert.equal(record.state, 'INDETERMINATE'); assert.equal(record.fillNodeKey, null); assert.equal(fill(result), undefined); assert.deepEqual(result.spec.reactions, []);
  assert.ok(result.manifest.warnings.some(w => w.code === 'PROGRESS_INDETERMINATE_UNKNOWN')); assert.equal(result.manifest.nativeControls.nativeVisual, 'NOT_RUN');
});

test('sampled progress does not guess accent color, track pixels or a too-small fill', () => {
  for (const accentColor of [undefined, 'auto', 'CanvasText', 'invalid']) {
    const input = progressCapture(); input.root.children[0].style.accentColor = accentColor;
    const result = adaptCaptures([input], sampled); assert.equal(fill(result), undefined);
    assert.ok(result.manifest.warnings.some(w => w.code === 'PROGRESS_ACCENT_UNKNOWN'));
  }
  const tiny = progressCapture(); tiny.root.children[0].attrs.value = 0.001;
  const result = adaptCaptures([tiny], sampled); assert.equal(fill(result), undefined); assert.ok(result.manifest.warnings.some(w => w.code === 'PROGRESS_FILL_TOO_SMALL'));
});

test('closed details retains summary, nodes, geometry and reaction source keys while hiding content', () => {
  const input = detailsCapture(), options = { ...sampled, links: [{ sceneId: 'controls', sourceId: 'facts-t0', targetSceneId: 'controls' }] };
  const before = adaptCaptures([input], { links: options.links }), after = adaptCaptures([input], options), old = byKey(before.spec), next = byKey(after.spec);
  assert.deepEqual(Object.keys(next), Object.keys(old)); assert.deepEqual(after.spec.reactions, before.spec.reactions); assert.equal(after.spec.reactions.length, 1);
  for (const key of ['controls/details', 'controls/summary', 'controls/summary-t0']) assert.deepEqual(next[key], old[key]);
  for (const key of ['controls/facts', 'controls/facts-t0']) { assert.equal(next[key].props.visible, false); assert.deepEqual({ ...next[key], props: { ...next[key].props, visible: undefined } }, { ...old[key], props: { ...old[key].props, visible: undefined } }); }
  assert.equal(next['controls/details'].props.clipsContent, false); assert.equal(next['controls/facts'].props.clipsContent, false);
  const record = after.manifest.nativeControls.details[0]; assert.equal(record.state, 'CLOSED'); assert.deepEqual(record.hiddenRootKeys, ['controls/facts']); assert.equal(record.summaryKey, 'controls/summary');
  assert.equal(record.summaryMarker, 'UNKNOWN'); assert.equal(record.sources.open.kind, 'CAPTURED'); assert.equal(after.manifest.nativeControls.hiddenNodeCount, 2);
  assert.ok(after.manifest.warnings.some(w => w.code === 'DETAILS_MARKER_UNKNOWN'));
});

test('open and unknown details keep captured visibility, while nested open details cannot escape closed ancestors', () => {
  for (const open of [true, undefined, 'false']) {
    const input = detailsCapture(); input.root.children[0].attrs.open = open;
    const before = adaptCaptures([input]), after = adaptCaptures([input], sampled);
    assert.deepEqual(after.spec, before.spec); assert.equal(after.manifest.nativeControls.details[0].state, open === true ? 'OPEN' : 'UNKNOWN');
    if (open !== true) assert.ok(after.manifest.warnings.some(w => w.code === 'DETAILS_OPEN_UNKNOWN'));
  }
  const input = detailsCapture(), body = input.root.children[0].children[1], nested = detailsCapture().root.children[0];
  nested.id = 'nested'; nested.attrs.open = true; nested.children = [];
  body.children.push(nested);
  const result = adaptCaptures([input], sampled); assert.equal(result.spec.nodes.find(n => n.key === 'controls/nested').props.visible, false);
  assert.equal(result.manifest.nativeControls.details.find(d => d.sourceId === 'nested').state, 'OPEN');
});

test('closed details propagates hidden state through sticky promotion and generated control/vector nodes', () => {
  const input = detailsCapture(), facts = input.root.children[0].children[1];
  input.root.style = { ...style, overflowY: 'auto' }; input.root.scroll = { width: 400, height: 700, left: 0, top: 0 };
  const svg = '<svg viewBox="0 0 10 10"><path d="M 0 0 L 10 0 L 10 10 Z"/></svg>';
  facts.children.push(
    { id: 'sticky', kind: 'element', tag: 'div', rect: { x: 20, y: 220, width: 300, height: 36 }, style: { ...style, position: 'sticky' }, children: [] },
    { id: 'field', kind: 'element', tag: 'select', rect: { x: 20, y: 120, width: 180, height: 32 }, style, attrs: { value: 'HTML 文档' }, children: [] },
    ...['icon-a', 'icon-b'].map((id, i) => ({ id, kind: 'svg', tag: 'svg', rect: { x: 220 + i * 20, y: 120, width: 10, height: 10 }, style, svg })),
  );
  const result = adaptCaptures([input], sampled), hidden = ['facts', 'facts-t0', 'sticky', 'field', 'field/value', 'field/caret', 'icon-a', 'icon-a/path-1', 'icon-b', 'icon-b/path-1'];
  for (const id of hidden) assert.equal(result.spec.nodes.find(n => n.key === `controls/${id}`).props.visible, false, id);
  const sticky = result.spec.nodes.find(n => n.key === 'controls/sticky'); assert.equal(sticky.parentKey, 'controls/root'); assert.equal(sticky.props.isFixed, true);
  const enriched = enrichDesignSystem(result.spec).spec;
  for (const id of hidden) assert.equal(enriched.nodes.find(n => n.key === `controls/${id}`).props.visible, false, id);
  assert.equal(enriched.nodes.find(n => n.key === 'controls/icon-a/path-1').type, 'INSTANCE');
});

test('native-controls manifest distinguishes HTML attribute and static CSS evidence from captured fields', () => {
  const input = progressCapture(), node = input.root.children[0];
  node.attrsEvidence = { value: { kind: 'HTML_ATTRIBUTE_DERIVED', nodeId: node.id, tag: 'progress', attribute: 'value', present: true, sourceValue: '1000' } };
  node.styleEvidence = { accentColor: { kind: 'STATIC_CSS_DERIVED', nodeId: node.id, selector: '.al-search-job-strip progress', declaration: 'accent-color: var(--accent)', variableSelector: ':root', variableDeclaration: '--accent: #a97830', matchingInlineAncestors: [] } };
  const result = adaptCaptures([input], sampled), sources = result.manifest.nativeControls.progress[0].sources;
  assert.equal(sources.value.kind, 'HTML_ATTRIBUTE_DERIVED'); assert.deepEqual(sources.value.evidence, node.attrsEvidence.value);
  assert.equal(sources.accentColor.kind, 'STATIC_CSS_DERIVED'); assert.deepEqual(sources.accentColor.evidence, node.styleEvidence.accentColor);
  assert.equal(sources.max.kind, 'CAPTURED'); assert.equal(sources.indeterminate.kind, 'CAPTURED');
});

test('sampled native controls reject contradictory or unsupported derived provenance', () => {
  const input = progressCapture(), node = input.root.children[0];
  node.attrsEvidence = { value: { kind: 'HTML_ATTRIBUTE_DERIVED', nodeId: 'other', tag: 'progress', attribute: 'value', present: true, sourceValue: '1000' } };
  let result = adaptCaptures([input], sampled);
  assert.equal(fill(result), undefined); assert.equal(result.manifest.nativeControls.progress[0].sources.value.kind, 'UNKNOWN');
  assert.ok(result.manifest.warnings.some(w => w.code === 'PROGRESS_VALUE_UNKNOWN'));
  node.attrsEvidence.value.nodeId = node.id; node.attrsEvidence.value.sourceValue = '500';
  result = adaptCaptures([input], sampled); assert.equal(fill(result), undefined);
  delete node.attrsEvidence;
  node.styleEvidence = { accentColor: { kind: 'STATIC_CSS_DERIVED', nodeId: node.id, selector: '.al-search-job-strip progress', declaration: 'accent-color: var(--accent)', variableSelector: ':root', variableDeclaration: '--accent: #000000', matchingInlineAncestors: [] } };
  result = adaptCaptures([input], sampled); assert.equal(fill(result), undefined); assert.equal(result.manifest.nativeControls.progress[0].sources.accentColor.kind, 'UNKNOWN');
  assert.ok(result.manifest.warnings.some(w => w.code === 'PROGRESS_ACCENT_UNKNOWN'));
  const details = detailsCapture(), element = details.root.children[0];
  element.attrsEvidence = { open: { kind: 'HTML_ATTRIBUTE_DERIVED', nodeId: element.id, tag: 'details', attribute: 'open', present: true, sourceValue: '' } };
  result = adaptCaptures([details], sampled);
  assert.equal(result.manifest.nativeControls.details[0].state, 'UNKNOWN'); assert.equal(result.spec.nodes.find(n => n.key === 'controls/facts').props.visible, undefined);
});

test('closed details keeps only the first direct summary and hides nested generated progress', () => {
  const input = detailsCapture(), details = input.root.children[0], second = structuredClone(details.children[0]);
  second.id = 'second-summary'; second.children[0].id = 'second-summary-t0'; details.children.push(second);
  const progress = progressCapture().root.children[0]; details.children[1].children.push(progress);
  const result = adaptCaptures([input], sampled), record = result.manifest.nativeControls.details[0];
  assert.deepEqual(record.hiddenRootKeys, ['controls/facts', 'controls/second-summary']);
  for (const key of ['controls/second-summary', 'controls/second-summary-t0', 'controls/progress', 'controls/progress/progress-fill']) assert.equal(result.spec.nodes.find(n => n.key === key).props.visible, false, key);
  assert.equal(result.spec.nodes.find(n => n.key === 'controls/summary').props.visible, undefined);
});

test('native-controls CLI forwards archive opt-in, keeps captured default and rejects unknown modes before I/O', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'design-capture-native-controls-'));
  try {
    const input = detailsCapture(), progress = progressCapture().root.children[0]; progress.attrs = {}; delete progress.style.accentColor;
    delete input.root.children[0].attrs.open; input.root.attrs = { class: 'al-search-job-strip' }; input.root.children.push(progress);
    const file = path.join(dir, 'controls.json'), htmlDir = path.join(dir, 'html'); await mkdir(htmlDir); await writeFile(file, JSON.stringify(input));
    await writeFile(path.join(htmlDir, 'controls.html'), '<style>:root{--accent:#a97830}.al-search-job-strip progress{accent-color:var(--accent)}</style><body class="al-search-job-strip" data-design-id="root"><details data-design-id="details"><summary data-design-id="summary">证据与判断</summary><div data-design-id="facts"></div></details><progress data-design-id="progress" value="1000" max="1000"></progress></body>');
    const normalOut = path.join(dir, 'captured'), sampledOut = path.join(dir, 'sampled');
    await captureCommand(['--input', file, '--output', normalOut, '--html-directory', htmlDir]);
    const normal = JSON.parse(await readFile(path.join(normalOut, 'design-spec.json'), 'utf8')); assert.equal(fill({ spec: normal }), undefined); assert.equal(normal.nodes.find(n => n.key === 'controls/facts').props.visible, undefined);
    const explicitOut = path.join(dir, 'explicit-captured');
    await captureCommand(['--input', file, '--output', explicitOut, '--html-directory', htmlDir, '--native-controls', 'captured']);
    assert.deepEqual(JSON.parse(await readFile(path.join(explicitOut, 'design-spec.json'), 'utf8')), normal);
    const result = await captureCommand(['--input', file, '--output', sampledOut, '--html-directory', htmlDir, '--native-controls', 'sampled', '--design-system']);
    const spec = JSON.parse(await readFile(path.join(sampledOut, 'design-spec.json'), 'utf8')), manifest = JSON.parse(await readFile(path.join(sampledOut, 'capture-manifest.json'), 'utf8'));
    assert.equal(fill({ spec }).width, 220); assert.equal(spec.nodes.find(n => n.key === 'controls/facts').props.visible, false);
    assert.equal(manifest.nativeControls.progress[0].sources.value.kind, 'HTML_ATTRIBUTE_DERIVED'); assert.equal(manifest.nativeControls.progress[0].sources.accentColor.kind, 'STATIC_CSS_DERIVED');
    assert.equal(manifest.nativeControls.details[0].sources.open.kind, 'HTML_ATTRIBUTE_DERIVED'); assert.equal(result.nativeControls.nativeVisual, 'NOT_RUN');
    await assert.rejects(() => captureCommand(['--input', path.join(dir, 'missing.json'), '--output', path.join(dir, 'bad'), '--native-controls', 'animate']), /native-controls/);
    await assert.rejects(() => readFile(path.join(dir, 'bad', 'design-spec.json')), /ENOENT/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
