/** Read-only browser-side capture. Pass this function to a browser's evaluate API.
 * No external requests, DOM mutations, stylesheet reads or page code execution.
 * Input values require opt-in; password fields and data-capture-private are omitted.
 */
export function captureDOM(options = {}) {
  const { id = 'scene', name = 'Captured scene', rootSelector = 'body', includeInputValues = false, revision = 'unknown', redactions = [], maxNodes = 20000 } = options;
  if (!Number.isInteger(maxNodes) || maxNodes < 1 || maxNodes > 25000) throw new Error('maxNodes must be in [1, 25000]');
  const rootElement = document.querySelector(rootSelector);
  if (!rootElement) throw new Error('Capture root not found');
  const warnings = []; let seq = 0;
  const clean = text => redactions.reduce((value, rule) => { if (!rule || typeof rule.from !== 'string' || !rule.from || typeof rule.to !== 'string') throw new Error('Invalid literal redaction'); return value.split(rule.from).join(rule.to); }, String(text ?? ''));
  clean(''); // Validate even when the page contains no readable text.
  const privateSelector = '[data-capture-private],input[type="password"],input[type="hidden"]';
  if (rootElement.closest?.(privateSelector)) throw new Error('Capture root is private');
  function safeSVG(element, color) {
    const clone = element.cloneNode(true);
    const pending = [clone]; let count = 0;
    while (pending.length) {
      const node = pending.pop();
      if (++count > maxNodes) throw new Error('SVG node budget exceeded');
      if (node.nodeType === Node.TEXT_NODE) { node.textContent = clean(node.textContent); continue; }
      if (!(node instanceof Element)) { node.remove(); continue; }
      if (node !== clone && node.matches(`${privateSelector},script,style,foreignObject,image,use,animate,animateMotion,animateTransform,set`)) { node.remove(); continue; }
      for (const attribute of [...node.attributes]) {
        if (/^on/i.test(attribute.name) || /^(?:href|xlink:href|style)$/i.test(attribute.name) || /url\s*\(/i.test(attribute.value)) node.removeAttribute(attribute.name);
        else node.setAttribute(attribute.name, clean(attribute.value.replaceAll('currentColor', color)));
      }
      pending.push(...node.childNodes);
    }
    return new XMLSerializer().serializeToString(clone);
  }
  const cssKeys = ['display', 'position', 'zIndex', 'accentColor', 'opacity', 'backgroundColor', 'color', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderTopColor', 'borderTopStyle', 'borderTopLeftRadius', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'textAlign', 'whiteSpace', 'overflowX', 'overflowY', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'boxShadow', 'transform', 'objectFit', 'backgroundImage', 'backgroundSize', 'backgroundRepeat', 'backgroundPosition', 'backgroundOrigin', 'backgroundClip', 'backgroundAttachment', 'backgroundBlendMode'];
  const rect = r => ({ x: r.x, y: r.y, width: r.width, height: r.height });
  const next = () => { if (++seq > maxNodes) throw new Error('Capture node budget exceeded'); return `d${seq}`; };
  const image = element => {
    if (!element.complete || !element.naturalWidth) { warnings.push({ code: 'IMAGE_NOT_LOADED', nodeId: element.id || '' }); return null; }
    try { const canvas = document.createElement('canvas'); canvas.width = element.naturalWidth; canvas.height = element.naturalHeight; if (canvas.width * canvas.height > 20000000) throw new Error('Image pixel budget exceeded'); const context = canvas.getContext('2d'); if (!context) throw new Error('Canvas unavailable'); context.drawImage(element, 0, 0); return canvas.toDataURL('image/png'); } catch { warnings.push({ code: 'IMAGE_UNREADABLE', nodeId: element.id || '' }); return null; }
  };
  function read(element) {
    if (!(element instanceof Element) || element.matches('script,style,link,meta,noscript,[data-capture-private],input[type="password"],input[type="hidden"]')) return null;
    const cs = getComputedStyle(element); const bounds = element.getBoundingClientRect();
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0 || bounds.width < 0.01 || bounds.height < 0.01) return null;
    const style = Object.fromEntries(cssKeys.map(key => [key, cs[key]]));
    const result = { id: next(), kind: 'element', tag: element.tagName.toLowerCase(), name: clean(element.getAttribute('aria-label') || element.getAttribute('title') || element.tagName.toLowerCase()), rect: rect(bounds), style, attrs: { role: element.getAttribute('role'), disabled: element.hasAttribute('disabled'), checked: element.checked === true, pressed: element.getAttribute('aria-pressed') }, scroll: { left: element.scrollLeft, top: element.scrollTop, width: element.scrollWidth, height: element.scrollHeight }, children: [] };
    if (element.getAttribute('data-prototype-id')) result.attrs.prototypeId = clean(element.getAttribute('data-prototype-id'));
    if (result.tag === 'svg') { result.kind = 'svg'; result.svg = safeSVG(element, cs.color); return result; }
    if (result.tag === 'img') { result.kind = 'image'; result.dataUrl = image(element); return result; }
    if (['canvas', 'iframe', 'video'].includes(result.tag)) { warnings.push({ code: 'UNSUPPORTED_SURFACE', nodeId: result.id, tag: result.tag }); return result; }
    if (result.tag === 'progress') { result.attrs.value = element.value; result.attrs.max = element.max; result.attrs.indeterminate = !element.hasAttribute('value'); }
    if (result.tag === 'details') result.attrs.open = element.hasAttribute('open');
    if (['input', 'textarea', 'select'].includes(result.tag)) {
      const isChoice = ['checkbox', 'radio'].includes(element.type);
      if (isChoice) { result.attrs.inputType = element.type; return result; }
      const value = result.tag === 'select' ? element.selectedOptions?.[0]?.textContent ?? '' : includeInputValues ? element.value || element.placeholder : element.placeholder || '';
      result.attrs.value = clean(value); result.attrs.inputType = element.type;
      result.attrs.valueCaptured = result.tag === 'select' || includeInputValues;
      return result;
    }
    for (const child of element.childNodes) {
      if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
        const range = document.createRange(); range.selectNodeContents(child); const bounds = range.getBoundingClientRect();
        if (bounds.width > 0 && bounds.height > 0) result.children.push({ id: next(), kind: 'text', text: clean(cs.whiteSpace.startsWith('pre') ? child.textContent : child.textContent.replace(/\s+/g, ' ')), rect: rect(bounds), style });
      } else if (child instanceof Element) { const captured = read(child); if (captured) result.children.push(captured); }
    }
    return result;
  }
  const root = read(rootElement); if (!root) throw new Error('Capture root is not visible');
  return { captureVersion: '1.0', id, name, viewport: { width: innerWidth, height: innerHeight }, source: { revision, capturedAt: new Date().toISOString(), adapter: 'dom-capture-1.0' }, root, warnings };
}
