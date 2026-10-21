import { createHash } from 'node:crypto';
import { getPresentationRenderContext } from '../core/presentation-render.mjs';
import { validateInteractionGraph } from '../core/interactions.mjs';
import { installPresentationInteractions } from '../runtime/interactions.mjs';

const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const cssString = value => `"${String(value).replace(/[\\"\u0000-\u001f\u007f]/g, c => `\\${c.codePointAt(0).toString(16)} `)}"`;
const unsupported = code => { throw new Error(`PRESENTATION_HTML_UNSUPPORTED_${code}`); };
const matrix = value => [value[0][0], value[1][0], value[0][1], value[1][1], value[0][2], value[1][2]].join(' ');
function inverse(value) {
  const [[a, c, e], [b, d, f]] = value, determinant = a * d - b * c;
  if (Math.abs(determinant) < 1e-12) unsupported('SINGULAR_PAINT_TRANSFORM');
  return [[d / determinant, -c / determinant, (c * f - d * e) / determinant], [-b / determinant, a / determinant, (b * e - a * f) / determinant]];
}
function color(value, opacity = 1) {
  const alpha = value.length === 9 ? parseInt(value.slice(7), 16) / 255 : 1;
  return `rgba(${parseInt(value.slice(1, 3), 16)},${parseInt(value.slice(3, 5), 16)},${parseInt(value.slice(5, 7), 16)},${alpha * opacity})`;
}
function attributes(node) {
  return `data-node-id="${escape(node.id)}" data-definition-id="${escape(node.definitionId)}" data-source-node-id="${escape(node.sourceNodeId)}"${node.instanceId ? ` data-instance-id="${escape(node.instanceId)}"` : ''}`;
}
function fontStyle(font) {
  const normalized = font.style.toLowerCase().replace(/[\s_-]/g, '');
  const weights = { thin: 100, extralight: 200, ultralight: 200, light: 300, regular: 400, normal: 400, book: 400, medium: 500, semibold: 600, demibold: 600, bold: 700, extrabold: 800, ultrabold: 800, black: 900, heavy: 900 };
  const italic = normalized.endsWith('italic') || normalized.endsWith('oblique'), weight = normalized.replace(/italic$|oblique$/, '') || 'regular';
  if (!weights[weight]) unsupported('FONT_STYLE');
  return `font-family:${cssString(font.family)};font-weight:${weights[weight]};font-style:${italic ? 'italic' : 'normal'}`;
}
function textHTML(node) {
  if (!node.text?.ranges) unsupported('TEXT_RANGES');
  if (node.style?.strokes?.length) unsupported('TEXT_STROKE');
  return node.text.ranges.map(range => {
    const fills = range.fills ?? node.style?.fills ?? [];
    if (fills.length !== 1 || fills.some(paint => paint.type !== 'SOLID')) unsupported('TEXT_PAINT');
    const style = `${fontStyle(range.font)};font-size:${range.fontSize}px;${range.lineHeight === undefined ? '' : `line-height:${range.lineHeight}px;`}${range.letterSpacing === undefined ? '' : `letter-spacing:${range.letterSpacing}px;`}color:${color(fills[0].color, fills[0].opacity)};`;
    return `<span data-text-start="${range.start}" data-text-end="${range.end}" style="${escape(style)}">${escape(node.text.characters.slice(range.start, range.end))}</span>`;
  }).join('');
}
function overflowStyles(overflow) {
  return `overflow-x:${['horizontal', 'both'].includes(overflow) ? 'auto' : 'hidden'};overflow-y:${['vertical', 'both'].includes(overflow) ? 'auto' : 'hidden'}`;
}
function geometryStyles(node, parent, root) {
  const g = node.geometry, layout = node.layout ?? {}, parentAuto = parent?.layout?.mode && parent.layout.mode !== 'absolute' && layout.positioning !== 'absolute';
  const styles = ['box-sizing:border-box', 'min-width:0', 'min-height:0', `width:${g.width}px`, `height:${g.height}px`, 'flex-shrink:0'];
  if (root) styles.push('position:relative');
  else if (layout.fixed) {
    const p = parent.geometry.transform;
    if (parent.parentId !== null || parentAuto || p && (p[0][0] !== 1 || p[0][1] !== 0 || p[1][0] !== 0 || p[1][1] !== 1) || parent.geometry.rotation) unsupported('NESTED_FIXED');
    styles.push('position:fixed', `left:${g.transform ? 0 : g.x}px`, `top:${g.transform ? 0 : g.y}px`);
  } else if (parentAuto) styles.push('position:relative');
  else {
    styles.push('position:absolute');
    const constraints = layout.constraints ?? { horizontal: 'MIN', vertical: 'MIN' };
    for (const [axis, position, size, length, end, mode] of [['x', 'left', 'width', 'width', 'right', constraints.horizontal], ['y', 'top', 'height', 'height', 'bottom', constraints.vertical]]) {
      const parentLength = parent.geometry[length], trailing = parentLength - g[axis] - g[size];
      if (g.transform) {
        if (mode !== 'MIN') unsupported('TRANSFORM_CONSTRAINTS');
        styles.push(`${position}:0`);
      } else if (mode === 'MAX') styles.push(`${end}:${trailing}px`);
      else if (mode === 'CENTER') styles.push(`${position}:calc(50% + ${g[axis] - parentLength / 2}px)`);
      else if (mode === 'STRETCH') styles.push(`${position}:${g[axis]}px`, `${end}:${trailing}px`, `${size}:auto`);
      else if (mode === 'SCALE') {
        if (!parentLength) unsupported('ZERO_CONSTRAINT_BASIS');
        styles.push(`${position}:${g[axis] / parentLength * 100}%`, `${size}:${g[size] / parentLength * 100}%`);
      } else styles.push(`${position}:${g[axis]}px`);
    }
  }
  if (g.transform) {
    const transform = g.transform.map(row => [...row]);
    if (parentAuto || root) { transform[0][2] = 0; transform[1][2] = 0; }
    // Even an identity CSS transform creates a containing block for fixed
    // descendants. Root canvas translation must not change viewport scrolling.
    if (!root || transform[0][0] !== 1 || transform[0][1] !== 0 || transform[1][0] !== 0 || transform[1][1] !== 1) styles.push(`transform:matrix(${matrix(transform).replaceAll(' ', ',')})`, 'transform-origin:0 0');
  } else if (g.rotation) styles.push(`transform:rotate(${-g.rotation}deg)`, 'transform-origin:0 0');
  if (layout.mode && layout.mode !== 'absolute') {
    const align = { start: 'flex-start', end: 'flex-end', center: 'center', stretch: 'stretch', baseline: 'baseline' };
    styles.push('display:flex', `flex-direction:${layout.mode === 'horizontal' ? 'row' : 'column'}`, `gap:${layout.gap ?? 0}px`, `align-items:${align[layout.align ?? 'start']}`, `justify-content:${({ start: 'flex-start', end: 'flex-end', center: 'center', 'space-between': 'space-between' })[layout.justify ?? 'start']}`, `flex-wrap:${layout.wrap ? 'wrap' : 'nowrap'}`);
    if (layout.padding) styles.push(`padding:${layout.padding.top}px ${layout.padding.right}px ${layout.padding.bottom}px ${layout.padding.left}px`);
  }
  if (parentAuto && parent.layout.align === 'stretch') {
    const crossHorizontal = parent.layout.mode === 'vertical';
    if (layout[crossHorizontal ? 'sizingHorizontal' : 'sizingVertical'] === undefined) styles.push(`${crossHorizontal ? 'width' : 'height'}:auto`);
  }
  for (const [sizing, size, axis] of [[layout.sizingHorizontal, 'width', 'horizontal'], [layout.sizingVertical, 'height', 'vertical']]) {
    if (sizing === 'hug') styles.push(`${size}:max-content`);
    else if (sizing === 'fill') {
      if (!parentAuto) unsupported('FILL_WITHOUT_AUTO_LAYOUT');
      if (parent.layout.mode === axis) styles.push('flex-grow:1', 'flex-basis:0', `${size}:auto`);
      else styles.push('align-self:stretch', `${size}:auto`);
    }
  }
  const style = node.style ?? {};
  if (style.visible === false) styles.push('display:none');
  if (style.opacity !== undefined) styles.push(`opacity:${style.opacity}`);
  if (style.clipsContent) styles.push('overflow:hidden');
  if (layout.overflow !== undefined) styles.push(overflowStyles(layout.overflow));
  if (style.cornerRadius !== undefined) styles.push(`border-radius:${style.cornerRadius}px`);
  if (node.kind === 'text') styles.push('white-space:pre-wrap', 'overflow-wrap:normal', 'font-size:0');
  return styles.join(';');
}
function painter(context, initialBytes) {
  let sequence = 0;
  let generatedBytes = initialBytes;
  const count = value => {
    generatedBytes += Buffer.byteLength(value);
    if (generatedBytes > 128 * 1024 * 1024) throw new Error('PRESENTATION_HTML_OUTPUT_BUDGET');
    return value;
  };
  const asset = id => {
    const value = context.resolvedAssets.byId.get(id);
    if (!value || !Buffer.isBuffer(value.bytes)) unsupported('ASSET_NOT_RESOLVED');
    return value;
  };
  function paint(paint, width, height) {
    if (paint.type === 'SOLID') return { definition: '', fill: color(paint.color, paint.opacity) };
    const id = `paint-${sequence++}`;
    if (paint.type.startsWith('GRADIENT_')) {
      if (!['GRADIENT_LINEAR', 'GRADIENT_RADIAL'].includes(paint.type)) unsupported(paint.type);
      const tag = paint.type === 'GRADIENT_LINEAR' ? 'linearGradient' : 'radialGradient';
      const coordinates = tag === 'linearGradient' ? 'x1="0" y1="0.5" x2="1" y2="0.5"' : 'cx="0.5" cy="0.5" r="0.5"';
      return { definition: `<${tag} id="${id}" gradientUnits="objectBoundingBox" ${coordinates} gradientTransform="matrix(${matrix(inverse(paint.transform))})">${paint.stops.map(stop => `<stop offset="${stop.position}" stop-color="${stop.color}"/>`).join('')}</${tag}>`, fill: `url(#${id})` };
    }
    if (paint.type !== 'IMAGE') unsupported('PAINT');
    const image = asset(paint.assetId);
    if (paint.transform && paint.scaleMode !== 'CROP') unsupported('IMAGE_TRANSFORM_MODE');
    let definition;
    if (paint.scaleMode === 'TILE') definition = `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${image.width}" height="${image.height}"><image data-asset-sha="${image.sha256}" width="${image.width}" height="${image.height}"/></pattern>`;
    else {
      const preserve = { FILL: 'xMidYMid slice', FIT: 'xMidYMid meet', CROP: 'none' }[paint.scaleMode];
      let transform = '';
      if (paint.scaleMode === 'CROP') {
        if (!paint.transform || !width || !height) unsupported('CROP_TRANSFORM');
        const [[a, c, e], [b, d, f]] = inverse(paint.transform);
        transform = ` transform="matrix(${a} ${b * height / width} ${c * width / height} ${d} ${e * width} ${f * height})"`;
      }
      definition = `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${width}" height="${height}"><image data-asset-sha="${image.sha256}" width="${width}" height="${height}" preserveAspectRatio="${preserve}"${transform}/></pattern>`;
    }
    return { definition, fill: `url(#${id})`, opacity: paint.opacity };
  }
  function shape(node, properties) {
    const { width, height } = node.geometry;
    if (node.kind === 'vector') return node.vectorPaths.map(path => {
      if (!/^[\sMmZzLlHhVvCcSsQqTtAa0-9eE+.,-]+$/.test(path.data)) unsupported('VECTOR_PATH');
      return `<path d="${escape(path.data)}" fill-rule="${path.windingRule === 'EVENODD' ? 'evenodd' : 'nonzero'}" ${properties}/>`;
    }).join('');
    if (node.shape === 'ellipse') return `<ellipse cx="${width / 2}" cy="${height / 2}" rx="${width / 2}" ry="${height / 2}" ${properties}/>`;
    if (node.shape === 'line') return `<path d="M0 0L${width} ${height}" ${properties}/>`;
    if (node.shape && !['rectangle', 'ellipse', 'line'].includes(node.shape)) unsupported('SHAPE');
    return `<rect width="${width}" height="${height}" rx="${node.style?.cornerRadius ?? 0}" ${properties}/>`;
  }
  function visuals(node) {
    const fills = node.style?.fills ?? [], strokes = node.style?.strokes ?? [];
    let content = '', definitions = '';
    if (node.assetId && !fills.some(p => p.type === 'IMAGE')) {
      const image = asset(node.assetId);
      content += `<foreignObject width="100%" height="100%"><img xmlns="http://www.w3.org/1999/xhtml" alt="" draggable="false" data-asset-sha="${image.sha256}" style="display:block;width:100%;height:100%;object-fit:cover"/></foreignObject>`;
    }
    for (const fill of [...fills].reverse()) {
      const value = paint(fill, node.geometry.width, node.geometry.height); definitions += value.definition;
      content += shape(node, `fill="${value.fill}"${value.opacity === undefined ? '' : ` opacity="${value.opacity}"`}`);
    }
    for (const stroke of [...strokes].reverse()) {
      if (node.style.strokeWeight === undefined) unsupported('STROKE_WEIGHT');
      const value = paint(stroke, node.geometry.width, node.geometry.height); definitions += value.definition;
      content += shape(node, `fill="none" stroke="${value.fill}" stroke-width="${node.style.strokeWeight}"${value.opacity === undefined ? '' : ` opacity="${value.opacity}"`}`);
    }
    if (!content) return '';
    return `<svg aria-hidden="true" focusable="false" data-presentation-paint="true" width="100%" height="100%" viewBox="0 0 ${node.geometry.width} ${node.geometry.height}" preserveAspectRatio="none" style="position:absolute;inset:0;pointer-events:none;overflow:visible"><defs>${definitions}</defs>${content}</svg>`;
  }
  function childrenHTML(tree, depth) {
    let result = '', groupOpen = false;
    for (const child of tree.children) {
      if (!child.node.style?.isMask) { result += draw(child, tree.node, false, depth); continue; }
      if (groupOpen) result += '</div>';
      if (tree.node.layout?.mode !== 'absolute' || child.children.length || child.node.style.maskType !== 'VECTOR') unsupported('MASK');
      const mask = child.node, g = mask.geometry, transform = g.transform ?? [[1, 0, g.x], [0, 1, g.y]];
      if (g.rotation && !g.transform) unsupported('MASK_ROTATION');
      const id = `mask-${sequence++}`;
      result += count(`<svg ${attributes(mask)} width="0" height="0" aria-hidden="true" style="position:absolute"><defs><clipPath id="${id}" clipPathUnits="userSpaceOnUse">${shape(mask, `transform="matrix(${matrix(transform)})"`)}</clipPath></defs></svg><div style="position:absolute;inset:0;clip-path:url(#${id})">`);
      groupOpen = true;
    }
    return result + (groupOpen ? '</div>' : '');
  }
  function draw(tree, parent, root, depth = 0) {
    if (depth > 128) unsupported('DEPTH_BUDGET');
    const node = tree.node;
    const start = count(`<div ${attributes(node)} data-kind="${node.kind}" style="${escape(geometryStyles(node, parent, root))}">${node.kind === 'text' ? textHTML(node) : visuals(node)}`);
    return start + childrenHTML(tree, depth + 1) + count('</div>');
  }
  return draw;
}
function documentHTML(title, revision, body, script = '') {
  const normalized = script.replace(/\r\n?/g, '\n'), hash = createHash('sha256').update(normalized).digest('base64');
  return `<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="prototype-model-revision" content="${escape(revision)}"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-${hash}'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'"><title>${escape(title)}</title><style>html,body{margin:0;padding:0}*{box-sizing:border-box}[hidden]{display:none!important}.presentation-scene{position:relative;isolation:isolate}.presentation-scene:focus-visible{outline:2px solid currentColor;outline-offset:-2px}</style></head><body>${body}${normalized ? `<script>${normalized}</script>` : ''}</body></html>\n`;
}
export function renderPresentationHTML(input, options = {}) {
  const context = getPresentationRenderContext(input, options);
  const assets = JSON.stringify(Object.fromEntries(context.resolvedAssets.assets.map(asset => [asset.sha256, `data:${asset.mimeType};base64,${asset.bytes.toString('base64')}`])));
  const draw = painter(context, Buffer.byteLength(assets) + 1024 * 1024);
  const body = context.renderScenes.map((scene, index) => `<section class="presentation-scene" data-scene-id="${escape(scene.id)}" data-device="${scene.device}" data-model-revision="${context.modelRevision}" aria-label="${escape(context.model.pages.find(page => page.id === scene.pageId).title)}" tabindex="0" style="width:${scene.viewport.width}px;height:${scene.viewport.height}px;${overflowStyles(scene.root.node.layout?.overflow)}"${index ? ' hidden' : ''}>${draw(scene.root, null, true)}</section>`).join('');
  const graph = validateInteractionGraph(context.model);
  const config = { actions: graph.actions, scenes: context.compiled.scenes.map(scene => ({ id: scene.id })),
    nodes: context.compiled.nodes.map(node => ({ id: node.id, sceneId: node.sceneId, kind: node.kind, ...(node.componentId ? { componentId: node.componentId } : {}) })),
    componentFamilies: context.compiled.componentFamilies, behaviors: context.model.presentation.behaviors ?? [] };
  const templates = (context.componentStates ?? []).map(state => {
    const parent = context.compiled.nodes.find(node => node.id === state.root.node.parentId) ?? null;
    return `<template data-state-target-id="${escape(state.nodeId)}" data-state-node-id="${escape(state.stateNodeId)}">${draw(state.root, parent, !parent)}</template>`;
  }).join('');
  const data = JSON.stringify(config).replaceAll('<', '\\u003c');
  return documentHTML(context.model.name, context.modelRevision, `${body}${templates}<script type="application/json" id="presentation-assets">${assets}</script>`, `window.__presentationInteractions=(${installPresentationInteractions.toString()})(${data});`);
}
export function renderPresentationCatalog(input, options = {}) {
  const context = getPresentationRenderContext(input, options);
  const scenes = context.renderScenes.map(scene => `<li><a href="index.html#scene=${escape(encodeURIComponent(scene.id))}">${escape(context.model.catalog.entries.find(entry => entry.id === scene.sourceBoardId).name)} · ${scene.device} · ${scene.viewport.width} × ${scene.viewport.height}</a></li>`).join('');
  const diagnostics = context.compiled.diagnostics.map(item => `<li>${escape(item.code)}: ${escape(item.message)}</li>`).join('');
  return documentHTML(`${context.model.name} · 场景目录`, context.modelRevision, `<main style="max-width:960px;margin:32px auto;padding:0 24px;font:16px/1.6 sans-serif"><h1>${escape(context.model.name)}</h1><p>视觉与已证实交互预览；未确认的业务目标保留待确认。</p><ul>${scenes}</ul><h2>证据状态</h2><p>${escape(context.compiled.status)}</p><ul>${diagnostics}</ul></main>`);
}
