/** Public Plugin API importer for feedback-fidelity-capture/1 only.
 * Self-contained: callers may bundle importFeedbackCapture.toString().
 * It creates a new operation-owned frame and never deletes or repairs content.
 * Native readback is structural evidence, never a pixel-fidelity assertion.
 */
export async function importFeedbackCapture(figma, capture, options = {}) {
  const fail = code => { throw new Error(code); };
  const ensure = (condition, code) => { if (!condition) fail(code); };
  const plain = value => value && typeof value === 'object' && !Array.isArray(value);
  const copy = value => JSON.parse(JSON.stringify(value));
  const safe = value => { if (typeof value === 'symbol') return 'FIGMA_MIXED'; if (Array.isArray(value)) return value.map(safe); if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, safe(entry)])); return value; };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function sha256(text) {
    const bytes = [];
    for (const character of text) { const code = character.codePointAt(0); if (code < 128) bytes.push(code); else if (code < 2048) bytes.push(192 | code >> 6, 128 | code & 63); else if (code < 65536) bytes.push(224 | code >> 12, 128 | code >> 6 & 63, 128 | code & 63); else bytes.push(240 | code >> 18, 128 | code >> 12 & 63, 128 | code >> 6 & 63, 128 | code & 63); }
    const bitLength = bytes.length * 8; bytes.push(128); while (bytes.length % 64 !== 56) bytes.push(0);
    for (let index = 7; index >= 0; index--) bytes.push(index >= 4 ? 0 : Math.floor(bitLength / 2 ** (index * 8)) & 255);
    const constants = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    const state = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19], rotate = (word, count) => word >>> count | word << 32 - count;
    for (let begin = 0; begin < bytes.length; begin += 64) {
      const words = new Array(64);
      for (let index = 0; index < 16; index++) words[index] = (bytes[begin + index * 4] << 24 | bytes[begin + index * 4 + 1] << 16 | bytes[begin + index * 4 + 2] << 8 | bytes[begin + index * 4 + 3]) >>> 0;
      for (let index = 16; index < 64; index++) { const a = words[index - 15], b = words[index - 2]; words[index] = (words[index - 16] + (rotate(a, 7) ^ rotate(a, 18) ^ a >>> 3) + words[index - 7] + (rotate(b, 17) ^ rotate(b, 19) ^ b >>> 10)) >>> 0; }
      let [a,b,c,d,e,f,g,h] = state;
      for (let index = 0; index < 64; index++) { const first = (h + (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) + (e & f ^ ~e & g) + constants[index] + words[index]) >>> 0, second = ((rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) + (a & b ^ a & c ^ b & c)) >>> 0; h=g;g=f;f=e;e=(d+first)>>>0;d=c;c=b;b=a;a=(first+second)>>>0; }
      for (const [index, word] of [a,b,c,d,e,f,g,h].entries()) state[index] = (state[index] + word) >>> 0;
    }
    return state.map(word => word.toString(16).padStart(8, '0')).join('');
  }
  const { targetPageId, operationKey, specHash, mode = 'preflight', batchSize = 200, fontMapping = {}, mapOffset = 0, mapLimit = 200,libraryRefs=null,scenePosition=null } = options;
  ensure(typeof targetPageId === 'string' && targetPageId && typeof operationKey === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(operationKey), 'FEEDBACK_NATIVE_SCOPE_INVALID');
  ensure(['preflight', 'apply', 'audit', 'export'].includes(mode) && Number.isInteger(batchSize) && batchSize > 0 && batchSize <= 200 && Number.isInteger(mapOffset) && mapOffset >= 0 && Number.isInteger(mapLimit) && mapLimit >= 0 && mapLimit <= 2000, 'FEEDBACK_NATIVE_OPTIONS_INVALID');
  ensure(scenePosition===null||plain(scenePosition)&&Object.keys(scenePosition).length===2&&['x','y'].every(key=>Number.isFinite(scenePosition[key])&&Math.abs(scenePosition[key])<=100000),'FEEDBACK_NATIVE_SCENE_POSITION_INVALID');
  const requestedPosition=scenePosition===null?null:{x:scenePosition.x,y:scenePosition.y};
  ensure(libraryRefs===null||plain(libraryRefs),'FEEDBACK_NATIVE_LIBRARY_REFS_INVALID');
  const libraryMapHash=libraryRefs===null?null:sha256(JSON.stringify(libraryRefs));
  ensure(plain(capture) && capture.schemaVersion === 'feedback-fidelity-capture/1' && capture.privacy?.mockOnly === true && capture.privacy.authenticatedCapture === false && capture.privacy.credentialsRead === false, 'FEEDBACK_NATIVE_SYNTHETIC_ONLY');
  ensure(typeof specHash === 'string' && /^[a-f0-9]{64}$/.test(specHash) && sha256(JSON.stringify(capture)) === specHash, 'FEEDBACK_NATIVE_SPEC_HASH_MISMATCH');
  ensure(Array.isArray(capture.nodes) && capture.nodes.length > 0 && capture.nodes.length <= 20000 && Array.isArray(capture.paintOrder) && capture.paintOrder.length === capture.nodes.length && capture.viewport?.width > 0 && capture.viewport.width <= 10000 && capture.viewport.height > 0 && capture.viewport.height <= 10000 && plain(fontMapping), 'FEEDBACK_NATIVE_CAPTURE_INVALID');
  const sources = new Map(capture.nodes.map(node => [node.id, node]));
  ensure(sources.size === capture.nodes.length && new Set(capture.paintOrder).size === sources.size && capture.paintOrder.every(id => sources.has(id)) && sources.get(capture.rootId)?.parentId === null, 'FEEDBACK_NATIVE_SOURCE_GRAPH_INVALID');
  for (const source of capture.nodes) {
    ensure(typeof source.id === 'string' && source.id.length <= 200 && plain(source.style) && plain(source.rect) && ['x','y','width','height'].every(key => Number.isFinite(source.rect[key])) && source.rect.width > 0 && source.rect.height > 0 && (!source.parentId || sources.has(source.parentId)) && (!source.stackingContextId || sources.has(source.stackingContextId)), 'FEEDBACK_NATIVE_SOURCE_INVALID');
    const seen = new Set([source.id]); let parent = source;
    while (parent.parentId) { ensure(!seen.has(parent.parentId), 'FEEDBACK_NATIVE_SOURCE_CYCLE'); seen.add(parent.parentId); parent = sources.get(parent.parentId); }
    if (source.kind === 'svg') ensure(source.svgEvidence?.selfContained === true && typeof source.svg === 'string' && source.svg.length <= 2000000 && !/<(?:script|foreignObject)\b|\son[a-z]+\s*=/i.test(source.svg) && !/(?:href|xlink:href)\s*=\s*["'](?!#|data:image\/(?:png|jpeg|webp|gif);base64,)/i.test(source.svg) && !/url\(\s*["']?(?!#)[a-z]+:/i.test(source.svg), 'FEEDBACK_NATIVE_UNSAFE_SVG');
    const ellipsis=source.textEvidence?.ellipsisEvidence;
    if(ellipsis?.status==='EVIDENCED')ensure(ellipsis.version===1&&ellipsis.direction==='LTR'&&ellipsis.singleLine===true&&ellipsis.crossValidation?.status==='PASS'&&typeof source.text==='string'&&Number.isInteger(ellipsis.prefixEnd)&&ellipsis.prefixEnd>=0&&ellipsis.prefixEnd<source.text.length&&ellipsis.visibleText===source.text.slice(0,ellipsis.prefixEnd)+'…'&&Number.isFinite(ellipsis.availableWidth)&&ellipsis.availableWidth>0&&Number.isFinite(ellipsis.prefixWidth)&&ellipsis.prefixWidth>=0&&Number.isFinite(ellipsis.ellipsisWidth)&&ellipsis.ellipsisWidth>0&&ellipsis.prefixWidth+ellipsis.ellipsisWidth<=ellipsis.availableWidth+1.1,'FEEDBACK_NATIVE_ELLIPSIS_EVIDENCE_INVALID');
    if(source.controlText?.renderedText){
      const control=source.controlText,content=control.contentRect,evidence=control.textEvidence,validRect=rect=>plain(rect)&&['x','y','width','height'].every(key=>Number.isFinite(rect[key]))&&rect.width>0&&rect.height>0;
      // clientWidth/clientHeight are integer CSSOM values while DOMRects keep
      // subpixel edges; validate their half-pixel rounding without changing either.
      ensure(['input','textarea'].includes(source.tag)&&typeof control.renderedText==='string'&&validRect(content)&&content.x>=source.rect.x-.01&&content.y>=source.rect.y-.01&&content.x+content.width<=source.rect.x+source.rect.width+.5&&content.y+content.height<=source.rect.y+source.rect.height+.5&&evidence?.source==='MOCK_CONTROL_TEXT_MATERIALIZATION'&&validRect(evidence.contentRect)&&['x','y','width','height'].every(key=>Math.abs(content[key]-evidence.contentRect[key])<=.01)&&validRect(evidence.rangeRect)&&Array.isArray(evidence.lineRects)&&evidence.lineRects.length>0&&evidence.lineRects.every(validRect)&&plain(source.scroll)&&Number.isFinite(source.scroll.left)&&Number.isFinite(source.scroll.top),'FEEDBACK_NATIVE_CONTROL_TEXT_EVIDENCE_INVALID');
    }
  }
  const page = await figma.getNodeByIdAsync(targetPageId);
  ensure(page?.type === 'PAGE' && figma.root.children.some(candidate => candidate.id === page.id), 'FEEDBACK_NATIVE_PAGE_SCOPE');
  await figma.setCurrentPageAsync(page);
  const guard = () => ensure(figma.currentPage?.id === targetPageId && page.type === 'PAGE', 'FEEDBACK_NATIVE_PAGE_CHANGED');
  guard();
  const prefix = `feedback_fidelity_native_v1__${operationKey}__`, createdNodeIds = [], mutatedNodeIds = new Set(), batchMappings = {};
  const warnings = [...(capture.warnings ?? []).map(issue => ({ ...issue, source: 'CAPTURE' })), ...(capture.unsupported ?? []).map(issue => ({ ...issue, source: 'CAPTURE_UNSUPPORTED' }))];
  const warn = (code, sourceId, detail = '') => { if (!warnings.some(issue => issue.code === code && issue.sourceId === sourceId && issue.detail === detail)) warnings.push({ code, sourceId, detail }); };
  const paletteVariables=new Map(),paletteById=new Map(),paletteRgba=[],libraryComponents=new Map(),sourceLibraryComponents=new Map();let validatedLibraryModeId=null;
  const hexFor=value=>`#${['r','g','b'].map(key=>Math.round(value[key]*255).toString(16).padStart(2,'0')).join('').toUpperCase()}`;
  async function validateLibraryRefs(){
    if(libraryRefs===null)return;
    const refs=libraryRefs,op=refs.libraryOperationKey,planHash=refs.planHash,namespace=`Feedback Fidelity Library/${op}`;
    ensure(refs.schemaVersion==='feedback-fidelity-library-refs/2'&&typeof op==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(op)&&typeof planHash==='string'&&/^[a-f0-9]{64}$/.test(planHash)&&refs.targetPageId===targetPageId&&refs.namespace===namespace&&refs.complete===true&&typeof refs.collectionId==='string'&&typeof refs.rootNodeId==='string'&&plain(refs.palette)&&plain(refs.svgComponents)&&plain(refs.sourceSvgHashes)&&Object.keys(refs.palette).length<=256&&Object.keys(refs.svgComponents).length<=256&&Object.keys(refs.sourceSvgHashes).length<=64&&JSON.stringify(refs).length<=4000000,'FEEDBACK_NATIVE_LIBRARY_REFS_INVALID');
    const expectedOwner={operationKey:op,targetPageId,planHash,namespace},libPrefix=`feedback_fidelity_library_v2__${op}__`,canonical=value=>Array.isArray(value)?value.map(canonical):plain(value)?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value,equal=(a,b)=>same(canonical(a),canonical(b));
    ensure(equal(refs.owner,expectedOwner),'FEEDBACK_NATIVE_LIBRARY_OWNER_INVALID');
    ensure(!page.getPluginData(`${libPrefix}intent`),'FEEDBACK_NATIVE_LIBRARY_PENDING');
    let libLedger;
    try{const header=JSON.parse(page.getPluginData(`${libPrefix}header`));ensure(header.operationKey===op&&header.targetPageId===targetPageId&&header.planHash===planHash&&Number.isInteger(header.chunks)&&header.chunks>0&&header.chunks<=256,'FEEDBACK_NATIVE_LIBRARY_LEDGER_HEADER');let data='';for(let index=0;index<header.chunks;index++){const chunk=page.getPluginData(`${libPrefix}chunk_${index}`);ensure(chunk&&chunk.length<=16000,'FEEDBACK_NATIVE_LIBRARY_LEDGER_CHUNK');data+=chunk;}ensure(sha256(data)===header.hash,'FEEDBACK_NATIVE_LIBRARY_LEDGER_HASH');libLedger=JSON.parse(data);}catch(error){if(error.message?.startsWith('FEEDBACK_NATIVE_'))throw error;fail('FEEDBACK_NATIVE_LIBRARY_LEDGER_UNREADABLE');}
    ensure(libLedger.schemaVersion==='feedback-fidelity-library-ledger/2'&&libLedger.operationKey===op&&libLedger.targetPageId===targetPageId&&libLedger.planHash===planHash&&libLedger.complete===true&&libLedger.pending===false&&libLedger.cursor===libLedger.totalUnits&&libLedger.rootNodeId===refs.rootNodeId&&libLedger.collectionId===refs.collectionId&&equal(libLedger.palette,refs.palette)&&equal(libLedger.svgComponents,refs.svgComponents)&&Array.isArray(libLedger.entries),'FEEDBACK_NATIVE_LIBRARY_LEDGER_SCOPE');
    const known=new Set(libLedger.entries.map(entry=>entry.id)),onPage=node=>{let current=node,steps=0;while(current?.parent&&current.type!=='PAGE'&&steps++<2000)current=current.parent;return current?.id===targetPageId;},owned=node=>node&&known.has(node.id)&&onPage(node)&&node.getPluginData(`${libPrefix}operation`)===op&&node.getPluginData(`${libPrefix}plan`)===planHash;
    // Keep this readback contract identical to library.mjs snapshot(). Importing
    // a definition requires its complete saved geometry, paints and paths.
    function librarySnapshot(node) {
      const value = { type: node.type, parentId: node.parent?.id ?? null };
      for (const field of ['name', 'x', 'y', 'width', 'height', 'opacity', 'fills', 'strokes', 'strokeWeight', 'strokeAlign', 'relativeTransform', 'clipsContent', 'layoutMode', 'primaryAxisSizingMode', 'counterAxisSizingMode', 'primaryAxisAlignItems', 'counterAxisAlignItems', 'itemSpacing', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom']) if (field in node) value[field] = safe(node[field]);
      if ('children' in node) value.children = node.children.map(child => child.id);
      if (node.type === 'VECTOR' && 'vectorPaths' in node) value.vectorPaths = safe(node.vectorPaths);
      if (node.type === 'TEXT') for (const field of ['characters', 'fontName', 'fontSize', 'lineHeight', 'letterSpacing']) if (field in node) value[field] = safe(node[field]);
      return value;
    }
    ensure(libLedger.entries.length > 0 && libLedger.entries.length <= 100000 && known.size === libLedger.entries.length, 'FEEDBACK_NATIVE_LIBRARY_DEFINITION_ENTRIES');
    for (const entry of libLedger.entries) {
      ensure(plain(entry) && typeof entry.id === 'string', 'FEEDBACK_NATIVE_LIBRARY_DEFINITION_ENTRY');
      const node = await figma.getNodeByIdAsync(entry.id); guard();
      ensure(node && owned(node), 'FEEDBACK_NATIVE_LIBRARY_DEFINITION_SCOPE');
      ensure(plain(entry.snapshot) && same(entry.snapshot, librarySnapshot(node)), 'FEEDBACK_NATIVE_LIBRARY_DEFINITION_DRIFT');
    }
    const root=await figma.getNodeByIdAsync(refs.rootNodeId);guard();ensure(root?.type==='FRAME'&&root.parent?.id===targetPageId&&owned(root),'FEEDBACK_NATIVE_LIBRARY_ROOT_SCOPE');
    ensure(typeof figma.variables?.getVariableCollectionByIdAsync==='function'&&typeof figma.variables.getVariableByIdAsync==='function'&&typeof figma.variables.setBoundVariableForPaint==='function','FEEDBACK_NATIVE_LIBRARY_VARIABLE_API_UNSUPPORTED');
    const collection=await figma.variables.getVariableCollectionByIdAsync(refs.collectionId);guard();
    ensure(collection&&collection.name===`${namespace}/Colors`&&collection.defaultModeId===libLedger.modeId&&collection.modes?.length===1&&collection.modes[0].modeId===libLedger.modeId&&equal([...(collection.variableIds??[])].sort(),Object.values(refs.palette).sort()),'FEEDBACK_NATIVE_LIBRARY_COLLECTION_DRIFT');
    validatedLibraryModeId=libLedger.modeId;
    const variableIds=new Set();
    for(const[key,id]of Object.entries(refs.palette)){const match=/^(#[A-F0-9]{6})@(.+)$/.exec(key),alpha=Number(match?.[2]);ensure(match&&Number.isFinite(alpha)&&alpha>=0&&alpha<=1&&String(alpha)===match[2]&&typeof id==='string'&&!variableIds.has(id),'FEEDBACK_NATIVE_LIBRARY_PALETTE_INVALID');const hex=match[1];variableIds.add(id);const variable=await figma.variables.getVariableByIdAsync(id);guard();const value=variable?.valuesByMode?.[libLedger.modeId],expected={r:parseInt(hex.slice(1,3),16)/255,g:parseInt(hex.slice(3,5),16)/255,b:parseInt(hex.slice(5,7),16)/255,a:alpha};ensure(variable&&variable.name===`rgba/${hex.slice(1)}/a_${String(alpha).replaceAll('.', '_')}`&&variable.variableCollectionId===refs.collectionId&&variable.resolvedType==='COLOR'&&variable.scopes?.length===2&&['ALL_FILLS','STROKE_COLOR'].every(scope=>variable.scopes.includes(scope))&&plain(value)&&['r','g','b','a'].every(channel=>Number.isFinite(value[channel])&&Math.abs(value[channel]-expected[channel])<=.000001),'FEEDBACK_NATIVE_LIBRARY_VARIABLE_DRIFT');paletteVariables.set(key,variable);paletteById.set(id,variable);paletteRgba.push({key,hex,alpha,variable});}
    let totalDefinitionNodes=0;
    for(const[svgHash,reference]of Object.entries(refs.svgComponents)){ensure(/^[a-f0-9]{64}$/.test(svgHash)&&plain(reference)&&equal(reference.owner,expectedOwner)&&typeof reference.componentId==='string'&&Array.isArray(reference.descendantNodeIds)&&reference.descendantNodeIds.length<=100000&&reference.descendantNodeIds.includes(reference.sourceSvgNodeId)&&Number.isFinite(reference.width)&&reference.width>0&&Number.isFinite(reference.height)&&reference.height>0&&typeof reference.paintHash==='string'&&/^[a-f0-9]{64}$/.test(reference.paintHash),'FEEDBACK_NATIVE_LIBRARY_COMPONENT_REF');const component=await figma.getNodeByIdAsync(reference.componentId);guard();ensure(component?.type==='COMPONENT'&&component.parent?.id===root.id&&typeof component.createInstance==='function'&&owned(component)&&Math.abs(component.width-reference.width)<=.001&&Math.abs(component.height-reference.height)<=.001,'FEEDBACK_NATIVE_LIBRARY_COMPONENT_SCOPE');const descendants=[],pending=[...component.children];while(pending.length){const node=pending.pop();ensure(++totalDefinitionNodes<=100000&&owned(node),'FEEDBACK_NATIVE_LIBRARY_DEFINITION_SCOPE');descendants.push(node.id);if('children'in node)pending.push(...node.children);}ensure(equal(descendants.sort(),[...reference.descendantNodeIds].sort())&&new Set(reference.descendantNodeIds).size===reference.descendantNodeIds.length,'FEEDBACK_NATIVE_LIBRARY_COMPONENT_DESCENDANTS');libraryComponents.set(svgHash,{reference,component});}
    for(const[captureId,mapping]of Object.entries(refs.sourceSvgHashes)){ensure(typeof captureId==='string'&&captureId.length<=200&&plain(mapping)&&Object.keys(mapping).length<=20000,'FEEDBACK_NATIVE_LIBRARY_SOURCE_MAPPING');for(const[sourceId,svgHash]of Object.entries(mapping))ensure(typeof sourceId==='string'&&sourceId.length<=200&&libraryComponents.has(svgHash),'FEEDBACK_NATIVE_LIBRARY_SOURCE_MAPPING');}
    for(const[sourceId,svgHash]of Object.entries(refs.sourceSvgHashes[capture.id]??{})){const source=sources.get(sourceId);ensure(source?.kind==='svg','FEEDBACK_NATIVE_LIBRARY_SOURCE_MAPPING');const paint=Object.fromEntries(['color','fill','fillOpacity','fillRule','stroke','strokeWidth','strokeOpacity','strokeLinecap','strokeLinejoin','strokeDasharray','strokeDashoffset','opacity'].map(key=>[key,source.style[key]??null])),paintHash=sha256(JSON.stringify(paint)),expectedHash=sha256(JSON.stringify({markup:source.svg,width:source.rect.width,height:source.rect.height,paintHash})),matched=libraryComponents.get(svgHash);ensure(svgHash===expectedHash&&matched.reference.paintHash===paintHash&&Math.abs(matched.reference.width-source.rect.width)<=.001&&Math.abs(matched.reference.height-source.rect.height)<=.001,'FEEDBACK_NATIVE_LIBRARY_SOURCE_SVG_HASH');sourceLibraryComponents.set(sourceId,matched);}
  }
  await validateLibraryRefs();
  function svgAncestorRigidPlan(source){
    let linear=[1,0,0,1],ancestor=sources.get(source.parentId),hasTransform=false;const ancestorIds=[];
    while(ancestor){const transform=ancestor.style.transform;if(transform&&transform!=='none'){hasTransform=true;ancestorIds.push(ancestor.id);const match=/^matrix\(([^)]+)\)$/.exec(transform),values=match?.[1].split(',').map(Number);if(!values||values.length!==6||!values.every(Number.isFinite)){warn('SVG_ANCESTOR_TRANSFORM_UNSUPPORTED',source.id);return null;}const[a,b,c,d]=values;if(Math.abs(a*a+b*b-1)>.00001||Math.abs(c*c+d*d-1)>.00001||Math.abs(a*c+b*d)>.00001){warn('SVG_ANCESTOR_NON_RIGID_TRANSFORM_UNSUPPORTED',source.id);return null;}linear=[a*linear[0]+c*linear[1],b*linear[0]+d*linear[1],a*linear[2]+c*linear[3],b*linear[2]+d*linear[3]];}if(ancestor.style.perspective&&ancestor.style.perspective!=='none'){warn('SVG_ANCESTOR_PERSPECTIVE_UNSUPPORTED',source.id);return null;}ancestor=sources.get(ancestor.parentId);}
    const clean=value=>Math.abs(value)<1e-9?0:value;linear=linear.map(clean);
    if(!hasTransform||linear.every((value,index)=>Math.abs(value-[1,0,0,1][index])<.00001))return null;
    if(source.style.transform&&source.style.transform!=='none'){warn('SVG_ANCESTOR_AND_OWN_TRANSFORM_UNSUPPORTED',source.id,'Own SVG transform is already retained in markup and is not applied a second time.');return null;}
    const cssLength=value=>/^(?:\d*\.\d+|\d+)px$/.test(value??'')?parseFloat(value):null,width=cssLength(source.style.width),height=cssLength(source.style.height);
    if(!(width>0&&height>0)){warn('SVG_UNTRANSFORMED_CSS_SIZE_UNPROVEN',source.id);return null;}
    const[a,b,c,d]=linear,corners=[[0,0],[width,0],[0,height],[width,height]].map(([x,y])=>[a*x+c*y,b*x+d*y]),minX=Math.min(...corners.map(point=>point[0])),minY=Math.min(...corners.map(point=>point[1])),boxWidth=Math.max(...corners.map(point=>point[0]))-minX,boxHeight=Math.max(...corners.map(point=>point[1]))-minY;
    if(Math.abs(boxWidth-source.rect.width)>.25||Math.abs(boxHeight-source.rect.height)>.25){warn('SVG_ANCESTOR_BBOX_CROSSCHECK_FAILED',source.id);return null;}
    return{width,height,matrix:[[a,c,clean(-minX)],[b,d,clean(-minY)]],ancestorIds,sourceBBox:{...source.rect},method:'RIGID_ANCESTOR_LINEAR_MATRIX_NORMALIZED_TO_CAPTURED_BBOX'};
  }
  const svgRigidPlans=new Map(capture.nodes.filter(source=>source.kind==='svg').map(source=>[source.id,svgAncestorRigidPlan(source)]));
  const fontFor = source => fontMapping[source.id] ?? fontMapping[`${source.style.fontFamily}|${source.style.fontWeight}|${source.style.fontStyle}`] ?? fontMapping[source.style.fontFamily];
  const controlTextSource = source => ({ ...source, kind: 'text', text: source.controlText.renderedText, style: { ...source.style, ...source.controlText.style, lineHeight: source.controlText.lineHeight }, rect: source.controlText.textEvidence?.rangeRect ?? source.controlText.contentRect, positionOriginRect: source.rect, textEvidence: source.controlText.textEvidence });
  const fonts = new Map();
  const requireFont = font => { ensure(plain(font) && typeof font.family === 'string' && font.family && typeof font.style === 'string' && font.style, 'FEEDBACK_NATIVE_FONT_MAPPING_INVALID'); fonts.set(JSON.stringify({ family: font.family, style: font.style }), { family: font.family, style: font.style }); };
  for (const original of capture.nodes) if (original.kind === 'text' || original.kind === 'pseudo' && original.text || original.controlText?.renderedText) {
    const source = original.controlText?.renderedText ? controlTextSource(original) : original;
    const mapping = fontFor(source); ensure(mapping, 'FEEDBACK_NATIVE_FONT_MAPPING_MISSING'); requireFont(mapping);
    if (mapping.ranges !== undefined) { ensure(Array.isArray(mapping.ranges) && mapping.ranges.length <= 2000, 'FEEDBACK_NATIVE_FONT_RANGES_INVALID'); for (const range of mapping.ranges) { ensure(Number.isInteger(range.start) && Number.isInteger(range.end) && range.start >= 0 && range.end > range.start && range.end <= source.text.length, 'FEEDBACK_NATIVE_FONT_RANGES_INVALID'); requireFont(range.fontName); } }
    if (mapping.fallback === true) warn('FONT_FALLBACK_EXPLICIT', source.id, mapping.reason ?? 'Caller supplied fallback font; visual equivalence not verified.');
  }
  if (mode === 'preflight' || mode === 'apply') {
    const available = new Set((await figma.listAvailableFontsAsync()).map(font => JSON.stringify({ family: font.fontName.family, style: font.fontName.style })));
    for (const [key] of fonts) ensure(available.has(key), 'FEEDBACK_NATIVE_FONT_NOT_AVAILABLE');
  }
  const children = new Map(); for (const source of capture.nodes) { if (!children.has(source.parentId)) children.set(source.parentId, []); children.get(source.parentId).push(source); }
  const autoLabels = new Map(), skipped = new Set();
  for (const source of capture.nodes) {
    const row = children.get(source.id) ?? [], label = row[0], box = source.rect;
    if ((source.tag === 'button' || /(?:^|\s)ant-tag(?:\s|$)/.test(source.attrs?.class ?? '')) && row.length === 1 && label.kind === 'text' && label.textEvidence?.lineRects?.length === 1 && label.paintIndex === source.paintIndex + 1 && source.style.transform === 'none' && label.rect.x >= box.x && label.rect.y >= box.y && label.rect.x + label.rect.width <= box.x + box.width && label.rect.y + label.rect.height <= box.y + box.height && !label.establishesStackingContext) { autoLabels.set(source.id, label); skipped.add(label.id); }
  }
  const units = capture.paintOrder.filter(id => !skipped.has(id));
  const fontMapHash = sha256(JSON.stringify(fontMapping));
  let ledger = null, pendingIntent = null;
  try {
    const headerText = page.getPluginData(`${prefix}header`), intentText = page.getPluginData(`${prefix}intent`);
    if (intentText) pendingIntent = JSON.parse(intentText);
    if (headerText) {
      const header = JSON.parse(headerText); ensure(Number.isInteger(header.chunks) && header.chunks > 0 && header.chunks <= 256, 'FEEDBACK_NATIVE_LEDGER_INVALID');
      let data = ''; for (let index = 0; index < header.chunks; index++) { const chunk = page.getPluginData(`${prefix}chunk_${index}`); ensure(chunk && chunk.length <= 16000, 'FEEDBACK_NATIVE_LEDGER_CHUNK_MISSING'); data += chunk; }
      ensure(sha256(data) === header.hash, 'FEEDBACK_NATIVE_LEDGER_HASH'); ledger = JSON.parse(data);
      ensure(ledger.schemaVersion === 'feedback-fidelity-native-ledger/1' && ledger.operationKey === operationKey && ledger.targetPageId === targetPageId && ledger.specHash === specHash && ledger.fontMapHash === fontMapHash && ledger.totalUnits === units.length, 'FEEDBACK_NATIVE_LEDGER_SCOPE_MISMATCH');
      ensure((ledger.libraryMapHash??null)===libraryMapHash,'FEEDBACK_NATIVE_LIBRARY_MAP_MISMATCH');
      ensure(same(ledger.scenePosition??null,requestedPosition),'FEEDBACK_NATIVE_SCENE_POSITION_MISMATCH');
    }
  } catch (error) { if (error.message.startsWith('FEEDBACK_NATIVE_')) throw error; fail('FEEDBACK_NATIVE_LEDGER_UNREADABLE'); }
  if (pendingIntent) ensure(pendingIntent.operationKey === operationKey && pendingIntent.targetPageId === targetPageId && pendingIntent.specHash === specHash, 'FEEDBACK_NATIVE_INTENT_SCOPE_MISMATCH');
  const mappingSlice = (all = ledger?.nativeNodeIdByCaptureId ?? {}, offset = mapOffset, limit = mapLimit) => Object.fromEntries(Object.entries(all).slice(offset, offset + limit));
  const response = (status, extra = {}) => ({ status, targetPageId, operationKey, specHash, rootNodeId: ledger?.rootNodeId ?? null, cursor: ledger?.cursor ?? 0, totalUnits: units.length, complete: ledger?.complete ?? false, pending: !!pendingIntent || !!ledger?.pending, ownedNodeCount: ledger?.entries?.length ?? 0, createdNodeIds: [...createdNodeIds], mutatedNodeIds: [...mutatedNodeIds], nativeNodeIdByCaptureId: status === 'APPLIED_BATCH' || status === 'COMPLETE' ? { ...batchMappings } : mappingSlice(), mappingTotal: Object.keys(ledger?.nativeNodeIdByCaptureId ?? {}).length, nextMapOffset: mapOffset + mapLimit < Object.keys(ledger?.nativeNodeIdByCaptureId ?? {}).length ? mapOffset + mapLimit : null, warnings: ledger?.warnings ?? warnings, capabilities: { editableText: true, editableSVG: true, measuredSingleLabelAutoLayout: true, components: ledger?.libraryUsage?.instanceCount>0?'SOURCE_SVG_INSTANCES_PARTIAL':'NOT IMPLEMENTED', tokens: ledger?.libraryUsage?.boundPaintCount>0?'RGBA_PALETTE_BOUND':'NOT IMPLEMENTED',buttonTemplates:'NOT IMPLEMENTED',libraryRefsValidation:libraryRefs?'VERIFIED':'NOT REQUESTED',boundPaintCount:ledger?.libraryUsage?.boundPaintCount??0,instanceCount:ledger?.libraryUsage?.instanceCount??0,inheritedBoundPaintCount:ledger?.libraryUsage?.inheritedBoundPaintCount??0, prototypeInteractions: 'NOT IMPLEMENTED' }, verification: { nativeReadback: 'NOT RUN', sourceFidelity: 'NOT VERIFIED', visual: 'NOT RUN', present: 'NOT RUN' }, ...extra });
  if (mode === 'preflight') return response('PREFLIGHT', { fonts: [...fonts.values()], plannedAutoLayoutCount: autoLabels.size });
  function snapshot(node, entry) {
    const result = { type: node.type, parentId: node.parent?.id ?? null };
    const fields = ['name','x','y','width','height','opacity','visible','fills','strokes','strokeWeight','strokeTopWeight','strokeRightWeight','strokeBottomWeight','strokeLeftWeight','strokeAlign','topLeftRadius','topRightRadius','bottomRightRadius','bottomLeftRadius','effects','clipsContent','relativeTransform','layoutMode','primaryAxisSizingMode','counterAxisSizingMode','primaryAxisAlignItems','counterAxisAlignItems','itemSpacing','paddingLeft','paddingRight','paddingTop','paddingBottom'];
    if (node.type === 'TEXT') fields.push('characters','fontName','fontSize','lineHeight','letterSpacing','textAutoResize','textAlignHorizontal','textDecoration','hasMissingFont');
    for (const field of fields) if (field in node) result[field] = safe(node[field]);
    if ('children' in node) result.children = node.children.map(child => child.id);
    if(libraryRefs&&node.type==='VECTOR'&&'vectorPaths'in node)result.vectorPaths=safe(node.vectorPaths);
    if (node.type === 'TEXT' && entry?.fontRanges?.length) { ensure(typeof node.getRangeFontName === 'function', 'FEEDBACK_NATIVE_RANGE_READ_UNSUPPORTED'); result.fontRanges = entry.fontRanges.map(range => ({ start: range.start, end: range.end, fontName: safe(node.getRangeFontName(range.start, range.end)) })); }
    return result;
  }

  // Existing checkpoint evidence changes only through a checked synchronous append.
  // Async work must never turn unrelated edits into a new dirty-node baseline.
  const expectedNodes = new Map(), preparedImports = new Map();
  function checkExpected(ids = expectedNodes.keys()) {
    for (const id of ids) { const saved = expectedNodes.get(id); if (saved) ensure(same(saved.expected, snapshot(saved.node, saved.entry)), 'FEEDBACK_NATIVE_CONCURRENT_NODE_DRIFT'); }
  }
  function rememberExpected(node, entry, expected = snapshot(node, entry)) { expectedNodes.set(node.id, { node, entry, expected }); }
  function appendEvidence(parent, child) {
    for (const saved of preparedImports.get(child.id) ?? []) ensure(same(saved.expected, snapshot(saved.node, saved.entry)), 'FEEDBACK_NATIVE_CONCURRENT_NODE_DRIFT');
    const oldParent = child.parent, nodes = new Map(), layoutIds = new Set();
    const include = node => { if (node && entryById.has(node.id)) nodes.set(node.id, node); };
    include(parent); include(oldParent); include(child);
    for (const start of [parent, oldParent]) {
      let ancestor = start, steps = 0;
      while (ancestor && entryById.has(ancestor.id)) {
        ensure(++steps <= 2000, 'FEEDBACK_NATIVE_LAYOUT_DIRTY_BUDGET');
        if (ancestor.layoutMode && ancestor.layoutMode !== 'NONE') {
          const pending = [ancestor]; let visited = 0;
          while (pending.length) { const node = pending.pop(); ensure(++visited <= 100000, 'FEEDBACK_NATIVE_LAYOUT_DIRTY_BUDGET'); if (!entryById.has(node.id)) continue; include(node); layoutIds.add(node.id); if ('children' in node) pending.push(...node.children); }
        }
        ancestor = ancestor.parent;
      }
    }
    checkExpected(nodes.keys());
    return { parent, child, oldParent, nodes, layoutIds };
  }
  function acceptAppend(evidence) {
    const { parent, child, oldParent, nodes, layoutIds } = evidence;
    for (const [id, node] of nodes) {
      const saved = expectedNodes.get(id); if (!saved) continue;
      const expected = copy(saved.expected), actual = snapshot(node, saved.entry);
      if (id === child.id) expected.parentId = parent.id;
      if (id === parent.id || id === oldParent?.id) { expected.children = expected.children.filter(value => value !== child.id); if (id === parent.id) expected.children.push(child.id); }
      if (layoutIds.has(id)) for (const field of ['x', 'y', 'width', 'height', 'relativeTransform']) if (field in actual) expected[field] = actual[field];
      ensure(same(expected, actual), 'FEEDBACK_NATIVE_CONCURRENT_NODE_DRIFT'); saved.expected = expected;
       mutatedNodeIds.add(id);
    }
    for (const saved of preparedImports.get(child.id) ?? []) if (saved.node.id !== child.id) rememberExpected(saved.node, saved.entry);
    preparedImports.delete(child.id);
    return nodes;
  }
  const auditedNodes = new Map();
  async function audit() {
    const issues = [];
    if (!ledger) return [{ code: 'LEDGER_MISSING' }];
    const root = await figma.getNodeByIdAsync(ledger.rootNodeId);
    if (!root || root.parent?.id !== page.id || root.getPluginData(`${prefix}operation`) !== operationKey) issues.push({ code: 'ROOT_SCOPE_MISMATCH', nodeId: ledger.rootNodeId });
    for (const entry of ledger.entries) {
      const node = await figma.getNodeByIdAsync(entry.id);
      if (node) auditedNodes.set(node.id, node);
      if (!node) { issues.push({ code: 'OWNED_NODE_MISSING', nodeId: entry.id }); continue; }
      let ancestor = node; const seen = new Set();
      while (ancestor && ancestor.type !== 'PAGE' && !seen.has(ancestor.id)) { seen.add(ancestor.id); ancestor = ancestor.parent; }
      if (ancestor?.id !== page.id || node.getPluginData(`${prefix}operation`) !== operationKey) issues.push({ code: 'NODE_SCOPE_MISMATCH', nodeId: entry.id });
      if (!entry.snapshot&&!entry.snapshotHash) issues.push({ code: 'NODE_BUILD_INCOMPLETE', nodeId: entry.id });
      else if (entry.snapshotHash?sha256(JSON.stringify(snapshot(node,entry)))!==entry.snapshotHash:!same(snapshot(node, entry), entry.snapshot)) issues.push({ code: 'NATIVE_READBACK_DRIFT', nodeId: entry.id, sourceId: entry.sourceId });
      if(libraryRefs)for(const field of ['fills','strokes'])if(Array.isArray(node[field]))try{verifyPaintReadback(node,field,node[field]);}catch(error){issues.push({code:error.message,nodeId:entry.id,sourceId:entry.sourceId});}
      if(entry.componentId){let component=null;try{component=typeof node.getMainComponentAsync==='function'?await node.getMainComponentAsync():node.mainComponent;guard();}catch{issues.push({code:'INSTANCE_COMPONENT_UNREADABLE',nodeId:entry.id});}if(node.type!=='INSTANCE'||component?.id!==entry.componentId)issues.push({code:'INSTANCE_COMPONENT_DRIFT',nodeId:entry.id});}
    }
    const known = new Set(ledger.entries.map(entry => entry.id)), pending = [...page.children]; let visited = 0;
    while (pending.length) { const node = pending.pop(); ensure(++visited <= 100000, 'FEEDBACK_NATIVE_AUDIT_BUDGET'); if (node.getPluginData?.(`${prefix}operation`) === operationKey && !known.has(node.id)) issues.push({ code: 'UNLEDGERED_OWNED_NODE', nodeId: node.id }); if ('children' in node && (node.id === ledger.rootNodeId || node.getPluginData?.(`${prefix}operation`) === operationKey)) pending.push(...node.children); }
    if (ledger.pending || pendingIntent) issues.push({ code: 'PENDING_WRITE_REQUIRES_MANUAL_REVIEW', intent: pendingIntent?.stage ?? ledger.failedStage ?? null });
    return issues;
  }
  if (mode === 'audit' || mode === 'export' || ledger) {
    if ((pendingIntent || ledger?.pending) && mode === 'apply') return response('PENDING_REQUIRES_AUDIT');
    const issues = await audit();
    if (mode === 'audit' || issues.length) return response(issues.length ? 'AUDIT_FAIL' : 'AUDIT_PASS', { issues, verification: { nativeReadback: issues.length ? 'FAIL' : 'PASS', sourceFidelity: 'NOT VERIFIED', visual: 'NOT RUN', present: 'NOT RUN' } });
    if (mode === 'export') {
      ensure(ledger.complete, 'FEEDBACK_NATIVE_EXPORT_INCOMPLETE'); const root = await figma.getNodeByIdAsync(ledger.rootNodeId), bytes = await root.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 1 } });
      ensure(bytes.length <= 10000000, 'FEEDBACK_NATIVE_EXPORT_BUDGET'); const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'; let data = '';
      for (let index = 0; index < bytes.length; index += 3) { const a = bytes[index], b = bytes[index + 1], c = bytes[index + 2], value = a << 16 | (b ?? 0) << 8 | (c ?? 0); data += alphabet[value >>> 18 & 63] + alphabet[value >>> 12 & 63] + (b === undefined ? '=' : alphabet[value >>> 6 & 63]) + (c === undefined ? '=' : alphabet[value & 63]); }
      return response('EXPORTED', { mimeType: 'image/png', imageBase64: data, byteLength: bytes.length });
    }
    if (mode === 'apply') { for (const entry of ledger.entries) { const node = auditedNodes.get(entry.id), value = snapshot(node, entry); ensure(entry.snapshotHash ? sha256(JSON.stringify(value)) === entry.snapshotHash : same(value, entry.snapshot), 'FEEDBACK_NATIVE_CONCURRENT_NODE_DRIFT'); rememberExpected(node, entry, value); } checkExpected(); }
    if (ledger.complete) return response('ALREADY_COMPLETE');
  }
  guard();
  const loadedFonts = new Set();
  for (const [key, font] of fonts) { await figma.loadFontAsync(font); guard(); checkExpected(); loadedFonts.add(key); }
  ledger ??= { schemaVersion: 'feedback-fidelity-native-ledger/1', operationKey, targetPageId, specHash, fontMapHash,libraryMapHash,scenePosition:requestedPosition,snapshotStorage:'SHA256',libraryUsage:libraryRefs?{boundPaintCount:0,inheritedBoundPaintCount:0,instanceCount:0}:null, rootNodeId: null, cursor: 0, totalUnits: units.length, pending: false, complete: false, entries: [], contextNodeIds: {}, nativeNodeIdByCaptureId: {}, warnings, autoLayoutCount: 0 };
  warnings.splice(0, warnings.length, ...ledger.warnings);
  function setData(node, key, value) { guard(); node.setPluginData(key, value); mutatedNodeIds.add(node.id); }
  function persist() {
    guard(); checkExpected(mutatedNodeIds); ledger.warnings = warnings; const serialized = JSON.stringify(ledger); ensure(serialized.length <= 4096000, 'FEEDBACK_NATIVE_LEDGER_BUDGET'); const chunks = Math.ceil(serialized.length / 16000);
    for (let index = 0; index < chunks; index++) setData(page, `${prefix}chunk_${index}`, serialized.slice(index * 16000, (index + 1) * 16000));
    setData(page, `${prefix}header`, JSON.stringify({ chunks, hash: sha256(serialized), specHash, operationKey, targetPageId }));
  }
  function intent(stage) { pendingIntent = { operationKey, targetPageId, specHash, cursor: ledger.cursor, stage }; setData(page, `${prefix}intent`, JSON.stringify(pendingIntent)); }
  const entryById = new Map(ledger.entries.map(entry => [entry.id, entry]));
  function ownTree(node, sourceId, role) {
    const pending = [{ node, role }];
    while (pending.length) {
      const current = pending.pop(), value = current.node;
      ensure(ledger.entries.length < 100000, 'FEEDBACK_NATIVE_NODE_BUDGET');
      auditedNodes.set(value.id, value);
      if (!entryById.has(value.id)) { createdNodeIds.push(value.id); const entry = { id: value.id, sourceId, role: current.role, snapshot: null }; ledger.entries.push(entry); entryById.set(value.id, entry); }
      setData(value, `${prefix}operation`, operationKey); setData(value, `${prefix}capture`, sourceId); setData(value, `${prefix}role`, current.role);
      if ('children' in value) for (const child of [...value.children].reverse()) pending.push({ node: child, role: `${role}/svg-descendant` });
    }
    return node;
  }
  let finishedCreatedIndex = 0;
  function rememberFinishedNodes() {
    while (finishedCreatedIndex < createdNodeIds.length) { const id = createdNodeIds[finishedCreatedIndex++]; if (!expectedNodes.has(id)) rememberExpected(auditedNodes.get(id), entryById.get(id)); }
  }
  function append(parent, node) {
    guard(); ensure(parent.id === page.id || entryById.has(parent.id), 'FEEDBACK_NATIVE_PARENT_NOT_OWNED'); const evidence = appendEvidence(parent, node); parent.appendChild(node); acceptAppend(evidence); mutatedNodeIds.add(parent.id); mutatedNodeIds.add(node.id);
    // Auto Layout can move or resize existing siblings and nested children.
    // Those engine changes belong to this append and need fresh snapshots too.
    let ancestor = parent;
    while (ancestor && entryById.has(ancestor.id)) {
      if (ancestor.layoutMode && ancestor.layoutMode !== 'NONE') {
        const pending = [ancestor]; let visited = 0;
        while (pending.length) {
          const affected = pending.pop(); ensure(++visited <= 100000, 'FEEDBACK_NATIVE_LAYOUT_DIRTY_BUDGET');
          if (!entryById.has(affected.id)) continue;
          mutatedNodeIds.add(affected.id);
          if ('children' in affected) pending.push(...affected.children);
        }
      }
      ancestor = ancestor.parent;
    }
  }
  function frame(sourceId, role, parent, bounds, auto = false) {
    guard(); const node = ownTree(figma.createFrame(), sourceId, role);
    if (auto) node.layoutMode = 'HORIZONTAL';
    node.name = `Feedback/${role}/${sourceId}`; append(parent, node); node.fills = []; node.strokes = []; node.clipsContent = false; node.resize(Math.max(0.01, bounds.width), Math.max(0.01, bounds.height)); node.x = bounds.x; node.y = bounds.y; return node;
  }
  const color = value => {
    if (!value || value === 'transparent' || value === 'none') return null;
    let match = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/.exec(value);
    if (match) return { r: +match[1] / 255, g: +match[2] / 255, b: +match[3] / 255, a: match[4] === undefined ? 1 : +match[4] };
    match = /^#([a-f0-9]{6})([a-f0-9]{2})?$/i.exec(value); return match ? { r: parseInt(match[1].slice(0, 2), 16) / 255, g: parseInt(match[1].slice(2, 4), 16) / 255, b: parseInt(match[1].slice(4, 6), 16) / 255, a: match[2] ? parseInt(match[2], 16) / 255 : 1 } : null;
  };
  function bindSolidPaint(paint,sourceId){
    if(!libraryRefs||paint.type!=='SOLID')return paint;
    const hex=hexFor(paint.color),alpha=paint.opacity??1;ensure(Number.isFinite(alpha)&&alpha>=0&&alpha<=1,'FEEDBACK_NATIVE_LIBRARY_PAINT_ALPHA_INVALID');
    let variable=paletteVariables.get(`${hex}@${String(Number(alpha))}`);
    if(!variable){const candidates=paletteRgba.filter(entry=>entry.hex===hex&&Math.abs(entry.alpha-alpha)<=.000001).map(entry=>({...entry,distance:Math.abs(entry.alpha-alpha)})).sort((a,b)=>a.distance-b.distance);ensure(candidates.length,'FEEDBACK_NATIVE_LIBRARY_PAINT_UNREFERENCED');ensure(candidates.length===1||Math.abs(candidates[1].distance-candidates[0].distance)>Number.EPSILON*8,'FEEDBACK_NATIVE_LIBRARY_PAINT_ALPHA_AMBIGUOUS');variable=candidates[0].variable;}
    const expected=variable.valuesByMode[validatedLibraryModeId];ensure(['r','g','b'].every(key=>Math.abs(paint.color[key]-expected[key])<=.000001)&&Math.abs(alpha-expected.a)<=.000001,'FEEDBACK_NATIVE_LIBRARY_PAINT_COLOR_DRIFT');
    const usage=ledger.libraryUsage??={boundPaintCount:0,inheritedBoundPaintCount:0,instanceCount:0};
    if(paint.boundVariables?.color?.id===variable.id){usage.boundPaintCount++;usage.inheritedBoundPaintCount++;return paint;}
    const bound=figma.variables.setBoundVariableForPaint(copy(paint),'color',variable);
    ensure(bound?.boundVariables?.color?.id===variable.id&&Math.abs((bound.opacity??1)-alpha)<=.000001&&['r','g','b'].every(key=>Math.abs(bound.color[key]-paint.color[key])<=.000001),'FEEDBACK_NATIVE_LIBRARY_BOUND_PAINT_MISMATCH');usage.boundPaintCount++;return bound;
  }
  function verifyPaintReadback(node,field,expected){
    if(!libraryRefs)return;
    const actual=node[field];ensure(Array.isArray(actual)&&actual.length===expected.length,'FEEDBACK_NATIVE_LIBRARY_PAINT_READBACK_MISMATCH');
    for(const[index,paint]of expected.entries()){if(paint.type!=='SOLID')continue;const observed=actual[index],id=paint.boundVariables?.color?.id,variable=paletteById.get(id),value=variable?.valuesByMode?.[validatedLibraryModeId];ensure(observed?.type==='SOLID'&&variable&&observed.boundVariables?.color?.id===id&&Math.abs((observed.opacity??1)-(paint.opacity??1))<=.000001&&Math.abs((observed.opacity??1)-value.a)<=.000001&&['r','g','b'].every(key=>Math.abs(observed.color[key]-paint.color[key])<=.000001&&Math.abs(observed.color[key]-value[key])<=.000001),'FEEDBACK_NATIVE_LIBRARY_PAINT_READBACK_MISMATCH');}
  }
  function assignPaints(node,field,values){guard();node[field]=values;mutatedNodeIds.add(node.id);verifyPaintReadback(node,field,values);}
  const paints = (value,sourceId='') => { const parsed = color(value); return parsed && parsed.a > 0 ? [bindSolidPaint({ type: 'SOLID', color: { r: parsed.r, g: parsed.g, b: parsed.b }, opacity: parsed.a },sourceId)] : []; };
  function bindTreePaints(root,sourceId){
    if(!libraryRefs)return;
    const pending=[root];while(pending.length){const node=pending.pop();for(const field of ['fills','strokes']){if(!(field in node)||!Array.isArray(node[field]))continue;let changed=false;const values=node[field].map(paint=>{const bound=bindSolidPaint(paint,sourceId);if(bound!==paint)changed=true;return bound;});if(changed)assignPaints(node,field,values);else verifyPaintReadback(node,field,values);}if('children'in node)pending.push(...node.children);}
  }
  const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  function shadows(value, sourceId) {
    if (!value || value === 'none') return [];
    const parts = []; let depth = 0, begin = 0;
    for (let index = 0; index < value.length; index++) { if (value[index] === '(') depth++; if (value[index] === ')') depth--; if (value[index] === ',' && !depth) { parts.push(value.slice(begin, index)); begin = index + 1; } } parts.push(value.slice(begin));
    const effects = [];
    for (const part of parts) { const match = /rgba?\([^)]*\)|#[a-f0-9]{6,8}/i.exec(part), parsed = color(match?.[0]), lengths = part.replace(match?.[0] ?? '', '').replace(/\binset\b/g, '').trim().split(/\s+/); if (!parsed || lengths.length < 2 || lengths.length > 4 || lengths.some(length => !/^[+-]?(?:\d*\.\d+|\d+)(?:px)?$/.test(length))) { warn('BOX_SHADOW_UNSUPPORTED', sourceId); continue; } const [x,y,radius=0,spread=0] = lengths.map(Number.parseFloat); effects.push({ type: /\binset\b/.test(part) ? 'INNER_SHADOW' : 'DROP_SHADOW', color: parsed, offset: { x, y }, radius: Math.max(0, radius), spread, blendMode: 'NORMAL', visible: true }); }
    return effects;
  }
  const intersect = (a, b) => { const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y), right = Math.min(a.x + a.width, b.x + b.width), bottom = Math.min(a.y + a.height, b.y + b.height); return right > x && bottom > y ? { x, y, width: right - x, height: bottom - y } : null; };
  const viewportRect = { x: 0, y: 0, width: capture.viewport.width, height: capture.viewport.height };
  function clipFor(source) { let bounds = viewportRect; for (const clip of source.clips ?? []) { bounds = bounds && intersect(bounds, clip.rect); if (clip.borderRadii?.some(radius => parseFloat(radius) > 0)) warn('ROUNDED_OVERFLOW_CLIP_NOT_REPRODUCED', source.id); } return bounds; }
  async function prepareImportedTree(node,sourceId){
    const tree=[],scan=[node];while(scan.length){const current=scan.pop();tree.push({node:current,expected:snapshot(current,entryById.get(current.id))});if('children'in current)scan.push(...current.children);}
    const pending=[node];while(pending.length){const current=pending.pop();if(current.type==='TEXT'){const values=current.fontName===figma.mixed&&typeof current.getStyledTextSegments==='function'?current.getStyledTextSegments(['fontName']).map(segment=>segment.fontName):[current.fontName];for(const font of values){await figma.loadFontAsync(font);guard();}}if('children'in current)pending.push(...current.children);}
    checkExpected(mutatedNodeIds);for(const saved of tree)ensure(same(saved.expected,snapshot(saved.node,entryById.get(saved.node.id))),'FEEDBACK_NATIVE_CONCURRENT_NODE_DRIFT');
    bindTreePaints(node,sourceId);
    preparedImports.set(node.id,tree.map(saved=>({node:saved.node,entry:entryById.get(saved.node.id),expected:snapshot(saved.node,entryById.get(saved.node.id))})));
  }
  async function importSvgInstance(matched,source,parent){
    intent('CREATE_SVG_INSTANCE');guard();const node=ownTree(matched.component.createInstance(),source.id,'SVG Instance');entryById.get(node.id).componentId=matched.reference.componentId;entryById.get(node.id).librarySvgHash=libraryRefs.sourceSvgHashes[capture.id][source.id];
    await prepareImportedTree(node,source.id);append(parent,node);node.name=`Feedback/SVG Instance/${source.id}`;node.x=0;node.y=0;ledger.libraryUsage.instanceCount++;rememberExpected(node,entryById.get(node.id));return node;
  }
  async function importSvg(markup, source, parent, role = 'SVG') {
    if(libraryRefs)warn('SVG_LIBRARY_RAW_FALLBACK',source.id,role);
    ensure(typeof markup==='string'&&!/<(?:script|foreignObject)\b|\son[a-z]+\s*=/i.test(markup)&&!/(?:href|xlink:href)\s*=\s*["'](?!#|data:image\/(?:png|jpeg|webp|gif);base64,)/i.test(markup)&&!/url\(\s*["']?(?!#)[a-z]+:/i.test(markup),'FEEDBACK_NATIVE_UNSAFE_EMBEDDED_SVG');
    // Embedded synthetic images keep their original coordinate system while
    // the imported viewport matches their measured CSS display dimensions.
    const opening=/<svg\b[^>]*>/i.exec(markup);
    ensure(opening,'FEEDBACK_NATIVE_SVG_ROOT_MISSING');
    let tag=opening[0];const attribute=name=>new RegExp(`\\s${name}\\s*=\\s*(["'])(.*?)\\1`,'i').exec(tag)?.[2];
    if(!attribute('viewBox')){const width=parseFloat(attribute('width')),height=parseFloat(attribute('height'));if(width>0&&height>0)tag=tag.replace(/>$/,` viewBox="0 0 ${width} ${height}">`);else warn('SVG_COORDINATE_SYSTEM_UNRESOLVED',source.id);}
    for(const [key,value]of[['width',source.rect.width],['height',source.rect.height]]){const expression=new RegExp(`\\s${key}\\s*=\\s*(["']).*?\\1`,'i');tag=expression.test(tag)?tag.replace(expression,` ${key}="${value}"`):tag.replace(/>$/,` ${key}="${value}">`);}
    markup=markup.replace(opening[0],tag);
    intent(`CREATE_${role}`); guard(); const node = ownTree(figma.createNodeFromSvg(markup), source.id, role);
    // Every imported descendant is recorded before any await or later write.
    await prepareImportedTree(node,source.id);
    append(parent, node); node.name = `Feedback/${role}/${source.id}`; node.x = 0; node.y = 0;
    rememberExpected(node,entryById.get(node.id)); return node;
  }
  function borderData(source, width, height) {
    const keys = ['Top','Right','Bottom','Left'], sizes = keys.map(key => Math.max(0, parseFloat(source.style[`border${key}Width`]) || 0)), colors = keys.map(key => source.style[`border${key}Color`] || 'transparent'), styles = keys.map(key => source.style[`border${key}Style`] || 'none');
    const radii = ['TopLeft','TopRight','BottomRight','BottomLeft'].map(key => { const values = (source.style[`border${key}Radius`] || '0px').split(/\s+/), length = (value, axis) => value?.endsWith('%') ? parseFloat(value) * axis / 100 : parseFloat(value) || 0; return [length(values[0], width), length(values[1] ?? values[0], height)]; });
    const scale = Math.min(1, width / Math.max(0.00001, radii[0][0]+radii[1][0]), width / Math.max(0.00001,radii[3][0]+radii[2][0]), height / Math.max(0.00001,radii[0][1]+radii[3][1]), height / Math.max(0.00001,radii[1][1]+radii[2][1]));
    return { sizes: sizes.map((size,index) => styles[index] === 'none' || styles[index] === 'hidden' ? 0 : size), colors, styles, radii: radii.map(pair => pair.map(radius => radius * scale)) };
  }
  function boxSvg(source, transformed = false) {
    const bounds = transformed ? source.layoutRect : source.rect, width = bounds.width, height = bounds.height, border = borderData(source,width,height), [top,right,bottom,left] = border.sizes;
    const corner = border.radii, path = `M ${corner[0][0]} 0 H ${width-corner[1][0]} A ${corner[1][0]} ${corner[1][1]} 0 0 1 ${width} ${corner[1][1]} V ${height-corner[2][1]} A ${corner[2][0]} ${corner[2][1]} 0 0 1 ${width-corner[2][0]} ${height} H ${corner[3][0]} A ${corner[3][0]} ${corner[3][1]} 0 0 1 0 ${height-corner[3][1]} V ${corner[0][1]} A ${corner[0][0]} ${corner[0][1]} 0 0 1 ${corner[0][0]} 0 Z`;
    let clipPath = `<path d="${path}"/>`;
    if (source.style.clipPath && source.style.clipPath !== 'none') { const pathMatch = /^path\(["'](.*)["']\)$/.exec(source.style.clipPath), polygon = /^polygon\((.*)\)$/.exec(source.style.clipPath); if (pathMatch) clipPath = `<path d="${escape(pathMatch[1])}"/>`; else if (polygon) { const points = polygon[1].split(',').map(pair => pair.trim().split(/\s+/).map((value,index) => value.endsWith('%') ? parseFloat(value) * (index ? height : width) / 100 : parseFloat(value)).join(',')).join(' '); clipPath = `<polygon points="${points}"/>`; } else warn('CSS_CLIP_PATH_UNSUPPORTED', source.id); }
    let body = `<defs><clipPath id="feedback-shape">${clipPath}</clipPath></defs><g clip-path="url(#feedback-shape)"><rect width="${width}" height="${height}" fill="${escape(source.style.backgroundColor || 'transparent')}"/>`;
    const polygons = [`0,0 ${width},0 ${width-right},${top} ${left},${top}`,`${width},0 ${width},${height} ${width-right},${height-bottom} ${width-right},${top}`,`0,${height} ${width},${height} ${width-right},${height-bottom} ${left},${height-bottom}`,`0,0 ${left},${top} ${left},${height-bottom} 0,${height}`];
    for (let index = 0; index < 4; index++) if (border.sizes[index] > 0) { if (border.styles[index] !== 'solid') warn('NON_SOLID_BORDER_APPROXIMATED', source.id, border.styles[index]); body += `<polygon points="${polygons[index]}" fill="${escape(border.colors[index])}"/>`; }
    body += '</g>';
    if (transformed) { const origin = (source.transformOrigin ?? source.style.transformOrigin ?? '0 0').split(/\s+/).map(Number.parseFloat), dx = bounds.x-source.rect.x, dy=bounds.y-source.rect.y; body = `<g transform="translate(${dx} ${dy}) translate(${origin[0] || 0} ${origin[1] || 0}) ${escape(source.transform === 'none' ? '' : source.transform || '')} translate(${-origin[0] || 0} ${-origin[1] || 0})">${body}</g>`; }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${source.rect.width}" height="${source.rect.height}" viewBox="0 0 ${source.rect.width} ${source.rect.height}">${body}</svg>`;
  }
  function opaqueDrawerShadowCover(source, border) {
    if(source.kind!=='element'||!/(?:^|\s)ant-drawer-content-wrapper(?:\s|$)/.test(source.attrs?.class??'')||border.sizes.some(Boolean))return null;
    const sameBox=(a,b)=>a&&b&&['x','y','width','height'].every(key=>Math.abs(a[key]-b[key])<=.01);
    const neutral=entry=>Number(entry.style.opacity)===1&&entry.style.transform==='none'&&(!entry.style.filter||entry.style.filter==='none')&&(!entry.style.backdropFilter||entry.style.backdropFilter==='none')&&(!entry.style.mixBlendMode||entry.style.mixBlendMode==='normal')&&(!entry.style.clipPath||entry.style.clipPath==='none');
    if(!neutral(source)||!sameBox(source.rect,source.visibleRect))return null;
    const sourceOrder=capture.paintOrder.indexOf(source.id);
    for(const candidate of children.get(source.id)??[]){
      const background=color(candidate.style.backgroundColor),candidateBorder=borderData(candidate,candidate.rect.width,candidate.rect.height);
      if(candidate.kind!=='element'||!/(?:^|\s)ant-drawer-content(?:\s|$)/.test(candidate.attrs?.class??'')||candidate.style.backgroundClip!=='border-box'||!background||background.a!==1||!neutral(candidate)||!sameBox(source.rect,candidate.rect)||!sameBox(source.rect,candidate.visibleRect)||candidateBorder.sizes.some(Boolean)||!border.radii.every((pair,index)=>pair.every((radius,axis)=>Math.abs(radius-candidateBorder.radii[index][axis])<=.000001))||capture.paintOrder.indexOf(candidate.id)<=sourceOrder)continue;
      const fullyClipped=(candidate.clips??[]).some(clip=>(clip.axes?.x!==false&&(clip.rect.x>source.rect.x+.01||clip.rect.x+clip.rect.width<source.rect.x+source.rect.width-.01))||(clip.axes?.y!==false&&(clip.rect.y>source.rect.y+.01||clip.rect.y+clip.rect.height<source.rect.y+source.rect.height-.01)));
      if(!fullyClipped)return candidate;
    }
    return null;
  }
  function drawCoveredDrawerShadow(source, parent, border, effects, cover) {
    guard();const node=ownTree(figma.createRectangle(),source.id,'Shadow caster');append(parent,node);node.name=`Feedback/Shadow caster/${source.id}`;node.resize(source.rect.width,source.rect.height);node.x=0;node.y=0;
    assignPaints(node,'fills',paints(cover.style.backgroundColor,source.id));assignPaints(node,'strokes',[]);
    for(const[index,key]of['topLeftRadius','topRightRadius','bottomRightRadius','bottomLeftRadius'].entries())node[key]=border.radii[index][0];
    node.effects=effects;
    entryById.get(node.id).shadowCasterEvidence={method:'OPAQUE_DIRECT_CHILD_FULL_COVER',opaqueCoverSourceId:cover.id,sourceBackgroundColor:source.style.backgroundColor,coverage:{sourceBounds:copy(source.rect),childBounds:copy(cover.rect),borderRadii:copy(border.radii),sourceOpacity:1,childOpacity:1,sourcePaintIndex:capture.paintOrder.indexOf(source.id),childPaintIndex:capture.paintOrder.indexOf(cover.id),cssClipsUnchanged:true}};
    return node;
  }
  async function drawBox(source, parent) {
    const border = borderData(source,source.rect.width,source.rect.height), colors = border.colors.filter((_value,index) => border.sizes[index] > 0), solids = border.styles.every((value,index) => !border.sizes[index] || value === 'solid'), circular = border.radii.every(pair => Math.abs(pair[0]-pair[1]) < 0.00001);
    if (source.kind === 'pseudo' || !solids || !circular || new Set(colors).size > 1 || source.style.clipPath && source.style.clipPath !== 'none') {
      const node = await importSvg(boxSvg(source, source.kind === 'pseudo'), source, parent, 'CSS Box Vector'); checkExpected([node.id]); node.effects = shadows(source.style.boxShadow,source.id); rememberExpected(node,entryById.get(node.id)); return node;
    }
    const background=paints(source.style.backgroundColor,source.id);
    if (!background.length && !border.sizes.some(Boolean) && source.style.boxShadow === 'none') return null;
    const effects=shadows(source.style.boxShadow,source.id);
    if(!background.length&&!border.sizes.some(Boolean)&&effects.length){const cover=opaqueDrawerShadowCover(source,border);if(cover)drawCoveredDrawerShadow(source,parent,border,effects,cover);else warn('TRANSPARENT_BOX_SHADOW_CASTER_UNSUPPORTED',source.id,'No fully covering opaque direct drawer child is evidenced; source transparency is retained.');}
    guard(); const node = ownTree(figma.createRectangle(),source.id,'Box'); append(parent,node); node.name = `Feedback/Box/${source.id}`; node.resize(source.rect.width,source.rect.height); node.x=0;node.y=0;assignPaints(node,'fills',background);assignPaints(node,'strokes',colors.length?paints(colors[0],source.id):[]);node.strokeAlign='INSIDE';
    for (const [index,key] of ['strokeTopWeight','strokeRightWeight','strokeBottomWeight','strokeLeftWeight'].entries()) node[key]=border.sizes[index];
    for (const [index,key] of ['topLeftRadius','topRightRadius','bottomRightRadius','bottomLeftRadius'].entries()) node[key]=border.radii[index][0];
    node.effects=effects; return node;
  }
  function logicalDomLineEvidence(source,lineIndex,bounds,units,value,sourceById,unsupported) {
    const reject=reason=>({status:'REJECTED',reason}),evidence=source.textEvidence,lines=evidence?.lineRects,characters=evidence?.characters;
    if(evidence?.source!=='DOM_RANGE'||!Array.isArray(lines)||!lines.length||!Array.isArray(characters)||!characters.length||!units.length)return reject('COMPLETE_DOM_RANGE_REQUIRED');
    if(source.style.direction!=='ltr'||source.style.writingMode!=='horizontal-tb')return reject('LTR_HORIZONTAL_EVIDENCE_REQUIRED');
    if(source.style.textTransform!=='none'||!['normal','nowrap','pre-wrap'].includes(source.style.whiteSpace))return reject('TEXT_PRESENTATION_NOT_SUPPORTED');
    if(/[\r\n\t\f\v\u2028\u2029]/u.test(value)||source.style.whiteSpace!=='pre-wrap'&&/ {2,}/u.test(value))return reject('COLLAPSED_OR_CONTROL_WHITESPACE');
    if(evidence.overflow?.textOverflow==='ellipsis'&&evidence.overflow.scrollWidth>evidence.overflow.clientWidth)return reject('VISIBLE_ELLIPSIS_NOT_PROVEN');
    let offset=0;
    for(const character of characters){if(!Number.isInteger(character.start)||!Number.isInteger(character.end)||character.start!==offset||character.end<=character.start||character.end>source.text.length||character.text!==source.text.slice(character.start,character.end)||!Number.isInteger(character.lineIndex)||character.lineIndex<0||character.lineIndex>=lines.length)return reject('CHARACTER_OFFSETS_INCOMPLETE');offset=character.end;}
    if(offset!==source.text.length||units.some((character,index)=>index&&character.start!==units[index-1].end))return reject('CHARACTER_OFFSETS_INCOMPLETE');
    const ancestorIds=new Set();let ancestor=source;
    while(ancestor){ancestorIds.add(ancestor.id);const transform=ancestor.style.transform;
      if(ancestor.style.perspective!=='none')return reject('TRANSFORM_EVIDENCE_INCOMPLETE');
      if(transform!=='none'){const match=/^matrix\(([^)]+)\)$/.exec(transform??''),values=match?.[1].split(',').map(Number);if(!values||values.length!==6||!values.every(Number.isFinite)||[values[0]-1,values[1],values[2],values[3]-1].some(value=>Math.abs(value)>1e-9))return reject('NON_TRANSLATION_TRANSFORM');}
      ancestor=sourceById.get(ancestor.parentId);
    }
    if(unsupported.some(issue=>issue.code==='TEXT_DISJOINT_SAME_BASELINE_FRAGMENTS'&&ancestorIds.has(issue.nodeId)))return reject('DISJOINT_BASELINE_FRAGMENTS');
    let left=Infinity,right=-Infinity,previousX=-Infinity;
    for(const character of units){const unique=[];
      if(!Array.isArray(character.rects)||!character.rects.length)return reject('CHARACTER_RECT_MISSING');
      for(const rect of character.rects){if(!['x','y','width','height'].every(key=>Number.isFinite(rect[key]))||rect.width<=0||rect.height<=0)return reject('CHARACTER_RECT_MISSING');if(!unique.some(previous=>['x','y','width','height'].every(key=>Math.abs(previous[key]-rect[key])<=.01)))unique.push(rect);}
      if(unique.length!==1)return reject('CHARACTER_HAS_MULTIPLE_RECTS');const rect=unique[0];
      if(Math.abs(rect.y-bounds.y)>=.5||Math.abs(rect.height-bounds.height)>=.5||rect.x<bounds.x-.5||rect.x+rect.width>bounds.x+bounds.width+.5||rect.x+.5<previousX)return reject('CHARACTER_BASELINE_MISMATCH');
      previousX=rect.x;left=Math.min(left,rect.x);right=Math.max(right,rect.x+rect.width);
    }
    if(Math.abs(left-bounds.x)>.5||Math.abs(right-bounds.x-bounds.width)>.5)return reject('LINE_RANGE_NOT_COVERED');
    return{status:'ACCEPTED',method:'COMPLETE_DOM_LOGICAL_LINE',lineIndex,start:units[0].start,end:units.at(-1).end,characterCount:units.length,baseline:copy(bounds),direction:'ltr',writingMode:'horizontal-tb',ancestorTransform:'NONE_OR_MEASURED_TRANSLATION'};
  }
  async function drawText(source,parent,auto = false) {
    const mapping=fontFor(source), text=source.text ?? '', lineHeight=parseFloat(source.style.lineHeight), size=parseFloat(source.style.fontSize)||14;
    const lines=source.textEvidence?.lineRects?.length?source.textEvidence.lineRects:[source.rect], output=[],ellipsis=source.textEvidence?.ellipsisEvidence?.status==='EVIDENCED'?source.textEvidence.ellipsisEvidence:null;
    for (const [lineIndex,bounds] of lines.entries()) {
      const units=(source.textEvidence?.characters??[]).filter(character=>character.lineIndex===lineIndex);
      if(!units.length&&source.textEvidence?.characters?.length){warn('TEXT_RANGE_FRAGMENT_WITHOUT_CHARACTERS_SKIPPED',source.id);continue;}
      if(ellipsis&&lineIndex>0){warn('ELLIPSIS_EXTRA_LOGICAL_LINE_REJECTED',source.id);continue;}
      const start=ellipsis?0:units.length?units[0].start:0,end=ellipsis?ellipsis.prefixEnd+1:units.length?units.at(-1).end:text.length,value=ellipsis?ellipsis.visibleText:text.slice(start,end),fontRangeEnd=ellipsis?ellipsis.prefixEnd:end,nativeWidth=Math.ceil(ellipsis?ellipsis.availableWidth:bounds.width);
      if (!value) continue;
      const logicalLineEvidence=auto?{status:'REJECTED',reason:'AUTO_LAYOUT_POLICY_PRESERVED'}:ellipsis?{status:'REJECTED',reason:'EVIDENCED_ELLIPSIS_POLICY_PRESERVED'}:logicalDomLineEvidence(source,lineIndex,bounds,units,value,sources,capture.unsupported??[]),naturalDomLine=logicalLineEvidence.status==='ACCEPTED';
      guard(); const node=ownTree(figma.createText(),source.id,`Text line ${lineIndex+1}`); node.fontName={family:mapping.family,style:mapping.style}; node.fontSize=size;node.lineHeight=Number.isFinite(lineHeight)?{unit:'PIXELS',value:lineHeight}:{unit:'AUTO'};node.letterSpacing={unit:'PIXELS',value:parseFloat(source.style.letterSpacing)||0};node.characters=value;
      const rangeFonts=[];
      for (const range of mapping.ranges??[]) { const a=Math.max(start,range.start),b=Math.min(fontRangeEnd,range.end);if(b>a){ensure(typeof node.setRangeFontName==='function','FEEDBACK_NATIVE_RANGE_WRITE_UNSUPPORTED');node.setRangeFontName(a-start,b-start,range.fontName);rangeFonts.push({start:a-start,end:b-start,fontName:copy(range.fontName)});} }
      entryById.get(node.id).fontRanges=rangeFonts;
      entryById.get(node.id).originalCharacters=text;
      entryById.get(node.id).sourceLineWidth=bounds.width;
      entryById.get(node.id).nativeLineWidth=nativeWidth;
      entryById.get(node.id).logicalLineEvidence=logicalLineEvidence;
      entryById.get(node.id).lineWidthPolicy=naturalDomLine?'NATIVE_NATURAL_PROVEN_DOM_LINE':ellipsis?'EVIDENCED_ELLIPSIS_CONTENT_WIDTH':'CEIL_CAPTURED_DOM_LINE_WIDTH';
      entryById.get(node.id).displayedCharacters=value;
      if(ellipsis)entryById.get(node.id).ellipsisEvidence=copy(ellipsis);
      if(text.length<=16000)setData(node,`${prefix}originalText`,text);else setData(node,`${prefix}originalTextHash`,sha256(text));
      const origin=source.positionOriginRect??source.rect;
      append(parent,node);node.name=`Feedback/Editable text/${source.id}/${lineIndex+1}`;assignPaints(node,'fills',paints(source.style.color,source.id));
      // The browser has already selected this logical row, including normal
      // and pre-wrap soft breaks. Do not let a glyph tight-box wrap it again.
      // Its original CSS clip and captured row position still control visibility.
      if(naturalDomLine){node.textAutoResize='WIDTH_AND_HEIGHT';entryById.get(node.id).nativeLineWidth=node.width;}
      else{node.textAutoResize='NONE';node.resize(Math.max(1,nativeWidth),Math.max(.01,Number.isFinite(lineHeight)?lineHeight:bounds.height));}
      node.x=auto?0:bounds.x-origin.x;node.y=auto?0:bounds.y-origin.y-(Number.isFinite(lineHeight)?(lineHeight-bounds.height)/2:0);node.textAlignHorizontal='LEFT';
      if (source.style.textDecorationLine==='underline') node.textDecoration='UNDERLINE';else if(source.style.textDecorationLine==='line-through')node.textDecoration='STRIKETHROUGH';
      output.push(node);warn('TEXT_LINEBOX_METRICS_NOT_VERIFIED',source.id,'Native text retains browser row positions and CSS clipping; font baseline/advance still require native visual comparison.');
    }
    if(!ellipsis&&source.textEvidence?.overflow?.textOverflow==='ellipsis'&&source.textEvidence.overflow.scrollWidth>source.textEvidence.overflow.clientWidth)warn('TEXT_OVERFLOW_ELLIPSIS_NOT_RENDERED',source.id,'Source uses browser ellipsis but new cross-checked capture evidence is unavailable; no prefix is guessed.');
    for (const node of output) rememberExpected(node,entryById.get(node.id));
    return output;
  }
  async function drawControlText(source,parent) {
    const content=source.controlText.contentRect,scroll=source.scroll;
    const clip=frame(source.id,'Control content clip',parent,{x:content.x-source.rect.x,y:content.y-source.rect.y,width:content.width,height:content.height});clip.clipsContent=true;
    entryById.get(clip.id).controlTextClipEvidence={method:'MEASURED_CONTROL_CONTENT_RECT_AND_SCROLL',contentRect:copy(content),scroll:{left:scroll.left,top:scroll.top},probeSource:source.controlText.textEvidence.source};
    // The materialization probe is measured at the unscrolled content origin.
    // Native controls clip that content independently of CSS descendant clips.
    const textSource=controlTextSource(source);textSource.positionOriginRect={...content,x:content.x+scroll.left,y:content.y+scroll.top};
    await drawText(textSource,clip);
  }
  async function drawImage(source,parent) {
    // The border belongs to the CSS img box. It must never be scaled with its
    // replaced content or disappear when the content is an editable SVG.
    await drawBox(source,parent);
    const border=borderData(source,source.rect.width,source.rect.height),padding=['Top','Right','Bottom','Left'].map(side=>Math.max(0,parseFloat(source.style[`padding${side}`])||0)),insets=border.sizes.map((size,index)=>size+padding[index]);
    const width=source.rect.width-insets[1]-insets[3],height=source.rect.height-insets[0]-insets[2];
    if(!(width>0&&height>0)){warn('IMAGE_CONTENT_BOX_EMPTY',source.id);return;}
    const clip=frame(source.id,'Image content clip',parent,{x:insets[3],y:insets[0],width,height});clip.clipsContent=true;
    const inner=border.radii.map((pair,index)=>[Math.max(0,pair[0]-(index===0||index===3?insets[3]:insets[1])),Math.max(0,pair[1]-(index<2?insets[0]:insets[2]))]);
    for(const[index,key]of['topLeftRadius','topRightRadius','bottomRightRadius','bottomLeftRadius'].entries()){clip[key]=Math.min(...inner[index]);if(Math.abs(inner[index][0]-inner[index][1])>.00001)warn('IMAGE_ELLIPTICAL_CORNER_CLIP_APPROXIMATED',source.id);}
    if(source.style.clipPath&&source.style.clipPath!=='none')warn('IMAGE_CSS_CLIP_PATH_NOT_REPRODUCED',source.id);
    if(!/^data:image\/svg\+xml(?:;charset=[^,;]+)?[,;]/i.test(source.dataUrl??'')){warn('RASTER_IMAGE_IMPORT_NOT_IMPLEMENTED',source.id);return;}
    const comma=source.dataUrl.indexOf(','),data=source.dataUrl.slice(comma+1);
    if(/;base64$/i.test(source.dataUrl.slice(0,comma))){warn('SVG_IMAGE_BASE64_UNSUPPORTED',source.id);return;}
    const svg=decodeURIComponent(data),opening=/<svg\b[^>]*>/i.exec(svg)?.[0]??'',attribute=name=>new RegExp(`\\s${name}\\s*=\\s*(["'])(.*?)\\1`,'i').exec(opening)?.[2],length=value=>/^(?:\d*\.\d+|\d+)(?:px)?$/.test(value??'')?parseFloat(value):null,viewBox=attribute('viewBox')?.trim().split(/[\s,]+/).map(Number);
    const naturalWidth=length(attribute('width'))??(viewBox?.length===4?viewBox[2]:null),naturalHeight=length(attribute('height'))??(viewBox?.length===4?viewBox[3]:null);
    if(!(naturalWidth>0&&naturalHeight>0)){warn('SVG_IMAGE_INTRINSIC_SIZE_UNRESOLVED',source.id);return;}
    const fit=source.style.objectFit||'fill',contain=Math.min(width/naturalWidth,height/naturalHeight),cover=Math.max(width/naturalWidth,height/naturalHeight);let renderedWidth=width,renderedHeight=height;
    if(['contain','cover','none','scale-down'].includes(fit)){const scale=fit==='contain'?contain:fit==='cover'?cover:fit==='scale-down'?Math.min(1,contain):1;renderedWidth=naturalWidth*scale;renderedHeight=naturalHeight*scale;}
    else if(fit!=='fill')warn('IMAGE_OBJECT_FIT_UNSUPPORTED',source.id,fit);
    const position=(source.style.objectPosition||'50% 50%').trim().split(/\s+/),offset=(value,space,axis)=>{const normalized=({left:'0%',right:'100%',top:'0%',bottom:'100%',center:'50%'})[value]??value;if(/^[+-]?(?:\d*\.\d+|\d+)%$/.test(normalized))return space*parseFloat(normalized)/100;if(/^[+-]?(?:\d*\.\d+|\d+)(?:px)?$/.test(normalized))return parseFloat(normalized);warn('IMAGE_OBJECT_POSITION_UNSUPPORTED',source.id,axis);return space/2;};
    if(position.length>2)warn('IMAGE_OBJECT_POSITION_UNSUPPORTED',source.id,'Only resolved two-axis percentages/pixel offsets are implemented.');
    const image=await importSvg(svg,{...source,rect:{x:0,y:0,width:renderedWidth,height:renderedHeight}},clip,'Synthetic SVG image');
    checkExpected([image.id]); image.x=offset(position[0]??'50%',width-renderedWidth,'x');image.y=offset(position[1]??'50%',height-renderedHeight,'y');rememberExpected(image,entryById.get(image.id));
    if(fit==='fill'&&Math.abs(width/height-naturalWidth/naturalHeight)>.00001)warn('SVG_OBJECT_FIT_FILL_SEMANTICS_NOT_VERIFIED',source.id);
  }
  async function renderSource(source) {
    let context;
    if(source.id===capture.rootId)context=await figma.getNodeByIdAsync(ledger.rootNodeId);
    else{
      const parent=await figma.getNodeByIdAsync(ledger.contextNodeIds[source.stackingContextId??capture.rootId]);ensure(parent,'FEEDBACK_NATIVE_CONTEXT_MISSING');context=parent;
      if(source.establishesStackingContext){context=frame(source.id,'Stacking context',parent,viewportRect);context.opacity=source.kind==='svg'?1:Math.max(0,Math.min(1,parseFloat(source.style.opacity)||0));ledger.contextNodeIds[source.id]=context.id;}
    }
    const clip=clipFor(source);if(!clip){warn('FULLY_CLIPPED_SOURCE',source.id);rememberFinishedNodes();return;}
    const clipFrame=frame(source.id,'Overflow clip',context,clip);clipFrame.clipsContent=true;
    const bounds=frame(source.id,autoLabels.has(source.id)?'Auto Layout label':'Source bounds',clipFrame,{x:source.rect.x-clip.x,y:source.rect.y-clip.y,width:source.rect.width,height:source.rect.height},autoLabels.has(source.id));
    ledger.nativeNodeIdByCaptureId[source.id]=bounds.id;batchMappings[source.id]=bounds.id;
    if(source.kind==='svg'){const plan=svgRigidPlans.get(source.id),viewportSource=plan?{...source,rect:{...source.rect,width:plan.width,height:plan.height}}:source,matched=sourceLibraryComponents.get(source.id);let svg;if(matched&&Math.abs(matched.component.width-viewportSource.rect.width)<=.001&&Math.abs(matched.component.height-viewportSource.rect.height)<=.001)svg=await importSvgInstance(matched,viewportSource,bounds);else{if(matched)warn('SVG_LIBRARY_VIEWPORT_MISMATCH',source.id,'A rigid ancestor requires the untransformed CSS viewport; the mismatching template is not resized.');svg=await importSvg(source.svg,viewportSource,bounds);}if(plan){checkExpected([svg.id]);svg.relativeTransform=copy(plan.matrix);entryById.get(svg.id).ancestorRigidTransform=copy(plan);mutatedNodeIds.add(svg.id);rememberExpected(svg,entryById.get(svg.id));}if(Math.abs(svg.width-viewportSource.rect.width)>.25||Math.abs(svg.height-viewportSource.rect.height)>.25)warn('SVG_NATIVE_VIEWPORT_DIMENSIONS_DIFFER',source.id,`${svg.width}x${svg.height}`);}
    else if(source.kind==='text')await drawText(source,bounds);
    else if(source.kind==='image')await drawImage(source,bounds);
    else if(['canvas','iframe','video','audio'].includes(source.tag))warn('UNSUPPORTED_SURFACE_NOT_RENDERED',source.id,source.tag);
    else{
      const shape=await drawBox(source,bounds);
      if(autoLabels.has(source.id)){
        if(shape){shape.layoutPositioning='ABSOLUTE';shape.x=0;shape.y=0;}
        const label=autoLabels.get(source.id),box=source.rect,declaredLineHeight=parseFloat(label.style.lineHeight),labelLineHeight=Number.isFinite(declaredLineHeight)?declaredLineHeight:label.rect.height;
        const top=Math.max(0,label.rect.y-box.y-(labelLineHeight-label.rect.height)/2);
        bounds.primaryAxisSizingMode='FIXED';bounds.counterAxisSizingMode='FIXED';bounds.primaryAxisAlignItems='MIN';bounds.counterAxisAlignItems='MIN';bounds.itemSpacing=0;bounds.paddingLeft=Math.max(0,label.rect.x-box.x);bounds.paddingRight=Math.max(0,box.x+box.width-label.rect.x-label.rect.width);bounds.paddingTop=top;bounds.paddingBottom=Math.max(0,box.height-top-labelLineHeight);const texts=await drawText(label,bounds,true);if(texts[0]){ledger.nativeNodeIdByCaptureId[label.id]=texts[0].id;batchMappings[label.id]=texts[0].id;}ledger.autoLayoutCount++;
      }
      if(source.kind==='pseudo'&&source.text)await drawText(source,bounds);
      if(source.controlText?.renderedText)await drawControlText(source,bounds);
    }
    if(source.style.backgroundImage&&source.style.backgroundImage!=='none')warn('CSS_BACKGROUND_IMAGE_NOT_RENDERED',source.id);
    if(parseFloat(source.style.outlineWidth)>0&&source.style.outlineStyle!=='none')warn('CSS_OUTLINE_NOT_RENDERED',source.id);
    if(source.kind!=='pseudo'&&source.kind!=='svg'&&source.style.transform&&source.style.transform!=='none')warn('ELEMENT_TRANSFORM_BOUNDING_BOX_ONLY',source.id);
    rememberFinishedNodes();
  }
  let stage='BEGIN';const start=ledger.cursor;
  try{
    ledger.pending=true;intent('BEGIN_BATCH');persist();
    if(!ledger.rootNodeId){
      stage='CREATE_SCENE';const right=requestedPosition?0:Math.max(0,...page.children.map(node=>(Number(node.x)||0)+(Number(node.width)||0)));const root=frame(capture.rootId,'Scene',page,{x:requestedPosition?.x??right+80,y:requestedPosition?.y??0,width:capture.viewport.width,height:capture.viewport.height});root.name=`Feedback Fidelity/${operationKey}/${capture.name??capture.id}`;root.clipsContent=true;root.opacity=Math.max(0,Math.min(1,parseFloat(sources.get(capture.rootId).style.opacity)||0));ledger.rootNodeId=root.id;ledger.contextNodeIds[capture.rootId]=root.id;rememberExpected(root,entryById.get(root.id));
    }
    const stop=Math.min(units.length,start+batchSize);
    for(let index=start;index<stop;index++){stage=`SOURCE:${units[index]}`;intent(stage);await renderSource(sources.get(units[index]));ledger.cursor=index+1;}
    stage='SNAPSHOT';
    const snapshotDirty = new Set([...createdNodeIds, ...mutatedNodeIds]), updates = [];
    for(const entry of ledger.entries){
      // Preserve untouched evidence. Re-reading it here would adopt an external
      // edit made after the full batch-entry audit instead of detecting drift.
      if(!snapshotDirty.has(entry.id)&&(entry.snapshotHash||entry.snapshot))continue;
      const node=await figma.getNodeByIdAsync(entry.id);guard();checkExpected([entry.id]);ensure(node,'FEEDBACK_NATIVE_CREATED_NODE_MISSING');if(libraryRefs)for(const field of ['fills','strokes'])if(Array.isArray(node[field]))verifyPaintReadback(node,field,node[field]);const value=snapshot(node,entry);updates.push({node,entry,value});
    }
    checkExpected(snapshotDirty);
    for(const {node,entry,value} of updates){if(ledger.snapshotStorage==='SHA256'){entry.snapshotHash=sha256(JSON.stringify(value));delete entry.snapshot;}else entry.snapshot=value;rememberExpected(node,entry,value);}
    ledger.complete=ledger.cursor===units.length;ledger.pending=false;persist();setData(page,`${prefix}intent`,'');pendingIntent=null;
    return response(ledger.complete?'COMPLETE':'APPLIED_BATCH',{processedThisBatch:ledger.cursor-start,autoLayoutCount:ledger.autoLayoutCount,verification:{nativeReadback:'OBSERVED',sourceFidelity:'NOT VERIFIED',visual:'NOT RUN',present:'NOT RUN'}});
  }catch(error){
    ledger.pending=true;ledger.failedStage=stage;ledger.failure=String(error?.message??error).slice(0,300);let ledgerSaved=false;
    try{persist();ledgerSaved=true;}catch{/* intent remains set; returned IDs are also the caller's recovery evidence */}
    return response('FAILED',{error:ledger.failure,failedStage:stage,ledgerSaved,processedThisBatch:ledger.cursor-start,pending:true});
  }
}
