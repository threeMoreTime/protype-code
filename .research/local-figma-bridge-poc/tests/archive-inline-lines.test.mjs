import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { adaptCaptures } from '../capture/adapter.mjs';
import { validateDesignSpec } from '../design/spec.mjs';
import { applyArchiveInlineLineProof } from '../capture/archive-inline-lines.mjs';

const sha = v => createHash('sha256').update(v).digest('hex');
const keys = ['fontFamily','fontSize','fontWeight','fontStyle','lineHeight','letterSpacing','whiteSpace','textAlign','textTransform','textDecorationLine'];
const style = { display:'inline',color:'#333333',backgroundColor:'transparent',fontFamily:'Noto Sans SC',fontSize:'10px',fontWeight:'400',fontStyle:'normal',lineHeight:'20px',letterSpacing:'0px',textAlign:'left',whiteSpace:'normal',textTransform:'none',textDecorationLine:'none',direction:'ltr',writingMode:'horizontal-tb',opacity:'1',transform:'none',overflowX:'visible',overflowY:'visible',paddingLeft:'0px',paddingRight:'0px',borderLeftWidth:'0px',borderRightWidth:'0px' };
function fixture() {
  const box = { x:10,y:20,width:60,height:30 };
  const capture = { id:'compact-search',name:'unit fixture',viewport:{width:200,height:120},root:{id:'body',kind:'element',tag:'body',rect:{x:0,y:0,width:200,height:120},style:{...style,display:'block'},children:[
    {id:'d90',kind:'element',tag:'div',rect:{x:10,y:20,width:100,height:30},style:{...style,display:'block'},children:[
      {id:'d91',kind:'element',tag:'span',rect:{x:10,y:20,width:20,height:10},style:{...style,fontWeight:'700'},children:[{id:'d91-t0',kind:'text',text:'题',rect:{x:10,y:20,width:20,height:10},style:{...style,fontWeight:'700'}}]},
      {id:'d92',kind:'element',tag:'span',rect:{...box},style:{...style},children:[{id:'d92-t0',kind:'text',text:'甲乙丙丁',rect:{...box},style:{...style}}]},
      {id:'code',kind:'element',tag:'code',rect:{x:80,y:20,width:20,height:10},style:{...style,backgroundColor:'#eeeeee',fontFamily:'Consolas'},children:[{id:'code-t0',kind:'text',text:'\\\\',rect:{x:80,y:20,width:20,height:10},style:{...style,fontFamily:'Consolas'}}]}
    ]}
  ]}};
  const converted = adaptCaptures([capture]);
  const chars = [...'甲乙丙丁'].map((text,i) => ({ start:i,end:i+1,rawStart:i,rawEnd:i+1,text,rects:[{x:i<2?30+i*20:10+(i-2)*20,y:i<2?20:40,width:20,height:10}] }));
  const lines = [{start:0,end:2,text:'甲乙',x:30,y:20,width:40,height:10},{start:2,end:4,text:'丙丁',x:10,y:40,width:40,height:10}];
  const proofNode = { id:'d92-t0',parentId:'d92',status:'PASS',checks:Object.fromEntries(['text','fontAndStyleDeclarations','unionGeometry','parentGeometry','stableRepeat','bodyGeometry','viewport'].map(k=>[k,'PASS'])),exactGeometry:{union:'PASS',parent:'PASS',body:'PASS'},sourceText:'甲乙丙丁',replayText:'甲乙丙丁',sourceTextSha256:sha('甲乙丙丁'),replayTextSha256:sha('甲乙丙丁'),sourceRect:{...box},replayUnion:{...box},sourceParentRect:{...box},replayParentRect:{...box},sourceStyle:Object.fromEntries(keys.map(k=>[k,style[k]])),replayStyle:Object.fromEntries(keys.map(k=>[k,style[k]])),replayClientRects:lines.map(({x,y,width,height})=>({x,y,width,height})),characterRectProof:chars,derivedLines:{status:'PASS',lines},doubleReadProof:{firstSha256:'a'.repeat(64),secondSha256:'a'.repeat(64),secondUnion:{...box},secondParentRect:{...box},secondBodyRect:{...capture.root.rect},secondClientRects:lines.map(({x,y,width,height})=>({x,y,width,height})),firstCharacterRectSha256:sha(JSON.stringify(chars)),secondCharacterRectSha256:sha(JSON.stringify(chars))} };
  const proof = { derivation:'ARCHIVE_HTML_REPLAY_DERIVED',proofPolicy:{qualification:'RAW_NUMERIC_EQUALITY_ONLY'},configuration:{forcePhysicalScale:true,showScrollbars:true,fixedFont:null},safety:{isolatedNewHeadlessBrowser:true,userBrowserOrFigmaAttached:false,javaScriptEnabled:false,serviceWorkers:'block',offline:true,networkRoutes:'abort-all'},scene:{scene:capture.id,captureSha256:'b'.repeat(64),captureCanonicalSha256:sha(JSON.stringify(capture)),htmlSha256:'c'.repeat(64),originalViewport:{...capture.viewport},replayViewport:{...capture.viewport,dpr:1.25},originalBodyRect:{...capture.root.rect},replayBodyRect:{...capture.root.rect},originalFilesUnchanged:true,nodes:[proofNode]} };
  return { capture,spec:converted.spec,mappings:converted.manifest.mappings,proof,allowlist:['compact-search/d92-t0'],enabled:true };
}
const node = (result,key) => result.spec.nodes.find(n=>n.key===key);

test('explicit proved multiline derivation preserves originals, bold, code box, resources and editable characters',()=>{
  const f=fixture(),before=structuredClone(f),r=applyArchiveInlineLineProof(f);
  assert.deepEqual(f,before);validateDesignSpec(r.spec);
  assert.equal(r.report.changedCount,1);assert.equal(r.spec.nodes.length,f.spec.nodes.length+2);
  assert.equal(node(r,'compact-search/d92-t0').props.visible,false);
  assert.equal(node(r,'compact-search/d92-t0').props.characters,'甲乙丙丁');
  const added=r.spec.nodes.filter(n=>!f.spec.nodes.some(o=>o.key===n.key));
  assert.deepEqual(added.map(n=>n.props.characters),['甲乙','丙丁']);
  assert.deepEqual(added.map(n=>[n.x,n.y,n.width,n.height]),[[20,0,40,10],[0,20,40,10]]);
  assert.ok(added.every(n=>n.type==='TEXT'&&n.parentKey==='compact-search/d92'&&n.props.fontName.family==='Noto Sans SC'&&n.props.textAutoResize==='NONE'));
  for(const original of f.spec.nodes.filter(n=>n.key!=='compact-search/d92-t0'))assert.deepEqual(node(r,original.key),original);
  assert.deepEqual(r.spec.textStyles,f.spec.textStyles);assert.deepEqual(r.spec.variables,f.spec.variables);assert.deepEqual(r.spec.reactions,f.spec.reactions);
  assert.equal(r.report.nativeFit,'NOT_RUN');assert.equal(r.report.pendingNativeMeasurements.length,2);
  assert.equal(r.report.applied[0].provenance.derivation,'ARCHIVE_HTML_REPLAY_DERIVED');
});
test('derived lines preserve the source position between overlapping same-parent siblings',()=>{
  const f=fixture(),container=f.capture.root.children[0],parent=container.children[1];
  const after=container.children.pop();
  after.rect={x:30,y:20,width:20,height:10};
  after.children[0].rect={...after.rect};
  const before=structuredClone(after);before.id='code-before';before.children[0].id='code-before-t0';
  parent.children.unshift(before);parent.children.push(after);
  const converted=adaptCaptures([f.capture]);f.spec=converted.spec;f.mappings=converted.manifest.mappings;
  f.proof.scene.captureCanonicalSha256=sha(JSON.stringify(f.capture));
  const original=structuredClone(f),r=applyArchiveInlineLineProof(f);
  assert.equal(r.report.changedCount,1);assert.deepEqual(r.report.rejected,[]);
  assert.deepEqual(r.spec.nodes.filter(n=>n.parentKey==='compact-search/d92').map(n=>n.key),[
    'compact-search/code-before','compact-search/d92-t0',
    'compact-search/d92-t0/archive-line-1','compact-search/d92-t0/archive-line-2','compact-search/code'
  ]);
  const lineKeys=new Set(r.report.applied[0].lineKeys);
  assert.deepEqual(r.spec.nodes.filter(n=>!lineKeys.has(n.key)).map(n=>n.key),f.spec.nodes.map(n=>n.key));
  for(const sibling of f.spec.nodes.filter(n=>n.key!=='compact-search/d92-t0'))assert.deepEqual(node(r,sibling.key),sibling);
  assert.deepEqual(f,original);
  const again=applyArchiveInlineLineProof({...f,spec:r.spec});assert.deepEqual(again.spec,r.spec);assert.equal(again.report.changedCount,0);
});
test('default and empty allowlist do not apply changes',()=>{
  for(const options of [{enabled:false},{enabled:undefined},{allowlist:[]}]){
    const f=fixture(),r=applyArchiveInlineLineProof({...f,...options});assert.deepEqual(r.spec,f.spec);assert.equal(r.report.changedCount,0);
  }
});
for(const [name,mutate,reason] of [
  ['approximate geometry',f=>f.proof.scene.nodes[0].exactGeometry.union='FAIL','PROOF_NOT_EXACT'],
  ['original source hash drift',f=>f.proof.scene.captureCanonicalSha256='d'.repeat(64),'CAPTURE_HASH_MISMATCH'],
  ['character source changed',f=>f.capture.root.children[0].children[1].children[0].text='甲乙改丁','CAPTURE_HASH_MISMATCH'],
  ['source font changed',f=>f.proof.scene.nodes[0].sourceStyle.fontWeight='700','FONT_OR_STYLE_PROOF_MISMATCH'],
  ['unsafe browser run',f=>f.proof.safety.javaScriptEnabled=true,'UNSAFE_PROOF_ENVIRONMENT'],
  ['missing physical scale',f=>f.proof.configuration.forcePhysicalScale=false,'UNPROVEN_RECONSTRUCTION_CONFIGURATION'],
  ['missing scrollbar restoration',f=>f.proof.configuration.showScrollbars=false,'UNPROVEN_RECONSTRUCTION_CONFIGURATION'],
  ['unstable double read',f=>f.proof.scene.nodes[0].doubleReadProof.secondSha256='e'.repeat(64),'DOUBLE_READ_MISMATCH'],
  ['second geometry drift',f=>f.proof.scene.nodes[0].doubleReadProof.secondUnion.x+=0.000001,'DOUBLE_READ_MISMATCH'],
  ['unproved character rectangle',f=>f.proof.scene.nodes[0].characterRectProof[0].rects[0].x+=1,'CHARACTER_PROOF_HASH_MISMATCH'],
  ['line character changed',f=>f.proof.scene.nodes[0].derivedLines.lines[0].text='甲改','LINE_MAPPING_MISMATCH'],
  ['line geometry changed',f=>f.proof.scene.nodes[0].derivedLines.lines[0].x+=1,'LINE_MAPPING_MISMATCH'],
  ['native geometry edited',f=>f.spec.nodes.find(n=>n.key==='compact-search/d92-t0').x+=1,'SPEC_SOURCE_DRIFT'],
  ['native text edited',f=>f.spec.nodes.find(n=>n.key==='compact-search/d92-t0').props.characters+='新','SPEC_SOURCE_DRIFT'],
  ['source reaction',f=>f.spec.reactions=[{sourceKey:'compact-search/d92-t0',destinationKey:'compact-search/scene',trigger:{type:'ON_CLICK'}}],'INTERACTION_PROTECTED'],
  ['node budget',f=>f.maxNewNodes=1,'NODE_BUDGET_EXCEEDED'],
  ['generated key collision',f=>f.spec.nodes.push({...structuredClone(f.spec.nodes.find(n=>n.key==='compact-search/d92-t0')),key:'compact-search/d92-t0/archive-line-1'}),'LINE_KEY_COLLISION'],
]) test(`preserves original for ${name}`,()=>{
  const f=fixture();mutate(f);const before=structuredClone(f.spec),r=applyArchiveInlineLineProof(f);
  assert.deepEqual(r.spec,before);assert.equal(r.report.changedCount,0);assert.equal(r.report.rejected[0].reason,reason);
});
test('single-line proof is preserved even when explicitly listed',()=>{
  const f=fixture(),p=f.proof.scene.nodes[0];p.derivedLines.lines=[{start:0,end:4,text:p.sourceText,x:10,y:20,width:60,height:30}];
  const r=applyArchiveInlineLineProof(f);assert.equal(r.report.changedCount,0);assert.equal(r.report.rejected[0].reason,'NOT_MULTILINE_CONTINUATION');
});
test('line key insertion and provenance are deterministic and repeat input does not mutate',()=>{
  const f=fixture(),one=applyArchiveInlineLineProof(f),two=applyArchiveInlineLineProof(f);assert.deepEqual(one,two);
  const again=applyArchiveInlineLineProof({...f,spec:one.spec});assert.deepEqual(again.spec,one.spec);assert.equal(again.report.changedCount,0);
});
test('surrogate boundary in explicit line mapping is rejected without deleting original text',()=>{
  const f=fixture(),text='甲😀丁';const raw=f.capture.root.children[0].children[1].children[0];raw.text=text;
  f.spec.nodes.find(n=>n.key==='compact-search/d92-t0').props.characters=text;
  f.proof.scene.captureCanonicalSha256=sha(JSON.stringify(f.capture));const p=f.proof.scene.nodes[0];p.sourceText=p.replayText=text;p.sourceTextSha256=p.replayTextSha256=sha(text);
  p.derivedLines.lines[0].text=text.slice(0,2);p.derivedLines.lines[1].text=text.slice(2);
  const r=applyArchiveInlineLineProof(f);assert.equal(r.report.changedCount,0);assert.equal(r.report.rejected[0].reason,'LINE_MAPPING_MISMATCH');
});
test('untrusted plain data rejects cycles, prototype pollution and unsafe options',()=>{
  const f=fixture();assert.throws(()=>applyArchiveInlineLineProof({...f,maxNewNodes:-1}),/maxNewNodes/);
  const cycle=fixture();cycle.proof.scene.self=cycle.proof.scene;assert.throws(()=>applyArchiveInlineLineProof(cycle),/cyclic/);
  const polluted=fixture();polluted.proof.scene=JSON.parse('{"__proto__":{}}');assert.throws(()=>applyArchiveInlineLineProof(polluted),/Unsafe/);
});
test('shared extracted text style and variable paints survive without global style mutation',()=>{
  const f=fixture(),target=f.spec.nodes.find(n=>n.key==='compact-search/d92-t0');
  const typography={key:'shared-body',name:'Body',fontName:{family:'Noto Sans SC',style:'Regular'},fontSize:10,lineHeight:{unit:'PIXELS',value:20},letterSpacing:{unit:'PIXELS',value:0}};
  f.spec.textStyles.push(typography);for(const k of ['fontName','fontSize','fontWeight','lineHeight','letterSpacing'])delete target.props[k];target.props.textStyleKey=typography.key;
  const before=structuredClone(f.spec),r=applyArchiveInlineLineProof(f);assert.equal(r.report.changedCount,1);assert.deepEqual(r.spec.textStyles,before.textStyles);
  for(const key of r.report.applied[0].lineKeys){assert.equal(node(r,key).props.textStyleKey,'shared-body');assert.deepEqual(node(r,key).props.fills,target.props.fills);}
  assert.deepEqual(r.report.pendingNativeMeasurements.map(m=>m.fontName),[typography.fontName,typography.fontName]);
});
test('component-owned subtree is preserved because extra children alter component semantics',()=>{
  const f=fixture();f.spec.nodes.find(n=>n.key==='compact-search/scene').type='COMPONENT';f.spec.flows=[];
  const r=applyArchiveInlineLineProof(f);assert.equal(r.report.changedCount,0);assert.equal(r.report.rejected[0].reason,'COMPONENT_OR_INSTANCE_PROTECTED');
});
test('unknown or duplicate mappings and allowlists reject malformed external input',()=>{
  const f=fixture();assert.throws(()=>applyArchiveInlineLineProof({...f,allowlist:[f.allowlist[0],f.allowlist[0]]}),/allowlist/);
  assert.throws(()=>applyArchiveInlineLineProof({...f,mappings:[...f.mappings,f.mappings[0]]}),/Duplicate source mapping/);
  assert.throws(()=>applyArchiveInlineLineProof({...f,unexpected:true}),/Unknown option/);
});
function consistentUnicodeFixture(text) {
  const f=fixture(),p=f.proof.scene.nodes[0];f.capture.root.children[0].children[1].children[0].text=text;
  f.spec.nodes.find(n=>n.key==='compact-search/d92-t0').props.characters=text;
  f.proof.scene.captureCanonicalSha256=sha(JSON.stringify(f.capture));p.sourceText=p.replayText=text;p.sourceTextSha256=p.replayTextSha256=sha(text);
  p.characterRectProof.forEach((unit,i)=>unit.text=text.slice(i,i+1));
  p.derivedLines.lines[0].text=text.slice(0,2);p.derivedLines.lines[1].text=text.slice(2);
  p.doubleReadProof.firstCharacterRectSha256=p.doubleReadProof.secondCharacterRectSha256=sha(JSON.stringify(p.characterRectProof));
  return f;
}
test('fully matching proof cannot split a valid surrogate pair into individually consistent units',()=>{
  const f=consistentUnicodeFixture('甲😀丁'),before=structuredClone(f.spec),r=applyArchiveInlineLineProof(f);
  assert.deepEqual(r.spec,before);assert.equal(r.report.changedCount,0);assert.equal(r.report.rejected[0].reason,'LINE_MAPPING_MISMATCH');
});
test('an unpaired original surrogate is explicitly preserved and rejected',()=>{
  const f=consistentUnicodeFixture('甲\uD83D乙丁'),before=structuredClone(f.spec),r=applyArchiveInlineLineProof(f);
  assert.deepEqual(r.spec,before);assert.equal(r.report.changedCount,0);assert.equal(r.report.rejected[0].reason,'UNICODE_SCALAR_UNSAFE');
});
test('a complete supplementary scalar stays paired in its editable line and is accepted',()=>{
  const f=consistentUnicodeFixture('甲😀丁'),p=f.proof.scene.nodes[0];
  p.characterRectProof=[{...p.characterRectProof[0]},{...p.characterRectProof[1],text:'😀',end:3,rawEnd:3},{...p.characterRectProof[3],start:3,end:4,rects:[{x:10,y:40,width:40,height:10}]}];
  p.derivedLines.lines[0].text='甲😀';p.derivedLines.lines[0].end=3;p.derivedLines.lines[1].text='丁';p.derivedLines.lines[1].start=3;
  p.doubleReadProof.firstCharacterRectSha256=p.doubleReadProof.secondCharacterRectSha256=sha(JSON.stringify(p.characterRectProof));
  const r=applyArchiveInlineLineProof(f);assert.equal(r.report.changedCount,1);assert.deepEqual(r.report.applied[0].lineKeys.map(k=>node(r,k).props.characters),['甲😀','丁']);
});
test('a proof from a different parent is rejected even when all claimed rectangles remain identical',()=>{
  const f=fixture();f.proof.scene.nodes[0].parentId='d90';const before=structuredClone(f.spec),r=applyArchiveInlineLineProof(f);
  assert.deepEqual(r.spec,before);assert.equal(r.report.changedCount,0);assert.equal(r.report.rejected[0].reason,'PARENT_PROOF_MISMATCH');
});
