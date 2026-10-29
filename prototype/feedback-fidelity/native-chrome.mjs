import { createHash } from 'node:crypto';

const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const copy = value => JSON.parse(JSON.stringify(value));
const ensure = (condition, code) => { if (!condition) throw new Error(`FEEDBACK_CHROME_${code}`); };
const rectOK = rect => rect && ['x', 'y', 'width', 'height'].every(key => Number.isFinite(rect[key])) && rect.width > 0 && rect.height > 0;
const contains = (outer, inner) => inner.x >= outer.x - .001 && inner.y >= outer.y - .001 && inner.x + inner.width <= outer.x + outer.width + .001 && inner.y + inner.height <= outer.y + outer.height + .001;
const intersect = (a, b) => { const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y), right = Math.min(a.x + a.width, b.x + b.width), bottom = Math.min(a.y + a.height, b.y + b.height); return right > x && bottom > y ? { x, y, width: right - x, height: bottom - y } : null; };
const stablePartId = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value);
const roiPixels = (image, roi) => { const pixels = []; for (let y = 0; y < roi.height; y++) { const offset = ((y + roi.y) * image.width + roi.x) * 4; pixels.push(...image.pixelsRGBA.slice(offset, offset + roi.width * 4)); } return pixels; };
const color = value => { const found = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/.exec(value ?? ''); return found ? [+found[1], +found[2], +found[3], found[4] === undefined ? 1 : +found[4]] : null; };
function laterShadowTouches(node, roi) {
  const value = node.style?.boxShadow; if (!value || value === 'none') return false;
  const parts = []; let depth = 0, start = 0;
  for (let index = 0; index < value.length; index++) { if (value[index] === '(') depth++; if (value[index] === ')') depth--; if (value[index] === ',' && !depth) { parts.push(value.slice(start, index)); start = index + 1; } } parts.push(value.slice(start));
  return parts.some(part => {
    const match = /rgba?\([^)]*\)/.exec(part), paint = color(match?.[0]); if (paint?.[3] === 0) return false;
    ensure(paint, 'SHADOW_EVIDENCE_UNSUPPORTED'); const lengths = part.replace(match[0], '').replace(/\binset\b/, '').trim().split(/\s+/).map(Number.parseFloat);
    ensure(lengths.length >= 2 && lengths.length <= 4 && lengths.every(Number.isFinite), 'SHADOW_EVIDENCE_UNSUPPORTED');
    const [x, y, blur = 0, spread = 0] = lengths, extent = Math.max(0, blur * 1.5 + spread + 1);
    const bounds = /\binset\b/.test(part) ? node.rect : { x: node.rect.x + x - extent, y: node.rect.y + y - extent, width: node.rect.width + extent * 2, height: node.rect.height + extent * 2 };
    let area = intersect(bounds, roi); for (const clip of node.clips ?? []) area = area && intersect(area, clip.rect);
    return !!area;
  });
}

/** Reconstruct only explicitly identified, narrow, screenshot-proven UA chrome.
 * pixelsRGBA is decoded locally by the caller after checking the frozen PNG hash.
 * It is discarded from the plan; no text, page screenshot or image fill is imported.
 */
export function buildFeedbackNativeChromePlan({ capture, image, native, regions }) {
  ensure(capture?.schemaVersion === 'feedback-fidelity-capture/1' && capture.privacy?.mockOnly === true && capture.privacy.authenticatedCapture === false && capture.privacy.credentialsRead === false && Array.isArray(capture.nodes) && capture.nodes.length <= 20000 && capture.unsupported?.length === 0, 'CAPTURE_NOT_FROZEN_MOCK');
  ensure(image && /^[a-f0-9]{64}$/.test(image.sha256) && image.width === capture.viewport.width && image.height === capture.viewport.height && capture.viewport.dpr === 1 && image.pixelsRGBA?.length === image.width * image.height * 4, 'IMAGE_INVALID');
  ensure(native && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(native.operationKey) && typeof native.rootNodeId === 'string' && native.rootNodeId && native.specHash === hash(capture) && (native.expectedLedgerHash == null || /^[a-f0-9]{64}$/.test(native.expectedLedgerHash)), 'NATIVE_SCOPE_INVALID');
  ensure(Array.isArray(regions) && regions.length <= 8, 'REGIONS_INVALID');
  const sources = new Map(capture.nodes.map(node => [node.id, node])), viewport = { x: 0, y: 0, width: image.width, height: image.height }, planned = [], partsBySourceKind = new Map();
  let totalArea = 0, totalRectangles = 0;
  const buildShadowWitness = (requested, source, roi) => {
    const witness = requested.shadowWitness;
    ensure(witness && witness.capture && witness.image && typeof witness.sourceId === 'string' && witness.roi, witness ? 'SHADOW_WITNESS_INVALID' : 'LATER_SHADOW_TOUCHES_ROI');
    const witnessCapture = witness.capture, witnessImage = witness.image, witnessSource = witnessCapture.nodes?.find(node => node.id === witness.sourceId);
    ensure(typeof witnessCapture.rootId === 'string' && witnessCapture.privacy?.mockOnly === true && witnessCapture.privacy.authenticatedCapture === false && witnessCapture.privacy.credentialsRead === false && witnessSource && /^[a-f0-9]{64}$/.test(witnessImage.sha256) && witnessImage.width === image.width && witnessImage.height === image.height && witnessImage.pixelsRGBA?.length === image.pixelsRGBA.length && JSON.stringify(witness.roi) === JSON.stringify(roi) && contains({ x: 0, y: 0, width: witnessImage.width, height: witnessImage.height }, witness.roi), 'SHADOW_WITNESS_INVALID');
    ensure(witnessSource.tag === source.tag && JSON.stringify(witnessSource.rect) === JSON.stringify(source.rect) && JSON.stringify(witnessSource.scroll ?? null) === JSON.stringify(source.scroll ?? null) && ['overflow', 'overflowX', 'overflowY'].every(key => (witnessSource.style?.[key] ?? null) === (source.style?.[key] ?? null)), 'SHADOW_WITNESS_SOURCE_MISMATCH');
    const targetPixels = roiPixels(image, roi), witnessPixels = roiPixels(witnessImage, roi);
    ensure(targetPixels.length === witnessPixels.length && targetPixels.every((value, index) => value === witnessPixels[index]), 'SHADOW_WITNESS_PIXEL_MISMATCH');
    const referencePlan = buildFeedbackNativeChromePlan({ capture: witnessCapture, image: witnessImage, native: { operationKey: 'shadow-witness', rootNodeId: witnessCapture.rootId, specHash: hash(witnessCapture), expectedLedgerHash: null }, regions: [{ sourceId: witness.sourceId, kind: requested.kind, ...(requested.partId === undefined ? {} : { partId: requested.partId }), roi: copy(roi) }] });
    return { method: 'FROZEN_UNMASKED_SHADOW_EXTENT_WITNESS', captureSHA256: hash(witnessCapture), sourceImageSHA256: witnessImage.sha256, witnessCaptureSHA256: hash(witnessCapture), witnessImageSHA256: witnessImage.sha256, sourceId: witness.sourceId, roiHash: null, referencePlanHash: referencePlan.planHash };
  };
  for (const requested of regions) {
    const source = sources.get(requested.sourceId), roi = requested.roi;
    ensure(source && source.kind === 'element' && source.id !== capture.rootId && rectOK(roi) && ['x', 'y', 'width', 'height'].every(key => Number.isInteger(roi[key])) && contains(viewport, roi) && contains(source.rect, roi), 'ROI_SCOPE_INVALID');
    ensure(['vertical-scrollbar', 'horizontal-scrollbar', 'textarea-resize'].includes(requested.kind), 'KIND_INVALID');
    const sourceKind = source.id + '/' + requested.kind, priorParts = partsBySourceKind.get(sourceKind) ?? [];
    if (priorParts.length && requested.partId === undefined) ensure(false, 'ROI_SCOPE_INVALID');
    if (priorParts.length || requested.partId !== undefined) {
      ensure(stablePartId(requested.partId), 'PART_ID_REQUIRED');
      ensure(priorParts.every(part => stablePartId(part.partId)), 'PART_ID_REQUIRED');
      ensure(!priorParts.some(part => part.partId === requested.partId), 'PART_ID_DUPLICATE');
      ensure(!priorParts.some(part => intersect(part.roi, roi)), 'ROI_PART_OVERLAP');
    }
    priorParts.push({ partId: requested.partId, roi: copy(roi) }); partsBySourceKind.set(sourceKind, priorParts);
    let clientRect = null;
    if (requested.kind === 'textarea-resize') ensure(source.tag === 'textarea' && roi.width <= 16 && roi.height <= 16 && roi.x >= source.rect.x + source.rect.width - 16 && roi.y >= source.rect.y + source.rect.height - 16, 'RESIZE_ROI_INVALID');
    else {
      const clips = capture.nodes.flatMap(node => node.clips ?? []).filter(clip => clip.ownerId === source.id && clip.kind === 'CSS_OVERFLOW_CLIENT_BOX');
      const unique = [...new Map(clips.map(clip => [JSON.stringify(clip.rect), clip.rect])).values()];
      ensure(unique.length === 1 && rectOK(unique[0]), 'CLIENT_RECT_NOT_PROVEN'); clientRect = unique[0];
      const vertical = requested.kind === 'vertical-scrollbar', gutter = vertical ? { x: clientRect.x + clientRect.width, y: source.rect.y, width: source.rect.x + source.rect.width - clientRect.x - clientRect.width, height: source.rect.height } : { x: source.rect.x, y: clientRect.y + clientRect.height, width: source.rect.width, height: source.rect.y + source.rect.height - clientRect.y - clientRect.height };
      ensure(rectOK(gutter) && (vertical ? gutter.width <= 17 && roi.width <= 17 && source.scroll?.height > clientRect.height : gutter.height <= 17 && roi.height <= 17 && source.scroll?.width > clientRect.width) && /^(auto|scroll)$/.test(source.style[vertical ? 'overflowY' : 'overflowX']) && contains(gutter, roi), 'SCROLLBAR_GUTTER_NOT_PROVEN');
    }
    for (const clip of source.clips ?? []) ensure(contains(clip.rect, roi), 'ROI_CROSSES_SOURCE_CLIP');
    let ancestor = source, visited = new Set();
    while (ancestor) { ensure(!visited.has(ancestor.id) && Number(ancestor.style?.opacity ?? 1) === 1 && (!ancestor.style?.transform || ancestor.style.transform === 'none'), 'SOURCE_CONTEXT_UNSUPPORTED'); visited.add(ancestor.id); ancestor = sources.get(ancestor.parentId); }
    const overlays = []; let shadowWitnessProof = null;
    for (const other of capture.nodes) {
      if (other.paintIndex <= source.paintIndex || other.kind === 'text' || !rectOK(other.rect)) continue;
      if (laterShadowTouches(other, roi) && !shadowWitnessProof) shadowWitnessProof = buildShadowWitness(requested, source, roi);
      let area = intersect(other.rect, roi); for (const clip of other.clips ?? []) area = area && intersect(area, clip.rect);
      if (!area) continue;
      const paint = color(other.style?.backgroundColor); if (!paint || paint[3] === 0) continue;
      ensure(contains(area, roi) && paint[3] < 1 && Number(other.style.opacity ?? 1) === 1 && (!other.style.boxShadow || other.style.boxShadow === 'none') && ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].every(key => !parseFloat(other.style[`border${key}Radius`] ?? 0)), 'PARTIAL_OR_OPAQUE_OVERLAY');
      overlays.push({ sourceId: other.id, paintIndex: other.paintIndex, rgba: paint });
    }
    overlays.sort((a, b) => a.paintIndex - b.paintIndex);
    let reference = null, compositingProof = null;
    if (overlays.length) {
      reference = requested.reference;
      ensure(reference?.capture && reference?.image && reference.capture.privacy?.mockOnly === true && reference.capture.privacy.authenticatedCapture === false && reference.capture.privacy.credentialsRead === false && /^[a-f0-9]{64}$/.test(reference.image.sha256) && reference.image.width === image.width && reference.image.height === image.height && reference.image.pixelsRGBA?.length === image.pixelsRGBA.length && JSON.stringify(reference.roi) === JSON.stringify(roi), 'UNMASKED_REFERENCE_REQUIRED');
      const refSource = reference.capture.nodes.find(node => node.id === reference.sourceId);
      ensure(refSource && refSource.tag === source.tag && JSON.stringify(refSource.rect) === JSON.stringify(source.rect) && JSON.stringify(refSource.scroll) === JSON.stringify(source.scroll) && refSource.style.overflowX === source.style.overflowX && refSource.style.overflowY === source.style.overflowY, 'UNMASKED_GEOMETRY_DRIFT');
      for (const other of reference.capture.nodes) {
        if (other.paintIndex <= refSource.paintIndex || other.kind === 'text' || !rectOK(other.rect)) continue;
        let area = intersect(other.rect, roi); for (const clip of other.clips ?? []) area = area && intersect(area, clip.rect);
        ensure(!area || !(color(other.style?.backgroundColor)?.[3] > 0), 'REFERENCE_IS_MASKED');
      }
      compositingProof = { method: 'EXACT_UNMASKED_REFERENCE_8BIT_MASK_COMPOSITION', purpose: 'UA_IDENTITY_ONLY_NOT_FINAL_PIXEL_FIDELITY', captureSHA256: hash(reference.capture), sourceImageSHA256: reference.image.sha256, sourceId: reference.sourceId, roi: copy(roi), cssAlphas: overlays.map(overlay => overlay.rgba[3]), quantizedAlphas: overlays.map(overlay => Math.round(overlay.rgba[3] * 255) / 255), differingPixels: 0, maxChannelDelta: 0, differenceRatio: 0, residuals: [] };
    }
    const observedPixel = (x, y) => { const offset = ((y + roi.y) * image.width + x + roi.x) * 4; return Array.from(image.pixelsRGBA.slice(offset, offset + 4)); };
    const originalPixel = (x, y) => { if (!reference) return observedPixel(x, y); const offset = ((y + roi.y) * image.width + x + roi.x) * 4; return Array.from(reference.image.pixelsRGBA.slice(offset, offset + 4)); };
    const samePixel = (a, b) => a.every((value, index) => value === b[index]);
    const rows = [], observed = [], levels = new Set(); let visibleInk = 0;
    for (let y = 0; y < roi.height; y++) {
      const row = []; let x = 0;
      while (x < roi.width) {
        const rgba = observedPixel(x, y), original = originalPixel(x, y);
        ensure(rgba.length === 4 && rgba.every(value => Number.isInteger(value) && value >= 0 && value <= 255) && rgba[3] === 255 && rgba[0] === rgba[1] && rgba[1] === rgba[2], 'ROI_NOT_OPAQUE_GRAYSCALE_CHROME');
        ensure(original.length === 4 && original[3] === 255 && original[0] === original[1] && original[1] === original[2], 'REFERENCE_NOT_OPAQUE_GRAYSCALE');
        let composed = original.slice(0, 3);
        for (const overlay of overlays) { const alpha = Math.round(overlay.rgba[3] * 255) / 255; composed = composed.map((value, channel) => Math.round(value * (1 - alpha) + overlay.rgba[channel] * alpha)); }
        const maxDelta = Math.max(...composed.map((value, channel) => Math.abs(value - rgba[channel])));
        ensure(maxDelta <= (reference ? 1 : 0), 'UNMASKED_PIXEL_PROOF_FAILED');
        let end = x + 1; while (end < roi.width && samePixel(rgba, observedPixel(end, y)) && samePixel(original, originalPixel(end, y))) end++;
        if (maxDelta) {
          ensure((compositingProof.differingPixels + end - x) / (roi.width * roi.height) <= .001, 'UNMASKED_PIXEL_PROOF_FAILED');
          for (let column = x; column < end; column++) compositingProof.residuals.push({ x: roi.x + column, y: roi.y + y, originalRGBA: original, expectedRGB: composed, observedRGBA: rgba, maxChannelDelta: maxDelta });
          compositingProof.method = 'SAME_UA_REFERENCE_WITH_RECORDED_MASK_QUANTIZATION_RESIDUALS';
          compositingProof.differingPixels += end - x; compositingProof.maxChannelDelta = Math.max(compositingProof.maxChannelDelta, maxDelta); compositingProof.differenceRatio = compositingProof.differingPixels / (roi.width * roi.height);
        }
        for (let column = x; column < end; column++) observed.push(...rgba);
        levels.add(rgba[0]); if (rgba[0] < 200) visibleInk += end - x;
        row.push({ x, y, width: end - x, height: 1, rgba, paintRGB: original.slice(0, 3).map(value => value / 255) }); x = end;
      }
      rows.push(row);
    }
    if (shadowWitnessProof) shadowWitnessProof.roiHash = hash(observed);
    ensure(levels.size >= 2 && Math.max(...levels) - Math.min(...levels) >= 20 && visibleInk >= (requested.kind === 'textarea-resize' ? 4 : 20), 'VISIBLE_CHROME_NOT_PROVEN');
    const rectangles = [], active = new Map();
    for (const row of rows) {
      const next = new Map();
      for (const run of row) { const key = `${run.x}/${run.width}/${run.rgba.join(',')}/${run.paintRGB.join(',')}`, prior = active.get(key); if (prior && prior.y + prior.height === run.y) { prior.height++; next.set(key, prior); } else { rectangles.push(run); next.set(key, run); } }
      active.clear(); for (const [key, value] of next) active.set(key, value);
    }
    totalArea += roi.width * roi.height; totalRectangles += rectangles.length;
    ensure(totalArea <= 40000 && totalRectangles <= 5000, 'DECORATION_BUDGET');
    planned.push({ sourceId: source.id, kind: requested.kind, ...(requested.partId === undefined ? {} : { partId: requested.partId }), roi: copy(roi), sourceRect: copy(source.rect), clientRect: copy(clientRect), sourceStackingContextId: source.stackingContextId, sourcePaintIndex: source.paintIndex, overlays, compositingProof, ...(shadowWitnessProof ? { shadowWitnessProof } : {}), observedRGBAHash: hash(observed), observedPixelCount: roi.width * roi.height, rectangles });
  }
  const plan = { schemaVersion: 'feedback-native-chrome-plan/1', targetPageId: '23:2', captureId: capture.id, captureSHA256: hash(capture), sourceImageSHA256: image.sha256, viewport: { width: image.width, height: image.height }, mockOnly: true, native: copy({ ...native, expectedLedgerHash: native.expectedLedgerHash ?? null }), regions: planned, totalArea, totalRectangles, limitations: ['Only captured decorative UA chrome, not arbitrary text, content or full-page tracing.', 'Native re-export and strict source pixel comparison remain required.'] };
  return { ...plan, planHash: hash(plan) };
}

export async function applyFeedbackNativeChrome(figma, plan, options = {}) {
  const fail = code => { throw new Error(`FEEDBACK_CHROME_${code}`); }, ensure = (value, code) => { if (!value) fail(code); };
  const copy = value => JSON.parse(JSON.stringify(value)), same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const stablePartId = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value);
  const intersect = (a, b) => { const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y), right = Math.min(a.x + a.width, b.x + b.width), bottom = Math.min(a.y + a.height, b.y + b.height); return right > x && bottom > y ? { x, y, width: right - x, height: bottom - y } : null; };
  const safe = value => typeof value === 'symbol' ? 'FIGMA_MIXED' : Array.isArray(value) ? value.map(safe) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, child]) => [key, safe(child)])) : value;
  function sha256(text) {
    const bytes = []; for (const character of text) { const code = character.codePointAt(0); if (code < 128) bytes.push(code); else if (code < 2048) bytes.push(192 | code >> 6, 128 | code & 63); else if (code < 65536) bytes.push(224 | code >> 12, 128 | code >> 6 & 63, 128 | code & 63); else bytes.push(240 | code >> 18, 128 | code >> 12 & 63, 128 | code >> 6 & 63, 128 | code & 63); }
    const bitLength = bytes.length * 8; bytes.push(128); while (bytes.length % 64 !== 56) bytes.push(0); for (let index = 7; index >= 0; index--) bytes.push(index >= 4 ? 0 : Math.floor(bitLength / 2 ** (index * 8)) & 255);
    const constants = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    const state = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19], rotate = (word, count) => word >>> count | word << 32 - count;
    for (let begin = 0; begin < bytes.length; begin += 64) { const words = new Array(64); for (let index = 0; index < 16; index++) words[index] = (bytes[begin + index * 4] << 24 | bytes[begin + index * 4 + 1] << 16 | bytes[begin + index * 4 + 2] << 8 | bytes[begin + index * 4 + 3]) >>> 0; for (let index = 16; index < 64; index++) { const a = words[index - 15], b = words[index - 2]; words[index] = (words[index - 16] + (rotate(a, 7) ^ rotate(a, 18) ^ a >>> 3) + words[index - 7] + (rotate(b, 17) ^ rotate(b, 19) ^ b >>> 10)) >>> 0; } let [a,b,c,d,e,f,g,h] = state; for (let index = 0; index < 64; index++) { const first = (h + (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) + (e & f ^ ~e & g) + constants[index] + words[index]) >>> 0, second = ((rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) + (a & b ^ a & c ^ b & c)) >>> 0; h=g;g=f;f=e;e=(d+first)>>>0;d=c;c=b;b=a;a=(first+second)>>>0; } for (const [index, word] of [a,b,c,d,e,f,g,h].entries()) state[index] = (state[index] + word) >>> 0; }
    return state.map(word => word.toString(16).padStart(8, '0')).join('');
  }
  const hash = value => sha256(typeof value === 'string' ? value : JSON.stringify(value));
  const { targetPageId, operationKey, mode = 'preflight' } = options;
  ensure(targetPageId === '23:2' && plan?.targetPageId === targetPageId && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(operationKey) && ['preflight', 'apply', 'audit'].includes(mode), 'SCOPE_INVALID');
  const unhashed = copy(plan); delete unhashed.planHash;
  ensure(plan.schemaVersion === 'feedback-native-chrome-plan/1' && plan.mockOnly === true && /^[a-f0-9]{64}$/.test(plan.planHash) && hash(unhashed) === plan.planHash && plan.captureSHA256 === plan.native?.specHash && /^[a-f0-9]{64}$/.test(plan.sourceImageSHA256) && Array.isArray(plan.regions) && plan.regions.length <= 8 && plan.totalArea <= 40000 && plan.totalRectangles <= 5000, 'PLAN_INVALID');
  ensure(/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(plan.native.operationKey) && typeof plan.native.rootNodeId === 'string', 'NATIVE_SCOPE_INVALID');
  const page = figma.currentPage, guard = () => ensure(figma.currentPage?.id === targetPageId && page.id === targetPageId, 'PAGE_CHANGED'); guard();
  const prefix = `feedback_native_chrome_v1__${operationKey}__`, nativePrefix = `feedback_fidelity_native_v1__${plan.native.operationKey}__`;
  const createdNodeIds = [], mutated = new Set(); let ledger = null, intent = page.getPluginData(prefix + 'intent'), stage = 'PREFLIGHT';
  function readData(dataPrefix) { const rawHeader = page.getPluginData(dataPrefix + 'header'); if (!rawHeader) return null; const header = JSON.parse(rawHeader); ensure(Number.isInteger(header.chunks) && header.chunks > 0 && header.chunks <= 256, 'LEDGER_HEADER_INVALID'); const chunks = []; for (let index = 0; index < header.chunks; index++) { const chunk = page.getPluginData(`${dataPrefix}chunk_${index}`); ensure(chunk && chunk.length <= 16000, 'LEDGER_CHUNK_MISSING'); chunks.push(chunk); } const raw = chunks.join(''); ensure(hash(raw) === header.hash, 'LEDGER_HASH_INVALID'); return { rawHeader, header, chunks, raw, value: JSON.parse(raw) }; }
  let native, saved;
  try { native = readData(nativePrefix); saved = readData(prefix); } catch (error) { if (error.message.startsWith('FEEDBACK_CHROME_')) throw error; fail('LEDGER_UNREADABLE'); }
  ensure(native && !page.getPluginData(nativePrefix + 'intent') && !native.value.pending && native.value.complete === true && native.value.cursor === native.value.totalUnits && native.value.schemaVersion === 'feedback-fidelity-native-ledger/1' && native.value.snapshotStorage === 'SHA256' && native.value.operationKey === plan.native.operationKey && native.value.targetPageId === targetPageId && native.value.specHash === plan.native.specHash && native.value.rootNodeId === plan.native.rootNodeId && Array.isArray(native.value.entries) && native.value.entries.length <= 100000 && JSON.stringify(native.value) === native.raw, 'NATIVE_LEDGER_NOT_READY');
  if (saved) { ledger = saved.value; ensure(ledger.schemaVersion === 'feedback-native-chrome-ledger/1' && ledger.operationKey === operationKey && ledger.planHash === plan.planHash && ledger.targetPageId === targetPageId && ledger.nativeOperationKey === plan.native.operationKey && ledger.rootNodeId === plan.native.rootNodeId, 'ADDON_SCOPE_DRIFT'); }
  if (mode === 'apply') ensure(!intent && !ledger?.pending, 'PENDING_REQUIRES_MANUAL_REVIEW');
  const response = (status, extra = {}) => ({ tag: 'FEEDBACK_NATIVE_CHROME', status, operationKey, targetPageId, planHash: plan.planHash, rootNodeId: plan.native.rootNodeId, complete: ledger?.complete ?? false, pending: !!intent || !!ledger?.pending, createdNodeIds: [...createdNodeIds], mutatedNodeIds: [...mutated], ...extra });
  function snapshot(node, entry) { const result = { type: node.type, parentId: node.parent?.id ?? null }; const fields = ['name','x','y','width','height','opacity','visible','fills','strokes','strokeWeight','strokeTopWeight','strokeRightWeight','strokeBottomWeight','strokeLeftWeight','strokeAlign','topLeftRadius','topRightRadius','bottomRightRadius','bottomLeftRadius','effects','clipsContent','relativeTransform','layoutMode','primaryAxisSizingMode','counterAxisSizingMode','primaryAxisAlignItems','counterAxisAlignItems','itemSpacing','paddingLeft','paddingRight','paddingTop','paddingBottom']; if (node.type === 'TEXT') fields.push('characters','fontName','fontSize','lineHeight','letterSpacing','textAutoResize','textAlignHorizontal','textDecoration','hasMissingFont'); for (const field of fields) if (field in node) result[field] = safe(node[field]); if ('children' in node) result.children = node.children.map(child => child.id); if (native.value.libraryMapHash && node.type === 'VECTOR' && 'vectorPaths' in node) result.vectorPaths = safe(node.vectorPaths); if (node.type === 'TEXT' && entry?.fontRanges?.length) { ensure(typeof node.getRangeFontName === 'function', 'FONT_RANGE_READ_UNSUPPORTED'); result.fontRanges = entry.fontRanges.map(range => ({ start: range.start, end: range.end, fontName: safe(node.getRangeFontName(range.start, range.end)) })); } return result; }
  const sameReadback = (actual, expected, path = '') => {
    if (typeof expected === 'number') {
      if (typeof actual !== 'number' || !Number.isFinite(actual)) return false;
      return /(?:^|\.)(?:x|y|width|height)$/.test(path) || /(?:^|\.)color(?:\.sourceColor)?\.(?:r|g|b)$/.test(path) ? Math.abs(actual - expected) <= 0.000001 : actual === expected;
    }
    if (Array.isArray(expected)) return Array.isArray(actual) && actual.length === expected.length && expected.every((value, index) => sameReadback(actual[index], value, `${path}.${index}`));
    if (expected && typeof expected === 'object') return !!actual && typeof actual === 'object' && Object.keys(expected).every(key => sameReadback(actual[key], expected[key], path ? `${path}.${key}` : key));
    return actual === expected;
  };
  function verifyNode(node, expected, code) { const actual = snapshot(node); for (const [field, value] of Object.entries(expected)) ensure(sameReadback(actual[field], value, field), code); }
  const root = await figma.getNodeByIdAsync(plan.native.rootNodeId); guard();
  ensure(root && root.type === 'FRAME' && root.parent?.id === targetPageId && root.getPluginData(nativePrefix + 'operation') === plan.native.operationKey && root.width === plan.viewport.width && root.height === plan.viewport.height, 'ROOT_SCOPE_DRIFT');
  const nativeEntries = new Map(native.value.entries.map(entry => [entry.id, entry]));
  async function nativeAudit() { const issues = []; for (const entry of native.value.entries) { const node = await figma.getNodeByIdAsync(entry.id); guard(); if (!node || node.getPluginData(nativePrefix + 'operation') !== plan.native.operationKey) { issues.push({ code: 'NATIVE_OWNERSHIP_DRIFT', nodeId: entry.id }); continue; } let ancestor = node, seen = new Set(); while (ancestor && ancestor.id !== root.id && !seen.has(ancestor.id)) { seen.add(ancestor.id); ancestor = ancestor.parent; } if (ancestor?.id !== root.id || !entry.snapshotHash || entry.snapshot || hash(snapshot(node, entry)) !== entry.snapshotHash) issues.push({ code: 'NATIVE_SNAPSHOT_DRIFT', nodeId: entry.id }); } return issues; }
  const parentRows = [], parentNodes = new Map(), runtimePartsBySourceKind = new Map();
  for (const region of plan.regions) {
    ensure(['vertical-scrollbar','horizontal-scrollbar','textarea-resize'].includes(region.kind) && region.roi && ['x','y','width','height'].every(key => Number.isInteger(region.roi[key])) && region.roi.width > 0 && region.roi.height > 0 && (region.kind === 'vertical-scrollbar' ? region.roi.width <= 17 : region.kind === 'horizontal-scrollbar' ? region.roi.height <= 17 : region.roi.width <= 16 && region.roi.height <= 16) && Array.isArray(region.rectangles) && region.rectangles.length <= 5000, 'REGION_INVALID');
    const sourceKind = region.sourceId + '/' + region.kind, priorParts = runtimePartsBySourceKind.get(sourceKind) ?? [];
    if (priorParts.length && region.partId === undefined) ensure(false, 'ROI_SCOPE_INVALID');
    if (priorParts.length || region.partId !== undefined) {
      ensure(stablePartId(region.partId), 'PART_ID_REQUIRED');
      ensure(priorParts.every(part => stablePartId(part.partId)), 'PART_ID_REQUIRED');
      ensure(!priorParts.some(part => part.partId === region.partId), 'PART_ID_DUPLICATE');
      ensure(!priorParts.some(part => intersect(part.roi, region.roi)), 'ROI_PART_OVERLAP');
    }
    priorParts.push({ partId: region.partId, roi: copy(region.roi) }); runtimePartsBySourceKind.set(sourceKind, priorParts);
    const id = native.value.nativeNodeIdByCaptureId[region.sourceId], parent = parentNodes.get(region.sourceId), node = parent ?? (id && await figma.getNodeByIdAsync(id)); guard();
    ensure(node && node.type === 'FRAME' && node.layoutMode === 'NONE' && node.getPluginData(nativePrefix + 'operation') === plan.native.operationKey && node.getPluginData(nativePrefix + 'capture') === region.sourceId && node.getPluginData(nativePrefix + 'role') === 'Source bounds' && nativeEntries.get(id)?.sourceId === region.sourceId && nativeEntries.get(id)?.role === 'Source bounds', 'PARENT_NOT_OWNED_SOURCE_BOUNDS');
    let x = 0, y = 0, ancestor = node, seen = new Set();
    while (ancestor && ancestor.id !== root.id && !seen.has(ancestor.id)) { seen.add(ancestor.id); ensure(ancestor.opacity === 1 && (!ancestor.layoutMode || ancestor.layoutMode === 'NONE') && (!ancestor.relativeTransform || Math.abs(ancestor.relativeTransform[0][0] - 1) < .000001 && Math.abs(ancestor.relativeTransform[0][1]) < .000001 && Math.abs(ancestor.relativeTransform[1][0]) < .000001 && Math.abs(ancestor.relativeTransform[1][1] - 1) < .000001), 'PARENT_CONTEXT_UNSUPPORTED'); x += ancestor.x; y += ancestor.y; ancestor = ancestor.parent; }
    ensure(ancestor?.id === root.id && Math.abs(x - region.sourceRect.x) <= .001 && Math.abs(y - region.sourceRect.y) <= .001 && Math.abs(node.width - region.sourceRect.width) <= .001 && Math.abs(node.height - region.sourceRect.height) <= .001 && region.roi.x >= x && region.roi.y >= y && region.roi.x + region.roi.width <= x + node.width && region.roi.y + region.roi.height <= y + node.height, 'PARENT_GEOMETRY_DRIFT');
    if (!parent) {
      parentNodes.set(region.sourceId, node);
      parentRows.push({ id, sourceId: region.sourceId, snapshot: snapshot(node, nativeEntries.get(id)), sourceRect: copy(region.sourceRect) });
    } else {
      const parentRow = parentRows.find(row => row.id === id);
      ensure(parentRow && same(parentRow.sourceRect, region.sourceRect), 'PARENT_GEOMETRY_DRIFT');
    }
    let area = 0; const spans = Array.from({ length: region.roi.height }, () => []);
    for (const rect of region.rectangles) { ensure(['x','y','width','height'].every(key => Number.isInteger(rect[key])) && rect.x >= 0 && rect.y >= 0 && rect.width > 0 && rect.height > 0 && rect.x + rect.width <= region.roi.width && rect.y + rect.height <= region.roi.height && Array.isArray(rect.paintRGB) && rect.paintRGB.length === 3 && rect.paintRGB.every(value => Number.isFinite(value) && value >= 0 && value <= 1), 'RECTANGLE_INVALID'); area += rect.width * rect.height; for (let row = rect.y; row < rect.y + rect.height; row++) { ensure(spans[row].every(span => rect.x >= span[1] || rect.x + rect.width <= span[0]), 'RECTANGLE_OVERLAP'); spans[row].push([rect.x, rect.x + rect.width]); } }
    ensure(area === region.roi.width * region.roi.height, 'RECTANGLE_COVERAGE_INVALID');
  }
  const issues = await nativeAudit();
  if (ledger) {
    if (intent || ledger.pending || !ledger.complete) issues.push({ code: 'ADDON_PENDING', stage: ledger.stage });
    const backupHeader = page.getPluginData(prefix + 'backup_native_header'), chunks = [];
    for (let index = 0; index < ledger.nativeBackupChunks; index++) chunks.push(page.getPluginData(`${prefix}backup_native_chunk_${index}`));
    const originalRaw = chunks.join('');
    if (hash(backupHeader) !== ledger.nativeBackupHeaderHash || hash(originalRaw) !== ledger.nativeBeforeHash || native.header.hash !== ledger.nativeAfterHash) issues.push({ code: 'NATIVE_BACKUP_OR_HASH_DRIFT' });
    else {
      const expected = JSON.parse(originalRaw); for (const row of ledger.parents) { const entry = expected.entries.find(value => value.id === row.id); if (!entry || entry.snapshotHash !== row.beforeSnapshotHash) { issues.push({ code: 'BACKUP_PARENT_DRIFT', nodeId: row.id }); continue; } entry.snapshotHash = row.afterSnapshotHash; }
      if (!same(expected, native.value)) issues.push({ code: 'UNAPPROVED_NATIVE_LEDGER_CHANGE' });
      const expectedHeader = JSON.parse(backupHeader); expectedHeader.hash = ledger.nativeAfterHash; if (!same(expectedHeader, native.header)) issues.push({ code: 'NATIVE_HEADER_DRIFT' });
    }
    for (const row of ledger.parents) { const node = await figma.getNodeByIdAsync(row.id); guard(); const current = node && snapshot(node, nativeEntries.get(row.id)); if (!current || hash(current) !== row.afterSnapshotHash || !same(current.children?.slice(0, row.beforeSnapshot.children.length), row.beforeSnapshot.children) || !same({ ...current, children: row.beforeSnapshot.children }, row.beforeSnapshot)) issues.push({ code: 'PARENT_ORIGINAL_PROPERTIES_DRIFT', nodeId: row.id }); }
    const known = new Set(); for (const entry of ledger.entries) { known.add(entry.id); const node = await figma.getNodeByIdAsync(entry.id); guard(); if (!node || node.getPluginData(prefix + 'operation') !== operationKey || node.getPluginData(prefix + 'plan') !== plan.planHash || !entry.snapshotHash || hash(snapshot(node)) !== entry.snapshotHash) issues.push({ code: 'ADDON_NODE_DRIFT', nodeId: entry.id }); }
    const pending = [...page.children]; let visited = 0; while (pending.length) { const node = pending.pop(); ensure(++visited <= 100000, 'AUDIT_NODE_BUDGET'); const owned = node.getPluginData?.(prefix + 'operation') === operationKey; if (owned && !known.has(node.id)) issues.push({ code: 'UNLEDGERED_ADDON_NODE', nodeId: node.id }); if ('children' in node && (node.id === root.id || owned || node.getPluginData?.(nativePrefix + 'operation') === plan.native.operationKey)) pending.push(...node.children); }
    if (mode === 'audit' || issues.length) return response(issues.length ? 'AUDIT_FAIL' : 'AUDIT_PASS', { issues, nativeLedgerHash: native.header.hash });
    return response('ALREADY_COMPLETE', { issues: [], nativeLedgerHash: native.header.hash });
  }
  ensure(!issues.length, 'NATIVE_READBACK_DRIFT');
  ensure(!intent, 'PENDING_REQUIRES_MANUAL_REVIEW');
  if (plan.native.expectedLedgerHash !== null) ensure(native.header.hash === plan.native.expectedLedgerHash, 'NATIVE_HASH_DRIFT');
  if (mode === 'preflight') return response('PREFLIGHT', { issues: [], nativeLedgerHash: native.header.hash, nativeHeaderSHA256: hash(native.rawHeader), parents: parentRows });
  if (mode === 'audit') return response('AUDIT_FAIL', { issues: [{ code: 'ADDON_LEDGER_MISSING' }] });
  ensure(/^[a-f0-9]{64}$/.test(plan.native.expectedLedgerHash ?? '') && native.header.hash === plan.native.expectedLedgerHash, 'NATIVE_HASH_BINDING_REQUIRED');
  ensure(!page.getPluginData(prefix + 'backup_native_header') && !page.getPluginData(prefix + 'backup_native_chunk_0'), 'BACKUP_NAMESPACE_NOT_EMPTY');
  ledger = { schemaVersion: 'feedback-native-chrome-ledger/1', operationKey, targetPageId, planHash: plan.planHash, nativeOperationKey: plan.native.operationKey, rootNodeId: root.id, complete: false, pending: true, stage: 'BEGIN', nativeBeforeHash: native.header.hash, nativeAfterHash: null, nativeBackupHeaderHash: hash(native.rawHeader), nativeBackupChunks: native.chunks.length, parents: parentRows.map(row => ({ id: row.id, sourceId: row.sourceId, beforeSnapshot: row.snapshot, beforeSnapshotHash: nativeEntries.get(row.id).snapshotHash, afterSnapshotHash: null })), entries: [] };
  function setData(node, key, value) { guard(); node.setPluginData(key, value); mutated.add(node.id); }
  function persist() { const raw = JSON.stringify(ledger); ensure(raw.length <= 4096000, 'ADDON_LEDGER_BUDGET'); const chunks = Math.max(1, Math.ceil(raw.length / 16000)); for (let index = 0; index < chunks; index++) setData(page, `${prefix}chunk_${index}`, raw.slice(index * 16000, (index + 1) * 16000)); setData(page, prefix + 'header', JSON.stringify({ chunks, hash: hash(raw), operationKey, targetPageId, planHash: plan.planHash })); }
  function begin(next) { stage = next; ledger.stage = next; intent = JSON.stringify({ operationKey, targetPageId, planHash: plan.planHash, stage }); setData(page, prefix + 'intent', intent); }
  function own(node, sourceId, role) { createdNodeIds.push(node.id); ledger.entries.push({ id: node.id, sourceId, role, snapshotHash: null }); setData(node, prefix + 'operation', operationKey); setData(node, prefix + 'plan', plan.planHash); setData(node, prefix + 'source', sourceId); return node; }
  const expectedAddonHashes = new Map();
  const freezeAddonSnapshot = node => { expectedAddonHashes.set(node.id, hash(snapshot(node))); };
  try {
    begin('BACKUP_NATIVE_BYTES'); persist(); setData(page, prefix + 'backup_native_header', native.rawHeader); for (const [index, chunk] of native.chunks.entries()) setData(page, `${prefix}backup_native_chunk_${index}`, chunk);
    ensure(page.getPluginData(prefix + 'backup_native_header') === native.rawHeader && native.chunks.every((chunk, index) => page.getPluginData(`${prefix}backup_native_chunk_${index}`) === chunk), 'BACKUP_READBACK_FAILED');
    for (const region of plan.regions) {
      begin(`APPEND:${region.sourceId}`); const parent = parentNodes.get(region.sourceId), frame = own(figma.createFrame(), region.sourceId, 'UA chrome');
      const frameName = 'Feedback Native Chrome/' + region.kind + '/' + region.sourceId + (region.partId ? '/' + region.partId : ''), frameX = region.roi.x - region.sourceRect.x, frameY = region.roi.y - region.sourceRect.y, frameChildren = [];
      frame.name = frameName; frame.layoutMode = 'NONE'; frame.fills = []; frame.strokes = []; frame.effects = []; frame.opacity = 1; frame.clipsContent = true; frame.resize(region.roi.width, region.roi.height); parent.appendChild(frame); mutated.add(parent.id); mutated.add(frame.id); frame.x = frameX; frame.y = frameY;
      verifyNode(frame, { type: 'FRAME', parentId: parent.id, name: frameName, x: frameX, y: frameY, width: region.roi.width, height: region.roi.height, layoutMode: 'NONE', fills: [], strokes: [], effects: [], opacity: 1, clipsContent: true, children: frameChildren }, 'FRAME_WRITE_READBACK_FAILED');
      freezeAddonSnapshot(frame);
      for (const [index, rect] of region.rectangles.entries()) {
        const node = own(figma.createRectangle(), region.sourceId, 'UA chrome rectangle'), nodeName = `UA chrome/${index + 1}`, rgb = { r: rect.paintRGB[0], g: rect.paintRGB[1], b: rect.paintRGB[2] }, fills = [{ type: 'SOLID', color: { ...rgb, sourceColor: { space: 'SRGB', ...rgb } }, opacity: 1 }];
        node.name = nodeName; node.resize(rect.width, rect.height); node.opacity = 1; node.strokes = []; node.strokeWeight = 0; node.effects = []; node.fills = fills; frame.appendChild(node); mutated.add(frame.id); mutated.add(node.id); node.x = rect.x; node.y = rect.y;
        verifyNode(node, { type: 'RECTANGLE', parentId: frame.id, name: nodeName, x: rect.x, y: rect.y, width: rect.width, height: rect.height, opacity: 1, strokes: [], strokeWeight: 0, effects: [], fills }, 'RECTANGLE_WRITE_READBACK_FAILED');
        frameChildren.push(node.id);
        verifyNode(frame, { type: 'FRAME', parentId: parent.id, name: frameName, x: frameX, y: frameY, width: region.roi.width, height: region.roi.height, layoutMode: 'NONE', fills: [], strokes: [], effects: [], opacity: 1, clipsContent: true, children: frameChildren }, 'FRAME_WRITE_READBACK_FAILED');
        freezeAddonSnapshot(node); freezeAddonSnapshot(frame);
      }
      persist();
    }
    for (const parentRow of ledger.parents) {
      const parent = parentNodes.get(parentRow.sourceId), current = parent && snapshot(parent, nativeEntries.get(parentRow.id));
      ensure(current && same(current.children.slice(0, parentRow.beforeSnapshot.children.length), parentRow.beforeSnapshot.children) && same({ ...current, children: parentRow.beforeSnapshot.children }, parentRow.beforeSnapshot), 'PARENT_CHANGED_DURING_APPEND');
      parentRow.afterSnapshotHash = hash(current);
    }
    persist();
    begin('SNAPSHOT_ADDON');
    for (const entry of ledger.entries) { const expectedHash = expectedAddonHashes.get(entry.id); ensure(expectedHash, 'CREATED_NODE_EXPECTED_SNAPSHOT_MISSING'); const node = await figma.getNodeByIdAsync(entry.id); guard(); ensure(node, 'CREATED_NODE_MISSING'); ensure(hash(snapshot(node)) === expectedHash, 'CREATED_NODE_CHANGED_BEFORE_COMMIT'); entry.snapshotHash = expectedHash; }
    for (const row of ledger.parents) nativeEntries.get(row.id).snapshotHash = row.afterSnapshotHash;
    begin('UPDATE_NATIVE_PARENT_SNAPSHOTS'); const nextRaw = JSON.stringify(native.value); ensure(nextRaw.length === native.raw.length, 'NATIVE_BYTE_LENGTH_CHANGED'); const nextChunks = native.chunks.map((chunk, index) => nextRaw.slice(index * 16000, index * 16000 + chunk.length));
    for (let index = 0; index < nextChunks.length; index++) setData(page, `${nativePrefix}chunk_${index}`, nextChunks[index]);
    const nextHeader = { ...native.header, hash: hash(nextRaw) }; setData(page, nativePrefix + 'header', JSON.stringify(nextHeader));
    ledger.nativeAfterHash = nextHeader.hash; native = readData(nativePrefix); ensure(native.raw === nextRaw && !page.getPluginData(nativePrefix + 'intent') && (await nativeAudit()).length === 0, 'POST_WRITE_NATIVE_AUDIT_FAILED');
    ledger.pending = false; ledger.complete = true; ledger.stage = 'COMPLETE'; persist(); setData(page, prefix + 'intent', ''); intent = '';
    return response('COMPLETE', { issues: [], nativeLedgerHash: ledger.nativeAfterHash, addonNodeCount: ledger.entries.length, parentIds: ledger.parents.map(row => row.id), verification: { nativeReadback: 'OBSERVED', strictSourcePixels: 'NOT RUN', present: 'NOT RUN' } });
  } catch (error) {
    ledger.pending = true; ledger.complete = false; ledger.failure = error.message?.startsWith('FEEDBACK_CHROME_') ? error.message : 'FEEDBACK_CHROME_HOST_WRITE_FAILED';
    let persistenceError = null; try { persist(); } catch (failure) { persistenceError = failure.message?.startsWith('FEEDBACK_CHROME_') ? failure.message : 'FEEDBACK_CHROME_FAILURE_JOURNAL_UNCONFIRMED'; }
    return response('FAILED', { failure: ledger.failure, stage, persistenceError, issues: [{ code: ledger.failure }] });
  }
}
