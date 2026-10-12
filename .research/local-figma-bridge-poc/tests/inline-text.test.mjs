import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptCaptures } from '../capture/adapter.mjs';
const style = { display:'block',color:'#333333',backgroundColor:'transparent',fontFamily:'Noto Sans SC',fontSize:'14px',fontWeight:'400',fontStyle:'normal',lineHeight:'20px',letterSpacing:'0px',textAlign:'left',whiteSpace:'normal',direction:'ltr',writingMode:'horizontal-tb',opacity:'1',transform:'none',overflowX:'visible',overflowY:'visible',paddingLeft:'5px',paddingRight:'5px',borderLeftWidth:'0px',borderRightWidth:'0px' };
function capture() {
  return { id:'home',captureVersion:'1.0',viewport:{width:400,height:300},root:{id:'root',kind:'element',tag:'body',style:{...style},rect:{x:0,y:0,width:400,height:300},children:[
    {id:'line',kind:'element',tag:'div',style:{...style},rect:{x:20,y:20,width:100,height:20},children:[
      {id:'a',kind:'text',text:'第 ',style:{...style},rect:{x:25,y:20,width:15,height:20}},
      {id:'b',kind:'text',text:'1 页',style:{...style},rect:{x:40,y:20,width:20,height:20}},
    ]},
  ]}};
}
function convert(c=capture(), options={}) { return adaptCaptures([c],{inlineText:'uniform-run',...options}); }
test('default keeps exact fragments and option preserves source input,keys and text provenance',()=>{
  const c=capture(),before=structuredClone(c);const baseline=adaptCaptures([c]);
  assert.equal(baseline.manifest.inlineText,undefined);assert.equal(baseline.spec.nodes.find(n=>n.key==='home/a').props.characters,'第 ');
  const {spec,manifest}=convert(c);const first=spec.nodes.find(n=>n.key==='home/a'),later=spec.nodes.find(n=>n.key==='home/b');
  assert.deepEqual(c,before);assert.equal(first.props.characters,'第 1 页');assert.equal(first.x,5);assert.equal(first.width,90);
  assert.equal(first.y,0);assert.equal(first.height,20);assert.equal(later.props.characters,'1 页');assert.equal(later.props.visible,false);
  assert.deepEqual(spec.nodes.map(n=>n.key),baseline.spec.nodes.map(n=>n.key));assert.deepEqual(manifest.mappings,baseline.manifest.mappings);
  assert.equal(manifest.inlineText.changedCount,1);assert.equal(manifest.inlineText.hiddenFragmentCount,1);assert.equal(manifest.inlineText.nativeFit,'NOT_RUN');
});
test('centered run uses whole content box and keeps centered alignment',()=>{
  const c=capture(),p=c.root.children[0];p.style.textAlign='center';for(const n of p.children)n.style.textAlign='center';
  p.children[0].rect.x=45;p.children[1].rect.x=60;
  const {spec}=convert(c);const n=spec.nodes.find(n=>n.key==='home/a');assert.equal(n.x,5);assert.equal(n.width,90);assert.equal(n.props.textAlignHorizontal,'CENTER');
});
function rightCapture() {
  const c=capture(),p=c.root.children[0];
  c.viewport={width:1280,height:800};c.root.rect={x:0,y:0,width:1280,height:800};
  p.rect={x:1164.4000244140625,y:595,width:42,height:20};
  p.style={...p.style,textAlign:'right',fontSize:'12px',paddingLeft:'0px',paddingRight:'0px'};
  // The archived scan counter measured these contiguous fragments on one line.
  p.children[0].text='0';p.children[0].rect={x:1182.300048828125,y:596.6000366210938,width:6.4749755859375,height:16};
  p.children[1].text='/32';p.children[1].rect={x:1188.7750244140625,y:596.6000366210938,width:17.625,height:16};
  for(const n of p.children)n.style={...p.style};
  return c;
}
test('right-aligned measured counter uses whole content box while retaining provenance and RIGHT alignment',()=>{
  const c=rightCapture(),before=structuredClone(c),baseline=adaptCaptures([c]);
  const {spec,manifest}=convert(c),first=spec.nodes.find(n=>n.key==='home/a'),later=spec.nodes.find(n=>n.key==='home/b');
  assert.deepEqual(c,before);assert.equal(manifest.inlineText.changedCount,1);
  assert.equal(first.props.characters,'0/32');assert.equal(first.x,0);assert.equal(first.width,42);
  assert.equal(first.y,1.60003662109375);assert.equal(first.height,16);assert.equal(first.props.textAlignHorizontal,'RIGHT');
  assert.equal(later.props.characters,'/32');assert.equal(later.props.visible,false);
  assert.deepEqual(spec.nodes.map(n=>n.key),baseline.spec.nodes.map(n=>n.key));assert.deepEqual(manifest.mappings,baseline.manifest.mappings);
  assert.equal(manifest.inlineText.hiddenFragmentCount,1);assert.equal(manifest.inlineText.nativeFit,'NOT_RUN');
});
test('right alignment uses known padding and borders to retain the content right edge',()=>{
  const c=capture(),p=c.root.children[0];
  p.style={...p.style,textAlign:'right',paddingLeft:'7px',paddingRight:'9px',borderLeftWidth:'2px',borderRightWidth:'3px'};
  p.children[0].rect.x=73;p.children[1].rect.x=88;
  for(const n of p.children)n.style={...p.style};
  const {spec,manifest}=convert(c),n=spec.nodes.find(n=>n.key==='home/a');
  assert.equal(manifest.inlineText.changedCount,1);assert.equal(n.x,9);assert.equal(n.width,79);
  assert.equal(n.x+n.width,p.rect.width-12);assert.equal(n.props.textAlignHorizontal,'RIGHT');
});
for(const [name,mutate] of [
  ['logical end alignment',c=>{const p=c.root.children[0];for(const n of [p,...p.children])n.style.textAlign='end';}],
  ['RTL direction',c=>{const p=c.root.children[0];for(const n of [p,...p.children])n.style.direction='rtl';}],
  ['fragment alignment differing from the parent',c=>{for(const n of c.root.children[0].children)n.style.textAlign='left';}],
  ['RTL fragments in an LTR parent',c=>{for(const n of c.root.children[0].children)n.style.direction='rtl';}],
  ['vertical fragments in a horizontal parent',c=>{for(const n of c.root.children[0].children)n.style.writingMode='vertical-rl';}],
  ['mixed fonts',c=>{c.root.children[0].children[1].style.fontWeight='700';}],
  ['non-contiguous fragments',c=>{c.root.children[0].children[1].rect.x-=1;}],
  ['second line',c=>{c.root.children[0].children[1].rect.y+=20;}],
  ['unknown content boundary',c=>{delete c.root.children[0].style.paddingLeft;}],
  ['fragment outside content',c=>{const p=c.root.children[0];for(const n of p.children)n.rect.x+=1;}],
  ['sibling in the expanded content area',c=>{c.root.children.push({id:'floating',kind:'element',tag:'span',style:{...style},rect:{x:1165,y:596.6000366210938,width:5,height:16},children:[]});}],
]) test(`preserves right fragments with unsupported ${name}`,()=>{
  const c=rightCapture();mutate(c);const before=structuredClone(c),{spec,manifest}=convert(c);
  assert.deepEqual(c,before);assert.equal(manifest.inlineText.changedCount,0);
  assert.equal(spec.nodes.find(n=>n.key==='home/a').props.characters,'0');assert.equal(spec.nodes.find(n=>n.key==='home/b').props.visible,undefined);
});
test('right-aligned fragments remain separate when a fragment owns an interaction',()=>{
  const {spec,manifest}=convert(rightCapture(),{links:[{sceneId:'home',sourceId:'b',targetSceneId:'home',trigger:'ON_CLICK'}]});
  assert.equal(manifest.inlineText.changedCount,0);assert.equal(spec.reactions[0].sourceKey,'home/b');
  assert.equal(spec.nodes.find(n=>n.key==='home/a').props.characters,'0');assert.equal(spec.nodes.find(n=>n.key==='home/b').props.visible,undefined);
});
test('preserves normal and nowrap runs with ordinary spaces on both sides of a fragment boundary',()=>{
  for(const whiteSpace of ['normal','nowrap']) {
    const c=capture(),p=c.root.children[0];p.style.whiteSpace=whiteSpace;
    for(const n of p.children)n.style.whiteSpace=whiteSpace;
    p.children[1].text=' 1 页';const before=structuredClone(c);
    const {spec,manifest}=convert(c);
    assert.deepEqual(c,before);assert.equal(manifest.inlineText.changedCount,0);
    assert.equal(manifest.inlineText.preservedCounts.WHITESPACE_COLLAPSE_UNSUPPORTED,1);
    assert.equal(spec.nodes.find(n=>n.key==='home/a').props.characters,'第 ');
    assert.equal(spec.nodes.find(n=>n.key==='home/b').props.characters,' 1 页');
    assert.equal(spec.nodes.find(n=>n.key==='home/b').props.visible,undefined);
  }
});
test('keeps non-breaking spaces literal when coalescing instead of treating them as collapsible ordinary spaces',()=>{
  for(const [first,last] of [['第 ','\u00a01 页'],['第\u00a0',' 1 页'],['第\u00a0','\u00a01 页']]) {
    const c=capture(),p=c.root.children[0];p.children[0].text=first;p.children[1].text=last;
    const {spec,manifest}=convert(c);
    assert.equal(manifest.inlineText.changedCount,1);
    assert.equal(spec.nodes.find(n=>n.key==='home/a').props.characters,first+last);
    assert.equal(spec.nodes.find(n=>n.key==='home/b').props.characters,last);
    assert.equal(spec.nodes.find(n=>n.key==='home/b').props.visible,false);
  }
});
test('still coalesces normal and nowrap fragments separated by a single ordinary space',()=>{
  for(const whiteSpace of ['normal','nowrap']) {
    const c=capture(),p=c.root.children[0];p.style.whiteSpace=whiteSpace;
    for(const n of p.children)n.style.whiteSpace=whiteSpace;
    const {spec,manifest}=convert(c);
    assert.equal(manifest.inlineText.changedCount,1);
    assert.equal(spec.nodes.find(n=>n.key==='home/a').props.characters,'第 1 页');
    assert.equal(spec.nodes.find(n=>n.key==='home/b').props.visible,false);
  }
});
for(const [name,transform] of [
  ['identity','matrix(1, 0, 0, 1, 0, 0)'],
  ['nonzero translation','matrix(1, 0, 0, 1, -10.5, 90)'],
]) test(`coalesces below ${name} ancestor from viewport-measured rectangles`,()=>{
  const c=capture(),line=c.root.children[0];
  const dx=-10.5,dy=90;
  for(const n of [line,...line.children]){n.rect.x+=dx;n.rect.y+=dy;}
  c.root.children=[{id:'translated',kind:'element',tag:'div',style:{...style,transform},rect:{x:dx,y:dy,width:300,height:200},children:[line]}];
  const before=structuredClone(c),baseline=adaptCaptures([c]);
  const {spec,manifest}=convert(c),n=spec.nodes.find(n=>n.key==='home/a');
  assert.deepEqual(c,before);assert.equal(manifest.inlineText.changedCount,1);
  assert.equal(n.props.characters,'第 1 页');assert.equal(n.x,5);assert.equal(n.width,90);assert.equal(n.y,0);assert.equal(n.height,20);
  assert.deepEqual({...n.props,characters:'第 '},baseline.spec.nodes.find(n=>n.key==='home/a').props);
  assert.equal(spec.nodes.find(n=>n.key==='home/b').props.visible,false);
});
for(const [name,transform] of [
  ['scale','matrix(1.000000000001,0,0,1,0,90)'],
  ['skew','matrix(1,0,0.000000000001,1,0,90)'],
  ['rotation','matrix(0,1,-1,0,0,90)'],
  ['3d','matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,90,0,1)'],
  ['malformed','matrix(1,0,0,1,0,90,0)'],
  ['nonfinite','matrix(1,0,0,1,0,1e999)'],
  ['unknown',undefined],
  ['uncomputed translation','translateY(90px)'],
]) test(`preserves unsupported ${name} ancestor`,()=>{
  const c=capture();c.root.style.transform=transform;
  const {spec,manifest}=convert(c);
  assert.equal(manifest.inlineText.changedCount,0);assert.equal(manifest.inlineText.preservedCounts.COMPOSITION_UNSUPPORTED,1);
  assert.equal(spec.nodes.find(n=>n.key==='home/a').props.characters,'第 ');assert.equal(spec.nodes.find(n=>n.key==='home/b').props.visible,undefined);
});
for(const [name,mutate] of [
  ['different font',c=>{c.root.children[0].children[1].style.fontWeight='700';}],
  ['different baseline',c=>{c.root.children[0].children[1].rect.y++;}],
  ['separated fragments',c=>{c.root.children[0].children[1].rect.x++;}],
  ['nested element',c=>{c.root.children[0].children[1].kind='element';}],
  ['unknown padding',c=>{delete c.root.children[0].style.paddingRight;}],
  ['scroll container',c=>{c.root.children[0].style.overflowY='auto';}],
  ['transformed parent',c=>{c.root.children[0].style.transform='matrix(1,0,0,1,1,0)';}],
  ['transformed fragment',c=>{c.root.children[0].children[1].style.transform='matrix(1,0,0,1,1,0)';}],
  ['line break',c=>{c.root.children[0].children[1].text='1\n页';}],
  ['overlapping sibling',c=>{c.root.children.push({id:'floating',kind:'element',tag:'span',style:{...style},rect:{x:100,y:20,width:10,height:20},children:[]});}],
]) test(`preserves unsupported ${name}`,()=>{
  const c=capture();mutate(c);const {spec,manifest}=convert(c);assert.equal(manifest.inlineText.changedCount,0);assert.equal(spec.nodes.find(n=>n.key==='home/a').props.characters,'第 ');assert.equal(spec.nodes.find(n=>n.key==='home/b').props.visible,undefined);
});
test('preserves fragments targeted by native interactions',()=>{
  const {spec,manifest}=convert(capture(),{links:[{sceneId:'home',sourceId:'b',targetSceneId:'home',trigger:'ON_CLICK'}]});
  assert.equal(manifest.inlineText.changedCount,0);assert.equal(spec.reactions.length,1);assert.equal(spec.reactions[0].sourceKey,'home/b');
});
test('also protects archived self-mappings without native self-navigation',()=>{
  const c=capture();delete c.captureVersion;
  const {spec,manifest}=convert(c,{links:[{sceneId:'home',sourceId:'b',targetSceneId:'home',trigger:'ON_CLICK'}]});
  assert.equal(manifest.inlineText.changedCount,0);assert.equal(spec.reactions.length,0);assert.equal(manifest.unchangedPresetMappings.length,1);
});
test('rejects unsupported and null inline text policies',()=>{
  for(const inlineText of ['guess',null])assert.throws(()=>convert(capture(),{inlineText}),/inlineText/);
});
