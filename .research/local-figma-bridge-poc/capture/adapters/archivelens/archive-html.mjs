// Parse capture attributes and narrowly proven static declarations; never execute archived HTML.
const decode = text => String(text).replace(/&(?:quot|apos|amp|lt|gt|#\d+|#x[0-9a-f]+);/gi, entity => { const known = { '&quot;': '"', '&apos;': "'", '&amp;': '&', '&lt;': '<', '&gt;': '>' }; if (known[entity.toLowerCase()]) return known[entity.toLowerCase()]; const number = entity.toLowerCase().startsWith('&#x') ? parseInt(entity.slice(3, -1), 16) : parseInt(entity.slice(2, -1), 10); return Number.isInteger(number) && number >= 0 && number <= 0x10ffff ? String.fromCodePoint(number) : entity; });
const attributes = tag => Object.fromEntries([...tag.matchAll(/\s([a-zA-Z][\w:-]*)\s*=\s*(["'])(.*?)\2/gs)].map(match => [match[1].toLowerCase(), decode(match[3])]));
const overlaySelector = '.al-viewer-overlays';
const inertMarkup = html => html.replace(/<!--[^]*?-->/g, '').replace(/<script\b[^>]*>[^]*?<\/script>/gi, '');
function archivedOverlayDeclaration(html) {
  // Recover this known direct-sibling overlay declaration only. This is static
  // CSS evidence, not computed style or a general CSS cascade implementation.
  const inertHtml = inertMarkup(html);
  const rules = [];
  for (const match of inertHtml.matchAll(/<style\b([^>]*)>([^]*?)<\/style>/gi)) {
    const css = match[2].replace(/\/\*[^]*?\*\//g, '');
    if (!css.includes(overlaySelector)) continue;
    const attrs = attributes(`<style ${match[1]}>`);
    if ((attrs.media && attrs.media.trim().toLowerCase() !== 'all') || (attrs.type && attrs.type.trim().toLowerCase() !== 'text/css') || /(?:^|\s)disabled(?:\s|=|$)/i.test(match[1])) return null;
    const stack = []; let begin = 0; let quote = '';
    for (let i = 0; i < css.length; i++) {
      const char = css[i];
      if (quote) { if (char === '\\') i++; else if (char === quote) quote = ''; continue; }
      if (char === '"' || char === "'") { quote = char; continue; }
      if (char === '{') {
        const selector = css.slice(begin, i).trim();
        stack.push({ selector, begin: i + 1, depth: stack.length }); begin = i + 1;
      } else if (char === '}') {
        const rule = stack.pop(); if (!rule) return null;
        if (rule.selector.includes(overlaySelector)) {
          if (rule.depth !== 0 || rule.selector !== overlaySelector) return null;
          rules.push(css.slice(rule.begin, i));
        }
        begin = i + 1;
      } else if (char === ';' && !stack.length) begin = i + 1;
    }
    if (stack.length || quote) return null;
  }
  if (rules.length !== 1) return null;
  const declarations = rules[0].split(';').map(part => /^\s*([\w-]+)\s*:\s*(.*?)\s*$/s.exec(part)).filter(Boolean);
  const position = declarations.filter(part => part[1].toLowerCase() === 'position');
  const zIndex = declarations.filter(part => part[1].toLowerCase() === 'z-index');
  return position.length === 1 && position[0][2].toLowerCase() === 'absolute' && zIndex.length === 1 && zIndex[0][2] === '3'
    ? { kind: 'STATIC_CSS_DERIVED', selector: overlaySelector, positionDeclaration: 'position: absolute', declaration: 'z-index: 3' } : null;
}
function controlMarkup(html) {
  const elements = new Map(), ambiguousIds = new Set();
  const markup = inertMarkup(html).replace(/<style\b[^>]*>[^]*?<\/style>/gi, '');
  for (const match of markup.matchAll(/<([a-z][\w:-]*)\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi)) {
    const tag = match[1].toLowerCase(); const body = match[0].slice(match[1].length + 1, -1).replace(/\/\s*$/, '');
    const attrs = Object.create(null), ids = new Set(); let index = 0; let valid = true;
    const token = /\s+([a-zA-Z_:][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/y;
    while (index < body.length) {
      if (!body.slice(index).trim()) break;
      token.lastIndex = index; const part = token.exec(body);
      if (!part) {
        // A rejected token may precede the ID. Its identity cannot be proven
        // without a complete parse, so no later tag may be treated as unique.
        // This only disables native-control declaration recovery for this HTML.
        return new Map();
      }
      const name = part[1].toLowerCase(), value = decode(part[2] ?? part[3] ?? part[4] ?? '');
      if (name === 'data-design-id' && value) ids.add(value);
      // Continue tokenizing duplicate attributes to collect every identifiable
      // ID. Discarding the malformed tag must not make a later tag unique.
      if (Object.hasOwn(attrs, name)) valid = false;
      else attrs[name] = value;
      index = token.lastIndex;
    }
    if (!valid) { for (const id of ids) ambiguousIds.add(id); continue; }
    if (!attrs['data-design-id']) continue;
    const id = attrs['data-design-id'];
    if (!elements.has(id)) elements.set(id, []);
    elements.get(id).push({ tag, attrs });
  }
  // Empty entries deliberately fail every exact-one identity guard, including
  // ancestor checks used by the conservative progress CSS recovery.
  for (const id of ambiguousIds) elements.set(id, []);
  return elements;
}
function controlCssRules(html) {
  const rules = [];
  const markup = inertMarkup(html);
  // Static color recovery needs a closed author-style source. Keep HTML state
  // attributes even when external, escaped or reset styles remain unknown.
  if (/<(?:link|script|iframe)\b/i.test(html.replace(/<!--[^]*?-->/g, ''))) return null;
  for (const match of markup.matchAll(/<style\b([^>]*)>([^]*?)<\/style>/gi)) {
    if (match[1].trim()) return null;
    const attrs = attributes(`<style ${match[1]}>`);
    const conditional = Boolean((attrs.media && attrs.media.trim().toLowerCase() !== 'all') || (attrs.type && attrs.type.trim().toLowerCase() !== 'text/css') || /(?:^|\s)disabled(?:\s|=|$)/i.test(match[1]));
    const css = match[2].replace(/\/\*[^]*?\*\//g, '');
    if (/\\|@(?:import|property)\b/i.test(css)) return null;
    const stack = []; let begin = 0; let quote = '';
    for (let i = 0; i < css.length; i++) {
      const char = css[i];
      if (quote) { if (char === '\\') i++; else if (char === quote) quote = ''; continue; }
      if (char === '"' || char === "'") { quote = char; continue; }
      if (char === '{') { stack.push({ selector: css.slice(begin, i).trim(), begin: i + 1, depth: stack.length }); begin = i + 1; }
      else if (char === '}') {
        const rule = stack.pop(); if (!rule) return null;
        const declarations = css.slice(rule.begin, i).split(';').map(part => /^\s*([\w-]+)\s*:\s*(.*?)\s*$/s.exec(part)).filter(Boolean).map(part => ({ property: part[1].toLowerCase(), value: part[2] }));
        if (declarations.some(item => item.property === 'all')) return null;
        rules.push({ selector: rule.selector, conditional: conditional || rule.depth !== 0, declarations }); begin = i + 1;
      } else if (char === ';' && !stack.length) begin = i + 1;
    }
    if (stack.length || quote) return null;
  }
  return rules;
}
function progressAccent(node, ancestors, elements, rules) {
  if (!rules || Object.hasOwn(node.style ?? {}, 'accentColor')) return null;
  const selectors = ['.al-search-job-strip progress', '.al-logical-job progress'];
  const matching = selectors.filter(selector => ancestors.some(parent => (parent.attrs?.class ?? '').split(/\s+/).includes(selector.split(' ')[0].slice(1))));
  if (matching.length !== 1) return null;
  const selector = matching[0]; const candidates = [];
  for (const rule of rules) for (const declaration of rule.declarations.filter(item => item.property === 'accent-color')) {
    if (/\binput\b/.test(rule.selector) && !/\bprogress\b/.test(rule.selector)) continue;
    if (selectors.includes(rule.selector) && rule.selector !== selector) continue;
    if (rule.conditional || rule.selector !== selector) return null;
    candidates.push(declaration.value);
  }
  if (candidates.length !== 1 || candidates[0] !== 'var(--accent)') return null;
  const variables = rules.flatMap(rule => rule.declarations.filter(item => item.property === '--accent').map(item => ({ rule, value: item.value })));
  if (variables.length !== 1 || variables[0].rule.conditional || variables[0].rule.selector !== ':root') return null;
  const value = variables[0].value;
  const channel = '(?:\\d+(?:\\.\\d+)?|\\.\\d+)';
  const colorLiteral = new RegExp(`^(?:#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})|rgba?\\(\\s*${channel}[%]?[,\\s]+${channel}[%]?[,\\s]+${channel}[%]?(?:\\s*[,/]\\s*${channel}[%]?)?\\s*\\)|oklch\\(\\s*${channel}%?\\s+${channel}\\s+${channel}(?:deg)?(?:\\s*/\\s*${channel}%?)?\\s*\\))$`, 'i');
  if (!colorLiteral.test(value)) return null;
  const matchingInlineAncestors = [];
  for (const parent of [...ancestors, node]) {
    const entries = elements.get(parent.id); if (!entries || entries.length !== 1) return null;
    const inline = entries[0].attrs.style ?? '';
    if (/\\/.test(inline) || /(?:^|;)\s*(?:accent-color|all)\s*:/i.test(inline)) return null;
    const inlineVariables = inline.split(';').map(part => /^\s*--accent\s*:\s*(.*?)\s*$/i.exec(part)).filter(Boolean);
    if (inlineVariables.length > 1 || inlineVariables.some(part => part[1] !== value)) return null;
    if (inlineVariables.length) matchingInlineAncestors.push(parent.id);
  }
  return { value, evidence: { kind: 'STATIC_CSS_DERIVED', selector, declaration: 'accent-color: var(--accent)', variableSelector: ':root', variableDeclaration: `--accent: ${value}`, matchingInlineAncestors, nodeId: node.id } };
}
function enrichNativeControls(result, html) {
  const elements = controlMarkup(html); const rules = controlCssRules(html);
  const number = (text, minimum, inclusive) => {
    if (typeof text !== 'string' || !/^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(text.trim())) return undefined;
    const value = Number(text); return Number.isFinite(value) && (inclusive ? value >= minimum : value > minimum) ? value : undefined;
  };
  const supplement = (node, field, value, attribute, sourceValue, present) => {
    if (value === undefined || Object.hasOwn(node.attrs ?? {}, field)) return;
    node.attrs = { ...node.attrs, [field]: value };
    node.attrsEvidence = { ...node.attrsEvidence, [field]: { kind: 'HTML_ATTRIBUTE_DERIVED', nodeId: node.id, tag: node.tag, attribute, present, ...(present ? { sourceValue } : {}) } };
  };
  function walk(node, ancestors = []) {
    const matches = elements.get(node.id);
    if (node.tag === 'input' && matches?.length === 1 && matches[0].tag === 'input') {
      const attrs = matches[0].attrs, type = attrs.type?.toLowerCase();
      if (['radio', 'checkbox', 'color', 'range'].includes(type) && node.archivedControl === undefined) {
        // HTML attributes describe declared defaults, not the live input
        // properties. Keep legacy checked:null and captured values untouched.
        const metadata = {};
        const declared = (field, value, attribute) => {
          if (value === undefined) return;
          const present = Object.hasOwn(attrs, attribute);
          metadata[field] = { value, evidence: { kind: 'HTML_ATTRIBUTE_DERIVED', nodeId: node.id, tag: 'input', attribute, present, ...(present ? { sourceValue: attrs[attribute] } : {}) } };
        };
        declared('inputType', type, 'type');
        if (['radio', 'checkbox'].includes(type)) {
          declared('defaultChecked', Object.hasOwn(attrs, 'checked'), 'checked');
          if (typeof attrs.value === 'string' && attrs.value.length <= 256) declared('defaultValue', attrs.value, 'value');
        } else if (type === 'color') {
          if (/^#[0-9a-f]{6}$/i.test(attrs.value ?? '')) declared('defaultValue', attrs.value.toLowerCase(), 'value');
        } else {
          for (const field of ['min', 'max', 'step', 'value']) {
            const value = number(attrs[field], -Infinity, false);
            if (field !== 'step' || value > 0) declared(field === 'value' ? 'defaultValue' : field, value, field);
          }
        }
        node.archivedControl = metadata;
      }
    }
    if (matches?.length === 1 && matches[0].tag === node.tag && ['progress', 'details'].includes(node.tag)) {
      const attrs = matches[0].attrs;
      if (node.tag === 'details') supplement(node, 'open', Object.hasOwn(attrs, 'open'), 'open', attrs.open, Object.hasOwn(attrs, 'open'));
      else {
        supplement(node, 'value', number(attrs.value, 0, true), 'value', attrs.value, Object.hasOwn(attrs, 'value'));
        supplement(node, 'max', number(attrs.max, 0, false), 'max', attrs.max, Object.hasOwn(attrs, 'max'));
        supplement(node, 'indeterminate', !Object.hasOwn(attrs, 'value'), 'value', attrs.value, Object.hasOwn(attrs, 'value'));
        const accent = progressAccent(node, ancestors, elements, rules);
        if (accent) { node.style = { ...node.style, accentColor: accent.value }; node.styleEvidence = { ...node.styleEvidence, accentColor: accent.evidence }; }
      }
    }
    for (const child of node.children ?? []) walk(child, [...ancestors, node]);
  }
  walk(result.root);
}
export function enrichFromArchivedHTML(capture, html, resourceData = new Map(), options = {}) {
  if (typeof html !== 'string' || html.length > 25 * 1024 * 1024) throw new Error('Archived HTML byte budget exceeded');
  const result = structuredClone(capture); const nodes = new Map(); const stack = [result.root];
  while (stack.length) { const node = stack.pop(); nodes.set(node.id, node); stack.push(...node.children ?? []); }
  const overlayEvidence = archivedOverlayDeclaration(html);
  const elementHtml = overlayEvidence ? inertMarkup(html).replace(/<style\b[^>]*>[^]*?<\/style>/gi, '') : '';
  if (overlayEvidence) for (const match of elementHtml.matchAll(/<([a-z][\w:-]*)\b[^>]*>/gi)) {
    const attrs = attributes(match[0]); const node = nodes.get(attrs['data-design-id']);
    if (!node || node.tag !== match[1].toLowerCase() || node.style?.position !== 'absolute' || Object.hasOwn(node.style, 'zIndex')) continue;
    if (!(attrs.class ?? '').split(/\s+/).includes('al-viewer-overlays') || !(node.attrs?.class ?? '').split(/\s+/).includes('al-viewer-overlays')) continue;
    if (/(?:^|;)\s*(?:z-index|position)\s*:/i.test(attrs.style ?? '')) continue;
    node.style.zIndex = '3';
    node.styleEvidence = { ...node.styleEvidence, zIndex: { ...overlayEvidence, nodeId: node.id } };
  }
  for (const match of html.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/gi)) {
    const attrs = attributes(`<select ${match[1]}>`); const node = nodes.get(attrs['data-design-id']); if (!node || node.tag !== 'select') continue;
    const choices = [...match[2].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)].map(option => { const a = attributes(`<option ${option[1]}>`); const label = decode(option[2].replace(/<[^>]*>/g, '')); return { value: a.value ?? label, label, selected: /(?:^|\s)selected(?:\s|=|$)/i.test(option[1]) }; });
    const selected = Object.hasOwn(attrs, 'value') ? choices.find(option => option.value === attrs.value) : choices.find(option => option.selected) ?? choices[0];
    if (selected) node.attrs = { ...node.attrs, value: selected.label, valueCaptured: true };
  }
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const attrs = attributes(match[0]); const node = nodes.get(attrs['data-design-id']); if (!node || node.kind !== 'image' || node.dataUrl) continue;
    if (/^data:image\/(png|jpeg|webp);base64,/.test(attrs.src ?? '')) node.dataUrl = attrs.src;
    else {
      // The caller supplies an explicit directory of original image resources.
      // Match only exact decoded basenames; never follow file/network URLs.
      let basename; try { basename = decodeURIComponent(String(attrs.src ?? '').split(/[?#]/)[0].split('/').pop()); } catch { continue; }
      if (basename && !/[\\/]/.test(basename) && resourceData.has(basename)) node.dataUrl = resourceData.get(basename);
    }
  }
  if (options.nativeControls === true) enrichNativeControls(result, html);
  return result;
}
