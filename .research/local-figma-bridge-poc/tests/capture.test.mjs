import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { adaptCaptures, parseColor, parseShadows } from '../capture/adapter.mjs';
import { measurePath, readSimpleSVG } from '../capture/svg.mjs';
import { captureCommand } from '../capture/cli.mjs';
import { enrichFromArchivedHTML } from '../capture/archive-html.mjs';
const style = { color: 'rgb(12, 20, 30)', fontFamily: 'Noto Sans SC', fontSize: '16px', fontWeight: '400', overflowY: 'auto' };
const rect = { x: 0, y: 0, width: 400, height: 300 };
const capture = () => ({ id: 'home', name: '首页', viewport: { width: 400, height: 300 }, root: { id: 'root', kind: 'element', tag: 'body', rect, style, scroll: { left: 0, top: 0, width: 400, height: 500 }, children: [ { id: 'text', kind: 'text', text: '𠮷\n<literal>&', rect: { x: 10, y: 10, width: 100, height: 40 }, style }, { id: 'select', kind: 'element', tag: 'select', name: 'Format', rect: { x: 10, y: 60, width: 180, height: 32 }, style, attrs: { value: 'HTML 文档' }, children: [] } ] } });
test('captures preserve text, selected label, vector caret and scroll surface', () => { const { spec, manifest } = adaptCaptures([capture()]); assert.equal(spec.nodes.find(x => x.key === 'home/text').props.characters, '𠮷\n<literal>&'); assert.equal(spec.nodes.find(x => x.key === 'home/select/value').props.characters, 'HTML 文档'); assert.equal(spec.nodes.find(x => x.key === 'home/select/caret').type, 'VECTOR'); assert.equal(spec.nodes.find(x => x.key === 'home/root').props.overflowDirection, 'VERTICAL'); assert.equal(manifest.verification.visual, 'NOT_RUN'); });
test('fill-only SVG paths and field carets explicitly clear native default vector strokes', () => {
  const input = capture();
  input.root.children.push({id:'icon',kind:'svg',rect:{x:20,y:110,width:16,height:16},style,
    svg:'<svg viewBox="0 0 16 16"><path d="M 0 0 L 16 16 L 0 16 Z"/></svg>'});
  const {spec} = adaptCaptures([input]);
  assert.deepEqual(spec.nodes.find(n=>n.key==='home/icon/path-1').props.strokes, []);
  assert.deepEqual(spec.nodes.find(n=>n.key==='home/select/caret').props.strokes, []);
  input.root.children.at(-1).svg = '<svg><g transform="translate(1 1)"><path d="M 0 0 L 16 16 L 0 16 Z"/></g></svg>';
  const fallback = adaptCaptures([input]);
  assert.deepEqual(fallback.spec.nodes.find(n=>n.key==='home/icon').props.strokes, []);
  assert.ok(fallback.manifest.warnings.some(w=>w.code==='SVG_GEOMETRY_FALLBACK'));
});
// Minimal tree and measured geometry from the archived scan-invalid scene. The
// content has already scrolled above the viewport when its sticky CTA is sampled.
const stickyCapture = () => {
  const visibleStyle = { ...style, overflowX: 'visible', overflowY: 'visible', opacity: '1', transform: 'none' };
  const cta = { id: 'd118', kind: 'element', tag: 'div', rect: { x: 260, y: 707.6000366210938, width: 959.2000122070312, height: 71.5999984741211 }, style: { ...visibleStyle, position: 'sticky' }, children: [
    { id: 'action', kind: 'element', tag: 'button', rect: { x: 1030, y: 723.6000366210938, width: 180, height: 32 }, style: visibleStyle, children: [] },
  ] };
  const content = { id: 'd36', kind: 'element', tag: 'div', rect: { x: 228, y: -124.80000305175781, width: 1023.2000122070312, height: 1819.4000244140625 }, style: visibleStyle, children: [cta] };
  const scroll = { id: 'd35', kind: 'element', tag: 'main', rect: { x: 228, y: 0, width: 1038.4000244140625, height: 779.2000122070312 }, style: { ...visibleStyle, overflowX: 'auto', overflowY: 'auto' }, scroll: { left: 0, top: 124.80000305175781, width: 1038.4000244140625, height: 1819.4000244140625 }, children: [content] };
  return { id: 'scan-invalid', captureVersion: '1.0', viewport: { width: 1266.4000244140625, height: 779.2000122070312 }, root: { id: 'root', kind: 'element', tag: 'body', rect: { x: 0, y: 0, ...{ width: 1266.4000244140625, height: 779.2000122070312 } }, style: visibleStyle, children: [scroll] } };
};
test('nested sticky CTA uses the scrolling ancestor coordinates without changing keys, descendants, reactions or input', () => {
  const input = stickyCapture(), before = structuredClone(input);
  const { spec, manifest } = adaptCaptures([input, capture()], { links: [{ sceneId: input.id, sourceId: 'action', targetSceneId: 'home' }] });
  const node = spec.nodes.find(node => node.key === 'scan-invalid/d118');
  assert.equal(node.parentKey, 'scan-invalid/d35'); assert.equal(node.props.isFixed, true);
  assert.equal(node.x, 32); assert.equal(node.y, 707.6000366210938);
  assert.equal(node.width, before.root.children[0].children[0].children[0].rect.width);
  assert.equal(node.height, before.root.children[0].children[0].children[0].rect.height);
  const action = spec.nodes.find(node => node.key === 'scan-invalid/action');
  assert.equal(action.parentKey, node.key); assert.equal(action.x, 770); assert.equal(action.y, 16);
  assert.deepEqual(spec.reactions, [{ sourceKey: action.key, destinationKey: 'home/scene', trigger: { type: 'ON_CLICK' } }]);
  assert.ok(manifest.mappings.some(mapping => mapping.sourceId === 'd118' && mapping.nodeKey === node.key));
  const warning = manifest.warnings.find(warning => warning.sourceId === 'd118');
  assert.equal(warning.code, 'STICKY_POSITION_SAMPLED_FIXED'); assert.match(warning.detail, /sampled state.*containing.block/i);
  assert.deepEqual(input, before);
});
test('sticky promotion keeps negative offsets and selects the nearest scrolling ancestor', () => {
  const input = stickyCapture(), scroll = input.root.children[0], content = scroll.children[0], cta = content.children[0];
  const inner = { ...structuredClone(scroll), id: 'inner', rect: { x: 240, y: 30, width: 900, height: 600 }, children: [content] };
  scroll.children = [inner]; cta.rect.x = 232; cta.rect.y = 20;
  const { spec, manifest } = adaptCaptures([input]); const node = spec.nodes.find(node => node.key === 'scan-invalid/d118');
  assert.equal(node.parentKey, 'scan-invalid/inner'); assert.equal(node.props.isFixed, true);
  assert.equal(node.x, -8); assert.equal(node.y, -10);
  assert.ok(manifest.warnings.some(warning => warning.sourceId === 'd118' && warning.code === 'STICKY_POSITION_SAMPLED_FIXED'));
});
test('direct fixed children remain fixed while nested fixed helpers and scene modal nodes are never promoted', () => {
  const input = stickyCapture(), scroll = input.root.children[0], content = scroll.children[0], nestedFixed = content.children[0];
  nestedFixed.style.position = 'fixed';
  const directFixed = { ...structuredClone(nestedFixed), id: 'direct-fixed', children: [] };
  scroll.children.push(directFixed);
  input.root.children.push({ ...structuredClone(directFixed), id: 'focus-helper', rect: { x: 0, y: 0, width: 1, height: 1 }, style: { ...directFixed.style, opacity: '0.001' } }, { ...structuredClone(directFixed), id: 'modal' });
  const { spec, manifest } = adaptCaptures([input]);
  assert.equal(spec.nodes.find(node => node.key === 'scan-invalid/direct-fixed').props.isFixed, true);
  assert.equal(spec.nodes.find(node => node.key === 'scan-invalid/d118').parentKey, 'scan-invalid/d36');
  for (const id of ['d118', 'focus-helper', 'modal']) {
    assert.equal(spec.nodes.find(node => node.key === `scan-invalid/${id}`).props.isFixed, undefined);
    assert.ok(manifest.warnings.some(warning => warning.sourceId === id && warning.code === 'FIXED_POSITION_CAPTURED_STATIC'));
  }
  assert.equal(spec.nodes.find(node => node.key === 'scan-invalid/focus-helper').props.opacity, 0.001);
  assert.equal(spec.nodes.find(node => node.key === 'scan-invalid/modal').parentKey, 'scan-invalid/root');
});
test('sticky capture keeps explicit static warnings across unsafe clipping, transform and composition paths', () => {
  for (const [target, property, value] of [
    ['content', 'overflowY', 'hidden'], ['content', 'overflowY', 'clip'], ['content', 'overflowY', 'auto'],
    ['content', 'clipPath', 'circle(50%)'], ['content', 'transform', 'matrix(1, 0, 0, 1, 10, 20)'],
    ['scroll', 'transform', 'matrix(2, 0, 0, 2, 0, 0)'], ['cta', 'transform', 'rotate(10deg)'], ['content', 'opacity', '0.5'],
  ]) {
    const input = stickyCapture(), scroll = input.root.children[0], content = scroll.children[0], cta = content.children[0];
    ({ scroll, content, cta })[target].style = { ...({ scroll, content, cta })[target].style, [property]: value };
    if (property === 'overflowY' && value === 'auto') content.scroll = { width: content.rect.width, height: content.rect.height, left: 0, top: 0 };
    const { spec, manifest } = adaptCaptures([input]); const node = spec.nodes.find(node => node.key === 'scan-invalid/d118');
    assert.equal(node.parentKey, 'scan-invalid/d36', `${target}.${property}`); assert.equal(node.props.isFixed, undefined, `${target}.${property}`);
    assert.ok(manifest.warnings.some(warning => warning.sourceId === 'd118' && warning.code === 'FIXED_POSITION_CAPTURED_STATIC'), `${target}.${property}`);
  }
});
test('direct sticky capture keeps the sampled-state limitation and no-scroll sticky remains static', () => {
  const input = stickyCapture(), scroll = input.root.children[0]; scroll.children = scroll.children[0].children;
  const { spec, manifest } = adaptCaptures([input]);
  assert.equal(spec.nodes.find(node => node.key === 'scan-invalid/d118').props.isFixed, true);
  assert.ok(manifest.warnings.some(warning => warning.sourceId === 'd118' && warning.code === 'STICKY_POSITION_SAMPLED_FIXED'));
  scroll.style = { ...scroll.style, overflowX: 'visible', overflowY: 'visible' };
  const staticResult = adaptCaptures([input]);
  assert.equal(staticResult.spec.nodes.find(node => node.key === 'scan-invalid/d118').props.isFixed, undefined);
  assert.ok(staticResult.manifest.warnings.some(warning => warning.sourceId === 'd118' && warning.code === 'FIXED_POSITION_CAPTURED_STATIC'));
});
test('captures map frame navigation and correctly convert timeout milliseconds', () => { const compact = capture(); compact.id = 'compact'; compact.viewport = { width: 320, height: 240 }; const { spec } = adaptCaptures([capture(), compact], { links: [{ sceneId: 'home', sourceId: 'root', targetSceneId: 'compact', trigger: 'AFTER_TIMEOUT', timeoutMs: 1000 }], flowStarts: ['home', 'compact'] }); assert.equal(spec.reactions[0].trigger.delaySeconds, 1); assert.equal(spec.flows.length, 2); });
test('archived self-mappings preserve original evidence without becoming native navigation', () => {
  // These three mapping records reproduce the archived scan-empty graph: the
  // current sidebar item and an auxiliary control keep the same captured preset.
  const scan = capture(); scan.id = 'scan-empty'; scan.root.id = 'd1';
  scan.root.children = ['d14', 'd17', 'd46'].map(id => ({ id, kind: 'element', tag: 'button', rect, style, children: [] }));
  const links = [
    { sceneId: 'scan-empty', sourceId: 'd14', targetSceneId: 'home', navigation: 'NAVIGATE', trigger: 'ON_CLICK' },
    { sceneId: 'scan-empty', sourceId: 'd17', targetSceneId: 'scan-empty', navigation: 'NAVIGATE', trigger: 'ON_CLICK' },
    { sceneId: 'scan-empty', sourceId: 'd46', targetSceneId: 'scan-empty', navigation: 'NAVIGATE', trigger: 'ON_CLICK' },
  ];
  const before = structuredClone(links);
  const { spec, manifest } = adaptCaptures([capture(), scan], { links });
  assert.deepEqual(spec.reactions, [{ sourceKey: 'scan-empty/d14', destinationKey: 'home/scene', trigger: { type: 'ON_CLICK' } }]);
  assert.equal(manifest.reactionCount, 1); assert.equal(manifest.unchangedPresetCount, 2);
  assert.deepEqual(manifest.unchangedPresetMappings.map(record => record.mapping), links.slice(1));
  assert.ok(manifest.unchangedPresetMappings.every(record => record.destinationKey === 'scan-empty/scene' && record.reason.includes('Auxiliary action outcome is not demonstrated')));
  assert.deepEqual(links, before); assert.equal(manifest.warnings.length, 0);
  const unresolved = adaptCaptures([scan], { links: [{ ...links[1], sourceId: 'missing' }] });
  assert.equal(unresolved.manifest.unchangedPresetCount, 0);
  assert.equal(unresolved.manifest.warnings[0].code, 'UNRESOLVED_INTERACTION');
});
test('modern capture explicit self-navigation is retained', () => {
  const modern = { ...capture(), captureVersion: '1.0' };
  const { spec, manifest } = adaptCaptures([modern], { links: [{ sceneId: 'home', sourceId: 'select', targetSceneId: 'home', navigation: 'NAVIGATE', trigger: 'ON_CLICK' }] });
  assert.equal(spec.reactions.length, 1); assert.equal(spec.reactions[0].destinationKey, 'home/scene');
  assert.equal(manifest.unchangedPresetCount, 0);
});
test('captures never fetch remote images and report unsupported SVG and missing links', () => { const input = capture(); input.root.children.push({ id: 'image', kind: 'image', rect, dataUrl: 'https://private.example/a.png' }, { id: 'icon', kind: 'svg', rect, svg: '<svg><circle cx="2" cy="2" r="2"/></svg>' }); const { manifest, spec } = adaptCaptures([input], { links: [{ sceneId: 'home', sourceId: 'no-node', targetSceneId: 'missing' }] }); assert.equal(spec.assets.length, 0); assert.ok(manifest.warnings.some(x => x.code === 'IMAGE_RESOURCE_MISSING')); assert.ok(manifest.warnings.some(x => x.code === 'SVG_WITHOUT_PATH_UNSUPPORTED')); assert.ok(manifest.warnings.some(x => x.code === 'UNRESOLVED_INTERACTION')); });
test('captures deduplicate embedded images, keep safe SVG editable and reject active SVG', () => { const input = capture(); const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/9ZkAAAAASUVORK5CYII='; input.root.children.push({ id: 'a', kind: 'image', rect, dataUrl: png }, { id: 'b', kind: 'image', rect, dataUrl: png }, { id: 'icon', kind: 'svg', rect, svg: '<svg><path d="M 0 0 L 8 8 Z"/></svg>' }); const { spec } = adaptCaptures([input]); assert.equal(spec.assets.length, 1); assert.equal(spec.nodes.find(x => x.key === 'home/icon').type, 'FRAME'); assert.equal(spec.nodes.find(x => x.key === 'home/icon/path-1').type, 'VECTOR'); input.root.children[4].svg = '<svg><script>alert(1)</script></svg>'; assert.throws(() => adaptCaptures([input]), /Unsafe SVG/); });
test('captures reject duplicate identities and invalid geometry', () => { assert.throws(() => adaptCaptures([capture(), capture()]), /Duplicate capture/); const input = capture(); input.root.children[0].rect.width = NaN; assert.throws(() => adaptCaptures([input]), /Invalid geometry/); });
test('legacy unknown capture time stays unknown and conversion is deterministic', () => { const a = adaptCaptures([capture()]), b = adaptCaptures([capture()]); assert.equal(a.spec.source.capturedAt, undefined); assert.deepEqual(a.spec, b.spec); assert.ok(a.manifest.convertedAt); });
test('modern oklch colors convert to bounded sRGB without dropping the palette', () => { const white = parseColor('oklch(100% 0 0)'); assert.ok(white.r > 0.999 && white.g > 0.999 && white.b > 0.999); const black = parseColor('oklch(0 0 0)'); assert.equal(black.r, 0); const color = parseColor('oklch(0.25 0.022 58 / 50%)'); assert.equal(color.a, 0.5); assert.ok(color.r > color.b); });
test('archived selected options and exact approved resource basenames can restore gaps', () => { const input = capture(); delete input.root.children[1].attrs.value; input.root.children.push({ id: 'image', kind: 'image', rect }); const html = '<select data-design-id="select" value="json"><option value="html">HTML</option><option value="json">JSON &amp; data</option></select><img data-design-id="image" src="al-resource://demo/run/page.png?x=1">'; const png = 'data:image/png;base64,iVBORw0KGgo='; const result = enrichFromArchivedHTML(input, html, new Map([['page.png', png]])); assert.equal(result.root.children[1].attrs.value, 'JSON & data'); assert.equal(result.root.children[2].dataUrl, png); assert.equal(input.root.children[2].dataUrl, undefined); });
test('capture CLI writes hashed manifest into new directory and preserves previous output', async () => { const dir = await mkdtemp(path.join(tmpdir(), 'design-capture-')); try { const input = path.join(dir, 'capture.json'); const output = path.join(dir, 'out'); await writeFile(input, JSON.stringify(capture())); const result = await captureCommand(['--input', input, '--output', output]); assert.equal(result.sceneCount, 1); const manifest = JSON.parse(await readFile(path.join(output, 'capture-manifest.json'), 'utf8')); assert.match(manifest.specSha256, /^[a-f0-9]{64}$/); await assert.rejects(() => captureCommand(['--input', input, '--output', output]), /EEXIST/); } finally { await rm(dir, { recursive: true, force: true }); } });
test('CSS shadows retain RGBA, offsets, blur, spread and order', () => {
  const effects = parseShadows('rgba(0, 0, 0, 0.12) 0px 0px 2px 0px, rgba(0, 0, 0, 0.14) 0px 2px 4px -1px inset', 'rgb(0, 0, 0)');
  assert.equal(effects.length, 2); assert.equal(effects[0].color.a, 0.12); assert.equal(effects[1].type, 'INNER_SHADOW'); assert.equal(effects[1].spread, -1); assert.deepEqual(effects[1].offset, { x: 0, y: 2 }); assert.equal(effects[1].radius, 4);
  assert.throws(() => parseShadows('red 1em 2em', 'rgb(0, 0, 0)'), /Unsupported/);
});
test('CSS dashed borders become native patterns and retain explicit approximation warnings', () => {
  const input = capture(); input.root.style = { ...style, borderTopStyle: 'dashed', borderTopWidth: '2px', borderTopColor: 'rgb(12, 20, 30)' };
  const { spec, manifest } = adaptCaptures([input]);
  const props = spec.nodes.find(node => node.key === 'home/root').props;
  assert.deepEqual(props.dashPattern, [6, 6]); assert.equal(props.strokeWeight, 2); assert.equal(props.strokeAlign, 'INSIDE');
  assert.equal(manifest.warnings.filter(warning => warning.code === 'DASH_PATTERN_APPROXIMATED').length, 1);
  assert.equal(manifest.warnings.some(warning => warning.code === 'BORDER_STYLE_APPROXIMATED'), false);
  input.root.style.borderTopStyle = 'dotted';
  const dotted = adaptCaptures([input]); assert.equal(dotted.spec.nodes.find(node => node.key === 'home/root').props.dashPattern, undefined);
  assert.ok(dotted.manifest.warnings.some(warning => warning.code === 'BORDER_STYLE_APPROXIMATED'));
});
test('SVG paths retain per-path fill and viewBox whitespace rather than stretching', () => {
  const shapes = readSimpleSVG('<svg viewBox="0 0 20 20" fill="rgb(1, 2, 3)"><path d="M 2 4 h 8 v 12 H 2 Z"/><path fill="#ff0000" d="M 12 2 h 4 v 4 h -4 Z"/></svg>', { width: 40, height: 40 }, 'rgb(0, 0, 0)', parseColor);
  assert.equal(shapes.length, 2); assert.deepEqual([shapes[0].x, shapes[0].y, shapes[0].width, shapes[0].height], [4, 8, 16, 24]); assert.equal(shapes[0].props.fills[0].color.r, 1 / 255); assert.equal(shapes[1].props.fills[0].color.r, 1);
  assert.match(shapes[0].props.vectorPaths[0].data, /^M 0 0/);
  const transparent = readSimpleSVG('<svg viewBox="0 0 10 10" opacity="0.5"><path opacity="0.5" d="M 0 0 L 10 0 L 10 10 Z"/></svg>', { width: 10, height: 10 }, 'rgb(0, 0, 0)', parseColor); assert.equal(transparent[0].props.fills[0].opacity, 0.5);
  assert.throws(() => readSimpleSVG('<svg><g transform="translate(2)"><path d="M 0 0 L 8 8 Z"/></g></svg>', rect, 'rgb(0, 0, 0)', parseColor), /Complex/);
});
test('SVG cubic, quadratic, smooth curves and elliptical arcs use extrema bounds', () => {
  const cubic = measurePath('M 0 0 C 0 10 10 10 10 0 Z'); assert.equal(cubic.width, 10); assert.equal(cubic.height, 7.5);
  const quadratic = measurePath('M 0 0 Q 5 10 10 0 T 20 0 Z'); assert.equal(quadratic.height, 10); assert.equal(quadratic.y, -5);
  const circle = measurePath('M 10 0 A 10 10 0 1 1 -10 0 A 10 10 0 1 1 10 0 Z'); assert.equal(circle.width, 20); assert.equal(circle.height, 20);
  assert.throws(() => measurePath('M 0 0 L NaN 1'), /syntax/);
});
test('capture CLI design-system extraction is opt-in and writes resource counts', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'design-capture-enrich-'));
  try { const input = path.join(dir, 'capture.json'), output = path.join(dir, 'out'); await writeFile(input, JSON.stringify(capture())); await captureCommand(['--input', input, '--output', output, '--design-system']); const manifest = JSON.parse(await readFile(path.join(output, 'capture-manifest.json'), 'utf8')); assert.equal(manifest.designSystem.textStyleCount, 1); assert.equal(manifest.designSystem.visual, 'NOT_RUN'); assert.equal(manifest.verification.figmaRuntime, 'NOT_RUN'); }
  finally { await rm(dir, { recursive: true, force: true }); }
});

// Modal title, summary, small explanation and warning use one direct text Range
// inside a block. Its browser glyph bounds are narrower than the content area.
const blockTextCapture = (tag = 'span') => {
  const blockStyle = { ...style, display: 'block', position: 'static', transform: 'none', textAlign: 'start', whiteSpace: 'normal', overflowX: 'visible', overflowY: 'visible', paddingLeft: '0px', paddingRight: '0px', borderLeftWidth: '0px', borderRightWidth: '0px' };
  const block = { id: 'block', kind: 'element', tag, rect: { x: 20, y: 40, width: 300, height: 20 }, style: blockStyle, children: [
    { id: 'block-t0', kind: 'text', text: '删除任务：可以安全删除本地派生数据', rect: { x: 20, y: 41, width: 150, height: 18 }, style: blockStyle },
  ] };
  return { id: 'modal', viewport: { width: 400, height: 300 }, root: { id: 'root', kind: 'element', tag: 'body', rect, style: blockStyle, children: [block] } };
};
const blockText = result => result.spec.nodes.find(node => node.key === 'modal/block-t0');
const contentBounds = { textBounds: 'single-block-content' };

test('single block text width is opt-in and tight-range output remains compatible', () => {
  const input = blockTextCapture(), before = structuredClone(input);
  const legacy = adaptCaptures([input]), explicit = adaptCaptures([input], { textBounds: 'tight-range' });
  assert.equal(blockText(legacy).width, 150); assert.deepEqual(explicit.spec, legacy.spec);
  assert.equal(legacy.manifest.textBounds, undefined); assert.equal(explicit.manifest.textBounds, undefined);
  const withoutTime = manifest => { const copy = structuredClone(manifest); delete copy.convertedAt; return copy; };
  assert.deepEqual(withoutTime(explicit.manifest), withoutTime(legacy.manifest)); assert.deepEqual(input, before);
  assert.throws(() => adaptCaptures([input], { textBounds: 'auto' }), /textBounds/);
  assert.throws(() => adaptCaptures([input], { textBounds: null }), /textBounds/);
});

test('single block title, summary, explanation and warning preserve geometry except safe content width', () => {
  for (const [tag, text] of [['h2', '删除选中的任务？'], ['span', '已选择 1 个任务，其中 1 个可执行、0 个将跳过。'], ['small', '删除任务：任务已结束，可以安全删除本地派生数据'], ['span', '不会删除任何原始 PDF、DjVu、TIFF、JPEG 或 PNG 文件。']]) {
    const input = blockTextCapture(tag); input.root.children[0].children[0].text = text;
    const before = structuredClone(input), legacy = blockText(adaptCaptures([input]));
    const result = adaptCaptures([input], contentBounds), widened = blockText(result);
    assert.equal(widened.width, 300, text); assert.deepEqual({ ...widened, width: legacy.width }, legacy);
    assert.equal(widened.props.textAutoResize, 'NONE'); assert.deepEqual(input, before);
    assert.deepEqual(result.manifest.textBounds, { mode: 'single-block-content', expandedCount: 1, expansions: [{ sceneId: 'modal', sourceId: 'block-t0', nodeKey: 'modal/block-t0', parentKey: 'modal/block', fromWidth: 150, toWidth: 300 }], preservedCounts: {}, nativeFit: 'NOT_RUN' });
    assert.equal(result.manifest.verification.visual, 'NOT_RUN');
  }
});

test('single block content width deducts borders, padding and the existing text inset', () => {
  const input = blockTextCapture(), block = input.root.children[0];
  Object.assign(block.style, { paddingLeft: '10px', paddingRight: '12.5px', borderLeftWidth: '2px', borderRightWidth: '3px' });
  block.children[0].rect.x = 37; // Five pixels beyond the known content left.
  const widened = blockText(adaptCaptures([input], contentBounds));
  assert.equal(widened.x, 17); assert.equal(widened.width, 267.5);
  assert.equal(widened.x + widened.width, block.rect.width - 12.5 - 3);
  assert.equal(widened.y, 1); assert.equal(widened.height, 18);
});

test('d65 three direct text ranges and element siblings keep their measured widths', () => {
  const input = blockTextCapture(), block = input.root.children[0]; block.id = 'd65'; block.rect.width = 220;
  block.children = [
    ['已选择 ', 20, 45.8499755859375], ['1', 65.8499755859375, 5.662506103515625], [' 个任务', 71.51248168945312, 45.850006103515625],
  ].map(([text, x, width], i) => ({ id: `d65-t${i}`, kind: 'text', text, rect: { x, y: 41, width, height: 18 }, style: block.style }));
  const result = adaptCaptures([input], contentBounds);
  assert.deepEqual(result.spec.nodes.filter(node => node.type === 'TEXT').map(node => node.width), block.children.map(node => node.rect.width));
  assert.equal(result.manifest.textBounds.expandedCount, 0); assert.equal(result.manifest.textBounds.preservedCounts.MULTIPLE_TEXT_CHILDREN, 3);
  const blocked = blockTextCapture(); blocked.root.children[0].children.push({ id: 'icon', kind: 'element', tag: 'span', rect: { x: 200, y: 40, width: 20, height: 20 }, style: { ...block.style, display: 'inline' }, children: [] });
  const blockedResult = adaptCaptures([blocked], contentBounds);
  assert.equal(blockText(blockedResult).width, 150); assert.equal(blockedResult.manifest.textBounds.preservedCounts.SIBLING_BOUNDARY_UNSUPPORTED, 1);
});

test('single block width avoids enclosing same-row siblings and leaves separate rows available', () => {
  const input = blockTextCapture(), block = input.root.children[0];
  const icon = { id: 'icon', kind: 'element', tag: 'span', rect: { x: 200, y: 40, width: 20, height: 20 }, style: block.style, children: [] };
  input.root.children.push(icon);
  const blocked = adaptCaptures([input], contentBounds);
  assert.equal(blockText(blocked).width, 150); assert.equal(blocked.manifest.textBounds.preservedCounts.SIBLING_BOUNDARY_UNSUPPORTED, 1);
  icon.rect.y = 60; // The rectangles meet at an edge and do not share a row.
  assert.equal(blockText(adaptCaptures([input], contentBounds)).width, 300);
});

test('single block width detects an overflowing sibling descendant beyond the sibling rectangle', () => {
  const input = blockTextCapture(), block = input.root.children[0];
  input.root.children.push({ id: 'sibling', kind: 'element', tag: 'div', rect: { x: 350, y: 40, width: 20, height: 20 }, style: block.style, children: [
    { id: 'icon', kind: 'element', tag: 'span', rect: { x: 200, y: 40, width: 20, height: 20 }, style: block.style, children: [] },
  ] });
  const result = adaptCaptures([input], contentBounds);
  assert.equal(blockText(result).width, 150); assert.equal(result.manifest.textBounds.preservedCounts.SIBLING_BOUNDARY_UNSUPPORTED, 1);
});

test('single block width checks overflowing descendants of zero-size sibling wrappers', () => {
  for (const [width, height] of [[0, 0], [0, 20], [20, 0]]) {
    const input = blockTextCapture(), block = input.root.children[0];
    input.root.children.push({ id: 'wrapper', kind: 'element', tag: 'div', rect: { x: 350, y: 40, width, height }, style: block.style, children: [
      { id: 'icon', kind: 'element', tag: 'span', rect: { x: 200, y: 40, width: 20, height: 20 }, style: block.style, children: [] },
    ] });
    const result = adaptCaptures([input], contentBounds);
    assert.equal(blockText(result).width, 150, `${width} x ${height}`); assert.equal(result.manifest.textBounds.preservedCounts.SIBLING_BOUNDARY_UNSUPPORTED, 1);
  }
});

test('single block pre-wrap keeps captured multi-line height, text and resize mode', () => {
  const input = blockTextCapture(), block = input.root.children[0]; block.rect.height = 40;
  block.style.whiteSpace = 'pre-wrap'; block.children[0].text = '已删除任务\n保留原始文件'; block.children[0].rect.height = 38;
  const result = adaptCaptures([input], contentBounds), text = blockText(result);
  assert.equal(text.width, 300); assert.equal(text.height, 38); assert.equal(text.props.characters, '已删除任务\n保留原始文件'); assert.equal(text.props.textAutoResize, 'NONE');
});

test('single block mode preserves inline, flex and unproven layout boundaries', () => {
  const cases = [
    ['inline parent', block => { block.style.display = 'inline'; }],
    ['flex parent', block => { block.style.display = 'flex'; }],
    ['unknown display', block => { delete block.style.display; }],
    ['unknown padding', block => { delete block.style.paddingRight; }],
    ['percentage padding', block => { block.style.paddingRight = '10%'; }],
    ['unknown border', block => { block.style.borderRightWidth = 'auto'; }],
    ['center alignment', block => { block.style.textAlign = 'center'; }],
    ['unknown alignment', block => { delete block.style.textAlign; }],
    ['nowrap', block => { block.style.whiteSpace = 'nowrap'; }],
    ['transformed block', block => { block.style.transform = 'matrix(1, 0, 0, 1, 4, 0)'; }],
    ['unknown transform', block => { delete block.style.transform; }],
    ['scrollbar width', block => { block.style.overflowY = 'auto'; }],
    ['outside content left', block => { block.style.paddingLeft = '8px'; }],
    ['outside content right', block => { block.style.paddingRight = '200px'; }],
    ['RTL', block => { block.style.direction = 'rtl'; }],
    ['vertical writing', block => { block.style.writingMode = 'vertical-rl'; }],
  ];
  for (const [name, change] of cases) {
    const input = blockTextCapture(), block = input.root.children[0]; block.style = { ...block.style }; change(block);
    const result = adaptCaptures([input], contentBounds);
    assert.deepEqual(blockText(result), blockText(adaptCaptures([input])), name); assert.equal(result.manifest.textBounds.expandedCount, 0, name);
    assert.equal(Object.values(result.manifest.textBounds.preservedCounts).reduce((a, b) => a + b, 0), 1, name);
  }
  const transformed = blockTextCapture(); transformed.root.style = { ...transformed.root.style, transform: 'scale(2)' };
  assert.equal(blockText(adaptCaptures([transformed], contentBounds)).width, 150);
});

test('capture CLI forwards explicit text-bounds and rejects unsupported values without output', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'design-capture-text-bounds-'));
  try {
    const input = path.join(dir, 'capture.json'), output = path.join(dir, 'out'); await writeFile(input, JSON.stringify(blockTextCapture()));
    const result = await captureCommand(['--input', input, '--output', output, '--text-bounds', 'single-block-content', '--design-system']);
    const spec = JSON.parse(await readFile(path.join(output, 'design-spec.json'), 'utf8')), manifest = JSON.parse(await readFile(path.join(output, 'capture-manifest.json'), 'utf8'));
    assert.equal(spec.nodes.find(node => node.key === 'modal/block-t0').width, 300); assert.equal(spec.nodes.find(node => node.key === 'modal/block-t0').props.textAutoResize, 'NONE');
    assert.equal(manifest.textBounds.mode, 'single-block-content'); assert.equal(manifest.textBounds.expandedCount, 1); assert.equal(manifest.textBounds.nativeFit, 'NOT_RUN');
    assert.equal(result.textBounds.expandedCount, 1);
    const badOutput = path.join(dir, 'bad');
    await assert.rejects(() => captureCommand(['--input', input, '--output', badOutput, '--text-bounds', 'auto']), /text-bounds/);
    await assert.rejects(() => readFile(path.join(badOutput, 'design-spec.json')), /ENOENT/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
