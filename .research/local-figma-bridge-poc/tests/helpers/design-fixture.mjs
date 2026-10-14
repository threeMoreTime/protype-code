// Figma API double only; does not verify real-host fonts, layout or export.
import assert from 'node:assert/strict';
import { createDesignRuntime } from '../../plugin/design-runtime.mjs';

export function fixture({ automaticFlow = false, reactionHook, nativeVectors = false, vectorReadback = value => value,
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

export async function complete(f, s, options = {}) {
  let result;
  for (let i = 0; i < 100; i++) { result = await f.run('scope_design_apply', s, options); if (result.status !== 'IN_PROGRESS') break; }
  assert.equal(result.status, 'COMPLETE', JSON.stringify(result)); return result;
}
