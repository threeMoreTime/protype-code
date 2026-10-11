import { validateDesignSpec } from '../design/spec.mjs';
import { readSimpleSVG } from './svg.mjs';
import { parseLinearGradient } from './linear-gradient.mjs';
import { coalesceUniformInlineText } from './inline-text.mjs';

const finite = (value, fallback = 0) => Number.isFinite(Number.parseFloat(value)) ? Number.parseFloat(value) : fallback;
export const parseColor = input => {
  if (!input || input === 'transparent' || input === 'none') return null;
  const text = String(input).trim(); let m = /^#([0-9a-f]{3,8})$/i.exec(text);
  if (m) { const hex = m[1].length < 5 ? [...m[1]].map(c => c + c).join('') : m[1]; if (![6, 8].includes(hex.length)) return null; return { r: parseInt(hex.slice(0, 2), 16) / 255, g: parseInt(hex.slice(2, 4), 16) / 255, b: parseInt(hex.slice(4, 6), 16) / 255, a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1 }; }
  m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/.exec(text);
  if (m) return { r: +m[1] / 255, g: +m[2] / 255, b: +m[3] / 255, a: m[4] === undefined ? 1 : +m[4] };
  m = /^oklch\(\s*([\d.]+)(%)?\s+([\d.]+)\s+([+-]?[\d.]+)(?:deg)?(?:\s*\/\s*([\d.]+)(%)?)?\s*\)$/i.exec(text);
  if (m) {
    const l = Number(m[1]) / (m[2] ? 100 : 1), c = Number(m[3]), h = Number(m[4]) * Math.PI / 180;
    const a = c * Math.cos(h), b = c * Math.sin(h);
    const ll = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const mm = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const ss = (l - 0.0894841775 * a - 1.2914855480 * b) ** 3;
    const srgb = v => Math.min(1, Math.max(0, v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055));
    return { r: srgb(4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss), g: srgb(-1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss), b: srgb(-0.0041960863 * ll - 0.7034186147 * mm + 1.7076147010 * ss), a: m[5] === undefined ? 1 : Number(m[5]) / (m[6] ? 100 : 1) };
  }
  m = /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)$/.exec(text);
  return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null;
};
const rgba = parseColor;
const paint = color => color && color.a > 0 ? [{ type: 'SOLID', color: { r: color.r, g: color.g, b: color.b }, opacity: color.a }] : [];
const safeKey = value => { const text = String(value); if (!/^[A-Za-z0-9][A-Za-z0-9_.:/-]*$/.test(text) || text.length > 120) throw new Error(`Invalid capture identifier: ${text.slice(0, 30)}`); return text; };
export function parseShadows(input, currentColor) {
  if (!input || input === 'none') return [];
  let depth = 0, begin = 0; const parts = [];
  for (let i = 0; i < input.length; i++) { if (input[i] === '(') depth++; if (input[i] === ')') depth--; if (input[i] === ',' && depth === 0) { parts.push(input.slice(begin, i)); begin = i + 1; } }
  parts.push(input.slice(begin)); if (depth || parts.length > 16) throw new Error('Unsupported shadow list');
  return parts.map(part => {
    const colorMatch = /(?:rgba?|oklch|color)\([^)]*\)|#[0-9a-f]{3,8}\b|\b(?:currentColor|transparent)\b/i.exec(part);
    const color = rgba(colorMatch?.[0] === 'currentColor' || !colorMatch ? currentColor : colorMatch[0]); if (!color) throw new Error('Unsupported shadow color');
    const remaining = part.replace(colorMatch?.[0] ?? '', '').replace(/\binset\b/g, '').trim(); const lengths = remaining.split(/\s+/);
    if (lengths.length < 2 || lengths.length > 4 || lengths.some(value => !/^[+-]?(?:\d*\.\d+|\d+)(?:px)?$/.test(value))) throw new Error('Unsupported shadow lengths');
    const [x, y, radius = 0, spread = 0] = lengths.map(Number.parseFloat); if (radius < 0) throw new Error('Negative shadow blur');
    return { type: /\binset\b/.test(part) ? 'INNER_SHADOW' : 'DROP_SHADOW', color, offset: { x, y }, radius, spread, visible: true };
  });
}
function fontProperties(style, fallback) {
  const family = (style.fontFamily || fallback.family).split(',')[0].trim().replace(/^['"]|['"]$/g, ''); const weight = finite(style.fontWeight, 400);
  const weightStyle = ({100:'Thin',200:'Extra Light',300:'Light',400:'Regular',500:'Medium',600:'Semi Bold',700:'Bold',800:'Extra Bold',900:'Black'})[weight] ?? 'Regular'; const italic = style.fontStyle === 'italic';
  const size = Math.max(0.1, finite(style.fontSize, 14));
  return { fontName: { family, style: italic ? `${weightStyle === 'Regular' ? '' : weightStyle + ' '}Italic` : weightStyle }, fontSize: size, lineHeight: style.lineHeight === 'normal' || !style.lineHeight ? { unit: 'AUTO' } : { unit: 'PIXELS', value: Math.max(0, finite(style.lineHeight, size * 1.2)) }, letterSpacing: { unit: 'PIXELS', value: finite(style.letterSpacing) }, textAlignHorizontal: ({ center: 'CENTER', right: 'RIGHT', justify: 'JUSTIFIED' })[style.textAlign] ?? 'LEFT', textAutoResize: 'NONE', fills: paint(rgba(style.color) ?? { r: 0, g: 0, b: 0, a: 1 }) };
}
function nativeControlSource(raw, field, style = false) {
  const value = (style ? raw.style : raw.attrs)?.[field];
  if (value === undefined) return { kind: 'UNKNOWN' };
  const evidence = (style ? raw.styleEvidence : raw.attrsEvidence)?.[field];
  if (evidence === undefined) return { kind: 'CAPTURED' };
  let supported = evidence && typeof evidence === 'object' && evidence.nodeId === raw.id;
  if (style) {
    supported &&= evidence.kind === 'STATIC_CSS_DERIVED' && ['.al-search-job-strip progress', '.al-logical-job progress'].includes(evidence.selector)
      && evidence.declaration === 'accent-color: var(--accent)' && evidence.variableSelector === ':root' && evidence.variableDeclaration === `--accent: ${value}`
      && Array.isArray(evidence.matchingInlineAncestors) && evidence.matchingInlineAncestors.every(id => typeof id === 'string');
  } else {
    const attribute = field === 'indeterminate' ? 'value' : field;
    supported &&= evidence.kind === 'HTML_ATTRIBUTE_DERIVED' && evidence.tag === raw.tag && evidence.attribute === attribute && typeof evidence.present === 'boolean'
      && (evidence.present ? typeof evidence.sourceValue === 'string' : evidence.sourceValue === undefined);
    if (supported && ['value', 'max'].includes(field)) {
      supported = evidence.present && /^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(evidence.sourceValue.trim()) && Number(evidence.sourceValue) === value;
    } else if (supported) supported = typeof value === 'boolean' && value === (field === 'indeterminate' ? !evidence.present : evidence.present);
  }
  return supported ? { kind: evidence.kind, evidence: structuredClone(evidence) } : { kind: 'UNKNOWN', reason: 'EVIDENCE_UNSUPPORTED' };
}
function singleBlockTextWidth(raw, ancestors) {
  const parent = ancestors.at(-1)?.raw, s = parent?.style ?? {};
  if (s.display !== 'block') return { reason: 'NOT_BLOCK_PARENT' };
  const children = parent.children ?? [];
  if (children.filter(child => child.kind === 'text').length !== 1) return { reason: 'MULTIPLE_TEXT_CHILDREN' };
  // Nested inline content can have glyphs outside its own element rectangle.
  // A single direct text child is the only measured flow supported here.
  if (children.length !== 1 || children[0] !== raw) return { reason: 'SIBLING_BOUNDARY_UNSUPPORTED' };
  if (ancestors.some(entry => entry.raw.style?.transform !== 'none')) return { reason: 'TRANSFORM_BOUNDARY_UNSUPPORTED' };
  if (!['left', 'start'].includes(s.textAlign) || s.direction && s.direction !== 'ltr' || s.writingMode && s.writingMode !== 'horizontal-tb') return { reason: 'TEXT_ALIGNMENT_UNSUPPORTED' };
  if (!['normal', 'pre-wrap'].includes(s.whiteSpace)) return { reason: 'WHITE_SPACE_UNSUPPORTED' };
  if (![s.overflowX, s.overflowY].every(value => ['visible', 'hidden', 'clip'].includes(value))) return { reason: 'SCROLLBAR_BOUNDARY_UNSUPPORTED' };
  // parseFloat's fallback to zero must not turn unknown or percentage lengths
  // into permission to expand. getBoundingClientRect gives the border box.
  const pixels = value => typeof value === 'string' && /^(?:\d+(?:\.\d+)?|\.\d+)px$/.test(value.trim()) ? Number.parseFloat(value) : NaN;
  const [leftPadding, rightPadding, leftBorder, rightBorder] = ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth'].map(field => pixels(s[field]));
  if (![leftPadding, rightPadding, leftBorder, rightBorder].every(Number.isFinite)) return { reason: 'CONTENT_BOUNDARY_UNSUPPORTED' };
  const left = parent.rect.x + leftBorder + leftPadding, right = parent.rect.x + parent.rect.width - rightBorder - rightPadding;
  if (raw.rect.x < left - 0.01 || raw.rect.x + raw.rect.width > right + 0.01) return { reason: 'TEXT_OUTSIDE_CONTENT' };
  // A neighboring element in the enclosing block may occupy the same row
  // (for example a floating/positioned icon). Keep the captured width when its
  // rectangle intersects the expansion; no inline-flow or gap is inferred.
  const siblings = ancestors.at(-2)?.raw.children ?? [];
  const pending = siblings.filter(sibling => sibling !== parent).map(raw => ({ raw, depth: 0 })), seen = new Set();
  while (pending.length) {
    const { raw: sibling, depth } = pending.pop();
    if (!sibling || typeof sibling !== 'object' || seen.has(sibling) || depth > 250 || seen.size >= 25000) return { reason: 'SIBLING_BOUNDARY_UNSUPPORTED' };
    seen.add(sibling);
    const r = sibling.rect;
    if (!r || !['x', 'y', 'width', 'height'].every(field => Number.isFinite(r[field]))) return { reason: 'SIBLING_BOUNDARY_UNSUPPORTED' };
    // A zero-size positioned wrapper can still have overflowing descendants.
    // Its own rectangle does not occupy space, but its subtree must be checked.
    if (r.width > 0 && r.height > 0 && r.y < parent.rect.y + parent.rect.height && r.y + r.height > parent.rect.y && r.x < right && r.x + r.width > raw.rect.x) return { reason: 'SIBLING_BOUNDARY_UNSUPPORTED' };
    if (sibling.children !== undefined && !Array.isArray(sibling.children)) return { reason: 'SIBLING_BOUNDARY_UNSUPPORTED' };
    for (const child of sibling.children ?? []) pending.push({ raw: child, depth: depth + 1 });
  }
  const width = right - raw.rect.x;
  return width > raw.rect.width + 0.01 ? { width } : { reason: 'NO_EXTRA_WIDTH' };
}
function matchingZIndexEvidence(child, value) {
  const evidence = child.styleEvidence?.zIndex;
  return !evidence || evidence.kind === 'STATIC_CSS_DERIVED' && evidence.nodeId === child.id
    && evidence.declaration === `z-index: ${value}` && evidence.positionDeclaration === `position: ${child.style?.position}`
    && typeof evidence.selector === 'string' && evidence.selector.length > 0;
}
function positiveOverlayStaticFlexOrder(node, ranges, nodes) {
  // A positive-z absolute child is isolated. With exactly one static flex
  // sibling, its entire flow can precede the overlay only when every source
  // descendant explicitly has auto z-index and no competing composition.
  if (ranges.length !== 2 || ranges.some(range => (range.raw.kind ?? 'element') !== 'element')) return { reason: 'PARENT_LAYOUT_UNSUPPORTED' };
  const overlayIndex = ranges.findIndex(range => range.raw.style?.position === 'absolute');
  const flowIndex = ranges.findIndex(range => range.raw.style?.position === 'static');
  if (overlayIndex < 0 || flowIndex < 0) return { reason: 'MIXED_POSITIONED_SIBLINGS' };
  const overlay = ranges[overlayIndex].raw, value = overlay.style?.zIndex;
  const numericValue = typeof value === 'string' && /^[1-9]\d*$/.test(value) ? Number(value) : NaN;
  if (!Number.isSafeInteger(numericValue)) return { reason: 'Z_INDEX_UNSUPPORTED' };
  if (!matchingZIndexEvidence(overlay, value)) return { reason: 'Z_INDEX_PROVENANCE_UNSUPPORTED' };
  const pending = [{ raw: ranges[flowIndex].raw, depth: 0 }], seen = new Set(), flowZIndices = [];
  while (pending.length) {
    const { raw: current, depth } = pending.pop();
    if (!current || typeof current !== 'object' || seen.has(current) || depth > 250 || seen.size >= 25000) return { reason: 'COMPLEX_STACKING_SUBTREE' };
    seen.add(current); const s = current.style ?? {};
    if (s.zIndex !== 'auto') return { reason: 'STATIC_FLOW_Z_INDEX_UNSUPPORTED' };
    if (!matchingZIndexEvidence(current, 'auto')) return { reason: 'Z_INDEX_PROVENANCE_UNSUPPORTED' };
    if (!['static', 'relative', 'absolute'].includes(s.position) || s.transform !== 'none' || s.opacity !== '1'
      || ['filter', 'backdropFilter', 'perspective', 'clipPath', 'maskImage'].some(field => s[field] !== undefined && s[field] !== 'none')
      || [['mixBlendMode', 'normal'], ['isolation', 'auto'], ['willChange', 'auto'], ['contain', 'none']].some(([field, initial]) => s[field] !== undefined && s[field] !== initial)) return { reason: 'STATIC_FLOW_COMPOSITION_UNSUPPORTED' };
    const evidence = current.styleEvidence?.zIndex;
    flowZIndices.push({ sourceId: current.id, value: 'auto', numericValue: 0, source: evidence ? 'STATIC_CSS_DERIVED' : 'CAPTURED_STYLE', ...(evidence ? { evidence: structuredClone(evidence) } : {}) });
    if (current.children !== undefined && !Array.isArray(current.children)) return { reason: 'COMPLEX_STACKING_SUBTREE' };
    for (const child of current.children ?? []) pending.push({ raw: child, depth: depth + 1 });
  }
  for (const range of ranges) {
    const branch = nodes.slice(range.start, range.end), keys = new Set(branch.map(def => def.key));
    if (!branch.length) return { reason: 'CHILD_SURFACE_NOT_EMITTED' };
    if (branch[0].parentKey !== node.key || branch.slice(1).some(def => !keys.has(def.parentKey))) return { reason: 'CROSS_PARENT_SUBTREE' };
  }
  if (flowIndex === 0) return { reason: 'ALREADY_ORDERED' };
  const overlayEvidence = overlay.styleEvidence?.zIndex;
  const zIndices = ranges.map((range, index) => index === flowIndex ? flowZIndices[0] : {
    sourceId: overlay.id, value, numericValue, source: overlayEvidence ? 'STATIC_CSS_DERIVED' : 'CAPTURED_STYLE', ...(overlayEvidence ? { evidence: structuredClone(overlayEvidence) } : {}) });
  return { ordered: [ranges[flowIndex], ranges[overlayIndex]], zIndices, flowZIndices, paintPhase: 'POSITIVE_OVERLAY_AFTER_STATIC_FLEX_FLOW' };
}
function positionedSiblingOrder(raw, node, ranges, nodes) {
  if (raw.style?.display === 'flex') return positiveOverlayStaticFlexOrder(node, ranges, nodes);
  if (raw.style?.display !== 'block') return { reason: 'PARENT_LAYOUT_UNSUPPORTED' };
  const entries = [];
  for (const [index, range] of ranges.entries()) {
    const child = range.raw, position = child.style?.position, value = child.style?.zIndex;
    if ((child.kind ?? 'element') !== 'element' || !['absolute', 'relative', 'fixed', 'sticky'].includes(position)) return { reason: 'MIXED_POSITIONED_SIBLINGS' };
    const numericValue = value === 'auto' ? 0 : typeof value === 'string' && /^(?:0|[1-9]\d*)$/.test(value) ? Number(value) : NaN;
    if (!Number.isSafeInteger(numericValue)) return { reason: 'Z_INDEX_UNSUPPORTED' };
    const evidence = child.styleEvidence?.zIndex;
    if (!matchingZIndexEvidence(child, value)) return { reason: 'Z_INDEX_PROVENANCE_UNSUPPORTED' };
    const matrix = /^matrix(3d)?\(([^)]+)\)$/.exec(child.style.transform ?? ''), matrixValues = matrix?.[2].split(',').map(part => part.trim());
    const number = part => typeof part === 'string' && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(part) && Number.isFinite(Number(part));
    const opacity = number(child.style.opacity) ? Number(child.style.opacity) : NaN;
    const isolated = value !== 'auto' || ['fixed', 'sticky'].includes(position) || matrixValues && matrixValues.length === (matrix[1] ? 16 : 6) && matrixValues.every(number) || opacity >= 0 && opacity < 1;
    if (!isolated) {
      // z-index:auto on an ordinary positioned element does not isolate its
      // descendants. Refuse a whole-branch approximation when descendants may
      // participate in another positioned/flex/grid painting phase.
      const pending = (child.children ?? []).map(raw => ({ raw, depth: 0 })), seen = new Set();
      while (pending.length) {
        const { raw: descendant, depth } = pending.pop();
        if (!descendant || typeof descendant !== 'object' || seen.has(descendant) || depth > 250 || seen.size >= 25000) return { reason: 'COMPLEX_STACKING_SUBTREE' };
        seen.add(descendant);
        const s = descendant.style ?? {};
        if (descendant.kind !== 'text' && (s.position !== 'static' || ['flex', 'inline-flex', 'grid', 'inline-grid'].includes(s.display) || s.zIndex !== undefined && !['auto', '0'].includes(s.zIndex))) return { reason: 'COMPLEX_STACKING_SUBTREE' };
        if (descendant.children !== undefined && !Array.isArray(descendant.children)) return { reason: 'COMPLEX_STACKING_SUBTREE' };
        for (const raw of descendant.children ?? []) pending.push({ raw, depth: depth + 1 });
      }
    }
    const branch = nodes.slice(range.start, range.end), keys = new Set(branch.map(def => def.key));
    if (!branch.length) return { reason: 'CHILD_SURFACE_NOT_EMITTED' };
    // Sticky promotion already has its own source rules. Do not move a block
    // containing nodes that became siblings of another native parent.
    if (branch[0].parentKey !== node.key || branch.slice(1).some(def => !keys.has(def.parentKey))) return { reason: 'CROSS_PARENT_SUBTREE' };
    entries.push({ ...range, index, numericValue, zIndex: { sourceId: child.id, value, numericValue, source: evidence ? 'STATIC_CSS_DERIVED' : 'CAPTURED_STYLE', ...(evidence ? { evidence: structuredClone(evidence) } : {}) } });
  }
  const ordered = [...entries].sort((a, b) => a.numericValue - b.numericValue || a.index - b.index);
  return ordered.some((entry, index) => entry.index !== index) ? { ordered, zIndices: entries.map(entry => entry.zIndex) } : { reason: 'ALREADY_ORDERED' };
}
function stickyScrollTarget(raw, ancestors) {
  // Bounding rectangles do not prove transformed containing-block behavior.
  if ([...ancestors.map(entry => entry.raw), raw].some(entry => entry.style?.transform && entry.style.transform !== 'none')) return { reason: 'Transformed sticky or ancestor path is unsupported' };
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const entry = ancestors[i], s = entry.raw.style ?? {};
    if (['clipPath', 'maskImage', 'filter', 'backdropFilter', 'perspective'].some(field => s[field] && s[field] !== 'none') || s.clip && !['auto', 'none'].includes(s.clip)) return { reason: 'Unsupported ancestor clipping or composition' };
    if (entry.node.props?.overflowDirection && entry.node.props.overflowDirection !== 'NONE') return { target: entry };
    // Do not bypass a nearer CSS overflow container that has no measured scroll,
    // or lose clipping / inherited opacity by moving its descendant out of it.
    if (entry.node.props?.clipsContent) return { reason: 'Intermediate clipping or non-scrolling overflow container' };
    if (finite(s.opacity, 1) !== 1 || ['fixed', 'sticky'].includes(s.position)) return { reason: 'Intermediate opacity or positioned subtree cannot be safely removed' };
  }
  return { reason: 'No scrolling ancestor' };
}

/** Convert captured geometry into editable native primitives. Warnings are part
 * of the manifest; unsupported rendering is never silently labelled faithful.
 * Input supports captureDOM 1.0 and the ArchiveLens 2026-09-30 JSON structure.
 */
export function adaptCaptures(captures, options = {}) {
  if (!Array.isArray(captures) || !captures.length || captures.length > 1000) throw new Error('Expected 1 to 1000 captures');
  const inlineTextMode = options.inlineText === undefined ? 'captured' : options.inlineText;
  if (!['captured', 'uniform-run'].includes(inlineTextMode)) throw new Error('inlineText must be captured or uniform-run');
  const textBoundsMode = options.textBounds === undefined ? 'tight-range' : options.textBounds;
  if (!['tight-range', 'single-block-content'].includes(textBoundsMode)) throw new Error('textBounds must be tight-range or single-block-content');
  const textBounds = textBoundsMode === 'single-block-content' ? { mode: textBoundsMode, expandedCount: 0, expansions: [], preservedCounts: {}, nativeFit: 'NOT_RUN' } : null;
  const paintOrderMode = options.paintOrder === undefined ? 'captured' : options.paintOrder;
  if (!['captured', 'positioned-siblings'].includes(paintOrderMode)) throw new Error('paintOrder must be captured or positioned-siblings');
  const paintOrder = paintOrderMode === 'positioned-siblings' ? { mode: paintOrderMode, changedParentCount: 0, changedParents: [], preservedCounts: {}, nativeVerification: 'NOT_RUN' } : null;
  const nativeControlsMode = options.nativeControls === undefined ? 'captured' : options.nativeControls;
  if (!['captured', 'sampled'].includes(nativeControlsMode)) throw new Error('nativeControls must be captured or sampled');
  const nativeControls = nativeControlsMode === 'sampled' ? { mode: nativeControlsMode, progress: [], details: [], progressFillCount: 0, closedDetailsCount: 0, hiddenNodeCount: 0, nativeVisual: 'NOT_RUN' } : null;
  const fallback = options.fallbackFont ?? { family: 'Noto Sans SC', style: 'Regular' };
  const nodes = [], assets = [], warnings = [], mappings = [], scenes = []; const sceneIds = new Set(); const legacySceneIds = new Set(); const assetData = new Map(); const bySource = new Map();
  const warn = (sceneId, sourceId, code, detail = '') => warnings.push({ sceneId, sourceId, code, detail });
  const append = node => { nodes.push(node); if (nodes.length > 25000) throw new Error('Design node budget exceeded'); return node; };
  captures.forEach((capture, index) => {
    const sceneId = safeKey(capture.id); if (sceneIds.has(sceneId)) throw new Error(`Duplicate capture ${sceneId}`); sceneIds.add(sceneId);
    if (capture.captureVersion === undefined) legacySceneIds.add(sceneId);
    if (!capture.root || !capture.viewport || !Number.isFinite(capture.viewport.width) || !Number.isFinite(capture.viewport.height)) throw new Error(`Invalid capture ${sceneId}`);
    const sceneKey = `${sceneId}/scene`; const rootX = finite(capture.root.rect?.x), rootY = finite(capture.root.rect?.y); const sceneStart = nodes.length;
    const sceneFrame = append({ key: sceneKey, type: 'FRAME', name: capture.name || sceneId, parentKey: null, x: (index % 5) * (options.columnWidth ?? 1500), y: Math.floor(index / 5) * (options.rowHeight ?? 1100), width: capture.viewport.width, height: capture.viewport.height, props: { fills: [], clipsContent: true } });
    const seen = new Set();
    function walk(raw, parent, parentRect, depth = 0, ancestors = [], hidden = false) {
      if (depth > 250 || !raw || typeof raw !== 'object') throw new Error('Invalid or excessively deep captured node tree');
      const id = safeKey(raw.id); if (seen.has(id)) throw new Error(`Duplicate capture node ${sceneId}/${id}`); seen.add(id);
      const r = raw.rect; if (!r || !['x', 'y', 'width', 'height'].every(k => Number.isFinite(r[k]))) throw new Error(`Invalid geometry ${sceneId}/${id}`);
      if (r.width <= 0 || r.height <= 0) { warn(sceneId, id, 'ZERO_SIZE_SKIPPED'); return; }
      const key = `${sceneId}/${id}`; const s = raw.style ?? {}; const kind = raw.kind ?? 'element';
      // Visibility follows the captured source ancestry, including generated
      // children and sticky nodes that are promoted to a scrolling ancestor.
      const add = definition => { if (nativeControls && hidden) definition.props = { ...definition.props, visible: false }; return append(definition); };
      const props = { fills: paint(rgba(s.backgroundColor)), opacity: Math.min(1, Math.max(0, finite(s.opacity, 1))) };
      for (const field of ['color', 'backgroundColor', 'borderTopColor']) if (s[field] && !['transparent', 'none'].includes(s[field]) && !rgba(s[field])) warn(sceneId, id, 'UNSUPPORTED_COLOR', `${field}: ${String(s[field]).slice(0, 100)}`);
      const node = { key, name: String(raw.name || raw.tag || kind).slice(0, 512), type: kind === 'text' ? 'TEXT' : kind === 'svg' ? 'VECTOR' : kind === 'image' ? 'RECTANGLE' : 'FRAME', parentKey: parent.key, x: r.x - parentRect.x, y: r.y - parentRect.y, width: r.width, height: r.height, props };
      mappings.push({ sceneId, sourceId: id, nodeKey: key }); bySource.set(`${sceneId}/${id}`, key);
      if (kind === 'text') {
        Object.assign(props, fontProperties(s, fallback), { characters: String(raw.text ?? '') });
        if (textBounds) {
          const result = singleBlockTextWidth(raw, ancestors);
          if (result.width !== undefined) {
            textBounds.expansions.push({ sceneId, sourceId: id, nodeKey: key, parentKey: parent.key, fromWidth: node.width, toWidth: result.width });
            textBounds.expandedCount++; node.width = result.width;
          } else textBounds.preservedCounts[result.reason] = (textBounds.preservedCounts[result.reason] ?? 0) + 1;
        }
        add(node); return;
      }
      const borderWidth = finite(s.borderTopWidth); const borderColor = rgba(s.borderTopColor);
      if (borderWidth > 0 && borderColor) {
        props.strokeWeight = borderWidth; props.strokeAlign = 'INSIDE'; props.strokes = paint(borderColor);
        if (s.borderTopStyle === 'dashed') {
          props.dashPattern = [3 * borderWidth, 3 * borderWidth];
          warn(sceneId, id, 'DASH_PATTERN_APPROXIMATED', 'CSS dashed uses native dash and gap lengths of three times the border width; browser corner spacing may differ');
        } else if (s.borderTopStyle && s.borderTopStyle !== 'solid') warn(sceneId, id, 'BORDER_STYLE_APPROXIMATED', s.borderTopStyle);
      }
      if (s.borderTopLeftRadius && ['FRAME', 'RECTANGLE'].includes(node.type)) props.cornerRadius = Math.max(0, finite(s.borderTopLeftRadius));
      if (s.boxShadow && s.boxShadow !== 'none') { try { props.effects = parseShadows(s.boxShadow, s.color); } catch (error) { warn(sceneId, id, 'SHADOW_UNSUPPORTED', error.message); } }
      if (s.transform && s.transform !== 'none') warn(sceneId, id, 'TRANSFORM_BOUNDING_BOX_ONLY');
      if (s.backgroundImage && s.backgroundImage !== 'none') {
        try {
          if (kind !== 'element') throw new Error('Unsupported background surface');
          props.fills = [parseLinearGradient(s, rgba)];
        } catch (error) { warn(sceneId, id, 'CSS_BACKGROUND_IMAGE_UNSUPPORTED', error.message); }
      }
      if (kind === 'image') {
        const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(raw.dataUrl || '');
        if (match) { let assetKey = assetData.get(raw.dataUrl); if (!assetKey) { assetKey = `asset-${assets.length + 1}`; assets.push({ key: assetKey, mimeType: match[1], dataBase64: match[2] }); assetData.set(raw.dataUrl, assetKey); } props.fills = [{ type: 'IMAGE', assetKey, scaleMode: s.objectFit === 'contain' ? 'FIT' : 'FILL' }]; } else warn(sceneId, id, 'IMAGE_RESOURCE_MISSING');
        add(node); return;
      }
      if (kind === 'svg') {
        // SVG defaults to no stroke; native createVector defaults must not leak in.
        // Unsupported source stroke styling remains an explicit fallback warning.
        props.strokes = [];
        const svg = String(raw.svg ?? ''); if (svg.length > 1000000 || /<(script|foreignObject|image)\b|\bon\w+\s*=|(?:href|url)\s*[=(]/i.test(svg)) throw new Error(`Unsafe SVG ${sceneId}/${id}`);
        try {
          const shapes = readSimpleSVG(svg, r, s.color ?? 'rgb(0, 0, 0)', rgba);
          node.type = 'FRAME'; props.fills = []; props.clipsContent = true; add(node);
          for (const [i, shape] of shapes.entries()) add({ key: `${key}/path-${i + 1}`, name: 'Editable SVG path', type: 'VECTOR', parentKey: key, ...shape });
          return;
        } catch (error) { warn(sceneId, id, 'SVG_GEOMETRY_FALLBACK', error.message); }
        const paths = [...svg.matchAll(/<path\b[^>]*\bd\s*=\s*(["'])(.*?)\1/gi)].map(match => ({ windingRule: /fill-rule\s*=\s*["']evenodd/i.test(match[0]) ? 'EVENODD' : 'NONZERO', data: match[2] }));
        if (!paths.length) { node.type = 'FRAME'; props.fills = []; warn(sceneId, id, 'SVG_WITHOUT_PATH_UNSUPPORTED'); } else { props.vectorPaths = paths; props.fills = paint(rgba(s.color) ?? { r: 0, g: 0, b: 0, a: 1 }); if (/\btransform\s*=|<(?:circle|rect|ellipse|line|polyline|polygon|use|text|g)\b/i.test(svg)) warn(sceneId, id, 'SVG_COMPLEX_GEOMETRY_PARTIAL'); if ((svg.match(/\bfill=/g) || []).length > 1) warn(sceneId, id, 'SVG_MULTIPLE_FILLS_APPROXIMATED'); }
        add(node); return;
      }
      const horizontal = /^(auto|scroll)$/.test(s.overflowX) && finite(raw.scroll?.width, r.width) > r.width;
      const vertical = /^(auto|scroll)$/.test(s.overflowY) && finite(raw.scroll?.height, r.height) > r.height;
      const legacyHorizontal = !raw.scroll && /^(auto|scroll)$/.test(s.overflowX); const legacyVertical = !raw.scroll && /^(auto|scroll)$/.test(s.overflowY);
      props.overflowDirection = (horizontal || legacyHorizontal) && (vertical || legacyVertical) ? 'BOTH' : horizontal || legacyHorizontal ? 'HORIZONTAL' : vertical || legacyVertical ? 'VERTICAL' : 'NONE';
      props.clipsContent = [s.overflowX, s.overflowY, s.overflow].some(value => ['hidden', 'auto', 'scroll', 'clip'].includes(value));
      if (s.position === 'sticky') {
        const { target, reason } = stickyScrollTarget(raw, ancestors);
        if (target) {
          node.parentKey = target.node.key; node.x = r.x - target.raw.rect.x; node.y = r.y - target.raw.rect.y; props.isFixed = true;
          warn(sceneId, id, 'STICKY_POSITION_SAMPLED_FIXED', 'Fixed at the sampled state; CSS sticky thresholds and containing-block boundaries are not reproduced. Verify scrolling behavior.');
        } else warn(sceneId, id, 'FIXED_POSITION_CAPTURED_STATIC', reason);
      } else if (s.position === 'fixed') { if (parent.props?.overflowDirection && parent.props.overflowDirection !== 'NONE') props.isFixed = true; else warn(sceneId, id, 'FIXED_POSITION_CAPTURED_STATIC'); }
      add(node);
      if (nativeControls && raw.tag === 'progress') {
        const attrs = raw.attrs ?? {}, sources = Object.fromEntries(['value', 'max', 'indeterminate'].map(field => [field, nativeControlSource(raw, field)]));
        sources.accentColor = nativeControlSource(raw, 'accentColor', true);
        const record = { sceneId, sourceId: id, nodeKey: key, state: 'UNKNOWN', fillNodeKey: null, track: 'UNKNOWN', sources };
        nativeControls.progress.push(record);
        warn(sceneId, id, 'PROGRESS_TRACK_UNKNOWN', 'Platform progress track, rounded corners and animation were not captured');
        const invalid = (field, missing, detail) => { record.state = missing ? 'UNKNOWN' : 'INVALID'; warn(sceneId, id, `PROGRESS_${field}_${missing ? 'UNKNOWN' : 'INVALID'}`, detail); };
        if (sources.indeterminate.kind === 'UNKNOWN') invalid('STATE', true, sources.indeterminate.reason ?? 'indeterminate was not captured');
        else if (typeof attrs.indeterminate !== 'boolean') invalid('STATE', false, 'indeterminate must be a boolean');
        else if (attrs.indeterminate) { record.state = 'INDETERMINATE'; warn(sceneId, id, 'PROGRESS_INDETERMINATE_UNKNOWN', 'No sampled animation pixels or timing are available'); }
        else if (sources.value.kind === 'UNKNOWN') invalid('VALUE', true, sources.value.reason ?? 'value was not captured');
        else if (typeof attrs.value !== 'number' || !Number.isFinite(attrs.value) || attrs.value < 0) invalid('VALUE', false, 'value must be a finite nonnegative number');
        else if (sources.max.kind === 'UNKNOWN') invalid('MAX', true, sources.max.reason ?? 'max was not captured');
        else if (typeof attrs.max !== 'number' || !Number.isFinite(attrs.max) || attrs.max <= 0) invalid('MAX', false, 'max must be a finite positive number');
        else if (attrs.value > attrs.max) invalid('RATIO', false, 'value exceeds max; no clamping is performed');
        else {
          record.state = 'DETERMINATE'; record.ratio = attrs.value / attrs.max;
          const color = sources.accentColor.kind === 'UNKNOWN' ? null : rgba(s.accentColor);
          if (!color || !['r', 'g', 'b', 'a'].every(channel => Number.isFinite(color[channel]) && color[channel] >= 0 && color[channel] <= 1)) warn(sceneId, id, 'PROGRESS_ACCENT_UNKNOWN', sources.accentColor.reason ?? 'No supported explicit accent color was captured');
          else if (record.ratio > 0) {
            const width = r.width * record.ratio;
            if (width < 0.01) warn(sceneId, id, 'PROGRESS_FILL_TOO_SMALL', 'Sampled width is below the DesignSpec minimum; no minimum fill is invented');
            else {
              record.fillNodeKey = `${key}/progress-fill`;
              add({ key: record.fillNodeKey, name: 'Sampled progress fill', type: 'RECTANGLE', parentKey: key, x: 0, y: 0, width, height: r.height, props: { fills: paint(color), strokes: [], opacity: 1 } });
              nativeControls.progressFillCount++;
            }
          }
        }
      }
      if (['select', 'input', 'textarea'].includes(raw.tag) && raw.attrs?.value !== undefined) {
        const font = fontProperties(s, fallback), left = finite(s.paddingLeft, 4), right = finite(s.paddingRight, 4); const lineHeight = font.lineHeight.unit === 'PIXELS' ? font.lineHeight.value : font.fontSize * 1.2;
        add({ key: `${key}/value`, name: 'Editable field value', type: 'TEXT', parentKey: key, x: left, y: Math.max(0, (r.height - lineHeight) / 2), width: Math.max(1, r.width - left - right - (raw.tag === 'select' ? 20 : 0)), height: Math.max(1, lineHeight), props: { ...font, characters: String(raw.attrs.value) } });
        if (raw.tag === 'select') add({ key: `${key}/caret`, name: 'Select caret', type: 'VECTOR', parentKey: key, x: Math.max(0, r.width - 17), y: Math.max(0, r.height / 2 - 3), width: 8, height: 5, props: { vectorPaths: [{ windingRule: 'NONZERO', data: 'M 0 0 L 4 4 L 8 0 Z' }], strokes: [], fills: paint(rgba(s.color) ?? { r: 0, g: 0, b: 0, a: 1 }) } });
        return;
      }
      if (raw.tag === 'select') warn(sceneId, id, 'SELECT_VALUE_NOT_CAPTURED');
      if (['checkbox', 'radio'].includes(raw.attrs?.inputType)) { const dot = raw.attrs.inputType === 'radio'; add({ key: `${key}/choice`, name: raw.attrs.inputType, type: dot ? 'ELLIPSE' : 'RECTANGLE', parentKey: key, x: 0, y: 0, width: r.width, height: r.height, props: { fills: raw.attrs.checked ? paint(rgba(s.color) ?? { r: 0, g: 0, b: 0, a: 1 }) : [], strokes: paint(rgba(s.color) ?? { r: 0, g: 0, b: 0, a: 1 }), strokeWeight: 1 } }); warn(sceneId, id, 'NATIVE_CHOICE_STYLE_APPROXIMATED'); }
      if (raw.children !== undefined && !Array.isArray(raw.children)) throw new Error('Captured children must be an array');
      let closedDetails = false, summary;
      if (nativeControls && raw.tag === 'details') {
        const source = nativeControlSource(raw, 'open');
        closedDetails = source.kind !== 'UNKNOWN' && raw.attrs?.open === false;
        summary = (raw.children ?? []).find(child => (child.kind ?? 'element') === 'element' && child.tag === 'summary');
        const record = { sceneId, sourceId: id, nodeKey: key, state: closedDetails ? 'CLOSED' : source.kind !== 'UNKNOWN' && raw.attrs?.open === true ? 'OPEN' : 'UNKNOWN', summaryKey: summary ? `${sceneId}/${safeKey(summary.id)}` : null, hiddenRootKeys: closedDetails ? (raw.children ?? []).filter(child => child !== summary).map(child => `${sceneId}/${safeKey(child.id)}`) : [], summaryMarker: 'UNKNOWN', sources: { open: source } };
        nativeControls.details.push(record);
        if (closedDetails) nativeControls.closedDetailsCount++;
        if (record.state === 'UNKNOWN') warn(sceneId, id, 'DETAILS_OPEN_UNKNOWN', source.reason ?? 'No boolean open state was captured');
        if (!summary) warn(sceneId, id, 'DETAILS_SUMMARY_UNKNOWN', 'Default summary text and its native marker were not captured');
        warn(sceneId, id, 'DETAILS_MARKER_UNKNOWN', 'Native summary marker geometry was not independently captured');
      }
      // Geometry is measured at the captured scroll position. Preserve that visible
      // state and retain scroll metrics in the manifest instead of silently resetting.
      if (raw.scroll?.top || raw.scroll?.left) warn(sceneId, id, 'NONZERO_SCROLL_SNAPSHOT', `${finite(raw.scroll.left)},${finite(raw.scroll.top)}`);
      const childAncestors = [...ancestors, { node, raw }];
      const childRanges = [];
      for (const child of raw.children ?? []) {
        const start = nodes.length; walk(child, node, r, depth + 1, childAncestors, hidden || closedDetails && child !== summary);
        if (paintOrder) childRanges.push({ raw: child, start, end: nodes.length });
      }
      if (paintOrder && childRanges.length > 1) {
        const result = positionedSiblingOrder(raw, node, childRanges, nodes);
        if (result.ordered) {
          // Convert in source order before rearranging entire same-parent
          // branches: asset keys, mappings and node definitions stay stable.
          const reordered = result.ordered.flatMap(range => nodes.slice(range.start, range.end));
          nodes.splice(childRanges[0].start, nodes.length - childRanges[0].start, ...reordered);
          paintOrder.changedParentCount++;
          paintOrder.changedParents.push({ sceneId, parentSourceId: id, parentKey: node.key, beforeSourceIds: childRanges.map(range => range.raw.id), afterSourceIds: result.ordered.map(range => range.raw.id), zIndices: result.zIndices, ...(result.paintPhase ? { paintPhase: result.paintPhase, flowZIndices: result.flowZIndices } : {}) });
        } else paintOrder.preservedCounts[result.reason] = (paintOrder.preservedCounts[result.reason] ?? 0) + 1;
      }
    }
    walk(capture.root, sceneFrame, { x: rootX, y: rootY });
    scenes.push({ id: sceneId, name: capture.name || sceneId, nodeKey: sceneKey, viewport: capture.viewport, nodeCount: nodes.length - sceneStart });
    for (const warning of capture.warnings ?? []) warn(sceneId, warning.nodeId ?? '', warning.code ?? 'CAPTURE_WARNING', warning.tag ?? '');
  });
  const reactions = [], unchangedPresetMappings = [], triggerKeys = new Set();
  for (const link of options.links ?? []) {
    const sourceKey = bySource.get(`${link.sceneId}/${link.sourceId}`); const destinationKey = sceneIds.has(link.targetSceneId) ? `${link.targetSceneId}/scene` : undefined;
    if (!sourceKey || !destinationKey) { warn(link.sceneId, link.sourceId, 'UNRESOLVED_INTERACTION', link.targetSceneId); continue; }
    const trigger = link.trigger === 'AFTER_TIMEOUT' ? { type: 'AFTER_TIMEOUT', delaySeconds: Number(link.timeoutMs) / 1000 } : link.trigger === 'ON_CLICK' || !link.trigger ? { type: 'ON_CLICK' } : null;
    if (!trigger || link.navigation && link.navigation !== 'NAVIGATE') { warn(link.sceneId, link.sourceId, 'UNSUPPORTED_INTERACTION'); continue; }
    // Legacy ArchiveLens links use self-mappings to preserve the captured preset,
    // not to demonstrate the auxiliary command's outcome. Keep that provenance
    // without creating a native navigation that the original delivery omitted.
    if (legacySceneIds.has(link.sceneId) && link.sceneId === link.targetSceneId && trigger.type === 'ON_CLICK') {
      unchangedPresetMappings.push({ mapping: { ...link }, sourceKey, destinationKey, reason: 'Same archived captured preset; native self-navigation omitted. Auxiliary action outcome is not demonstrated.' });
      continue;
    }
    const identity = `${sourceKey}:${trigger.type}`; if (triggerKeys.has(identity)) { warn(link.sceneId, link.sourceId, 'DUPLICATE_INTERACTION'); continue; } triggerKeys.add(identity); reactions.push({ sourceKey, destinationKey, trigger });
  }
  const starts = options.flowStarts ?? [scenes[0].id];
  const capturedAt = options.capturedAt ?? captures[0].source?.capturedAt;
  const spec = { schemaVersion: '1.0', id: options.id ?? 'captured-design', name: options.name ?? 'Captured editable prototype', source: { revision: options.revision ?? captures[0].source?.revision ?? 'unknown', ...(capturedAt ? { capturedAt } : {}), adapter: 'dom-archivelens-1.0' }, fontPolicy: { allowFallback: true, fallback }, nodes, assets, textStyles: [], variables: [], reactions, flows: starts.map(id => { const scene = scenes.find(scene => scene.id === id); if (!scene) throw new Error(`Unknown flow start ${id}`); return { nodeKey: scene.nodeKey, name: scene.name }; }) };
  if (nativeControls) nativeControls.hiddenNodeCount = nodes.filter(node => node.props.visible === false).length;
  const inlineText = inlineTextMode === 'uniform-run' ? coalesceUniformInlineText(captures, spec, mappings, unchangedPresetMappings) : null;
  validateDesignSpec(spec);
  return { spec, manifest: { manifestVersion: '1.0', designId: spec.id, source: spec.source, convertedAt: new Date().toISOString(), sceneCount: scenes.length, nodeCount: nodes.length, assetCount: assets.length, reactionCount: reactions.length, unchangedPresetCount: unchangedPresetMappings.length, unchangedPresetMappings, scenes, mappings, warnings, ...(textBounds ? { textBounds } : {}), ...(paintOrder ? { paintOrder } : {}), ...(nativeControls ? { nativeControls } : {}), ...(inlineText ? { inlineText } : {}), verification: { schema: 'PASS', visual: 'NOT_RUN', figmaRuntime: 'NOT_RUN' } } };
}
