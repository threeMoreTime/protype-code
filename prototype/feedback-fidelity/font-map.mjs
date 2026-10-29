const cjk = code => code >= 0x2e80 && code <= 0xa4cf || code >= 0xac00 && code <= 0xd7af || code >= 0xf900 && code <= 0xfaff || code >= 0xff00 && code <= 0xffef || code >= 0x20000 && code <= 0x323af;
const emoji = code => code >= 0x1f000 && code < 0x20000;

// This map is tied to the observed Windows browser fonts for this reference.
// Figma must independently list these exact families/styles before import.
export function createFeedbackFontMapping(capture) {
  if (!Array.isArray(capture?.nodes)) throw new Error('FEEDBACK_FONT_CAPTURE_INVALID');
  const result = {};
  for (const node of capture.nodes) {
    const control = node.controlText;
    if (node.kind !== 'text' && !(node.kind === 'pseudo' && node.text) && !control) continue;
    const css = control?.style ?? node.style;
    const first = String(css.fontFamily ?? '').split(',')[0].trim().replace(/^['"]|['"]$/g, '');
    let family;
    if (['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'ui-sans-serif', 'system-ui', 'sans-serif'].includes(first)) family = 'Segoe UI';
    else if (['Arial', 'Microsoft YaHei', 'Microsoft YaHei UI', 'SimSun'].includes(first)) family = first;
    else throw new Error('FEEDBACK_FONT_FAMILY_NOT_VERIFIED');
    const weight = Number(css.fontWeight) || 400, italic = css.fontStyle === 'italic';
    let style = family === 'Segoe UI' ? weight >= 700 ? 'Bold' : weight >= 600 ? 'Semibold' : weight <= 300 ? 'Light' : 'Regular' : weight > 500 ? 'Bold' : 'Regular';
    if (italic) {
      if (!['Segoe UI', 'Arial'].includes(family)) throw new Error('FEEDBACK_FONT_STYLE_NOT_VERIFIED');
      style = style === 'Regular' ? 'Italic' : `${style} Italic`;
    }
    const text = control?.renderedText ?? node.text ?? '', ranges = [];
    let offset = 0;
    for (const character of text) {
      const end = offset + character.length, code = character.codePointAt(0);
      const fallbackFamily = cjk(code) && ['Segoe UI', 'Arial'].includes(family) ? 'Microsoft YaHei' : emoji(code) ? 'Segoe UI Emoji' : null;
      if (fallbackFamily && fallbackFamily !== family) {
        const fontName = { family: fallbackFamily, style: fallbackFamily === 'Microsoft YaHei' && weight > 500 ? 'Bold' : 'Regular' };
        const previous = ranges.at(-1);
        if (previous && previous.end === offset && previous.fontName.family === fontName.family && previous.fontName.style === fontName.style) previous.end = end;
        else ranges.push({ start: offset, end, fontName });
      }
      offset = end;
    }
    result[node.id] = { family, style, ranges };
  }
  return result;
}
