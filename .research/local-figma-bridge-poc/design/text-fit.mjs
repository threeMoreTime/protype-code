import { createHash } from 'node:crypto';

const positive = value => Number.isFinite(value) && value > 0;
const object = value => value && typeof value === 'object' && !Array.isArray(value);
function spacing(value, auto = false) {
  if (!object(value)) return null;
  if (auto && value.unit === 'AUTO') return { unit: 'AUTO' };
  if (!['PIXELS', 'PERCENT'].includes(value.unit) || !Number.isFinite(value.value)) return null;
  return { unit: value.unit, value: value.value };
}
function typography(value) {
  if (!object(value) || !object(value.fontName) || !['family', 'style'].every(key => typeof value.fontName[key] === 'string' && value.fontName[key].length) || !positive(value.fontSize) || typeof value.characters !== 'string') return null;
  const lineHeight = spacing(value.lineHeight, true), letterSpacing = spacing(value.letterSpacing);
  if (!lineHeight || !letterSpacing) return null;
  return { fontName: { family: value.fontName.family, style: value.fontName.style }, fontSize: value.fontSize, lineHeight, letterSpacing, characters: value.characters };
}
// Native font sizes and numeric line heights round-trip through float32.
// Snapshots below retain raw numbers and must still match exactly.
const signature = value => {
  const result = typography(value);
  if (!result || !positive(Math.fround(result.fontSize))) return null;
  const lineHeight = result.lineHeight.unit === 'AUTO' ? result.lineHeight : { ...result.lineHeight, value: Math.fround(result.lineHeight.value) };
  if (lineHeight.unit !== 'AUTO' && !Number.isFinite(lineHeight.value)) return null;
  return JSON.stringify({ ...result, fontSize: Math.fround(result.fontSize), lineHeight });
};
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Caller opts in with source-proven single-line candidates and two actual native
// WIDTH_AND_HEIGHT reads. This helper never measures fonts or proves visual fit.
// Call before enrichment: shared text styles are deliberately never overridden.
export function fitMeasuredSingleLineText(input, { candidates = [], measurements = [], minimumScale = 0.8 } = {}) {
  if (!object(input) || !Array.isArray(input.nodes)) throw new TypeError('spec.nodes must be an array');
  if (!Array.isArray(candidates)) throw new TypeError('candidates must be an array');
  if (!Array.isArray(measurements)) throw new TypeError('measurements must be an array');
  if (!Number.isFinite(minimumScale) || minimumScale < 0.8 || minimumScale > 1) throw new TypeError('minimumScale must be between 0.8 and one');
  const spec = structuredClone(input);
  const report = { mode: 'native-measured-single-line', changedCount: 0, unchangedCount: 0, preservedCount: 0, minimumScale, nativeVisual: 'NOT_RUN', verticalFit: 'NOT_RUN', results: [] };
  for (const candidate of candidates) {
    const result = { nodeKey: candidate?.nodeKey, candidate: structuredClone(candidate), status: 'PRESERVED' };
    report.results.push(result);
    function preserve(reason) { result.reason = reason; report.preservedCount++; }
    if (!object(candidate) || typeof candidate.nodeKey !== 'string') { preserve('CANDIDATE_INVALID'); continue; }
    if (candidates.filter(value => value?.nodeKey === candidate.nodeKey).length !== 1) { preserve('CANDIDATE_AMBIGUOUS'); continue; }
    const matches = spec.nodes.filter(value => value.key === candidate.nodeKey);
    if (matches.length !== 1) { preserve(matches.length ? 'NODE_AMBIGUOUS' : 'NODE_MISSING'); continue; }
    const node = matches[0], props = node.props;
    result.originalNodeDigest = digest(node);
    if (node.type !== 'TEXT' || !object(props)) { preserve('NODE_NOT_TEXT'); continue; }
    if (props.textStyleKey) { preserve('LINKED_TEXT_STYLE'); continue; }
    if (props.visible === false) { preserve('HIDDEN_TEXT'); continue; }
    if (props.textAutoResize !== 'NONE') { preserve('DESTINATION_NOT_FIXED'); continue; }
    if (typeof candidate.sourceCharacters !== 'string' || props.characters !== candidate.sourceCharacters) { preserve('SOURCE_CHARACTERS_MISMATCH'); continue; }
    if (!candidate.sourceCharacters.length || /[\r\n\t]/.test(candidate.sourceCharacters)) { preserve('SOURCE_NOT_SINGLE_LINE'); continue; }
    if (!['sourceWidth', 'sourceHeight', 'contentWidth', 'sourceFontSize', 'sourceLineHeight'].every(key => positive(candidate[key])) || typeof candidate.sourceEllipsis !== 'boolean') { preserve('SOURCE_GEOMETRY_UNKNOWN'); continue; }
    if (candidate.sourceHeight > candidate.sourceLineHeight) { preserve('SOURCE_NOT_SINGLE_LINE'); continue; }
    // A CSS ellipsis declaration alone does not mean the full source was clipped.
    // Any full source range exceeding its content box is preserved either way.
    if (candidate.sourceWidth > candidate.contentWidth) { preserve('SOURCE_ALREADY_CLIPPED'); continue; }
    if (!positive(node.width) || node.width > candidate.contentWidth || node.height !== candidate.sourceHeight) { preserve('NODE_GEOMETRY_MISMATCH'); continue; }
    if (props.fontSize !== candidate.sourceFontSize) { preserve('SOURCE_FONT_SIZE_MISMATCH'); continue; }
    const requested = typography(props), key = signature(props);
    if (!requested || !key) { preserve('TYPOGRAPHY_INCOMPLETE'); continue; }
    if (requested.letterSpacing.value !== 0) { preserve('LETTER_SPACING_UNSUPPORTED'); continue; }
    const available = measurements.filter(value => signature(value?.typography) === key);
    if (available.length !== 1) { preserve(available.length ? 'MEASUREMENT_AMBIGUOUS' : 'MEASUREMENT_MISSING'); continue; }
    const measurement = available[0], first = measurement.firstRead, second = measurement.secondRead;
    result.measurement = structuredClone(measurement);
    if (!object(measurement.provenance) || !Object.keys(measurement.provenance).length) { preserve('MEASUREMENT_PROVENANCE_MISSING'); continue; }
    if (!object(first) || !object(second)) { preserve('MEASUREMENT_INCOMPLETE'); continue; }
    if (first.hasMissingFont !== false || second.hasMissingFont !== false) { preserve('MEASUREMENT_MISSING_FONT'); continue; }
    const fields = ['fontName', 'fontSize', 'lineHeight', 'letterSpacing', 'characters', 'textAutoResize', 'width', 'height'];
    if ([first, second].some(sample => fields.some(field => sample[field] === undefined) || !typography(sample))) { preserve('MEASUREMENT_INCOMPLETE'); continue; }
    const snapshot = sample => ({ ...typography(sample), textAutoResize: sample.textAutoResize, width: sample.width, height: sample.height, hasMissingFont: sample.hasMissingFont });
    if (JSON.stringify(snapshot(first)) !== JSON.stringify(snapshot(second))) { preserve('MEASUREMENT_UNSTABLE'); continue; }
    if (signature(first) !== key || measurement.width !== first.width || measurement.height !== first.height) { preserve('MEASUREMENT_SUMMARY_MISMATCH'); continue; }
    if (![first.width, first.height].every(positive)) { preserve('MEASUREMENT_GEOMETRY_INVALID'); continue; }
    if (first.textAutoResize !== 'WIDTH_AND_HEIGHT') { preserve('MEASUREMENT_NOT_NATURAL'); continue; }
    result.measurementDigest = digest(snapshot(first));
    Object.assign(result, { requestedTypography: requested, measuredTypography: typography(first), typographyMatch: 'fontSize and lineHeight.value float32 equivalence; other fields exact' });
    if (first.width <= node.width) { result.status = 'UNCHANGED'; result.reason = 'ALREADY_FITS'; report.unchangedCount++; continue; }
    // Integer-pixel safety avoids a fractional-width last-glyph wrap. Round only
    // the fitted font size down; preserve every original bound and line height.
    const usableWidth = Math.floor(node.width), measuredWidth = Math.ceil(first.width);
    const fontSize = Math.floor(props.fontSize * usableWidth / measuredWidth * 1e6) / 1e6;
    const scale = fontSize / props.fontSize;
    Object.assign(result, { usableWidth, measuredWidth, previousFontSize: props.fontSize, fontSize, scale, rounding: 'floor bounds, ceil native width, floor fontSize to six decimals' });
    if (fontSize < 0.1 || scale < minimumScale || scale >= 1) { preserve('MINIMUM_SCALE_EXCEEDED'); continue; }
    props.fontSize = fontSize;
    result.status = 'FIT'; result.reason = 'MEASURED_WIDTH_EXCEEDS_FIXED_WIDTH'; report.changedCount++;
    result.resultNodeDigest = digest(node);
  }
  return { spec, report };
}
