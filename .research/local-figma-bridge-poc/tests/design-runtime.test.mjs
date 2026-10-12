import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createDesignRuntime, utf8ToBytes, designSignature, canonical } from '../plugin/design-runtime.mjs';
import { createHash } from 'node:crypto';
import { compareAudits, validateAudit } from '../delivery/verify.mjs';
import { normalizeSvgPath, svgPathSegments, normalizeVectorPaths, vectorPathsMatch } from '../plugin/vector-paths.mjs';

// Contract tests use an explicit Figma API double. They do not prove real-host
// layout, timing, playback, font rendering or native .fig export/import.
test('sandbox UTF-8 and signatures match Node for Chinese, emoji and lone surrogates', () => {
  for (const text of ['', 'ASCII\u0000', '古籍校对', 'éΩ', '😀𠀀', '\ud800', '\udfff']) {
    assert.deepEqual(Buffer.from(utf8ToBytes(text)), Buffer.from(text));
    assert.equal(designSignature({ text }), createHash('sha256').update(canonical({ text })).digest('hex'));
  }
});

function fixture({ automaticFlow = false, reactionHook, nativeVectors = false, vectorReadback = value => value,
  boundPaintAlphaReadback = false, paintReadback = value => value, propertyReadHook, fontListHook,
  imageLifecycle = false, imageCreateHook, textStyleHook, frameRoot = false } = {}) {
  let next = 1; let writes = 0; let failText = false;
  const nodes = new Map(), styles = new Map(), variables = new Map(), collections = new Map();
  const images = new Map(), imageCreates = [];
  function make(type, parent) {
    const data = new Map();
    const node = { id: `1:${next++}`, type, name: type, parent, width: 100, height: 100, x: 0, y: 0,
      fills: [], strokes: [], strokeWeight: 1, strokeAlign: 'CENTER', dashPattern: [], opacity: 1, visible: true, reactions: [], cornerRadius: 0, effects: [],
      getPluginData(k) { return data.get(k) ?? ''; }, setPluginData(k, v) { data.set(k, v); },
      appendChild(child) { if (child.parent) child.parent.children = child.parent.children.filter(x => x !== child); child.parent = node; node.children.push(child); },
      resizeWithoutConstraints(width, height) { node.width = width; node.height = height; },
      async setReactionsAsync(reactions) {
        node.reactions = structuredClone(reactions);
        if (automaticFlow && reactions.length && page.flowStartingPoints.length === 0) {
          let top = node;
          while (top.parent && top.parent !== page) top = top.parent;
          if (top.parent === page && top.type === 'FRAME') page.flowStartingPoints = [{ nodeId: top.id, name: 'Flow 1' }];
        }
        await reactionHook?.({ node, page, reactions });
      },
      async exportAsync() { return Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]); },
    };
    for (const field of ['fills', 'strokes']) {
      let value = [];
      Object.defineProperty(node, field, { enumerable: true, get() { propertyReadHook?.(node, field); return value; }, set(paints) {
        if (imageLifecycle) for (const paint of paints) if (paint.type === 'IMAGE' && !images.has(paint.imageHash)) {
          throw new Error('HOST_IMAGE_HANDLE_UNAVAILABLE');
        }
        value = paintReadback(structuredClone(paints).map(paint => {
          const variable = variables.get(paint.boundVariables?.color?.id);
          if (boundPaintAlphaReadback && variable) {
            const resolved = Object.values(variable.valuesByMode)[0];
            paint.opacity = resolved.a;
          }
          return paint;
        }), field);
      } });
    }
    if (['PAGE', 'FRAME', 'COMPONENT', 'INSTANCE'].includes(type)) {
      Object.assign(node, { children: [], clipsContent: false, numberOfFixedChildren: 0, layoutMode: 'NONE' });
      let overflowDirection = 'NONE';
      Object.defineProperty(node, 'overflowDirection', { enumerable: true, get: () => overflowDirection,
        set(value) { assert.ok(['NONE', 'HORIZONTAL', 'VERTICAL', 'BOTH'].includes(value), 'native OverflowDirection enum'); overflowDirection = value; } });
    }
    if (type === 'PAGE') node.flowStartingPoints = [];
    if (type === 'VECTOR' && nativeVectors) {
      let paths = [];
      Object.defineProperty(node, 'vectorPaths', { enumerable: true, get: () => paths, set(value) {
        for (const path of value) {
          const unsupported = path.data.match(/[a-df-z]/gi)?.find(command => !'MLQCZ'.includes(command));
          if (unsupported) throw new Error(`Invalid command at ${unsupported}`);
        }
        paths = vectorReadback(structuredClone(value));
      } });
    }
    if (type === 'TEXT') Object.assign(node, { fontName: { family: 'Inter', style: 'Regular' }, fontSize: 12,
      lineHeight: { unit: 'AUTO' }, letterSpacing: { unit: 'PIXELS', value: 0 }, textAlignHorizontal: 'LEFT', textAutoResize: 'NONE', textStyleId: '',
      async setTextStyleIdAsync(id) { const s = styles.get(id); Object.assign(node, { fontName: s.fontName, fontSize: s.fontSize, lineHeight: s.lineHeight, letterSpacing: s.letterSpacing }); node.textStyleId = id; await textStyleHook?.({ node, images }); } });
    if (type === 'TEXT') {
      let fontName = node.fontName;
      Object.defineProperty(node, 'fontName', { enumerable: true, get() { propertyReadHook?.(node, 'fontName'); return fontName; },
        set(value) { fontName = value; node.textStyleId = ''; } });
    }
    if (type === 'TEXT') { let text = ''; Object.defineProperty(node, 'characters', { enumerable: true, get() { return text; }, set(v) { if (failText) throw new Error('SYNTHETIC_SETTER_FAILURE'); text = v; } }); }
    if (propertyReadHook) for (const field of ['name', 'x', 'y', 'width', 'height']) {
      let value = node[field];
      Object.defineProperty(node, field, { enumerable: true, get() { propertyReadHook(node, field); return value; }, set(next) { value = next; } });
    }
    if (type === 'COMPONENT') node.createInstance = () => {
      const instance = make('INSTANCE', page); instance.getMainComponentAsync = async () => node;
      const cloneChildren = (source, target) => { for (const child of source.children) {
        const clone = make(child.type, target);
        for (const [prop, value] of Object.entries(child)) if (!['id', 'parent', 'children'].includes(prop) && typeof value !== 'function') clone[prop] = structuredClone(value);
        if (child.type === 'INSTANCE') clone.getMainComponentAsync = child.getMainComponentAsync;
        if (child.children) cloneChildren(child, clone);
      } };
      cloneChildren(node, instance); return instance;
    };
    nodes.set(node.id, node); parent?.children.push(node); return node;
  }
  const page = make('PAGE');
  const scopeRoot = frameRoot ? make('FRAME', page) : page;
  if (frameRoot) scopeRoot.setPluginData('owner', 'task-test');
  const figma = { root: { children: [page] }, fileKey: 'file-original', currentPage: page,
    async getNodeByIdAsync(id) { return nodes.get(id) ?? null; }, async setCurrentPageAsync(p) { figma.currentPage = p; },
    async listAvailableFontsAsync() { await fontListHook?.(); return ['Inter', 'Noto Sans SC'].map(family => ({ fontName: { family, style: 'Regular' } })); },
    async loadFontAsync() {},
    createFrame: () => make('FRAME', page), createText: () => make('TEXT', page), createRectangle: () => make('RECTANGLE', page),
    createEllipse: () => make('ELLIPSE', page), createVector: () => make('VECTOR', page), createComponent: () => make('COMPONENT', page),
    createImage(bytes) {
      imageCreates.push(Buffer.from(bytes));
      const defaultHash = `image-${bytes.length}`;
      const image = { hash: imageCreateHook?.({ bytes, defaultHash, images }) ?? defaultHash };
      images.set(image.hash, image); return image;
    },
    getImageByHash(hash) { return images.get(hash) ?? null; },
    createTextStyle() { const s = { id: `s:${next++}`, type: 'TEXT', name: '', description: '', fontName: {}, fontSize: 12, lineHeight: { unit: 'AUTO' }, letterSpacing: { unit: 'PIXELS', value: 0 } }; styles.set(s.id, s); return s; },
    async getStyleByIdAsync(id) { return styles.get(id) ?? null; }, async getLocalTextStylesAsync() { return [...styles.values()]; },
    variables: {
      createVariableCollection(name) { const c = { id: `c:${next++}`, name, defaultModeId: 'mode:1', modes: [{ modeId: 'mode:1', name: 'Mode 1' }] }; collections.set(c.id, c); return c; },
      createVariable(name, collection, resolvedType) { const v = { id: `v:${next++}`, name, description: '', resolvedType, variableCollectionId: collection.id, valuesByMode: {}, setValueForMode(id, value) { this.valuesByMode[id] = value; } }; variables.set(v.id, v); return v; },
      async getVariableByIdAsync(id) { return variables.get(id) ?? null; }, async getLocalVariablesAsync() { return [...variables.values()]; },
      async getVariableCollectionByIdAsync(id) { return collections.get(id) ?? null; },
      async getLocalVariableCollectionsAsync() { return [...collections.values()]; },
      setBoundVariableForPaint(p, field, v) { return { ...p, boundVariables: { [field]: { type: 'VARIABLE_ALIAS', id: v.id } } }; },
    },
  };
  function assertCurrentRootScope() {
    if (scopeRoot.removed) throw new Error('SCOPE_ROOT_NOT_FOUND');
    let rootPage = scopeRoot;
    while (rootPage && rootPage.type !== 'PAGE') rootPage = rootPage.parent;
    if (rootPage !== page) throw new Error('SCOPE_ROOT_PAGE_MISMATCH');
  }
  const guards = {
    async resolveScope(scope) { assert.equal(scope.fileIdentity, `figma-file:${figma.fileKey}`); assert.equal(scope.rootNodeId, scopeRoot.id); assertCurrentRootScope(); return { page, root: scopeRoot }; },
    assertTrustedOwnership(owner) { assert.equal(owner.taskId, 'task-test'); },
    assertInScope(node) { assertCurrentRootScope(); assert.ok(node && !node.removed, 'scope violation'); let p = node; while (p && p !== scopeRoot) p = p.parent; assert.equal(p, scopeRoot, 'scope violation'); },
    assertTaskOwned(node, owner) { assert.equal(node.getPluginData('owner'), owner.taskId, 'foreign ownership'); },
    assertTaskOwnedSubtree(node, owner) { this.assertTaskOwned(node, owner); for (const child of node.children ?? []) this.assertTaskOwnedSubtree(child, owner); },
    markTaskOwned(node, role, owner) { node.setPluginData('owner', owner.taskId); node.setPluginData('role', role); },
    specNodeKey: 'node-key', onMutation() { writes += 1; },
  };
  let runtime = createDesignRuntime(figma, guards);
  const run = (command, spec, options = {}) => runtime.execute({ command, payload: { spec, runId: 'run-test', ...options },
    operationId: 'op-test-12345678', trustedOwnership: { workspaceId: 'workspace-test', taskId: 'task-test', revision: '1' },
    trustedScope: { fileIdentity: `figma-file:${figma.fileKey}`, rootNodeId: scopeRoot.id, pageId: page.id } });
  return { figma, page, scopeRoot, run, nodes, styles, variables, collections, images, imageCreates, make, writes: () => writes,
    reimport() {
      const ids = new Map();
      for (const map of [nodes, styles, variables, collections]) {
        const values = [...map.values()]; map.clear();
        for (const value of values) { const id = `imported:${next++}`; ids.set(value.id, id); value.id = id; map.set(id, value); }
      }
      for (const node of nodes.values()) {
        if (node.textStyleId) node.textStyleId = ids.get(node.textStyleId);
        for (const paint of [...node.fills, ...node.strokes]) if (paint.boundVariables?.color) paint.boundVariables.color.id = ids.get(paint.boundVariables.color.id);
        for (const reaction of node.reactions) for (const action of reaction.actions) if (action.destinationId) action.destinationId = ids.get(action.destinationId);
        if (node.flowStartingPoints) node.flowStartingPoints = node.flowStartingPoints.map(f => ({ ...f, nodeId: ids.get(f.nodeId) }));
      }
      for (const collection of collections.values()) {
        for (const mode of collection.modes) { const id = `imported-mode:${next++}`; ids.set(mode.modeId, id); mode.modeId = id; }
        collection.defaultModeId = ids.get(collection.defaultModeId);
      }
      for (const variable of variables.values()) { variable.variableCollectionId = ids.get(variable.variableCollectionId); variable.valuesByMode = Object.fromEntries(Object.entries(variable.valuesByMode).map(([id, value]) => [ids.get(id), value])); }
      figma.fileKey = 'file-imported'; runtime = createDesignRuntime(figma, guards);
    },
    reload() { runtime = createDesignRuntime(figma, guards); }, failText(value) { failText = value; } };
}
const n = (key, type, parentKey = null, props = {}) => ({ key, type, name: key, parentKey, x: 10, y: 12, width: 200, height: 120, props });
// Exact path from the immutable 55-scene mapping spec, shape 6c46eebfb3db7cfb98ca.
const nativeArcPath = 'M 10.732848459 11.432848459 A 6.5 6.5 0 1 1 11.432848459 10.732848459 L 14.852848459 14.132848459 A 0.5 0.5 0 0 1 14.222848459 14.902848459 L 14.152848459 14.842848459 L 10.732848459 11.432848459 Z M 10.022848459 10.722848459 A 5.54 5.54 0 0 0 12.002848459 6.492848459 A 5.5 5.5 0 1 0 10.022848459 10.722848459 Z';
function spec() { return { schemaVersion: '1.0', id: 'example', name: 'Example',
  nodes: [n('start', 'FRAME'), n('done', 'FRAME'), n('label', 'TEXT', 'start', { characters: 'Editable 中文', fontName: { family: 'Inter', style: 'Regular' }, fontSize: 16 })],
  reactions: [{ sourceKey: 'start', destinationKey: 'done', trigger: { type: 'ON_CLICK' } }, { sourceKey: 'done', destinationKey: 'start', trigger: { type: 'AFTER_TIMEOUT', delaySeconds: 1 } }],
  flows: [{ nodeKey: 'start', name: 'Default' }, { nodeKey: 'done', name: 'Compact' }] }; }
async function complete(f, s, options = {}) {
  let result;
  for (let i = 0; i < 100; i++) { result = await f.run('scope_design_apply', s, options); if (result.status !== 'IN_PROGRESS') break; }
  assert.equal(result.status, 'COMPLETE', JSON.stringify(result)); return result;
}

function rootScopeSpec() {
  const s = spec(); s.reactions = []; s.flows = []; return s;
}

function ledgerKey(s) {
  const ns = designSignature({ workspace: 'workspace-test', task: 'task-test', spec: s.id }).slice(0, 24);
  return `bridge-design-v1-${ns}-ledger`;
}

test('normal PAGE and FRAME roots complete and audit without weakening scope', async () => {
  for (const frameRoot of [false, true]) {
    const f = fixture({ frameRoot }), s = rootScopeSpec();
    await complete(f, s);
    assert.equal((await f.run('scope_design_audit', s)).status, 'PASS');
    assert.equal([...f.nodes.values()].find(node => node.name === 'start').parent, f.scopeRoot);
  }
});

test('initial font await rejects a moved or removed FRAME root before any generation write', async () => {
  for (const change of ['moved', 'removed']) {
    let f;
    f = fixture({ frameRoot: true, async fontListHook() {
      await Promise.resolve();
      if (change === 'moved') otherPage.appendChild(f.scopeRoot);
      else f.scopeRoot.removed = true;
    } });
    const otherPage = f.make('PAGE'), s = rootScopeSpec(), beforeNodes = f.nodes.size;
    await assert.rejects(f.run('scope_design_apply', s), change === 'moved' ? /SCOPE_ROOT_PAGE_MISMATCH/ : /SCOPE_ROOT_NOT_FOUND/);
    assert.equal(f.writes(), 0, 'an empty mapping cannot bypass current root scope validation');
    assert.equal(f.nodes.size, beforeNodes, 'no native node is created after the root leaves scope');
    assert.equal(f.scopeRoot.getPluginData(ledgerKey(s)), '', 'no ledger or pending intent is written out of scope');
  }
});

test('page switch await rejects a moved FRAME root before writing the initial checkpoint', async () => {
  const f = fixture({ frameRoot: true }), s = rootScopeSpec(), otherPage = f.make('PAGE');
  const beforeNodes = f.nodes.size;
  f.figma.currentPage = otherPage;
  f.figma.setCurrentPageAsync = async page => {
    f.figma.currentPage = page;
    await Promise.resolve(); otherPage.appendChild(f.scopeRoot);
  };
  const result = await f.run('scope_design_apply', s);
  assert.equal(result.status, 'PARTIAL_FAILURE'); assert.match(result.error, /SCOPE_ROOT_PAGE_MISMATCH/);
  assert.equal(f.writes(), 0); assert.equal(f.nodes.size, beforeNodes);
  assert.equal(f.scopeRoot.getPluginData(ledgerKey(s)), '');
});

test('native text style await preserves pending intent and performs no later writes after a FRAME root moves or is removed', async () => {
  for (const change of ['moved', 'removed']) {
    let f, writesAtChange, ledgerAtChange;
    const s = rootScopeSpec();
    s.textStyles = [{ key: 'body', name: 'Body', fontName: { family: 'Inter', style: 'Regular' }, fontSize: 16 }];
    s.nodes[2].props = { characters: 'Editable 中文', textStyleKey: 'body',
      fills: [{ type: 'SOLID', color: { r: 0, g: 1, b: 0 } }] };
    f = fixture({ frameRoot: true, async textStyleHook() {
      await Promise.resolve();
      if (change === 'moved') otherPage.appendChild(f.scopeRoot);
      else f.scopeRoot.removed = true;
      writesAtChange = f.writes(); ledgerAtChange = f.scopeRoot.getPluginData(ledgerKey(s));
    } });
    const otherPage = f.make('PAGE');
    const result = await f.run('scope_design_apply', s, { allowGlobalResources: true });
    assert.equal(result.status, 'PARTIAL_FAILURE');
    assert.match(result.error, change === 'moved' ? /SCOPE_ROOT_PAGE_MISMATCH/ : /SCOPE_ROOT_NOT_FOUND/);
    assert.equal(f.writes(), writesAtChange, 'native await must not authorize any subsequent mutation');
    assert.equal(f.scopeRoot.getPluginData(ledgerKey(s)), ledgerAtChange, 'the durable pending receipt is preserved verbatim');
    assert.equal(result.checkpoint.pending.kind, 'node'); assert.equal(result.checkpoint.pending.key, 'label');
    assert.equal(result.checkpoint.finalized, false);
    const label = [...f.nodes.values()].find(node => node.name === 'label');
    assert.equal(label.getPluginData('bridge-design-v1-state'), 'creating');
    assert.deepEqual(label.fills, [], 'no paint setter runs after the native await');
    assert.equal(label.width, 100); assert.equal(label.x, 0, 'no geometry setter runs after the native await');
    await assert.rejects(f.run('scope_design_apply', s, { allowGlobalResources: true }),
      change === 'moved' ? /SCOPE_ROOT_PAGE_MISMATCH/ : /SCOPE_ROOT_NOT_FOUND/);
    assert.equal(f.writes(), writesAtChange, 'a repeated request cannot replay the interrupted setter');
  }
});

test('plan is read only; generated geometry, editable text, click, timer, flows read back', async () => {
  const f = fixture(), s = spec();
  assert.equal((await f.run('scope_design_plan', s)).writes, 0); assert.equal(f.writes(), 0);
  await complete(f, s);
  const before = f.writes(); const audit = await f.run('scope_design_audit', s);
  assert.equal(audit.status, 'PASS', JSON.stringify(audit.errors)); assert.equal(audit.writes, 0); assert.equal(before, f.writes());
  assert.equal(audit.counts.nodes, 3); assert.equal(audit.counts.texts, 1); assert.equal(audit.counts.reactions, 2); assert.equal(audit.counts.flows, 2);
  assert.equal(audit.nodes.find(x => x.key === 'label').props.characters, 'Editable 中文');
  const timer = [...f.nodes.values()].find(x => x.name === 'done').reactions[0]; assert.equal(timer.trigger.timeout, 1000);
  assert.equal(audit.playback, 'NOT VERIFIED');
});

test('batches survive runtime restart and second completed apply creates nothing', async () => {
  const f = fixture(), s = spec();
  const first = await f.run('scope_design_apply', s, { batchSize: 1 }); assert.equal(first.checkpoint.applied, 1);
  f.reload(); await complete(f, s, { batchSize: 1 });
  const writes = f.writes(); const result = await f.run('scope_design_apply', s); assert.equal(result.idempotent, true); assert.equal(f.writes(), writes);
});

test('batch 500 shares its creation budget with finalization and resumes the remaining nodes', async () => {
  const f = fixture(), s = spec();
  s.nodes[0].props = { clipsContent: true, overflowDirection: 'VERTICAL' };
  s.nodes.push(...Array.from({ length: 598 }, (_, i) => n(`bulk-${i}`, 'RECTANGLE', 'start', i === 597 ? { isFixed: true } : {})));
  s.reactions.push({ sourceKey: 'bulk-597', destinationKey: 'done', trigger: { type: 'ON_CLICK' } });
  const first = await f.run('scope_design_apply', s, { batchSize: 500 });
  assert.equal(first.status, 'IN_PROGRESS');
  assert.deepEqual(first.checkpoint, { applied: 500, total: 601, finalizedNodes: 0, pending: null, finalized: false });
  f.reload();
  const second = await f.run('scope_design_apply', s, { batchSize: 500 });
  assert.equal(second.status, 'IN_PROGRESS');
  assert.deepEqual(second.checkpoint, { applied: 601, total: 601, finalizedNodes: 399, pending: null, finalized: false });
  const fixed = [...f.nodes.values()].find(node => node.name === 'bulk-597');
  assert.equal(fixed.reactions.length, 0, 'the final node must not exceed the remaining finalization budget');
  assert.equal(f.page.flowStartingPoints.length, 0, 'explicit flows wait for complete finalization');
  f.reload();
  const third = await f.run('scope_design_apply', s, { batchSize: 500 });
  assert.equal(third.status, 'COMPLETE');
  assert.deepEqual(third.checkpoint, { applied: 601, total: 601, finalizedNodes: 601, pending: null, finalized: true });
  assert.equal(fixed.reactions[0].actions[0].destinationId, [...f.nodes.values()].find(node => node.name === 'done').id);
  const start = [...f.nodes.values()].find(node => node.name === 'start');
  assert.equal(start.children.at(-1).id, fixed.id);
  assert.equal(start.numberOfFixedChildren, 1);
  assert.deepEqual(f.page.flowStartingPoints.map(flow => flow.name), ['Default', 'Compact']);
  const before = f.writes(), audit = await f.run('scope_design_audit', s);
  assert.equal(audit.status, 'PASS', JSON.stringify(audit.errors));
  assert.equal(audit.counts.nodes, 601); assert.equal(audit.counts.reactions, 3);
  assert.equal(audit.writes, 0); assert.equal(f.writes(), before);
  assert.equal((await f.run('scope_design_apply', s, { batchSize: 500 })).idempotent, true);
  assert.equal(f.writes(), before);
});

test('runtime keeps default batch 100 and rejects invalid or oversized budgets before writes', async () => {
  const f = fixture(), s = spec();
  s.nodes.push(...Array.from({ length: 98 }, (_, i) => n(`default-${i}`, 'RECTANGLE', 'start')));
  for (const batchSize of [0, 501, 1000, 499.5, '500', Infinity]) {
    await assert.rejects(f.run('scope_design_apply', s, { batchSize }), /DESIGN_BATCH_SIZE_INVALID/);
    assert.equal(f.writes(), 0);
    assert.equal(f.nodes.size, 1, 'only the pre-existing scope page remains');
  }
  const first = await f.run('scope_design_apply', s);
  assert.deepEqual(first.checkpoint, { applied: 100, total: 101, finalizedNodes: 0, pending: null, finalized: false });
});

test('finalization preserves later fixed-count edits made during an earlier native reaction await', async t => {
  const trace = []; let later, editing = false;
  const f = fixture({ async reactionHook({ node }) {
    if (node.name !== 'start') return;
    trace.push({ event: 'reaction-await', node: node.name });
    await Promise.resolve();
    editing = true; later.numberOfFixedChildren = 2; editing = false;
    trace.push({ event: 'user-edit', fixed: later.numberOfFixedChildren });
  } }), s = spec();
  s.nodes = [n('start', 'FRAME'), n('later', 'FRAME', null, { overflowDirection: 'VERTICAL' }),
    n('normal', 'RECTANGLE', 'later'), n('fixed', 'RECTANGLE', 'later', { isFixed: true })];
  s.reactions = [{ sourceKey: 'start', destinationKey: 'later', trigger: { type: 'ON_CLICK' } }];
  s.flows = [{ nodeKey: 'start', name: 'Default' }];
  assert.equal((await f.run('scope_design_apply', s, { batchSize: s.nodes.length })).checkpoint.finalizedNodes, 0);
  later = [...f.nodes.values()].find(node => node.name === 'later');
  const originalDigest = later.getPluginData('bridge-design-v1-digest');
  let fixedCount = later.numberOfFixedChildren;
  Object.defineProperty(later, 'numberOfFixedChildren', { get: () => fixedCount, set(value) {
    trace.push({ event: editing ? 'user-fixed-set' : 'runtime-fixed-set', before: fixedCount, after: value }); fixedCount = value;
  } });
  const setPluginData = later.setPluginData;
  later.setPluginData = (key, value) => {
    if (key === 'bridge-design-v1-digest') trace.push({ event: 'runtime-digest-set', before: later.getPluginData(key), after: value });
    setPluginData(key, value);
  };
  const result = await f.run('scope_design_apply', s, { batchSize: 500 });
  trace.push({ event: 'result', status: result.status, error: result.error, fixed: later.numberOfFixedChildren,
    digestUnchanged: later.getPluginData('bridge-design-v1-digest') === originalDigest, checkpoint: result.checkpoint });
  t.diagnostic(JSON.stringify(trace));
  assert.equal(later.numberOfFixedChildren, 2, 'the user fixed-count edit must not be replaced with the specification');
  assert.equal(later.getPluginData('bridge-design-v1-digest'), originalDigest, 'a user edit must not become a new trusted digest');
  assert.equal(result.status, 'PARTIAL_FAILURE'); assert.equal(result.error, 'DESIGN_USER_EDIT_CONFLICT:later');
  assert.equal(result.checkpoint.finalizedNodes, 1); assert.equal(result.checkpoint.pending, null);
  assert.equal(trace.filter(event => event.event === 'runtime-fixed-set' || event.event === 'runtime-digest-set').length, 0);
  const writes = f.writes();
  await assert.rejects(f.run('scope_design_apply', s), /DESIGN_USER_EDIT_CONFLICT:later/);
  assert.equal(f.writes(), writes, 'subsequent batches must still reject the preserved user edit before writes');
});

test('native reaction readback rejects same-node geometry edits before completing its pending mutation', async t => {
  const trace = [], f = fixture({ async reactionHook({ node }) {
    trace.push({ event: 'reaction-await', node: node.name, x: node.x });
    await Promise.resolve(); node.x += 7;
    trace.push({ event: 'user-edit', node: node.name, x: node.x });
  } }), s = spec();
  await f.run('scope_design_apply', s, { batchSize: s.nodes.length });
  const start = [...f.nodes.values()].find(node => node.name === 'start'), digest = start.getPluginData('bridge-design-v1-digest');
  const result = await f.run('scope_design_apply', s, { batchSize: 500 });
  trace.push({ event: 'result', status: result.status, error: result.error, checkpoint: result.checkpoint });
  t.diagnostic(JSON.stringify(trace));
  assert.equal(result.status, 'PARTIAL_FAILURE'); assert.equal(result.error, 'DESIGN_USER_EDIT_CONFLICT:start');
  assert.equal(result.checkpoint.pending.kind, 'reactions'); assert.equal(result.checkpoint.pending.key, 'start');
  assert.equal(start.x, s.nodes[0].x + 7); assert.equal(start.getPluginData('bridge-design-v1-digest'), digest);
  assert.equal(result.checkpoint.finalizedNodes, 0);
});

test('text-style awaits cannot authorize fills on a new node moved to another page', async t => {
  const trace = []; let f;
  f = fixture({ imageLifecycle: true, async textStyleHook({ node }) {
    trace.push({ event: 'text-style-await', node: node.name, page: node.parent.parent.id });
    await Promise.resolve(); f.make('PAGE').appendChild(node);
    trace.push({ event: 'user-move', node: node.name, page: node.parent.id });
  } });
  const s = spec();
  s.nodes = [n('start', 'FRAME'), n('photo-text', 'TEXT', 'start', { characters: 'Page', textStyleKey: 'body',
    fills: [{ type: 'IMAGE', assetKey: 'image' }] })];
  s.reactions = []; s.flows = [];
  s.assets = [{ key: 'image', mimeType: 'image/png', dataBase64: 'iVBORw0KGgo=' }];
  s.textStyles = [{ key: 'body', name: 'Body', fontName: { family: 'Inter', style: 'Regular' }, fontSize: 16 }];
  await f.run('scope_design_apply', s, { allowGlobalResources: true, batchSize: 1 });
  const result = await f.run('scope_design_apply', s, { allowGlobalResources: true, batchSize: 1 });
  const node = [...f.nodes.values()].find(node => node.name === 'photo-text');
  trace.push({ event: 'result', status: result.status, error: result.error, fills: node.fills, checkpoint: result.checkpoint });
  t.diagnostic(JSON.stringify(trace));
  assert.deepEqual(node.fills, [], 'no fill may be assigned after the node leaves the authorized page');
  assert.equal(node.getPluginData('bridge-design-v1-digest'), '');
  assert.equal(result.status, 'PARTIAL_FAILURE'); assert.match(result.error, /scope violation/);
  assert.equal(result.checkpoint.pending.kind, 'node'); assert.equal(result.checkpoint.pending.key, 'photo-text');
  assert.equal(result.checkpoint.applied, 1);
});

test('layer order follows specification and fixed layers occupy scrolling parent final positions', async () => {
  const f = fixture(), s = spec(); s.nodes[0].props = { clipsContent: true, overflowDirection: 'VERTICAL' };
  s.nodes.splice(1, 0, n('fixed', 'RECTANGLE', 'start', { isFixed: true }));
  await complete(f, s, { batchSize: 1 });
  const start = [...f.nodes.values()].find(x => x.name === 'start'); assert.deepEqual(start.children.map(x => x.name), ['label', 'fixed']);
  assert.equal(start.numberOfFixedChildren, 1); assert.equal(start.overflowDirection, 'VERTICAL');
  assert.equal((await f.run('scope_design_audit', s)).status, 'PASS');
});

test('user edits reject resumption without overwriting or creating more nodes', async () => {
  const f = fixture(), s = spec(); await f.run('scope_design_apply', s, { batchSize: 1 });
  f.page.children[0].name = 'User changed'; const writes = f.writes();
  await assert.rejects(f.run('scope_design_apply', s), /DESIGN_USER_EDIT_CONFLICT/); assert.equal(f.writes(), writes);
});

test('foreign subtree rejects generation and remains intact', async () => {
  const f = fixture(), s = spec(); await f.run('scope_design_apply', s, { batchSize: 1 });
  const child = f.make('RECTANGLE', f.page.children[0]); child.name = 'foreign'; const writes = f.writes();
  await assert.rejects(f.run('scope_design_apply', s), /foreign ownership/); assert.equal(f.writes(), writes); assert.equal(child.name, 'foreign');
});

test('changed specification under same stable id rejects rather than replacing existing nodes', async () => {
  const f = fixture(), s = spec(); await complete(f, s); s.nodes[0].width = 901;
  await assert.rejects(f.run('scope_design_apply', s), /DESIGN_SPEC_REVISION_CONFLICT/);
});

test('font fallback requires explicit policy and records actual substitution', async () => {
  const f = fixture(), s = spec(); s.nodes[2].props.fontName.family = 'Unavailable';
  await assert.rejects(f.run('scope_design_apply', s), /DESIGN_FONT_MISSING/); assert.equal(f.writes(), 0);
  s.fontPolicy = { allowFallback: true, fallback: { family: 'Noto Sans SC', style: 'Regular' } };
  await complete(f, s); const audit = await f.run('scope_design_audit', s);
  assert.equal(audit.fontSubstitutions[0].used.family, 'Noto Sans SC'); assert.equal(audit.nodes.find(x => x.key === 'label').props.fontName.family, 'Noto Sans SC');
});

test('global resources require explicit authorization and reject foreign resource changes', async () => {
  const f = fixture(), s = spec();
  s.variables = [{ key: 'blue', name: 'Blue', value: { r: 0, g: 0, b: 1, a: 1 } }];
  s.textStyles = [{ key: 'body', name: 'Body', fontName: { family: 'Inter', style: 'Regular' }, fontSize: 16 }];
  s.nodes[2].props.textStyleKey = 'body'; s.nodes[0].props.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 1 }, variableKey: 'blue' }];
  await assert.rejects(f.run('scope_design_apply', s), /DESIGN_GLOBAL_RESOURCES_AUTH_REQUIRED/); assert.equal(f.writes(), 0);
  await complete(f, s, { allowGlobalResources: true }); const audit = await f.run('scope_design_audit', s);
  assert.equal(audit.status, 'PASS'); assert.equal(audit.counts.variables, 1); assert.equal(audit.counts.textStyles, 1);
  assert.equal(audit.nodes.find(x => x.key === 'start').props.fills[0].variableKey, 'blue');
  f.styles.values().next().value.fontSize = 29;
  await assert.rejects(f.run('scope_design_apply', s, { allowGlobalResources: true }), /DESIGN_STYLE_USER_EDIT_CONFLICT/);
});

test('bound fill and stroke alpha drift reports exact paint readback and preserves failed pending writes', async () => {
  for (const field of ['fills', 'strokes']) {
    // Reproduce the observed host assignment behavior separately from the
    // binding helper; the regular fixture intentionally has no host resolver.
    const f = fixture({ boundPaintAlphaReadback: true }), s = spec();
    s.variables = [{ key: 'black', name: 'Black', value: { r: 0, g: 0, b: 0, a: 1 } }];
    s.nodes[0].props[field] = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0.4, variableKey: 'black' }];
    const result = await f.run('scope_design_apply', s, { allowGlobalResources: true });
    assert.equal(result.status, 'PARTIAL_FAILURE');
    assert.equal(result.error, `DESIGN_PROPERTY_READBACK_MISMATCH:start:${field}`);
    assert.equal(result.checkpoint.pending.kind, 'node');
    assert.equal(result.checkpoint.pending.key, 'start');
    assert.equal(result.readbackMismatch.nodeKey, 'start');
    assert.equal(result.readbackMismatch.field, field);
    assert.equal(result.readbackMismatch.expected[0].opacity, 0.4);
    assert.equal(result.readbackMismatch.actual[0].opacity, 1);
    assert.deepEqual(result.readbackMismatch.actual[0].boundVariables, result.readbackMismatch.expected[0].boundVariables);
    const writes = f.writes(), nodes = f.nodes.size;
    f.reload();
    assert.equal((await f.run('scope_design_apply', s, { allowGlobalResources: true })).status, 'NEEDS_RECONCILIATION');
    await assert.rejects(f.run('scope_design_apply', s, { allowGlobalResources: true, reconcile: true }), /DESIGN_NEEDS_RECONCILIATION/);
    assert.equal(f.writes(), writes);
    assert.equal(f.nodes.size, nodes);
  }
});

test('oversized paint mismatch diagnostics report the budget without partial expected or actual data', async () => {
  const f = fixture({ paintReadback: paints => paints.some(paint => paint.boundVariables) ? [{ type: 'GRADIENT_LINEAR',
    gradientStops: Array.from({ length: 1000 }, (_, i) => ({ position: i / 999, color: { r: 0, g: 0, b: 0, a: 1 } })) }] : paints }), s = spec();
  s.variables = [{ key: 'black', name: 'Black', value: { r: 0, g: 0, b: 0, a: 1 } }];
  s.nodes[0].props.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0.4, variableKey: 'black' }];
  const result = await f.run('scope_design_apply', s, { allowGlobalResources: true });
  assert.equal(result.status, 'PARTIAL_FAILURE');
  assert.equal(result.checkpoint.pending.kind, 'node');
  assert.deepEqual(result.readbackMismatch, { nodeKey: 'start', field: 'fills', status: 'NOT_VERIFIED_BUDGET_EXCEEDED', budgetCharacters: 8192 });
  assert.ok(JSON.stringify(result.readbackMismatch).length <= 8192);
});

test('setter failure produces durable pending state and never blindly retries it', async () => {
  const f = fixture(), s = spec(); f.failText(true);
  const failed = await f.run('scope_design_apply', s); assert.equal(failed.status, 'PARTIAL_FAILURE'); assert.equal(failed.checkpoint.pending.kind, 'node');
  f.failText(false); f.reload(); const count = f.nodes.size;
  assert.equal((await f.run('scope_design_apply', s)).status, 'NEEDS_RECONCILIATION');
  await assert.rejects(f.run('scope_design_apply', s, { reconcile: true }), /DESIGN_NEEDS_RECONCILIATION/);
  assert.equal(f.nodes.size, count);
});

test('read-only audit identifies deleted interaction and layer drift', async () => {
  const f = fixture(), s = spec(); await complete(f, s); f.page.children[0].reactions = [];
  const audit = await f.run('scope_design_audit', s); assert.equal(audit.status, 'FAIL'); assert.ok(audit.errors.includes('REACTION_MISMATCH:start'));
  await assert.rejects(f.run('scope_design_apply', s), /DESIGN_COMPLETED_DRIFT/);
});

test('components, native instances, vector paths and images remain editable and export is PNG only', async () => {
  const f = fixture(), s = spec();
  s.nodes.push(n('master', 'COMPONENT'), n('master-text', 'TEXT', 'master', { characters: 'Component', fontName: { family: 'Inter', style: 'Regular' } }),
    n('instance', 'INSTANCE', 'start', { componentKey: 'master' }), n('icon', 'VECTOR', 'start', { vectorPaths: [{ windingRule: 'NONZERO', data: 'M 0 0 L 2 2 Z' }] }),
    n('photo', 'RECTANGLE', 'start', { fills: [{ type: 'IMAGE', assetKey: 'image' }] }));
  s.assets = [{ key: 'image', mimeType: 'image/png', dataBase64: 'iVBORw0KGgo=' }];
  await complete(f, s);
  const audit = await f.run('scope_design_audit', s); assert.equal(audit.status, 'PASS', JSON.stringify(audit.errors));
  assert.equal(audit.counts.components, 1); assert.equal(audit.counts.instances, 1);
  assert.equal(audit.nodes.find(x => x.key === 'photo').props.fills[0].assetKey, 'image');
  const instance = [...f.nodes.values()].find(x => x.name === 'instance'); assert.equal(instance.children.length, 1);
  const result = await f.run('scope_design_export_png', s, { nodeKey: 'start' });
  assert.equal(result.bytesBase64, 'iVBORw0KGgo='); assert.equal(result.writes, 0);
});

test('image lifecycle regenerates the same ledger hash before a new fill while preserving supported strokes', async () => {
  const f = fixture({ imageLifecycle: true }), s = spec();
  const strokes = [{ type: 'SOLID', color: { r: 0.2, g: 0.3, b: 0.4 }, opacity: 0.5 }];
  s.nodes = [n('start', 'FRAME'), n('photo', 'RECTANGLE', 'start', { fills: [{ type: 'IMAGE', assetKey: 'image' }], strokes })];
  s.reactions = []; s.flows = [];
  s.assets = [{ key: 'image', mimeType: 'image/png', dataBase64: 'iVBORw0KGgo=' }];
  const first = await f.run('scope_design_apply', s, { batchSize: 1 });
  assert.equal(first.checkpoint.applied, 1);
  const ledgerKey = `bridge-design-v1-${designSignature({ workspace: 'workspace-test', task: 'task-test', spec: s.id }).slice(0, 24)}-image-${designSignature('image').slice(0, 24)}`;
  const originalRecord = f.page.getPluginData(ledgerKey);
  const start = [...f.nodes.values()].find(node => node.name === 'start');
  const originalDigest = start.getPluginData('bridge-design-v1-digest');
  const firstBytes = Buffer.from(f.imageCreates[0]);
  f.images.clear(); f.reload();
  const beforeRead = f.writes(), createsBeforeRead = f.imageCreates.length;
  assert.equal((await f.run('scope_design_plan', s)).status, 'PLANNED');
  assert.equal((await f.run('scope_design_audit', s)).status, 'FAIL', 'incomplete audit stays incomplete');
  assert.equal(f.writes(), beforeRead); assert.equal(f.imageCreates.length, createsBeforeRead);
  await complete(f, s, { batchSize: 1 });
  const photo = [...f.nodes.values()].find(node => node.name === 'photo');
  assert.equal(photo.fills[0].imageHash, JSON.parse(originalRecord).hash);
  assert.deepEqual(photo.strokes, strokes);
  assert.equal(f.imageCreates.length, 2, 'one creation plus one just-in-time regeneration');
  assert.deepEqual(f.imageCreates[1], firstBytes, 'regeneration must use the identical validated source bytes');
  assert.equal(f.page.getPluginData(ledgerKey), originalRecord, 'resource ledger must not be rewritten');
  assert.equal(start.getPluginData('bridge-design-v1-digest'), originalDigest, 'existing digest stays unchanged');
  assert.equal((await f.run('scope_design_audit', s)).status, 'PASS');
  const writes = f.writes(), creates = f.imageCreates.length;
  f.reload();
  assert.equal((await f.run('scope_design_apply', s)).idempotent, true);
  f.reimport();
  assert.equal((await f.run('scope_design_audit', s)).status, 'PASS');
  assert.equal(f.writes(), writes); assert.equal(f.imageCreates.length, creates);
});

test('image lifecycle keeps unsupported IMAGE strokes rejected before any resource or document writes', async () => {
  const f = fixture({ imageLifecycle: true }), s = spec();
  s.nodes[0].props.strokes = [{ type: 'IMAGE', assetKey: 'image' }];
  s.assets = [{ key: 'image', mimeType: 'image/png', dataBase64: 'iVBORw0KGgo=' }];
  await assert.rejects(f.run('scope_design_apply', s), /Expected one of SOLID/);
  assert.equal(f.writes(), 0); assert.equal(f.imageCreates.length, 0);
});

test('image lifecycle validates after text style awaits and protects ledger source signatures', async () => {
  for (const tamperSignature of [false, true]) {
    let f, ledgerKey;
    f = fixture({ imageLifecycle: true, async textStyleHook({ images }) {
      await Promise.resolve(); images.clear();
      if (tamperSignature) {
        const record = JSON.parse(f.page.getPluginData(ledgerKey));
        record.signature = '0'.repeat(64); f.page.setPluginData(ledgerKey, JSON.stringify(record));
      }
    } });
    const s = spec();
    s.nodes = [n('start', 'FRAME'), n('photo-text', 'TEXT', 'start', { characters: 'Page', textStyleKey: 'body',
      fills: [{ type: 'IMAGE', assetKey: 'image' }] })];
    s.reactions = []; s.flows = [];
    s.assets = [{ key: 'image', mimeType: 'image/png', dataBase64: 'iVBORw0KGgo=' }];
    s.textStyles = [{ key: 'body', name: 'Body', fontName: { family: 'Inter', style: 'Regular' }, fontSize: 16 }];
    ledgerKey = `bridge-design-v1-${designSignature({ workspace: 'workspace-test', task: 'task-test', spec: s.id }).slice(0, 24)}-image-${designSignature('image').slice(0, 24)}`;
    const result = await f.run('scope_design_apply', s, { allowGlobalResources: true });
    if (tamperSignature) {
      assert.equal(result.status, 'PARTIAL_FAILURE');
      assert.equal(result.error, 'DESIGN_ASSET_CONFLICT:image');
      assert.equal(result.checkpoint.pending.key, 'photo-text');
      assert.equal(f.imageCreates.length, 1, 'signature mismatch must not recreate any image');
    } else {
      assert.equal(result.status, 'COMPLETE', JSON.stringify(result));
      assert.equal(f.imageCreates.length, 2, 'a pre-await resource check is insufficient');
      assert.equal((await f.run('scope_design_audit', s)).status, 'PASS');
    }
  }
});

test('image lifecycle handles new instance image overrides without mutating the existing master', async () => {
  const f = fixture({ imageLifecycle: true }), s = spec();
  s.assets = [{ key: 'image', mimeType: 'image/png', dataBase64: 'iVBORw0KGgo=' }];
  s.nodes = [n('master', 'COMPONENT'), n('master-photo', 'RECTANGLE', 'master'), n('start', 'FRAME'),
    n('instance', 'INSTANCE', 'start', { componentKey: 'master', overrides: [{ sourceKey: 'master-photo', fills: [{ type: 'IMAGE', assetKey: 'image' }] }] })];
  s.reactions = []; s.flows = [];
  assert.equal((await f.run('scope_design_apply', s, { batchSize: 3 })).checkpoint.applied, 3);
  const masterPhoto = [...f.nodes.values()].find(node => node.name === 'master-photo');
  const before = masterPhoto.getPluginData('bridge-design-v1-digest');
  f.images.clear(); f.reload();
  await complete(f, s, { batchSize: 1 });
  const instance = [...f.nodes.values()].find(node => node.name === 'instance');
  assert.equal(instance.children[0].fills[0].imageHash, 'image-8');
  assert.deepEqual(masterPhoto.fills, []);
  assert.equal(masterPhoto.getPluginData('bridge-design-v1-digest'), before);
  assert.equal(f.imageCreates.length, 2);
  assert.equal((await f.run('scope_design_audit', s)).status, 'PASS');
});

test('image lifecycle never repairs an existing empty image fill or creates images during guarded reads', async () => {
  const f = fixture({ imageLifecycle: true }), s = spec();
  s.nodes = [n('start', 'FRAME'), n('photo', 'RECTANGLE', 'start', { fills: [{ type: 'IMAGE', assetKey: 'image' }] })];
  s.reactions = []; s.flows = [];
  s.assets = [{ key: 'image', mimeType: 'image/png', dataBase64: 'iVBORw0KGgo=' }];
  await complete(f, s);
  const photo = [...f.nodes.values()].find(node => node.name === 'photo');
  photo.fills = []; f.images.clear(); f.reload();
  const before = f.writes(), creates = f.imageCreates.length, digest = photo.getPluginData('bridge-design-v1-digest');
  await assert.rejects(f.run('scope_design_plan', s), /DESIGN_USER_EDIT_CONFLICT:photo/);
  const audit = await f.run('scope_design_audit', s);
  assert.equal(audit.status, 'FAIL'); assert.ok(audit.errors.includes('DESIGN_USER_EDIT_CONFLICT:photo'));
  await assert.rejects(f.run('scope_design_apply', s), /DESIGN_USER_EDIT_CONFLICT:photo/);
  assert.equal(f.writes(), before); assert.equal(f.imageCreates.length, creates);
  assert.deepEqual(photo.fills, []); assert.equal(photo.getPluginData('bridge-design-v1-digest'), digest);
});

test('image lifecycle missing API or a changed regeneration hash keeps new-node pending without replay', async () => {
  for (const failure of ['api', 'hash', 'create', 'handle']) {
    let regeneration = false;
    const f = fixture({ imageLifecycle: true, imageCreateHook() {
      if (!regeneration) return undefined;
      if (failure === 'create') throw new Error('HOST_IMAGE_CREATION_FAILURE');
      if (failure === 'hash') return 'different-image-hash';
      return undefined;
    } }), s = spec();
    s.nodes = [n('start', 'FRAME'), n('photo', 'RECTANGLE', 'start', { fills: [{ type: 'IMAGE', assetKey: 'image' }] })];
    s.reactions = []; s.flows = [];
    s.assets = [{ key: 'image', mimeType: 'image/png', dataBase64: 'iVBORw0KGgo=' }];
    await f.run('scope_design_apply', s, { batchSize: 1 });
    const namespace = designSignature({ workspace: 'workspace-test', task: 'task-test', spec: s.id }).slice(0, 24);
    const imageKey = `bridge-design-v1-${namespace}-image-${designSignature('image').slice(0, 24)}`;
    const original = f.page.getPluginData(imageKey);
    f.images.clear(); regeneration = true;
    if (failure === 'api') delete f.figma.getImageByHash;
    if (failure === 'handle') f.figma.getImageByHash = () => null;
    const result = await f.run('scope_design_apply', s, { batchSize: 1 });
    assert.equal(result.status, 'PARTIAL_FAILURE');
    const error = failure === 'api' ? 'DESIGN_IMAGE_API_UNAVAILABLE' : failure === 'hash' ? 'DESIGN_IMAGE_HASH_CHANGED:image' :
      failure === 'handle' ? 'DESIGN_IMAGE_HANDLE_UNAVAILABLE:image' : 'HOST_IMAGE_CREATION_FAILURE';
    assert.equal(result.error, error);
    assert.equal(result.checkpoint.pending.kind, 'node'); assert.equal(result.checkpoint.pending.key, 'photo');
    assert.equal(result.checkpoint.applied, 1);
    assert.equal(f.page.getPluginData(imageKey), original);
    const photo = [...f.nodes.values()].find(node => node.name === 'photo');
    assert.deepEqual(photo.fills, []);
    assert.equal(photo.getPluginData('bridge-design-v1-digest'), '');
    const before = f.writes(), creates = f.imageCreates.length, nodes = f.nodes.size;
    f.reload();
    assert.equal((await f.run('scope_design_apply', s)).status, 'NEEDS_RECONCILIATION');
    await assert.rejects(f.run('scope_design_apply', s, { reconcile: true }), /DESIGN_NEEDS_RECONCILIATION/);
    assert.equal(f.writes(), before); assert.equal(f.imageCreates.length, creates); assert.equal(f.nodes.size, nodes);
  }
});

test('image lifecycle reconciles a durably completed pending node without repeating image creation', async () => {
  const f = fixture({ imageLifecycle: true }), s = spec();
  s.nodes = [n('start', 'FRAME'), n('photo', 'RECTANGLE', 'start', { fills: [{ type: 'IMAGE', assetKey: 'image' }] })];
  s.reactions = []; s.flows = [];
  s.assets = [{ key: 'image', mimeType: 'image/png', dataBase64: 'iVBORw0KGgo=' }];
  await f.run('scope_design_apply', s, { batchSize: 1 });
  f.images.clear();
  assert.equal((await f.run('scope_design_apply', s, { batchSize: 1 })).checkpoint.applied, 2);
  const photo = [...f.nodes.values()].find(node => node.name === 'photo');
  const key = `bridge-design-v1-${designSignature({ workspace: 'workspace-test', task: 'task-test', spec: s.id }).slice(0, 24)}-ledger`;
  // Crash boundary: node intent, digest, complete marker and mapping are durable,
  // but the previous pending ledger has not yet been cleared.
  const checkpoint = JSON.parse(f.page.getPluginData(key));
  checkpoint.cursor = 1;
  checkpoint.pending = { kind: 'node', key: 'photo', id: photo.id, operationId: 'op-test-12345678' };
  f.page.setPluginData(key, JSON.stringify(checkpoint));
  const creates = f.imageCreates.length, nodes = f.nodes.size, digest = photo.getPluginData('bridge-design-v1-digest');
  f.reload();
  const result = await f.run('scope_design_apply', s, { reconcile: true });
  assert.equal(result.status, 'COMPLETE'); assert.equal(result.checkpoint.pending, null);
  assert.equal(f.imageCreates.length, creates); assert.equal(f.nodes.size, nodes);
  assert.equal(photo.getPluginData('bridge-design-v1-digest'), digest);
  const writes = f.writes();
  f.reload();
  assert.equal((await f.run('scope_design_apply', s)).idempotent, true);
  assert.equal(f.writes(), writes); assert.equal(f.imageCreates.length, creates);
});

test('real mapping arc path applies and audits through the native supported-command boundary', async () => {
  const f = fixture({ nativeVectors: true }), s = spec();
  s.nodes.push(n('arc', 'VECTOR', 'start', { vectorPaths: [{ windingRule: 'NONZERO', data: nativeArcPath }] }));
  const original = designSignature(s);
  await complete(f, s);
  assert.equal(designSignature(s), original, 'normalization must not change the signed specification');
  const audit = await f.run('scope_design_audit', s);
  assert.equal(audit.status, 'PASS', JSON.stringify(audit.errors));
  const vector = [...f.nodes.values()].find(node => node.name === 'arc');
  assert.doesNotMatch(vector.vectorPaths[0].data, /[Aa]/);
  vector.vectorPaths[0].data += ' L 99 99';
  const writes = f.writes();
  await assert.rejects(f.run('scope_design_apply', s), /DESIGN_USER_EDIT_CONFLICT:arc/);
  assert.equal(f.writes(), writes);
});

test('SVG relative, repeated and smooth commands normalize to exact absolute cubic geometry', () => {
  assert.equal(normalizeSvgPath('m1,2 3,4 h5 v-2 z l1 1'), 'M 1 2 L 4 6 L 9 6 L 9 4 Z L 2 3');
  assert.equal(normalizeSvgPath('M0 0c1 2 3 4 5 6s2 3 4 5L0 0s1 2 3 4'),
    'M 0 0 C 1 2 3 4 5 6 C 7 8 7 9 9 11 L 0 0 C 0 0 1 2 3 4');
  const q = svgPathSegments('M0 0q3 3 6 0t6 0');
  assert.deepEqual(q, [['M', 0, 0], ['C', 2, 2, 4, 2, 6, 0], ['C', 8, -2, 10, -2, 12, 0]]);
  assert.equal(normalizeSvgPath('M1e1-.2E+1L.5.6'), 'M 10 -2 L 0.5 0.6');
});

test('vector target dimensions fit the joint geometry bounds and preserve spacing between paths', () => {
  const paths = [{ windingRule: 'NONZERO', data: 'M10 20L20 20L20 30Z' },
    { windingRule: 'EVENODD', data: 'M30 20L40 20L40 30Z' }];
  assert.deepEqual(normalizeVectorPaths(paths, { width: 60, height: 50 }), [
    { windingRule: 'NONZERO', data: 'M 0 0 L 20 0 L 20 50 Z' },
    { windingRule: 'EVENODD', data: 'M 40 0 L 60 0 L 60 50 Z' },
  ]);
  assert.equal(paths[0].data, 'M10 20L20 20L20 30Z', 'source remains immutable');
  assert.equal(normalizeVectorPaths(paths)[0].data, 'M 10 20 L 20 20 L 20 30 Z', 'omitted target preserves source units');
});

test('vector fit uses analytical cubic extrema rather than control-point bounds', () => {
  const paths = [{ windingRule: 'NONZERO', data: 'M10 20 C10 30 20 30 20 20 Z' }];
  assert.equal(normalizeVectorPaths(paths, { width: 20, height: 15 })[0].data, 'M 0 0 C 0 20 20 20 20 0 Z');
});

test('real search icon fits its declared 0.7 display scale with the observed native origin', async () => {
  const target = { width: 10.499135871961776, height: 10.49011006277611 };
  const paths = [{ windingRule: 'NONZERO', data: nativeArcPath }];
  const first = svgPathSegments(normalizeVectorPaths(paths, target)[0].data)[0];
  // Direct read-only Figma 126.9.13 observation, node 18:6. Float host rounding
  // differs from the double-precision analytic fit by less than 1e-6 here.
  assert.ok(Math.abs(first[1] - 7.5129944381485485) < 1e-6);
  assert.ok(Math.abs(first[2] - 8.002993754717346) < 1e-6);
  const f = fixture({ nativeVectors: true }), s = spec();
  s.nodes.push({ ...n('real-scale', 'VECTOR', 'start', { vectorPaths: paths }), ...target });
  const signature = designSignature(s);
  await complete(f, s);
  assert.equal((await f.run('scope_design_audit', s)).status, 'PASS');
  assert.equal(designSignature(s), signature);
  const actual = [...f.nodes.values()].find(node => node.name === 'real-scale').vectorPaths;
  assert.ok(vectorPathsMatch(actual, normalizeVectorPaths(paths, target)));
});

test('vector fitting rejects degenerate, non-finite and numerically unrepresentable geometry', () => {
  const ordinary = [{ windingRule: 'NONZERO', data: 'M0 0L1 1Z' }];
  for (const target of [{ width: 0, height: 1 }, { width: 1, height: Infinity }, { width: NaN, height: 1 }, { width: 1 }]) {
    assert.throws(() => normalizeVectorPaths(ordinary, target), /DESIGN_VECTOR_PATH_INVALID/);
  }
  for (const paths of [[], [{ data: 'M0 0' }], [{ data: 'M0 0L1 0Z' }], [{ data: 'M0 0L0 1Z' }],
    [{ data: 'M-1e308 0L1e308 1Z' }], [{ data: 'M0 0L5e-324 1Z' }]]) {
    assert.throws(() => normalizeVectorPaths(paths, { width: 10, height: 10 }), /DESIGN_VECTOR_PATH_INVALID/);
  }
});

test('native explicit closing lines match implicit closure without accepting changed geometry', () => {
  const path = data => [{ windingRule: 'NONZERO', data }];
  const implicit = path('M0 0L10 0L10 10Z M20 20L25 20L25 25Z');
  const explicit = path('M0 0L10 0L10 10L0 0Z M20 20L25 20L25 25L20 20Z');
  assert.ok(vectorPathsMatch(explicit, implicit));
  assert.ok(vectorPathsMatch(implicit, explicit));
  assert.ok(!vectorPathsMatch(path('M0 0L10 0L10 10L0.0001 0Z M20 20L25 20L25 25L20 20Z'), implicit));
  assert.ok(!vectorPathsMatch(path('M0 0L10 0L10 10L0 0 M20 20L25 20L25 25L20 20Z'), implicit));
  assert.ok(!vectorPathsMatch(path('M0 0L10 0L10 10C5 8 2 4 0 0Z M20 20L25 20L25 25L20 20Z'), implicit));
  assert.ok(!vectorPathsMatch([{ ...explicit[0], windingRule: 'EVENODD' }], implicit));
});

test('SVG arc flags, adjacent flags, radius correction and degenerate arcs preserve semantics', () => {
  const rootHalf = Math.SQRT1_2;
  for (const [large, sweep, middle] of [[0, 1, [rootHalf, rootHalf]], [0, 0, [1 - rootHalf, 1 - rootHalf]],
    [1, 1, [1 + rootHalf, 1 + rootHalf]], [1, 0, [-rootHalf, -rootHalf]]]) {
    const path = svgPathSegments(`M1 0A1 1 0 ${large}${sweep}0 1`), curves = path.slice(1);
    assert.equal(curves.length, large ? 6 : 2);
    const actualMiddle = curves[curves.length / 2 - 1].slice(-2);
    actualMiddle.forEach((value, i) => assert.ok(Math.abs(value - middle[i]) < 1e-12));
    assert.deepEqual(curves.at(-1).slice(-2), [0, 1]);
  }
  const corrected = svgPathSegments('M0 0a-1 -1 0 0 1 4 0');
  const midpoint = corrected[2].slice(-2);
  assert.ok(Math.abs(midpoint[0] - 2) < 1e-12 && Math.abs(midpoint[1] + 2) < 1e-12);
  assert.equal(normalizeSvgPath('M1 2a0 2 45 0 1 3 4a5 5 0 1 0 0 0'), 'M 1 2 L 4 6');
});

test('rotated elliptical arcs and circle cubic approximation stay within the geometry error bound', () => {
  const rootHalf = Math.SQRT1_2;
  const path = svgPathSegments(`M${2 * rootHalf} ${2 * rootHalf}a2 1 45 0 1 ${-3 * rootHalf} ${-rootHalf}`);
  assert.equal(path.length, 3);
  path.at(-1).slice(-2).forEach((value, i) => assert.ok(Math.abs(value - [-rootHalf, rootHalf][i]) < 1e-12));
  let start = path[0].slice(1);
  for (const segment of path.slice(1)) {
    for (let i = 0; i <= 200; i++) {
      const t = i / 200, u = 1 - t;
      const x = u ** 3 * start[0] + 3 * u ** 2 * t * segment[1] + 3 * u * t ** 2 * segment[3] + t ** 3 * segment[5];
      const y = u ** 3 * start[1] + 3 * u ** 2 * t * segment[2] + 3 * u * t ** 2 * segment[4] + t ** 3 * segment[6];
      const unitX = (x * rootHalf + y * rootHalf) / 2, unitY = -x * rootHalf + y * rootHalf;
      assert.ok(Math.abs(Math.hypot(unitX, unitY) - 1) < 4.3e-6, 'unit-circle radial error');
    }
    start = segment.slice(-2);
  }
});

test('malformed SVG paths fail closed rather than silently dropping segments', () => {
  for (const data of ['', ' ', 'L0 0', 'M0', 'M,0 0', 'M0,,0', 'M0 0,', 'M0 0L', 'M0 0R1 2', 'M0 0L1e309 0',
    'M0 0A1 1 0 2 0 1 1', 'M0 0A1 1 0 0 .1 1 1', 'M0 0A1 1 0 0 1 1', 'M0 0Z1 1',
    'M0 0A1e-300 1e-300 0 0 1 1e300 1e300', 'M0 0A1e300 1e300 0 0 1 1e-300 1e-300']) {
    assert.throws(() => normalizeSvgPath(data), /DESIGN_VECTOR_PATH_INVALID/, data);
  }
});

test('vector readback compares normalized numeric geometry and winding without weakening edit fingerprints', async () => {
  const paths = [{ windingRule: 'EVENODD', data: 'm0 0q3 3 6 0z' }];
  const normalized = normalizeVectorPaths(paths);
  assert.equal(paths[0].data, 'm0 0q3 3 6 0z');
  assert.ok(vectorPathsMatch([{ windingRule: 'EVENODD', data: 'M0,0 C2,2 4,2 6,0Z' }], normalized));
  assert.ok(!vectorPathsMatch([{ windingRule: 'NONZERO', data: normalized[0].data }], normalized));
  assert.ok(!vectorPathsMatch([{ windingRule: 'EVENODD', data: 'M0 0 C2 2 4 2 6.01 0 Z' }], normalized));
  assert.ok(!vectorPathsMatch([{ windingRule: 'EVENODD', data: 'M0 0 garbage' }], normalized));
  const f = fixture({ nativeVectors: true, vectorReadback: value => value.map(path => ({ ...path,
    data: path.data.replace(/[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g, number => Number(number).toFixed(6)) })) }), s = spec();
  s.nodes.push(n('arc-rounded', 'VECTOR', 'start', { vectorPaths: [{ windingRule: 'NONZERO', data: nativeArcPath }] }));
  await complete(f, s);
  assert.equal((await f.run('scope_design_audit', s)).status, 'PASS');
  const vector = [...f.nodes.values()].find(node => node.name === 'arc-rounded');
  vector.vectorPaths[0].data = vector.vectorPaths[0].data.replace('M ', 'M  ');
  const writes = f.writes();
  await assert.rejects(f.run('scope_design_apply', s), /DESIGN_USER_EDIT_CONFLICT:arc-rounded/);
  assert.equal(f.writes(), writes);
});

test('host materialized closing edge passes creation but equivalent later edits still conflict', async () => {
  const f = fixture({ nativeVectors: true, vectorReadback: paths => paths.map(path => ({ ...path,
    data: path.data.replace(' Z', ' L 0 0 Z') })) }), s = spec();
  s.nodes.push(n('closed-triangle', 'VECTOR', 'start', { vectorPaths: [{ windingRule: 'NONZERO', data: 'M0 0L10 0L10 10Z' }] }));
  await complete(f, s);
  assert.equal((await f.run('scope_design_audit', s)).status, 'PASS');
  const vector = [...f.nodes.values()].find(node => node.name === 'closed-triangle');
  vector.vectorPaths[0].data = vector.vectorPaths[0].data.replace(' L 0 0 Z', ' Z');
  const writes = f.writes();
  await assert.rejects(f.run('scope_design_apply', s), /DESIGN_USER_EDIT_CONFLICT:closed-triangle/);
  assert.equal(f.writes(), writes);
});

test('silently changed host vector geometry fails readback before the node is marked complete', async () => {
  const f = fixture({ nativeVectors: true, vectorReadback: paths => paths.map(path => ({ ...path,
    data: path.data.replace(/^M ([\d.e+-]+)/, (_, x) => `M ${Number(x) + 0.1}`) })) }), s = spec();
  s.nodes.push(n('arc-drift', 'VECTOR', 'start', { vectorPaths: [{ windingRule: 'NONZERO', data: nativeArcPath }] }));
  const result = await f.run('scope_design_apply', s);
  assert.equal(result.status, 'PARTIAL_FAILURE');
  assert.match(result.error, /DESIGN_PROPERTY_READBACK_MISMATCH:arc-drift:vectorPaths/);
  assert.equal(result.checkpoint.pending.key, 'arc-drift');
  assert.equal([...f.nodes.values()].find(node => node.name === 'arc-drift').getPluginData('bridge-design-v1-state'), 'creating');
});

test('timer units are explicit and immutable in a generation checkpoint', async () => {
  const f = fixture(), s = spec(); await complete(f, s, { timerUnit: 'milliseconds' });
  assert.equal([...f.nodes.values()].find(x => x.name === 'done').reactions[0].trigger.timeout, 1000);
  await assert.rejects(f.run('scope_design_apply', s, { timerUnit: 'seconds' }), /DESIGN_TIMER_UNIT_CONFLICT/);
});

test('unrelated flow starting points are preserved', async () => {
  const f = fixture(), s = spec(); const foreign = f.make('FRAME', f.page); f.page.flowStartingPoints = [{ nodeId: foreign.id, name: 'User flow' }];
  await complete(f, s); assert.equal(f.page.flowStartingPoints[0].name, 'User flow'); assert.equal(f.page.flowStartingPoints.length, 3);
});

test('native first-reaction flow is durably observed and replaced after a runtime restart', async () => {
  const f = fixture({ automaticFlow: true }), s = spec();
  await f.run('scope_design_apply', s, { batchSize: s.nodes.length });
  const partial = await f.run('scope_design_apply', s, { batchSize: 1 });
  assert.equal(partial.status, 'IN_PROGRESS');
  assert.equal(f.page.flowStartingPoints[0].name, 'Flow 1');
  const ns = designSignature({ workspace: 'workspace-test', task: 'task-test', spec: s.id }).slice(0, 24);
  const state = JSON.parse(f.page.getPluginData(`bridge-design-v1-${ns}-ledger`));
  assert.deepEqual(state.nativeFlowObservation.before, []);
  assert.equal(state.nativeFlowObservation.after[0].name, 'Flow 1');
  assert.equal(state.nativeFlowObservation.operationId, 'op-test-12345678');
  f.reload(); await complete(f, s, { batchSize: 1 });
  assert.deepEqual(f.page.flowStartingPoints.map(flow => flow.name), ['Default', 'Compact']);
  assert.equal((await f.run('scope_design_audit', s)).status, 'PASS');
  f.reimport();
  assert.equal((await f.run('scope_design_audit', s)).status, 'PASS');
});

test('user changes to observed native flows are never replaced across batches', async () => {
  for (const change of ['rename', 'remove', 'add']) {
    const f = fixture({ automaticFlow: true }), s = spec();
    await f.run('scope_design_apply', s, { batchSize: s.nodes.length });
    await f.run('scope_design_apply', s, { batchSize: 1 });
    if (change === 'rename') f.page.flowStartingPoints[0].name = 'My flow';
    if (change === 'remove') f.page.flowStartingPoints = [];
    if (change === 'add') f.page.flowStartingPoints.push({ nodeId: f.page.children.find(node => node.id !== f.page.flowStartingPoints[0].nodeId).id, name: 'My additional flow' });
    const before = structuredClone(f.page.flowStartingPoints);
    f.reload();
    const result = await f.run('scope_design_apply', s);
    assert.equal(result.status, 'PARTIAL_FAILURE', change);
    assert.match(result.error, /DESIGN_FLOW_USER_EDIT_CONFLICT/);
    assert.deepEqual(f.page.flowStartingPoints, before);
  }
});

test('an unrecorded old Flow 1 does not become native evidence on resume', async () => {
  const f = fixture(), s = spec();
  await f.run('scope_design_apply', s, { batchSize: s.nodes.length });
  f.page.flowStartingPoints = [{ nodeId: f.page.children[0].id, name: 'Flow 1' }];
  f.reload();
  const before = structuredClone(f.page.flowStartingPoints);
  const result = await f.run('scope_design_apply', s);
  assert.equal(result.status, 'PARTIAL_FAILURE'); assert.equal(result.error, 'DESIGN_FLOW_CONFLICT');
  assert.deepEqual(f.page.flowStartingPoints, before);
  assert.ok(f.page.children.every(node => node.reactions.length === 0));
});

test('unrelated flows stay intact and concurrent native-call changes fail closed', async () => {
  const f = fixture({ automaticFlow: true }), s = spec();
  const foreign = f.make('FRAME', f.page);
  f.page.flowStartingPoints = [{ nodeId: foreign.id, name: 'User flow' }];
  await complete(f, s);
  assert.deepEqual(f.page.flowStartingPoints[0], { nodeId: foreign.id, name: 'User flow' });
  const changed = fixture({ automaticFlow: true, reactionHook({ page }) { page.flowStartingPoints[0].name = 'Concurrent user flow'; } });
  const result = await changed.run('scope_design_apply', s);
  assert.equal(result.status, 'PARTIAL_FAILURE'); assert.equal(result.error, 'DESIGN_NATIVE_FLOW_CHANGE_CONFLICT');
  assert.equal(result.checkpoint.pending.kind, 'reactions');
  assert.equal(changed.page.flowStartingPoints[0].name, 'Concurrent user flow');
  changed.reload();
  await assert.rejects(changed.run('scope_design_apply', s, { reconcile: true }), /DESIGN_NEEDS_RECONCILIATION/);
});

test('a rejected native setter cannot establish evidence or be replayed', async () => {
  const f = fixture({ automaticFlow: true, reactionHook() { throw new Error('SETTER_REJECTED'); } }), s = spec();
  const result = await f.run('scope_design_apply', s);
  assert.equal(result.status, 'PARTIAL_FAILURE'); assert.equal(result.error, 'SETTER_REJECTED');
  assert.deepEqual(result.checkpoint.pending.flowBefore, []);
  assert.equal(f.page.flowStartingPoints[0].name, 'Flow 1');
  f.reload();
  assert.equal((await f.run('scope_design_apply', s)).status, 'NEEDS_RECONCILIATION');
  await assert.rejects(f.run('scope_design_apply', s, { reconcile: true }), /DESIGN_NEEDS_RECONCILIATION/);
});

test('successful reaction readback is retained before an unexpected flow delta rejects finalization', async () => {
  const f = fixture({ automaticFlow: true, reactionHook({ page }) { page.flowStartingPoints[0].name = 'Concurrent user flow'; } }), s = spec();
  const result = await f.run('scope_design_apply', s);
  assert.equal(result.status, 'PARTIAL_FAILURE');
  assert.equal(result.error, 'DESIGN_NATIVE_FLOW_CHANGE_CONFLICT');
  const pending = result.checkpoint.pending;
  assert.deepEqual(pending.flowBefore, []);
  assert.equal(pending.flowAfter[0].name, 'Concurrent user flow');
  assert.equal(pending.reactionReadback.version, 1);
  assert.equal(pending.reactionReadback.sourceKey, pending.key);
  assert.equal(pending.reactionReadback.operationId, pending.operationId);
  const source = [...f.nodes.values()].find(node => node.getPluginData('node-key') === pending.key);
  assert.equal(pending.reactionReadback.sourceId, source.id);
  assert.equal(pending.reactionReadback.topLevelKey, 'start');
  assert.match(pending.reactionReadback.digest, /^[a-f0-9]{64}$/);
  const ns = designSignature({ workspace: 'workspace-test', task: 'task-test', spec: s.id }).slice(0, 24);
  const state = JSON.parse(f.page.getPluginData(`bridge-design-v1-${ns}-ledger`));
  assert.deepEqual(state.pending, pending, 'the rejection must leave durable diagnostics');
  assert.equal(f.page.getPluginData(`bridge-design-v1-${ns}-reactions-${designSignature(pending.key).slice(0, 24)}`), '',
    'a successful reaction readback must not masquerade as an accepted flow transition');
  f.reload();
  await assert.rejects(f.run('scope_design_apply', s, { reconcile: true }), /DESIGN_NEEDS_RECONCILIATION/);
  assert.equal(source.reactions.length, 1, 'no native setter replay');
});

function disconnectedFlowFixture(change) {
  const calls = [], f = fixture({ automaticFlow: true, async reactionHook({ node, page }) {
    calls.push(node.name);
    if (node.name !== 'C/c') return;
    await Promise.resolve();
    page.flowStartingPoints.push({ name: `Flow ${page.flowStartingPoints.length + 1}`, nodeId: node.parent.id });
    change?.({ node, page, f });
  } }), s = spec();
  s.nodes = ['A', 'B', 'C', 'D'].map(key => n(key, 'FRAME'));
  s.nodes.push(n('A/a', 'FRAME', 'A'), n('C/c', 'FRAME', 'C'), n('D/end', 'RECTANGLE', 'D'));
  s.reactions = [{ sourceKey: 'A/a', destinationKey: 'B', trigger: { type: 'ON_CLICK' } },
    { sourceKey: 'C/c', destinationKey: 'D', trigger: { type: 'ON_CLICK' } }];
  s.flows = [{ nodeKey: 'A', name: 'Probe A' }, { nodeKey: 'C', name: 'Probe C' }];
  const ns = designSignature({ workspace: 'workspace-test', task: 'task-test', spec: s.id }).slice(0, 24);
  const ledgerKey = `bridge-design-v1-${ns}-ledger`, reactionKey = `bridge-design-v1-${ns}-reactions-${designSignature('C/c').slice(0, 24)}`;
  return { f, s, calls, ledgerKey, reactionKey, state: () => JSON.parse(f.page.getPluginData(ledgerKey)) };
}

async function legacyFlowPendingFixture() {
  const x = disconnectedFlowFixture();
  await x.f.run('scope_design_apply', x.s, { batchSize: 7 });
  await x.f.run('scope_design_apply', x.s, { batchSize: 5 });
  const source = [...x.f.nodes.values()].find(node => node.name === 'C/c'), destination = [...x.f.nodes.values()].find(node => node.name === 'D');
  const before = x.f.page.flowStartingPoints.map(flow => ({ ...flow, nodeKey: 'A' }));
  source.reactions = [{ trigger: { type: 'ON_CLICK' }, actions: [{ type: 'NODE', destinationId: destination.id, navigation: 'NAVIGATE', transition: null }] }];
  x.f.page.flowStartingPoints.push({ name: 'Flow 2', nodeId: source.parent.id });
  const state = x.state();
  state.pending = { kind: 'reactions', key: 'C/c', startedAt: '2026-10-09T10:45:17.506Z', operationId: 'op-legacy-unknown', flowBefore: before };
  x.f.page.setPluginData(x.ledgerKey, JSON.stringify(state));
  const adoptNativeFlow = { pendingOperationId: state.pending.operationId,
    flowSnapshotSignature: designSignature([{ name: 'Flow 1', nodeKey: 'A' }, { name: 'Flow 2', nodeKey: 'C' }]),
    reactionSnapshotSignature: designSignature([{ trigger: { type: 'ON_CLICK' }, actions: [{ type: 'NODE', destinationKey: 'D', navigation: 'NAVIGATE', transition: null }] }]) };
  return { ...x, source, adoptNativeFlow, originalPending: copyForTest(state.pending) };
}
const copyForTest = value => JSON.parse(JSON.stringify(value));

test('native single appended flows accumulate with legacy evidence and survive partial import without setter replay', async () => {
  const x = disconnectedFlowFixture();
  await x.f.run('scope_design_apply', x.s, { batchSize: 7 });
  await x.f.run('scope_design_apply', x.s, { batchSize: 5 });
  assert.equal(x.state().nativeFlowObservation.version, 1);
  const result = await x.f.run('scope_design_apply', x.s, { batchSize: 1 });
  assert.equal(result.status, 'IN_PROGRESS', JSON.stringify(result));
  const observation = x.state().nativeFlowObservation;
  assert.equal(observation.version, 2); assert.equal(observation.entries.length, 2);
  assert.equal(observation.entries[0].version, 1); assert.equal(observation.entries[1].provenance, 'NATIVE_SETTER_READBACK');
  assert.deepEqual(observation.entries[1].before, observation.entries[0].after);
  assert.deepEqual(observation.entries[1].after, [{ name: 'Flow 1', nodeKey: 'A' }, { name: 'Flow 2', nodeKey: 'C' }]);
  assert.equal(observation.entries[1].reactionReadback.digest, JSON.parse(x.f.page.getPluginData(x.reactionKey)).digest);
  x.f.reimport(); await complete(x.f, x.s, { batchSize: 1 });
  assert.equal((await x.f.run('scope_design_audit', x.s)).status, 'PASS');
  assert.deepEqual(x.calls, ['A/a', 'C/c']);
});

test('native appended-flow acceptance rejects changes to any existing entry or the one appended target/name', async () => {
  const changes = [({ page }) => { page.flowStartingPoints[0].name = 'User rename'; },
    ({ page, node }) => { page.flowStartingPoints[0].nodeId = node.parent.id; },
    ({ page }) => { page.flowStartingPoints.shift(); },
    ({ page }) => { page.flowStartingPoints.push({ name: 'Flow 3', nodeId: 'foreign:node' }); },
    ({ page }) => { page.flowStartingPoints[1].nodeId = page.flowStartingPoints[0].nodeId; },
    ({ page }) => { page.flowStartingPoints[1].name = 'User name'; },
    ({ page }) => { page.flowStartingPoints.reverse(); }];
  for (const change of changes) {
    const x = disconnectedFlowFixture(change);
    await x.f.run('scope_design_apply', x.s, { batchSize: 7 });
    await x.f.run('scope_design_apply', x.s, { batchSize: 5 });
    const result = await x.f.run('scope_design_apply', x.s, { batchSize: 1 });
    assert.equal(result.status, 'PARTIAL_FAILURE'); assert.equal(result.error, 'DESIGN_NATIVE_FLOW_CHANGE_CONFLICT');
    assert.equal(x.state().nativeFlowObservation.version, 1); assert.equal(x.f.page.getPluginData(x.reactionKey), '');
    const writes = x.f.writes(), calls = x.calls.length;
    await assert.rejects(x.f.run('scope_design_apply', x.s, { reconcile: true }), /DESIGN_NEEDS_RECONCILIATION/);
    assert.equal(x.f.writes(), writes); assert.equal(x.calls.length, calls);
  }
});

test('legacy missing-receipt flow adoption requires explicit exact state and never manufactures an old setter receipt', async () => {
  const x = await legacyFlowPendingFixture(), writes = x.f.writes();
  await assert.rejects(x.f.run('scope_design_apply', x.s, { reconcile: true }), /DESIGN_NEEDS_RECONCILIATION/);
  assert.equal(x.f.writes(), writes);
  const result = await x.f.run('scope_design_apply', x.s, { reconcile: true, adoptNativeFlow: x.adoptNativeFlow, batchSize: 1 });
  assert.equal(result.status, 'IN_PROGRESS', JSON.stringify(result));
  const observation = x.state().nativeFlowObservation, adopted = observation.entries[1];
  assert.equal(adopted.provenance, 'EXPLICIT_READBACK_ADOPTION'); assert.equal(adopted.reactionReadback, null);
  assert.deepEqual(adopted.recovery.legacyPending, x.originalPending);
  assert.equal(Object.hasOwn(adopted.recovery.legacyPending, 'flowAfter'), false);
  assert.equal(Object.hasOwn(adopted.recovery.legacyPending, 'reactionReadback'), false);
  assert.deepEqual(adopted.recovery.explicitPayload, x.adoptNativeFlow);
  assert.equal(adopted.recovery.verification, 'CURRENT_STATE_ADOPTED_NOT_ORIGIN_PROVED');
  assert.equal(JSON.parse(x.f.page.getPluginData(x.reactionKey)).provenance, 'EXPLICIT_READBACK_ADOPTION');
  x.f.reload(); await complete(x.f, x.s, { batchSize: 1 });
  assert.deepEqual(x.calls, ['A/a']); assert.equal((await x.f.run('scope_design_audit', x.s)).status, 'PASS');
});

test('explicit adoption rejects mismatched hashes, operation, payload, legacy observation and current user edits without writes', async () => {
  for (const kind of ['flow-hash', 'reaction-hash', 'operation', 'extra-key', 'rename', 'source-edit', 'no-observation']) {
    const x = await legacyFlowPendingFixture(), payload = { ...x.adoptNativeFlow };
    if (kind === 'flow-hash') payload.flowSnapshotSignature = '0'.repeat(64);
    if (kind === 'reaction-hash') payload.reactionSnapshotSignature = '0'.repeat(64);
    if (kind === 'operation') payload.pendingOperationId = 'op-other';
    if (kind === 'extra-key') payload.ignoreGuard = true;
    if (kind === 'rename') x.f.page.flowStartingPoints[0].name = 'User rename';
    if (kind === 'source-edit') x.source.x += 1;
    if (kind === 'no-observation') { const state = x.state(); delete state.nativeFlowObservation; x.f.page.setPluginData(x.ledgerKey, JSON.stringify(state)); }
    const writes = x.f.writes(), before = x.f.page.getPluginData(x.ledgerKey), calls = x.calls.length;
    await assert.rejects(x.f.run('scope_design_apply', x.s, { reconcile: true, adoptNativeFlow: payload }), /DESIGN_/);
    assert.equal(x.f.writes(), writes, kind); assert.equal(x.f.page.getPluginData(x.ledgerKey), before, kind);
    assert.equal(x.calls.length, calls, kind); assert.equal(x.f.page.getPluginData(x.reactionKey), '', kind);
  }
});

test('adoption payload is never ignored outside a pending apply with explicit reconciliation', async () => {
  const payload = { pendingOperationId: 'op-legacy-unknown', flowSnapshotSignature: '0'.repeat(64), reactionSnapshotSignature: '0'.repeat(64) };
  for (const command of ['scope_design_plan', 'scope_design_audit', 'scope_design_apply']) {
    const f = fixture(), s = spec(), writes = f.writes();
    await assert.rejects(f.run(command, s, { reconcile: true, adoptNativeFlow: payload }), /DESIGN_NATIVE_FLOW_ADOPTION_INVALID/);
    assert.equal(f.writes(), writes);
  }
  const x = await legacyFlowPendingFixture(), writes = x.f.writes(), before = x.f.page.getPluginData(x.ledgerKey);
  await assert.rejects(x.f.run('scope_design_apply', x.s, { adoptNativeFlow: x.adoptNativeFlow }), /DESIGN_NATIVE_FLOW_ADOPTION_INVALID/);
  assert.equal(x.f.writes(), writes); assert.equal(x.f.page.getPluginData(x.ledgerKey), before);
});

test('a nonempty reaction cannot cause an implicit page flow outside a FRAME-root grant even with existing foreign flows', async () => {
  let nativeSetters = 0;
  const f = fixture({ frameRoot: true, reactionHook({ page }) { nativeSetters += 1; page.flowStartingPoints.push({ name: 'Flow 2', nodeId: 'foreign:new' }); } }), s = spec();
  s.nodes = [n('start', 'FRAME'), n('done', 'FRAME')]; s.reactions = [s.reactions[0]]; s.flows = [];
  f.page.flowStartingPoints = [{ name: 'Existing user flow', nodeId: 'foreign:42' }];
  await f.run('scope_design_apply', s, { batchSize: 2 });
  const before = copyForTest(f.page.flowStartingPoints), result = await f.run('scope_design_apply', s, { batchSize: 1 });
  assert.equal(result.status, 'PARTIAL_FAILURE'); assert.equal(result.error, 'DESIGN_NATIVE_FLOW_REQUIRES_PAGE_SCOPE');
  assert.equal(nativeSetters, 0); assert.deepEqual(f.page.flowStartingPoints, before);
  assert.equal(result.checkpoint.pending, null, 'no reaction receipt or pending step was started');
  assert.deepEqual([...f.nodes.values()].find(node => node.name === 'start').reactions, []);
});

test('native appended flows preserve foreign identity and reject foreign changes or broken receipt chains', async () => {
  for (const changeForeign of [false, true]) {
    const x = disconnectedFlowFixture(changeForeign ? ({ page }) => { page.flowStartingPoints[0].name = 'Foreign edit'; } : undefined);
    x.f.page.flowStartingPoints = [{ name: 'Existing user flow', nodeId: 'foreign:42' }];
    await x.f.run('scope_design_apply', x.s, { batchSize: 7 });
    const result = await x.f.run('scope_design_apply', x.s, { batchSize: 6 });
    assert.equal(result.status, changeForeign ? 'PARTIAL_FAILURE' : 'IN_PROGRESS');
    if (changeForeign) {
      assert.equal(result.error, 'DESIGN_NATIVE_FLOW_CHANGE_CONFLICT'); assert.equal(x.state().nativeFlowObservation, undefined);
    } else {
      assert.deepEqual(x.state().nativeFlowObservation.entries[0].before, [{ name: 'Existing user flow', nodeKey: null, nodeId: 'foreign:42' }]);
      await complete(x.f, x.s);
      assert.deepEqual(x.f.page.flowStartingPoints[0], { name: 'Existing user flow', nodeId: 'foreign:42' });
    }
  }
  for (const kind of ['receipt', 'reaction-record', 'foreign-after']) {
    const x = disconnectedFlowFixture();
    await x.f.run('scope_design_apply', x.s, { batchSize: 7 });
    await x.f.run('scope_design_apply', x.s, { batchSize: 6 });
    const state = x.state();
    if (kind === 'receipt') { state.nativeFlowObservation.entries[1].reactionReadback.operationId = 'op-unrelated'; x.f.page.setPluginData(x.ledgerKey, JSON.stringify(state)); }
    if (kind === 'reaction-record') x.f.page.setPluginData(x.reactionKey, JSON.stringify({ version: 2, digest: '0'.repeat(64) }));
    if (kind === 'foreign-after') x.f.page.flowStartingPoints.push({ name: 'New foreign flow', nodeId: 'foreign:43' });
    const writes = x.f.writes(), before = x.f.page.getPluginData(x.ledgerKey), calls = x.calls.length;
    const result = await x.f.run('scope_design_apply', x.s, { batchSize: 1 });
    assert.equal(result.status, 'PARTIAL_FAILURE'); assert.match(result.error, /DESIGN_(?:NATIVE_FLOW_EVIDENCE|FLOW_USER_EDIT)_CONFLICT/);
    assert.equal(x.f.writes(), writes); assert.equal(x.f.page.getPluginData(x.ledgerKey), before);
    assert.equal(x.calls.length, calls);
  }
});

test('invalid data is rejected before Figma document writes', async () => {
  const f = fixture(), s = spec(); s.nodes[0].props.execute = 'malicious';
  await assert.rejects(f.run('scope_design_apply', s), /Unknown property/); assert.equal(f.writes(), 0);
});

function richSpec() {
  const s = spec();
  s.variables = [{ key: 'blue', name: 'Blue', value: { r: 0, g: 0.2, b: 1, a: 1 } }];
  s.textStyles = [{ key: 'body', name: 'Body', fontName: { family: 'Inter', style: 'Regular' }, fontSize: 16 }];
  s.nodes[2].props.textStyleKey = 'body';
  s.nodes[0].props = { overflowDirection: 'VERTICAL', clipsContent: true };
  s.nodes.push(n('fixed', 'RECTANGLE', 'start', { isFixed: true }), n('master', 'COMPONENT'), n('master-group', 'FRAME', 'master'),
    n('master-text', 'TEXT', 'master-group', { characters: 'Master', textStyleKey: 'body', fills: [{ type: 'SOLID', color: { r: 0, g: 0.2, b: 1 }, variableKey: 'blue' }] }),
    n('instance', 'INSTANCE', 'start', { componentKey: 'master', overrides: [{ sourceKey: 'master-text', characters: 'Local label' }] }));
  return s;
}

function lookupWindowSpec() {
  return { schemaVersion: '1.0', id: 'lookup-window', name: 'Lookup window',
    nodes: [n('master', 'COMPONENT'), n('start', 'FRAME'),
      n('instance-0', 'INSTANCE', 'start', { componentKey: 'master' }), n('instance-1', 'INSTANCE', 'start', { componentKey: 'master' }),
      ...Array.from({ length: 60 }, (_, i) => n(`child-${i}`, 'RECTANGLE', 'start'))], reactions: [], flows: [] };
}

test('context node lookup windows bound concurrency at 16 without changing topology or master checks', async () => {
  const f = fixture(), s = lookupWindowSpec(); await complete(f, s, { batchSize: 500 });
  const original = f.figma.getNodeByIdAsync, writes = f.writes(); let active = 0, maximum = 0, calls = 0;
  f.figma.getNodeByIdAsync = async id => {
    calls += 1; active += 1; maximum = Math.max(maximum, active);
    try { await Promise.resolve(); return await original(id); } finally { active -= 1; }
  };
  const audit = await f.run('scope_design_audit', s);
  assert.equal(audit.status, 'PASS'); assert.equal(calls, 64); assert.equal(maximum, 16); assert.equal(active, 0);
  assert.deepEqual(audit.nodes.map(node => node.key), s.nodes.map(node => node.key));
  for (const instance of audit.nodes.filter(node => node.type === 'INSTANCE')) assert.equal(instance.props.componentKey, 'master');
  assert.equal(f.writes(), writes);
});

test('context lookup rejection drains its window and preserves ordered failure, zero writes and next-call safety', async () => {
  const f = fixture(), s = lookupWindowSpec(); await complete(f, s, { batchSize: 500 });
  const original = f.figma.getNodeByIdAsync, writes = f.writes(); let started = 0, settled = 0, active = 0;
  f.figma.getNodeByIdAsync = async id => {
    const index = started++; active += 1;
    try {
      await Promise.resolve();
      if (index === 2) { await Promise.resolve(); throw new Error('FIRST_ORDERED_READ_FAILURE'); }
      if (index === 4) throw new Error('FASTER_LATER_READ_FAILURE');
      return await original(id);
    } finally { settled += 1; active -= 1; }
  };
  await assert.rejects(f.run('scope_design_apply', s), /FIRST_ORDERED_READ_FAILURE/);
  assert.equal(started, 16); assert.equal(settled, 16); assert.equal(active, 0); assert.equal(f.writes(), writes);
  f.figma.getNodeByIdAsync = original;
  assert.equal((await f.run('scope_design_plan', s)).status, 'PLANNED'); assert.equal(f.writes(), writes);
});

test('context prefetched node scope and removal remain freshly checked before any write', async () => {
  for (const change of ['scope', 'removed']) {
    const f = fixture(), s = lookupWindowSpec(); await complete(f, s, { batchSize: 500 });
    const victim = [...f.nodes.values()].find(node => node.name === 'child-0'), otherPage = f.make('PAGE');
    const original = f.figma.getNodeByIdAsync, writes = f.writes();
    f.figma.getNodeByIdAsync = async id => {
      await Promise.resolve();
      if (id === victim.id) { if (change === 'scope') otherPage.appendChild(victim); else victim.removed = true; }
      return await original(id);
    };
    await assert.rejects(f.run('scope_design_apply', s), change === 'scope' ? /scope violation/ : /DESIGN_NODE_MISSING:child-0/);
    assert.equal(f.writes(), writes, change);
  }
});

test('existing-node guards read fresh geometry, paints and inherited overrides once per synchronous pass', async () => {
  const reads = new Map();
  const f = fixture({ propertyReadHook(node, field) { const key = `${node.id}/${field}`; reads.set(key, (reads.get(key) ?? 0) + 1); } }), s = richSpec();
  const paint = { type: 'SOLID', color: { r: 0, g: 0.2, b: 1 }, variableKey: 'blue' };
  Object.assign(s.nodes[0].props, { fills: [structuredClone(paint)], strokes: [structuredClone(paint)] });
  s.nodes.find(node => node.key === 'instance').props.overrides[0].fills = [structuredClone(paint)];
  await complete(f, s, { allowGlobalResources: true });
  const start = [...f.nodes.values()].find(node => node.name === 'start');
  const instance = [...f.nodes.values()].find(node => node.name === 'instance');
  const inherited = instance.children[0].children[0];
  const writes = f.writes();
  for (const reload of [false, true]) {
    if (reload) f.reload();
    reads.clear();
    assert.equal((await f.run('scope_design_plan', s)).status, 'PLANNED');
    for (const field of ['name', 'x', 'y', 'width', 'height', 'fills', 'strokes']) {
      assert.equal(reads.get(`${start.id}/${field}`), 1, `${field} must share a fresh native read across digest and expected-property checks`);
    }
    for (const field of ['name', 'fills', 'fontName']) assert.equal(reads.get(`${inherited.id}/${field}`), 1, `inherited ${field} must not be reread for its override`);
    assert.equal(f.writes(), writes);
  }
});

test('fresh guarded snapshots still reject edits and scope changes made during asynchronous resource preparation', async () => {
  for (const kind of ['geometry', 'ancestor', 'foreign-child']) {
    let editing = false, f;
    const s = spec();
    f = fixture({ fontListHook() {
      if (!editing) return;
      const start = [...f.nodes.values()].find(node => node.name === 'start');
      if (kind === 'geometry') start.x += 1;
      else if (kind === 'ancestor') f.make('PAGE').appendChild(start);
      else f.make('RECTANGLE', start);
    } });
    await complete(f, s);
    const writes = f.writes();
    editing = true;
    const error = kind === 'geometry' ? /DESIGN_USER_EDIT_CONFLICT:start/ : kind === 'ancestor' ? /scope violation/ : /foreign ownership/;
    await assert.rejects(f.run('scope_design_apply', s), error);
    assert.equal(f.writes(), writes, 'no guarded snapshot may be reused from before an await');
  }
});

test('fresh reverse resource indexes preserve legacy first-hash digests and UNKNOWN paint fallback', async () => {
  const f = fixture(), s = spec();
  s.assets = ['first', 'second'].map(key => ({ key, mimeType: 'image/png', dataBase64: 'iVBORw0KGgo=' }));
  s.nodes.push(n('photo', 'RECTANGLE', 'start', { fills: [{ type: 'IMAGE', assetKey: 'second' }] }));
  await complete(f, s);
  const photo = [...f.nodes.values()].find(node => node.name === 'photo');
  // This exact historical snapshot is independent of the new reverse-index
  // implementation. Both assets resolve to one host hash; the old digest used
  // the first resource key, while the audit paint convention uses the last.
  const legacySnapshot = { type: 'RECTANGLE', name: 'photo', parentKey: 'start', x: 10, y: 12, width: 200, height: 120,
    visible: true, opacity: 1, fills: [{ type: 'IMAGE', imageHash: 'first', scaleMode: 'FILL' }], strokes: [],
    strokeWeight: 1, cornerRadius: 0, effects: [], strokeAlign: 'CENTER', dashPattern: [] };
  assert.equal(photo.getPluginData('bridge-design-v1-digest'), designSignature(legacySnapshot));
  const original = await f.run('scope_design_audit', s);
  assert.equal(original.status, 'PASS');
  assert.equal(original.nodes.find(node => node.key === 'photo').props.fills[0].assetKey, 'second');
  const writes = f.writes();
  f.reload();
  assert.equal((await f.run('scope_design_plan', s)).status, 'PLANNED');
  f.reimport();
  const imported = await f.run('scope_design_audit', s);
  assert.equal(imported.status, 'PASS');
  assert.equal(compareAudits(original, imported).status, 'PASS');
  photo.fills[0].imageHash = 'unmapped-user-image';
  const edited = await f.run('scope_design_audit', s);
  assert.equal(edited.status, 'FAIL');
  assert.equal(edited.nodes.find(node => node.key === 'photo').props.fills[0].assetKey, 'UNKNOWN');
  await assert.rejects(f.run('scope_design_apply', s), /DESIGN_USER_EDIT_CONFLICT:photo/);
  assert.equal(f.writes(), writes);
});

test('runtime audits satisfy delivery contract and compare semantically after every host ID changes (API double)', async () => {
  const f = fixture(), s = richSpec();
  const manifest = { runId: 'run-test', specId: s.id, startedAt: new Date(Date.now() - 1000).toISOString() };
  await complete(f, s, { allowGlobalResources: true, batchSize: 2 });
  const original = await f.run('scope_design_audit', s);
  assert.equal(validateAudit(original, manifest).status, 'PASS');
  f.reimport();
  const writes = f.writes();
  const imported = await f.run('scope_design_audit', s);
  assert.equal(validateAudit(imported, manifest).status, 'PASS');
  assert.equal(f.writes(), writes, 'audit cannot repair IDs by writing the imported document');
  assert.equal(compareAudits(original, imported).status, 'PASS');
  assert.notEqual(original.scope.rootNodeId, imported.scope.rootNodeId);
  assert.ok(imported.nodes.every(node => node.id.startsWith('imported:')));
  const done = await f.run('scope_design_apply', s, { allowGlobalResources: true });
  assert.equal(done.idempotent, true); assert.equal(f.writes(), writes);
});

test('RGBA-bound fills, strokes and instance overrides preserve alpha through reload and imported IDs (API double)', async () => {
  for (const editedField of ['fills', 'strokes', 'override']) {
    const f = fixture({ boundPaintAlphaReadback: true }), s = richSpec();
    const paint = { type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0.4, variableKey: 'translucent-black' };
    s.variables.push({ key: 'translucent-black', name: 'Translucent black', value: { r: 0, g: 0, b: 0, a: 0.4 } });
    Object.assign(s.nodes[0].props, { fills: [structuredClone(paint)], strokes: [structuredClone(paint)], opacity: 0.6 });
    s.nodes.find(node => node.key === 'master-text').props.opacity = 0.5;
    const instanceDef = s.nodes.find(node => node.key === 'instance');
    instanceDef.props.opacity = 0.7;
    instanceDef.props.overrides[0].fills = [structuredClone(paint)];
    await complete(f, s, { allowGlobalResources: true, batchSize: 2 });
    const start = [...f.nodes.values()].find(node => node.name === 'start');
    const instance = [...f.nodes.values()].find(node => node.name === 'instance');
    const inheritedText = instance.children[0].children[0];
    const masterText = [...f.nodes.values()].find(node => node.name === 'master-text' && node.parent.parent.type === 'COMPONENT');
    const variable = [...f.variables.values()].find(variable => variable.name.endsWith('/Translucent black'));
    for (const boundPaint of [start.fills[0], start.strokes[0], inheritedText.fills[0]]) {
      assert.equal(boundPaint.opacity, 0.4, 'variable alpha is resolved once, rather than multiplied by paint alpha');
      assert.deepEqual(boundPaint.boundVariables.color, { type: 'VARIABLE_ALIAS', id: variable.id });
    }
    assert.equal(start.opacity, 0.6);
    assert.equal(instance.opacity, 0.7);
    assert.equal(inheritedText.opacity, 0.5);
    assert.equal(masterText.fills[0].opacity, 1, 'instance fill override must not alter the opaque master paint');
    const original = await f.run('scope_design_audit', s);
    assert.equal(original.status, 'PASS');
    assert.deepEqual(original.nodes.find(node => node.key === 'start').props.fills, [paint]);
    assert.deepEqual(original.nodes.find(node => node.key === 'start').props.strokes, [paint]);
    assert.equal(original.variables.find(variable => variable.key === 'translucent-black').value.a, 0.4);
    const writes = f.writes();
    f.reload();
    assert.equal((await f.run('scope_design_audit', s)).status, 'PASS');
    assert.equal((await f.run('scope_design_apply', s, { allowGlobalResources: true })).idempotent, true);
    assert.equal(f.writes(), writes);
    const oldVariableId = variable.id;
    f.reimport();
    const imported = await f.run('scope_design_audit', s);
    assert.equal(imported.status, 'PASS');
    assert.equal(compareAudits(original, imported).status, 'PASS');
    assert.notEqual(variable.id, oldVariableId);
    for (const boundPaint of [start.fills[0], start.strokes[0], inheritedText.fills[0]]) {
      assert.equal(boundPaint.opacity, 0.4);
      assert.equal(boundPaint.boundVariables.color.id, variable.id);
    }
    assert.equal(f.writes(), writes, 'read-only import audit cannot repair paint bindings');
    const editedPaint = editedField === 'override' ? inheritedText.fills[0] : start[editedField][0];
    editedPaint.opacity = 0.8;
    const error = editedField === 'override' ? /DESIGN_USER_EDIT_CONFLICT:instance/ : /DESIGN_USER_EDIT_CONFLICT:start/;
    await assert.rejects(f.run('scope_design_apply', s, { allowGlobalResources: true }), error);
    assert.equal(editedPaint.opacity, 0.8);
    assert.equal(f.writes(), writes, 'user alpha edits must block resumption without writes');
  }
});

test('partly finalized layers and reactions resume after native-import-like ID remapping', async () => {
  const f = fixture(), s = richSpec();
  let result;
  do { result = await f.run('scope_design_apply', s, { allowGlobalResources: true, batchSize: 1 }); }
  while (result.status === 'IN_PROGRESS' && result.checkpoint.finalizedNodes < 2);
  assert.equal(result.status, 'IN_PROGRESS'); assert.equal(result.checkpoint.finalizedNodes, 2);
  f.reimport();
  await complete(f, s, { allowGlobalResources: true, batchSize: 1 });
  assert.equal((await f.run('scope_design_audit', s)).status, 'PASS');
});

test('instance overrides remain native, preserve masters and reject nested user edits on resume', async () => {
  const f = fixture(), s = richSpec();
  s.nodes.find(n => n.key === 'instance').props.overrides[0] = { sourceKey: 'master-text', characters: 'Different', visible: false,
    fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }] };
  await complete(f, s, { allowGlobalResources: true });
  const instance = [...f.nodes.values()].find(n => n.name === 'instance');
  const child = instance.children[0].children[0];
  assert.equal(child.characters, 'Different'); assert.equal(child.visible, false); assert.equal(child.fills[0].color.r, 1);
  assert.equal([...f.nodes.values()].find(n => n.name === 'master-text' && n.parent.name === 'master-group' && n.parent.parent.type === 'COMPONENT').characters, 'Master');
  assert.equal((await instance.getMainComponentAsync()).type, 'COMPONENT');
  child.characters = 'User edit';
  const writes = f.writes();
  await assert.rejects(f.run('scope_design_apply', s, { allowGlobalResources: true }), /DESIGN_USER_EDIT_CONFLICT:instance/);
  assert.equal(f.writes(), writes); assert.equal(child.characters, 'User edit');
});

test('bounded native shadows and inside stroke survive read-back and detect user drift', async () => {
  const f = fixture(), s = spec();
  s.nodes[0].props = { strokeAlign: 'INSIDE', strokeWeight: 2, strokes: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }],
    effects: [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.15 }, offset: { x: 0, y: 4 }, radius: 12, spread: -2 }] };
  await complete(f, s);
  const audit = await f.run('scope_design_audit', s), node = audit.nodes.find(n => n.key === 'start');
  assert.equal(node.props.strokeAlign, 'INSIDE'); assert.equal(node.props.effects[0].blendMode, 'NORMAL'); assert.equal(node.props.effects[0].spread, -2);
  f.page.children[0].effects[0].radius = 20;
  assert.equal((await f.run('scope_design_audit', s)).status, 'FAIL');
});
test('native dash patterns survive read-back and edited spacing blocks resume', async () => {
  const f = fixture(), s = spec();
  s.nodes[0].props = { strokeWeight: 2, dashPattern: [6, 6], strokes: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }] };
  await complete(f, s);
  const audit = await f.run('scope_design_audit', s);
  assert.deepEqual(audit.nodes.find(node => node.key === 'start').props.dashPattern, [6, 6]);
  f.page.children[0].dashPattern = [1, 1];
  assert.equal((await f.run('scope_design_audit', s)).status, 'FAIL');
  await assert.rejects(f.run('scope_design_apply', s), /DESIGN_USER_EDIT_CONFLICT/);
});

test('native linear gradients retain transform and RGBA stops through audit and imported IDs', async () => {
  const f=fixture(), s=spec();
  const gradient={type:'GRADIENT_LINEAR',gradientTransform:[[1,0,0],[0,1,0]],gradientStops:[
    {position:0,color:{r:244/255,g:239/255,b:231/255,a:0.96}},
    {position:1,color:{r:244/255,g:239/255,b:231/255,a:0.88}}],opacity:1};
  s.nodes[0].props.fills=[gradient];
  await complete(f,s);
  const original=await f.run('scope_design_audit',s);
  assert.equal(original.status,'PASS');
  assert.deepEqual(original.nodes.find(node=>node.key==='start').props.fills,[gradient]);
  f.reimport();
  const imported=await f.run('scope_design_audit',s);
  assert.equal(compareAudits(original,imported).status,'PASS');
  const start=[...f.nodes.values()].find(node=>node.name==='start');
  start.fills[0].gradientStops[0].color.a=0.5;
  const before=f.writes();
  await assert.rejects(f.run('scope_design_apply',s),/DESIGN_USER_EDIT_CONFLICT:start/);
  assert.equal(f.writes(),before);
});

test('collection mode edits and ambiguous imported collection identities fail closed', async () => {
  const f = fixture(), s = richSpec(); await complete(f, s, { allowGlobalResources: true });
  const collection = [...f.collections.values()][0];
  collection.modes[0].name = 'Edited';
  await assert.rejects(f.run('scope_design_audit', s), /DESIGN_COLLECTION_USER_EDIT_CONFLICT/);
  collection.modes[0].name = 'Mode 1'; f.reimport();
  f.figma.variables.createVariableCollection(collection.name);
  await assert.rejects(f.run('scope_design_audit', s), /DESIGN_COLLECTION_MAPPING_AMBIGUOUS/);
});

test('legacy timer host compatibility is opt-in and reports seconds while spec retains delaySeconds', async () => {
  const f = fixture(), s = spec(); await complete(f, s, { timerUnit: 'seconds' });
  assert.equal([...f.nodes.values()].find(x => x.name === 'done').reactions[0].trigger.timeout, 1);
  const audit = await f.run('scope_design_audit', s, { timerUnit: 'seconds' });
  assert.equal(audit.reactions.find(r => r.trigger.type === 'AFTER_TIMEOUT').trigger.delaySeconds, 1);
  assert.equal(audit.timerUnit, 'seconds'); assert.equal(audit.playback, 'NOT VERIFIED');
});

test('silent host setter loss fails generation before marking a node complete', async () => {
  const f = fixture(), s = spec(); s.nodes[0].props.clipsContent = true;
  const originalCreateFrame = f.figma.createFrame;
  f.figma.createFrame = () => { const node = originalCreateFrame(); Object.defineProperty(node, 'clipsContent', { get: () => false, set() {} }); return node; };
  const result = await f.run('scope_design_apply', s);
  assert.equal(result.status, 'PARTIAL_FAILURE');
  assert.match(result.error, /DESIGN_PROPERTY_READBACK_MISMATCH:start:clipsContent/);
  assert.equal(result.checkpoint.applied, 1);
  assert.equal(result.checkpoint.pending.kind, 'node');
});

test('instance main-component swaps reject before resumed writes', async () => {
  const f = fixture(), s = richSpec(); await complete(f, s, { allowGlobalResources: true });
  const instance = [...f.nodes.values()].find(n => n.name === 'instance');
  instance.getMainComponentAsync = async () => ({ id: 'foreign-master' });
  const writes = f.writes();
  await assert.rejects(f.run('scope_design_apply', s, { allowGlobalResources: true }), /DESIGN_INSTANCE_COMPONENT_CONFLICT/);
  assert.equal(f.writes(), writes);
});

test('audit pagination carries global totals and a stable full-snapshot signature', async () => {
  const f = fixture(), s = richSpec(); await complete(f, s, { allowGlobalResources: true });
  const a = await f.run('scope_design_audit', s, { auditLimit: 3 });
  const b = await f.run('scope_design_audit', s, { auditOffset: 3, auditLimit: 3 });
  const c = await f.run('scope_design_audit', s, { auditOffset: 6, auditLimit: 3 });
  assert.equal(a.nodes.length, 3); assert.equal(a.counts.nodes, s.nodes.length);
  assert.equal(a.page.nextOffset, 3); assert.equal(b.page.nextOffset, 6); assert.equal(c.page.nextOffset, null);
  assert.equal(a.page.snapshotSignature, b.page.snapshotSignature); assert.equal(a.page.snapshotSignature, c.page.snapshotSignature);
  assert.equal(new Set([...a.nodes, ...b.nodes, ...c.nodes].map(n => n.key)).size, s.nodes.length);
  f.page.children[0].x += 1;
  const drifted = await f.run('scope_design_audit', s, { auditOffset: 3, auditLimit: 3 });
  assert.equal(drifted.status, 'FAIL'); assert.notEqual(drifted.page.snapshotSignature, a.page.snapshotSignature);
  await assert.rejects(f.run('scope_design_audit', s, { auditOffset: -1 }), /DESIGN_AUDIT_OFFSET_INVALID/);
  await assert.rejects(f.run('scope_design_audit', s, { auditLimit: 2001 }), /DESIGN_AUDIT_LIMIT_INVALID/);
});

test('published two-size example creates overridden instances, shadows, click and timed navigation', async () => {
  const s = JSON.parse(await readFile(new URL('../examples/two-size-prototype.json', import.meta.url), 'utf8'));
  const f = fixture(); await complete(f, s, { allowGlobalResources: true, batchSize: 4 });
  const audit = await f.run('scope_design_audit', s);
  assert.equal(audit.status, 'PASS', JSON.stringify(audit.errors));
  assert.equal(audit.counts.instances, s.nodes.filter(n => n.type === 'INSTANCE').length);
  assert.equal(audit.counts.reactions, s.reactions.length);
  assert.equal(audit.reactions.filter(r => r.trigger.type === 'AFTER_TIMEOUT').length, 2);
  assert.equal(audit.reactions.filter(r => r.trigger.type === 'ON_CLICK').length, 2);
});

// Opt-in bounded local measurement. It is deliberately excluded from normal CI:
// captured application content is local evidence, not a repository test fixture.
if (process.env.BRIDGE_MEASURE_SPEC) test('measure supplied capture through API double (not live Figma)', async () => {
  const s = JSON.parse(await readFile(process.env.BRIDGE_MEASURE_SPEC, 'utf8'));
  const f = fixture(), startedAt = performance.now();
  let result, calls = 0, maxApplyBytes = 0, maxBatchMs = 0;
  do {
    const batchStart = performance.now();
    result = await f.run('scope_design_apply', s, { allowGlobalResources: true, batchSize: 250 });
    maxBatchMs = Math.max(maxBatchMs, performance.now() - batchStart);
    maxApplyBytes = Math.max(maxApplyBytes, Buffer.byteLength(JSON.stringify(result)));
    calls += 1;
  } while (result.status === 'IN_PROGRESS' && calls < 220);
  assert.equal(result.status, 'COMPLETE', JSON.stringify(result));
  const pages = []; let offset = 0;
  do { const page = await f.run('scope_design_audit', s, { auditOffset: offset }); pages.push(page); offset = page.page.nextOffset; } while (offset !== null);
  const audit = { ...pages[0], nodes: pages.flatMap(p => p.nodes) };
  assert.equal(audit.status, 'PASS', JSON.stringify(audit.errors));
  assert.ok(pages.every(p => p.page.snapshotSignature === pages[0].page.snapshotSignature));
  assert.equal(audit.nodes.length, s.nodes.length);
  const pageBytes = pages.map(p => Buffer.byteLength(JSON.stringify(p)));
  console.log(JSON.stringify({ source: 'API_DOUBLE_NOT_LIVE_FIGMA', nodes: s.nodes.length, calls, auditBytes: Buffer.byteLength(JSON.stringify(audit)), pages: pages.length, maxPageBytes: Math.max(...pageBytes), maxApplyBytes, maxBatchMs, totalMs: performance.now() - startedAt, counts: audit.counts }));
  assert.ok(pageBytes.every(bytes => bytes < 7 * 1024 * 1024), 'Audit page exceeds bounded transport budget');
});
