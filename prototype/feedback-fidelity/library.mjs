import { createHash } from 'node:crypto';

const fail = code => { throw new Error(code); };
const ensure = (condition, code) => { if (!condition) fail(code); };
const plain = value => value && typeof value === 'object' && !Array.isArray(value);
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const safeSvg = value => {
  if (typeof value !== 'string' || !value.length || value.length > 2000000 || !/^\s*<svg\b/i.test(value) || /<(?:script|foreignObject)\b|<!DOCTYPE|<!ENTITY|\son[a-z]+\s*=|@import/i.test(value)) return false;
  for (const match of value.matchAll(/(?:href|xlink:href)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi)) if (!/^["'](?:#[^"']+|data:image\/(?:png|jpeg|webp|gif);base64,[^"']+)["']$/i.test(match[1])) return false;
  for (const match of value.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)) if (!/^#[^\s"')]+$/.test(match[2])) return false;
  return true;
};
function parseColor(value) {
  if (typeof value !== 'string') return null;
  value = value.trim();
  if (value.toLowerCase() === 'white') return { r:1, g:1, b:1, a:1 };
  let match = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i.exec(value);
  if (match) {
    const numbers = match.slice(1, 4).map(Number), alpha = match[4] === undefined ? 1 : Number(match[4]);
    if (numbers.some(number => !Number.isFinite(number) || number < 0 || number > 255) || !Number.isFinite(alpha) || alpha < 0 || alpha > 1) return null;
    return { r: numbers[0] / 255, g: numbers[1] / 255, b: numbers[2] / 255, a: alpha };
  }
  match = /^#([a-f\d]{3,4}|[a-f\d]{6}|[a-f\d]{8})$/i.exec(value);
  if (!match) return null;
  let hex = match[1]; if (hex.length < 5) hex = [...hex].map(character => character + character).join('');
  const alpha = hex.length === 8 ? parseInt(hex.slice(6), 16) / 255 : 1;
  return { r: parseInt(hex.slice(0, 2), 16) / 255, g: parseInt(hex.slice(2, 4), 16) / 255, b: parseInt(hex.slice(4, 6), 16) / 255, a: alpha };
}
const colorHex = color => `#${['r', 'g', 'b'].map(key => Math.round(color[key] * 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`;

/** Plan only observed mock colours and complete SVG templates. No source project or browser is read here. */
export function buildFeedbackLibraryPlan(capturesWithFonts) {
  ensure(Array.isArray(capturesWithFonts) && capturesWithFonts.length > 0 && capturesWithFonts.length <= 64, 'FEEDBACK_LIBRARY_INPUT_INVALID');
  const colors = new Map(), templates = new Map(), sources = [], fonts = new Map(), captureIds = new Set(), imageSvgCache = new Set();
  let nodeCount = 0, svgBytes = 0;
  const addColor = value => {
    const color = parseColor(value); if (!color) return;
    const hex = colorHex(color), alpha = color.a, key = `${hex}@${alpha}`, rgba = { r: color.r, g: color.g, b: color.b, a: alpha };
    if (colors.has(key)) ensure(JSON.stringify(colors.get(key).value) === JSON.stringify(rgba), 'FEEDBACK_LIBRARY_RGBA_KEY_COLLISION');
    else colors.set(key, { key, hex, alpha, name: `rgba/${hex.slice(1)}/a_${String(alpha).replaceAll('.','_')}`, value: rgba });
  };
  const addSvgColors = markup => {
    for (const attribute of markup.matchAll(/\b(?:fill|stroke|color|stop-color|flood-color|lighting-color|style)\s*=\s*(["'])(.*?)\1/gi)) {
      const value=attribute[2].replace(/url\([^)]*\)/gi,'');
      addColor(value);
      for(const color of value.match(/rgba?\([^)]*\)|#[a-f\d]{3,8}\b/gi)??[])addColor(color);
    }
  };
  const addFont = value => {
    ensure(plain(value) && typeof value.family === 'string' && value.family && value.family.length <= 100 && typeof value.style === 'string' && value.style && value.style.length <= 100, 'FEEDBACK_LIBRARY_FONT_INVALID');
    const font = { family: value.family, style: value.style }; fonts.set(JSON.stringify(font), font);
  };
  for (const item of capturesWithFonts) {
    const capture = item?.capture, fontMapping = item?.fontMapping ?? item?.fonts ?? {};
    ensure(capture?.schemaVersion === 'feedback-fidelity-capture/1' && capture.privacy?.mockOnly === true && capture.privacy.authenticatedCapture === false && capture.privacy.credentialsRead === false, 'FEEDBACK_LIBRARY_SYNTHETIC_ONLY');
    ensure(typeof capture.id === 'string' && capture.id && capture.id.length <= 200 && !captureIds.has(capture.id) && Array.isArray(capture.nodes) && capture.nodes.length > 0 && capture.nodes.length <= 20000 && plain(fontMapping), 'FEEDBACK_LIBRARY_CAPTURE_INVALID');
    captureIds.add(capture.id); nodeCount += capture.nodes.length; ensure(nodeCount <= 100000, 'FEEDBACK_LIBRARY_SOURCE_BUDGET');
    const ids = new Set();
    for (const node of capture.nodes) {
      ensure(typeof node.id === 'string' && node.id && node.id.length <= 200 && !ids.has(node.id) && plain(node.style), 'FEEDBACK_LIBRARY_NODE_INVALID'); ids.add(node.id);
      for (const value of Object.values(node.style)) if (typeof value === 'string') for (const color of value.replace(/url\([^)]*\)/gi, '').match(/rgba?\([^)]*\)|#[a-f\d]{3,8}\b/gi) ?? []) addColor(color);
      if(node.kind==='image'&&typeof node.dataUrl==='string'&&/^data:image\/svg\+xml(?:;|,)/i.test(node.dataUrl)&&!imageSvgCache.has(node.dataUrl)){
        ensure(node.dataUrl.length<=6000000,'FEEDBACK_LIBRARY_PLAN_BUDGET');
        const encoded=/^data:image\/svg\+xml(?:;charset=[a-z\d_-]+)?,([\s\S]*)$/i.exec(node.dataUrl);
        ensure(encoded,'FEEDBACK_LIBRARY_IMAGE_SVG_ENCODING');let markup;
        try{markup=decodeURIComponent(encoded[1]);}catch{fail('FEEDBACK_LIBRARY_IMAGE_SVG_ENCODING');}
        ensure(safeSvg(markup),'FEEDBACK_LIBRARY_UNSAFE_IMAGE_SVG');
        svgBytes+=markup.length;ensure(svgBytes<=8000000,'FEEDBACK_LIBRARY_PLAN_BUDGET');
        addSvgColors(markup);imageSvgCache.add(node.dataUrl);
      }
      if (node.kind !== 'svg') continue;
      ensure(node.svgEvidence?.selfContained === true && node.svgEvidence.computedPaintsInlined === true && node.svgEvidence.rootOpacityIncluded === true && safeSvg(node.svg), 'FEEDBACK_LIBRARY_UNSAFE_SVG');
      ensure(plain(node.rect) && Number.isFinite(node.rect.width) && Number.isFinite(node.rect.height) && node.rect.width > 0 && node.rect.height > 0 && node.rect.width <= 10000 && node.rect.height <= 10000, 'FEEDBACK_LIBRARY_SVG_SIZE_INVALID');
      addSvgColors(node.svg);
      const paint = Object.fromEntries(['color', 'fill', 'fillOpacity', 'fillRule', 'stroke', 'strokeWidth', 'strokeOpacity', 'strokeLinecap', 'strokeLinejoin', 'strokeDasharray', 'strokeDashoffset', 'opacity'].map(key => [key, node.style[key] ?? null]));
      const paintHash = hash(paint), identity = { markup: node.svg, width: node.rect.width, height: node.rect.height, paintHash }, svgHash = hash(identity);
      if (!templates.has(svgHash)) { templates.set(svgHash, { svgHash, ...identity, paint, sources: [] }); svgBytes += node.svg.length; }
      templates.get(svgHash).sources.push({ captureId: capture.id, sourceId: node.id });
    }
    for (const mapping of Object.values(fontMapping)) {
      addFont(mapping);
      if (mapping.ranges !== undefined) { ensure(Array.isArray(mapping.ranges) && mapping.ranges.length <= 2000, 'FEEDBACK_LIBRARY_FONT_INVALID'); for (const range of mapping.ranges) addFont(range.fontName); }
    }
    sources.push({ captureId: capture.id, captureHash: hash(capture), fontMappingHash: hash(fontMapping), nodeCount: capture.nodes.length });
  }
  ensure(colors.size > 0 && colors.size <= 256 && templates.size <= 256 && svgBytes <= 8000000 && fonts.size <= 100, 'FEEDBACK_LIBRARY_PLAN_BUDGET');
  sources.sort((a, b) => a.captureId.localeCompare(b.captureId));
  for (const template of templates.values()) template.sources.sort((a, b) => a.captureId.localeCompare(b.captureId) || a.sourceId.localeCompare(b.sourceId));
  const body = { schemaVersion: 'feedback-fidelity-library-plan/2', privacy: { mockOnly: true, sourceValues: 'LOCAL_SYNTHETIC_ONLY' }, sources,
    palette: [...colors.values()].sort((a, b) => a.key.localeCompare(b.key)), svgTemplates: [...templates.values()].sort((a, b) => a.svgHash.localeCompare(b.svgHash)),
    requiredFonts: [...fonts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value), buttonTemplates: [],
    capabilities: { sourceRGBAPalette: true, sourceSVGComponents: true, simpleButtons: 'NOT IMPLEMENTED', existingUIIntegration: 'NOT IMPLEMENTED' },
  };
  return { ...body, planHash: hash(body) };
}

/** Self-contained public Plugin API operation; may be embedded with .toString().
 * Writes only its own new library and page-data namespace. Pending operations
 * stop for manual inspection; this API never clears pending state or deletes.
 */
export async function applyFeedbackLibraryPlan(figma, plan, options = {}) {
  const fail = code => { throw new Error(code); };
  const ensure = (condition, code) => { if (!condition) fail(code); };
  const plain = value => value && typeof value === 'object' && !Array.isArray(value);
  const copy = value => JSON.parse(JSON.stringify(value));
  const fontKey = font => JSON.stringify({ family: font.family, style: font.style });
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const safe = value => { if (typeof value === 'symbol') return 'FIGMA_MIXED'; if (Array.isArray(value)) return value.map(safe); if (plain(value)) return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, safe(entry)])); return value; };
  function sha256(text) {
    const bytes = [];
    for (const character of text) { const code = character.codePointAt(0); if (code < 128) bytes.push(code); else if (code < 2048) bytes.push(192 | code >> 6, 128 | code & 63); else if (code < 65536) bytes.push(224 | code >> 12, 128 | code >> 6 & 63, 128 | code & 63); else bytes.push(240 | code >> 18, 128 | code >> 12 & 63, 128 | code >> 6 & 63, 128 | code & 63); }
    const bitLength = bytes.length * 8; bytes.push(128); while (bytes.length % 64 !== 56) bytes.push(0);
    for (let index = 7; index >= 0; index--) bytes.push(index >= 4 ? 0 : Math.floor(bitLength / 2 ** (index * 8)) & 255);
    const constants = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    const state = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19], rotate = (word, count) => word >>> count | word << 32 - count;
    for (let begin = 0; begin < bytes.length; begin += 64) {
      const words = new Array(64);
      for (let index = 0; index < 16; index++) words[index] = (bytes[begin + index * 4] << 24 | bytes[begin + index * 4 + 1] << 16 | bytes[begin + index * 4 + 2] << 8 | bytes[begin + index * 4 + 3]) >>> 0;
      for (let index = 16; index < 64; index++) { const a = words[index - 15], b = words[index - 2]; words[index] = (words[index - 16] + (rotate(a, 7) ^ rotate(a, 18) ^ a >>> 3) + words[index - 7] + (rotate(b, 17) ^ rotate(b, 19) ^ b >>> 10)) >>> 0; }
      let [a,b,c,d,e,f,g,h] = state;
      for (let index = 0; index < 64; index++) { const first = (h + (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) + (e & f ^ ~e & g) + constants[index] + words[index]) >>> 0, second = ((rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) + (a & b ^ a & c ^ b & c)) >>> 0; h=g;g=f;f=e;e=(d+first)>>>0;d=c;c=b;b=a;a=(first+second)>>>0; }
      for (const [index, word] of [a,b,c,d,e,f,g,h].entries()) state[index] = (state[index] + word) >>> 0;
    }
    return state.map(word => word.toString(16).padStart(8, '0')).join('');
  }
  const { targetPageId, operationKey, mode = 'preflight', batchSize = 50 } = options;
  ensure(targetPageId === '23:2' && typeof operationKey === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(operationKey), 'FEEDBACK_LIBRARY_PAGE_SCOPE');
  ensure(['preflight', 'apply', 'audit'].includes(mode), 'FEEDBACK_LIBRARY_MODE_INVALID');
  ensure(Number.isInteger(batchSize) && batchSize > 0 && batchSize <= 50, 'FEEDBACK_LIBRARY_BATCH_INVALID');
  ensure(plain(plan) && plan.schemaVersion === 'feedback-fidelity-library-plan/2' && plan.privacy?.mockOnly === true && typeof plan.planHash === 'string' && /^[a-f\d]{64}$/.test(plan.planHash), 'FEEDBACK_LIBRARY_PLAN_INVALID');
  const { planHash, ...body } = plan;
  ensure(JSON.stringify(body).length <= 12000000 && sha256(JSON.stringify(body)) === planHash, 'FEEDBACK_LIBRARY_PLAN_HASH');
  ensure(Array.isArray(plan.palette) && plan.palette.length > 0 && plan.palette.length <= 256 && Array.isArray(plan.svgTemplates) && plan.svgTemplates.length <= 256 && Array.isArray(plan.requiredFonts) && plan.requiredFonts.length <= 100 && Array.isArray(plan.buttonTemplates) && !plan.buttonTemplates.length, 'FEEDBACK_LIBRARY_PLAN_INVALID');
  const hexFor = color => `#${['r', 'g', 'b'].map(key => Math.round(color[key] * 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  ensure(Array.isArray(plan.sources) && plan.sources.length > 0 && plan.sources.length <= 64 && plan.sources.every(value => typeof value.captureId === 'string' && value.captureId && value.captureId.length <= 200), 'FEEDBACK_LIBRARY_SOURCE_METADATA');
  const sourceCaptureIds = new Set(plan.sources.map(value => value.captureId));
  const paletteByKey = new Map(), svgByHash = new Map(), sourceHashes = new Map();
  for (const color of plan.palette) {
    ensure(plain(color) && /^#[A-F\d]{6}$/.test(color.hex) && Number.isFinite(color.alpha) && color.alpha >= 0 && color.alpha <= 1 && color.key === `${color.hex}@${color.alpha}` && color.name === `rgba/${color.hex.slice(1)}/a_${String(color.alpha).replaceAll('.','_')}` && plain(color.value) && ['r', 'g', 'b'].every(key => Number.isFinite(color.value[key]) && color.value[key] >= 0 && color.value[key] <= 1) && color.value.a === color.alpha && hexFor(color.value) === color.hex && !paletteByKey.has(color.key), 'FEEDBACK_LIBRARY_COLOR_INVALID');
    paletteByKey.set(color.key, color);
  }
  for (const template of plan.svgTemplates) {
    const markup = template.markup;
    ensure(typeof markup === 'string' && markup.length > 0 && markup.length <= 2000000 && /^\s*<svg\b/i.test(markup) && !/<(?:script|foreignObject)\b|<!DOCTYPE|<!ENTITY|\son[a-z]+\s*=|@import/i.test(markup), 'FEEDBACK_LIBRARY_UNSAFE_SVG');
    for (const match of markup.matchAll(/(?:href|xlink:href)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi)) ensure(/^["'](?:#[^"']+|data:image\/(?:png|jpeg|webp|gif);base64,[^"']+)["']$/i.test(match[1]), 'FEEDBACK_LIBRARY_UNSAFE_SVG');
    for (const match of markup.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)) ensure(/^#[^\s"')]+$/.test(match[2]), 'FEEDBACK_LIBRARY_UNSAFE_SVG');
    ensure(Number.isFinite(template.width) && template.width > 0 && template.width <= 10000 && Number.isFinite(template.height) && template.height > 0 && template.height <= 10000 && plain(template.paint) && sha256(JSON.stringify(template.paint)) === template.paintHash
      && sha256(JSON.stringify({ markup, width: template.width, height: template.height, paintHash: template.paintHash })) === template.svgHash && !svgByHash.has(template.svgHash), 'FEEDBACK_LIBRARY_SVG_HASH');
    ensure(Array.isArray(template.sources) && template.sources.length > 0 && template.sources.length <= 100000, 'FEEDBACK_LIBRARY_SOURCE_METADATA');
    for (const source of template.sources) {
      ensure(plain(source) && sourceCaptureIds.has(source.captureId) && typeof source.sourceId === 'string' && source.sourceId && source.sourceId.length <= 200, 'FEEDBACK_LIBRARY_SOURCE_METADATA');
      if (!sourceHashes.has(source.captureId)) sourceHashes.set(source.captureId, new Map());
      const mapping = sourceHashes.get(source.captureId); ensure(!mapping.has(source.sourceId), 'FEEDBACK_LIBRARY_SOURCE_REFERENCE_CONFLICT'); mapping.set(source.sourceId, template.svgHash);
    }
    svgByHash.set(template.svgHash, template);
  }
  const requiredFonts = new Map();
  for (const font of plan.requiredFonts) { ensure(plain(font) && typeof font.family === 'string' && font.family && font.family.length <= 100 && typeof font.style === 'string' && font.style && font.style.length <= 100, 'FEEDBACK_LIBRARY_FONT_INVALID'); requiredFonts.set(fontKey(font), font); }
  ensure(figma?.editorType === undefined || figma.editorType === 'figma', 'FEEDBACK_LIBRARY_EDITOR_UNSUPPORTED');
  ensure(typeof figma.getNodeByIdAsync === 'function' && typeof figma.setCurrentPageAsync === 'function' && typeof figma.createFrame === 'function' && typeof figma.createComponent === 'function' && typeof figma.createNodeFromSvg === 'function'
    && typeof figma.variables?.getLocalVariableCollectionsAsync === 'function' && typeof figma.variables.getLocalVariablesAsync === 'function' && typeof figma.variables.createVariableCollection === 'function' && typeof figma.variables.createVariable === 'function' && typeof figma.variables.setBoundVariableForPaint === 'function'
    && typeof figma.listAvailableFontsAsync === 'function' && typeof figma.loadFontAsync === 'function', 'FEEDBACK_LIBRARY_PUBLIC_API_UNSUPPORTED');
  const page = await figma.getNodeByIdAsync(targetPageId);
  ensure(page?.type === 'PAGE' && figma.root.children.some(value => value.id === targetPageId), 'FEEDBACK_LIBRARY_PAGE_SCOPE');
  await figma.setCurrentPageAsync(page);
  const guard = () => ensure(figma.currentPage?.id === targetPageId, 'FEEDBACK_LIBRARY_PAGE_CHANGED'); guard();
  const localCollections = await figma.variables.getLocalVariableCollectionsAsync(); guard();
  const localVariables = await figma.variables.getLocalVariablesAsync(); guard();
  const collections = new Map(localCollections.map(value => [value.id, value])), variables = new Map(localVariables.map(value => [value.id, value]));
  const prefix = `feedback_fidelity_library_v2__${operationKey}__`, namespace = `Feedback Fidelity Library/${operationKey}`, units = [{ kind: 'root' }, { kind: 'collection' }, ...plan.palette.map(value => ({ kind: 'color', value })), ...plan.svgTemplates.map(value => ({ kind: 'svg', value }))];
  const createdNodeIds = [], mutatedNodeIds = new Set(), createdResourceIds = [], mutatedResourceIds = new Set();
  const nodeCache = new Map();
  async function getNode(id) { if (nodeCache.has(id)) return nodeCache.get(id); const node = await figma.getNodeByIdAsync(id); guard(); if (node) nodeCache.set(id, node); return node; }
  let ledger = null, pendingIntent = null;
  try {
    const intent = page.getPluginData(`${prefix}intent`), headerText = page.getPluginData(`${prefix}header`);
    if (intent) { pendingIntent = JSON.parse(intent); ensure(pendingIntent.operationKey === operationKey && pendingIntent.targetPageId === targetPageId && pendingIntent.planHash === planHash, 'FEEDBACK_LIBRARY_PENDING_SCOPE'); }
    if (headerText) {
      const header = JSON.parse(headerText); ensure(Number.isInteger(header.chunks) && header.chunks > 0 && header.chunks <= 256 && header.operationKey === operationKey && header.targetPageId === targetPageId && header.planHash === planHash, 'FEEDBACK_LIBRARY_LEDGER_HEADER');
      let data = ''; for (let index = 0; index < header.chunks; index++) { const chunk = page.getPluginData(`${prefix}chunk_${index}`); ensure(chunk && chunk.length <= 16000, 'FEEDBACK_LIBRARY_LEDGER_CHUNK'); data += chunk; }
      ensure(sha256(data) === header.hash, 'FEEDBACK_LIBRARY_LEDGER_HASH'); ledger = JSON.parse(data);
      ensure(ledger.schemaVersion === 'feedback-fidelity-library-ledger/2' && ledger.planHash === planHash && ledger.operationKey === operationKey && ledger.targetPageId === targetPageId && ledger.totalUnits === units.length && Number.isInteger(ledger.cursor) && ledger.cursor >= 0 && ledger.cursor <= units.length && Array.isArray(ledger.entries) && plain(ledger.palette) && plain(ledger.svgComponents), 'FEEDBACK_LIBRARY_LEDGER_SCOPE');
    }
  } catch (error) { if (/^FEEDBACK_LIBRARY_/.test(error.message)) throw error; fail('FEEDBACK_LIBRARY_LEDGER_UNREADABLE'); }
  const owner = { operationKey, targetPageId, planHash, namespace };
  const refs = () => ({ schemaVersion: 'feedback-fidelity-library-refs/2', libraryOperationKey: operationKey, planHash, targetPageId, namespace, complete: ledger?.complete ?? false, collectionId: ledger?.collectionId ?? null, rootNodeId: ledger?.rootNodeId ?? null,
    palette: copy(ledger?.palette ?? {}), svgComponents: copy(ledger?.svgComponents ?? {}),
    sourceSvgHashes: Object.fromEntries([...sourceHashes].map(([captureId, values]) => [captureId, Object.fromEntries([...values].filter(([, svgHash]) => ledger?.svgComponents[svgHash]))])), buttons: {}, owner: copy(owner) });
  const response = (status, extra = {}) => ({ status, operationKey, targetPageId, planHash, cursor: ledger?.cursor ?? 0, totalUnits: units.length, complete: ledger?.complete ?? false, pending: !!pendingIntent || !!ledger?.pending,
    refs: refs(), createdNodeIds: [...createdNodeIds], mutatedNodeIds: [...mutatedNodeIds], createdResourceIds: [...createdResourceIds], mutatedResourceIds: [...mutatedResourceIds],
    ownedNodeIds: (ledger?.entries ?? []).map(value => value.id), ownedResourceIds: ledger ? [ledger.collectionId, ...Object.values(ledger.palette)].filter(Boolean) : [],
    capabilities: copy(plan.capabilities), verification: { nativeReadback: 'NOT RUN', sourceVisual: 'NOT RUN', existingUIIntegration: 'NOT IMPLEMENTED' }, ...extra });
  function snapshot(node) {
    const value = { type: node.type, parentId: node.parent?.id ?? null };
    for (const field of ['name', 'x', 'y', 'width', 'height', 'opacity', 'fills', 'strokes', 'strokeWeight', 'strokeAlign', 'relativeTransform', 'clipsContent', 'layoutMode', 'primaryAxisSizingMode', 'counterAxisSizingMode', 'primaryAxisAlignItems', 'counterAxisAlignItems', 'itemSpacing', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom']) if (field in node) value[field] = safe(node[field]);
    if ('children' in node) value.children = node.children.map(child => child.id);
    if (node.type === 'VECTOR' && 'vectorPaths' in node) value.vectorPaths = safe(node.vectorPaths);
    if (node.type === 'TEXT') for (const field of ['characters', 'fontName', 'fontSize', 'lineHeight', 'letterSpacing']) if (field in node) value[field] = safe(node[field]);
    return value;
  }

  // Existing checkpoint evidence changes only through a checked synchronous append.
  // Async work must never turn unrelated edits into a new dirty-node baseline.
  const expectedNodes = new Map(), preparedImports = new Map();
  function checkExpected(ids = expectedNodes.keys()) {
    for (const id of ids) { const saved = expectedNodes.get(id); if (saved) ensure(same(saved.expected, snapshot(saved.node)), 'FEEDBACK_LIBRARY_CONCURRENT_NODE_DRIFT'); }
  }
  function rememberExpected(node, entry, expected = snapshot(node)) { expectedNodes.set(node.id, { node, entry, expected }); }
  function appendEvidence(parent, child) {
    for (const saved of preparedImports.get(child.id) ?? []) ensure(same(saved.expected, snapshot(saved.node)), 'FEEDBACK_LIBRARY_CONCURRENT_NODE_DRIFT');
    const oldParent = child.parent, nodes = new Map(), layoutIds = new Set();
    const include = node => { if (node && entries.has(node.id)) nodes.set(node.id, node); };
    include(parent); include(oldParent); include(child);
    for (const start of [parent, oldParent]) {
      let ancestor = start, steps = 0;
      while (ancestor && entries.has(ancestor.id)) {
        ensure(++steps <= 2000, 'FEEDBACK_LIBRARY_LAYOUT_DIRTY_BUDGET');
        if (ancestor.layoutMode && ancestor.layoutMode !== 'NONE') {
          const pending = [ancestor]; let visited = 0;
          while (pending.length) { const node = pending.pop(); ensure(++visited <= 10000, 'FEEDBACK_LIBRARY_LAYOUT_DIRTY_BUDGET'); if (!entries.has(node.id)) continue; include(node); layoutIds.add(node.id); if ('children' in node) pending.push(...node.children); }
        }
        ancestor = ancestor.parent;
      }
    }
    checkExpected(nodes.keys());
    return { parent, child, oldParent, nodes, layoutIds };
  }
  function acceptAppend(evidence) {
    const { parent, child, oldParent, nodes, layoutIds } = evidence;
    for (const [id, node] of nodes) {
      const saved = expectedNodes.get(id); if (!saved) continue;
      const expected = copy(saved.expected), actual = snapshot(node);
      if (id === child.id) expected.parentId = parent.id;
      if (id === parent.id || id === oldParent?.id) { expected.children = expected.children.filter(value => value !== child.id); if (id === parent.id) expected.children.push(child.id); }
      if (layoutIds.has(id)) for (const field of ['x', 'y', 'width', 'height', 'relativeTransform']) if (field in actual) expected[field] = actual[field];
      ensure(same(expected, actual), 'FEEDBACK_LIBRARY_CONCURRENT_NODE_DRIFT'); saved.expected = expected;
      snapshotDirty.add(id); mutatedNodeIds.add(id);
    }
    preparedImports.delete(child.id);
    return nodes;
  }
  async function audit() {
    const issues = [];
    if (!ledger) return [{ code: 'LEDGER_MISSING' }];
    if (pendingIntent || ledger.pending) issues.push({ code: 'PENDING_OPERATION' });
    for (const entry of ledger.entries) {
      const node = await getNode(entry.id);
      if (!node) { issues.push({ code: 'OWNED_NODE_MISSING', nodeId: entry.id }); continue; }
      let ancestor = node, steps = 0; while (ancestor.parent && ancestor.type !== 'PAGE' && steps++ < 2000) ancestor = ancestor.parent;
      if (ancestor.id !== targetPageId || node.getPluginData(`${prefix}operation`) !== operationKey || node.getPluginData(`${prefix}plan`) !== planHash) issues.push({ code: 'OWNED_NODE_SCOPE', nodeId: entry.id });
      if (!entry.snapshot || !same(entry.snapshot, snapshot(node))) issues.push({ code: 'OWNED_NODE_DRIFT', nodeId: entry.id });
    }
    const collection = collections.get(ledger.collectionId);
    if (ledger.collectionId && (!collection || collection.name !== `${namespace}/Colors` || collection.defaultModeId !== ledger.modeId || !same([...(collection.variableIds ?? [])].sort(), Object.values(ledger.palette).sort()))) issues.push({ code: 'COLLECTION_DRIFT', resourceId: ledger.collectionId });
    for (const [key, id] of Object.entries(ledger.palette)) {
      const variable = variables.get(id), expected = paletteByKey.get(key);
      const actual = variable?.valuesByMode?.[ledger.modeId];
      if (!expected || !variable || variable.variableCollectionId !== ledger.collectionId || variable.name !== expected.name || variable.resolvedType !== 'COLOR' || variable.scopes?.length !== 2 || !['ALL_FILLS', 'STROKE_COLOR'].every(scope => variable.scopes.includes(scope)) || !plain(actual) || !['r', 'g', 'b', 'a'].every(key => Number.isFinite(actual[key]) && Math.abs(actual[key] - expected.value[key]) <= 0.000001)) issues.push({ code: 'VARIABLE_DRIFT', resourceId: id });
    }
    for (const [svgHash, reference] of Object.entries(ledger.svgComponents)) {
      const template = svgByHash.get(svgHash), component = await getNode(reference.componentId);
      if (!template || component?.type !== 'COMPONENT' || typeof component.createInstance !== 'function' || Math.abs(component.width - template.width) > 0.001 || Math.abs(component.height - template.height) > 0.001) issues.push({ code: 'COMPONENT_DRIFT', nodeId: reference.componentId });
    }
    return issues;
  }
  if (mode === 'audit') { const issues = await audit(); return response('AUDITED', { issues, verification: { nativeReadback: issues.length ? 'FAIL' : 'PASS', sourceVisual: 'NOT RUN', existingUIIntegration: 'NOT IMPLEMENTED' } }); }
  if (pendingIntent || ledger?.pending) return response('STOPPED_PENDING', { errorCode: 'FEEDBACK_LIBRARY_PENDING_INSPECTION_REQUIRED' });
  if (!ledger) ensure(!localCollections.some(value => value.name === `${namespace}/Colors`) && !page.children.some(value => value.name === `${namespace}/Components`), 'FEEDBACK_LIBRARY_NAMESPACE_COLLISION');
  if (ledger) { const issues = await audit(); ensure(!issues.length, 'FEEDBACK_LIBRARY_READBACK_DRIFT'); for (const entry of ledger.entries) rememberExpected(nodeCache.get(entry.id), entry, copy(entry.snapshot)); checkExpected(); }
  const available = new Set((await figma.listAvailableFontsAsync()).map(value => fontKey(value.fontName))); guard(); checkExpected();
  for (const key of requiredFonts.keys()) ensure(available.has(key), 'FEEDBACK_LIBRARY_FONT_NOT_AVAILABLE');
  if (mode === 'preflight') return response('PREFLIGHT', { requiredFonts: [...requiredFonts.values()], paletteCount: plan.palette.length, svgComponentCount: plan.svgTemplates.length });
  if (ledger?.complete) return response('ALREADY_COMPLETE');
  for (const font of requiredFonts.values()) { await figma.loadFontAsync(font); guard(); checkExpected(); }
  ledger ??= { schemaVersion: 'feedback-fidelity-library-ledger/2', operationKey, targetPageId, planHash, totalUnits: units.length, cursor: 0, complete: false, pending: false, rootNodeId: null, collectionId: null, modeId: null, palette: {}, svgComponents: {}, entries: [] };
  const entries = new Map(ledger.entries.map(value => [value.id, value])), snapshotDirty = new Set();
  function setData(node, key, value) { guard(); node.setPluginData(key, value); mutatedNodeIds.add(node.id); if (entries.has(node.id)) snapshotDirty.add(node.id); }
  function persist() {
    guard(); checkExpected(mutatedNodeIds); const serialized = JSON.stringify(ledger); ensure(serialized.length <= 4096000, 'FEEDBACK_LIBRARY_LEDGER_BUDGET'); const chunks = Math.ceil(serialized.length / 16000);
    for (let index = 0; index < chunks; index++) setData(page, `${prefix}chunk_${index}`, serialized.slice(index * 16000, (index + 1) * 16000));
    setData(page, `${prefix}header`, JSON.stringify({ chunks, hash: sha256(serialized), operationKey, targetPageId, planHash }));
  }
  function intent(stage) { ledger.pending = true; pendingIntent = { operationKey, targetPageId, planHash, cursor: ledger.cursor, stage }; setData(page, `${prefix}intent`, JSON.stringify(pendingIntent)); }
  async function ownTree(node, role) {
    const tree = [], pending = [node], seen = new Set();
    while (pending.length) { const value = pending.pop(); ensure(!seen.has(value.id), 'FEEDBACK_LIBRARY_IMPORTED_CYCLE'); seen.add(value.id); tree.push(value); if ('children' in value) pending.push(...value.children); }
    for (const value of tree) { nodeCache.set(value.id, value); if (!entries.has(value.id)) { const entry = { id: value.id, role, snapshot: null }; ledger.entries.push(entry); entries.set(value.id, entry); createdNodeIds.push(value.id); snapshotDirty.add(value.id); } }
    persist(); ensure(tree.length <= 2000 && entries.size <= 10000, 'FEEDBACK_LIBRARY_NODE_BUDGET');
    const beforeFonts = tree.map(value => ({ node: value, expected: snapshot(value) }));
    for (const value of tree) if (value.type === 'TEXT') {
      const fonts = typeof value.getStyledTextSegments === 'function' ? value.getStyledTextSegments(['fontName']).map(segment => segment.fontName) : [value.fontName];
      for (const font of fonts) { ensure(available.has(fontKey(font)), 'FEEDBACK_LIBRARY_IMPORTED_FONT_NOT_AVAILABLE'); await figma.loadFontAsync(font); guard(); }
    }
    checkExpected(mutatedNodeIds); for (const saved of beforeFonts) ensure(same(saved.expected, snapshot(saved.node)), 'FEEDBACK_LIBRARY_CONCURRENT_NODE_DRIFT');
    for (const value of tree) { setData(value, `${prefix}operation`, operationKey); setData(value, `${prefix}plan`, planHash); }
    preparedImports.set(node.id, beforeFonts.filter(saved => saved.node.id !== node.id));
    return tree;
  }
  function append(parent, child) {
    guard(); ensure(parent.id === page.id || entries.has(parent.id), 'FEEDBACK_LIBRARY_PARENT_SCOPE');
    if (child.parent) { ensure(child.parent.id === page.id || entries.has(child.parent.id), 'FEEDBACK_LIBRARY_PARENT_SCOPE'); mutatedNodeIds.add(child.parent.id); }
    const evidence = appendEvidence(parent, child);
    parent.appendChild(child); acceptAppend(evidence); mutatedNodeIds.add(parent.id); mutatedNodeIds.add(child.id);
    if (entries.has(parent.id)) snapshotDirty.add(parent.id); if (entries.has(child.id)) snapshotDirty.add(child.id);
  }
  async function updateSnapshots() {
    // Resolve/check first; never partially replace checkpoint evidence across awaits.
    const updates = [];
    for (const id of snapshotDirty) if (!expectedNodes.has(id)) rememberExpected(nodeCache.get(id), entries.get(id));
    for (const id of snapshotDirty) { const node = await getNode(id); guard(); checkExpected([id]); ensure(node, 'FEEDBACK_LIBRARY_OWNED_NODE_MISSING'); updates.push({ node, entry: entries.get(id), value: snapshot(node) }); }
    checkExpected(mutatedNodeIds);
    for (const { node, entry, value } of updates) { entry.snapshot = value; rememberExpected(node, entry, value); }
    snapshotDirty.clear();
  }
  const normalizeSvg = template => {
    const opening = /<svg\b[^>]*>/i.exec(template.markup); ensure(opening, 'FEEDBACK_LIBRARY_SVG_ROOT'); let tag = opening[0];
    const attribute = name => new RegExp(`\\s${name}\\s*=\\s*(["'])(.*?)\\1`, 'i').exec(tag)?.[2];
    if (!attribute('viewBox')) { const width = parseFloat(attribute('width')), height = parseFloat(attribute('height')); ensure(width > 0 && height > 0, 'FEEDBACK_LIBRARY_SVG_COORDINATES'); tag = tag.replace(/>$/, ` viewBox="0 0 ${width} ${height}">`); }
    for (const [name, value] of [['width', template.width], ['height', template.height]]) { const expression = new RegExp(`\\s${name}\\s*=\\s*(["']).*?\\1`, 'i'); tag = expression.test(tag) ? tag.replace(expression, ` ${name}="${value}"`) : tag.replace(/>$/, ` ${name}="${value}">`); }
    return template.markup.replace(opening[0], tag);
  };
  function variableForPaint(paint) {
    const alpha = paint.opacity ?? 1;
    ensure(plain(paint.color) && ['r','g','b'].every(key=>Number.isFinite(paint.color[key])&&paint.color[key]>=0&&paint.color[key]<=1) && Number.isFinite(alpha) && alpha>=0 && alpha<=1, 'FEEDBACK_LIBRARY_SOURCE_RGBA_INVALID');
    const hex=hexFor(paint.color), exact=paletteByKey.get(`${hex}@${alpha}`);
    const matches=[...paletteByKey.values()].filter(value=>value.hex===hex&&['r','g','b'].every(key=>Math.abs(value.value[key]-paint.color[key])<=0.000001)&&Math.abs(value.alpha-alpha)<=0.000001).sort((a,b)=>Math.abs(a.alpha-alpha)-Math.abs(b.alpha-alpha));
    const selected=exact&&matches.includes(exact)?exact:matches[0];
    ensure(selected,'FEEDBACK_LIBRARY_RGBA_VARIABLE_MISSING');
    if(!exact&&matches.length>1)ensure(Math.abs(Math.abs(matches[0].alpha-alpha)-Math.abs(matches[1].alpha-alpha))>0.000000000001,'FEEDBACK_LIBRARY_RGBA_MATCH_AMBIGUOUS');
    const variable=variables.get(ledger.palette[selected.key]);ensure(variable,'FEEDBACK_LIBRARY_RGBA_VARIABLE_MISSING');return variable;
  }
  let uncertainCreate = false;
  try {
    const end = Math.min(units.length, ledger.cursor + batchSize);
    while (ledger.cursor < end) {
      const unit = units[ledger.cursor]; intent(`CREATE_${unit.kind.toUpperCase()}`); guard();
      if (unit.kind === 'root') {
        const right = Math.max(0, ...page.children.map(node => { const bounds = node.absoluteBoundingBox ?? node; return Number.isFinite(bounds.x) && Number.isFinite(bounds.width) ? bounds.x + bounds.width : 0; }));
        uncertainCreate = true; const node = figma.createFrame(); uncertainCreate = false; ledger.rootNodeId = node.id; await ownTree(node, 'library-root');
        node.name = `${namespace}/Components`; node.fills = []; node.strokes = []; node.clipsContent = false; node.resize(1, 1); node.x = right + 200; node.y = 0;
        node.layoutMode = 'HORIZONTAL'; node.primaryAxisSizingMode = 'AUTO'; node.counterAxisSizingMode = 'AUTO'; node.primaryAxisAlignItems = 'MIN'; node.counterAxisAlignItems = 'MIN'; node.paddingLeft = 24; node.paddingRight = 24; node.paddingTop = 24; node.paddingBottom = 24; node.itemSpacing = 24;
      } else if (unit.kind === 'collection') {
        uncertainCreate = true; const collection = figma.variables.createVariableCollection(`${namespace}/Colors`); uncertainCreate = false;
        createdResourceIds.push(collection.id); mutatedResourceIds.add(collection.id); collections.set(collection.id, collection); ledger.collectionId = collection.id; ledger.modeId = collection.defaultModeId;
        ensure(typeof ledger.modeId === 'string' && ledger.modeId, 'FEEDBACK_LIBRARY_COLLECTION_MODE');
      } else if (unit.kind === 'color') {
        const collection = collections.get(ledger.collectionId); ensure(collection, 'FEEDBACK_LIBRARY_COLLECTION_MISSING');
        uncertainCreate = true; const variable = figma.variables.createVariable(unit.value.name, collection, 'COLOR'); uncertainCreate = false;
        createdResourceIds.push(variable.id); mutatedResourceIds.add(variable.id); mutatedResourceIds.add(collection.id); variables.set(variable.id, variable); ledger.palette[unit.value.key] = variable.id;
        variable.scopes = ['ALL_FILLS', 'STROKE_COLOR']; variable.setValueForMode(ledger.modeId, copy(unit.value.value));
        if (typeof variable.setVariableCodeSyntax === 'function') variable.setVariableCodeSyntax('WEB', `var(--feedback-source-rgba-${unit.value.hex.slice(1).toLowerCase()}-a-${String(unit.value.alpha).replaceAll('.','_')})`);
      } else {
        const template = unit.value, root = await getNode(ledger.rootNodeId); guard(); ensure(root && entries.has(root.id), 'FEEDBACK_LIBRARY_ROOT_MISSING');
        uncertainCreate = true; const component = figma.createComponent(); uncertainCreate = false; await ownTree(component, `component/${template.svgHash}`);
        ensure(component.type === 'COMPONENT' && typeof component.createInstance === 'function', 'FEEDBACK_LIBRARY_REAL_COMPONENT_REQUIRED');
        component.name = `${namespace}/SVG/${template.svgHash}`; component.description = `Source SVG ${template.svgHash}; measured ${template.width} × ${template.height}. Complete source markup; bound RGBA colours retain the source paint alpha; layer opacity remains independent.`;
        component.fills = []; component.strokes = []; component.clipsContent = false; component.resize(template.width, template.height); append(root, component);
        uncertainCreate = true; const svg = figma.createNodeFromSvg(normalizeSvg(template)); uncertainCreate = false; const tree = await ownTree(svg, `svg/${template.svgHash}`);
        append(component, svg); svg.x = 0; svg.y = 0;
        ensure(Math.abs(svg.width - template.width) <= 0.25 && Math.abs(svg.height - template.height) <= 0.25, 'FEEDBACK_LIBRARY_SVG_NATIVE_SIZE');
        let boundPaintCount = 0, unboundPaintCount = 0;
        for (const node of tree) for (const field of ['fills', 'strokes']) {
          if (!(field in node) || !Array.isArray(node[field])) continue;
          const paints = [], originals=copy(node[field]), expectedBindings=[];
          for (const paint of originals) {
            if (paint.type !== 'SOLID') { paints.push(paint); expectedBindings.push(null); continue; }
            const variable = variableForPaint(paint);
            guard(); const bound = figma.variables.setBoundVariableForPaint(copy(paint), 'color', variable);
            paints.push(bound); expectedBindings.push(variable.id); boundPaintCount++;
          }
          node[field] = paints; mutatedNodeIds.add(node.id);
          // Figma resolves COLOR alias alpha during assignment. The returned
          // paint can retain its old opacity while the actual getter differs.
          const actual=node[field];ensure(Array.isArray(actual)&&actual.length===originals.length,'FEEDBACK_LIBRARY_PAINT_READBACK');
          for(let index=0;index<originals.length;index++)if(expectedBindings[index]){
            const source=originals[index],resolved=actual[index];
            ensure(resolved?.type==='SOLID'&&resolved.boundVariables?.color?.id===expectedBindings[index]&&['r','g','b'].every(key=>Number.isFinite(resolved.color?.[key])&&Math.abs(resolved.color[key]-source.color[key])<=0.000001)&&Number.isFinite(resolved.opacity??1)&&Math.abs((resolved.opacity??1)-(source.opacity??1))<=0.000001,'FEEDBACK_LIBRARY_PAINT_READBACK');
          }
        }
        ledger.svgComponents[template.svgHash] = { componentId: component.id, width: template.width, height: template.height, paintHash: template.paintHash, owner: copy(owner), sourceSvgNodeId: svg.id, descendantNodeIds: tree.map(node => node.id), boundPaintCount, unboundPaintCount };
      }
      await updateSnapshots(); checkExpected(mutatedNodeIds); ledger.cursor++; ledger.complete = ledger.cursor === units.length; ledger.pending = false; persist(); setData(page, `${prefix}intent`, ''); pendingIntent = null;
    }
    return response(ledger.complete ? 'COMPLETE' : 'APPLIED_BATCH');
  } catch (error) {
    ledger.pending = true; let ledgerPersisted = false; try { persist(); ledgerPersisted = true; } catch { /* Pending intent remains; never retry without inspection. */ }
    return response('STOPPED_PENDING', { errorCode: /^FEEDBACK_LIBRARY_[A-Z_]+$/.test(error?.message ?? '') ? error.message : 'FEEDBACK_LIBRARY_OPERATION_FAILED', failedStage: pendingIntent?.stage ?? 'UNKNOWN', unknownCreatedObjectsPossible: uncertainCreate, ledgerPersisted });
  }
}
