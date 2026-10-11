import test from 'node:test';
import assert from 'node:assert/strict';
import { fitMeasuredSingleLineText } from '../design/text-fit.mjs';

function fixture() {
  const typography={fontName:{family:'Noto Sans SC',style:'Regular'},fontSize:14,lineHeight:{unit:'PIXELS',value:20},letterSpacing:{unit:'PIXELS',value:0},characters:'第 1 / 1 页'};
  const spec={nodes:[{key:'line',type:'TEXT',parentKey:'frame',x:5,y:2,width:99.8,height:18.4,props:{...structuredClone(typography),textAutoResize:'NONE',fills:[],visible:true}}],reactions:[{sourceKey:'line',targetKey:'frame'}],flows:[{name:'Start',nodeKey:'frame'}],textStyles:[]};
  const candidate={nodeKey:'line',sourceCharacters:typography.characters,sourceWidth:95,sourceHeight:18.4,contentWidth:99.8,sourceFontSize:14,sourceLineHeight:20,sourceEllipsis:false};
  const sample={...structuredClone(typography),textAutoResize:'WIDTH_AND_HEIGHT',width:120.2,height:20,hasMissingFont:false};
  const measurement={typography:structuredClone(typography),width:sample.width,height:sample.height,firstRead:structuredClone(sample),secondRead:structuredClone(sample),provenance:{operationIds:['read-one','read-two'],nativeNodeId:'1:2',fileKey:'test-file'}};
  return {spec,options:{candidates:[candidate],measurements:[measurement],minimumScale:0.8}};
}
function run(mutate=()=>{}){const f=fixture();mutate(f);return fitMeasuredSingleLineText(f.spec,f.options);}
test('explicit measured fitting clones input, changes only fontsize and records both native reads',()=>{
  const f=fixture(),before=structuredClone(f),{spec,report}=fitMeasuredSingleLineText(f.spec,f.options);
  assert.deepEqual(f,before);assert.notEqual(spec,f.spec);
  assert.equal(spec.nodes[0].props.fontSize,11.454545);
  const expected=structuredClone(before.spec);expected.nodes[0].props.fontSize=11.454545;assert.deepEqual(spec,expected);
  assert.equal(report.changedCount,1);assert.equal(report.nativeVisual,'NOT_RUN');assert.equal(report.verticalFit,'NOT_RUN');
  assert.equal(report.results[0].status,'FIT');assert.equal(report.results[0].usableWidth,99);assert.equal(report.results[0].measuredWidth,121);
  assert.deepEqual(report.results[0].measurement,f.options.measurements[0]);assert.deepEqual(report.results[0].candidate,f.options.candidates[0]);
});
test('no explicit candidates leaves all nodes unchanged',()=>{
  const {spec}=fixture();assert.deepEqual(fitMeasuredSingleLineText(spec,{}).spec,spec);
});
test('natural width already within fixed bounds remains unchanged',()=>{
  const f=fixture();for(const v of [f.options.measurements[0],f.options.measurements[0].firstRead,f.options.measurements[0].secondRead])v.width=99.7;
  const out=fitMeasuredSingleLineText(f.spec,f.options);assert.deepEqual(out.spec,f.spec);assert.equal(out.report.results[0].reason,'ALREADY_FITS');
});
test('Arial measurements match Arial nodes without borrowing Noto metrics',()=>{
  const f=fixture(),fontName={family:'Arial',style:'Bold'};
  f.spec.nodes[0].props.fontName=fontName;
  for(const v of [f.options.measurements[0].typography,f.options.measurements[0].firstRead,f.options.measurements[0].secondRead])v.fontName=structuredClone(fontName);
  assert.equal(fitMeasuredSingleLineText(f.spec,f.options).report.changedCount,1);
});
test('zero percent letter spacing is allowed and unchanged',()=>{
  const f=fixture(),spacing={unit:'PERCENT',value:0};f.spec.nodes[0].props.letterSpacing=spacing;
  for(const v of [f.options.measurements[0].typography,f.options.measurements[0].firstRead,f.options.measurements[0].secondRead])v.letterSpacing=structuredClone(spacing);
  assert.equal(fitMeasuredSingleLineText(f.spec,f.options).report.changedCount,1);
});
function decimalNativeFixture() {
  const f=fixture(),p=f.spec.nodes[0].props,c=f.options.candidates[0],m=f.options.measurements[0];
  const requested={fontName:{family:'Arial',style:'Bold'},fontSize:13.3333,lineHeight:{unit:'AUTO'},letterSpacing:{unit:'PIXELS',value:0},characters:'添加备注'};
  Object.assign(p,structuredClone(requested));f.spec.nodes[0].width=53.3125;f.spec.nodes[0].height=15;
  Object.assign(c,{sourceCharacters:requested.characters,sourceWidth:53.3125,sourceHeight:15,contentWidth:300.0875,sourceFontSize:13.3333,sourceLineHeight:16,sourceEllipsis:true});
  m.typography=structuredClone(requested);m.width=54;m.height=15;
  for(const sample of [m.firstRead,m.secondRead])Object.assign(sample,structuredClone(requested),{fontSize:13.33329963684082,width:54,height:15});
  return f;
}
test('matches actual native float32 fontsize and preserves requested and raw read values in evidence',()=>{
  const f=decimalNativeFixture(),before=structuredClone(f),out=fitMeasuredSingleLineText(f.spec,f.options);
  assert.deepEqual(f,before);assert.equal(out.report.changedCount,1);assert.equal(out.spec.nodes[0].props.fontSize,13.086387);
  assert.equal(out.report.results[0].requestedTypography.fontSize,13.3333);
  assert.equal(out.report.results[0].measuredTypography.fontSize,13.33329963684082);
  assert.equal(out.report.results[0].typographyMatch,'fontSize and lineHeight.value float32 equivalence; other fields exact');
});
test('float32 matching never rewrites fontsize when the natural width already fits',()=>{
  const f=decimalNativeFixture();f.spec.nodes[0].width=55;
  const out=fitMeasuredSingleLineText(f.spec,f.options);assert.deepEqual(out.spec,f.spec);assert.equal(out.spec.nodes[0].props.fontSize,13.3333);assert.equal(out.report.results[0].reason,'ALREADY_FITS');
});
test('accepts the actual float32 size in both measurement typography and native reads',()=>{
  const f=decimalNativeFixture();f.options.measurements[0].typography.fontSize=13.33329963684082;
  const out=fitMeasuredSingleLineText(f.spec,f.options);assert.equal(out.report.changedCount,1);assert.equal(out.spec.nodes[0].props.fontSize,13.086387);
});
test('rejects native fontsize outside the requested float32 representation',()=>{
  const f=decimalNativeFixture();for(const sample of [f.options.measurements[0].firstRead,f.options.measurements[0].secondRead])sample.fontSize=Math.fround(13.333301);
  const out=fitMeasuredSingleLineText(f.spec,f.options);assert.deepEqual(out.spec,f.spec);assert.equal(out.report.results[0].reason,'MEASUREMENT_SUMMARY_MISMATCH');
});
test('two native fontsize reads must be raw-identical even within one float32 representation',()=>{
  const f=decimalNativeFixture();f.options.measurements[0].secondRead.fontSize=13.3333;
  const out=fitMeasuredSingleLineText(f.spec,f.options);assert.deepEqual(out.spec,f.spec);assert.equal(out.report.results[0].reason,'MEASUREMENT_UNSTABLE');
});
for(const [requested,measured] of [[22.4,22.399999618530273],[18.6667,18.66670036315918],[15.95,15.949999809265137],[34.65,34.650001525878906]])test(`matches native float32 pixel lineHeight ${requested}`,()=>{
  const f=fixture();f.spec.nodes[0].height=14;f.options.candidates[0].sourceHeight=14;f.options.candidates[0].sourceLineHeight=requested;
  f.spec.nodes[0].props.lineHeight.value=requested;f.options.measurements[0].typography.lineHeight.value=requested;
  for(const sample of [f.options.measurements[0].firstRead,f.options.measurements[0].secondRead])sample.lineHeight.value=measured;
  const out=fitMeasuredSingleLineText(f.spec,f.options);assert.equal(out.report.changedCount,1);assert.equal(out.spec.nodes[0].props.lineHeight.value,requested);
  assert.equal(out.report.results[0].requestedTypography.lineHeight.value,requested);assert.equal(out.report.results[0].measuredTypography.lineHeight.value,measured);
});
test('matches float32 percent lineHeight values without converting units or changing source props',()=>{
  const f=fixture(),requested={unit:'PERCENT',value:115.95},measured={unit:'PERCENT',value:Math.fround(115.95)};
  f.spec.nodes[0].props.lineHeight=structuredClone(requested);f.options.measurements[0].typography.lineHeight=structuredClone(requested);
  for(const sample of [f.options.measurements[0].firstRead,f.options.measurements[0].secondRead])sample.lineHeight=structuredClone(measured);
  const out=fitMeasuredSingleLineText(f.spec,f.options);assert.equal(out.report.changedCount,1);assert.deepEqual(out.spec.nodes[0].props.lineHeight,requested);
});
test('rejects lineHeight values outside requested float32 representation',()=>{
  const f=fixture();f.spec.nodes[0].props.lineHeight.value=22.4;f.options.measurements[0].typography.lineHeight.value=22.4;
  for(const sample of [f.options.measurements[0].firstRead,f.options.measurements[0].secondRead])sample.lineHeight.value=Math.fround(22.40001);
  const out=fitMeasuredSingleLineText(f.spec,f.options);assert.deepEqual(out.spec,f.spec);assert.equal(out.report.results[0].reason,'MEASUREMENT_SUMMARY_MISMATCH');
});
test('native lineHeight double reads remain raw-strict inside one float32 representation',()=>{
  const f=fixture();f.spec.nodes[0].props.lineHeight.value=22.4;f.options.measurements[0].typography.lineHeight.value=22.4;
  f.options.measurements[0].firstRead.lineHeight.value=Math.fround(22.4);f.options.measurements[0].secondRead.lineHeight.value=22.4;
  const out=fitMeasuredSingleLineText(f.spec,f.options);assert.deepEqual(out.spec,f.spec);assert.equal(out.report.results[0].reason,'MEASUREMENT_UNSTABLE');
});
for(const [name,reason,mutate] of [
  ['mismatched source string','SOURCE_CHARACTERS_MISMATCH',f=>{f.options.candidates[0].sourceCharacters='different';}],
  ['multiline source','SOURCE_NOT_SINGLE_LINE',f=>{f.spec.nodes[0].props.characters='第\n页';f.options.candidates[0].sourceCharacters='第\n页';}],
  ['source range outside content','SOURCE_ALREADY_CLIPPED',f=>{f.options.candidates[0].sourceWidth=100;}],
  ['source ellipsis with full range outside content','SOURCE_ALREADY_CLIPPED',f=>{f.options.candidates[0].sourceWidth=200;f.options.candidates[0].sourceEllipsis=true;}],
  ['multiline source height','SOURCE_NOT_SINGLE_LINE',f=>{f.options.candidates[0].sourceHeight=40;}],
  ['missing source geometry','SOURCE_GEOMETRY_UNKNOWN',f=>{delete f.options.candidates[0].contentWidth;}],
  ['changed fixed height','NODE_GEOMETRY_MISMATCH',f=>{f.spec.nodes[0].height=20;}],
  ['changed source fontsize','SOURCE_FONT_SIZE_MISMATCH',f=>{f.options.candidates[0].sourceFontSize=12;}],
  ['linked text style','LINKED_TEXT_STYLE',f=>{f.spec.nodes[0].props.textStyleKey='shared';}],
  ['hidden original fragment','HIDDEN_TEXT',f=>{f.spec.nodes[0].props.visible=false;}],
  ['auto sizing destination','DESTINATION_NOT_FIXED',f=>{f.spec.nodes[0].props.textAutoResize='HEIGHT';}],
  ['nonzero spacing','LETTER_SPACING_UNSUPPORTED',f=>{f.spec.nodes[0].props.letterSpacing.value=0.1;}],
  ['missing measurement','MEASUREMENT_MISSING',f=>{f.options.measurements=[];}],
  ['wrong native font','MEASUREMENT_MISSING',f=>{f.options.measurements[0].typography.fontName.family='Arial';}],
  ['duplicate metric','MEASUREMENT_AMBIGUOUS',f=>{f.options.measurements.push(structuredClone(f.options.measurements[0]));}],
  ['changed second width','MEASUREMENT_UNSTABLE',f=>{f.options.measurements[0].secondRead.width=120.3;}],
  ['changed second typography','MEASUREMENT_UNSTABLE',f=>{f.options.measurements[0].secondRead.fontSize=13;}],
  ['missing sample field','MEASUREMENT_INCOMPLETE',f=>{delete f.options.measurements[0].firstRead.lineHeight;}],
  ['missing font proof','MEASUREMENT_MISSING_FONT',f=>{delete f.options.measurements[0].secondRead.hasMissingFont;}],
  ['missing native font','MEASUREMENT_MISSING_FONT',f=>{f.options.measurements[0].firstRead.hasMissingFont=true;f.options.measurements[0].secondRead.hasMissingFont=true;}],
  ['measurement summary differs','MEASUREMENT_SUMMARY_MISMATCH',f=>{f.options.measurements[0].width=122;}],
  ['zero natural width','MEASUREMENT_GEOMETRY_INVALID',f=>{for(const v of [f.options.measurements[0],f.options.measurements[0].firstRead,f.options.measurements[0].secondRead])v.width=0;}],
  ['non-auto native measurement','MEASUREMENT_NOT_NATURAL',f=>{f.options.measurements[0].firstRead.textAutoResize='NONE';f.options.measurements[0].secondRead.textAutoResize='NONE';}],
  ['missing provenance','MEASUREMENT_PROVENANCE_MISSING',f=>{f.options.measurements[0].provenance={};}],
  ['below minimum scale','MINIMUM_SCALE_EXCEEDED',f=>{for(const v of [f.options.measurements[0],f.options.measurements[0].firstRead,f.options.measurements[0].secondRead])v.width=130;}],
]) test(`preserves ${name}`,()=>{
  const f=fixture();mutate(f);const before=structuredClone(f),out=fitMeasuredSingleLineText(f.spec,f.options);
  assert.deepEqual(f,before);assert.deepEqual(out.spec,f.spec);assert.equal(out.report.changedCount,0);assert.equal(out.report.results[0].reason,reason);
});
test('declared ellipsis whose entire source range fits may use measured fitting',()=>{
  const out=run(f=>{f.options.candidates[0].sourceEllipsis=true;});assert.equal(out.report.changedCount,1);
});
test('duplicate candidate keys are preserved instead of repeatedly shrinking the same node',()=>{
  const f=fixture();f.options.candidates.push(structuredClone(f.options.candidates[0]));const out=fitMeasuredSingleLineText(f.spec,f.options);
  assert.deepEqual(out.spec,f.spec);assert.ok(out.report.results.every(r=>r.reason==='CANDIDATE_AMBIGUOUS'));
});
test('rejects invalid options instead of widening the permitted scale',()=>{
  const {spec,options}=fixture();for(const minimumScale of [0,0.799999,1.1,NaN])assert.throws(()=>fitMeasuredSingleLineText(spec,{...options,minimumScale}),/minimumScale/);
  assert.throws(()=>fitMeasuredSingleLineText(spec,{candidates:'all',measurements:[]}),/candidates/);
});
