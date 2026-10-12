import test from 'node:test';
import assert from 'node:assert/strict';
import { enrichFromArchivedHTML } from '../capture/archive-html.mjs';
import { adaptCaptures } from '../capture/adapter.mjs';

const style = { display: 'block', position: 'static', transform: 'none', overflowX: 'visible', overflowY: 'visible', opacity: '1', backgroundColor: 'transparent', color: '#2a2017', fontFamily: 'Noto Sans SC', fontSize: '14px', fontWeight: '400', lineHeight: '20px' };
const rect = { x: 0, y: 0, width: 400, height: 300 };
const capture = () => ({ id: 'controls', captureVersion: '1.0', viewport: { width: 400, height: 300 }, root: { id: 'root', kind: 'element', tag: 'body', rect, style, children: [
  { id: 'radio', kind: 'element', tag: 'input', rect: { x: 20, y: 20, width: 18, height: 13 }, style, attrs: { checked: null }, children: [] },
  { id: 'color', kind: 'element', tag: 'input', rect: { x: 20, y: 45, width: 44, height: 30 }, style, attrs: { checked: null }, children: [] },
  { id: 'range', kind: 'element', tag: 'input', rect: { x: 20, y: 90, width: 220, height: 16 }, style, attrs: { checked: null }, children: [] },
  { id: 'details', kind: 'element', tag: 'details', rect: { x: 20, y: 120, width: 300, height: 36 }, style, attrs: { open: false }, children: [
    { id: 'summary', kind: 'element', tag: 'summary', rect: { x: 20, y: 120, width: 300, height: 36 }, style, children: [
      { id: 'summary-t0', kind: 'text', text: '证据与判断', rect: { x: 34, y: 128, width: 100, height: 19 }, style },
    ] },
    { id: 'facts', kind: 'element', tag: 'div', rect: { x: 20, y: 156, width: 300, height: 100 }, style, children: [] },
  ] },
] } });
const html = '<body data-design-id="root"><input data-design-id="radio" type="radio" value="both" checked><input data-design-id="color" type="color" value="#c44516"><input data-design-id="range" type="range" min="10" max="60" step="1" value="18"><details data-design-id="details"><summary data-design-id="summary">证据与判断</summary></details></body>';
const evidence = { kind: 'EXPLICIT_VISUAL_SAMPLE', referenceSha256: 'a'.repeat(64), captureSha256: 'b'.repeat(64), htmlSha256: 'c'.repeat(64), note: 'Fixture visibly confirmed, platform geometry explicitly approximated.' };
const sample = (kind, fields = {}) => ({ kind, approximation: true, evidence, ...fields });
const enriched = input => enrichFromArchivedHTML(input, html, new Map(), { nativeControls: true });
const node = (result, key) => result.spec.nodes.find(n => n.key === `controls/${key}`);

test('archive input metadata preserves unknown live state and does not turn HTML defaults into captured state', () => {
  const input = capture(), before = structuredClone(input), result = enriched(input);
  const radio = result.root.children[0];
  assert.equal(radio.attrs.checked, null); assert.equal(radio.attrs.value, undefined); assert.equal(radio.attrs.inputType, undefined);
  assert.equal(radio.archivedControl.inputType.value, 'radio');
  assert.equal(radio.archivedControl.defaultChecked.value, true);
  assert.equal(radio.archivedControl.defaultChecked.evidence.kind, 'HTML_ATTRIBUTE_DERIVED');
  assert.equal(radio.archivedControl.defaultValue.value, 'both');
  assert.equal(result.root.children[2].archivedControl.min.value, 10);
  assert.equal(result.root.children[2].archivedControl.max.value, 60);
  assert.deepEqual(input, before);
  assert.equal(enrichFromArchivedHTML(input, html).root.children[0].archivedControl, undefined);
  const unknown = adaptCaptures([result], { nativeControls: 'sampled' });
  assert.equal(node(unknown, 'radio/choice-dot'), undefined);
  assert.equal(node(unknown, 'radio/value'), undefined);
  assert.equal(unknown.manifest.nativeControls.inputs[0].state, 'UNKNOWN');
});

test('sampled radio creates editable ring/dot before the generic input value branch', () => {
  const input = enriched(capture()); input.root.children[0].attrs.value = 'both';
  const result = adaptCaptures([input], { nativeControls: 'sampled', nativeControlSamples: { 'controls/radio': sample('radio', { checked: true }) } });
  assert.equal(node(result, 'radio/value'), undefined);
  assert.equal(node(result, 'radio/choice-ring').type, 'ELLIPSE');
  assert.equal(node(result, 'radio/choice-ring').width, 13);
  assert.equal(node(result, 'radio/choice-ring').x, 2.5);
  assert.equal(node(result, 'radio/choice-dot').type, 'ELLIPSE');
  const record = result.manifest.nativeControls.inputs[0];
  assert.equal(record.state, 'CHECKED'); assert.equal(record.sources.checked.kind, 'EXPLICIT_VISUAL_SAMPLE');
  assert.equal(record.visual, 'APPROXIMATED'); assert.equal(result.manifest.nativeControls.nativeVisual, 'NOT_RUN');
});

test('captured checked state wins over contradictory static defaults and explicit sample state', () => {
  const input = enriched(capture()); input.root.children[0].attrs = { inputType: 'radio', checked: false, value: 'both' };
  const result = adaptCaptures([input], { nativeControls: 'sampled', nativeControlSamples: { 'controls/radio': sample('radio', { checked: true }) } });
  assert.equal(node(result, 'radio/choice-ring').type, 'ELLIPSE'); assert.equal(node(result, 'radio/choice-dot'), undefined);
  assert.equal(result.manifest.nativeControls.inputs[0].sources.checked.kind, 'CAPTURED');
  assert.ok(result.manifest.warnings.some(w => w.code === 'NATIVE_CONTROL_SAMPLE_CONFLICT'));
});

test('sampled color value and range ratio require state evidence instead of using static defaults', () => {
  const input = enriched(capture()); const opts = { nativeControls: 'sampled', nativeControlSamples: {
    'controls/color': sample('color', { value: '#c44516' }),
    'controls/range': sample('range', { value: 18, accentColor: '#a54309', trackColor: '#eeeeee', trackHeight: 6, thumbSize: 16 }),
  } };
  const result = adaptCaptures([input], opts);
  assert.equal(node(result, 'color/color-swatch').type, 'RECTANGLE');
  assert.deepEqual(node(result, 'color/color-swatch').props.fills[0].color, { r: 196 / 255, g: 69 / 255, b: 22 / 255 });
  assert.equal(node(result, 'color/value'), undefined); assert.equal(node(result, 'range/value'), undefined);
  assert.equal(node(result, 'range/range-thumb').type, 'ELLIPSE');
  assert.equal(node(result, 'range/range-thumb').x, (220 - 16) * 0.16);
  assert.equal(result.manifest.nativeControls.inputs.find(x => x.sourceId === 'range').ratio, 0.16);
  const unknown = adaptCaptures([input], { nativeControls: 'sampled' });
  assert.equal(node(unknown, 'color/color-swatch'), undefined); assert.equal(node(unknown, 'range/range-thumb'), undefined);
});

test('range rejects absent or invalid bounds and values without clamping or defaults', () => {
  for (const change of [n => { delete n.archivedControl.min; }, n => { n.archivedControl.max.value = 10; n.archivedControl.max.evidence.sourceValue = '10'; }, n => { n.attrs.value = 61; n.attrs.valueCaptured = true; }]) {
    const input = enriched(capture()); change(input.root.children[2]);
    const result = adaptCaptures([input], { nativeControls: 'sampled', nativeControlSamples: { 'controls/range': sample('range', { value: 18, accentColor: '#a54309', trackColor: '#eeeeee' }) } });
    assert.equal(node(result, 'range/range-thumb'), undefined);
    assert.ok(result.manifest.warnings.some(w => /RANGE_(?:BOUNDS|VALUE)_UNKNOWN|RANGE_STATE_INVALID/.test(w.code)));
  }
});

test('explicit details marker stays inside the leading text gap and never creates toggle reactions', () => {
  const result = adaptCaptures([enriched(capture())], { nativeControls: 'sampled', nativeControlSamples: { 'controls/details': sample('details-marker', { open: false, markerWidth: 8, markerHeight: 8 }) } });
  const marker = node(result, 'summary/sampled-marker'); assert.equal(marker.type, 'VECTOR');
  assert.ok(marker.x >= 0 && marker.x + marker.width <= 14); assert.equal(marker.parentKey, 'controls/summary');
  assert.equal(node(result, 'facts').props.visible, false); assert.deepEqual(result.spec.reactions, []);
  assert.equal(result.manifest.nativeControls.details[0].summaryMarker, 'APPROXIMATED');
  const unknown = adaptCaptures([enriched(capture())], { nativeControls: 'sampled' }); assert.equal(node(unknown, 'summary/sampled-marker'), undefined);
  const noGap = enriched(capture()); noGap.root.children[3].children[0].children[0].rect.x = 20;
  assert.equal(node(adaptCaptures([noGap], { nativeControls: 'sampled', nativeControlSamples: { 'controls/details': sample('details-marker', { open: false }) } }), 'summary/sampled-marker'), undefined);
});

test('sample maps reject malformed provenance/fields and remain opt-in with no input mutation', () => {
  const input = enriched(capture()), before = structuredClone(input);
  for (const entry of [sample('radio', { checked: 'true' }), { ...sample('radio', { checked: true }), approximation: false }, { ...sample('radio', { checked: true }), evidence: { ...evidence, referenceSha256: 'invalid' } }, sample('radio', { checked: true, hiddenExtra: true })]) {
    assert.throws(() => adaptCaptures([input], { nativeControls: 'sampled', nativeControlSamples: { 'controls/radio': entry } }), /nativeControlSamples/);
  }
  const options = { nativeControlSamples: { 'controls/radio': sample('radio', { checked: true }) } };
  assert.throws(() => adaptCaptures([input], options), /nativeControlSamples/);
  assert.deepEqual(input, before);
});

test('archived control recovery ignores scripts, malformed/duplicate attributes, IDs and private input types', () => {
  for (const bad of [
    '<script>"<input data-design-id=radio type=radio checked>"</script>',
    '<input data-design-id=radio type=radio><input data-design-id=radio type=radio>',
    '<input data-design-id=radio type=radio type=color>',
    '<div data-design-id=radio type=radio checked>',
    '<input data-design-id=radio type=password value=secret>',
    '<input data-design-id=radio type=hidden value=secret>',
    '<input data-design-id=radio type=text value=secret>',
  ]) {
    assert.equal(enrichFromArchivedHTML(capture(), bad, new Map(), { nativeControls: true }).root.children[0].archivedControl, undefined);
  }
  const recovered = enrichFromArchivedHTML(capture(), "<input DATA-DESIGN-ID='radio' TYPE=radio CHECKED='false'>", new Map(), { nativeControls: true });
  assert.equal(recovered.root.children[0].archivedControl.defaultChecked.value, true);
});

test('captured mode remains identical after archived metadata enrichment and ignores typed sample rendering', () => {
  const input = capture(), enrichedInput = enriched(input);
  const before = adaptCaptures([input]), after = adaptCaptures([enrichedInput]);
  assert.deepEqual(after.spec, before.spec);
  assert.equal(after.manifest.nativeControls, undefined);
  assert.equal(node(after, 'radio/choice-ring'), undefined);
  assert.equal(node(after, 'color/color-swatch'), undefined);
});

test('sampled checkbox and all generated glyphs inherit closed details visibility', () => {
  const input = enriched(capture()), children = input.root.children;
  const details = children[3]; input.root.children = [details];
  children[0].attrs = { inputType: 'checkbox', checked: true };
  details.children.push(...children.slice(0, 3));
  const result = adaptCaptures([input], { nativeControls: 'sampled', nativeControlSamples: {
    'controls/color': sample('color', { value: '#c44516' }),
    'controls/range': sample('range', { value: 18, accentColor: '#a54309', trackColor: '#eeeeee' }),
    'controls/details': sample('details-marker', { open: false }),
  } });
  assert.equal(node(result, 'radio/choice-ring').type, 'RECTANGLE');
  assert.equal(node(result, 'radio/choice-check').type, 'VECTOR');
  for (const suffix of ['radio/choice-ring', 'radio/choice-check', 'color/color-swatch', 'range/range-track', 'range/range-fill', 'range/range-thumb']) assert.equal(node(result, suffix).props.visible, false);
  assert.equal(node(result, 'summary/sampled-marker').props.visible, undefined);
  assert.equal(result.manifest.nativeControls.sampledShapeCount, 7);
});

test('forged metadata and unknown details provenance do not produce state or marker evidence', () => {
  const input = enriched(capture());
  input.root.children[0].archivedControl.inputType.evidence.nodeId = 'different';
  input.root.children[2].archivedControl.min.evidence.sourceValue = 'not-10';
  input.root.children[3].attrsEvidence = { open: { kind: 'HTML_ATTRIBUTE_DERIVED', nodeId: 'different', tag: 'details', attribute: 'open', present: false } };
  const result = adaptCaptures([input], { nativeControls: 'sampled', nativeControlSamples: {
    'controls/range': sample('range', { value: 18, accentColor: '#a54309', trackColor: '#eeeeee' }),
    'controls/details': sample('details-marker', { open: false }),
  } });
  assert.equal(node(result, 'radio/choice-ring'), undefined);
  assert.equal(node(result, 'range/range-thumb'), undefined);
  assert.equal(node(result, 'summary/sampled-marker'), undefined);
  assert.equal(result.manifest.nativeControls.details[0].state, 'UNKNOWN');
  assert.equal(node(result, 'facts').props.visible, undefined);
});

test('captured color/range values take precedence and malformed live values cannot be repaired by samples', () => {
  const input = enriched(capture());
  input.root.children[1].attrs = { inputType: 'color', value: '#112233', valueCaptured: true };
  input.root.children[2].attrs = { inputType: 'range', value: 60, valueCaptured: true, min: 10, max: 60 };
  const options = { nativeControls: 'sampled', nativeControlSamples: {
    'controls/color': sample('color', { value: '#c44516' }),
    'controls/range': sample('range', { value: 18, accentColor: '#a54309', trackColor: '#eeeeee' }),
  } };
  let result = adaptCaptures([input], options);
  assert.equal(result.manifest.nativeControls.inputs.find(x => x.type === 'color').value, '#112233');
  assert.equal(result.manifest.nativeControls.inputs.find(x => x.type === 'range').ratio, 1);
  assert.equal(result.manifest.warnings.filter(w => w.code === 'NATIVE_CONTROL_SAMPLE_CONFLICT').length, 2);
  input.root.children[1].attrs.value = 'invalid'; input.root.children[2].attrs.value = NaN;
  result = adaptCaptures([input], options);
  assert.equal(node(result, 'color/color-swatch'), undefined);
  assert.equal(node(result, 'range/range-thumb'), undefined);
  assert.equal(result.manifest.nativeControls.inputs.find(x => x.type === 'range').state, 'INVALID');
});

test('sample identities and geometry fail closed instead of being attached to unrelated controls', () => {
  const input = enriched(capture());
  assert.throws(() => adaptCaptures([input], { nativeControls: 'sampled', nativeControlSamples: { 'unknown/radio': sample('radio', { checked: true }) } }), /nativeControlSamples.*unresolved/);
  const result = adaptCaptures([input], { nativeControls: 'sampled', nativeControlSamples: { 'controls/range': sample('range', { value: 18, accentColor: '#a54309', trackColor: '#eeeeee', thumbSize: 30 }) } });
  assert.equal(node(result, 'range/range-thumb'), undefined);
  assert.ok(result.manifest.warnings.some(w => w.code === 'RANGE_STYLE_UNKNOWN'));
  input.root.children[3].children[0].children.push({ id: 'leading-icon', kind: 'element', tag: 'span', rect: { x: 20, y: 128, width: 10, height: 10 }, style, children: [] });
  const crowded = adaptCaptures([input], { nativeControls: 'sampled', nativeControlSamples: { 'controls/details': sample('details-marker', { open: false }) } });
  assert.equal(node(crowded, 'summary/sampled-marker'), undefined);
});

test('modern captured range string values are strictly normalized without loose numeric coercion', () => {
  const input = enriched(capture()); input.root.children[2].attrs = { inputType: 'range', value: '18', valueCaptured: true };
  const options = { nativeControls: 'sampled', nativeControlSamples: { 'controls/range': sample('range', { value: 18, accentColor: '#a54309', trackColor: '#eeeeee' }) } };
  const result = adaptCaptures([input], options), record = result.manifest.nativeControls.inputs.find(x => x.type === 'range');
  assert.equal(record.ratio, .16); assert.equal(record.sources.value.kind, 'CAPTURED');
  assert.equal(record.sources.value.normalization, 'STRICT_NUMERIC_STRING');
  assert.equal(result.manifest.warnings.some(w => w.code === 'NATIVE_CONTROL_SAMPLE_CONFLICT'), false);
  for (const value of ['', '18px', 'Infinity', '1e999', '0x12']) {
    input.root.children[2].attrs.value = value;
    assert.equal(node(adaptCaptures([input], options), 'range/range-thumb'), undefined);
  }
});

test('malformed captured checked state cannot be replaced by a visual sample while legacy null remains unknown', () => {
  const input = enriched(capture()); input.root.children[0].attrs = { inputType: 'radio', checked: 'malformed' };
  const options = { nativeControls: 'sampled', nativeControlSamples: { 'controls/radio': sample('radio', { checked: true }) } };
  const result = adaptCaptures([input], options), record = result.manifest.nativeControls.inputs[0];
  assert.equal(record.state, 'INVALID'); assert.equal(record.sources.checked.kind, 'CAPTURED_INVALID');
  assert.equal(node(result, 'radio/choice-dot'), undefined);
  assert.ok(result.manifest.warnings.some(w => w.code === 'NATIVE_INPUT_STATE_INVALID'));
  input.root.children[0].attrs.checked = null;
  const legacy = adaptCaptures([input], options);
  assert.equal(legacy.manifest.nativeControls.inputs[0].state, 'CHECKED');
  assert.equal(legacy.manifest.nativeControls.inputs[0].sources.checked.kind, 'EXPLICIT_VISUAL_SAMPLE');
});

test('malformed captured range bounds cannot silently fall back to archived defaults', () => {
  for (const value of [NaN, 'bad', null]) {
    const input = enriched(capture()); input.root.children[2].attrs = { inputType: 'range', min: value, value: 18, valueCaptured: true };
    const result = adaptCaptures([input], { nativeControls: 'sampled', nativeControlSamples: { 'controls/range': sample('range', { value: 18, accentColor: '#a54309', trackColor: '#eeeeee' }) } });
    assert.equal(node(result, 'range/range-thumb'), undefined);
    assert.equal(result.manifest.nativeControls.inputs.find(x => x.type === 'range').state, 'INVALID');
    assert.ok(result.manifest.warnings.some(w => w.code === 'RANGE_STATE_INVALID'));
  }
});

test('a malformed duplicate-attribute tag poisons every identifiable ID instead of leaving a later unique match', () => {
  const normal = '<input data-design-id="radio" type="radio">';
  for (const bad of [
    '<input data-design-id="radio" type="radio" type="checkbox" checked>',
    '<input type="radio" type="checkbox" data-design-id="radio" checked>',
    '<input data-design-id="radio" data-design-id="color" type="radio" checked>',
  ]) {
    for (const markup of [bad + normal, normal + bad]) {
      const recovered = enrichFromArchivedHTML(capture(), markup, new Map(), { nativeControls: true });
      assert.equal(recovered.root.children[0].archivedControl, undefined);
    }
  }
  const duplicates = '<input data-design-id="radio" data-design-id="color" type="radio"><input data-design-id="radio" type="radio"><input data-design-id="color" type="color" value="#c44516">';
  const recovered = enrichFromArchivedHTML(capture(), duplicates, new Map(), { nativeControls: true });
  assert.equal(recovered.root.children[0].archivedControl, undefined);
  assert.equal(recovered.root.children[1].archivedControl, undefined);
});

test('unsupported attribute tokens cannot make a later duplicate ID appear unique regardless of attribute order', () => {
  const normal = '<input data-design-id="radio" type="radio">';
  for (const bad of ['<input @unknown data-design-id="radio" type="radio" checked>', '<input data-design-id="radio" @unknown type="radio" checked>']) {
    for (const markup of [bad + normal, normal + bad]) {
      const original = capture(), before = structuredClone(original);
      const recovered = enrichFromArchivedHTML(original, markup, new Map(), { nativeControls: true });
      assert.equal(recovered.root.children[0].archivedControl, undefined);
      assert.equal(recovered.root.children[0].attrs.checked, null);
      assert.deepEqual(original, before);
    }
  }
  const quoted = enrichFromArchivedHTML(capture(), '<input data-note="@unknown data-design-id=other" data-design-id="radio" type="radio" checked>', new Map(), { nativeControls: true });
  assert.equal(quoted.root.children[0].archivedControl.defaultChecked.value, true);
});

test('finite range endpoints with overflowing span fail explicitly without throwing or producing shapes', () => {
  const input = enriched(capture()); input.root.children[2].attrs = { inputType: 'range', min: -1e308, max: 1e308, value: 1e308, valueCaptured: true };
  const options = { nativeControls: 'sampled', nativeControlSamples: { 'controls/range': sample('range', { value: 1e308, accentColor: '#a54309', trackColor: '#eeeeee' }) } };
  const result = adaptCaptures([input], options);
  assert.equal(result.manifest.verification.schema, 'PASS');
  assert.equal(result.manifest.nativeControls.inputs.find(x => x.type === 'range').state, 'INVALID');
  assert.equal(node(result, 'range/range-track'), undefined); assert.equal(node(result, 'range/range-thumb'), undefined);
  assert.ok(result.manifest.warnings.some(w => w.code === 'RANGE_STATE_INVALID'));
  assert.deepEqual(adaptCaptures([input]).spec, adaptCaptures([input], { nativeControls: 'captured' }).spec);
});
