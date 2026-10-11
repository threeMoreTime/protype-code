import { createHash } from 'node:crypto';
import { validateDesignSpec } from './spec.mjs';

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
const signature = value => createHash('sha256').update(canonical(value)).digest('hex').slice(0, 20);
function groups(items, identify) {
  const result = new Map();
  for (const item of items) { const identity = canonical(identify(item)); if (!result.has(identity)) result.set(identity, []); result.get(identity).push(item); }
  return [...result.entries()].filter(([, rows]) => rows.length >= 2).sort(([a], [b]) => a.localeCompare(b, 'en'));
}

/** Opt-in, exact-value extraction. No approximate component matching or guessed
 * semantic token names: every original scene key and reaction remains stable. */
export function enrichDesignSystem(input) {
  validateDesignSpec(input);
  const spec = structuredClone(input); spec.textStyles ??= []; spec.variables ??= [];
  const used = new Set([...spec.nodes, ...spec.textStyles, ...spec.variables].map(item => item.key));
  const allocate = (kind, value) => { const base = `extracted/${kind}/${signature(value)}`; let key = base, index = 1; while (used.has(key)) key = `${base}-${index++}`; used.add(key); return key; };
  const summary = { textStylesCreated: 0, textBindings: 0, variablesCreated: 0, colorBindings: 0, componentsCreated: 0, instancesCreated: 0, sourceNodeCount: spec.nodes.length };
  const typography = node => Object.fromEntries(['fontName', 'fontSize', 'lineHeight', 'letterSpacing'].filter(key => node.props[key] !== undefined).map(key => [key, node.props[key]]));
  for (const [identity, rows] of groups(spec.nodes.filter(node => node.type === 'TEXT' && !node.props?.textStyleKey && node.props?.fontName && node.props?.fontSize), typography)) {
    const value = JSON.parse(identity); const key = allocate('text', value);
    spec.textStyles.push({ key, name: `Captured/${value.fontName.family}/${value.fontName.style}/${value.fontSize}/${signature(value).slice(0, 8)}`, ...value });
    for (const node of rows) { node.props.textStyleKey = key; for (const field of ['fontName', 'fontSize', 'lineHeight', 'letterSpacing']) delete node.props[field]; summary.textBindings++; }
    summary.textStylesCreated++;
  }
  const solids = spec.nodes.flatMap(node => [node.props?.fills ?? [], node.props?.strokes ?? [],
    ...(node.props?.overrides ?? []).map(override => override.fills ?? [])].flat())
    .filter(paint => paint.type === 'SOLID' && !paint.variableKey);
  for (const [identity, rows] of groups(solids, paint => ({ ...paint.color, a: paint.opacity ?? 1 }))) {
    const color = JSON.parse(identity); const key = allocate('color', color);
    // Native COLOR bindings resolve RGBA alpha as paint.opacity, not as a
    // second multiplier. Match the original paint alpha and leave node opacity
    // and any explicitly authored variable bindings unchanged.
    spec.variables.push({ key, name: `Captured/Color/${signature(color).slice(0, 8)}`, value: color });
    for (const paint of rows) { paint.variableKey = key; summary.colorBindings++; }
    summary.variablesCreated++;
  }
  const children = new Set(spec.nodes.map(node => node.parentKey));
  const vectorIdentity = node => ({ width: node.width, height: node.height, props: Object.fromEntries(Object.entries(node.props ?? {}).filter(([key]) => !['isFixed', 'layoutPositioning'].includes(key))) });
  const masters = [];
  for (const [identity, rows] of groups(spec.nodes.filter(node => node.type === 'VECTOR' && !children.has(node.key)), vectorIdentity)) {
    const value = JSON.parse(identity), componentKey = allocate('icon', value); let childKey = `${componentKey}/shape`, childSuffix = 1;
    while (used.has(childKey)) childKey = `${componentKey}/shape-${childSuffix++}`;
    used.add(childKey);
    masters.push({ key: componentKey, type: 'COMPONENT', name: `Captured/Icon/${signature(value).slice(0, 8)}`, parentKey: null, x: (summary.componentsCreated % 12) * 120, y: -1000 - Math.floor(summary.componentsCreated / 12) * 120, width: value.width, height: value.height, props: { fills: [], clipsContent: false } },
      { key: childKey, type: 'VECTOR', name: 'Editable vector', parentKey: componentKey, x: 0, y: 0, width: value.width, height: value.height, props: value.props });
    for (const node of rows) { const positioning = Object.fromEntries(['isFixed', 'layoutPositioning', 'visible'].filter(key => node.props?.[key] !== undefined).map(key => [key, node.props[key]])); node.type = 'INSTANCE'; node.props = { componentKey, ...positioning }; summary.instancesCreated++; }
    summary.componentsCreated++;
  }
  spec.nodes.push(...masters); validateDesignSpec(spec);
  return { spec, summary: { ...summary, nodeCount: spec.nodes.length, textStyleCount: spec.textStyles.length, variableCount: spec.variables.length, componentCount: spec.nodes.filter(node => node.type === 'COMPONENT').length, instanceCount: spec.nodes.filter(node => node.type === 'INSTANCE').length, extraction: 'exact-repeated-values', visual: 'NOT_RUN' } };
}
