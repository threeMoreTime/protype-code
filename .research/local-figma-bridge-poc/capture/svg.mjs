// A deliberately narrow static SVG reader: path geometry is converted to
// absolute commands and measured analytically; groups/transforms/filtering are
// reported by the caller instead of silently flattened incorrectly.
const TAU = Math.PI * 2;
const count = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
const fmt = value => String(Number(value.toFixed(9)));
const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)].map(match => [match[1], match[3]]));
const mod = angle => (angle % TAU + TAU) % TAU;
function arcCenter(start, values) {
  let [rx, ry, degrees, large, sweep, x, y] = values; rx = Math.abs(rx); ry = Math.abs(ry);
  if (!rx || !ry || start[0] === x && start[1] === y) return null;
  const phi = degrees * Math.PI / 180, cos = Math.cos(phi), sin = Math.sin(phi);
  const xp = cos * (start[0] - x) / 2 + sin * (start[1] - y) / 2, yp = -sin * (start[0] - x) / 2 + cos * (start[1] - y) / 2;
  const ratio = xp ** 2 / rx ** 2 + yp ** 2 / ry ** 2; if (ratio > 1) { rx *= Math.sqrt(ratio); ry *= Math.sqrt(ratio); }
  const factor = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, (rx ** 2 * ry ** 2 - rx ** 2 * yp ** 2 - ry ** 2 * xp ** 2) / (rx ** 2 * yp ** 2 + ry ** 2 * xp ** 2)));
  const cxp = factor * rx * yp / ry, cyp = -factor * ry * xp / rx;
  const cx = cos * cxp - sin * cyp + (start[0] + x) / 2, cy = sin * cxp + cos * cyp + (start[1] + y) / 2;
  const begin = Math.atan2((yp - cyp) / ry, (xp - cxp) / rx), end = Math.atan2((-yp - cyp) / ry, (-xp - cxp) / rx);
  let delta = end - begin; if (!sweep && delta > 0) delta -= TAU; if (sweep && delta < 0) delta += TAU;
  return { rx, ry, phi, cos, sin, cx, cy, begin, delta };
}
function roots(a, b, c) {
  if (Math.abs(a) < 1e-12) return Math.abs(b) < 1e-12 ? [] : [-c / b];
  const d = b * b - 4 * a * c; return d < 0 ? [] : [(-b + Math.sqrt(d)) / (2 * a), (-b - Math.sqrt(d)) / (2 * a)];
}
export function measurePath(data) {
  if (typeof data !== 'string' || data.length > 200000) throw new Error('SVG path budget exceeded');
  const tokens = data.match(/[MmZzLlHhVvCcSsQqTtAa]|[+-]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][+-]?\d+)?/g) ?? [];
  if (data.replace(/[MmZzLlHhVvCcSsQqTtAa]|[+-]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][+-]?\d+)?/g, '').replace(/[\s,]/g, '')) throw new Error('Unsupported SVG path syntax');
  let current = [0, 0], origin = current, previous = '', cubicControl, quadraticControl, command, i = 0;
  const segments = [], points = []; const add = p => { if (!p.every(Number.isFinite)) throw new Error('Invalid SVG coordinate'); points.push(p); };
  while (i < tokens.length) {
    if (/^[A-Za-z]$/.test(tokens[i])) command = tokens[i++];
    if (!command) throw new Error('SVG path missing command'); const kind = command.toUpperCase(), relative = command !== kind;
    if (kind === 'Z') { segments.push(['Z', []]); add(current); add(origin); current = [...origin]; previous = 'Z'; command = null; continue; }
    const n = count[kind]; if (!n || i + n > tokens.length || tokens.slice(i, i + n).some(t => /^[A-Za-z]$/.test(t))) throw new Error('Incomplete SVG command');
    const v = tokens.slice(i, i + n).map(Number); i += n; const start = [...current], point = (x, y) => [x + (relative ? start[0] : 0), y + (relative ? start[1] : 0)]; let segment;
    if (kind === 'M' || kind === 'L' || kind === 'T') {
      const end = point(v[0], v[1]);
      if (kind === 'T') { const control = ['Q', 'T'].includes(previous) ? [2 * start[0] - quadraticControl[0], 2 * start[1] - quadraticControl[1]] : start; segment = ['Q', [...control, ...end]]; quadraticControl = control; }
      else segment = [kind, end];
      current = end; if (kind === 'M') { origin = [...end]; command = relative ? 'l' : 'L'; }
    } else if (kind === 'H' || kind === 'V') { current = kind === 'H' ? [v[0] + (relative ? start[0] : 0), start[1]] : [start[0], v[0] + (relative ? start[1] : 0)]; segment = ['L', [...current]]; }
    else if (kind === 'C' || kind === 'S') {
      const c1 = kind === 'C' ? point(v[0], v[1]) : ['C', 'S'].includes(previous) ? [2 * start[0] - cubicControl[0], 2 * start[1] - cubicControl[1]] : start;
      const c2 = point(v[kind === 'C' ? 2 : 0], v[kind === 'C' ? 3 : 1]), end = point(v[n - 2], v[n - 1]);
      segment = ['C', [...c1, ...c2, ...end]]; cubicControl = c2; current = end;
    } else if (kind === 'Q') { const control = point(v[0], v[1]); current = point(v[2], v[3]); segment = ['Q', [...control, ...current]]; quadraticControl = control; }
    else if (kind === 'A') { if (![0, 1].includes(v[3]) || ![0, 1].includes(v[4]) || v[0] < 0 || v[1] < 0) throw new Error('Invalid SVG arc'); current = point(v[5], v[6]); segment = ['A', [...v.slice(0, 5), ...current]]; }
    if (!segments.length && kind !== 'M') throw new Error('SVG path must start with move');
    add(current); if (kind !== 'M') add(start);
    const [type, coordinates] = segment;
    if (type === 'C') {
      const ps = [start, coordinates.slice(0, 2), coordinates.slice(2, 4), coordinates.slice(4, 6)];
      for (let axis = 0; axis < 2; axis++) { const [a, b, c, d] = ps.map(p => p[axis]); for (const t of roots(-a + 3 * b - 3 * c + d, 2 * (a - 2 * b + c), b - a).filter(t => t > 0 && t < 1)) add([0, 1].map(j => (1 - t) ** 3 * ps[0][j] + 3 * (1 - t) ** 2 * t * ps[1][j] + 3 * (1 - t) * t ** 2 * ps[2][j] + t ** 3 * ps[3][j])); }
    } else if (type === 'Q') {
      const control = coordinates.slice(0, 2), end = coordinates.slice(2, 4);
      for (let axis = 0; axis < 2; axis++) { const t = (start[axis] - control[axis]) / (start[axis] - 2 * control[axis] + end[axis]); if (t > 0 && t < 1) add([0, 1].map(j => (1 - t) ** 2 * start[j] + 2 * (1 - t) * t * control[j] + t ** 2 * end[j])); }
    } else if (type === 'A') {
      const arc = arcCenter(start, coordinates);
      if (arc) {
        const { rx, ry, cos, sin, cx, cy, begin, delta } = arc;
        const tx = Math.atan2(-ry * sin, rx * cos), ty = Math.atan2(ry * cos, rx * sin);
        for (const theta of [tx, tx + Math.PI, ty, ty + Math.PI]) if (delta >= 0 ? mod(theta - begin) <= delta + 1e-10 : mod(begin - theta) <= -delta + 1e-10) add([cx + rx * cos * Math.cos(theta) - ry * sin * Math.sin(theta), cy + rx * sin * Math.cos(theta) + ry * cos * Math.sin(theta)]);
        coordinates[0] = rx; coordinates[1] = ry;
      }
    }
    segments.push(segment); previous = kind;
  }
  if (!segments.length) throw new Error('Empty SVG path');
  const limits = points.reduce((a, p) => [Math.min(a[0], p[0]), Math.min(a[1], p[1]), Math.max(a[2], p[0]), Math.max(a[3], p[1])], [Infinity, Infinity, -Infinity, -Infinity]);
  const [x, y] = limits, width = limits[2] - x, height = limits[3] - y;
  if (width < 1e-8 || height < 1e-8) throw new Error('Zero-area SVG path');
  const normalized = segments.map(([kind, v]) => { const out = [...v]; if (kind === 'A') { out[5] -= x; out[6] -= y; } else for (let j = 0; j < out.length; j += 2) { out[j] -= x; out[j + 1] -= y; } return kind + (out.length ? ` ${out.map(fmt).join(' ')}` : ''); }).join(' ');
  return { x, y, width, height, data: normalized };
}

export function readSimpleSVG(svg, rect, currentColor, parseColor) {
  if (/<(?:circle|rect|ellipse|line|polyline|polygon|use|text|g|defs|clipPath|mask|filter|linearGradient|radialGradient)\b|\b(?:transform|style|stroke|filter|clip-path|mask)\s*=/i.test(svg)) throw new Error('Complex SVG geometry or style');
  const root = attributes(/^\s*<svg\b[^>]*>/i.exec(svg)?.[0] ?? '');
  const viewBox = root.viewBox ? root.viewBox.trim().split(/[\s,]+/).map(Number) : [0, 0, Number.parseFloat(root.width) || rect.width, Number.parseFloat(root.height) || rect.height];
  if (viewBox.length !== 4 || !viewBox.every(Number.isFinite) || viewBox[2] <= 0 || viewBox[3] <= 0) throw new Error('Invalid SVG viewBox');
  const preserve = root.preserveAspectRatio ?? 'xMidYMid meet'; if (!/^(?:none|x(?:Min|Mid|Max)Y(?:Min|Mid|Max)(?: (?:meet|slice))?)$/.test(preserve)) throw new Error('Unsupported SVG aspect ratio');
  const sx = rect.width / viewBox[2], sy = rect.height / viewBox[3], scale = preserve.endsWith('slice') ? Math.max(sx, sy) : Math.min(sx, sy), xscale = preserve === 'none' ? sx : scale, yscale = preserve === 'none' ? sy : scale;
  const dx = preserve.includes('xMax') ? rect.width - viewBox[2] * xscale : preserve.includes('xMid') ? (rect.width - viewBox[2] * xscale) / 2 : 0, dy = preserve.includes('YMax') ? rect.height - viewBox[3] * yscale : preserve.includes('YMid') ? (rect.height - viewBox[3] * yscale) / 2 : 0;
  const paths = [...svg.matchAll(/<path\b[^>]*>/gi)].map(match => attributes(match[0]));
  if (!paths.length) throw new Error('SVG has no paths');
  return paths.map(path => {
    const bounds = measurePath(path.d); const fill = path.fill ?? root.fill ?? 'black'; const color = fill === 'currentColor' ? parseColor(currentColor) : fill === 'black' ? { r: 0, g: 0, b: 0, a: 1 } : parseColor(fill);
    if (!color && fill !== 'none') throw new Error('Unsupported SVG fill');
    // The caller keeps the computed root opacity on the SVG's outer Frame.
    // Applying the root attribute here again would square its transparency.
    const opacity = Number(path.opacity ?? 1) * Number(path['fill-opacity'] ?? root['fill-opacity'] ?? 1); if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) throw new Error('Invalid SVG opacity');
    const fills = color && color.a * opacity > 0 ? [{ type: 'SOLID', color: { r: color.r, g: color.g, b: color.b }, opacity: color.a * opacity }] : [];
    return { x: dx + (bounds.x - viewBox[0]) * xscale, y: dy + (bounds.y - viewBox[1]) * yscale, width: bounds.width * xscale, height: bounds.height * yscale, props: { fills, strokes: [], vectorPaths: [{ windingRule: (path['fill-rule'] ?? root['fill-rule']) === 'evenodd' ? 'EVENODD' : 'NONZERO', data: bounds.data }] } };
  });
}
