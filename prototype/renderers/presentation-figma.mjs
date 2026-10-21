import { validateDesignSpec } from '../../.research/local-figma-bridge-poc/design/spec.mjs';
import { getPresentationRenderContext } from '../core/presentation-render.mjs';
import { stableId } from '../core/model.mjs';
import { nativeActionCapability } from '../core/interaction-capabilities.mjs';

const rgba = hex => ({ r: parseInt(hex.slice(1, 3), 16) / 255, g: parseInt(hex.slice(3, 5), 16) / 255,
  b: parseInt(hex.slice(5, 7), 16) / 255, a: hex.length === 9 ? parseInt(hex.slice(7, 9), 16) / 255 : 1 });
const equalFont = (a, b) => a?.family === b?.family && a?.style === b?.style;

/** A native adapter of the shared evidence tree. Never accesses a Figma file. */
export function renderPresentationFigma(input, options = {}) {
  const { model, compiled, modelRevision, resolvedAssets } = getPresentationRenderContext(input, options);
  const tokens = new Map(compiled.tokens.map(token => [token.id, token]));
  const assetMap = resolvedAssets.byId;
  const assetKey = id => { const asset = assetMap.get(id); if (!asset) throw new Error('PRESENTATION_ASSET_NOT_READY'); return `asset-${asset.sha256}`; };
  const paint = (value, tokenIds = []) => {
    if (value.type === 'SOLID') {
      const color = rgba(value.color), token = (value.opacity === undefined || value.opacity === 1) && tokenIds.map(id => tokens.get(id)).find(t => t?.type === 'color' && t.value.toLowerCase() === value.color.toLowerCase());
      return { type: 'SOLID', color: { r: color.r, g: color.g, b: color.b }, ...(color.a !== 1 || value.opacity !== undefined ? { opacity: color.a * (value.opacity ?? 1) } : {}), ...(token ? { variableKey: token.id } : {}) };
    }
    if (value.type === 'IMAGE') {
      if (!assetMap.has(value.assetId)) throw new Error('PRESENTATION_ASSET_NOT_READY');
      return { type: 'IMAGE', assetKey: assetKey(value.assetId), scaleMode: value.scaleMode, ...(value.transform ? { imageTransform: value.transform } : {}), ...(value.opacity !== undefined ? { opacity: value.opacity } : {}) };
    }
    return { type: value.type, gradientStops: value.stops.map(stop => ({ position: stop.position, color: rgba(stop.color) })), gradientTransform: value.transform };
  };
  const styleProps = style => {
    const props = {};
    for (const field of ['strokeWeight', 'cornerRadius', 'visible', 'opacity', 'clipsContent', 'isMask', 'maskType']) if (style?.[field] !== undefined) props[field] = style[field];
    for (const field of ['fills', 'strokes']) if (style?.[field]) props[field] = style[field].map(p => paint(p, style.tokenIds));
    return props;
  };
  const textProps = text => {
    if (!text?.ranges || text.characters.length && !text.ranges.length) throw new Error('PRESENTATION_VISUAL_INCOMPLETE');
    if (!text.ranges.length) throw new Error('PRESENTATION_EMPTY_TEXT_FONT_NOT_READY');
    const first = text.ranges[0];
    return { characters: text.characters, fontName: first.font, fontSize: first.fontSize, textAutoResize: 'NONE',
      textRanges: text.ranges.map(range => ({ start: range.start, end: range.end, fontName: range.font, fontSize: range.fontSize,
        ...(range.lineHeight === undefined ? {} : { lineHeight: { unit: 'PIXELS', value: range.lineHeight } }),
        ...(range.letterSpacing === undefined ? {} : { letterSpacing: { unit: 'PIXELS', value: range.letterSpacing } }),
        ...(range.fills ? { fills: range.fills.map(p => paint(p)) } : {}) })) };
  };
  const geometryProps = geometry => ({ ...(geometry?.rotation === undefined ? {} : { rotation: geometry.rotation }), ...(geometry?.transform ? { relativeTransform: geometry.transform } : {}) });
  const layoutProps = layout => {
    if (!layout) return {};
    const props = {};
    if (layout.mode !== 'absolute') {
      props.layoutMode = layout.mode.toUpperCase();
      if (layout.gap !== undefined) props.itemSpacing = layout.gap;
      for (const side of ['top', 'right', 'bottom', 'left']) if (layout.padding) props[`padding${side[0].toUpperCase()}${side.slice(1)}`] = layout.padding[side];
      if (layout.justify) props.primaryAxisAlignItems = { start: 'MIN', center: 'CENTER', end: 'MAX', 'space-between': 'SPACE_BETWEEN' }[layout.justify];
      if (layout.align) props.counterAxisAlignItems = { start: 'MIN', center: 'CENTER', end: 'MAX', baseline: 'BASELINE', stretch: 'MIN' }[layout.align];
      if (layout.wrap !== undefined) props.layoutWrap = layout.wrap ? 'WRAP' : 'NO_WRAP';
    } else props.layoutMode = 'NONE';
    for (const axis of ['Horizontal', 'Vertical']) if (layout[`sizing${axis}`]) props[`layoutSizing${axis}`] = layout[`sizing${axis}`].toUpperCase();
    if (layout.constraints) props.constraints = layout.constraints;
    if (layout.fixed !== undefined) props.isFixed = layout.fixed;
    if (layout.overflow !== undefined) props.overflowDirection = layout.overflow.toUpperCase();
    return props;
  };
  const nodeById = new Map(compiled.nodes.map(node => [node.id, node]));
  const effectiveLayout = node => node?.layout ?? (node?.kind === 'instance' ? nodeById.get(node.componentId)?.layout : undefined);
  const nodes = compiled.nodes.map(node => {
    const g = node.geometry; if (!g || g.width <= 0 || g.height <= 0) throw new Error('PRESENTATION_GEOMETRY_NOT_READY');
    let type = { frame: 'FRAME', text: 'TEXT', image: 'RECTANGLE', vector: 'VECTOR', component: 'COMPONENT', instance: 'INSTANCE' }[node.kind];
    if (node.kind === 'shape') { type = { rectangle: 'RECTANGLE', ellipse: 'ELLIPSE' }[node.shape ?? 'rectangle']; if (!type) throw new Error('PRESENTATION_SHAPE_UNSUPPORTED'); }
    const layout = effectiveLayout(node), props = { ...styleProps(node.style), ...geometryProps(g), ...layoutProps(layout) };
    if (!['FRAME', 'COMPONENT', 'INSTANCE'].includes(type)) delete props.layoutMode;
    const parent = nodeById.get(node.parentId), parentLayout = effectiveLayout(parent);
    if (parentLayout && parentLayout.mode !== 'absolute' && layout?.positioning) props.layoutPositioning = layout.positioning.toUpperCase();
    if (parentLayout?.mode !== 'absolute' && parentLayout?.align === 'stretch' && props.layoutPositioning !== 'ABSOLUTE') {
      const axis = parentLayout.mode === 'horizontal' ? 'Vertical' : 'Horizontal';
      if (layout?.[`sizing${axis}`] === undefined) props[`layoutSizing${axis}`] = 'FILL';
    }
    if (type === 'TEXT') {
      Object.assign(props, textProps(node.text));
      if (props.layoutSizingHorizontal === 'HUG' || props.layoutSizingVertical === 'HUG') delete props.textAutoResize;
      const token = (node.style?.tokenIds ?? []).map(id => tokens.get(id)).find(t => t?.type === 'text' && node.text.ranges.every(r => equalFont(r.font, t.value.font) && r.fontSize === t.value.fontSize && r.lineHeight === undefined && r.letterSpacing === undefined));
      if (token) props.textStyleKey = token.id;
    }
    if (node.kind === 'image' && !(props.fills ?? []).some(p => p.type === 'IMAGE')) {
      if (!assetMap.has(node.assetId)) throw new Error('PRESENTATION_ASSET_NOT_READY');
      props.fills = [...props.fills ?? [], { type: 'IMAGE', assetKey: assetKey(node.assetId), scaleMode: 'FILL' }];
    }
    if (type === 'VECTOR') props.vectorPaths = node.vectorPaths;
    if (type === 'INSTANCE') {
      props.componentKey = node.componentId;
      props.overrides = (node.overrides ?? []).map(override => {
        const text = override.text ? textProps(override.text) : {}; delete text.textAutoResize;
        return { sourceKey: override.nodeId, ...styleProps(override.style), ...geometryProps(override.geometry), ...text,
          ...Object.fromEntries(['x', 'y', 'width', 'height'].filter(k => override.geometry?.[k] !== undefined).map(k => [k, override.geometry[k]])) };
      });
    }
    // Empty container fills are explicit so host defaults cannot invent white.
    if (['FRAME', 'COMPONENT', 'RECTANGLE', 'ELLIPSE', 'VECTOR'].includes(type) && props.fills === undefined) props.fills = [];
    return { key: node.id, type, name: node.id, parentKey: node.parentId, x: g.x, y: g.y, width: g.width, height: g.height, props };
  });
  const variables = compiled.tokens.filter(t => t.type !== 'text').map(t => ({ key: t.id, name: t.id,
    ...(t.type === 'number' ? { type: 'FLOAT', value: t.value } : { value: rgba(t.value) }) }));
  const textStyles = compiled.tokens.filter(t => t.type === 'text').map(t => ({ key: t.id, name: t.id, fontName: t.value.font, fontSize: t.value.fontSize }));
  const assets = resolvedAssets.assets.map(asset => ({ key: `asset-${asset.sha256}`, mimeType: asset.mimeType, sha256: asset.sha256, decodedBytes: asset.bytes.length }));
  const byKey = new Map(nodes.map(node => [node.key, node])), sceneRoots = {}, maxWidth = Math.max(...compiled.scenes.map(scene => scene.viewport.width)), maxHeight = Math.max(...compiled.scenes.map(scene => scene.viewport.height));
  for (const [i, scene] of compiled.scenes.entries()) {
    const key = stableId('viewport', [scene.id]); if (byKey.has(key)) throw new Error('PRESENTATION_VIEWPORT_KEY_COLLISION');
    const root = byKey.get(scene.rootNodeId), sourceRoot = nodeById.get(scene.rootNodeId);
    root.parentKey = key; root.x = 0; root.y = 0;
    if (root.props.relativeTransform) { root.props.relativeTransform = root.props.relativeTransform.map(row => [...row]); root.props.relativeTransform[0][2] = 0; root.props.relativeTransform[1][2] = 0; }
    const viewport = { key, name: scene.id, type: 'FRAME', parentKey: null, x: i % 3 * (maxWidth + 160), y: Math.floor(i / 3) * (maxHeight + 160), width: scene.viewport.width, height: scene.viewport.height,
      props: { fills: [], clipsContent: true, layoutMode: 'NONE', ...(effectiveLayout(sourceRoot)?.overflow ? { overflowDirection: effectiveLayout(sourceRoot).overflow.toUpperCase() } : {}) } };
    nodes.push(viewport); byKey.set(key, viewport); sceneRoots[scene.id] = key;
  }
  const memberFamilies = new Map(compiled.componentFamilies.flatMap(family => family.memberNodeIds.map(id => [id, family])));
  const nativeActions = model.actions.filter(action => nativeActionCapability(model, action, nodeById).status === 'SUPPORTED');
  const usedFamilies = new Map(), pendingFamilies = nativeActions.filter(action => action.effect.type === 'change-state').map(action => memberFamilies.get(action.effect.stateNodeId));
  const sourceChildren = new Map();
  for (const node of compiled.nodes) { if (!sourceChildren.has(node.parentId)) sourceChildren.set(node.parentId, []); sourceChildren.get(node.parentId).push(node); }
  while (pendingFamilies.length) {
    const family = pendingFamilies.pop(); if (!family || usedFamilies.has(family.id)) continue;
    usedFamilies.set(family.id, family);
    const descendants = family.memberNodeIds.map(id => nodeById.get(id));
    for (let i = 0; i < descendants.length; i++) {
      const node = descendants[i]; descendants.push(...sourceChildren.get(node.id) ?? []);
      if (node.kind === 'instance' && memberFamilies.has(node.componentId)) pendingFamilies.push(memberFamilies.get(node.componentId));
    }
  }
  const componentSets = [];
  for (const family of usedFamilies.values()) {
    const members = family.memberNodeIds.map(id => byKey.get(id));
    if (new Set(members.map(member => member.parentKey)).size !== 1) throw new Error('PRESENTATION_NATIVE_FAMILY_PARENT_UNSUPPORTED');
    const key = stableId('component-set', [family.id]); if (byKey.has(key)) throw new Error('PRESENTATION_COMPONENT_SET_KEY_COLLISION');
    const x = Math.min(...members.map(member => member.x)), y = Math.min(...members.map(member => member.y));
    const group = { key, type: 'COMPONENT_SET', name: family.id, parentKey: members[0].parentKey, x, y,
      width: Math.max(...members.map(member => member.x + member.width)) - x, height: Math.max(...members.map(member => member.y + member.height)) - y, props: { fills: [] } };
    nodes.push(group); byKey.set(key, group); componentSets.push({ key, memberKeys: [...family.memberNodeIds] });
    for (const member of members) {
      member.name = `State=${encodeURIComponent(nodeById.get(member.key).sourceNodeId)}`;
      member.parentKey = key; member.x -= x; member.y -= y;
      if (member.props.relativeTransform) { member.props.relativeTransform = member.props.relativeTransform.map(row => [...row]); member.props.relativeTransform[0][2] -= x; member.props.relativeTransform[1][2] -= y; }
    }
  }
  const trigger = value => value.type === 'timeout' ? { type: 'AFTER_TIMEOUT', timeoutMs: value.delayMs }
    : ['mouse-enter', 'mouse-leave'].includes(value.type) ? { type: value.type === 'mouse-enter' ? 'MOUSE_ENTER' : 'MOUSE_LEAVE', delayMs: value.delayMs ?? 0 }
      : { type: value.type === 'hover' ? 'ON_HOVER' : 'ON_CLICK' };
  const reactions = nativeActions.flatMap(action => {
    if (action.effect.type === 'change-state') return [{ sourceKey: action.source.nodeId, destinationKey: action.effect.stateNodeId, navigation: 'CHANGE_TO', trigger: trigger(action.trigger) }];
    if (action.effect.type === 'navigate') return [{ sourceKey: action.source.nodeId, destinationKey: sceneRoots[action.effect.sceneId], trigger: trigger(action.trigger) }];
    return [];
  });
  const behaviorStates = [];
  let stateY = Math.max(...nodes.filter(node => node.parentKey === null).map(node => node.y + node.height)) + 160;
  const addStateNode = node => { if (byKey.has(node.key)) throw new Error('PRESENTATION_BEHAVIOR_KEY_COLLISION'); nodes.push(node); byKey.set(node.key, node); return node; };
  for (const behavior of model.presentation.behaviors ?? []) {
    const source = byKey.get(behavior.source.nodeId), scene = compiled.scenes.find(scene => scene.id === behavior.source.sceneId);
    if (behavior.type === 'truncate-tooltip') {
      const characters = source.props.characters, points = [...characters], keys = [source.key];
      if (points.length > behavior.maxCharacters) {
        const boardKey = stableId('tooltip-state', [behavior.id]), textKey = stableId('tooltip-text', [behavior.id]);
        const board = addStateNode({ key: boardKey, type: 'FRAME', name: `${behavior.id} / full-text`, parentKey: null, x: 0, y: stateY, width: Math.max(200, source.width + 40), height: source.height + 40, props: { fills: [], clipsContent: false } });
        const text = structuredClone(source); text.key = textKey; text.name = `${behavior.id} / full-text`; text.parentKey = boardKey; text.x = 20; text.y = 20;
        text.props.textAutoResize = 'HEIGHT'; delete text.props.isFixed; delete text.props.layoutPositioning; delete text.props.layoutSizingHorizontal; delete text.props.layoutSizingVertical;
        if (text.props.relativeTransform) { text.props.relativeTransform[0][2] = 20; text.props.relativeTransform[1][2] = 20; }
        addStateNode(text); keys.push(boardKey, textKey); stateY += board.height + 160;
        const prefix = points.slice(0, behavior.maxCharacters).join(''); source.props.characters = prefix + '…';
        source.props.textRanges = source.props.textRanges.filter(range => range.start < prefix.length).map(range => ({ ...range, end: Math.min(range.end, prefix.length) }));
        source.props.textRanges.at(-1).end++;
      }
      behaviorStates.push({ behaviorId: behavior.id, mode: 'SIMULATED', nodeKeys: keys });
    } else if (behavior.type === 'sticky-copy') {
      const target = byKey.get(behavior.targetNodeId), viewport = byKey.get(sceneRoots[scene.id]), baseNodes = [...nodes];
      const absolutePosition = key => {
        let node = byKey.get(key), x = 0, y = 0;
        while (node && node.key !== viewport.key) {
          if (node.props.rotation || node.props.relativeTransform && (node.props.relativeTransform[0][0] !== 1 || node.props.relativeTransform[0][1] !== 0 || node.props.relativeTransform[1][0] !== 0 || node.props.relativeTransform[1][1] !== 1)) throw new Error('PRESENTATION_STICKY_TRANSFORM_UNSUPPORTED');
          x += node.x; y += node.y; node = byKey.get(node.parentKey);
        }
        if (!node) throw new Error('PRESENTATION_STICKY_SOURCE_SCOPE');
        return { x, y };
      };
      const original = absolutePosition(source.key), bar = absolutePosition(target.key), threshold = original.y + source.height;
      target.props.visible = false;
      const keys = [source.key, target.key], descendants = baseNodes.filter(node => {
        let current = node; while (current && current.key !== viewport.key) current = byKey.get(current.parentKey);
        return Boolean(current);
      });
      for (const [phaseIndex, phase] of ['before', 'after'].entries()) {
        const keyMap = new Map(descendants.map(node => [node.key, stableId('sticky-state', [behavior.id, phase, node.key])]));
        for (const node of descendants) {
          const clone = structuredClone(node); clone.key = keyMap.get(node.key);
          if (node.type !== 'COMPONENT') clone.name = `${behavior.id} / ${phase} / ${node.name ?? node.key}`;
          clone.parentKey = keyMap.get(node.parentKey) ?? null;
          if (clone.props.componentKey && keyMap.has(clone.props.componentKey)) clone.props.componentKey = keyMap.get(clone.props.componentKey);
          if (clone.props.overrides) clone.props.overrides = clone.props.overrides.map(value => ({ ...value, sourceKey: keyMap.get(value.sourceKey) ?? value.sourceKey }));
          if (node.key === viewport.key) { clone.x = phaseIndex * (viewport.width + 160); clone.y = stateY; clone.props.overflowDirection = 'VERTICAL'; keys.push(clone.key); }
          if (node.key === scene.rootNodeId && phase === 'after') { clone.y -= threshold; if (clone.props.relativeTransform) clone.props.relativeTransform[1][2] = clone.y; }
          if (node.key === target.key) {
            clone.parentKey = keyMap.get(viewport.key); clone.x = bar.x; clone.y = bar.y; clone.props.isFixed = true; clone.props.visible = phase === 'after';
            delete clone.props.layoutPositioning;
            if (clone.props.relativeTransform) { clone.props.relativeTransform[0][2] = clone.x; clone.props.relativeTransform[1][2] = clone.y; }
            keys.push(clone.key);
          }
          addStateNode(clone);
        }
        for (const group of [...componentSets]) if (keyMap.has(group.key)) componentSets.push({ key: keyMap.get(group.key), memberKeys: group.memberKeys.map(key => keyMap.get(key)) });
      }
      behaviorStates.push({ behaviorId: behavior.id, mode: 'SIMULATED', nodeKeys: keys }); stateY += viewport.height + 160;
    }
  }
  const spec = validateDesignSpec({ schemaVersion: '1.1', id: `presentation-${modelRevision.slice(0, 32)}`, name: model.name,
    source: { revision: modelRevision, modelRevision, sceneIds: compiled.scenes.map(scene => scene.id), sceneRoots, adapter: 'prototype-presentation-1.1', ...(behaviorStates.length ? { behaviorStates } : {}) },
    fontPolicy: { allowFallback: false }, nodes, assets, variables, textStyles, reactions, flows: [], ...(componentSets.length ? { componentSets } : {}) });
  if (Buffer.byteLength(JSON.stringify(spec)) > 6.5 * 1024 * 1024) throw new Error('PRESENTATION_FIGMA_LOGICAL_SPEC_BUDGET');
  return spec;
}
