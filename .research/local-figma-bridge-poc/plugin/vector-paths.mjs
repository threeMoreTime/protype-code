// Figma accepts only absolute M/L/Q/C/Z and internally converts Q to C:
// https://developers.figma.com/docs/plugins/api/properties/VectorPath-data/
// Endpoint-to-center conversion and radii correction follow SVG 2, Appendix B:
// https://www.w3.org/TR/SVG2/implnote.html#ArcConversionEndpointToCenter
const NUMBER = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y;
const ARITY = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7 };
const invalid = () => { throw new Error('DESIGN_VECTOR_PATH_INVALID'); };

function arcCubics(x1, y1, rx, ry, degrees, large, sweep, x2, y2) {
  if (x1 === x2 && y1 === y2) return [];
  rx = Math.abs(rx); ry = Math.abs(ry);
  if (rx === 0 || ry === 0) return [['L', x2, y2]];
  const phi = (degrees % 360) * Math.PI / 180, cos = Math.cos(phi), sin = Math.sin(phi);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const xp = cos * dx + sin * dy, yp = -sin * dx + cos * dy;
  let ux = xp / rx, uy = yp / ry, radiusScale = Math.hypot(ux, uy);
  if (!Number.isFinite(radiusScale) || radiusScale === 0) invalid();
  if (radiusScale > 1) { rx *= radiusScale; ry *= radiusScale; ux = xp / rx; uy = yp / ry; }
  const lambda = ux * ux + uy * uy;
  if (!Number.isFinite(rx) || !Number.isFinite(ry) || !Number.isFinite(lambda) || lambda === 0) invalid();
  const factor = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, (1 - lambda) / lambda));
  const cxp = factor * rx * uy, cyp = -factor * ry * ux;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2, cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const start = [(xp - cxp) / rx, (yp - cyp) / ry], end = [(-xp - cxp) / rx, (-yp - cyp) / ry];
  let theta = Math.atan2(start[1], start[0]);
  let delta = Math.atan2(start[0] * end[1] - start[1] * end[0], start[0] * end[0] + start[1] * end[1]);
  if (!Number.isFinite(theta) || !Number.isFinite(delta)) invalid();
  if (!sweep && delta > 0) delta -= Math.PI * 2;
  if (sweep && delta < 0) delta += Math.PI * 2;
  // At most 45 degrees per tangent-matched cubic. The unit-circle radial
  // deviation is below 4.3e-6; an ellipse scales it by at most max(rx, ry).
  const count = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 4))), step = delta / count;
  const point = angle => [cx + rx * cos * Math.cos(angle) - ry * sin * Math.sin(angle),
    cy + rx * sin * Math.cos(angle) + ry * cos * Math.sin(angle)];
  const tangent = angle => [-rx * cos * Math.sin(angle) - ry * sin * Math.cos(angle),
    -rx * sin * Math.sin(angle) + ry * cos * Math.cos(angle)];
  const result = [];
  for (let i = 0; i < count; i++) {
    const next = theta + step, alpha = 4 / 3 * Math.tan(step / 4);
    const a = i === 0 ? [x1, y1] : point(theta), b = i === count - 1 ? [x2, y2] : point(next);
    const ta = tangent(theta), tb = tangent(next);
    result.push(['C', a[0] + alpha * ta[0], a[1] + alpha * ta[1], b[0] - alpha * tb[0], b[1] - alpha * tb[1], ...b]);
    theta = next;
  }
  return result;
}

// Parse the SVG grammar rather than replacing command letters. In particular,
// relative coordinates, implicit repeats, reflected controls and adjacent arc
// flags must be resolved before Figma sees the path. Malformed input fails closed.
export function svgPathSegments(data) {
  if (typeof data !== 'string' || data.length === 0 || data.length > 200000) invalid();
  let offset = 0, command, previous, x = 0, y = 0, sx = 0, sy = 0, cubic, quadratic;
  const result = [];
  const whitespace = () => { while (/\s/.test(data[offset] ?? '') && offset < data.length) offset++; };
  const number = (separated, flag = false) => {
    whitespace();
    if (data[offset] === ',') { if (!separated) invalid(); offset++; whitespace(); }
    if (flag) { const value = data[offset++]; if (value !== '0' && value !== '1') invalid(); return Number(value); }
    NUMBER.lastIndex = offset;
    const match = NUMBER.exec(data);
    if (!match) invalid();
    offset = NUMBER.lastIndex;
    const value = Number(match[0]);
    if (!Number.isFinite(value)) invalid();
    return value;
  };
  while (true) {
    whitespace(); if (offset === data.length) break;
    let explicit = false;
    if (/[a-z]/i.test(data[offset])) { command = data[offset++]; explicit = true; }
    if (!command) invalid();
    const upper = command.toUpperCase(), relative = command !== upper;
    if (!result.length && upper !== 'M') invalid();
    if (upper === 'Z') {
      if (!explicit) invalid();
      result.push(['Z']); x = sx; y = sy; cubic = quadratic = undefined; previous = upper; command = undefined; continue;
    }
    if (!ARITY[upper]) invalid();
    const values = Array.from({ length: ARITY[upper] }, (_, i) => number(i > 0 || !explicit, upper === 'A' && (i === 3 || i === 4)));
    const px = value => value + (relative ? x : 0), py = value => value + (relative ? y : 0);
    let emitted, nextCubic, nextQuadratic;
    if (upper === 'M' || upper === 'L') {
      emitted = [[upper, px(values[0]), py(values[1])]];
      if (upper === 'M') { sx = emitted[0][1]; sy = emitted[0][2]; command = relative ? 'l' : 'L'; }
    } else if (upper === 'H') emitted = [['L', px(values[0]), y]];
    else if (upper === 'V') emitted = [['L', x, py(values[0])]];
    else if (upper === 'C' || upper === 'S') {
      const controls = upper === 'C' ? [px(values[0]), py(values[1]), px(values[2]), py(values[3]), px(values[4]), py(values[5])]
        : [previous === 'C' || previous === 'S' ? 2 * x - cubic[0] : x, previous === 'C' || previous === 'S' ? 2 * y - cubic[1] : y,
          px(values[0]), py(values[1]), px(values[2]), py(values[3])];
      emitted = [['C', ...controls]]; nextCubic = controls.slice(2, 4);
    } else if (upper === 'Q' || upper === 'T') {
      const qx = upper === 'Q' ? px(values[0]) : previous === 'Q' || previous === 'T' ? 2 * x - quadratic[0] : x;
      const qy = upper === 'Q' ? py(values[1]) : previous === 'Q' || previous === 'T' ? 2 * y - quadratic[1] : y;
      const ex = px(values.at(-2)), ey = py(values.at(-1));
      emitted = [['C', x + 2 / 3 * (qx - x), y + 2 / 3 * (qy - y), ex + 2 / 3 * (qx - ex), ey + 2 / 3 * (qy - ey), ex, ey]];
      nextQuadratic = [qx, qy];
    } else emitted = arcCubics(x, y, ...values.slice(0, 5), px(values[5]), py(values[6]));
    if (emitted.length) { const last = emitted.at(-1); x = last.at(-2); y = last.at(-1); result.push(...emitted); }
    cubic = nextCubic; quadratic = nextQuadratic; previous = upper;
  }
  if (!result.length || result.some(segment => segment.slice(1).some(value => !Number.isFinite(value)))) invalid();
  return result;
}

export const normalizeSvgPath = data => svgPathSegments(data).map(segment => segment.join(' ')).join(' ');

function derivativeRoots(p0, p1, p2, p3) {
  const a = -p0 + 3 * p1 - 3 * p2 + p3, b = 2 * (p0 - 2 * p1 + p2), c = p1 - p0;
  if (![a, b, c].every(Number.isFinite)) invalid();
  if (a === 0) return b === 0 ? [] : [-c / b];
  const discriminant = b * b - 4 * a * c;
  if (!Number.isFinite(discriminant)) invalid();
  if (discriminant < 0) return [];
  // Stable quadratic roots avoid losing the smaller extremum to cancellation.
  const q = -0.5 * (b + (b < 0 ? -1 : 1) * Math.sqrt(discriminant));
  return q === 0 ? [-b / (2 * a)] : [q / a, c / q];
}

function jointBounds(paths) {
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity, drawing = false;
  const add = (x, y) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) invalid();
    left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
  };
  for (const segments of paths) {
    let x = 0, y = 0, sx = 0, sy = 0;
    for (const segment of segments) {
      const [command, ...v] = segment;
      if (command === 'Z') { x = sx; y = sy; continue; }
      if (command === 'C') {
        drawing = true;
        const valueAt = (p0, p1, p2, p3, t) => (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t ** 2 * p2 + t ** 3 * p3;
        const roots = [...derivativeRoots(x, v[0], v[2], v[4]), ...derivativeRoots(y, v[1], v[3], v[5])];
        for (const t of roots) if (t > 0 && t < 1) add(valueAt(x, v[0], v[2], v[4], t), valueAt(y, v[1], v[3], v[5], t));
      } else if (command === 'L') drawing = true;
      x = v.at(-2); y = v.at(-1); add(x, y);
      if (command === 'M') { sx = x; sy = y; }
    }
  }
  const width = right - left, height = bottom - top;
  if (!drawing || ![left, top, width, height].every(Number.isFinite) || width <= 0 || height <= 0) invalid();
  return { left, top, width, height };
}

// VectorNode rebases its origin and fits its size to the path geometry:
// https://developers.figma.com/docs/plugins/api/VectorNode/
// The spec stores source-unit paths and final display dimensions. Fit every
// path with ONE union-bounds transform, preserving holes and relative spacing.
// Omitting target retains source coordinates for parsing/canonicalization only.
export function normalizeVectorPaths(paths, target) {
  const parsed = paths.map(path => svgPathSegments(path.data));
  if (target !== undefined) {
    if (!Number.isFinite(target?.width) || !Number.isFinite(target?.height) || target.width < 0.01 || target.height < 0.01) invalid();
    const bounds = jointBounds(parsed), sx = target.width / bounds.width, sy = target.height / bounds.height;
    if (!Number.isFinite(sx) || !Number.isFinite(sy) || sx <= 0 || sy <= 0) invalid();
    for (const segments of parsed) for (const segment of segments) for (let i = 1; i < segment.length; i++) {
      segment[i] = (segment[i] - (i % 2 ? bounds.left : bounds.top)) * (i % 2 ? sx : sy);
      if (!Number.isFinite(segment[i])) invalid();
    }
  }
  return paths.map((path, i) => ({ ...path, data: parsed[i].map(segment => segment.join(' ')).join(' ') }));
}

function comparableSegments(data) {
  const result = []; let startX, startY;
  for (const segment of svgPathSegments(data)) {
    if (segment[0] === 'M') { startX = segment[1]; startY = segment[2]; }
    if (segment[0] === 'Z') {
      const last = result.at(-1);
      // Figma may materialize Z's straight closing edge as L-to-M followed by Z.
      // Only discard that exact endpoint, retaining closure and every other edge.
      if (last?.[0] === 'L' && last[1] === startX && last[2] === startY) result.pop();
    }
    result.push(segment);
  }
  return result;
}

// Compare normalized command structure and numeric coordinates, never arbitrary
// strings. The ownership/user-edit digest continues to hash the untouched host
// snapshot, so even a later formatting-only user edit still triggers that guard.
export function vectorPathsMatch(actual, expected, tolerance = 0.001) {
  if (!Array.isArray(actual) || actual.length !== expected.length) return false;
  try {
    return expected.every((path, i) => {
      if (path.windingRule !== actual[i].windingRule) return false;
      const a = comparableSegments(actual[i].data), b = comparableSegments(path.data);
      return a.length === b.length && b.every((segment, j) => segment.length === a[j].length && segment.every((value, k) =>
        k === 0 ? value === a[j][k] : Math.abs(value - a[j][k]) <= tolerance));
    });
  } catch { return false; }
}
