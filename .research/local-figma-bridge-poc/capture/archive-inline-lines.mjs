import { createHash } from 'node:crypto';
import { validateDesignSpec, DESIGN_SPEC_LIMITS } from '../design/spec.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
const hex = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const stableKey = value => typeof value === 'string' && value.length <= 160 && /^[A-Za-z0-9][A-Za-z0-9_.:/-]*$/.test(value);
const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const rect = value => value && ['x','y','width','height'].every(k=>Number.isFinite(value[k])) && value.width > 0 && value.height > 0;
const sameRect = (a,b) => rect(a) && rect(b) && ['x','y','width','height'].every(k=>a[k]===b[k]);
const styleKeys = ['fontFamily','fontSize','fontWeight','fontStyle','lineHeight','letterSpacing','whiteSpace','textAlign','textTransform','textDecorationLine'];
function scalarText(text) {
  if(typeof text!=='string')return false;
  for(let i=0;i<text.length;i++) {
    const code=text.charCodeAt(i);
    if(code>=0xd800&&code<=0xdbff) {const next=text.charCodeAt(++i);if(!(next>=0xdc00&&next<=0xdfff))return false;}
    else if(code>=0xdc00&&code<=0xdfff)return false;
  }
  return true;
}

function dataOnly(value, name) {
  let objects=0, stringBytes=0;
  const active=new Set();
  function visit(v,depth) {
    if (depth>128) throw new TypeError(`${name}: data depth exceeded`);
    if (v===null || ['boolean','number','undefined'].includes(typeof v)) { if(typeof v==='number'&&!Number.isFinite(v)) throw new TypeError(`${name}: non-finite number`); return; }
    if (typeof v==='string') { stringBytes+=v.length; if(stringBytes>32000000) throw new TypeError(`${name}: string budget exceeded`); return; }
    if (typeof v!=='object' || ![Object.prototype,null,Array.prototype].includes(Object.getPrototypeOf(v))) throw new TypeError(`${name}: plain data required`);
    if(Object.getOwnPropertySymbols(v).length)throw new TypeError(`${name}: Unsafe symbol property`);
    if(active.has(v)) throw new TypeError(`${name}: cyclic input`);
    if(++objects>500000) throw new TypeError(`${name}: object budget exceeded`);
    active.add(v);
    for(const [key,descriptor] of Object.entries(Object.getOwnPropertyDescriptors(v))) {
      if(['__proto__','constructor','prototype'].includes(key) || descriptor.get || descriptor.set) throw new TypeError(`${name}: Unsafe property`);
      if(Array.isArray(v)&&key==='length') continue;
      visit(descriptor.value,depth+1);
    }
    active.delete(v);
  }
  visit(value,0);
}
function sourceIndex(capture) {
  const map=new Map();
  function walk(node,parent=null,ancestors=[]) {
    if(!node || !stableKey(node.id) || map.has(node.id) || map.size>=DESIGN_SPEC_LIMITS.nodes) throw new TypeError('Invalid or duplicate capture node');
    map.set(node.id,{node,parent,ancestors});
    if(node.children!==undefined&&!Array.isArray(node.children)) throw new TypeError('Capture children must be an array');
    for(const child of node.children??[]) walk(child,node,[...ancestors,node]);
  }
  walk(capture.root);return map;
}
function linesFromUnits(units,text) {
  if(!Array.isArray(units)||!units.length||units.length>100000) return null;
  const lines=[];let offset=0;
  for(const unit of units) {
    if(!unit || unit.start!==offset || !Number.isInteger(unit.end) || unit.end<=offset || unit.end>text.length || unit.text!==text.slice(offset,unit.end) || !scalarText(unit.text) || [...unit.text].length!==1 || !Array.isArray(unit.rects)) return null;
    const distinct=[];
    for(const box of unit.rects) { if(!rect(box)) return null; if(!distinct.some(r=>sameRect(r,box)))distinct.push(box); }
    if(distinct.length!==1)return null;
    const box=distinct[0];let line=lines.at(-1);
    if(!line || line.y!==box.y || line.height!==box.height) {
      line={start:offset,end:unit.end,text:unit.text,x:box.x,y:box.y,width:box.width,height:box.height};lines.push(line);
    } else {
      if(box.x<line.x)return null;
      line.width=Math.max(line.x+line.width,box.x+box.width)-line.x;line.end=unit.end;line.text+=unit.text;
    }
    offset=unit.end;
  }
  return offset===text.length&&lines.length<=32 ? lines : null;
}
function unionOf(lines) {
  const x=Math.min(...lines.map(l=>l.x)),y=Math.min(...lines.map(l=>l.y));
  return {x,y,width:Math.max(...lines.map(l=>l.x+l.width))-x,height:Math.max(...lines.map(l=>l.y+l.height))-y};
}

/** Data-only, opt-in derivation. Never reads files, loads fonts, or mutates input.
 * proof accepts the measurement report's current scene wrapper, or current scenes.
 * Provenance stays in report because DesignSpec has no node-provenance property.
 * New glyph rectangles require native double measurement before delivery PASS.
 */
export function applyArchiveInlineLineProof(input) {
  dataOnly(input,'input');
  if(!input || typeof input!=='object' || Array.isArray(input))throw new TypeError('Expected options object');
  const allowed=['capture','spec','mappings','proof','allowlist','enabled','maxNewNodes'];
  for(const key of Object.keys(input))if(!allowed.includes(key))throw new TypeError(`Unknown option ${key}`);
  if(input.enabled!==undefined&&typeof input.enabled!=='boolean')throw new TypeError('enabled must be boolean');
  const maxNewNodes=input.maxNewNodes??64;
  if(!Number.isInteger(maxNewNodes)||maxNewNodes<0||maxNewNodes>1024)throw new TypeError('maxNewNodes must be an integer in [0,1024]');
  const allowlist=input.allowlist??[];
  if(!Array.isArray(allowlist)||allowlist.length>1000||allowlist.some(k=>!stableKey(k))||new Set(allowlist).size!==allowlist.length)throw new TypeError('Invalid allowlist');
  const spec=structuredClone(validateDesignSpec(input.spec));
  const report={mode:'archive-inline-lines',changedCount:0,hiddenOriginalCount:0,newNodeCount:0,applied:[],rejected:[],pendingNativeMeasurements:[],nativeFit:'NOT_RUN'};
  if(input.enabled!==true||!allowlist.length)return {spec,report};
  const {capture,proof,mappings}=input;
  if(!capture || !stableKey(capture.id) || !Array.isArray(mappings) || mappings.length>DESIGN_SPEC_LIMITS.nodes || !proof)throw new TypeError('capture, mappings and proof are required for enabled derivation');
  const sources=sourceIndex(capture),nodes=new Map(spec.nodes.map(n=>[n.key,n]));
  const mapped=new Map();
  for(const m of mappings) {
    if(!m || !stableKey(m.sceneId) || !stableKey(m.sourceId) || !stableKey(m.nodeKey))throw new TypeError('Invalid mapping');
    const key=`${m.sceneId}/${m.sourceId}`;
    if(mapped.has(key))throw new TypeError('Duplicate source mapping');
    mapped.set(key,m.nodeKey);
  }
  const scene=proof.scene??proof.scenes?.find(s=>s.scene===capture.id);
  const proofNodes=new Map();
  if(scene?.nodes) {
    if(!Array.isArray(scene.nodes)||scene.nodes.length>DESIGN_SPEC_LIMITS.nodes)throw new TypeError('Invalid proof nodes');
    for(const p of scene.nodes) { if(!p || !stableKey(p.id) || proofNodes.has(p.id))throw new TypeError('Invalid or duplicate proof node'); proofNodes.set(p.id,p); }
  }
  const protectedKeys=new Set((spec.reactions??[]).flatMap(r=>[r.sourceKey,r.destinationKey]));
  for(const n of spec.nodes)for(const override of n.props?.overrides??[])protectedKeys.add(override.sourceKey);
  const reject=(sourceKey,reason)=>report.rejected.push({sourceKey,reason});
  for(const sourceKey of allowlist) {
    const sourceId=sourceKey.startsWith(`${capture.id}/`)?sourceKey.slice(capture.id.length+1):null;
    const record=sources.get(sourceId),target=nodes.get(mapped.get(sourceKey)),p=proofNodes.get(sourceId);
    const s=proof.safety,c=proof.configuration;
    if(!s || s.isolatedNewHeadlessBrowser!==true || s.userBrowserOrFigmaAttached!==false || s.javaScriptEnabled!==false || s.offline!==true || s.serviceWorkers!=='block' || s.networkRoutes!=='abort-all') {reject(sourceKey,'UNSAFE_PROOF_ENVIRONMENT');continue;}
    if(!c || c.forcePhysicalScale!==true || c.showScrollbars!==true || c.fixedFont!==null) {reject(sourceKey,'UNPROVEN_RECONSTRUCTION_CONFIGURATION');continue;}
    if(!scene || scene.scene!==capture.id || !hex(scene.captureSha256) || !hex(scene.htmlSha256) || scene.captureCanonicalSha256!==sha(JSON.stringify(capture))) {reject(sourceKey,'CAPTURE_HASH_MISMATCH');continue;}
    if(!record || !target || target.type!=='TEXT' || !p || !record.parent || record.node.kind!=='text') {reject(sourceKey,'SOURCE_MAPPING_MISSING');continue;}
    if(p.parentId!==record.parent.id){reject(sourceKey,'PARENT_PROOF_MISMATCH');continue;}
    if(proof.derivation!=='ARCHIVE_HTML_REPLAY_DERIVED' || proof.proofPolicy?.qualification!=='RAW_NUMERIC_EQUALITY_ONLY' || p.status!=='PASS' || !['union','parent','body'].every(k=>p.exactGeometry?.[k]==='PASS') || !['text','fontAndStyleDeclarations','unionGeometry','parentGeometry','stableRepeat','bodyGeometry','viewport'].every(k=>p.checks?.[k]==='PASS') || scene.originalFilesUnchanged!==true) {reject(sourceKey,'PROOF_NOT_EXACT');continue;}
    const raw=record.node,parent=record.parent;
    if(!sameRect(scene.originalBodyRect,capture.root.rect) || !sameRect(scene.replayBodyRect,capture.root.rect) || !sameRect(p.sourceRect,raw.rect) || !sameRect(p.replayUnion,raw.rect) || !sameRect(p.sourceParentRect,parent.rect) || !sameRect(p.replayParentRect,parent.rect) || !equal(scene.originalViewport,capture.viewport) || scene.replayViewport?.width!==capture.viewport.width || scene.replayViewport?.height!==capture.viewport.height || scene.replayViewport?.dpr!==1.25) {reject(sourceKey,'PROOF_NOT_EXACT');continue;}
    if(typeof raw.text!=='string' || raw.text.length>100000 || raw.text!==p.sourceText || raw.text!==p.replayText || p.sourceTextSha256!==sha(raw.text) || p.replayTextSha256!==sha(raw.text)) {reject(sourceKey,'SOURCE_TEXT_PROOF_MISMATCH');continue;}
    if(!scalarText(raw.text)){reject(sourceKey,'UNICODE_SCALAR_UNSAFE');continue;}
    if(styleKeys.some(k=>typeof raw.style?.[k]!=='string'||p.sourceStyle?.[k]!==raw.style[k]||p.replayStyle?.[k]!==raw.style[k])) {reject(sourceKey,'FONT_OR_STYLE_PROOF_MISMATCH');continue;}
    const twice=p.doubleReadProof;
    if(!twice || !hex(twice.firstSha256) || twice.firstSha256!==twice.secondSha256 || !sameRect(twice.secondUnion,raw.rect) || !sameRect(twice.secondParentRect,parent.rect) || !sameRect(twice.secondBodyRect,capture.root.rect) || !equal(twice.secondClientRects,p.replayClientRects)) {reject(sourceKey,'DOUBLE_READ_MISMATCH');continue;}
    if(twice.firstCharacterRectSha256!==sha(JSON.stringify(p.characterRectProof)) || twice.secondCharacterRectSha256!==twice.firstCharacterRectSha256) {reject(sourceKey,'CHARACTER_PROOF_HASH_MISMATCH');continue;}
    const supplied=p.derivedLines?.lines;
    if(!Array.isArray(supplied) || supplied.length<2 || supplied[0].x<=raw.rect.x) {reject(sourceKey,'NOT_MULTILINE_CONTINUATION');continue;}
    const lines=linesFromUnits(p.characterRectProof,raw.text);
    if(p.derivedLines?.status!=='PASS' || !lines || !equal(lines,supplied) || !sameRect(unionOf(lines),raw.rect)) {reject(sourceKey,'LINE_MAPPING_MISMATCH');continue;}
    if(raw.style.whiteSpace!=='normal' || !['left','start'].includes(raw.style.textAlign) || parent.tag==='code' || [raw,parent,...record.ancestors].some(n=>n.style?.direction&&n.style.direction!=='ltr'||n.style?.writingMode&&n.style.writingMode!=='horizontal-tb'||n.style?.transform!=='none') || !lines.every(l=>l.x>=parent.rect.x&&l.y>=parent.rect.y&&l.x+l.width<=parent.rect.x+parent.rect.width&&l.y+l.height<=parent.rect.y+parent.rect.height)) {reject(sourceKey,'SOURCE_LAYOUT_UNSUPPORTED');continue;}
    if(protectedKeys.has(target.key)) {reject(sourceKey,'INTERACTION_PROTECTED');continue;}
    const parentKey=mapped.get(`${capture.id}/${parent.id}`),parentNode=nodes.get(parentKey);
    if(target.parentKey!==parentKey || parentNode?.type!=='FRAME' || parentNode.width!==parent.rect.width || parentNode.height!==parent.rect.height || target.x!==raw.rect.x-parent.rect.x || target.y!==raw.rect.y-parent.rect.y || target.width!==raw.rect.width || target.height!==raw.rect.height || target.props.characters!==raw.text || target.props.visible===false || target.props.isFixed===true || !['LEFT',undefined].includes(target.props.textAlignHorizontal)) {reject(sourceKey,'SPEC_SOURCE_DRIFT');continue;}
    let ancestor=parentNode,unsafeAncestor=false;
    while(ancestor) { if(['COMPONENT','INSTANCE'].includes(ancestor.type)){unsafeAncestor=true;break;} ancestor=nodes.get(ancestor.parentKey); }
    if(unsafeAncestor){reject(sourceKey,'COMPONENT_OR_INSTANCE_PROTECTED');continue;}
    const newKeys=lines.map((_,i)=>`${target.key}/archive-line-${i+1}`);
    if(newKeys.some(k=>!stableKey(k)||nodes.has(k))) {reject(sourceKey,'LINE_KEY_COLLISION');continue;}
    if(report.newNodeCount+lines.length>maxNewNodes || spec.nodes.length+lines.length>DESIGN_SPEC_LIMITS.nodes) {reject(sourceKey,'NODE_BUDGET_EXCEEDED');continue;}
    const additions=lines.map((line,i)=>({...structuredClone(target),key:newKeys[i],name:`${(target.name??'text').slice(0,480)} / archived line ${i+1}`,x:line.x-parent.rect.x,y:line.y-parent.rect.y,width:line.width,height:line.height,props:{...structuredClone(target.props),characters:line.text,textAutoResize:'NONE'}}));
    target.props.visible=false;
    // The runtime uses specification order for sibling stacking. Keep the new
    // lines at the source's position so later siblings still cover the text.
    spec.nodes.splice(spec.nodes.indexOf(target)+1,0,...additions);
    for(const addition of additions)nodes.set(addition.key,addition);
    const typography=target.props.textStyleKey ? spec.textStyles.find(t=>t.key===target.props.textStyleKey) : target.props;
    for(const addition of additions)report.pendingNativeMeasurements.push({nodeKey:addition.key,sourceKey,characters:addition.props.characters,fontName:typography.fontName,fontSize:typography.fontSize,lineHeight:typography.lineHeight,sourceGlyphWidth:addition.width,sourceGlyphHeight:addition.height,sourceX:addition.x,sourceY:addition.y,status:'NOT_RUN',required:'Two native font/width/linebox readings before any size adaptation or delivery PASS'});
    report.applied.push({sourceKey,nodeKey:target.key,hiddenOriginalKey:target.key,lineKeys:newKeys,lines:structuredClone(lines),provenance:{derivation:'ARCHIVE_HTML_REPLAY_DERIVED',captureSha256:scene.captureSha256,captureCanonicalSha256:scene.captureCanonicalSha256,htmlSha256:scene.htmlSha256,sourceTextSha256:p.sourceTextSha256,measurementSha256:sha(JSON.stringify(p)),sourceRect:structuredClone(raw.rect),sourceStyle:structuredClone(raw.style),nativeFit:'NOT_RUN'}});
    report.changedCount++;report.hiddenOriginalCount++;report.newNodeCount+=lines.length;
  }
  validateDesignSpec(spec);return {spec,report};
}
