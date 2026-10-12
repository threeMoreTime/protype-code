import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { validateDesignSpec, orderDesignNodes } from '../design/spec.mjs';
import { normalizeVectorPaths, vectorPathsMatch } from './vector-paths.mjs';

// This module is bundled into code.js. It accepts data, never source code.
const PREFIX = 'bridge-design-v1-';
const NODE_SPEC = `${PREFIX}spec`;
const NODE_DIGEST = `${PREFIX}digest`;
const NODE_INTENT = `${PREFIX}intent`;
const NODE_STATE = `${PREFIX}state`;
const NODE_SOURCE = `${PREFIX}source`;
const OVERFLOW = { NONE: 'NONE', HORIZONTAL: 'HORIZONTAL', VERTICAL: 'VERTICAL', BOTH: 'BOTH' };
const REVERSE_OVERFLOW = Object.fromEntries(Object.entries(OVERFLOW).map(([k, v]) => [v, k]));
const copy = value => JSON.parse(JSON.stringify(value));
// The Figma main-thread sandbox has no browser TextEncoder. Match UTF-8,
// including replacement of lone UTF-16 surrogates, without host polyfills.
export function utf8ToBytes(text) {
  const bytes = new Uint8Array(text.length * 3);
  let offset = 0;
  for (const character of text) {
    let point = character.codePointAt(0);
    if (point >= 0xd800 && point <= 0xdfff) point = 0xfffd;
    if (point < 0x80) bytes[offset++] = point;
    else if (point < 0x800) { bytes[offset++] = 0xc0 | point >> 6; bytes[offset++] = 0x80 | point & 63; }
    else if (point < 0x10000) {
      bytes[offset++] = 0xe0 | point >> 12; bytes[offset++] = 0x80 | point >> 6 & 63; bytes[offset++] = 0x80 | point & 63;
    } else {
      bytes[offset++] = 0xf0 | point >> 18; bytes[offset++] = 0x80 | point >> 12 & 63;
      bytes[offset++] = 0x80 | point >> 6 & 63; bytes[offset++] = 0x80 | point & 63;
    }
  }
  return bytes.subarray(0, offset);
}
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).filter(k => value[k] !== undefined).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
export const designSignature = value => bytesToHex(sha256(utf8ToBytes(canonical(value))));
const ensure = (condition, code) => { if (!condition) throw new Error(code); };
const readJson = (node, key) => { const s = node.getPluginData(key); return s ? JSON.parse(s) : null; };
const safe = value => typeof value === 'symbol' || value === undefined ? null : copy(value);
const fontKey = font => `${font.family}\u0000${font.style}`;
const normalizeSpacing = value => value?.unit === 'AUTO' ? { unit: 'AUTO' } : copy(value);
function matchesExpected(actual, expected) {
  if (typeof expected === 'number') return typeof actual === 'number' && Number.isFinite(actual) && Math.abs(actual - expected) <= 0.001;
  if (Array.isArray(expected)) return Array.isArray(actual) && actual.length === expected.length && expected.every((v, i) => matchesExpected(actual[i], v));
  if (expected && typeof expected === 'object') return actual && typeof actual === 'object' && Object.keys(expected).every(key => matchesExpected(actual[key], expected[key]));
  return actual === expected;
}

function decodeBase64(text) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const out = new Uint8Array(text.length * 3 / 4 - (text.endsWith('==') ? 2 : text.endsWith('=') ? 1 : 0));
  let offset = 0;
  for (let i = 0; i < text.length; i += 4) {
    const n = (alphabet.indexOf(text[i]) << 18) | (alphabet.indexOf(text[i + 1]) << 12) |
      (Math.max(0, alphabet.indexOf(text[i + 2])) << 6) | Math.max(0, alphabet.indexOf(text[i + 3]));
    if (offset < out.length) out[offset++] = n >>> 16 & 255;
    if (offset < out.length) out[offset++] = n >>> 8 & 255;
    if (offset < out.length) out[offset++] = n & 255;
  }
  return out;
}
function encodeBase64(bytes) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    result += chars[n >>> 18 & 63] + chars[n >>> 12 & 63] + (i + 1 < bytes.length ? chars[n >>> 6 & 63] : '=') + (i + 2 < bytes.length ? chars[n & 63] : '=');
  }
  return result;
}

export function createDesignRuntime(figma, guards) {
  let busy = false;
  const write = () => guards.onMutation?.();
  const put = (node, key, value) => { write(); node.setPluginData(key, typeof value === 'string' ? value : JSON.stringify(value)); };
  async function context(message) {
    const scope = await guards.resolveScope(message.trustedScope);
    guards.assertTrustedOwnership(message.trustedOwnership, message.operationId);
    const payload = message.payload ?? {};
    ensure(typeof payload.runId === 'string' && /^[A-Za-z0-9._:-]{1,160}$/.test(payload.runId), 'DESIGN_RUN_ID_REQUIRED');
    const spec = validateDesignSpec(payload.spec);
    const ownership = message.trustedOwnership;
    // File/node IDs can change on native .fig import. Semantic ownership survives.
    const ns = designSignature({ workspace: ownership.workspaceId, task: ownership.taskId, spec: spec.id }).slice(0, 24);
    const ledgerKey = `${PREFIX}${ns}-ledger`;
    const signature = designSignature(spec);
    const timerUnit = payload.timerUnit ?? 'milliseconds';
    ensure(['seconds', 'milliseconds'].includes(timerUnit), 'DESIGN_TIMER_UNIT_INVALID');
    const state = readJson(scope.root, ledgerKey);
    if (state) {
      ensure(state.specSignature === signature, 'DESIGN_SPEC_REVISION_CONFLICT: use a new spec id for a changed specification');
      ensure(state.timerUnit === timerUnit, 'DESIGN_TIMER_UNIT_CONFLICT');
    }
    const ctx = { message, scope, payload, spec, ownership, ns, ledgerKey, signature, timerUnit,
      state: state ?? { version: 1, specSignature: signature, timerUnit, cursor: 0, pending: null, complete: false },
      existing: Boolean(state), map: new Map(), idToKey: new Map(), fonts: new Map(), substitutions: [], styles: new Map(), variables: new Map(), images: new Map(),
      resourceKeys: { styles: new Map(), variables: new Map(), images: new Map() }, preparedComponents: new Set() };
    ctx.order = orderDesignNodes(spec);
    ctx.definitions = new Map(ctx.order.map(def => [def.key, def]));
    ctx.children = new Map(); ctx.reactionDefs = new Map();
    for (const def of spec.nodes) {
      if (!ctx.children.has(def.parentKey)) ctx.children.set(def.parentKey, []);
      ctx.children.get(def.parentKey).push(def);
    }
    for (const reaction of spec.reactions ?? []) {
      if (!ctx.reactionDefs.has(reaction.sourceKey)) ctx.reactionDefs.set(reaction.sourceKey, []);
      ctx.reactionDefs.get(reaction.sourceKey).push(reaction);
    }
    const discovered = new Map();
    let discoveredComplete = false;
    for (let offset = 0; offset < ctx.order.length; offset += 16) {
      const window = ctx.order.slice(offset, offset + 16).map(def => ({ def, record: null }));
      // Prefetch only IDs within this operation. Drain every started read before
      // ordered validation can throw or release busy; never prefetch snapshots.
      const reads = await Promise.allSettled(window.map(async item => {
        item.record = readJson(scope.root, `${PREFIX}${ns}-n-${designSignature(item.def.key).slice(0, 24)}`);
        return item.record ? await figma.getNodeByIdAsync(item.record.id) : null;
      }));
      for (let i = 0; i < window.length; i++) {
        const { def, record } = window[i], read = reads[i];
        if (read.status === 'rejected') throw read.reason;
        if (!record) continue;
        let node = read.value;
        if (!node || node.getPluginData(NODE_SPEC) !== ns || node.getPluginData(guards.specNodeKey) !== def.key) {
          if (!discoveredComplete) {
            const queue = [...(scope.root.children ?? [])];
            for (let j = 0; j < queue.length; j++) {
              const candidate = queue[j];
              if (candidate.getPluginData(NODE_SPEC) === ns) {
                const key = candidate.getPluginData(guards.specNodeKey);
                if (!discovered.has(key)) discovered.set(key, []);
                discovered.get(key).push(candidate);
              }
              if ('children' in candidate && candidate.type !== 'INSTANCE') queue.push(...candidate.children);
            }
            discoveredComplete = true;
          }
          const matches = discovered.get(def.key) ?? [];
          ensure(matches.length === 1, `DESIGN_MAPPING_AMBIGUOUS:${def.key}`);
          node = matches[0];
        }
        ensure(node && !node.removed, `DESIGN_NODE_MISSING:${def.key}`);
        guards.assertInScope(node, scope);
        guards.assertTaskOwned(node, ownership);
        ensure(node.getPluginData(NODE_SPEC) === ns && node.getPluginData(guards.specNodeKey) === def.key, `DESIGN_KEY_OWNERSHIP_CONFLICT:${def.key}`);
        ensure(node.type === def.type, `DESIGN_NODE_TYPE_CONFLICT:${def.key}`);
        ctx.map.set(def.key, node);
        ctx.idToKey.set(node.id, def.key);
        if (def.type === 'INSTANCE') ensure((await node.getMainComponentAsync())?.id === ctx.map.get(def.props.componentKey)?.id, `DESIGN_INSTANCE_COMPONENT_CONFLICT:${def.key}`);
      }
    }
    return ctx;
  }
  const save = ctx => {
    // Includes empty mappings and the first durable intent after a native await.
    guards.assertInScope(ctx.scope.root, ctx.scope);
    put(ctx.scope.root, ctx.ledgerKey, ctx.state);
  };
  const index = (ctx, kind, key) => `${PREFIX}${ctx.ns}-${kind}-${designSignature(key).slice(0, 24)}`;
  const marker = (ctx, kind, key) => `${PREFIX}${ctx.ns}:${kind}:${key}`;
  const entry = (ctx, kind, key) => readJson(ctx.scope.root, index(ctx, kind, key));
  function rememberResource(ctx, kind, key, value) {
    ctx[kind].set(key, value);
    const id = kind === 'images' ? value : value.id;
    // Match the original Map iteration's first result, including duplicate
    // image hashes. These indexes are rebuilt for every fresh operation.
    if (!ctx.resourceKeys[kind].has(id)) ctx.resourceKeys[kind].set(id, key);
  }
  function collectRawSnapshot(node, inherited = false) {
    const result = { type: node.type, name: node.name, parentKey: node.parent?.getPluginData?.(guards.specNodeKey) ?? '' };
    for (const field of ['x', 'y', 'width', 'height', 'visible', 'opacity', 'fills', 'strokes', 'strokeWeight', 'cornerRadius',
      'clipsContent', 'overflowDirection', 'numberOfFixedChildren', 'layoutPositioning', 'characters', 'fontName', 'fontSize',
      'lineHeight', 'letterSpacing', 'textAlignHorizontal', 'textAutoResize', 'vectorPaths', 'effects', 'strokeAlign', 'dashPattern']) {
      if (field in node) result[field] = safe(node[field]);
    }
    if ('textStyleId' in node) result.textStyleId = node.textStyleId;
    if (inherited) result.sourceKey = node.getPluginData(NODE_SOURCE);
    if ((node.type === 'INSTANCE' || inherited) && 'children' in node) result.instanceChildren = node.children.map(child => collectRawSnapshot(child, true));
    return result;
  }
  function semanticSnapshot(ctx, raw) {
    const result = { ...raw };
    for (const field of ['fills', 'strokes']) if (Array.isArray(result[field])) result[field] = result[field].map(p => {
      const paint = copy(p);
      if (paint.boundVariables?.color?.id) {
        paint.boundVariables.color.id = ctx.resourceKeys.variables.get(paint.boundVariables.color.id) ?? 'UNKNOWN';
      }
      if (paint.imageHash) {
        paint.imageHash = ctx.resourceKeys.images.get(paint.imageHash) ?? 'UNKNOWN';
      }
      return paint;
    });
    if ('textStyleId' in raw) {
      result.textStyleKey = raw.textStyleId ? ctx.resourceKeys.styles.get(raw.textStyleId) ?? 'UNKNOWN' : null;
      delete result.textStyleId;
    }
    if (raw.instanceChildren) result.instanceChildren = raw.instanceChildren.map(child => semanticSnapshot(ctx, child));
    return result;
  }
  const snapshot = (ctx, node, inherited = false) => semanticSnapshot(ctx, collectRawSnapshot(node, inherited));
  function checkNode(ctx, def, node) {
    guards.assertInScope(node, ctx.scope);
    guards.assertTaskOwned(node, ctx.ownership);
    ensure(node.getPluginData(NODE_INTENT) === designSignature(def), `DESIGN_INTENT_CONFLICT:${def.key}`);
    const expected = node.getPluginData(NODE_DIGEST);
    const raw = collectRawSnapshot(node);
    if (expected) ensure(expected === designSignature(semanticSnapshot(ctx, raw)), `DESIGN_USER_EDIT_CONFLICT:${def.key}`);
    if ('children' in node && node.type !== 'INSTANCE') {
      for (const child of node.children) {
        guards.assertTaskOwned(child, ctx.ownership);
        ensure(child.getPluginData(NODE_SPEC) === ctx.ns, `DESIGN_FOREIGN_CHILD:${def.key}`);
      }
    }
    return raw;
  }
  function checkExisting(ctx) {
    guards.assertInScope(ctx.scope.root, ctx.scope);
    for (const def of ctx.order) if (ctx.map.has(def.key)) {
      const node = ctx.map.get(def.key);
      // Both guards share one fresh raw read in this synchronous pass. Never
      // retain it across an await, write, operation or runtime restart.
      const raw = checkNode(ctx, def, node);
      checkReadback(ctx, def, node, raw);
    }
  }
  function checkReadback(ctx, def, node, raw) {
    const actual = raw ?? node;
    const p = def.props ?? {}, expected = { name: def.name ?? def.key, x: def.x, y: def.y };
    if (def.type !== 'TEXT' || !p.textAutoResize || p.textAutoResize === 'NONE') Object.assign(expected, { width: def.width, height: def.height });
    for (const field of ['strokeWeight', 'strokeAlign', 'dashPattern', 'cornerRadius', 'opacity', 'visible', 'clipsContent', 'characters', 'fontSize', 'lineHeight', 'letterSpacing', 'textAlignHorizontal', 'textAutoResize']) if (p[field] !== undefined) expected[field] = p[field];
    if (p.vectorPaths) expected.vectorPaths = normalizeVectorPaths(p.vectorPaths, { width: def.width, height: def.height });
    if (p.overflowDirection) expected.overflowDirection = OVERFLOW[p.overflowDirection];
    if (p.effects) expected.effects = p.effects.map(effect => ({ ...effect, blendMode: 'NORMAL', visible: effect.visible ?? true, spread: effect.spread ?? 0 }));
    if (p.fills) expected.fills = paints(ctx, p.fills);
    if (p.strokes) expected.strokes = paints(ctx, p.strokes);
    if (def.type === 'TEXT') {
      const requested = p.fontName ?? ctx.spec.textStyles.find(style => style.key === p.textStyleKey).fontName;
      expected.fontName = ctx.fonts.get(fontKey(requested));
      if (p.textStyleKey) expected.textStyleId = ctx.styles.get(p.textStyleKey)?.id;
    }
    for (const [field, value] of Object.entries(expected)) {
      const matched = field === 'vectorPaths' ? vectorPathsMatch(actual[field], value) : matchesExpected(actual[field], value);
      if (matched) continue;
      const error = new Error(`DESIGN_PROPERTY_READBACK_MISMATCH:${def.key}:${field}`);
      if (field === 'fills' || field === 'strokes') {
        const readback = { nodeKey: def.key, field, expected: safe(value), actual: safe(actual[field]) };
        error.readbackMismatch = JSON.stringify(readback).length <= 8192 ? readback : {
          nodeKey: def.key, field, status: 'NOT_VERIFIED_BUDGET_EXCEEDED', budgetCharacters: 8192,
        };
      }
      throw error;
    }
    if (def.type === 'INSTANCE' && p.overrides?.length) {
      const queue = [...(raw ? raw.instanceChildren ?? [] : node.children)], inherited = new Map();
      for (let i = 0; i < queue.length; i++) {
        const child = queue[i];
        inherited.set(raw ? child.sourceKey : child.getPluginData(NODE_SOURCE), child);
        const children = raw ? child.instanceChildren : child.children;
        if (children) queue.push(...children);
      }
      for (const override of p.overrides) {
        const child = inherited.get(override.sourceKey); ensure(child, `DESIGN_OVERRIDE_SOURCE_MISSING:${override.sourceKey}`);
        for (const field of ['characters', 'visible', 'fills']) if (override[field] !== undefined) ensure(matchesExpected(child[field], field === 'fills' ? paints(ctx, override.fills) : override[field]), `DESIGN_OVERRIDE_READBACK_MISMATCH:${def.key}:${override.sourceKey}:${field}`);
      }
    }
  }
  async function fonts(ctx, load) {
    const requested = [...(ctx.spec.textStyles ?? []).map(x => x.fontName), ...ctx.spec.nodes.filter(n => n.type === 'TEXT' && n.props.fontName).map(n => n.props.fontName)];
    const available = typeof figma.listAvailableFontsAsync === 'function' ? new Set((await figma.listAvailableFontsAsync()).map(x => fontKey(x.fontName))) : null;
    for (const requestedFont of requested) {
      const key = fontKey(requestedFont);
      if (ctx.fonts.has(key)) continue;
      let resolved = requestedFont;
      if (available && !available.has(key)) {
        ensure(ctx.spec.fontPolicy?.allowFallback, `DESIGN_FONT_MISSING:${requestedFont.family}/${requestedFont.style}`);
        resolved = ctx.spec.fontPolicy.fallback;
        ensure(available.has(fontKey(resolved)), `DESIGN_FALLBACK_FONT_MISSING:${resolved.family}/${resolved.style}`);
      }
      if (load) {
        try { await figma.loadFontAsync(resolved); }
        catch (error) {
          if (resolved !== requestedFont || !ctx.spec.fontPolicy?.allowFallback) throw error;
          resolved = ctx.spec.fontPolicy.fallback;
          await figma.loadFontAsync(resolved);
        }
      }
      ctx.fonts.set(key, copy(resolved));
      if (fontKey(resolved) !== key) ctx.substitutions.push({ requested: copy(requestedFont), used: copy(resolved) });
    }
  }
  async function readResources(ctx) {
    for (const asset of ctx.spec.assets ?? []) {
      const r = entry(ctx, 'image', asset.key);
      if (r) { ensure(r.signature === designSignature(asset), `DESIGN_ASSET_CONFLICT:${asset.key}`); rememberResource(ctx, 'images', asset.key, r.hash); }
    }
    for (const def of ctx.spec.textStyles ?? []) {
      const record = entry(ctx, 'style', def.key);
      if (!record) continue;
      let style = await figma.getStyleByIdAsync(record.id);
      if (!style || style.description !== marker(ctx, 'style', def.key)) {
        const matches = (await figma.getLocalTextStylesAsync()).filter(s => s.description === marker(ctx, 'style', def.key));
        ensure(matches.length === 1, `DESIGN_STYLE_MAPPING_AMBIGUOUS:${def.key}`); style = matches[0];
      }
      ensure(style && style.type === 'TEXT' && style.description === marker(ctx, 'style', def.key), `DESIGN_STYLE_OWNERSHIP_CONFLICT:${def.key}`);
      ensure(record.digest === designSignature(styleSnapshot(style)), `DESIGN_STYLE_USER_EDIT_CONFLICT:${def.key}`);
      rememberResource(ctx, 'styles', def.key, style);
    }
    const collectionRecord = entry(ctx, 'collection', 'colors');
    if (collectionRecord) {
      let collection = await figma.variables.getVariableCollectionByIdAsync(collectionRecord.id);
      if (!collection || collection.name !== collectionRecord.name) {
        const matches = (await figma.variables.getLocalVariableCollectionsAsync()).filter(c => c.name === collectionRecord.name);
        ensure(matches.length === 1, 'DESIGN_COLLECTION_MAPPING_AMBIGUOUS'); collection = matches[0];
      }
      ensure(collection.name === `Bridge/${ctx.ns}/Colors`, 'DESIGN_COLLECTION_OWNERSHIP_CONFLICT');
      if (collectionRecord.digest) ensure(collectionRecord.digest === designSignature(collectionSnapshot(collection)), 'DESIGN_COLLECTION_USER_EDIT_CONFLICT');
      ctx.collection = collection;
    }
    for (const def of ctx.spec.variables ?? []) {
      const record = entry(ctx, 'variable', def.key);
      if (!record) continue;
      let variable = await figma.variables.getVariableByIdAsync(record.id);
      if (!variable || variable.description !== marker(ctx, 'variable', def.key)) {
        const matches = (await figma.variables.getLocalVariablesAsync('COLOR')).filter(v => v.description === marker(ctx, 'variable', def.key));
        ensure(matches.length === 1, `DESIGN_VARIABLE_MAPPING_AMBIGUOUS:${def.key}`); variable = matches[0];
      }
      ensure(variable && variable.description === marker(ctx, 'variable', def.key), `DESIGN_VARIABLE_OWNERSHIP_CONFLICT:${def.key}`);
      ensure(ctx.collection && variable.variableCollectionId === ctx.collection.id, `DESIGN_VARIABLE_COLLECTION_CONFLICT:${def.key}`);
      ensure(record.digest === designSignature(variableSnapshot(variable)), `DESIGN_VARIABLE_USER_EDIT_CONFLICT:${def.key}`);
      rememberResource(ctx, 'variables', def.key, variable);
    }
  }
  const styleSnapshot = style => ({ name: style.name, fontName: safe(style.fontName), fontSize: style.fontSize, lineHeight: safe(style.lineHeight), letterSpacing: safe(style.letterSpacing) });
  const variableSnapshot = variable => ({ name: variable.name, resolvedType: variable.resolvedType, values: Object.values(variable.valuesByMode).map(safe) });
  const collectionSnapshot = collection => ({ name: collection.name, modes: (collection.modes ?? []).map(m => m.name), defaultMode: (collection.modes ?? []).findIndex(m => m.modeId === collection.defaultModeId) });
  function step(ctx, kind, key) {
    ensure(!ctx.state.pending, 'DESIGN_NEEDS_RECONCILIATION');
    ctx.state.pending = { kind, key, startedAt: new Date().toISOString(), operationId: ctx.message.operationId };
    save(ctx);
  }
  function finish(ctx) { ctx.state.pending = null; save(ctx); }
  async function resources(ctx) {
    const globalCount = (ctx.spec.textStyles?.length ?? 0) + (ctx.spec.variables?.length ?? 0);
    if (globalCount) ensure(ctx.payload.allowGlobalResources === true, 'DESIGN_GLOBAL_RESOURCES_AUTH_REQUIRED');
    for (const asset of ctx.spec.assets ?? []) {
      if (ctx.images.has(asset.key)) continue;
      step(ctx, 'image', asset.key);
      write(); const image = figma.createImage(decodeBase64(asset.dataBase64));
      rememberResource(ctx, 'images', asset.key, image.hash);
      put(ctx.scope.root, index(ctx, 'image', asset.key), { hash: image.hash, signature: designSignature(asset) });
      finish(ctx);
    }
    for (const def of ctx.spec.textStyles ?? []) {
      if (ctx.styles.has(def.key)) continue;
      step(ctx, 'style', def.key);
      write(); const style = figma.createTextStyle();
      ctx.state.pending.id = style.id; save(ctx);
      style.description = marker(ctx, 'style', def.key);
      style.name = `Bridge/${ctx.ns}/${def.name}`;
      style.fontName = copy(ctx.fonts.get(fontKey(def.fontName)));
      style.fontSize = def.fontSize;
      if (def.lineHeight) style.lineHeight = normalizeSpacing(def.lineHeight);
      if (def.letterSpacing) style.letterSpacing = copy(def.letterSpacing);
      ensure(matchesExpected(style, { name: `Bridge/${ctx.ns}/${def.name}`, fontName: ctx.fonts.get(fontKey(def.fontName)), fontSize: def.fontSize,
        ...(def.lineHeight ? { lineHeight: normalizeSpacing(def.lineHeight) } : {}), ...(def.letterSpacing ? { letterSpacing: def.letterSpacing } : {}) }), `DESIGN_STYLE_READBACK_MISMATCH:${def.key}`);
      put(ctx.scope.root, index(ctx, 'style', def.key), { id: style.id, digest: designSignature(styleSnapshot(style)) });
      rememberResource(ctx, 'styles', def.key, style); finish(ctx);
    }
    if (ctx.spec.variables?.length) {
      let record = entry(ctx, 'collection', 'colors');
      let collection = ctx.collection;
      if (record) {
        ensure(collection && collection.name === `Bridge/${ctx.ns}/Colors`, 'DESIGN_COLLECTION_OWNERSHIP_CONFLICT');
      } else {
        step(ctx, 'collection', 'colors');
        write(); collection = figma.variables.createVariableCollection(`Bridge/${ctx.ns}/Colors`);
        ctx.state.pending.id = collection.id; save(ctx);
        record = { id: collection.id, name: collection.name, digest: designSignature(collectionSnapshot(collection)) };
        ctx.collection = collection;
        put(ctx.scope.root, index(ctx, 'collection', 'colors'), record); finish(ctx);
      }
      for (const def of ctx.spec.variables) {
        if (ctx.variables.has(def.key)) continue;
        step(ctx, 'variable', def.key);
        write(); const variable = figma.variables.createVariable(`Bridge/${ctx.ns}/${def.name}`, collection, 'COLOR');
        ctx.state.pending.id = variable.id; save(ctx);
        variable.description = marker(ctx, 'variable', def.key);
        variable.setValueForMode(collection.defaultModeId, copy(def.value));
        ensure(matchesExpected(variable.valuesByMode[collection.defaultModeId], def.value), `DESIGN_VARIABLE_READBACK_MISMATCH:${def.key}`);
        put(ctx.scope.root, index(ctx, 'variable', def.key), { id: variable.id, digest: designSignature(variableSnapshot(variable)) });
        rememberResource(ctx, 'variables', def.key, variable); finish(ctx);
      }
    }
  }
  function paints(ctx, list) {
    return list.map(p => {
      if (p.type === 'IMAGE') return { type: 'IMAGE', imageHash: ctx.images.get(p.assetKey), scaleMode: p.scaleMode ?? 'FILL', ...(p.opacity === undefined ? {} : { opacity: p.opacity }) };
      if (p.type === 'GRADIENT_LINEAR') return { type: p.type, gradientTransform: copy(p.gradientTransform), gradientStops: copy(p.gradientStops), ...(p.opacity === undefined ? {} : { opacity: p.opacity }) };
      let paint = { type: 'SOLID', color: copy(p.color), ...(p.opacity === undefined ? {} : { opacity: p.opacity }) };
      if (p.variableKey) paint = figma.variables.setBoundVariableForPaint(paint, 'color', ctx.variables.get(p.variableKey));
      return paint;
    });
  }
  function ensureNewNodeImages(ctx, list) {
    const checked = new Set();
    for (const paint of list) {
      if (paint.type !== 'IMAGE' || checked.has(paint.assetKey)) continue;
      checked.add(paint.assetKey);
      const asset = ctx.spec.assets.find(asset => asset.key === paint.assetKey);
      const record = entry(ctx, 'image', paint.assetKey);
      ensure(asset && record && record.signature === designSignature(asset), `DESIGN_ASSET_CONFLICT:${paint.assetKey}`);
      ensure(record.hash === ctx.images.get(paint.assetKey), `DESIGN_IMAGE_HASH_CHANGED:${paint.assetKey}`);
      ensure(typeof figma.getImageByHash === 'function', 'DESIGN_IMAGE_API_UNAVAILABLE');
      if (figma.getImageByHash(record.hash)) continue;
      // The host can lose a previously created, unused image handle between
      // batches. Only this new node's pending mutation may recreate the exact
      // source. Never replace a ledger hash or repair existing nodes here.
      write(); const image = figma.createImage(decodeBase64(asset.dataBase64));
      ensure(image?.hash === record.hash, `DESIGN_IMAGE_HASH_CHANGED:${paint.assetKey}`);
      ensure(figma.getImageByHash(record.hash), `DESIGN_IMAGE_HANDLE_UNAVAILABLE:${paint.assetKey}`);
    }
  }
  async function createNode(ctx, def) {
    if (def.type === 'INSTANCE' && !ctx.preparedComponents.has(def.props.componentKey)) {
      // Fix the complete master subtree before cloning. Later finalization must
      // not alter inherited layer order after the instance digest is recorded.
      const queue = [ctx.spec.nodes.find(n => n.key === def.props.componentKey)];
      for (let i = 0; i < queue.length; i++) queue.push(...(ctx.children.get(queue[i].key) ?? []));
      for (const masterDef of queue.reverse()) orderChildren(ctx, masterDef);
      ctx.preparedComponents.add(def.props.componentKey);
    }
    step(ctx, 'node', def.key);
    const factory = { FRAME: 'createFrame', COMPONENT: 'createComponent', TEXT: 'createText', RECTANGLE: 'createRectangle', ELLIPSE: 'createEllipse', VECTOR: 'createVector' };
    write();
    const node = def.type === 'INSTANCE' ? ctx.map.get(def.props.componentKey).createInstance() : figma[factory[def.type]]();
    ctx.state.pending.id = node.id; save(ctx);
    guards.markTaskOwned(node, 'design-node', ctx.ownership, ctx.message.operationId);
    put(node, guards.specNodeKey, def.key);
    put(node, NODE_SPEC, ctx.ns);
    put(node, NODE_INTENT, designSignature(def));
    put(node, NODE_STATE, 'creating');
    const parent = def.parentKey ? ctx.map.get(def.parentKey) : ctx.scope.root;
    ensure(parent && ['PAGE', 'FRAME', 'COMPONENT'].includes(parent.type), 'DESIGN_PARENT_INVALID');
    guards.assertInScope(parent, ctx.scope);
    if (parent !== ctx.scope.root) guards.assertTaskOwned(parent, ctx.ownership);
    parent.appendChild(node);
    const p = def.props ?? {};
    node.name = def.name ?? def.key;
    if (def.type === 'TEXT') {
      const requested = p.fontName ?? ctx.spec.textStyles.find(x => x.key === p.textStyleKey).fontName;
      node.fontName = copy(ctx.fonts.get(fontKey(requested)));
      if (p.fontSize !== undefined) node.fontSize = p.fontSize;
      node.characters = p.characters;
      node.textAutoResize = 'NONE';
      if (p.lineHeight) node.lineHeight = normalizeSpacing(p.lineHeight);
      if (p.letterSpacing) node.letterSpacing = copy(p.letterSpacing);
      if (p.textAlignHorizontal) node.textAlignHorizontal = p.textAlignHorizontal;
      // Native typography setters detach a linked text style, even when their
      // values match. Bind last and let read-back reject conflicting overrides.
      if (p.textStyleKey) {
        await node.setTextStyleIdAsync(ctx.styles.get(p.textStyleKey).id);
        // The new node can be moved or ownership changed while the host awaits.
        // Do not continue its setters outside the parent authorized above.
        guards.assertInScope(node, ctx.scope);
        guards.assertTaskOwned(node, ctx.ownership);
        ensure(node.parent === parent, `DESIGN_NEW_NODE_PARENT_CONFLICT:${def.key}`);
        guards.assertInScope(parent, ctx.scope);
        if (parent !== ctx.scope.root) guards.assertTaskOwned(parent, ctx.ownership);
      }
    }
    if (p.vectorPaths) node.vectorPaths = normalizeVectorPaths(p.vectorPaths, { width: def.width, height: def.height });
    // Keep this check after text style awaits and immediately before each IMAGE
    // setter. paints() also serves read-only guards and must remain pure.
    if (p.fills) { ensureNewNodeImages(ctx, p.fills); node.fills = paints(ctx, p.fills); }
    else if (['FRAME', 'COMPONENT', 'RECTANGLE', 'ELLIPSE', 'VECTOR'].includes(def.type)) node.fills = [];
    if (p.strokes) { ensureNewNodeImages(ctx, p.strokes); node.strokes = paints(ctx, p.strokes); }
    if (p.dashPattern) { ensure('dashPattern' in node, `DESIGN_PROPERTY_UNSUPPORTED:${def.key}:dashPattern`); node.dashPattern = copy(p.dashPattern); }
    for (const field of ['strokeWeight', 'strokeAlign', 'cornerRadius', 'opacity', 'visible', 'clipsContent']) if (p[field] !== undefined) {
      ensure(field in node, `DESIGN_PROPERTY_UNSUPPORTED:${def.key}:${field}`); node[field] = p[field];
    }
    if (p.effects) node.effects = p.effects.map(effect => ({ ...copy(effect), blendMode: 'NORMAL', visible: effect.visible ?? true, spread: effect.spread ?? 0 }));
    if (p.overflowDirection !== undefined) node.overflowDirection = OVERFLOW[p.overflowDirection];
    if (p.layoutPositioning !== undefined && parent.layoutMode && parent.layoutMode !== 'NONE') node.layoutPositioning = p.layoutPositioning;
    if (typeof node.resizeWithoutConstraints === 'function') node.resizeWithoutConstraints(def.width, def.height);
    else node.resize(def.width, def.height);
    node.x = def.x; node.y = def.y;
    if (def.type === 'TEXT' && p.textAutoResize && p.textAutoResize !== 'NONE') node.textAutoResize = p.textAutoResize;
    if (def.type === 'INSTANCE') {
      const source = ctx.map.get(p.componentKey);
      const queue = node.children.map((child, i) => ({ child, source: source.children[i] }));
      const inherited = new Map();
      ensure(node.children.length === source.children.length, 'DESIGN_INSTANCE_STRUCTURE_MISMATCH');
      for (let i = 0; i < queue.length; i++) {
        const pair = queue[i];
        ensure(pair.source && pair.child.type === pair.source.type, 'DESIGN_INSTANCE_STRUCTURE_MISMATCH');
        const sourceKey = pair.source.getPluginData(guards.specNodeKey);
        guards.markTaskOwned(pair.child, 'design-instance-child', ctx.ownership, ctx.message.operationId);
        put(pair.child, guards.specNodeKey, `${def.key}/inherited/${i}`);
        put(pair.child, NODE_SOURCE, sourceKey);
        inherited.set(sourceKey, pair.child);
        if ('children' in pair.child) {
          ensure(pair.child.children.length === pair.source.children.length, 'DESIGN_INSTANCE_STRUCTURE_MISMATCH');
          queue.push(...pair.child.children.map((child, j) => ({ child, source: pair.source.children[j] })));
        }
      }
      for (const override of p.overrides ?? []) {
        const child = inherited.get(override.sourceKey);
        ensure(child, `DESIGN_OVERRIDE_SOURCE_MISSING:${override.sourceKey}`);
        if (override.characters !== undefined) { ensure(child.type === 'TEXT', 'DESIGN_OVERRIDE_TEXT_REQUIRED'); write(); child.characters = override.characters; }
        if (override.visible !== undefined) { write(); child.visible = override.visible; }
        if (override.fills !== undefined) { ensureNewNodeImages(ctx, override.fills); write(); child.fills = paints(ctx, override.fills); }
      }
    }
    ctx.map.set(def.key, node);
    ctx.idToKey.set(node.id, def.key);
    checkReadback(ctx, def, node);
    put(node, NODE_DIGEST, designSignature(snapshot(ctx, node)));
    put(node, NODE_STATE, 'complete');
    put(ctx.scope.root, index(ctx, 'n', def.key), { id: node.id });
    ctx.state.cursor += 1;
    finish(ctx);
  }
  function nativeReactions(ctx, def) {
    return (ctx.reactionDefs.get(def.key) ?? []).map(r => ({
      trigger: r.trigger.type === 'ON_CLICK' ? { type: 'ON_CLICK' } : { type: 'AFTER_TIMEOUT', timeout: r.trigger.delaySeconds * (ctx.timerUnit === 'milliseconds' ? 1000 : 1) },
      actions: [{ type: 'NODE', destinationId: ctx.map.get(r.destinationKey)?.id ?? 'MISSING', navigation: 'NAVIGATE', transition: null }],
    }));
  }
  const normalizedReactions = node => (node.reactions ?? []).map(r => ({ trigger: safe(r.trigger), actions: (r.actions ?? (r.action ? [r.action] : [])).map(a => a.type === 'NODE'
    ? { type: 'NODE', destinationId: a.destinationId, navigation: a.navigation, transition: safe(a.transition) } : safe(a)) }));
  const nodeKeys = (ctx, nodes) => nodes.map(node => ctx.idToKey.get(node.id) ?? 'FOREIGN');
  const semanticReactions = (ctx, node) => normalizedReactions(node).map(reaction => ({ ...reaction, actions: reaction.actions.map(action => {
    if (action.type !== 'NODE') return action;
    const { destinationId, ...rest } = action;
    return { ...rest, destinationKey: ctx.idToKey.get(destinationId) ?? 'UNKNOWN' };
  }) }));
  const semanticFlows = (ctx, flows) => flows.map(flow => ({ name: flow.name, nodeKey: ctx.idToKey.get(flow.nodeId) ?? 'UNKNOWN' }));
  const legacyKey = (ctx, id) => ctx.order.find(def => entry(ctx, 'n', def.key)?.id === id)?.key ?? 'UNKNOWN';
  const recordedOrder = (ctx, record) => record.keys ?? record.ids.map(id => legacyKey(ctx, id));
  const recordedFlows = (ctx, record) => record.version === 2 ? record.flows : record.flows.map(flow => ({ name: flow.name, nodeKey: legacyKey(ctx, flow.nodeId) }));
  function reactionDigest(ctx, node, record = { version: 2 }) {
    if (record.version === 2) return designSignature(semanticReactions(ctx, node));
    // Pre-v2 ledgers used raw IDs. Reconstruct those IDs from durable node records
    // during read-back so a reimport can still be verified without rewriting it.
    return designSignature(normalizedReactions(node).map(r => ({ ...r, actions: r.actions.map(a => {
      if (a.type !== 'NODE') return a;
      const key = ctx.idToKey.get(a.destinationId);
      return { ...a, destinationId: key ? entry(ctx, 'n', key)?.id ?? a.destinationId : a.destinationId };
    }) })));
  }
  function reactionTopFrame(ctx, node) {
    let top = node;
    while (top.parent && top.parent !== ctx.scope.page) top = top.parent;
    return top.parent === ctx.scope.page && top.type === 'FRAME' && ctx.idToKey.has(top.id) ? top : null;
  }
  function fullFlowSnapshot(ctx, flows) {
    return flows.map(flow => ({ name: flow.name, nodeKey: ctx.idToKey.get(flow.nodeId) ?? null,
      ...(ctx.idToKey.has(flow.nodeId) ? {} : { nodeId: flow.nodeId }) }));
  }
  function recordedFullFlows(ctx, flows) {
    ensure(Array.isArray(flows) && flows.length <= 1000, 'DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT');
    return flows.map(flow => {
      ensure(flow && typeof flow.name === 'string' && flow.name.length <= 256, 'DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT');
      if (flow.nodeKey !== null) {
        const node = ctx.map.get(flow.nodeKey);
        ensure(node?.type === 'FRAME' && node.parent === ctx.scope.page, 'DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT');
        guards.assertTaskOwned(node, ctx.ownership);
        return { name: flow.name, nodeKey: flow.nodeKey };
      }
      ensure(typeof flow.nodeId === 'string' && flow.nodeId.length <= 200, 'DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT');
      return { name: flow.name, nodeKey: null, nodeId: flow.nodeId };
    });
  }
  function singleFlowAppend(before, after, topKey) {
    return after.length === before.length + 1 && canonical(after.slice(0, -1)) === canonical(before) &&
      after[after.length - 1].name === `Flow ${before.length + 1}` && after[after.length - 1].nodeKey === topKey &&
      !before.some(flow => flow.nodeKey === topKey);
  }
  function nativeObservationEntries(ctx) {
    const observed = ctx.state.nativeFlowObservation;
    if (!observed) return [];
    ensure(observed.version === 1 || observed.version === 2 && Array.isArray(observed.entries) &&
      observed.entries.length > 0 && observed.entries.length <= 1000, 'DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT');
    return observed.version === 1 ? [observed] : observed.entries;
  }
  function validateNativeObservations(ctx) {
    let previous = null;
    for (const observed of nativeObservationEntries(ctx)) {
      const source = ctx.map.get(observed.sourceKey), def = ctx.definitions.get(observed.sourceKey);
      ensure(source && def, 'DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT');
      const raw = checkNode(ctx, def, source); checkReadback(ctx, def, source, raw);
      const top = reactionTopFrame(ctx, source), record = entry(ctx, 'reactions', observed.sourceKey);
      ensure(top && ctx.idToKey.get(top.id) === observed.topLevelKey && record?.digest === observed.reactionDigest &&
        reactionDigest(ctx, source, record) === observed.reactionDigest, 'DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT');
      guards.assertTaskOwned(top, ctx.ownership);
      const before = recordedFullFlows(ctx, observed.before), after = recordedFullFlows(ctx, observed.after);
      ensure(singleFlowAppend(before, after, observed.topLevelKey) &&
        (previous === null || canonical(previous) === canonical(before)), 'DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT');
      if (observed.version === 1) ensure(previous === null && before.length === 0 && after.length === 1, 'DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT');
      else if (observed.provenance === 'NATIVE_SETTER_READBACK') {
        const r = observed.reactionReadback;
        ensure(observed.version === 2 && r?.version === 1 && r.sourceKey === observed.sourceKey &&
          r.topLevelKey === observed.topLevelKey && r.digest === observed.reactionDigest &&
          r.operationId === observed.operationId && r.observedAt === observed.observedAt, 'DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT');
      } else {
        const r = observed.recovery, a = r?.explicitPayload;
        ensure(observed.version === 2 && observed.provenance === 'EXPLICIT_READBACK_ADOPTION' && observed.reactionReadback === null &&
          record.provenance === observed.provenance && r?.verification === 'CURRENT_STATE_ADOPTED_NOT_ORIGIN_PROVED' &&
          r.operationId === observed.operationId && r.observedAt === observed.observedAt &&
          r.legacyPending?.operationId === a?.pendingOperationId && r.legacyPending?.key === observed.sourceKey &&
          canonical(recordedFullFlows(ctx, r.legacyPending.flowBefore)) === canonical(before) &&
          r.expectedFlowSnapshotSignature === designSignature(after) && r.expectedReactionSnapshotSignature === observed.reactionDigest &&
          a.flowSnapshotSignature === r.expectedFlowSnapshotSignature && a.reactionSnapshotSignature === r.expectedReactionSnapshotSignature,
        'DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT');
      }
      previous = after;
    }
    return previous;
  }
  function appendNativeObservation(ctx, def, node, before, after, recovery = null) {
    const top = reactionTopFrame(ctx, node), topKey = top && ctx.idToKey.get(top.id);
    ensure(ctx.scope.root.type === 'PAGE' && top && (ctx.reactionDefs.get(def.key)?.length ?? 0) > 0,
      'DESIGN_NATIVE_FLOW_CHANGE_CONFLICT');
    guards.assertTaskOwned(top, ctx.ownership);
    const beforeSnapshot = recordedFullFlows(ctx, fullFlowSnapshot(ctx, before)), afterSnapshot = recordedFullFlows(ctx, fullFlowSnapshot(ctx, after));
    ensure(singleFlowAppend(beforeSnapshot, afterSnapshot, topKey), 'DESIGN_NATIVE_FLOW_CHANGE_CONFLICT');
    const prior = validateNativeObservations(ctx);
    ensure(prior ? canonical(prior) === canonical(beforeSnapshot) : !beforeSnapshot.some(flow => flow.nodeKey !== null),
      'DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT');
    const entries = nativeObservationEntries(ctx).map(copy), receipt = ctx.state.pending.reactionReadback;
    ensure(entries.length < 1000, 'DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT');
    if (!recovery) ensure(receipt?.sourceKey === def.key && receipt.sourceId === node.id && receipt.topLevelKey === topKey &&
      receipt.operationId === ctx.message.operationId && receipt.digest === reactionDigest(ctx, node), 'DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT');
    if (!entries.length && before.length === 0 && !recovery) {
      ctx.state.nativeFlowObservation = { version: 1, sourceKey: def.key, topLevelKey: topKey,
        before: beforeSnapshot, after: afterSnapshot, reactionDigest: receipt.digest,
        operationId: receipt.operationId, observedAt: receipt.observedAt };
    } else {
      entries.push({ version: 2, provenance: recovery ? 'EXPLICIT_READBACK_ADOPTION' : 'NATIVE_SETTER_READBACK',
        sourceKey: def.key, topLevelKey: topKey, before: beforeSnapshot, after: afterSnapshot, reactionDigest: reactionDigest(ctx, node),
        operationId: ctx.message.operationId, observedAt: recovery?.observedAt ?? receipt.observedAt,
        reactionReadback: recovery ? null : copy(receipt), ...(recovery ? { recovery } : {}) });
      ctx.state.nativeFlowObservation = { version: 2, entries };
    }
    save(ctx);
  }
  function checkFlowOwnership(ctx) {
    const own = semanticFlows(ctx, (ctx.scope.page.flowStartingPoints ?? []).filter(flow => ctx.idToKey.has(flow.nodeId)));
    const old = entry(ctx, 'flows', 'page');
    if (old) {
      ensure(canonical(recordedFlows(ctx, old)) === canonical(own), 'DESIGN_FLOW_USER_EDIT_CONFLICT');
      return;
    }
    const observed = ctx.state.nativeFlowObservation;
    if (observed) {
      if (observed.version === 2) {
        const after = validateNativeObservations(ctx);
        ensure(canonical(fullFlowSnapshot(ctx, ctx.scope.page.flowStartingPoints ?? [])) === canonical(after), 'DESIGN_FLOW_USER_EDIT_CONFLICT');
        return;
      }
      const source = ctx.map.get(observed.sourceKey);
      const record = entry(ctx, 'reactions', observed.sourceKey);
      ensure(observed.version === 1 && observed.before.length === 0 && observed.after.length === 1 &&
        observed.after[0].name === 'Flow 1' && observed.after[0].nodeKey === observed.topLevelKey &&
        source && ctx.idToKey.get(reactionTopFrame(ctx, source)?.id) === observed.topLevelKey &&
        record?.digest === observed.reactionDigest && reactionDigest(ctx, source) === observed.reactionDigest,
      'DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT');
      ensure(canonical(own) === canonical(observed.after), 'DESIGN_FLOW_USER_EDIT_CONFLICT');
      return;
    }
    const desired = (ctx.spec.flows ?? []).map(flow => ({ name: flow.name, nodeKey: flow.nodeKey }));
    // An old partial run has no before/after evidence. In particular, a flow
    // named "Flow 1" alone never grants permission to replace it.
    ensure(own.length === 0 || canonical(own) === canonical(desired), 'DESIGN_FLOW_CONFLICT');
  }
  async function setReactions(ctx, def, node, desired) {
    checkFlowOwnership(ctx);
    const before = copy(ctx.scope.page.flowStartingPoints ?? []);
    const top = reactionTopFrame(ctx, node);
    // A disconnected interaction can append a starting point even when flows
    // already exist. Require page scope before any nonempty native setter.
    if (desired.length) ensure(ctx.scope.root.type === 'PAGE' && top, 'DESIGN_NATIVE_FLOW_REQUIRES_PAGE_SCOPE');
    step(ctx, 'reactions', def.key);
    ctx.state.pending.flowBefore = before.map(flow => ({ name: flow.name, nodeKey: ctx.idToKey.get(flow.nodeId) ?? null, nodeId: flow.nodeId }));
    save(ctx);
    write(); await node.setReactionsAsync(desired);
    // The batch's earlier guard cannot cover edits during this native await.
    const raw = checkNode(ctx, def, node);
    checkReadback(ctx, def, node, raw);
    ensure(canonical(normalizedReactions(node)) === canonical(desired), `DESIGN_REACTION_READBACK_MISMATCH:${def.key}`);
    const after = copy(ctx.scope.page.flowStartingPoints ?? []);
    // Preserve the successful source readback even if the subsequent page-flow
    // guard rejects. This is diagnostic evidence, not an accepted flow receipt.
    ctx.state.pending.flowAfter = after.map(flow => ({ name: flow.name, nodeKey: ctx.idToKey.get(flow.nodeId) ?? null, nodeId: flow.nodeId }));
    ctx.state.pending.reactionReadback = { version: 1, sourceKey: def.key, sourceId: node.id,
      topLevelKey: top ? ctx.idToKey.get(top.id) : null, digest: reactionDigest(ctx, node),
      operationId: ctx.message.operationId, observedAt: new Date().toISOString() };
    save(ctx);
    if (canonical(after) !== canonical(before)) {
      // Two independent six-node native probes established this exact delta.
      // Preserve every prior entry; other changes remain rejected with receipts.
      appendNativeObservation(ctx, def, node, before, after);
    }
    put(ctx.scope.root, index(ctx, 'reactions', def.key), { version: 2, digest: reactionDigest(ctx, node) }); finish(ctx);
  }
  function orderChildren(ctx, def) {
    const node = ctx.map.get(def.key);
    // Called for every finalization node and before cloning master subtrees.
    // Always read fresh here; earlier nodes can have yielded to native setters.
    const raw = checkNode(ctx, def, node);
    checkReadback(ctx, def, node, raw);
    if (!('children' in node) || node.type === 'INSTANCE') return;
    const children = ctx.children.get(def.key) ?? [];
    const normal = children.filter(x => !x.props?.isFixed);
    const fixed = children.filter(x => x.props?.isFixed);
    const ordered = [...normal, ...fixed];
    if (fixed.length) ensure(def.props?.overflowDirection && def.props.overflowDirection !== 'NONE', `DESIGN_FIXED_REQUIRES_SCROLL_PARENT:${def.key}`);
    const wanted = ordered.map(x => x.key);
    const actual = nodeKeys(ctx, node.children);
    const previous = entry(ctx, 'order', def.key);
    if (previous) ensure(canonical(recordedOrder(ctx, previous)) === canonical(actual), `DESIGN_USER_LAYER_EDIT_CONFLICT:${def.key}`);
    if (canonical(wanted) !== canonical(actual) || fixed.length !== (node.numberOfFixedChildren ?? 0)) {
      step(ctx, 'order', def.key);
      for (const child of ordered) { write(); node.appendChild(ctx.map.get(child.key)); }
      if ('numberOfFixedChildren' in node) node.numberOfFixedChildren = fixed.length;
      ensure(canonical(nodeKeys(ctx, node.children)) === canonical(wanted), `DESIGN_LAYER_READBACK_MISMATCH:${def.key}`);
      put(node, NODE_DIGEST, designSignature(snapshot(ctx, node)));
      put(ctx.scope.root, index(ctx, 'order', def.key), { keys: wanted }); finish(ctx);
    } else if (!previous) put(ctx.scope.root, index(ctx, 'order', def.key), { keys: wanted });
  }
  async function finalize(ctx, budget) {
    if (ctx.state.finalized) return;
    checkFlowOwnership(ctx);
    const start = ctx.state.finalizeCursor ?? 0;
    for (const def of ctx.order.slice(start, start + budget)) {
      const node = ctx.map.get(def.key);
      orderChildren(ctx, def);
      const desired = nativeReactions(ctx, def);
      const actual = normalizedReactions(node);
      const previous = entry(ctx, 'reactions', def.key);
      if (previous) ensure(previous.digest === reactionDigest(ctx, node, previous), `DESIGN_REACTION_USER_EDIT_CONFLICT:${def.key}`);
      else ensure(actual.length === 0 || canonical(actual) === canonical(desired), `DESIGN_REACTION_CONFLICT:${def.key}`);
      if (canonical(actual) !== canonical(desired)) {
        await setReactions(ctx, def, node, desired);
      } else if (!previous) put(ctx.scope.root, index(ctx, 'reactions', def.key), { version: 2, digest: reactionDigest(ctx, node) });
      ctx.state.finalizeCursor = (ctx.state.finalizeCursor ?? 0) + 1;
      save(ctx);
    }
    if (ctx.state.finalizeCursor < ctx.order.length) return;
    const desiredFlows = (ctx.spec.flows ?? []).map(f => ({ nodeId: ctx.map.get(f.nodeKey).id, name: f.name }));
    const ids = new Set([...ctx.map.values()].map(n => n.id));
    const existingFlows = ctx.scope.page.flowStartingPoints ?? [];
    const own = existingFlows.filter(f => ids.has(f.nodeId));
    const old = entry(ctx, 'flows', 'page');
    checkFlowOwnership(ctx);
    if (canonical(own) !== canonical(desiredFlows)) {
      step(ctx, 'flows', 'page');
      write(); ctx.scope.page.flowStartingPoints = [...existingFlows.filter(f => !ids.has(f.nodeId)), ...desiredFlows];
      const readback = ctx.scope.page.flowStartingPoints.filter(f => ids.has(f.nodeId));
      ensure(canonical(readback) === canonical(desiredFlows), 'DESIGN_FLOW_READBACK_MISMATCH');
      put(ctx.scope.root, index(ctx, 'flows', 'page'), { version: 2, flows: semanticFlows(ctx, readback) }); finish(ctx);
    } else if (!old) put(ctx.scope.root, index(ctx, 'flows', 'page'), { version: 2, flows: semanticFlows(ctx, own) });
    ctx.state.finalized = true;
    ctx.state.complete = true;
    save(ctx);
  }
  async function reconcile(ctx) {
    const pending = ctx.state.pending;
    if (!pending) return;
    // Reconcile only a mutation proven complete by its durable read-back. An
    // interrupted setter is never automatically replayed against an unknown node.
    const kinds = { image: 'image', style: 'style', variable: 'variable', collection: 'collection', node: 'n', order: 'order', reactions: 'reactions', flows: 'flows' };
    const record = entry(ctx, kinds[pending.kind], pending.key);
    if (ctx.payload.adoptNativeFlow !== undefined) {
      const a = ctx.payload.adoptNativeFlow;
      ensure(ctx.payload.reconcile === true && pending.kind === 'reactions' && !record && a && typeof a === 'object' &&
        !Array.isArray(a) && Object.keys(a).length === 3 && ['pendingOperationId', 'flowSnapshotSignature', 'reactionSnapshotSignature'].every(key => Object.hasOwn(a, key)) &&
        typeof a.pendingOperationId === 'string' && a.pendingOperationId === pending.operationId &&
        typeof a.flowSnapshotSignature === 'string' && /^[a-f0-9]{64}$/.test(a.flowSnapshotSignature) &&
        typeof a.reactionSnapshotSignature === 'string' && /^[a-f0-9]{64}$/.test(a.reactionSnapshotSignature),
      'DESIGN_NATIVE_FLOW_ADOPTION_INVALID');
      const node = ctx.map.get(pending.key), def = ctx.definitions.get(pending.key);
      ensure(node && def && ctx.state.nativeFlowObservation, 'DESIGN_NATIVE_FLOW_ADOPTION_INVALID');
      const raw = checkNode(ctx, def, node); checkReadback(ctx, def, node, raw);
      const after = copy(ctx.scope.page.flowStartingPoints ?? []), beforeSnapshot = recordedFullFlows(ctx, pending.flowBefore);
      const before = beforeSnapshot.map(flow => ({ name: flow.name, nodeId: flow.nodeKey === null ? flow.nodeId : ctx.map.get(flow.nodeKey).id }));
      ensure(canonical(normalizedReactions(node)) === canonical(nativeReactions(ctx, def)) &&
        designSignature(fullFlowSnapshot(ctx, after)) === a.flowSnapshotSignature && reactionDigest(ctx, node) === a.reactionSnapshotSignature,
      'DESIGN_NATIVE_FLOW_ADOPTION_SNAPSHOT_CONFLICT');
      const recovery = { legacyPending: copy(pending), operationId: ctx.message.operationId, observedAt: new Date().toISOString(),
        expectedFlowSnapshotSignature: a.flowSnapshotSignature, expectedReactionSnapshotSignature: a.reactionSnapshotSignature,
        explicitPayload: copy(a), verification: 'CURRENT_STATE_ADOPTED_NOT_ORIGIN_PROVED' };
      appendNativeObservation(ctx, def, node, before, after, recovery);
      put(ctx.scope.root, index(ctx, 'reactions', pending.key), { version: 2, digest: reactionDigest(ctx, node), provenance: 'EXPLICIT_READBACK_ADOPTION' });
      finish(ctx); return;
    }
    ensure(record, `DESIGN_NEEDS_RECONCILIATION:${pending.kind}:${pending.key}`);
    if (pending.kind === 'node') {
      const def = ctx.order.find(n => n.key === pending.key);
      const node = ctx.map.get(pending.key);
      ensure(node && node.getPluginData(NODE_STATE) === 'complete', 'DESIGN_PENDING_NODE_NOT_COMPLETE');
      checkNode(ctx, def, node);
      ctx.state.cursor = ctx.order.filter(n => ctx.map.has(n.key)).length;
    }
    if (pending.kind === 'reactions') ensure(record.digest === reactionDigest(ctx, ctx.map.get(pending.key), record), 'DESIGN_PENDING_REACTION_CONFLICT');
    if (pending.kind === 'order') ensure(canonical(recordedOrder(ctx, record)) === canonical(nodeKeys(ctx, ctx.map.get(pending.key).children)), 'DESIGN_PENDING_LAYER_CONFLICT');
    if (pending.kind === 'flows') {
      const ids = new Set([...ctx.map.values()].map(n => n.id));
      ensure(canonical(recordedFlows(ctx, record)) === canonical(semanticFlows(ctx, ctx.scope.page.flowStartingPoints.filter(f => ids.has(f.nodeId)))), 'DESIGN_PENDING_FLOW_CONFLICT');
    }
    finish(ctx);
  }
  function checkpoint(ctx) { return { applied: ctx.map.size, total: ctx.spec.nodes.length, finalizedNodes: ctx.state.finalizeCursor ?? 0, pending: copy(ctx.state.pending), finalized: ctx.state.finalized === true }; }
  async function audit(ctx) {
    const errors = [];
    try { checkExisting(ctx); } catch (error) { errors.push(error.message); }
    const idToKey = new Map([...ctx.map].map(([key, node]) => [node.id, key]));
    const variablesById = new Map([...ctx.variables].map(([key, v]) => [v.id, key]));
    const stylesById = new Map([...ctx.styles].map(([key, s]) => [s.id, key]));
    const imagesByHash = new Map([...ctx.images].map(([key, hash]) => [hash, key]));
    function semanticPaint(p) {
      const r = { type: p.type, opacity: p.opacity ?? 1 };
      if (p.type === 'SOLID') { r.color = safe(p.color); if (p.boundVariables?.color) r.variableKey = variablesById.get(p.boundVariables.color.id) ?? 'UNKNOWN'; }
      else if (p.type === 'IMAGE') { r.assetKey = imagesByHash.get(p.imageHash) ?? 'UNKNOWN'; r.scaleMode = p.scaleMode; }
      else if (p.type === 'GRADIENT_LINEAR') { r.gradientTransform = safe(p.gradientTransform); r.gradientStops = safe(p.gradientStops); }
      return r;
    }
    const nodes = []; const reactions = [];
    for (const def of ctx.order) {
      const node = ctx.map.get(def.key);
      if (!node) { errors.push(`MISSING_NODE:${def.key}`); continue; }
      const s = snapshot(ctx, node); delete s.parentKey;
      if (node.type === 'TEXT') s.textStyleId = node.textStyleId;
      if (node.type === 'INSTANCE') {
        const component = await node.getMainComponentAsync();
        s.componentId = component?.id ?? null;
        if (idToKey.get(s.componentId) !== def.props.componentKey) errors.push(`INSTANCE_COMPONENT_MISMATCH:${def.key}`);
      }
      const props = {};
      for (const [key, value] of Object.entries(s)) if (!['type', 'name', 'x', 'y', 'width', 'height'].includes(key)) props[key] = value;
      if (Array.isArray(node.fills)) props.fills = node.fills.map(semanticPaint);
      if (Array.isArray(node.strokes)) props.strokes = node.strokes.map(semanticPaint);
      if ('textStyleId' in props) { if (props.textStyleId) props.textStyleKey = stylesById.get(props.textStyleId) ?? 'UNKNOWN'; delete props.textStyleId; }
      if ('componentId' in props) { props.componentKey = idToKey.get(props.componentId) ?? 'UNKNOWN'; delete props.componentId; }
      if ('overflowDirection' in props) props.overflowDirection = REVERSE_OVERFLOW[props.overflowDirection] ?? props.overflowDirection;
      const parentKey = node.parent === ctx.scope.root ? null : idToKey.get(node.parent?.id) ?? 'UNKNOWN';
      if (parentKey !== def.parentKey) errors.push(`PARENT_MISMATCH:${def.key}`);
      nodes.push({ key: def.key, id: node.id, type: node.type, name: node.name, parentKey, x: node.x, y: node.y, width: node.width, height: node.height, props,
        ...('children' in node && node.type !== 'INSTANCE' ? { childKeys: node.children.map(n => idToKey.get(n.id) ?? 'FOREIGN') } : {}) });
      const desired = nativeReactions(ctx, def);
      const actual = normalizedReactions(node);
      if (canonical(actual) !== canonical(desired)) errors.push(`REACTION_MISMATCH:${def.key}`);
      for (const r of actual) for (const a of r.actions) if (a.type === 'NODE') reactions.push({ sourceKey: def.key, destinationKey: idToKey.get(a.destinationId) ?? 'UNKNOWN', trigger: r.trigger.type === 'AFTER_TIMEOUT' ? { type: 'AFTER_TIMEOUT', delaySeconds: r.trigger.timeout / (ctx.timerUnit === 'milliseconds' ? 1000 : 1) } : r.trigger });
      if (node.type !== 'INSTANCE' && 'children' in node) {
        const children = ctx.children.get(def.key) ?? [];
        const expected = [...children.filter(n => !n.props?.isFixed), ...children.filter(n => n.props?.isFixed)].map(n => n.key);
        if (canonical(expected) !== canonical(node.children.map(n => idToKey.get(n.id)))) errors.push(`LAYER_ORDER_MISMATCH:${def.key}`);
      }
    }
    const flows = (ctx.scope.page.flowStartingPoints ?? []).filter(f => idToKey.has(f.nodeId)).map(f => ({ nodeKey: idToKey.get(f.nodeId), name: f.name }));
    if (canonical(flows) !== canonical(ctx.spec.flows ?? [])) errors.push('FLOW_MISMATCH');
    if (ctx.state.pending) errors.push('UNRESOLVED_PENDING_OPERATION');
    if (!ctx.state.complete) errors.push('DESIGN_NOT_COMPLETE');
    if (ctx.styles.size !== (ctx.spec.textStyles?.length ?? 0)) errors.push('TEXT_STYLE_COUNT_MISMATCH');
    if (ctx.variables.size !== (ctx.spec.variables?.length ?? 0)) errors.push('VARIABLE_COUNT_MISMATCH');
    return { schemaVersion: '1.0', runId: ctx.payload.runId, specId: ctx.spec.id, specSignature: ctx.signature,
      collectedAt: new Date().toISOString(), fileIdentity: { fileKey: figma.fileKey }, scope: { pageId: ctx.scope.page.id, rootNodeId: ctx.scope.root.id },
      status: errors.length ? 'FAIL' : 'PASS', writes: 0, errors, nodes, reactions, flows,
      counts: { nodes: nodes.length, texts: nodes.filter(n => n.type === 'TEXT').length, components: nodes.filter(n => n.type === 'COMPONENT').length, instances: nodes.filter(n => n.type === 'INSTANCE').length, reactions: reactions.length, flows: flows.length, textStyles: ctx.styles.size, variables: ctx.variables.size },
      textStyles: [...ctx.styles].map(([key, style]) => ({ key, ...styleSnapshot(style), name: ctx.spec.textStyles.find(s => s.key === key).name })),
      variables: [...ctx.variables].map(([key, variable]) => ({ key, name: ctx.spec.variables.find(v => v.key === key).name, value: Object.values(variable.valuesByMode)[0] })),
      fontSubstitutions: ctx.substitutions, timerUnit: ctx.timerUnit, playback: 'NOT VERIFIED', checkpoint: checkpoint(ctx) };
  }
  function auditPage(ctx, report) {
    const offset = ctx.payload.auditOffset ?? 0, limit = ctx.payload.auditLimit ?? 1000;
    ensure(Number.isInteger(offset) && offset >= 0 && offset <= 25000 && offset <= report.nodes.length, 'DESIGN_AUDIT_OFFSET_INVALID');
    ensure(Number.isInteger(limit) && limit >= 1 && limit <= 2000, 'DESIGN_AUDIT_LIMIT_INVALID');
    const { collectedAt: _collectedAt, ...stableReport } = report;
    const result = { ...report, nodes: report.nodes.slice(offset, offset + limit), page: { offset, limit, totalNodes: report.nodes.length,
      nextOffset: offset + limit < report.nodes.length ? offset + limit : null, snapshotSignature: designSignature(stableReport) } };
    ensure(utf8ToBytes(JSON.stringify(result)).byteLength < 7 * 1024 * 1024, 'DESIGN_AUDIT_RESPONSE_BUDGET_EXCEEDED: reduce auditLimit or split the specification');
    return result;
  }
  async function execute(message) {
    ensure(!busy, 'DESIGN_RUNTIME_BUSY'); busy = true;
    try {
      const ctx = await context(message);
      if (ctx.payload.adoptNativeFlow !== undefined) ensure(message.command === 'scope_design_apply' &&
        ctx.payload.reconcile === true && ctx.state.pending?.kind === 'reactions', 'DESIGN_NATIVE_FLOW_ADOPTION_INVALID');
      await fonts(ctx, message.command === 'scope_design_apply');
      await readResources(ctx);
      if (message.command === 'scope_design_audit') return auditPage(ctx, await audit(ctx));
      checkExisting(ctx);
      if (message.command === 'scope_design_plan') return { status: ctx.state.pending ? 'NEEDS_RECONCILIATION' : 'PLANNED', writes: 0,
        specId: ctx.spec.id, specSignature: ctx.signature, runId: ctx.payload.runId, checkpoint: checkpoint(ctx), fontSubstitutions: ctx.substitutions,
        globalResources: { textStyles: ctx.spec.textStyles?.length ?? 0, variables: ctx.spec.variables?.length ?? 0, requiresExplicitAuthorization: Boolean(ctx.spec.textStyles?.length || ctx.spec.variables?.length) }, timerUnit: ctx.timerUnit, playback: 'NOT VERIFIED' };
      if (message.command === 'scope_design_export_png') {
        const node = ctx.map.get(ctx.payload.nodeKey);
        ensure(node, 'DESIGN_EXPORT_NODE_MISSING');
        guards.assertTaskOwnedSubtree(node, ctx.ownership);
        const scale = ctx.payload.scale ?? 1;
        ensure(Number.isFinite(scale) && scale >= 1 && scale <= 4, 'DESIGN_EXPORT_SCALE_INVALID');
        const bytes = await node.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: scale } });
        return { status: 'PASS', writes: 0, runId: ctx.payload.runId, specId: ctx.spec.id, nodeKey: ctx.payload.nodeKey, width: node.width, height: node.height, scale, bytesBase64: encodeBase64(bytes), sha256: bytesToHex(sha256(bytes)), fileIdentity: { fileKey: figma.fileKey } };
      }
      ensure(message.command === 'scope_design_apply', 'DESIGN_COMMAND_INVALID');
      const batchSize = ctx.payload.batchSize ?? 100;
      ensure(Number.isInteger(batchSize) && batchSize >= 1 && batchSize <= 500, 'DESIGN_BATCH_SIZE_INVALID');
      if (ctx.spec.textStyles?.length || ctx.spec.variables?.length) ensure(ctx.payload.allowGlobalResources === true, 'DESIGN_GLOBAL_RESOURCES_AUTH_REQUIRED');
      if (ctx.state.pending) {
        if (ctx.payload.reconcile !== true) return { status: 'NEEDS_RECONCILIATION', runId: ctx.payload.runId, specId: ctx.spec.id, checkpoint: checkpoint(ctx), nextAction: 'audit' };
        await reconcile(ctx);
      }
      if (ctx.state.complete) { const report = await audit(ctx); ensure(report.status === 'PASS', `DESIGN_COMPLETED_DRIFT:${report.errors.join(',')}`); return { status: 'COMPLETE', runId: ctx.payload.runId, specId: ctx.spec.id, checkpoint: checkpoint(ctx), nextAction: 'audit', idempotent: true }; }
      if (ctx.scope.root.type !== 'PAGE') guards.assertTaskOwned(ctx.scope.root, ctx.ownership);
      if ((ctx.spec.flows?.length ?? 0) > 0) ensure(ctx.scope.root.type === 'PAGE', 'DESIGN_FLOW_REQUIRES_PAGE_SCOPE');
      if (figma.currentPage.id !== ctx.scope.page.id) await figma.setCurrentPageAsync(ctx.scope.page);
      try {
        // Reject stale flow evidence before the first checkpoint write. Each
        // native setter and finalization still performs its fresh boundary check.
        checkFlowOwnership(ctx);
        save(ctx);
        await resources(ctx);
        let created = 0;
        for (const def of ctx.order) {
          if (ctx.map.has(def.key)) continue;
          await createNode(ctx, def); created += 1;
          if (created >= batchSize) break;
        }
        if (ctx.map.size === ctx.spec.nodes.length && created < batchSize) await finalize(ctx, batchSize - created);
        return { status: ctx.state.complete ? 'COMPLETE' : 'IN_PROGRESS', runId: ctx.payload.runId, specId: ctx.spec.id, checkpoint: checkpoint(ctx),
          nextAction: ctx.state.complete ? 'audit' : 'apply-next-batch', fontSubstitutions: ctx.substitutions, nodeMap: Object.fromEntries([...ctx.map].map(([k, n]) => [k, n.id])) };
      } catch (error) {
        return { status: 'PARTIAL_FAILURE', runId: ctx.payload.runId, specId: ctx.spec.id, checkpoint: checkpoint(ctx), nextAction: 'audit',
          error: String(error.message).slice(0, 500), replay: 'PROHIBITED_UNTIL_READBACK_RECONCILIATION',
          ...(error.readbackMismatch ? { readbackMismatch: error.readbackMismatch } : {}) };
      }
    } finally { busy = false; }
  }
  return { execute };
}
