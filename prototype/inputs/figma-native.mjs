import { z } from 'zod';
import { validatePrototype, digest } from '../core/model.mjs';
import { designEvidenceId, assertEvidenceData } from '../core/design-catalog.mjs';

export const FIGMA_NATIVE_LIMITS = Object.freeze({ readbacks: 25000, fieldBytes: 512 * 1024, readbackBytes: 7 * 1024 * 1024, totalBytes: 80 * 1024 * 1024 });
const fail = code => { throw new Error(`FIGMA_NATIVE_${code}`); };
const nativeId = z.string().max(512).regex(/^(?:I)?[0-9]+:[0-9]+(?:;[0-9]+:[0-9]+)*$/);
const rootId = z.string().regex(/^[0-9]+:[0-9]+$/);
const hash = z.string().regex(/^[0-9a-f]{64}$/);
const scope = z.object({ fileIdentity: z.string().min(1).max(512), pageId: rootId, rootNodeId: rootId }).strict();
const fieldNames = ['geometry', 'vectorPaths', 'text', 'paints', 'mask', 'layout', 'component', 'children'];
const fixedProofSchema = z.object({ parentId: nativeId.nullable(), parentType: z.string().min(1).max(100).nullable(),
  childIndex: z.number().int().min(0).max(24999).nullable(), childCount: z.number().int().min(0).max(25000).nullable(), numberOfFixedChildren: z.number().int().min(0).max(25000).nullable(),
  reason: z.enum(['PARENT_HAS_NO_FIXED_CHILDREN', 'PARENT_SCOPE_REQUIRED', 'INVALID_FIXED_CHILDREN', 'HOST_API_UNAVAILABLE']).optional() }).strict();
// Preserve the legacy FIELD_HASH rejection after structural validation, including missing values.
const fieldSchema = z.object({ value: z.unknown().optional(), complete: z.literal(true), status: z.literal('VERIFIED'), sha256: hash,
  propertyStatus: z.record(z.string()).optional(), snapshotHash: hash.optional(),
  derivations: z.object({ isFixed: fixedProofSchema }).strict().optional(),
  pagination: z.object({ offset: z.literal(0), limit: z.number().int().min(1).max(1000), total: z.number().int().min(0).max(25000), nextOffset: z.null() }).strict().optional() }).strict();
const capsuleSchema = z.object({ schemaVersion: z.literal('1.0'), source: z.literal('PluginAPI'), readVersion: z.literal('scope-evidence-1.0'),
  fileIdentity: z.string().min(1).max(512), nodeId: nativeId, pageId: rootId, readScope: scope, complete: z.literal(true), scopeVerification: z.literal('VERIFIED'),
  // Each capsule contains only the requested fields; unknown field names remain invalid.
  writes: z.literal(0), fields: z.partialRecord(z.enum(fieldNames), fieldSchema), sha256: hash }).strict();
const optionsSchema = z.object({ fileIdentity: z.string().min(1).max(512),
  bindings: z.array(z.object({ viewNodeId: designEvidenceId, sourceNodeId: designEvidenceId, nativeNodeId: nativeId, readScope: scope,
    readbackHashes: z.array(hash).min(1).max(8).refine(value => new Set(value).size === value.length) }).strict()).min(1).max(25000),
  readbacks: z.array(capsuleSchema).min(1).max(FIGMA_NATIVE_LIMITS.readbacks),
  imageBindings: z.array(z.object({ imageHash: z.string().min(1).max(512), assetId: designEvidenceId, sha256: hash }).strict()).max(2000).default([]),
}).strict();
const geometryProperties = ['name', 'type', 'x', 'y', 'width', 'height', 'rotation', 'relativeTransform', 'absoluteTransform', 'opacity', 'visible'];
const layoutProperties = ['layoutMode', 'itemSpacing', 'counterAxisSpacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'primaryAxisSizingMode', 'counterAxisSizingMode', 'primaryAxisAlignItems', 'counterAxisAlignItems', 'layoutWrap', 'layoutSizingHorizontal', 'layoutSizingVertical', 'layoutAlign', 'layoutGrow', 'layoutPositioning', 'constraints', 'clipsContent', 'overflowDirection', 'isFixed'];
const textProperties = ['fontName', 'fontSize', 'fontWeight', 'textDecoration', 'lineHeight', 'letterSpacing', 'fills', 'textStyleId', 'fillStyleId'];
const typographyProperties = ['fontName', 'fontSize', 'fontWeight', 'textDecoration', 'lineHeight', 'letterSpacing', 'textAutoResize', 'textAlignHorizontal', 'textAlignVertical', 'hasMissingFont'];
const transformSchema = z.array(z.array(z.number().finite().min(-1e7).max(1e7)).length(3)).length(2);
const known = (value, keys) => { if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) fail('UNSUPPORTED_VALUE_FIELDS'); };
const requireKeys = (value, keys) => { if (!value || keys.some(key => !Object.hasOwn(value, key))) fail('MISSING_VALUE_FIELDS'); };
function verified(record, properties) {
  requireKeys(record.value, properties);
  if (!record.propertyStatus || Object.keys(record.propertyStatus).length !== properties.length || properties.some(key => record.propertyStatus[key] !== 'VERIFIED')) fail('PROPERTY_NOT_VERIFIED');
}
function bounded(options) {
  if (!Array.isArray(options.readbacks) || options.readbacks.length > FIGMA_NATIVE_LIMITS.readbacks) fail('READBACK_BUDGET');
  let total = 0;
  for (const capsule of options.readbacks) {
    const pending = [capsule]; let lowerBound = 0;
    while (pending.length) {
      const value = pending.pop();
      if (typeof value === 'string') lowerBound += value.length + 2;
      else if (value && typeof value === 'object') { lowerBound += Object.keys(value).reduce((sum, key) => sum + key.length + 3, 0); pending.push(...Object.values(value)); }
      else lowerBound += 5;
      if (lowerBound > FIGMA_NATIVE_LIMITS.readbackBytes) fail('READBACK_BUDGET');
    }
    for (const record of Object.values(capsule.fields ?? {})) if (Buffer.byteLength(JSON.stringify(record)) > FIGMA_NATIVE_LIMITS.fieldBytes) fail('FIELD_BUDGET');
    const bytes = Buffer.byteLength(JSON.stringify(capsule)); total += bytes;
    if (bytes > FIGMA_NATIVE_LIMITS.readbackBytes || total > FIGMA_NATIVE_LIMITS.totalBytes) fail('READBACK_BUDGET');
  }
}
function field(records, name) { const record = records.get(name); if (!record) fail(`MISSING_${name.toUpperCase()}`); return record; }
function nativeColor(value, alpha = false) {
  known(value, alpha ? ['r', 'g', 'b', 'a'] : ['r', 'g', 'b']);
  return '#' + (alpha ? ['r', 'g', 'b', 'a'] : ['r', 'g', 'b']).map(key => {
    const channel = value[key];
    if (!Number.isFinite(channel) || channel < 0 || channel > 1) fail('COLOR_VALUE');
    if (Math.abs(channel * 255 - Math.round(channel * 255)) > 1e-5) fail('UNSUPPORTED_COLOR_PRECISION');
    return Math.round(channel * 255).toString(16).padStart(2, '0');
  }).join('');
}
function painters(model, bindings, used) {
  const assets = new Map(model.assets.map(asset => [asset.id, asset])), images = new Map();
  for (const binding of bindings) {
    if (images.has(binding.imageHash)) fail('DUPLICATE_IMAGE_BINDING');
    const asset = assets.get(binding.assetId);
    if (!asset || asset.sha256 !== binding.sha256 || asset.source.kind !== 'figma' || asset.source.sourceId !== binding.imageHash) fail('IMAGE_HASH_BINDING');
    images.set(binding.imageHash, asset);
  }
  return (values, sceneId) => {
    if (!Array.isArray(values) || values.length > 100) fail('PAINTS_VALUE');
    return values.filter(paint => paint.visible !== false).map(paint => {
      known(paint, ['type', 'opacity', 'visible', 'blendMode', 'boundVariables', 'color', 'imageHash', 'scaleMode', 'imageTransform', 'scalingFactor', 'rotation', 'filters', 'gradientStops', 'gradientTransform']);
      if (paint.visible !== undefined && typeof paint.visible !== 'boolean' || paint.opacity !== undefined && (!Number.isFinite(paint.opacity) || paint.opacity < 0 || paint.opacity > 1)) fail('PAINT_VALUE');
      if (paint.blendMode && paint.blendMode !== 'NORMAL' || paint.boundVariables && Object.keys(paint.boundVariables).length) fail('UNSUPPORTED_PAINT_SEMANTICS');
      if (paint.type === 'SOLID') return { type: 'SOLID', color: nativeColor(paint.color), ...(paint.opacity === undefined ? {} : { opacity: paint.opacity }) };
      if (paint.type === 'IMAGE') {
        const asset = images.get(paint.imageHash); if (!asset) fail('IMAGE_HASH_BINDING');
        if (paint.filters && Object.values(paint.filters).some(value => value !== 0) || paint.rotation && paint.rotation !== 0 || paint.scalingFactor !== undefined && paint.scalingFactor !== 1) fail('UNSUPPORTED_IMAGE_SEMANTICS');
        if (paint.scaleMode === 'CROP' && !paint.imageTransform || paint.imageTransform && paint.scaleMode !== 'CROP') fail('UNSUPPORTED_IMAGE_TRANSFORM');
        if (!used.has(asset.id)) used.set(asset.id, new Set()); used.get(asset.id).add(sceneId);
        return { type: 'IMAGE', assetId: asset.id, scaleMode: paint.scaleMode, ...(paint.imageTransform ? { transform: structuredClone(paint.imageTransform) } : {}), ...(paint.opacity === undefined ? {} : { opacity: paint.opacity }) };
      }
      if (!['GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND'].includes(paint.type)) fail('UNSUPPORTED_PAINT_TYPE');
      if (paint.opacity !== undefined && paint.opacity !== 1) fail('UNSUPPORTED_GRADIENT_OPACITY');
      if (!Array.isArray(paint.gradientStops)) fail('GRADIENT_VALUE');
      return { type: paint.type, transform: structuredClone(paint.gradientTransform), stops: paint.gradientStops.map(stop => { known(stop, ['position', 'color', 'boundVariables']); if (stop.boundVariables && Object.keys(stop.boundVariables).length) fail('UNSUPPORTED_PAINT_SEMANTICS'); return { position: stop.position, color: nativeColor(stop.color, true) }; }) };
    });
  };
}
function mapLayout(record) {
  verified(record, layoutProperties); const value = record.value; known(value, layoutProperties);
  const enums = { layoutMode: ['NONE', 'HORIZONTAL', 'VERTICAL'], layoutWrap: ['NO_WRAP', 'WRAP'], primaryAxisSizingMode: ['FIXED', 'AUTO'], counterAxisSizingMode: ['FIXED', 'AUTO'], primaryAxisAlignItems: ['MIN', 'CENTER', 'MAX', 'SPACE_BETWEEN'],
    counterAxisAlignItems: ['MIN', 'CENTER', 'MAX', 'BASELINE'], layoutSizingHorizontal: ['FIXED', 'HUG', 'FILL'], layoutSizingVertical: ['FIXED', 'HUG', 'FILL'], layoutAlign: ['INHERIT', 'MIN', 'CENTER', 'MAX', 'STRETCH'], layoutPositioning: ['AUTO', 'ABSOLUTE'], overflowDirection: ['NONE', 'HORIZONTAL', 'VERTICAL', 'BOTH'] };
  if (Object.entries(enums).some(([key, values]) => !values.includes(value[key])) || typeof value.clipsContent !== 'boolean' || typeof value.isFixed !== 'boolean') fail('UNSUPPORTED_LAYOUT_VALUE');
  if (!['NONE', 'HORIZONTAL', 'VERTICAL'].includes(value.layoutMode)) fail('UNSUPPORTED_LAYOUT_MODE');
  if (value.layoutWrap === 'WRAP' && value.counterAxisSpacing !== value.itemSpacing) fail('UNSUPPORTED_WRAP_SPACING');
  if (value.layoutAlign !== 'INHERIT' || ![0, 1].includes(value.layoutGrow)) fail('UNSUPPORTED_LAYOUT_SELF_ALIGNMENT');
  const mode = { NONE: 'absolute', HORIZONTAL: 'horizontal', VERTICAL: 'vertical' }[value.layoutMode];
  return { mode, gap: value.itemSpacing, padding: { top: value.paddingTop, right: value.paddingRight, bottom: value.paddingBottom, left: value.paddingLeft },
    align: ({ MIN: 'start', CENTER: 'center', MAX: 'end', BASELINE: 'baseline' })[value.counterAxisAlignItems], justify: ({ MIN: 'start', CENTER: 'center', MAX: 'end', SPACE_BETWEEN: 'space-between' })[value.primaryAxisAlignItems],
    sizingHorizontal: value.layoutSizingHorizontal.toLowerCase(), sizingVertical: value.layoutSizingVertical.toLowerCase(), constraints: structuredClone(value.constraints),
    positioning: value.layoutPositioning.toLowerCase(), overflow: value.overflowDirection.toLowerCase(), wrap: value.layoutWrap === 'WRAP', fixed: value.isFixed };
}
function verifyFixedDerivation(record, geometry, node, binding, bindings, records, fixedParents) {
  const proof = record.derivations?.isFixed;
  if (!proof) fail('MISSING_FIXED_DERIVATION');
  if (proof.parentId !== geometry.parentId) fail('FIXED_PARENT_IDENTITY');
  const supported = ['FRAME', 'COMPONENT', 'INSTANCE', 'SLOT'], unsupported = ['PAGE', 'SECTION', 'GROUP', 'COMPONENT_SET'];
  if (unsupported.includes(proof.parentType)) {
    if (proof.reason !== 'PARENT_HAS_NO_FIXED_CHILDREN' || proof.childIndex !== null || proof.childCount !== null || proof.numberOfFixedChildren !== null || record.value.isFixed !== false) fail('FIXED_PARENT_CAPABILITY');
    if (proof.parentType === 'PAGE' && proof.parentId !== binding.readScope.pageId) fail('FIXED_PARENT_IDENTITY');
  } else if (supported.includes(proof.parentType)) {
    if (proof.reason || !Number.isInteger(proof.childCount) || !Number.isInteger(proof.childIndex) || !Number.isInteger(proof.numberOfFixedChildren)
      || proof.childIndex >= proof.childCount || proof.numberOfFixedChildren > proof.childCount
      || record.value.isFixed !== (proof.childIndex >= proof.childCount - proof.numberOfFixedChildren)) fail('FIXED_CHILD_COUNTS');
    if (node.parentId === null) fail('FIXED_PARENT_SCOPE_NOT_VERIFIED');
  } else fail('UNSUPPORTED_FIXED_PARENT_TYPE');
  if (node.parentId !== null) {
    const parent = bindings.get(node.parentId), parentRecords = records.get(node.parentId), parentGeometry = field(parentRecords, 'geometry').value;
    const children = field(parentRecords, 'children').value;
    if (parent.nativeNodeId !== proof.parentId || parentGeometry.type !== proof.parentType) fail('FIXED_PARENT_IDENTITY');
    if (supported.includes(proof.parentType) && (proof.childCount !== children.length || children[proof.childIndex] !== binding.nativeNodeId)) fail('FIXED_CHILD_ORDER');
  }
  if (supported.includes(proof.parentType)) {
    const previous = fixedParents.get(proof.parentId);
    if (previous && (previous.childCount !== proof.childCount || previous.numberOfFixedChildren !== proof.numberOfFixedChildren)) fail('FIXED_PARENT_COUNTS_CONFLICT');
    fixedParents.set(proof.parentId, { childCount: proof.childCount, numberOfFixedChildren: proof.numberOfFixedChildren });
  }
}
function mapAppearance(paintValue, nativeType) {
  if (!paintValue.appearance || !paintValue.appearancePropertyStatus) fail('MISSING_APPEARANCE');
  const appearance = paintValue.appearance, statuses = paintValue.appearancePropertyStatus;
  const properties = ['cornerRadius', 'strokeWeight', 'strokeAlign', 'effects']; known(appearance, properties); known(statuses, properties);
  for (const key of properties) {
    if (statuses[key] === 'VERIFIED') { if (!Object.hasOwn(appearance, key)) fail('APPEARANCE_NOT_VERIFIED'); }
    else if (statuses[key] === 'NOT_APPLICABLE') {
      if (key === 'effects' || key === 'cornerRadius' && ['FRAME', 'COMPONENT', 'INSTANCE', 'RECTANGLE'].includes(nativeType) || Object.hasOwn(appearance, key)) fail('APPEARANCE_NOT_VERIFIED');
    } else fail('APPEARANCE_NOT_VERIFIED');
  }
  if (!Array.isArray(appearance.effects)) fail('APPEARANCE_VALUE');
  if (appearance.effects.length) fail('UNSUPPORTED_EFFECTS');
  // The current reader does not capture dashPattern/strokeCap/strokeJoin.
  // CENTER and weight alone cannot prove that a native stroke is a solid line.
  if (paintValue.strokes.length) fail('UNSUPPORTED_STROKE_SEMANTICS');
  const style = {};
  if (statuses.cornerRadius === 'VERIFIED') {
    if (!Number.isFinite(appearance.cornerRadius) || appearance.cornerRadius < 0) fail('APPEARANCE_VALUE'); style.cornerRadius = appearance.cornerRadius;
  }
  return style;
}
function mapText(record, paints, sceneId) {
  const value = record.value; known(value, ['characters', 'segments', 'typography', 'typographyFieldStatus']); requireKeys(value, ['characters', 'segments', 'typography', 'typographyFieldStatus']);
  known(value.typography, typographyProperties); known(value.typographyFieldStatus, typographyProperties);
  for (const key of typographyProperties) {
    const status = value.typographyFieldStatus[key];
    if (status !== 'VERIFIED' && !(status === 'NOT_VERIFIED_MIXED' && textProperties.includes(key))) fail('TYPOGRAPHY_NOT_VERIFIED');
    if (status === 'VERIFIED' && !Object.hasOwn(value.typography, key)) fail('TYPOGRAPHY_NOT_VERIFIED');
  }
  if (value.typography.hasMissingFont !== false) fail('MISSING_FONT');
  if (value.typography.textAlignHorizontal !== 'LEFT' || value.typography.textAlignVertical !== 'TOP' || value.typography.textAutoResize !== 'NONE') fail('UNSUPPORTED_TEXT_LAYOUT');
  if (!Array.isArray(value.segments) || value.segments.length > 10000) fail('TEXT_SEGMENTS');
  const weights = { thin: 100, extralight: 200, ultralight: 200, light: 300, regular: 400, normal: 400, book: 400, medium: 500, semibold: 600, demibold: 600, bold: 700, extrabold: 800, ultrabold: 800, black: 900, heavy: 900 };
  return { characters: value.characters, ranges: value.segments.map(segment => {
    known(segment, ['start', 'end', 'characters', 'styleFieldStatus', ...textProperties]); requireKeys(segment, ['start', 'end', 'characters', 'styleFieldStatus', ...textProperties]); known(segment.styleFieldStatus, textProperties);
    if (textProperties.some(key => segment.styleFieldStatus[key] !== 'VERIFIED')) fail('TEXT_RANGE_NOT_VERIFIED');
    if (segment.characters !== value.characters.slice(segment.start, segment.end)) fail('TEXT_RANGE_IDENTITY');
    if (segment.textDecoration !== 'NONE') fail('UNSUPPORTED_TEXT_DECORATION');
    const weight = segment.fontName?.style?.toLowerCase().replace(/[\s_-]/g, '').replace(/italic$|oblique$/, '') || 'regular';
    if (weights[weight] !== segment.fontWeight) fail('UNSUPPORTED_FONT_WEIGHT');
    if (segment.lineHeight?.unit !== 'PIXELS' || !['PIXELS', 'PERCENT'].includes(segment.letterSpacing?.unit)) fail('UNSUPPORTED_TEXT_SPACING');
    return { start: segment.start, end: segment.end, font: structuredClone(segment.fontName), fontSize: segment.fontSize, lineHeight: segment.lineHeight.value,
      letterSpacing: segment.letterSpacing.unit === 'PERCENT' ? segment.fontSize * segment.letterSpacing.value / 100 : segment.letterSpacing.value,
      fills: paints(segment.fills, sceneId) };
  }) };
}

// This is an offline data boundary. It does not connect to Figma, read images,
// execute source text, or turn a caller-provided hash into native acceptance.
function importFigmaNativeEvidence(input, supplied) {
  let model;
  try { model = validatePrototype(input); if (model.schemaVersion !== '1.1') fail('METADATA_VERSION'); } catch { fail('METADATA_INVALID'); }
  try { assertEvidenceData(supplied); } catch { fail('DATA_ONLY'); }
  bounded(supplied);
  if (supplied.readbacks.some(capsule => capsule.fields?.component?.status === 'NOT_VERIFIED_MASTER_SCOPE_REQUIRED')) fail('UNSUPPORTED_CROSS_SCOPE_MASTER');
  const parsed = optionsSchema.safeParse(supplied); if (!parsed.success) fail('INPUT_SCHEMA');
  const options = parsed.data, nodes = new Map(model.presentation.nodes.map(node => [node.id, node])), bindingMap = new Map(), captures = new Map(), consumed = new Set();
  for (const binding of options.bindings) {
    if (bindingMap.has(binding.viewNodeId) || !nodes.has(binding.viewNodeId) || nodes.get(binding.viewNodeId).sourceNodeId !== binding.sourceNodeId) fail('NODE_BINDING');
    if (binding.readScope.fileIdentity !== options.fileIdentity) fail('FILE_IDENTITY'); bindingMap.set(binding.viewNodeId, binding);
  }
  if (bindingMap.size !== nodes.size) fail('INCOMPLETE_NODE_COVERAGE');
  for (const capsule of options.readbacks) {
    const { sha256, ...body } = capsule;
    if (digest(body) !== sha256 || captures.has(sha256)) fail('READBACK_HASH');
    if (capsule.fileIdentity !== options.fileIdentity || capsule.readScope.fileIdentity !== options.fileIdentity || capsule.readScope.pageId !== capsule.pageId) fail('FILE_IDENTITY');
    for (const [name, record] of Object.entries(capsule.fields)) {
      if (record.value === undefined || digest(record.value) !== record.sha256) fail('FIELD_HASH');
      if (name === 'text' || name === 'children') {
        const items = name === 'text' ? record.value.segments : record.value;
        if (!record.pagination || !Array.isArray(items) || record.pagination.total !== items.length || record.pagination.limit < items.length || record.snapshotHash !== digest(record.value)) fail('PAGINATION_SNAPSHOT');
      } else if (record.pagination || record.snapshotHash) fail('UNEXPECTED_PAGINATION');
      if (record.derivations && name !== 'layout') fail('UNEXPECTED_DERIVATION');
    }
    captures.set(sha256, capsule);
  }
  const recordMap = new Map(), childMap = new Map(model.presentation.nodes.map(node => [node.id, []]));
  for (const node of nodes.values()) if (node.parentId !== null) childMap.get(node.parentId).push(node.id);
  for (const binding of bindingMap.values()) {
    let root = nodes.get(binding.viewNodeId); while (root.parentId !== null) root = nodes.get(root.parentId);
    const rootBinding = bindingMap.get(root.id);
    if (binding.readScope.rootNodeId !== rootBinding.nativeNodeId || binding.readScope.pageId !== rootBinding.readScope.pageId) fail('ROOT_SCOPE');
    const records = new Map();
    for (const hash of binding.readbackHashes) {
      const capsule = captures.get(hash);
      if (!capsule || capsule.nodeId !== binding.nativeNodeId || digest(capsule.readScope) !== digest(binding.readScope)) fail('READBACK_BINDING'); consumed.add(hash);
      for (const [name, record] of Object.entries(capsule.fields)) { if (records.has(name)) fail('DUPLICATE_FIELD'); records.set(name, record); }
    }
    recordMap.set(binding.viewNodeId, records);
  }
  if (consumed.size !== captures.size) fail('UNUSED_READBACK');
  const usedAssets = new Map(), paints = painters(model, options.imageBindings, usedAssets), coverage = Object.fromEntries(fieldNames.map(name => [name, 0])), fixedParents = new Map();
  const typeKinds = { FRAME: 'frame', SECTION: 'frame', COMPONENT_SET: 'frame', TEXT: 'text', RECTANGLE: 'shape', ELLIPSE: 'shape', LINE: 'shape', POLYGON: 'shape', BOOLEAN_OPERATION: 'shape', VECTOR: 'vector', COMPONENT: 'component', INSTANCE: 'instance' };
  for (const node of model.presentation.nodes) {
    const records = recordMap.get(node.id), gRecord = field(records, 'geometry'), binding = bindingMap.get(node.id), geometry = gRecord.value; verified(gRecord, geometryProperties); known(geometry, [...geometryProperties, 'parentId']);
    if (!transformSchema.safeParse(geometry.relativeTransform).success || !transformSchema.safeParse(geometry.absoluteTransform).success) fail('GEOMETRY_TRANSFORM');
    if (typeKinds[geometry.type] !== node.kind && !(node.kind === 'image' && geometry.type === 'RECTANGLE')) fail('NODE_KIND');
    if (node.kind === 'shape') {
      const shape = { RECTANGLE: 'rectangle', ELLIPSE: 'ellipse', LINE: 'line' }[geometry.type];
      if (!shape) fail('UNSUPPORTED_SHAPE_GEOMETRY'); node.shape = shape;
    } else delete node.shape;
    if (node.parentId !== null && geometry.parentId !== bindingMap.get(node.parentId).nativeNodeId) fail('PARENT_IDENTITY');
    const children = field(records, 'children').value;
    const expected = childMap.get(node.id).map(id => bindingMap.get(id).nativeNodeId);
    if (children.some(id => !nativeId.safeParse(id).success) || new Set(children).size !== children.length || node.kind !== 'instance' && digest(children) !== digest(expected)) fail('CHILD_CLOSURE');
    node.geometry = { x: geometry.x, y: geometry.y, width: geometry.width, height: geometry.height, rotation: geometry.rotation, transform: structuredClone(geometry.relativeTransform) };
    const paintValue = field(records, 'paints').value; known(paintValue, ['fills', 'strokes', 'appearance', 'appearancePropertyStatus']); requireKeys(paintValue, ['fills', 'strokes']);
    if (!Array.isArray(paintValue.strokes)) fail('PAINTS_VALUE');
    const appearance = mapAppearance(paintValue, geometry.type);
    const mask = field(records, 'mask').value; known(mask, ['isMask', 'maskType']); requireKeys(mask, ['isMask', 'maskType']);
    if (typeof mask.isMask !== 'boolean' || mask.isMask && !['ALPHA', 'VECTOR', 'LUMINANCE'].includes(mask.maskType)) fail('MASK_VALUE');
    node.style = { ...appearance, visible: geometry.visible, opacity: geometry.opacity, fills: paints(paintValue.fills, node.sceneId), strokes: paints(paintValue.strokes, node.sceneId), isMask: mask.isMask, ...(mask.isMask ? { maskType: mask.maskType } : {}) };
    if (records.has('layout')) { verifyFixedDerivation(records.get('layout'), geometry, node, binding, bindingMap, recordMap, fixedParents); node.layout = mapLayout(records.get('layout')); node.style.clipsContent = records.get('layout').value.clipsContent; }
    else if (['frame', 'component', 'instance'].includes(node.kind)) fail('MISSING_LAYOUT');
    else delete node.layout;
    if (node.kind === 'text') node.text = mapText(field(records, 'text'), paints, node.sceneId);
    if (node.kind === 'vector') node.vectorPaths = structuredClone(field(records, 'vectorPaths').value);
    if (['component', 'instance'].includes(node.kind)) {
      const component = field(records, 'component').value; known(component, ['type', 'componentSetId', 'mainComponentId', 'variantProperties', 'componentProperties', 'componentPropertyDefinitions', 'overrides']);
      if (component.type !== geometry.type) fail('COMPONENT_IDENTITY');
      if (component.variantProperties && Object.keys(component.variantProperties).length || component.componentProperties && Object.keys(component.componentProperties).length || component.componentPropertyDefinitions && Object.keys(component.componentPropertyDefinitions).length) fail('UNSUPPORTED_COMPONENT_PROPERTIES');
      if (node.kind === 'instance') {
        if (!Array.isArray(component.overrides) || component.overrides.length) fail('UNSUPPORTED_INSTANCE_OVERRIDES');
        const master = bindingMap.get(node.componentId); if (!master || component.mainComponentId !== master.nativeNodeId) fail('COMPONENT_MASTER');
        if (digest(master.readScope) !== digest(binding.readScope)) fail('UNSUPPORTED_CROSS_SCOPE_MASTER');
        // Empty override names do not prove materialized child geometry after
        // instance resize. Nonempty physical subtrees need separate occurrence
        // correspondence evidence, which this minimal reader does not provide.
        if (expected.length || children.length || childMap.get(node.componentId).length) fail('UNSUPPORTED_INSTANCE_CHILD_MAPPING');
        node.overrides = [];
      }
    }
    if (node.kind === 'image') { const image = node.style.fills.find(paint => paint.type === 'IMAGE'); if (!image) fail('MISSING_IMAGE_BINDING'); node.assetId = image.assetId; }
    for (const name of records.keys()) coverage[name]++;
  }
  for (const node of model.presentation.nodes) {
    const parent = nodes.get(node.parentId);
    if (parent?.layout?.mode !== undefined && parent.layout.mode !== 'absolute' && !node.layout) fail('UNVERIFIED_AUTO_CHILD_LAYOUT');
    if (parent?.layout?.overflow && parent.layout.overflow !== 'none' && !node.layout) fail('UNVERIFIED_SCROLL_CHILD_LAYOUT');
  }
  for (const asset of model.assets) asset.sceneIds = [...(usedAssets.get(asset.id) ?? [])];
  const proofHash = digest({ fileIdentity: options.fileIdentity, bindings: options.bindings, readbackHashes: [...consumed].sort() });
  const resolved = new Set(['VISUAL_EVIDENCE_INCOMPLETE', 'VISUAL_FIELDS_NOT_IMPORTED', 'INSTANCE_OVERRIDES_NOT_IMPORTED', 'INSTANCE_VISUAL_OVERRIDES_NOT_VERIFIED', 'ASSET_BINDINGS_UNRESOLVED']);
  const resolvedDiagnostics = model.diagnostics.filter(item => resolved.has(item.code)).map(item => ({ code: item.code, proofHash, nodeIds: model.presentation.nodes.map(node => node.id), assetIds: [...usedAssets.keys()] }));
  model.diagnostics = model.diagnostics.filter(item => !resolved.has(item.code));
  model.diagnostics.push({ code: 'NATIVE_VISUAL_FIELDS_IMPORTED', severity: 'info', message: 'Verified scoped PluginAPI field values imported. This proves the supported contract fields; browser/native visual acceptance remains separate.' });
  model.sources.push({ file: 'PluginAPI scope-evidence-1.0', kind: 'figma', sha256: proofHash });
  try { model = validatePrototype(model); } catch { fail('MAPPED_CONTRACT_INVALID'); }
  return { model, nativeEvidence: { source: 'PluginAPI', readVersion: 'scope-evidence-1.0', fileIdentity: options.fileIdentity, proofHash,
    readbackHashes: [...consumed], nodeBindings: structuredClone(options.bindings), fieldCoverage: coverage, resolvedDiagnostics,
    retainedDiagnostics: model.diagnostics.filter(item => item.code !== 'NATIVE_VISUAL_FIELDS_IMPORTED').map(item => item.code),
    limitations: ['Image bindings verify explicit metadata hashes; resolveAssets must independently verify image bytes before rendering.',
      'Native font absence is checked in captured text; actual browser and generated Figma font availability still needs independent verification.',
      'Effects, mixed corner radii, all nonempty native strokes (uncaptured dash/cap/join), complex text layout, and nonempty instance occurrence subtrees are unsupported and stop import.',
      'Cross-root or cross-page component masters, including scene-root instances whose masters are outside the scoped root, remain unsupported.',
      'Full native relative transforms are retained; generated skew/rotation, native editing and pixel-level visual acceptance remain unverified.',
      'Unsupported or absent native fields stop this importer; no live Figma or visual acceptance is implied.'] } };
}

export function applyFigmaNativeEvidence(input, options) {
  try { return importFigmaNativeEvidence(input, options); }
  catch (error) { if (/^FIGMA_NATIVE_[A-Z0-9_]+$/.test(error?.message ?? '')) throw error; fail('INVALID_NATIVE_VALUE'); }
}
