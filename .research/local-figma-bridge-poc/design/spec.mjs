// The same bounded, data-only contract is validated in Node and the Figma plugin.
export const DESIGN_SPEC_VERSION = '1.0';
export const DESIGN_SPEC_LIMITS = Object.freeze({ nodes: 25000, assets: 2000, reactions: 30000, assetBytes: 20 * 1024 * 1024, totalAssetBytes: 80 * 1024 * 1024 });
export class DesignSpecError extends Error {
  constructor(issues) { super(`Invalid DesignSpec: ${issues.slice(0, 5).map(x => `${x.path}: ${x.message}`).join('; ')}`); this.name = 'DesignSpecError'; this.issues = issues; }
}
const TYPES = ['FRAME', 'TEXT', 'RECTANGLE', 'ELLIPSE', 'VECTOR', 'COMPONENT', 'INSTANCE'];
const PROPS = ['fills', 'strokes', 'strokeWeight', 'strokeAlign', 'dashPattern', 'effects', 'cornerRadius', 'opacity', 'clipsContent', 'overflowDirection', 'layoutPositioning', 'isFixed', 'visible', 'characters', 'fontName', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textAlignHorizontal', 'textAutoResize', 'textStyleKey', 'componentKey', 'vectorPaths', 'overrides'];
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
export function validateDesignSpec(spec) {
  const issues = []; const issue = (path, message) => { if (issues.length < 100) issues.push({ path, message }); };
  const object = (v, path, keys) => {
    if (!v || typeof v !== 'object' || Array.isArray(v) || ![Object.prototype, null].includes(Object.getPrototypeOf(v))) { issue(path, 'Expected plain object'); return false; }
    for (const k of Object.keys(v)) if (!keys.includes(k) || BAD_KEYS.has(k)) issue(`${path}.${k}`, 'Unknown property');
    return true;
  };
  const string = (v, path, max = 256, empty = false) => { if (typeof v !== 'string' || (!empty && !v.length) || v.length > max || v.includes('\u0000')) issue(path, `Expected ${empty ? '' : 'nonempty '}string, maximum ${max} characters`); };
  const key = (v, path) => { string(v, path, 160); if (typeof v === 'string' && (!/^[A-Za-z0-9][A-Za-z0-9_.:/-]*$/.test(v) || BAD_KEYS.has(v))) issue(path, 'Invalid stable key'); };
  const num = (v, path, min = -10000000, max = 10000000) => { if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) issue(path, `Expected finite number in [${min}, ${max}]`); };
  const en = (v, path, values) => { if (!values.includes(v)) issue(path, `Expected one of ${values.join(', ')}`); };
  const bool = (v, path) => { if (typeof v !== 'boolean') issue(path, 'Expected boolean'); };
  const array = (v, path, max) => { if (!Array.isArray(v) || v.length > max) { issue(path, `Expected array, maximum ${max} entries`); return []; } return v; };
  const font = (v, p) => { if (object(v, p, ['family', 'style'])) { string(v.family, `${p}.family`, 128); string(v.style, `${p}.style`, 128); } };
  const color = (v, p, alpha = false) => { if (object(v, p, alpha ? ['r', 'g', 'b', 'a'] : ['r', 'g', 'b'])) for (const k of alpha ? ['r', 'g', 'b', 'a'] : ['r', 'g', 'b']) num(v[k], `${p}.${k}`, 0, 1); };
  const spacing = (v, p, auto = false) => { if (object(v, p, ['unit', 'value'])) { en(v.unit, `${p}.unit`, auto ? ['PIXELS', 'PERCENT', 'AUTO'] : ['PIXELS', 'PERCENT']); if (v.unit !== 'AUTO') num(v.value, `${p}.value`, auto ? 0 : -10000, 100000); else if (v.value !== undefined) num(v.value, `${p}.value`, 0, 100000); } };
  if (!object(spec, '$', ['schemaVersion', 'id', 'name', 'source', 'nodes', 'assets', 'textStyles', 'variables', 'reactions', 'flows', 'fontPolicy'])) throw new DesignSpecError(issues);
  en(spec.schemaVersion, '$.schemaVersion', ['1.0']); key(spec.id, '$.id'); string(spec.name, '$.name', 512);
  if (spec.source !== undefined && object(spec.source, '$.source', ['revision', 'capturedAt', 'adapter', 'url'])) {
    for (const k of ['revision', 'adapter']) if (spec.source[k] !== undefined) string(spec.source[k], `$.source.${k}`, 256);
    if (spec.source.capturedAt !== undefined) { string(spec.source.capturedAt, '$.source.capturedAt', 64); if (!Number.isFinite(Date.parse(spec.source.capturedAt))) issue('$.source.capturedAt', 'Invalid timestamp'); }
    if (spec.source.url !== undefined) { string(spec.source.url, '$.source.url', 2048); if (typeof spec.source.url !== 'string' || !/^https?:\/\/(?:\[[a-fA-F0-9:]+\]|[A-Za-z0-9.-]+)(?::[0-9]{1,5})?(?:\/[^\s?#\\]*)?$/.test(spec.source.url)) issue('$.source.url', 'Only HTTP(S) source URL without credentials, query or fragment is allowed'); }
  }
  if (spec.fontPolicy !== undefined && object(spec.fontPolicy, '$.fontPolicy', ['allowFallback', 'fallback'])) { bool(spec.fontPolicy.allowFallback, '$.fontPolicy.allowFallback'); if (spec.fontPolicy.fallback !== undefined) font(spec.fontPolicy.fallback, '$.fontPolicy.fallback'); if (spec.fontPolicy.allowFallback && !spec.fontPolicy.fallback) issue('$.fontPolicy.fallback', 'Fallback font required when enabled'); }
  const maps = { nodes: new Map(), assets: new Map(), variables: new Map(), textStyles: new Map() };
  const entries = (kind, max) => array(spec[kind] ?? [], `$.${kind}`, max).map((v, i) => { const p = `$.${kind}[${i}]`; if (v && typeof v === 'object') { key(v.key, `${p}.key`); if (maps[kind].has(v.key)) issue(`${p}.key`, 'Duplicate key'); maps[kind].set(v.key, v); } return [v, p]; });
  let totalAssetBytes = 0;
  for (const [v, p] of entries('assets', DESIGN_SPEC_LIMITS.assets)) if (object(v, p, ['key', 'mimeType', 'dataBase64'])) {
    en(v.mimeType, `${p}.mimeType`, ['image/png', 'image/jpeg', 'image/webp']);
    string(v.dataBase64, `${p}.dataBase64`, Math.ceil(DESIGN_SPEC_LIMITS.assetBytes / 3) * 4);
    if (typeof v.dataBase64 === 'string') { if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(v.dataBase64)) issue(`${p}.dataBase64`, 'Invalid base64'); totalAssetBytes += Math.floor(v.dataBase64.length * 3 / 4); const signature = { 'image/png': /^iVBORw0KGgo/, 'image/jpeg': /^\/9j\//, 'image/webp': /^UklGR/ }[v.mimeType]; if (signature && !signature.test(v.dataBase64)) issue(`${p}.dataBase64`, 'Image signature does not match MIME type'); }
  }
  if (totalAssetBytes > DESIGN_SPEC_LIMITS.totalAssetBytes) issue('$.assets', 'Total asset byte budget exceeded');
  for (const [v, p] of entries('variables', 5000)) if (object(v, p, ['key', 'name', 'value'])) { string(v.name, `${p}.name`, 256); color(v.value, `${p}.value`, true); }
  for (const [v, p] of entries('textStyles', 5000)) if (object(v, p, ['key', 'name', 'fontName', 'fontSize', 'lineHeight', 'letterSpacing'])) { string(v.name, `${p}.name`, 256); font(v.fontName, `${p}.fontName`); num(v.fontSize, `${p}.fontSize`, 0.1, 10000); if (v.lineHeight !== undefined) spacing(v.lineHeight, `${p}.lineHeight`, true); if (v.letterSpacing !== undefined) spacing(v.letterSpacing, `${p}.letterSpacing`); }
  const nodeEntries = entries('nodes', DESIGN_SPEC_LIMITS.nodes);
  if (!nodeEntries.length) issue('$.nodes', 'At least one node required');
  const ref = (kind, value, path) => { key(value, path); if (!maps[kind].has(value)) issue(path, `Unknown ${kind} reference`); };
  const paints = (items, path, images = true) => {
    for (const [i, v] of array(items, path, 16).entries()) {
      const p = `${path}[${i}]`;
      if (!object(v, p, ['type', 'color', 'opacity', 'variableKey', 'assetKey', 'scaleMode', 'gradientStops', 'gradientTransform'])) continue;
      en(v.type, `${p}.type`, images ? ['SOLID', 'IMAGE', 'GRADIENT_LINEAR'] : ['SOLID']);
      if (v.opacity !== undefined) num(v.opacity, `${p}.opacity`, 0, 1);
      if (v.type === 'SOLID') {
        color(v.color, `${p}.color`); if (v.variableKey !== undefined) ref('variables', v.variableKey, `${p}.variableKey`);
        if (v.assetKey !== undefined || v.scaleMode !== undefined) issue(p, 'Image fields require IMAGE paint');
      } else if (v.type === 'IMAGE') {
        ref('assets', v.assetKey, `${p}.assetKey`); if (v.scaleMode !== undefined) en(v.scaleMode, `${p}.scaleMode`, ['FILL', 'FIT', 'CROP', 'TILE']);
        if (v.color !== undefined || v.variableKey !== undefined) issue(p, 'Solid fields require SOLID paint');
      } else if (v.type === 'GRADIENT_LINEAR') {
        if (['color', 'variableKey', 'assetKey', 'scaleMode'].some(field => v[field] !== undefined)) issue(p, 'Solid and image fields are invalid on gradients');
        const stops = array(v.gradientStops, `${p}.gradientStops`, 16);
        if (stops.length < 2) issue(`${p}.gradientStops`, 'Expected at least two color stops');
        for (const [index, stop] of stops.entries()) {
          const sp = `${p}.gradientStops[${index}]`;
          if (object(stop, sp, ['position', 'color'])) {
            num(stop.position, `${sp}.position`, 0, 1); color(stop.color, `${sp}.color`, true);
            if (index && stop.position < stops[index - 1]?.position) issue(`${sp}.position`, 'Color stops must be nondecreasing');
          }
        }
        const matrix = array(v.gradientTransform, `${p}.gradientTransform`, 2);
        if (matrix.length !== 2) issue(`${p}.gradientTransform`, 'Expected a two by three transform');
        for (const [rowIndex, row] of matrix.entries()) {
          const values = array(row, `${p}.gradientTransform[${rowIndex}]`, 3);
          if (values.length !== 3) issue(`${p}.gradientTransform[${rowIndex}]`, 'Expected three transform values');
          for (const [column, value] of values.entries()) num(value, `${p}.gradientTransform[${rowIndex}][${column}]`, -10000, 10000);
        }
        if (matrix.length === 2 && matrix.every(row => Array.isArray(row) && row.length === 3 && row.every(Number.isFinite)) && Math.abs(matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0]) <= 1e-8) issue(`${p}.gradientTransform`, 'Transform must be invertible');
      }
      if (v.type !== 'GRADIENT_LINEAR' && (v.gradientStops !== undefined || v.gradientTransform !== undefined)) issue(p, 'Gradient fields require GRADIENT_LINEAR paint');
    }
  };
  for (const [v, p] of nodeEntries) if (object(v, p, ['key', 'type', 'name', 'parentKey', 'x', 'y', 'width', 'height', 'props'])) {
    en(v.type, `${p}.type`, TYPES); if (v.name !== undefined) string(v.name, `${p}.name`, 512);
    for (const k of ['x', 'y']) num(v[k], `${p}.${k}`); for (const k of ['width', 'height']) num(v[k], `${p}.${k}`, 0.01, 100000);
    if (v.parentKey !== null) { ref('nodes', v.parentKey, `${p}.parentKey`); if (!['FRAME', 'COMPONENT'].includes(maps.nodes.get(v.parentKey)?.type)) issue(`${p}.parentKey`, 'Parent must be FRAME or COMPONENT'); } else if (!['FRAME', 'COMPONENT'].includes(v.type)) issue(p, 'Root node must be FRAME or COMPONENT');
    const props = v.props ?? {};
    if (!object(props, `${p}.props`, PROPS)) continue;
    for (const field of ['visible', 'clipsContent', 'isFixed']) if (props[field] !== undefined) bool(props[field], `${p}.props.${field}`);
    if (props.clipsContent !== undefined && !['FRAME', 'COMPONENT', 'INSTANCE'].includes(v.type)) issue(`${p}.props.clipsContent`, 'Clipping requires FRAME, COMPONENT or INSTANCE');
    if (props.cornerRadius !== undefined && !['FRAME', 'COMPONENT', 'INSTANCE', 'RECTANGLE'].includes(v.type)) issue(`${p}.props.cornerRadius`, 'Corner radius requires a rectangular node');
    if (props.isFixed && (v.parentKey === null || !['HORIZONTAL', 'VERTICAL', 'BOTH'].includes(maps.nodes.get(v.parentKey)?.props?.overflowDirection))) issue(`${p}.props.isFixed`, 'Fixed child requires a scrolling parent');
    for (const field of ['strokeWeight', 'cornerRadius']) if (props[field] !== undefined) num(props[field], `${p}.props.${field}`, 0, 100000);
    if (props.opacity !== undefined) num(props.opacity, `${p}.props.opacity`, 0, 1);
    if (props.layoutPositioning !== undefined) en(props.layoutPositioning, `${p}.props.layoutPositioning`, ['AUTO', 'ABSOLUTE']);
    if (props.overflowDirection !== undefined) { en(props.overflowDirection, `${p}.props.overflowDirection`, ['NONE', 'HORIZONTAL', 'VERTICAL', 'BOTH']); if (!['FRAME', 'COMPONENT'].includes(v.type)) issue(p, 'Overflow requires FRAME or COMPONENT'); }
    if (props.fills !== undefined) paints(props.fills, `${p}.props.fills`);
    if (props.strokes !== undefined) paints(props.strokes, `${p}.props.strokes`, false);
    if (props.strokeAlign !== undefined) en(props.strokeAlign, `${p}.props.strokeAlign`, ['INSIDE', 'OUTSIDE', 'CENTER']);
    if (props.dashPattern !== undefined) {
      const pattern = array(props.dashPattern, `${p}.props.dashPattern`, 16);
      if (!pattern.length) issue(`${p}.props.dashPattern`, 'Expected at least one dash length');
      for (const [i, length] of pattern.entries()) num(length, `${p}.props.dashPattern[${i}]`, 0, 10000);
    }
    if (props.effects !== undefined) for (const [i, effect] of array(props.effects, `${p}.props.effects`, 16).entries()) {
      const ep = `${p}.props.effects[${i}]`;
      if (!object(effect, ep, ['type', 'color', 'offset', 'radius', 'spread', 'visible'])) continue;
      en(effect.type, `${ep}.type`, ['DROP_SHADOW', 'INNER_SHADOW']); color(effect.color, `${ep}.color`, true);
      if (object(effect.offset, `${ep}.offset`, ['x', 'y'])) { num(effect.offset.x, `${ep}.offset.x`, -100000, 100000); num(effect.offset.y, `${ep}.offset.y`, -100000, 100000); }
      num(effect.radius, `${ep}.radius`, 0, 100000); if (effect.spread !== undefined) num(effect.spread, `${ep}.spread`, -100000, 100000); if (effect.visible !== undefined) bool(effect.visible, `${ep}.visible`);
    }
    if (props.overrides !== undefined) {
      if (v.type !== 'INSTANCE') issue(`${p}.props.overrides`, 'Overrides require INSTANCE');
      const overridden = new Set();
      for (const [i, override] of array(props.overrides, `${p}.props.overrides`, 1000).entries()) {
        const op = `${p}.props.overrides[${i}]`;
        if (!object(override, op, ['sourceKey', 'characters', 'visible', 'fills'])) continue;
        ref('nodes', override.sourceKey, `${op}.sourceKey`); if (overridden.has(override.sourceKey)) issue(op, 'Duplicate override source'); overridden.add(override.sourceKey);
        const target = maps.nodes.get(override.sourceKey); let ancestor = target && maps.nodes.get(target.parentKey); const ancestors = new Set(); let descendant = false;
        while (ancestor && !ancestors.has(ancestor.key)) { if (ancestor.key === props.componentKey) { descendant = true; break; } ancestors.add(ancestor.key); ancestor = maps.nodes.get(ancestor.parentKey); }
        if (!descendant) issue(`${op}.sourceKey`, 'Override source must be a descendant of the referenced component');
        if (override.characters !== undefined) { if (target?.type !== 'TEXT') issue(`${op}.characters`, 'Text override requires TEXT source'); string(override.characters, `${op}.characters`, 100000, true); }
        if (override.visible !== undefined) bool(override.visible, `${op}.visible`);
        if (override.fills !== undefined) paints(override.fills, `${op}.fills`);
        if (Object.keys(override).length < 2) issue(op, 'Override must change characters, visible or fills');
      }
    }
    for (const field of ['characters', 'fontName', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textAlignHorizontal', 'textAutoResize', 'textStyleKey']) if (props[field] !== undefined && v.type !== 'TEXT') issue(`${p}.props.${field}`, 'Text-only property');
    if (v.type === 'TEXT') { string(props.characters, `${p}.props.characters`, 100000, true); if (!props.fontName && !props.textStyleKey) issue(p, 'Text requires fontName or textStyleKey'); if (props.fontName !== undefined) font(props.fontName, `${p}.props.fontName`); if (props.fontSize !== undefined) num(props.fontSize, `${p}.props.fontSize`, 0.1, 10000); if (props.fontWeight !== undefined) { en(props.fontWeight, `${p}.props.fontWeight`, [100, 200, 300, 400, 500, 600, 700, 800, 900]); const expected = {100:'thin',200:'extralight',300:'light',400:'regular',500:'medium',600:'semibold',700:'bold',800:'extrabold',900:'black'}[props.fontWeight]; const selected = props.fontName ?? maps.textStyles.get(props.textStyleKey)?.fontName; const selectedStyle = selected?.style?.toLowerCase().replace(/[ -]/g, '').replace(/italic$/, '') || 'regular'; if (selectedStyle !== expected) issue(`${p}.props.fontWeight`, 'fontWeight must match the explicit fontName.style; the font style controls Figma weight'); } if (props.lineHeight !== undefined) spacing(props.lineHeight, `${p}.props.lineHeight`, true); if (props.letterSpacing !== undefined) spacing(props.letterSpacing, `${p}.props.letterSpacing`); if (props.textAlignHorizontal !== undefined) en(props.textAlignHorizontal, `${p}.props.textAlignHorizontal`, ['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED']); if (props.textAutoResize !== undefined) en(props.textAutoResize, `${p}.props.textAutoResize`, ['NONE', 'HEIGHT', 'WIDTH_AND_HEIGHT']); if (props.textStyleKey !== undefined) ref('textStyles', props.textStyleKey, `${p}.props.textStyleKey`); }
    if (v.type === 'INSTANCE') { ref('nodes', props.componentKey, `${p}.props.componentKey`); if (maps.nodes.get(props.componentKey)?.type !== 'COMPONENT') issue(p, 'Instance must reference COMPONENT'); } else if (props.componentKey !== undefined) issue(p, 'componentKey requires INSTANCE');
    if (props.vectorPaths !== undefined) { if (v.type !== 'VECTOR') issue(p, 'vectorPaths requires VECTOR'); for (const [i, path] of array(props.vectorPaths, `${p}.props.vectorPaths`, 1000).entries()) { const pp = `${p}.props.vectorPaths[${i}]`; if (object(path, pp, ['windingRule', 'data'])) { en(path.windingRule, `${pp}.windingRule`, ['NONZERO', 'EVENODD']); string(path.data, `${pp}.data`, 200000); if (typeof path.data === 'string' && (!/^[Mm]/.test(path.data.trim()) || !/^[MmZzLlHhVvCcSsQqTtAaEe0-9+.,\s-]+$/.test(path.data))) issue(pp, 'Only SVG path command data allowed'); } } }
  }
  // Dependencies include the component referenced by an instance, so cycles cannot
  // hide in a component containing an instance of itself.
  if (!issues.length) { try { orderDesignNodes(spec); } catch (error) { issue('$.nodes', error.message); } }
  const triggerKeys = new Set();
  for (const [i, v] of array(spec.reactions ?? [], '$.reactions', DESIGN_SPEC_LIMITS.reactions).entries()) { const p = `$.reactions[${i}]`; if (!object(v, p, ['sourceKey', 'destinationKey', 'trigger'])) continue; ref('nodes', v.sourceKey, `${p}.sourceKey`); ref('nodes', v.destinationKey, `${p}.destinationKey`); if (maps.nodes.get(v.destinationKey)?.type !== 'FRAME' || maps.nodes.get(v.destinationKey)?.parentKey !== null) issue(p, 'Destination must be a root FRAME'); if (object(v.trigger, `${p}.trigger`, ['type', 'delaySeconds'])) { en(v.trigger.type, `${p}.trigger.type`, ['ON_CLICK', 'AFTER_TIMEOUT']); if (v.trigger.type === 'AFTER_TIMEOUT') num(v.trigger.delaySeconds, `${p}.trigger.delaySeconds`, 0.001, 3600); else if (v.trigger.delaySeconds !== undefined) issue(p, 'delaySeconds only applies to AFTER_TIMEOUT'); const identity = `${v.sourceKey}:${v.trigger.type}`; if (triggerKeys.has(identity)) issue(p, 'Duplicate source and trigger'); triggerKeys.add(identity); } }
  const flowKeys = new Set();
  for (const [i, v] of array(spec.flows ?? [], '$.flows', 1000).entries()) { const p = `$.flows[${i}]`; if (object(v, p, ['nodeKey', 'name'])) { ref('nodes', v.nodeKey, `${p}.nodeKey`); string(v.name, `${p}.name`, 256); if (maps.nodes.get(v.nodeKey)?.parentKey !== null || maps.nodes.get(v.nodeKey)?.type !== 'FRAME') issue(p, 'Flow start must be a root FRAME'); if (flowKeys.has(v.nodeKey)) issue(p, 'Duplicate flow start'); flowKeys.add(v.nodeKey); } }
  if (issues.length) throw new DesignSpecError(issues);
  return spec;
}
export function safeValidateDesignSpec(spec) { try { return { success: true, data: validateDesignSpec(spec) }; } catch (error) { if (!(error instanceof DesignSpecError)) throw error; return { success: false, issues: error.issues }; } }
export function orderDesignNodes(spec) {
  const nodes = new Map(spec.nodes.map(node => [node.key, node])); const indegree = new Map(); const children = new Map();
  const componentDependencies = new Map(spec.nodes.filter(node => node.type === 'COMPONENT').map(node => [node.key, new Set()]));
  for (const node of spec.nodes.filter(node => node.type === 'INSTANCE')) {
    const visited = new Set(); let ancestor = nodes.get(node.parentKey);
    while (ancestor) { if (visited.has(ancestor.key)) throw new Error('Cyclic parent/component dependency'); visited.add(ancestor.key); if (ancestor.type === 'COMPONENT') componentDependencies.get(ancestor.key).add(node.props?.componentKey); ancestor = nodes.get(ancestor.parentKey); }
  }
  const completed = new Set(), active = new Set();
  function visitComponent(key) { if (completed.has(key)) return; if (active.has(key)) throw new Error('Cyclic component instance dependency'); active.add(key); for (const dep of componentDependencies.get(key) ?? []) visitComponent(dep); active.delete(key); completed.add(key); }
  for (const key of componentDependencies.keys()) visitComponent(key);
  const descendants = new Map();
  for (const node of spec.nodes) { let parent = nodes.get(node.parentKey); const seen = new Set(); while (parent) { if (seen.has(parent.key)) throw new Error('Cyclic parent/component dependency'); seen.add(parent.key); if (parent.type === 'COMPONENT') { if (!descendants.has(parent.key)) descendants.set(parent.key, []); descendants.get(parent.key).push(node.key); } parent = nodes.get(parent.parentKey); } }
  for (const node of spec.nodes) { const deps = [...new Set([node.parentKey, node.props?.componentKey, ...(descendants.get(node.props?.componentKey) ?? [])].filter(Boolean))]; indegree.set(node.key, deps.length); for (const dep of deps) { if (!nodes.has(dep)) throw new Error(`Unknown dependency ${dep}`); if (!children.has(dep)) children.set(dep, []); children.get(dep).push(node.key); } }
  const queue = spec.nodes.filter(node => indegree.get(node.key) === 0); const result = [];
  for (let i = 0; i < queue.length; i++) { const node = queue[i]; result.push(node); for (const child of children.get(node.key) ?? []) { indegree.set(child, indegree.get(child) - 1); if (indegree.get(child) === 0) queue.push(nodes.get(child)); } }
  if (result.length !== spec.nodes.length) throw new Error('Cyclic parent/component dependency'); return result;
}
