// Deliberately bounded CSS support: a full-box, two-stop opacity fade. Other
// gradients retain capture warnings rather than claiming browser/Figma parity.
const transforms = {
  '0deg': [[0, -1, 1], [1, 0, 0]],
  '90deg': [[1, 0, 0], [0, 1, 0]],
  '180deg': [[0, 1, 0], [-1, 0, 1]],
  '270deg': [[-1, 0, 1], [0, -1, 1]],
};
const directions = { 'to top': '0deg', 'to right': '90deg', 'to bottom': '180deg', 'to left': '270deg' };
const unsupported = reason => { throw new Error(`Unsupported linear gradient: ${reason}`); };

function argumentsOf(text) {
  let depth = 0, begin = 0; const parts = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '(') depth++;
    if (text[i] === ')' && --depth < 0) unsupported('unbalanced function');
    if (text[i] === ',' && depth === 0) { parts.push(text.slice(begin, i).trim()); begin = i + 1; }
  }
  if (depth) unsupported('unbalanced function');
  parts.push(text.slice(begin).trim()); return parts;
}

export function parseLinearGradient(style, parseColor) {
  for (const [field, values] of Object.entries({
    backgroundSize: ['auto', 'auto auto'], backgroundRepeat: ['repeat', 'repeat repeat'],
    backgroundPosition: ['0% 0%'], backgroundOrigin: ['padding-box'], backgroundClip: ['border-box'],
    backgroundAttachment: ['scroll'], backgroundBlendMode: ['normal'],
  })) {
    if (typeof style[field] !== 'string') throw new Error(`Unproved linear gradient context: ${field}`);
    if (!values.includes(style[field].trim())) unsupported(field);
  }
  // The default padding-box gradient equals the node's border box only when
  // every border is proved absent. Missing legacy metadata is not a default.
  for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
    const value = style[`border${side}Width`];
    if (typeof value !== 'string') throw new Error(`Unproved linear gradient context: border${side}Width`);
    if (!/^0(?:\.0+)?(?:px)?$/.test(value.trim())) unsupported('border-box mismatch');
  }
  const background = parseColor(style.backgroundColor);
  if (style.backgroundColor !== 'transparent' && (!background || background.a !== 0)) unsupported('background-color composition');
  const text = String(style.backgroundImage ?? '').trim();
  if (text.length > 4096) unsupported('CSS length budget');
  const match = /^linear-gradient\(([\s\S]*)\)$/i.exec(text);
  if (!match) unsupported('expected one linear-gradient');
  const parts = argumentsOf(match[1]); let direction = '180deg';
  if (Object.hasOwn(transforms, parts[0]) || Object.hasOwn(directions, parts[0])) {
    const value = parts.shift(); direction = directions[value] ?? value;
  }
  // Do not consume an angle-like token as a color or accept CSS interpolation
  // spaces, corner directions, hints, multiple layers, or non-cardinal angles.
  if (parts.length !== 2) unsupported('expected exactly two color stops');
  const positions = [];
  const stops = parts.map((part, index) => {
    const m = /^(rgba?\([^)]*\)|#[0-9a-f]{3,8})(?:\s+(0(?:\.0+)?%|100(?:\.0+)?%))?$/i.exec(part);
    if (!m) unsupported('color or stop position');
    const color = parseColor(m[1]);
    if (!color || !['r', 'g', 'b', 'a'].every(channel => Number.isFinite(color[channel]) && color[channel] >= 0 && color[channel] <= 1)) unsupported('color range');
    positions.push(m[2] !== undefined);
    const position = m[2] === undefined ? index : Number.parseFloat(m[2]) / 100;
    if (position !== index) unsupported('stops must span zero to one');
    return { position, color };
  });
  if (positions[0] !== positions[1]) unsupported('mixed implicit and explicit stop positions');
  // Identical RGB channels avoid an unsupported assumption about the CSS and
  // Figma color interpolation spaces. Alpha is retained on each color stop.
  if (['r', 'g', 'b'].some(channel => stops[0].color[channel] !== stops[1].color[channel])) unsupported('different RGB interpolation spaces');
  return { type: 'GRADIENT_LINEAR', gradientTransform: structuredClone(transforms[direction]), gradientStops: stops, opacity: 1 };
}
