/** Task-specific, mock-only DOM evidence. This is not a visual PASS assertion.
 * captureFeedbackDOM is deliberately self-contained for Playwright/evaluate.
 * Geometry stays in viewport coordinates; parentId describes semantic ancestry,
 * paintOrder describes the bounded CSS stacking model, and clips/occludedBy do
 * not rewrite the original measured rectangles.
 */
export function captureFeedbackDOM(options = {}) {
  const fail = code => { throw new Error(code); };
  const local = location.protocol === 'file:' || ['http:', 'https:'].includes(location.protocol) && ['localhost', '127.0.0.1', '[::1]', '::1'].includes(location.hostname);
  if (!local || location.username || location.password) fail('FEEDBACK_CAPTURE_LOCAL_ONLY');
  const mock = window.__feedbackMock;
  if (!mock || typeof mock !== 'object' || !['reset', 'snapshot', 'setPermissions', 'subscribe'].every(key => typeof mock[key] === 'function')) fail('FEEDBACK_CAPTURE_MOCK_REQUIRED');
  let authenticated = !!document.querySelector('input[type="password"], [data-authenticated-source], [data-real-customer-data]');
  try { authenticated ||= document.cookie.trim().length > 0; } catch { /* file documents have no cookie jar */ }
  for (const storage of [() => localStorage, () => sessionStorage]) {
    try { const store = storage(); for (let index = 0; index < store.length; index++) if (/(?:token|authorization|credential|password|cookie|session|jwt)/i.test(store.key(index) ?? '')) authenticated = true; } catch { /* opaque local origins do not expose storage */ }
  }
  if (authenticated) fail('FEEDBACK_CAPTURE_AUTHENTICATION_PRESENT');
  for (const resource of performance.getEntriesByType('resource')) {
    try { const url = new URL(resource.name, location.href); if (['http:', 'https:'].includes(url.protocol) && !['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname)) fail('FEEDBACK_CAPTURE_EXTERNAL_RESOURCE_PRESENT'); } catch (error) { if (error.message === 'FEEDBACK_CAPTURE_EXTERNAL_RESOURCE_PRESENT') throw error; }
  }
  const { id = 'feedback', name = '反馈列表 · PC · Mock', rootSelector = 'body', maxNodes = 20000, maxTextCharacters = 200000 } = options;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_./:-]{0,119}$/.test(id) || !Number.isInteger(maxNodes) || maxNodes < 1 || maxNodes > 50000 || !Number.isInteger(maxTextCharacters) || maxTextCharacters < 1 || maxTextCharacters > 1000000) fail('FEEDBACK_CAPTURE_OPTIONS_INVALID');
  const root = document.querySelector(rootSelector);
  if (!root) fail('FEEDBACK_CAPTURE_ROOT_MISSING');
  const privateSelector = '[data-capture-private],input[type="hidden"],[data-feedback-measurement],[data-feedback-capture-probe]';
  if (root.closest(privateSelector)) fail('FEEDBACK_CAPTURE_ROOT_PRIVATE');
  const styleKeys = ['display', 'visibility', 'position', 'zIndex', 'float', 'order', 'isolation', 'mixBlendMode', 'filter', 'backdropFilter', 'opacity', 'color', 'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat', 'backgroundOrigin', 'backgroundClip', 'backgroundBlendMode', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'borderTopStyle', 'borderRightStyle', 'borderBottomStyle', 'borderLeftStyle', 'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius', 'boxShadow', 'outline', 'outlineWidth', 'outlineColor', 'outlineStyle', 'outlineOffset', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontStretch', 'fontVariant', 'fontFeatureSettings', 'fontVariationSettings', 'fontKerning', 'lineHeight', 'letterSpacing', 'wordSpacing', 'textAlign', 'textIndent', 'textTransform', 'textDecorationLine', 'textDecorationColor', 'textDecorationStyle', 'textDecorationThickness', 'textUnderlineOffset', 'textOverflow', 'whiteSpace', 'wordBreak', 'overflowWrap', 'direction', 'writingMode', 'verticalAlign', 'overflow', 'overflowX', 'overflowY', 'clip', 'clipPath', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'top', 'right', 'bottom', 'left', 'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight', 'boxSizing', 'transform', 'transformOrigin', 'perspective', 'objectFit', 'objectPosition', 'content', 'accentColor', 'fill', 'fillOpacity', 'fillRule', 'stroke', 'strokeWidth', 'strokeOpacity', 'strokeLinecap', 'strokeLinejoin', 'strokeMiterlimit', 'strokeDasharray', 'strokeDashoffset', 'paintOrder'];
  const rect = value => ({ x: value.x, y: value.y, width: value.width, height: value.height });
  const intersect = (a, b) => { if (!a || !b) return null; const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y), right = Math.min(a.x + a.width, b.x + b.width), bottom = Math.min(a.y + a.height, b.y + b.height); return right > x && bottom > y ? { x, y, width: right - x, height: bottom - y } : null; };
  const css = source => Object.fromEntries(styleKeys.map(key => [key, source[key] ?? '']));
  const nodes = [], warnings = [], unsupported = [], elementIds = new WeakMap();
  let sequence = 0, textCharacters = 0;
  const issue = (target, code, nodeId, detail = '', extra = {}) => target.push({ code, nodeId, detail, ...extra });
  const next = () => { if (++sequence > maxNodes) fail('FEEDBACK_CAPTURE_NODE_BUDGET'); return `${id}/n${sequence}`; };
  const isContext = (style, parentStyle, isRoot = false) => isRoot || ['fixed', 'sticky'].includes(style.position) || Number(style.opacity) < 1 || style.transform !== 'none' || style.filter !== 'none' || style.backdropFilter && style.backdropFilter !== 'none' || style.isolation === 'isolate' || style.mixBlendMode !== 'normal' || style.perspective !== 'none' || style.zIndex !== 'auto' && (style.position !== 'static' || /flex|grid/.test(parentStyle?.display ?? ''));
  const attrs = element => {
    const result = {};
    for (const attribute of element.attributes) if (['id', 'class', 'role', 'title', 'type', 'disabled', 'checked', 'data-prototype-id', 'data-testid'].includes(attribute.name) || /^aria-[a-z-]+$/.test(attribute.name)) result[attribute.name] = attribute.value;
    if (element instanceof HTMLInputElement && !['password', 'hidden'].includes(element.type)) { result.checked = element.checked; result.indeterminate = element.indeterminate; result.disabled = element.disabled; if (!['checkbox', 'radio', 'file'].includes(element.type)) { result.value = element.value; result.placeholder = element.placeholder; } }
    if (element instanceof HTMLTextAreaElement) { result.value = element.value; result.placeholder = element.placeholder; }
    return result;
  };
  const visible = (bounds, clips) => clips.reduce((value, clip) => intersect(value, clip.rect), bounds);
  const translationOnly=value=>value==='none'||/^matrix\(/.test(value)&&(()=>{const values=value.slice(7,-1).split(',').map(Number);return values.length===6&&values.every(Number.isFinite)&&Math.abs(values[0]-1)<.000001&&Math.abs(values[1])<.000001&&Math.abs(values[2])<.000001&&Math.abs(values[3]-1)<.000001;})();
  function addNode(data, parent, inheritedClips, parentStyle) {
    const nodeId = next(), style = data.style;
    const node = { id: nodeId, parentId: parent?.id ?? null, kind: 'element', tag: '', attrs: {}, ...data, clips: inheritedClips.map(clip => ({ ...clip, rect: { ...clip.rect } })), visibleRect: visible(data.rect, inheritedClips), domOrder: nodes.length, establishesStackingContext: data.kind === 'text' ? false : isContext(style, parentStyle, !parent), stackingContextId: parent ? (parent.establishesStackingContext ? parent.id : parent.stackingContextId) : null, occludedBy: [] };
    nodes.push(node);
    return node;
  }
  function localReference(value, nodeId) {
    return value.replace(/url\(\s*(["']?)(.*?)\1\s*\)/gi, (whole, _quote, reference) => {
      if (reference.startsWith('#')) return `url(${reference})`;
      try { const target = new URL(reference, location.href), current = new URL(location.href); if (target.hash && target.origin === current.origin && target.pathname === current.pathname && target.search === current.search) return `url(${target.hash})`; } catch { /* rejected below */ }
      issue(unsupported, 'SVG_EXTERNAL_REFERENCE_REMOVED', nodeId);
      return 'none';
    });
  }
  function svgMarkup(element, node) {
    const clone = element.cloneNode(true), sourceNodes = [element, ...element.querySelectorAll('*')], cloneNodes = [clone, ...clone.querySelectorAll('*')];
    const removed = new Set();
    const paintAttributes = { color: 'color', fill: 'fill', fillOpacity: 'fill-opacity', fillRule: 'fill-rule', stroke: 'stroke', strokeWidth: 'stroke-width', strokeOpacity: 'stroke-opacity', strokeLinecap: 'stroke-linecap', strokeLinejoin: 'stroke-linejoin', strokeMiterlimit: 'stroke-miterlimit', strokeDasharray: 'stroke-dasharray', strokeDashoffset: 'stroke-dashoffset', opacity: 'opacity', clipPath: 'clip-path', mask: 'mask', filter: 'filter', visibility: 'visibility', display: 'display' };
    for (let index = 0; index < sourceNodes.length; index++) {
      const source = sourceNodes[index], target = cloneNodes[index];
      if (source.closest(privateSelector) || /^(script|foreignObject|animate|animateMotion|animateTransform|set)$/i.test(source.localName)) { target.remove(); removed.add(source); issue(unsupported, 'SVG_UNSUPPORTED_NODE_REMOVED', node.id, '', { tag: source.localName }); continue; }
      if ([...removed].some(ancestor => ancestor.contains(source))) continue;
      for (const attribute of [...target.attributes]) {
        if (/^on/i.test(attribute.name) || attribute.name === 'style') target.removeAttribute(attribute.name);
        else if (/^(href|xlink:href)$/i.test(attribute.name) && !attribute.value.startsWith('#') && !/^data:image\/(png|jpeg|webp|gif);base64,/i.test(attribute.value)) { target.removeAttribute(attribute.name); issue(unsupported, 'SVG_EXTERNAL_REFERENCE_REMOVED', node.id); }
        else if (/url\(/i.test(attribute.value)) target.setAttribute(attribute.name, localReference(attribute.value, node.id));
      }
      const computed = getComputedStyle(source);
      for (const [property, attribute] of Object.entries(paintAttributes)) {
        const value = computed[property];
        if (value && value !== 'normal' && !(value === 'none' && ['clipPath', 'mask', 'filter'].includes(property))) target.setAttribute(attribute, localReference(value.replaceAll('currentColor', computed.color), node.id));
      }
      // Attribute transforms contribute to computed transform. Compare their
      // matrices without consolidate(), which would mutate the source SVG.
      let attributeMatrix = new DOMMatrix();
      const transforms = source.transform?.baseVal;
      for (let item = 0; item < (transforms?.numberOfItems ?? 0); item++) attributeMatrix = attributeMatrix.multiply(transforms.getItem(item).matrix);
      const computedMatrix = new DOMMatrix(computed.transform === 'none' ? undefined : computed.transform);
      const overridesAttribute = ['a', 'b', 'c', 'd', 'e', 'f'].some(key => Math.abs(computedMatrix[key] - attributeMatrix[key]) > 0.000001);
      if (computed.transform !== 'none' && (!source.hasAttribute('transform') || overridesAttribute)) {
        const origin = computed.transformOrigin.split(/\s+/).map(Number.parseFloat);
        if (origin.some(value => !Number.isFinite(value))) issue(unsupported, 'SVG_TRANSFORM_ORIGIN_UNRESOLVED', node.id);
        else target.setAttribute('transform', `translate(${origin[0] || 0} ${origin[1] || 0}) ${computed.transform} translate(${-origin[0] || 0} ${-origin[1] || 0})`);
      } else if (computed.transform === 'none' && source.hasAttribute('transform') && overridesAttribute) target.removeAttribute('transform');
    }
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', String(node.rect.width)); clone.setAttribute('height', String(node.rect.height));
    if (!clone.hasAttribute('viewBox')) clone.setAttribute('viewBox', `0 0 ${element.viewBox?.baseVal?.width || node.rect.width} ${element.viewBox?.baseVal?.height || node.rect.height}`);
    const markup = new XMLSerializer().serializeToString(clone);
    if (markup.length > 2000000) fail('FEEDBACK_CAPTURE_SVG_BUDGET');
    const references = [...markup.matchAll(/(?:url\(\s*#([^\s)]+)\s*\)|(?:href|xlink:href)="\#([^"]+)")/g)].map(match => match[1] ?? match[2]);
    const identifiers = new Set([clone, ...clone.querySelectorAll('[id]')].map(item => item.id).filter(Boolean));
    for (const reference of references) if (!identifiers.has(reference)) issue(unsupported, 'SVG_LOCAL_REFERENCE_UNRESOLVED', node.id, reference);
    node.svgEvidence = { selfContained: !unsupported.some(entry => entry.nodeId === node.id && /REFERENCE/.test(entry.code)), computedPaintsInlined: true, rootOpacityIncluded: true, source: 'LOCAL_SYNTHETIC_DOM', visual: 'NOT RUN' };
    return markup;
  }
  function pseudoContent(value, ownerId) {
    if (value === 'none' || value === 'normal' || !value) return null;
    if (!/^(["']).*\1$/s.test(value)) { issue(unsupported, 'PSEUDO_COMPLEX_CONTENT', ownerId); return null; }
    return value.slice(1, -1).replace(/\\([0-9a-f]{1,6})\s?|\\(.)/gi, (_whole, code, character) => code ? String.fromCodePoint(parseInt(code, 16)) : character);
  }
  // The measured calendar icons use only -45deg/135deg decorative owners.
  // Their BCR is a rotated AABB, not the pseudo's native drawing dimensions.
  // A temporary off-screen copy measures the used border-box without changing
  // any owner style. Independent owner/layout/final BCR checks gate acceptance.
  function rigidOwnerPseudoGeometry(element, owner, probe, style, bounds, measuredLayoutRect, text) {
    const reject = reason => ({ accepted: false, reason });
    const matrix = value => { if (value === 'none') return [1,0,0,1,0,0]; const match = /^matrix\(([^)]+)\)$/.exec(value); if (!match) return null; const values = match[1].split(',').map(Number); return values.length === 6 && values.every(Number.isFinite) ? values : null; };
    const px = value => /^-?(?:\d*\.\d+|\d+)(?:px)?$/.test(value ?? '') ? Number.parseFloat(value) : null;
    const origin = value => { const parts = String(value).split(/\s+/).map(px); return parts.length >= 2 && parts.every(Number.isFinite) && (parts.length === 2 || parts.length === 3 && parts[2] === 0) ? parts : null; };
    const borderBox = value => { const width = px(value.width), height = px(value.height); if (!(width > 0 && height > 0)) return null; const extra = axis => value.boxSizing === 'border-box' ? 0 : (axis === 'x' ? ['Left','Right'] : ['Top','Bottom']).reduce((sum, side) => sum + (px(value[`padding${side}`]) ?? 0) + (px(value[`border${side}Width`]) ?? 0), 0); return { width: width + extra('x'), height: height + extra('y') }; };
    const corners = (value, width, height) => { const points = [[0,0],[width,0],[width,height],[0,height]].map(([x,y]) => ({ x: value[0]*x+value[2]*y+value[4], y: value[1]*x+value[3]*y+value[5] })); const x = Math.min(...points.map(point => point.x)), y = Math.min(...points.map(point => point.y)); return { x, y, width: Math.max(...points.map(point => point.x))-x, height: Math.max(...points.map(point => point.y))-y }; };
    const ownerMatrix = matrix(owner.style.transform), ownMatrix = matrix(style.transform), ownerOrigin = origin(owner.style.transformOrigin), ownOrigin = origin(style.transformOrigin), ownerSize = borderBox(owner.style);
    if (!ownerMatrix || !ownMatrix || !ownerOrigin || !ownOrigin || !ownerSize || text || style.position !== 'absolute' || owner.ancestorTransforms) return reject('RIGID_SOURCE_NOT_SUPPORTED');
    const [a,b,c,d,e,f] = ownerMatrix, determinant = a*d-b*c;
    if (Math.abs(a*a+b*b-1) > 0.00001 || Math.abs(c*c+d*d-1) > 0.00001 || Math.abs(a*c+b*d) > 0.00001 || Math.abs(determinant-1) > 0.00001 || Math.abs(a+b) > 0.000001 || Math.abs(c+b) > 0.000001 || Math.abs(d-a) > 0.000001 || Math.abs(Math.abs(a)-Math.SQRT1_2) > 0.000001) return reject('OWNER_LINEAR_TRANSFORM_NOT_OBSERVED');
    if (!['transparent','rgba(0, 0, 0, 0)'].includes(owner.style.backgroundColor) || ['Top','Right','Bottom','Left'].some(side => (px(owner.style[`border${side}Width`]) ?? 0) > 0) || owner.style.boxShadow !== 'none' || owner.style.clipPath !== 'none' || owner.style.filter !== 'none' || owner.style.perspective !== 'none' || !['visible',''].includes(owner.style.overflowX) || !['visible',''].includes(owner.style.overflowY)) return reject('RIGID_OWNER_NOT_DECORATIVE');
    const linear = [a,b,c,d,0,0], ownerLinearBounds = corners(linear, ownerSize.width, ownerSize.height), errors = [Math.abs(ownerLinearBounds.width-owner.rect.width),Math.abs(ownerLinearBounds.height-owner.rect.height)];
    if (Math.max(...errors) > 0.08) return reject('OWNER_BORDER_BOX_BCR_MISMATCH');
    let dimensionProbe;
    try {
      dimensionProbe = probe.cloneNode(true); dimensionProbe.textContent = '';
      for (const [key,value] of Object.entries({position:'fixed',left:'-1000000px',top:'-1000000px',right:'auto',bottom:'auto',margin:'0',transform:'none','transform-origin':'0 0',visibility:'hidden','pointer-events':'none','background-image':'none'})) dimensionProbe.style.setProperty(key,value,'important');
      document.body.append(dimensionProbe);
      const size = rect(dimensionProbe.getBoundingClientRect()), cssSize = borderBox(css(getComputedStyle(dimensionProbe)));
      if (!cssSize || !(size.width > 0 && size.height > 0) || Math.abs(size.width-cssSize.width) > 0.08 || Math.abs(size.height-cssSize.height) > 0.08) return reject('PSEUDO_LOCAL_SIZE_MISMATCH');
      const layoutLinearBounds = corners(linear,size.width,size.height);
      errors.push(Math.abs(layoutLinearBounds.width-measuredLayoutRect.width),Math.abs(layoutLinearBounds.height-measuredLayoutRect.height));
      if (Math.max(...errors) > 0.08) return reject('PSEUDO_LAYOUT_BCR_MISMATCH');
      const worldX = owner.rect.x-ownerLinearBounds.x, worldY = owner.rect.y-ownerLinearBounds.y;
      const ownerX = worldX-ownerOrigin[0]+a*ownerOrigin[0]+c*ownerOrigin[1]-e, ownerY = worldY-ownerOrigin[1]+b*ownerOrigin[0]+d*ownerOrigin[1]-f;
      const anchorX = measuredLayoutRect.x-layoutLinearBounds.x-worldX, anchorY = measuredLayoutRect.y-layoutLinearBounds.y-worldY;
      const localX = (d*anchorX-c*anchorY)/determinant, localY = (-b*anchorX+a*anchorY)/determinant;
      const left = px(style.left), top = px(style.top), borderLeft = px(owner.style.borderLeftWidth) ?? 0, borderTop = px(owner.style.borderTopWidth) ?? 0;
      if (probe.offsetParent !== element || left === null || top === null) return reject('PSEUDO_CONTAINING_BLOCK_NOT_PROVEN');
      errors.push(Math.abs(localX-(borderLeft+left+(px(style.marginLeft)??0)-element.scrollLeft)),Math.abs(localY-(borderTop+top+(px(style.marginTop)??0)-element.scrollTop)));
      if (Math.max(...errors) > 0.08) return reject('PSEUDO_LOCAL_OFFSET_MISMATCH');
      const [pa,pb,pc,pd,pe,pf] = ownMatrix, ownX = ownOrigin[0]-pa*ownOrigin[0]-pc*ownOrigin[1]+pe, ownY = ownOrigin[1]-pb*ownOrigin[0]-pd*ownOrigin[1]+pf;
      const layoutRect = { x: ownerX+localX, y: ownerY+localY, width:size.width, height:size.height };
      const effective = [a*pa+c*pb,b*pa+d*pb,a*pc+c*pd,b*pc+d*pd,worldX+a*(localX+ownX)+c*(localY+ownY)-layoutRect.x,worldY+b*(localX+ownX)+d*(localY+ownY)-layoutRect.y];
      const resultBounds = corners(effective,size.width,size.height); resultBounds.x += layoutRect.x; resultBounds.y += layoutRect.y;
      errors.push(...['x','y','width','height'].map(key => Math.abs(resultBounds[key]-bounds[key])));
      if (Math.max(...errors) > 0.08) return reject('COMPOSED_PSEUDO_BCR_MISMATCH');
      return { accepted:true,layoutRect,transform:`matrix(${effective.map(value=>Math.abs(value)<1e-12?0:Number(value.toFixed(12))).join(', ')})`,transformOrigin:'0px 0px',evidence:{ownerRigidTransformIncludedInTransform:true,sourcePseudoTransform:style.transform,sourcePseudoTransformOrigin:style.transformOrigin,ownerLayoutRect:{x:ownerX,y:ownerY,...ownerSize},pseudoLocalLayoutRect:{x:localX,y:localY,width:size.width,height:size.height},measuredLayoutRect:{...measuredLayoutRect},effectiveMatrix:effective,crossValidation:{status:'PASS',method:'OWNER_CORNERS_OFFSCREEN_USED_SIZE_LOCAL_OFFSETS_AND_FINAL_BCR',maxError:Math.max(...errors),tolerance:0.08}} };
    } catch { return reject('RIGID_GEOMETRY_MEASUREMENT_FAILED'); }
    finally { dimensionProbe?.remove(); }
  }
  function readPseudo(element, owner, pseudo, clips,originDescriptor=null) {
    const computed = getComputedStyle(element, pseudo), style = css(computed), text = pseudoContent(computed.content, owner.id);
    if (text === null || style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return;
    const token = `p${sequence + 1}`, attribute = 'data-feedback-capture-probe', previous = element.getAttribute(attribute), probe = document.createElement('span'), suppression = document.createElement('style');
    if (window.__FEEDBACK_STYLE_NONCE__) suppression.nonce = window.__FEEDBACK_STYLE_NONCE__;
    suppression.textContent = `[${attribute}="${token}"]${pseudo}{content:none!important;display:none!important}`;
    probe.setAttribute(attribute, 'materialized'); probe.setAttribute('aria-hidden', 'true');
    for (const property of computed) if (!['content', 'animation', 'transition'].includes(property)) probe.style.setProperty(property, computed.getPropertyValue(property), 'important');
    probe.style.setProperty('animation', 'none', 'important'); probe.style.setProperty('transition', 'none', 'important'); probe.style.setProperty('pointer-events', 'none', 'important');
    probe.textContent = text;
    try {
      element.setAttribute(attribute, token); document.head.append(suppression);
      if (getComputedStyle(element, pseudo).display !== 'none') { issue(unsupported, 'PSEUDO_MEASUREMENT_CSP_BLOCKED', owner.id); return; }
      if (pseudo === '::before') element.insertBefore(probe, element.firstChild); else element.append(probe);
      const bounds = rect(probe.getBoundingClientRect());
      probe.style.setProperty('transform', 'none', 'important'); let layoutRect = rect(probe.getBoundingClientRect()), transform = style.transform, transformOrigin = style.transformOrigin;
      if (bounds.width < 0.01 || bounds.height < 0.01) return;
      let transformedAncestor = owner.ancestorTransforms || !translationOnly(owner.style.transform)||originDescriptor&&!translationOnly(originDescriptor.style.transform), rigid = null;
      if (transformedAncestor && !owner.ancestorTransforms && !originDescriptor && !translationOnly(owner.style.transform)) {
        rigid = rigidOwnerPseudoGeometry(element,owner,probe,style,bounds,layoutRect,text);
        if (rigid.accepted) { layoutRect=rigid.layoutRect;transform=rigid.transform;transformOrigin=rigid.transformOrigin;transformedAncestor=false; }
      }
      const node = addNode({ kind: 'pseudo', tag: 'pseudo', pseudo, originElementId: originDescriptor?null:owner.id,...(originDescriptor?{originDescriptor}:{}), content: style.content, text, rect: bounds, layoutRect, transform, transformOrigin, style, geometryEvidence: { method: 'MOCK_PSEUDO_MATERIALIZATION', originalPseudoSuppressed: true, exactVisual: false, ancestorTransforms: !!transformedAncestor,ownerTransform:owner.style.transform,ownerTranslationIncludedInMeasuredRects:owner.style.transform!=='none'&&translationOnly(owner.style.transform),wrapperTranslationIncludedInMeasuredRects:!!originDescriptor&&translationOnly(originDescriptor.style.transform),...(rigid?.accepted?rigid.evidence:rigid?{rigidOwnerReconstruction:{status:'REJECTED',reason:rigid.reason}}:{}) } }, owner, clips, owner.style);
      if (transformedAncestor) issue(unsupported, 'PSEUDO_ANCESTOR_TRANSFORM', node.id);
      if (style.clipPath !== 'none') issue(warnings, 'PSEUDO_CLIP_PATH_REQUIRES_NATIVE_VERIFICATION', node.id);
      issue(warnings, 'PSEUDO_MATERIALIZATION_REQUIRES_NATIVE_VERIFICATION', node.id);
      return node;
    } finally {
      probe.remove(); suppression.remove();
      if (previous === null) element.removeAttribute(attribute); else element.setAttribute(attribute, previous);
    }
  }
  function logicalLines(rawRects,ownerId) {
    const lines=[];
    for(const box of rawRects){let line=lines.find(value=>Math.abs(value.y-box.y)<.5&&Math.abs(value.height-box.height)<.5);if(!line){lines.push({...box});continue;}if(box.x>line.x+line.width+.5||line.x>box.x+box.width+.5)issue(unsupported,'TEXT_DISJOINT_SAME_BASELINE_FRAGMENTS',ownerId);const right=Math.max(line.x+line.width,box.x+box.width);line.x=Math.min(line.x,box.x);line.width=right-line.x;}
    return lines.sort((a,b)=>a.y-b.y||a.x-b.x);
  }
  function ellipsisProof(text,bounds,rawRects,lines,characters,style,contentRect,element,ownerId){
    if(style.textOverflow!=='ellipsis'||!(element.scrollWidth>element.clientWidth||bounds.x+bounds.width>contentRect.x+contentRect.width+.5))return null;
    const reject=code=>{issue(unsupported,code,ownerId);return null;};
    if(style.direction!=='ltr'||style.writingMode!=='horizontal-tb'||style.whiteSpace!=='nowrap'||lines.length!==1||style.textTransform!=='none'||/[\r\n\t]|\s{2}/u.test(text))return reject('ELLIPSIS_LAYOUT_UNSUPPORTED');
    if(text.length>5000||!Intl.Segmenter)return reject('ELLIPSIS_TEXT_SEGMENTATION_UNSUPPORTED');
    const availableWidth=contentRect.x+contentRect.width-bounds.x,canvas=document.createElement('canvas'),context=canvas.getContext('2d');if(!context)return reject('ELLIPSIS_CANVAS_UNAVAILABLE');
    context.font=`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;context.direction='ltr';context.fontKerning=style.fontKerning;
    if('letterSpacing'in context)context.letterSpacing=style.letterSpacing==='normal'?'0px':style.letterSpacing;else if(parseFloat(style.letterSpacing))return reject('ELLIPSIS_TRACKING_UNSUPPORTED');
    if('wordSpacing'in context)context.wordSpacing=style.wordSpacing==='normal'?'0px':style.wordSpacing;else if(parseFloat(style.wordSpacing))return reject('ELLIPSIS_WORD_SPACING_UNSUPPORTED');
    const ellipsisWidth=context.measureText('…').width;if(!(ellipsisWidth>0&&availableWidth>=ellipsisWidth))return reject('ELLIPSIS_BOX_TOO_NARROW');
    const boundaries=[{end:0,width:0}];let right=bounds.x;
    for(const segment of new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)){const end=segment.index+segment.segment.length;for(const unit of characters)if(unit.start>=segment.index&&unit.end<=end)for(const box of unit.rects)right=Math.max(right,box.x+box.width);boundaries.push({end,width:right-bounds.x});}
    const fitting=boundaries.filter(boundary=>boundary.width+ellipsisWidth<=availableWidth+.05),candidate=fitting.at(-1);if(!candidate||candidate.end>=text.length)return reject('ELLIPSIS_PREFIX_UNPROVEN');
    const fragmentWidths=rawRects.filter(box=>Math.abs(box.y-lines[0].y)<.5&&Math.abs(box.x-bounds.x)<.5&&box.width<bounds.width-.5).map(box=>box.width),browserPrefixWidth=fragmentWidths.length?Math.max(...fragmentWidths):null,browserPrefix=browserPrefixWidth===null?null:boundaries.filter(boundary=>boundary.width<=browserPrefixWidth+.25).at(-1);
    const canvasPrefixWidth=context.measureText(text.slice(0,candidate.end)).width,canvasDelta=Math.abs(canvasPrefixWidth-candidate.width),next=boundaries.find(boundary=>boundary.end>candidate.end);
    if(canvasDelta>1.1||browserPrefix&&browserPrefix.end!==candidate.end||next&&next.width+ellipsisWidth<=availableWidth-.05)return reject('ELLIPSIS_PREFIX_CROSSCHECK_FAILED');
    return{version:1,status:'EVIDENCED',direction:'LTR',singleLine:true,visibleText:text.slice(0,candidate.end)+'…',prefixEnd:candidate.end,prefixWidth:candidate.width,ellipsisWidth,availableWidth,contentRect:{...contentRect},canvasFont:context.font,canvasPrefixWidth,browserPrefixWidth,browserPrefixEnd:browserPrefix?.end??null,crossValidation:{status:'PASS',canvasPrefixDelta:canvasDelta,browserFragment:browserPrefix?'MATCHED':'NOT_EXPOSED'},visual:'NOT RUN'};
  }
  function textNode(source, owner, clips) {
    if (!source.nodeValue?.trim()) return;
    textCharacters += source.nodeValue.length; if (textCharacters > maxTextCharacters) fail('FEEDBACK_CAPTURE_TEXT_BUDGET');
    const range = document.createRange(); range.selectNodeContents(source); const bounds = rect(range.getBoundingClientRect());
    if (bounds.width < 0.01 || bounds.height < 0.01 || !visible(bounds, clips)) return;
    const rawRangeRects = [...range.getClientRects()].filter(box => box.width > 0 && box.height > 0).map(rect),lineRects=logicalLines(rawRangeRects,owner.id);
    const characters = []; let offset = 0;
    for (const character of source.nodeValue) {
      const end = offset + character.length; range.setStart(source, offset); range.setEnd(source, end);
      const characterRects = [...range.getClientRects()].filter(box => box.height > 0).map(rect), box = characterRects[0];
      const lineIndex = box ? lineRects.findIndex(line => box.y < line.y + line.height && box.y + box.height > line.y && Math.abs(box.y - line.y) < Math.max(1, line.height / 2)) : characters.at(-1)?.lineIndex ?? -1;
      characters.push({ start: offset, end, text: character, rects: characterRects, lineIndex }); offset = end;
    }
    const element = source.parentElement, elementRect = rect(element.getBoundingClientRect()), style = css(getComputedStyle(element));
    const contentRect = { x: elementRect.x + parseFloat(style.borderLeftWidth || 0) + parseFloat(style.paddingLeft || 0), y: elementRect.y + parseFloat(style.borderTopWidth || 0) + parseFloat(style.paddingTop || 0), width: Math.max(0, element.clientWidth - parseFloat(style.paddingLeft || 0) - parseFloat(style.paddingRight || 0)), height: Math.max(0, element.clientHeight - parseFloat(style.paddingTop || 0) - parseFloat(style.paddingBottom || 0)) };
    const ellipsisEvidence=ellipsisProof(source.nodeValue,bounds,rawRangeRects,lineRects,characters,style,contentRect,element,owner.id);
    addNode({ kind: 'text', tag: '#text', text: source.nodeValue, renderedText: style.whiteSpace.startsWith('pre') ? source.nodeValue : source.nodeValue.replace(/\s+/g, ' '), rect: bounds, style: { ...style, backgroundColor: 'rgba(0, 0, 0, 0)' }, textEvidence: { source: 'DOM_RANGE', rangeRect: bounds, rawRangeRects,lineRects, characters,ellipsisEvidence, elementRect, contentRect, lineHeight: style.lineHeight, fontStack: style.fontFamily, resolvedFont: null, resolvedFontStatus: 'NOT MEASURED', overflow: { x: style.overflowX, y: style.overflowY, textOverflow: style.textOverflow, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }, lineBox: { status: 'APPROXIMATED', reason: 'DOM_RANGE_IS_NOT_NATIVE_FIGMA_LINEBOX', declaredLineHeight: style.lineHeight } } }, owner, clips, owner.style);
  }
  function controlText(element, node) {
    if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) || element instanceof HTMLInputElement && ['checkbox', 'radio', 'file', 'password', 'hidden', 'button', 'submit', 'reset', 'image'].includes(element.type)) return null;
    const value = element.value, placeholder = element.placeholder, isPlaceholder = value.length === 0, renderedText = isPlaceholder ? placeholder : value;
    if (!renderedText) return null;
    textCharacters += renderedText.length; if (textCharacters > maxTextCharacters) fail('FEEDBACK_CAPTURE_TEXT_BUDGET');
    const style = isPlaceholder ? css(getComputedStyle(element, '::placeholder')) : { ...node.style };
    const base = node.style, contentRect = { x: node.rect.x + element.clientLeft + parseFloat(base.paddingLeft || 0), y: node.rect.y + element.clientTop + parseFloat(base.paddingTop || 0), width: Math.max(0, element.clientWidth - parseFloat(base.paddingLeft || 0) - parseFloat(base.paddingRight || 0)), height: Math.max(0, element.clientHeight - parseFloat(base.paddingTop || 0) - parseFloat(base.paddingBottom || 0)) };
    const probe = document.createElement('div'); probe.setAttribute('data-feedback-capture-probe', 'control-text'); probe.setAttribute('aria-hidden', 'true');
    for (const key of ['fontFamily','fontSize','fontWeight','fontStyle','fontStretch','fontFeatureSettings','fontVariationSettings','fontKerning','lineHeight','letterSpacing','wordSpacing','textAlign','textIndent','textTransform','direction','writingMode','wordBreak','overflowWrap']) probe.style[key] = style[key] || base[key];
    // Input line-box alignment belongs to the control, even when Chromium's
    // ::placeholder computed line-height reports its unsupported initial value.
    // Keep the untouched pseudo style above and label this probe derivation.
    probe.style.lineHeight = base.lineHeight;
    Object.assign(probe.style, { position: 'fixed', left: `${contentRect.x}px`, top: `${contentRect.y}px`, width: `${contentRect.width}px`, height: 'auto', display: 'block', margin: '0', padding: '0', border: '0', boxSizing: 'content-box', whiteSpace: element instanceof HTMLTextAreaElement ? 'pre-wrap' : 'pre', visibility: 'hidden', pointerEvents: 'none', overflow: 'visible', transform: 'none' });
    const text = document.createTextNode(renderedText); probe.append(text);
    try {
      document.body.append(probe); const range = document.createRange(); range.selectNodeContents(text); const rangeRect = rect(range.getBoundingClientRect()), lineRects = [...range.getClientRects()].filter(box => box.height > 0).map(rect), characters = []; let start = 0;
      for (const character of renderedText) { const end = start + character.length; range.setStart(text, start); range.setEnd(text, end); const rects = [...range.getClientRects()].filter(box => box.height > 0).map(rect), box = rects[0], lineIndex = box ? lineRects.findIndex(line => Math.abs(box.y-line.y) < Math.max(1,line.height/2)) : characters.at(-1)?.lineIndex ?? -1; characters.push({ start, end, text: character, rects, lineIndex }); start = end; }
      return { value, placeholder, isPlaceholder, renderedText, style, contentRect, lineHeight: base.lineHeight, lineHeightEvidence: 'CONTROL_CONTENT_LINEBOX_FOR_PROBE', textEvidence: { source: 'MOCK_CONTROL_TEXT_MATERIALIZATION', rangeRect, lineRects, characters, elementRect: { ...node.rect }, contentRect, lineHeight: base.lineHeight, fontStack: style.fontFamily || base.fontFamily, resolvedFont: null, resolvedFontStatus: 'NOT MEASURED', lineBox: { status: 'APPROXIMATED', reason: 'CONTROL_TEXT_PROBE_AND_NATIVE_LINEBOX_REQUIRE_VISUAL_VERIFICATION' } } };
    } finally { probe.remove(); }
  }
  function read(element, parent, inheritedClips, ancestorTransforms = false) {
    if (!(element instanceof Element) || element.matches(`script,style,link,meta,noscript,${privateSelector}`)) return null;
    const computed = getComputedStyle(element), style = css(computed), bounds = rect(element.getBoundingClientRect());
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return null;
    if (bounds.width < 0.01 || bounds.height < 0.01) {
      // React portals commonly use a zero-height root with fixed descendants.
      // Such an unpainted box is not a clipping/visibility boundary by itself.
      // Do not emit zero-size native geometry or silently erase its contents.
      if (!parent) fail('FEEDBACK_CAPTURE_ROOT_ZERO_AREA_UNSUPPORTED');
      const hasClip = /^(hidden|clip|auto|scroll)$/.test(style.overflowX) || /^(hidden|clip|auto|scroll)$/.test(style.overflowY) || style.clipPath !== 'none';
      const meaningful = Number(style.opacity) !== 1 || style.transform !== 'none' || style.filter !== 'none' || style.backdropFilter && style.backdropFilter !== 'none' || style.mixBlendMode !== 'normal' || style.boxShadow !== 'none' || hasClip || isContext(style,parent.style) || !['rgba(0, 0, 0, 0)','transparent'].includes(style.backgroundColor);
      const wrapperWarningIndex=warnings.length;
      issue(warnings,meaningful?'ZERO_SIZE_WRAPPER_EFFECTS_NOT_REPRODUCED':'ZERO_SIZE_WRAPPER_PASSTHROUGH',parent.id,'Visible descendants use the nearest non-zero DOM ancestor.',{wrapper:{tag:element.localName,selectorHint:element.id?`#${element.id}`:element.localName,rect:bounds,...(meaningful?{style}:{} )}});
      const clipX=/^(hidden|clip|auto|scroll)$/.test(style.overflowX),clipY=/^(hidden|clip|auto|scroll)$/.test(style.overflowY),zeroOverflowClip=clipX&&element.clientWidth<.01||clipY&&element.clientHeight<.01;
      if(style.clipPath!=='none')issue(unsupported,'ZERO_SIZE_WRAPPER_CLIP_NOT_RECONSTRUCTED',parent.id);
      let generatedCount=0,materializedCount=0;
      const originDescriptor={tag:element.localName,id:element.id||null,className:element.getAttribute('class')||'',selectorHint:element.id?`#${element.id}`:element.localName,rect:{...bounds},style:{...style},nearestVisibleAncestorId:parent.id};
      for(const pseudo of ['::before','::after']){const generated=getComputedStyle(element,pseudo);if(!['none','normal',''].includes(generated.content)&&generated.display!=='none'&&Number(generated.opacity)!==0){generatedCount++;const materialized=!zeroOverflowClip&&style.clipPath==='none'?readPseudo(element,parent,pseudo,inheritedClips,originDescriptor):null;if(materialized){materializedCount++;issue(warnings,'ZERO_SIZE_WRAPPER_PSEUDO_MATERIALIZED',materialized.id,'Positive geometry was measured on the actual generated box; no zero-size native wrapper is fabricated.');}else issue(unsupported,'ZERO_SIZE_WRAPPER_PSEUDO_NOT_CAPTURED',parent.id,'No supported positive measured pseudo geometry.');}}
      if(generatedCount>0&&generatedCount===materializedCount&&translationOnly(style.transform)&&Number(style.opacity)===1&&!hasClip&&style.filter==='none'&&style.backdropFilter==='none'&&style.boxShadow==='none'&&style.mixBlendMode==='normal'&&style.zIndex==='auto'&&['rgba(0, 0, 0, 0)','transparent'].includes(style.backgroundColor)&&['Top','Right','Bottom','Left'].every(side=>!(parseFloat(style[`border${side}Width`])>0))&&!element.children.length&&!element.textContent.trim()){warnings[wrapperWarningIndex].code='ZERO_SIZE_WRAPPER_TRANSLATION_ABSORBED_IN_PSEUDOS';warnings[wrapperWarningIndex].detail='The wrapper only translates measured positive-area pseudoelements; its translation is already included in their captured rectangles.';}
      if(zeroOverflowClip||style.clipPath!=='none'){
        issue(warnings,'ZERO_AREA_OVERFLOW_CLIP_APPLIED',parent.id,'Clipped normal-flow measurement content is omitted; positioned descendants are retained only when their containing block escapes this overflow clip.');
        const escaping=child=>{
          if(!(child instanceof Element)||child.matches(`script,style,link,meta,noscript,${privateSelector}`))return;
          const childStyle=getComputedStyle(child);if(childStyle.display==='none'||childStyle.visibility==='hidden'||Number(childStyle.opacity)===0)return;
          if(['fixed','absolute'].includes(childStyle.position)&&style.clipPath==='none'){
            let anchorInside=child.offsetParent&&element.contains(child.offsetParent);
            if(childStyle.position==='fixed')for(let ancestor=child.parentElement;ancestor&&element.contains(ancestor);ancestor=ancestor.parentElement){const value=getComputedStyle(ancestor);if(value.transform!=='none'||value.filter!=='none'||value.perspective!=='none'||/(?:paint|layout|strict|content)/.test(value.contain)){anchorInside=true;break;}}
            if(!anchorInside){read(child,parent,inheritedClips,ancestorTransforms||!translationOnly(style.transform));return;}
          }
          for(const descendant of child.children)escaping(descendant);
        };
        for(const child of element.children)escaping(child);
      }else{
        const passClips=inheritedClips.slice();
        if(clipX||clipY)passClips.push({ownerId:parent.id,rect:{x:clipX?bounds.x+element.clientLeft:-10000000,y:clipY?bounds.y+element.clientTop:-10000000,width:clipX?element.clientWidth:20000000,height:clipY?element.clientHeight:20000000},axes:{x:clipX,y:clipY},kind:'ZERO_AREA_WRAPPER_NONCOLLAPSED_AXIS_CLIP'});
        for(const child of [...element.childNodes])if(child.nodeType===Node.TEXT_NODE)textNode(child,parent,passClips);else if(child instanceof Element)read(child,parent,passClips,ancestorTransforms||!translationOnly(style.transform));
      }
      return null;
    }
    if (!visible(bounds,inheritedClips)) return null;
    const node = addNode({ tag: element.localName, rect: bounds, style, attrs: attrs(element), ancestorTransforms, selectorHint: element.id ? `#${element.id}` : element.localName, scroll: { left: element.scrollLeft, top: element.scrollTop, width: element.scrollWidth, height: element.scrollHeight } }, parent, inheritedClips, parent?.style);
    elementIds.set(element, node.id);
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) node.controlText = controlText(element, node);
    if (style.transform !== 'none') issue(warnings, 'ELEMENT_TRANSFORM_REQUIRES_NATIVE_VERIFICATION', node.id);
    if (style.filter !== 'none' || style.backdropFilter && style.backdropFilter !== 'none') issue(unsupported, 'CSS_FILTER', node.id);
    if (style.mixBlendMode !== 'normal') issue(unsupported, 'CSS_BLEND_MODE', node.id);
    if (style.clipPath !== 'none') issue(warnings, 'CSS_CLIP_PATH_REQUIRES_NATIVE_VERIFICATION', node.id);
    if (style.backgroundImage !== 'none') issue(warnings, 'CSS_BACKGROUND_IMAGE_REQUIRES_NATIVE_VERIFICATION', node.id);
    if (element.localName === 'svg') { node.kind = 'svg'; node.svg = svgMarkup(element, node); return node; }
    if (element.localName === 'img') {
      node.kind = 'image'; const source = element.currentSrc || element.getAttribute('src') || '';
      if (/^data:image\/(?:png|jpeg|webp|gif|svg\+xml)[;,]/i.test(source) && source.length <= 10000000) node.dataUrl = source;
      else issue(unsupported, 'IMAGE_NOT_EMBEDDED_SYNTHETIC_DATA', node.id);
      if (!element.complete || !element.naturalWidth) issue(unsupported, 'IMAGE_NOT_LOADED', node.id);
      return node;
    }
    if (['canvas', 'iframe', 'video', 'audio'].includes(element.localName)) { issue(unsupported, 'UNSUPPORTED_SURFACE', node.id, '', { tag: element.localName }); return node; }
    const childClips = inheritedClips.slice();
    const axes = { x: /^(hidden|clip|auto|scroll)$/.test(style.overflowX), y: /^(hidden|clip|auto|scroll)$/.test(style.overflowY) };
    if (axes.x || axes.y) {
      const client = { x: bounds.x + element.clientLeft, y: bounds.y + element.clientTop, width: element.clientWidth, height: element.clientHeight };
      const clipRect = { x: axes.x ? client.x : -10000000, y: axes.y ? client.y : -10000000, width: axes.x ? client.width : 20000000, height: axes.y ? client.height : 20000000 };
      childClips.push({ ownerId: node.id, rect: clipRect, axes, borderRadii: ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'].map(key => style[key]), kind: 'CSS_OVERFLOW_CLIENT_BOX' });
    }
    readPseudo(element, node, '::before', childClips);
    for (const child of [...element.childNodes]) if (child.nodeType === Node.TEXT_NODE) textNode(child, node, childClips); else if (child instanceof Element) read(child, node, childClips, ancestorTransforms || !translationOnly(style.transform));
    readPseudo(element, node, '::after', childClips);
    return node;
  }
  const viewport = { width: innerWidth, height: innerHeight, dpr: devicePixelRatio, scrollX, scrollY };
  const rootNode = read(root, null, [{ ownerId: 'viewport', rect: { x: 0, y: 0, width: innerWidth, height: innerHeight }, axes: { x: true, y: true }, kind: 'VIEWPORT' }]);
  if (!rootNode) fail('FEEDBACK_CAPTURE_ROOT_NOT_VISIBLE');
  // Positioned z:auto elements paint atomically with their in-flow content,
  // without becoming real opacity/stacking contexts. Their positioned and
  // true-context descendants still participate in the nearest real context.
  // A root-wide phase sort would paint an opaque relative card after its own
  // static labels. Keep these paint groups distinct from stackingContextId.
  const byId = new Map(nodes.map(node => [node.id, node]));
  const autoGroups = new Set(nodes.filter(node=>node.kind!=='text'&&!node.establishesStackingContext&&node.style.position!=='static'&&node.style.zIndex==='auto').map(node=>node.id));
  const inlineGroups = new Set(nodes.filter(node=>node.kind!=='text'&&!node.establishesStackingContext&&!autoGroups.has(node.id)&&/^inline(?:-block|-flex|-grid|-table)?$/.test(node.style.display)).map(node=>node.id));
  const paintGroups = new Set([...autoGroups,...inlineGroups]);
  const contexts = new Map(nodes.filter(node=>node.establishesStackingContext||paintGroups.has(node.id)).map(node=>[node.id,[]]));
  for(const node of nodes){
    node.paintGroupType=node.establishesStackingContext?'REAL_STACKING_CONTEXT':autoGroups.has(node.id)?'POSITIONED_AUTO_GROUP':inlineGroups.has(node.id)?'INLINE_LEVEL_GROUP':'IN_FLOW';
    let container=node.stackingContextId;
    if(!node.establishesStackingContext&&!autoGroups.has(node.id)){
      let ancestor=byId.get(node.parentId);
      while(ancestor&&!ancestor.establishesStackingContext){if(paintGroups.has(ancestor.id)){container=ancestor.id;break;}ancestor=byId.get(ancestor.parentId);}
    }
    node.paintParentId=node.id===rootNode.id?null:container;
    node.paintGroupId=node.establishesStackingContext||paintGroups.has(node.id)?node.id:container;
    if(node.paintParentId)contexts.get(node.paintParentId)?.push(node);
  }
  const phase = node => { const z=Number.parseInt(node.style.zIndex,10)||0;return node.establishesStackingContext?z<0?1:z>0?6:5:autoGroups.has(node.id)?5:node.kind==='text'||node.kind==='svg'||/inline/.test(node.style.display)?4:node.style.float&&node.style.float!=='none'?3:2; };
  const paintOrder = [];
  function paint(context) {
    paintOrder.push(context.id);
    for (const node of (contexts.get(context.id) ?? []).sort((a, b) => phase(a) - phase(b) || ((phase(a) === 1 || phase(a) === 6) ? (parseInt(a.style.zIndex, 10) || 0) - (parseInt(b.style.zIndex, 10) || 0) : 0) || a.domOrder - b.domOrder)) {
      if (node.establishesStackingContext||paintGroups.has(node.id)) paint(node); else paintOrder.push(node.id);
    }
  }
  paint(rootNode);
  if(paintOrder.length!==nodes.length||new Set(paintOrder).size!==nodes.length)fail('FEEDBACK_CAPTURE_PAINT_GRAPH_INVALID');
  for (const [index, nodeId] of paintOrder.entries()) byId.get(nodeId).paintIndex = index;
  const ancestorOf = (ancestor, node) => { let current = node; while (current?.parentId) { if (current.parentId === ancestor.id) return true; current = byId.get(current.parentId); } return false; };
  const opaque = color => /^rgb\(/i.test(color) || /^rgba\([^)]*,\s*1(?:\.0*)?\)$/i.test(color);
  const occluders = nodes.filter(node => ['sticky', 'fixed'].includes(node.style.position) && Number(node.style.opacity) === 1 && opaque(node.style.backgroundColor));
  for (const node of nodes) for (const occluder of occluders) if (occluder.paintIndex > node.paintIndex && !ancestorOf(node, occluder) && !ancestorOf(occluder, node)) {
    const overlap = intersect(node.visibleRect, occluder.visibleRect);
    if (overlap) node.occludedBy.push({ ownerId: occluder.id, rect: overlap, kind: 'OPAQUE_STICKY_OR_FIXED_PAINT' });
  }
  issue(warnings, 'PAINT_ORDER_REQUIRES_NATIVE_VISUAL_VERIFICATION', rootNode.id, 'Bounded real stacking contexts, positioned-auto and inline-level paint groups; browser compositing is not proved by schema/readback.');
  return { schemaVersion: 'feedback-fidelity-capture/1', id, name, viewport, rootId: rootNode.id, nodes, paintOrder, paintOrderEvidence: { method: 'BOUNDED_CSS_STACKING_AND_PAINT_GROUP_MODEL', version:3, nativeVerified: false }, warnings, unsupported, privacy: { mockOnly: true, authenticatedCapture: false, credentialsRead: false, origin: location.protocol === 'file:' ? 'LOCAL_FILE' : 'LOOPBACK', externalResourceObserved: false, sourceValues: 'LOCAL_SYNTHETIC_ONLY' }, verification: { dom: 'OBSERVED', figma: 'NOT RUN', visual: 'NOT RUN' } };
}

export function intersectFeedbackRects(a, b) {
  if (!a || !b || ![a, b].every(value => ['x', 'y', 'width', 'height'].every(key => Number.isFinite(value[key])))) return null;
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y), right = Math.min(a.x + a.width, b.x + b.width), bottom = Math.min(a.y + a.height, b.y + b.height);
  return right > x && bottom > y ? { x, y, width: right - x, height: bottom - y } : null;
}

export function buildFeedbackBorderSegments(node) {
  if (!node?.rect || !node.style) throw new TypeError('Expected captured node with rect and computed style');
  const { rect, style } = node, radii = ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'].map(key => style[key]);
  const segments = [];
  for (const side of ['top', 'right', 'bottom', 'left']) {
    const property = side[0].toUpperCase() + side.slice(1), width = Number.parseFloat(style[`border${property}Width`]), borderStyle = style[`border${property}Style`], color = style[`border${property}Color`];
    if (!(width > 0) || ['none', 'hidden', undefined].includes(borderStyle)) continue;
    const bounds = side === 'top' ? { x: rect.x, y: rect.y, width: rect.width, height: width } : side === 'right' ? { x: rect.x + rect.width - width, y: rect.y, width, height: rect.height } : side === 'bottom' ? { x: rect.x, y: rect.y + rect.height - width, width: rect.width, height: width } : { x: rect.x, y: rect.y, width, height: rect.height };
    segments.push({ side, width, style: borderStyle, color, rect: bounds, cornerRadii: [...radii], geometry: 'UNTRANSFORMED_CSS_BORDER_STRIP', visual: 'NOT RUN' });
  }
  return segments;
}

export function normalizeFeedbackPaintOrder(nodes) {
  if (!Array.isArray(nodes) || nodes.some(node => !node || typeof node.id !== 'string' || !Number.isInteger(node.paintIndex)) || new Set(nodes.map(node => node.id)).size !== nodes.length || new Set(nodes.map(node => node.paintIndex)).size !== nodes.length) throw new TypeError('Expected unique captured nodes with paintIndex');
  return [...nodes].sort((a, b) => a.paintIndex - b.paintIndex).map(node => node.id);
}
