const WORKSPACE_ID = "protype-code-local";
const TASK_ID = "local-figma-bridge-poc";
const OWNER_KEY = "local-codex-figma-bridge-poc-owner";
const OWNER_VALUE = "local-codex-figma-bridge-poc";
const ROLE_KEY = "local-codex-figma-bridge-poc-role";
const WORKSPACE_OWNER_KEY = "local-codex-figma-bridge-poc-workspace-id";
const TASK_OWNER_KEY = "local-codex-figma-bridge-poc-task-id";
const OPERATION_OWNER_KEY = "local-codex-figma-bridge-poc-operation-id";
const REVISION_OWNER_KEY = "local-codex-figma-bridge-poc-revision";
const SPEC_NODE_KEY = "local-codex-figma-bridge-poc-spec-node-key";
const TEST_FIXTURE_KEY = "local-codex-figma-bridge-poc-test-fixture";
const CLIENT_ID_STORAGE_KEY = "local-codex-figma-bridge-poc-client-id";
const PAIRING_STORAGE_KEY = "local-codex-figma-bridge-poc-pairing";
const POC_PAGE_NAME = "Codex Bridge POC";
const POC_FRAME_NAME = "C2C Bridge POC";
const POC_TEXT_INITIAL = "Local Codex → Local Figma";
// BEGIN GENERATED DESIGN RUNTIME
var BridgeDesignRuntime=(()=>{var Be=Object.defineProperty;var nn=Object.getOwnPropertyDescriptor;var sn=Object.getOwnPropertyNames;var on=Object.prototype.hasOwnProperty;var rn=(s,i,l)=>i in s?Be(s,i,{enumerable:!0,configurable:!0,writable:!0,value:l}):s[i]=l;var an=(s,i)=>{for(var l in i)Be(s,l,{get:i[l],enumerable:!0})},dn=(s,i,l,a)=>{if(i&&typeof i=="object"||typeof i=="function")for(let y of sn(i))!on.call(s,y)&&y!==l&&Be(s,y,{get:()=>i[y],enumerable:!(a=nn(i,y))||a.enumerable});return s};var cn=s=>dn(Be({},"__esModule",{value:!0}),s);var ae=(s,i,l)=>rn(s,typeof i!="symbol"?i+"":i,l);var Mn={};an(Mn,{canonical:()=>H,createDesignRuntime:()=>wn,designSignature:()=>Z,utf8ToBytes:()=>ve});var fn=s=>s/2**32|0,ln=s=>s>>>0;function wt(s,i,l,a){let y=fn(l),N=ln(l);s.setUint32(i,a?N:y,a),s.setUint32(i+4,a?y:N,a)}function Mt(s){return s instanceof Uint8Array||ArrayBuffer.isView(s)&&s.constructor.name==="Uint8Array"&&"BYTES_PER_ELEMENT"in s&&s.BYTES_PER_ELEMENT===1}var st=s=>s?`"${s}" `:"";function pn(s,i=""){if(typeof s!="number")throw new TypeError(st(i)+"expected number, got "+typeof s);if(!Number.isSafeInteger(s)||s<0)throw new RangeError(st(i)+"expected integer >= 0, got "+s);return s}function He(s,i,l=""){if(Mt(s)&&(i===void 0||s.length===i))return s;i!==void 0&&pn(i,"length");let a=Mt(s),y=i!==void 0?` of length ${i}`:"",N=a?`length=${s.length}`:`type=${typeof s}`,v=st(l)+"expected Uint8Array"+y+", got "+N;throw a?new RangeError(v):new TypeError(v)}var yn=(s,i)=>{if(s===null||typeof s!="object"||Array.isArray(s))throw new TypeError((i==="object"?"":`"${i}" `)+"expected object, got type="+typeof s)},kt=(s,i)=>{yn(s,i);let l=Object.getPrototypeOf(s);if(l!==Object.prototype&&l!==null)throw new TypeError(`"${i}" expected plain object`);if(Object.hasOwn(s,"__proto__"))throw new TypeError(`"${i}.__proto__" is not allowed`)};function it(s,i=!0){if(s.destroyed)throw new Error("hash was destroyed");if(i&&s.finished)throw new Error("digest() was already called")}function Lt(s,i){He(s,void 0,"output");let l=i.outputLen;if(!(s.length>=l))throw new RangeError('"output" expected length >= '+l)}function ot(...s){for(let i=0;i<s.length;i++)s[i].fill(0)}function Ue(s){return new DataView(s.buffer,s.byteOffset,s.byteLength)}function ge(s,i){return s<<32-i|s>>>i}var un=typeof Uint8Array.from([]).toHex=="function"&&typeof Uint8Array.fromHex=="function",gn=Array.from({length:256},(s,i)=>i.toString(16).padStart(2,"0"));function Ve(s){if(He(s),un)return s.toHex();let i="";for(let l=0;l<s.length;l++)i+=gn[s[l]];return i}function hn(s,i,l="opts"){return kt(s,"defaults"),i!==void 0&&kt(i,l),Object.assign(Object.create(null),s,i)}function $t(s,i={}){if(typeof s!="function")throw new TypeError('"hashCons" expected function, got type='+typeof s);i=hn({},i,"info");let l=(y,N)=>s(N).update(y).digest(),a=s(void 0);return l.outputLen=a.outputLen,l.blockLen=a.blockLen,l.canXOF=a.canXOF,l.create=y=>s(y),Object.assign(l,i),Object.freeze(l)}var Pt=s=>({oid:Uint8Array.from([6,9,96,134,72,1,101,3,4,2,s])});function Kt(s,i,l){return s&i^~s&l}function vt(s,i,l){return s&i^s&l^i&l}var ze=class{constructor(i,l,a,y){ae(this,"blockLen");ae(this,"outputLen");ae(this,"canXOF",!1);ae(this,"padOffset");ae(this,"isLE");ae(this,"buffer");ae(this,"view");ae(this,"finished",!1);ae(this,"length",0);ae(this,"pos",0);ae(this,"destroyed",!1);this.blockLen=i,this.outputLen=l,this.padOffset=a,this.isLE=y,this.buffer=new Uint8Array(i),this.view=Ue(this.buffer)}update(i){it(this),He(i);let{view:l,buffer:a,blockLen:y}=this,N=i.length,v=!1;for(let w=0;w<N;){let A=Math.min(y-this.pos,N-w);if(A===y){let F=Ue(i);for(;y<=N-w;w+=y)this.process(F,w);v=!0;continue}a.set(w===0&&A===N?i:i.subarray(w,w+A),this.pos),this.pos+=A,w+=A,this.pos===y&&(this.process(l,0),this.pos=0,v=!0)}return this.length+=i.length,v&&this.roundClean(),this}digestInto(i){it(this),Lt(i,this),this.finished=!0;let{buffer:l,view:a,blockLen:y,isLE:N}=this,{pos:v}=this;l[v++]=128,l.fill(0,v),this.padOffset>y-v&&(this.process(a,0),l.fill(0)),wt(a,y-8,this.length*8,N),this.process(a,0),this.roundClean();let w=i===l?a:Ue(i),A=this.outputLen,F=A/4,M=this.get();if(A%4||F>M.length)throw new Error("invalid outputLen");for(let W=0;W<F;W++)w.setUint32(4*W,M[W],N)}digest(){let{buffer:i,outputLen:l}=this;this.digestInto(i);let a=i.slice(0,l);return this.destroy(),a}_cloneIntoMeta(i){let{buffer:l,length:a,finished:y,destroyed:N,pos:v}=this;return i.destroyed=N,i.finished=y,i.length=a,i.pos=v,v&&i.buffer.set(l),i}clone(){return this._cloneInto()}},Gt=Uint32Array.from([1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225]);var En=Uint32Array.from([1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298]),_e=new Uint32Array(64),rt=class extends ze{constructor(l,a){super(64,l,8,!1);ae(this,"A",0);ae(this,"B",0);ae(this,"C",0);ae(this,"D",0);ae(this,"E",0);ae(this,"F",0);ae(this,"G",0);ae(this,"H",0);this.A=a[0]|0,this.B=a[1]|0,this.C=a[2]|0,this.D=a[3]|0,this.E=a[4]|0,this.F=a[5]|0,this.G=a[6]|0,this.H=a[7]|0}get(){let{A:l,B:a,C:y,D:N,E:v,F:w,G:A,H:F}=this;return[l,a,y,N,v,w,A,F]}set(l,a,y,N,v,w,A,F){this.A=l|0,this.B=a|0,this.C=y|0,this.D=N|0,this.E=v|0,this.F=w|0,this.G=A|0,this.H=F|0}_cloneInto(l){return(l||(l=new this.constructor)).set(...this.get()),this._cloneIntoMeta(l)}process(l,a){for(let K=0;K<16;K++,a+=4)_e[K]=l.getUint32(a,!1);for(let K=16;K<64;K++){let k=_e[K-15],b=_e[K-2],x=ge(k,7)^ge(k,18)^k>>>3,B=ge(b,17)^ge(b,19)^b>>>10;_e[K]=B+_e[K-7]+x+_e[K-16]|0}let{A:y,B:N,C:v,D:w,E:A,F,G:M,H:W}=this;for(let K=0;K<64;K++){let k=ge(A,6)^ge(A,11)^ge(A,25),b=W+k+Kt(A,F,M)+En[K]+_e[K]|0,B=(ge(y,2)^ge(y,13)^ge(y,22))+vt(y,N,v)|0;W=M,M=F,F=A,A=w+b|0,w=v,v=N,N=y,y=b+B|0}y=y+this.A|0,N=N+this.B|0,v=v+this.C|0,w=w+this.D|0,A=A+this.E|0,F=F+this.F|0,M=M+this.G|0,W=W+this.H|0,this.set(y,N,v,w,A,F,M,W)}roundClean(){ot(_e)}destroy(){this.destroyed=!0,this.set(0,0,0,0,0,0,0,0),ot(this.buffer)}},at=class extends rt{constructor(){super(32,Gt)}};var We=$t(()=>new at,Pt(1));function Ye(s){if(typeof s!="string"||!s.length||s.length%4!==0)return!1;let i=s.length-(s.endsWith("==")?2:s.endsWith("=")?1:0);for(let l=0;l<i;l++){let a=s.charCodeAt(l);if(!(a>=65&&a<=90||a>=97&&a<=122||a>=48&&a<=57||a===43||a===47))return!1}return!0}var Re=Object.freeze({nodes:25e3,assets:2e3,reactions:3e4,assetBytes:20*1024*1024,totalAssetBytes:80*1024*1024}),xe=class extends Error{constructor(i){super(`Invalid DesignSpec: ${i.slice(0,5).map(l=>`${l.path}: ${l.message}`).join("; ")}`),this.name="DesignSpecError",this.issues=i}},In=["FRAME","TEXT","RECTANGLE","ELLIPSE","VECTOR","COMPONENT","INSTANCE"],Nn=["fills","strokes","strokeWeight","strokeAlign","dashPattern","effects","cornerRadius","opacity","clipsContent","overflowDirection","layoutPositioning","isFixed","visible","characters","fontName","fontSize","fontWeight","lineHeight","letterSpacing","textAlignHorizontal","textAutoResize","textStyleKey","componentKey","vectorPaths","overrides"],Sn=["layoutMode","itemSpacing","paddingTop","paddingRight","paddingBottom","paddingLeft","primaryAxisAlignItems","counterAxisAlignItems","layoutWrap","layoutSizingHorizontal","layoutSizingVertical","constraints","isMask","maskType","textRanges","rotation","relativeTransform"],dt=["GRADIENT_LINEAR","GRADIENT_RADIAL","GRADIENT_ANGULAR","GRADIENT_DIAMOND"],Ft=new Set(["__proto__","constructor","prototype"]);function Bt(s){let i=s?.schemaVersion==="1.1",l=[],a=(u,f)=>{l.length<100&&l.push({path:u,message:f})},y=(u,f,p)=>{if(!u||typeof u!="object"||Array.isArray(u)||![Object.prototype,null].includes(Object.getPrototypeOf(u)))return a(f,"Expected plain object"),!1;for(let S of Object.keys(u))(!p.includes(S)||Ft.has(S))&&a(`${f}.${S}`,"Unknown property");return!0},N=(u,f,p=256,S=!1)=>{(typeof u!="string"||!S&&!u.length||u.length>p||u.includes("\0"))&&a(f,`Expected ${S?"":"nonempty "}string, maximum ${p} characters`)},v=(u,f)=>{N(u,f,160),typeof u=="string"&&(!/^[A-Za-z0-9][A-Za-z0-9_.:/-]*$/.test(u)||Ft.has(u))&&a(f,"Invalid stable key")},w=(u,f,p=-1e7,S=1e7)=>{(typeof u!="number"||!Number.isFinite(u)||u<p||u>S)&&a(f,`Expected finite number in [${p}, ${S}]`)},A=(u,f,p)=>{p.includes(u)||a(f,`Expected one of ${p.join(", ")}`)},F=(u,f)=>{typeof u!="boolean"&&a(f,"Expected boolean")},M=(u,f,p)=>!Array.isArray(u)||u.length>p?(a(f,`Expected array, maximum ${p} entries`),[]):u,W=(u,f)=>{y(u,f,["family","style"])&&(N(u.family,`${f}.family`,128),N(u.style,`${f}.style`,128))},K=(u,f,p=!1)=>{if(y(u,f,p?["r","g","b","a"]:["r","g","b"]))for(let S of p?["r","g","b","a"]:["r","g","b"])w(u[S],`${f}.${S}`,0,1)},k=(u,f,p=!1)=>{y(u,f,["unit","value"])&&(A(u.unit,`${f}.unit`,p?["PIXELS","PERCENT","AUTO"]:["PIXELS","PERCENT"]),u.unit!=="AUTO"?w(u.value,`${f}.value`,p?0:-1e4,1e5):u.value!==void 0&&w(u.value,`${f}.value`,0,1e5))};if(!y(s,"$",["schemaVersion","id","name","source","nodes","assets","textStyles","variables","reactions","flows","fontPolicy",...i?["componentSets"]:[]]))throw new xe(l);if(A(s.schemaVersion,"$.schemaVersion",["1.0","1.1"]),v(s.id,"$.id"),N(s.name,"$.name",512),s.source!==void 0&&y(s.source,"$.source",["revision","capturedAt","adapter","url",...i?["modelRevision","sceneIds","sceneRoots","behaviorStates"]:[]])){for(let u of["revision","adapter"])s.source[u]!==void 0&&N(s.source[u],`$.source.${u}`,256);if(s.source.capturedAt!==void 0&&(N(s.source.capturedAt,"$.source.capturedAt",64),Number.isFinite(Date.parse(s.source.capturedAt))||a("$.source.capturedAt","Invalid timestamp")),s.source.url!==void 0&&(N(s.source.url,"$.source.url",2048),(typeof s.source.url!="string"||!/^https?:\/\/(?:\[[a-fA-F0-9:]+\]|[A-Za-z0-9.-]+)(?::[0-9]{1,5})?(?:\/[^\s?#\\]*)?$/.test(s.source.url))&&a("$.source.url","Only HTTP(S) source URL without credentials, query or fragment is allowed")),s.source.modelRevision!==void 0&&(N(s.source.modelRevision,"$.source.modelRevision",64),(!/^[a-f0-9]{64}$/.test(s.source.modelRevision)||s.source.modelRevision!==s.source.revision)&&a("$.source.modelRevision","Must match full revision hash")),s.source.sceneIds!==void 0){let u=M(s.source.sceneIds,"$.source.sceneIds",500);u.forEach((f,p)=>v(f,`$.source.sceneIds[${p}]`)),new Set(u).size!==u.length&&a("$.source.sceneIds","Duplicate scene id")}if(s.source.sceneRoots!==void 0&&y(s.source.sceneRoots,"$.source.sceneRoots",Object.keys(s.source.sceneRoots??{}))){Object.keys(s.source.sceneRoots).length>500&&a("$.source.sceneRoots","Scene root budget exceeded");for(let[u,f]of Object.entries(s.source.sceneRoots))v(u,"$.source.sceneRoots"),v(f,"$.source.sceneRoots");(!Array.isArray(s.source.sceneIds)||s.source.sceneIds.length!==Object.keys(s.source.sceneRoots).length||s.source.sceneIds.some(u=>!Object.hasOwn(s.source.sceneRoots,u)))&&a("$.source.sceneRoots","Scene root keys must match sceneIds")}}s.fontPolicy!==void 0&&y(s.fontPolicy,"$.fontPolicy",["allowFallback","fallback"])&&(F(s.fontPolicy.allowFallback,"$.fontPolicy.allowFallback"),s.fontPolicy.fallback!==void 0&&W(s.fontPolicy.fallback,"$.fontPolicy.fallback"),s.fontPolicy.allowFallback&&!s.fontPolicy.fallback&&a("$.fontPolicy.fallback","Fallback font required when enabled"));let b={nodes:new Map,assets:new Map,variables:new Map,textStyles:new Map},x=(u,f)=>M(s[u]??[],`$.${u}`,f).map((p,S)=>{let C=`$.${u}[${S}]`;return p&&typeof p=="object"&&(v(p.key,`${C}.key`),b[u].has(p.key)&&a(`${C}.key`,"Duplicate key"),b[u].set(p.key,p)),[p,C]}),B=0;for(let[u,f]of x("assets",Re.assets))if(y(u,f,["key","mimeType","dataBase64",...i?["sha256","decodedBytes"]:[]])){if(A(u.mimeType,`${f}.mimeType`,["image/png","image/jpeg","image/webp"]),i&&u.dataBase64===void 0){N(u.sha256,`${f}.sha256`,64),/^[a-f0-9]{64}$/.test(u.sha256)||a(`${f}.sha256`,"Invalid SHA-256"),w(u.decodedBytes,`${f}.decodedBytes`,1,Re.assetBytes),Number.isInteger(u.decodedBytes)||a(`${f}.decodedBytes`,"Expected integer bytes"),B+=u.decodedBytes;continue}if(i&&(u.sha256!==void 0||u.decodedBytes!==void 0)&&a(f,"Choose inline data or staged hash reference"),N(u.dataBase64,`${f}.dataBase64`,Math.ceil(Re.assetBytes/3)*4),typeof u.dataBase64=="string"){Ye(u.dataBase64)||a(`${f}.dataBase64`,"Invalid base64"),B+=Math.floor(u.dataBase64.length*3/4);let p={"image/png":/^iVBORw0KGgo/,"image/jpeg":/^\/9j\//,"image/webp":/^UklGR/}[u.mimeType];p&&!p.test(u.dataBase64)&&a(`${f}.dataBase64`,"Image signature does not match MIME type")}}B>Re.totalAssetBytes&&a("$.assets","Total asset byte budget exceeded");for(let[u,f]of x("variables",5e3))y(u,f,["key","name","value",...i?["type"]:[]])&&(N(u.name,`${f}.name`,256),i&&u.type!==void 0&&A(u.type,`${f}.type`,["COLOR","FLOAT"]),i&&u.type==="FLOAT"?w(u.value,`${f}.value`,-1e4,1e4):K(u.value,`${f}.value`,!0));for(let[u,f]of x("textStyles",5e3))y(u,f,["key","name","fontName","fontSize","lineHeight","letterSpacing"])&&(N(u.name,`${f}.name`,256),W(u.fontName,`${f}.fontName`),w(u.fontSize,`${f}.fontSize`,.1,1e4),u.lineHeight!==void 0&&k(u.lineHeight,`${f}.lineHeight`,!0),u.letterSpacing!==void 0&&k(u.letterSpacing,`${f}.letterSpacing`));let Q=x("nodes",Re.nodes);Q.length||a("$.nodes","At least one node required");for(let u of Object.values(s.source?.sceneRoots??{})){let f=b.nodes.get(u);(f?.type!=="FRAME"||f.parentKey!==null)&&a("$.source.sceneRoots","Scene viewport must be a root FRAME")}let q=(u,f,p)=>{v(f,p),b[u].has(f)||a(p,`Unknown ${u} reference`)};if(s.source?.behaviorStates!==void 0){let u=new Set;for(let[f,p]of M(s.source.behaviorStates,"$.source.behaviorStates",1e3).entries()){let S=`$.source.behaviorStates[${f}]`;if(!y(p,S,["behaviorId","mode","nodeKeys"]))continue;v(p.behaviorId,`${S}.behaviorId`),A(p.mode,`${S}.mode`,["SIMULATED"]),u.has(p.behaviorId)&&a(S,"Duplicate behavior state"),u.add(p.behaviorId);let C=M(p.nodeKeys,`${S}.nodeKeys`,25e3);(!C.length||new Set(C).size!==C.length)&&a(S,"Expected nonempty distinct state nodes"),C.forEach((_,V)=>q("nodes",_,`${S}.nodeKeys[${V}]`))}}let D=(u,f,p=!0)=>{for(let[S,C]of M(u,f,16).entries()){let _=`${f}[${S}]`;if(y(C,_,["type","color","opacity","variableKey","assetKey","scaleMode","gradientStops","gradientTransform",...i?["imageTransform"]:[]])){if(A(C.type,`${_}.type`,p||i?["SOLID","IMAGE",...i?dt:["GRADIENT_LINEAR"]]:["SOLID"]),C.opacity!==void 0&&w(C.opacity,`${_}.opacity`,0,1),C.type==="SOLID")K(C.color,`${_}.color`),C.variableKey!==void 0&&q("variables",C.variableKey,`${_}.variableKey`),(C.assetKey!==void 0||C.scaleMode!==void 0)&&a(_,"Image fields require IMAGE paint");else if(C.type==="IMAGE")q("assets",C.assetKey,`${_}.assetKey`),C.scaleMode!==void 0&&A(C.scaleMode,`${_}.scaleMode`,["FILL","FIT","CROP","TILE"]),(C.color!==void 0||C.variableKey!==void 0)&&a(_,"Solid fields require SOLID paint"),C.imageTransform!==void 0&&R(C.imageTransform,`${_}.imageTransform`);else if(dt.includes(C.type)){["color","variableKey","assetKey","scaleMode"].some(X=>C[X]!==void 0)&&a(_,"Solid and image fields are invalid on gradients");let V=M(C.gradientStops,`${_}.gradientStops`,16);V.length<2&&a(`${_}.gradientStops`,"Expected at least two color stops");for(let[X,ne]of V.entries()){let oe=`${_}.gradientStops[${X}]`;y(ne,oe,["position","color"])&&(w(ne.position,`${oe}.position`,0,1),K(ne.color,`${oe}.color`,!0),X&&ne.position<V[X-1]?.position&&a(`${oe}.position`,"Color stops must be nondecreasing"))}let ie=M(C.gradientTransform,`${_}.gradientTransform`,2);ie.length!==2&&a(`${_}.gradientTransform`,"Expected a two by three transform");for(let[X,ne]of ie.entries()){let oe=M(ne,`${_}.gradientTransform[${X}]`,3);oe.length!==3&&a(`${_}.gradientTransform[${X}]`,"Expected three transform values");for(let[re,he]of oe.entries())w(he,`${_}.gradientTransform[${X}][${re}]`,-1e4,1e4)}ie.length===2&&ie.every(X=>Array.isArray(X)&&X.length===3&&X.every(Number.isFinite))&&Math.abs(ie[0][0]*ie[1][1]-ie[0][1]*ie[1][0])<=1e-8&&a(`${_}.gradientTransform`,"Transform must be invertible")}!dt.includes(C.type)&&(C.gradientStops!==void 0||C.gradientTransform!==void 0)&&a(_,"Gradient fields require gradient paint"),C.type!=="IMAGE"&&C.imageTransform!==void 0&&a(_,"imageTransform requires IMAGE")}}},R=(u,f)=>{let p=M(u,f,2);p.length!==2&&a(f,"Expected two by three transform");for(let[S,C]of p.entries()){let _=M(C,`${f}[${S}]`,3);_.length!==3&&a(f,"Expected two by three transform"),_.forEach((V,ie)=>w(V,`${f}[${S}][${ie}]`))}p.length===2&&p.every(S=>Array.isArray(S)&&S.length===3)&&Math.abs(p[0][0]*p[1][1]-p[0][1]*p[1][0])<1e-8&&a(f,"Transform must be invertible")},$=(u,f,p)=>{let S=0;for(let[C,_]of M(u,p,1e4).entries()){let V=`${p}[${C}]`;if(!y(_,V,["start","end","fontName","fontSize","lineHeight","letterSpacing","fills"]))continue;let ie=X=>Number.isInteger(X)&&X>=0&&X<=f?.length&&!(X>0&&X<f.length&&/[\uD800-\uDBFF]/.test(f[X-1])&&/[\uDC00-\uDFFF]/.test(f[X]));(_.start!==S||!ie(_.start)||!ie(_.end)||_.end<=_.start)&&a(V,"Ranges must cover UTF-16 text contiguously without splitting surrogates"),S=_.end,W(_.fontName,`${V}.fontName`),w(_.fontSize,`${V}.fontSize`,.1,1e4),_.lineHeight!==void 0&&k(_.lineHeight,`${V}.lineHeight`,!0),_.letterSpacing!==void 0&&k(_.letterSpacing,`${V}.letterSpacing`),_.fills!==void 0&&D(_.fills,`${V}.fills`)}S!==f?.length&&a(p,"Ranges must cover all text")};for(let[u,f]of Q)if(y(u,f,["key","type","name","parentKey","x","y","width","height","props"])){A(u.type,`${f}.type`,[...In,...i?["COMPONENT_SET"]:[]]),u.name!==void 0&&N(u.name,`${f}.name`,512);for(let S of["x","y"])w(u[S],`${f}.${S}`);for(let S of["width","height"])w(u[S],`${f}.${S}`,.01,1e5);u.parentKey!==null?(q("nodes",u.parentKey,`${f}.parentKey`),["FRAME","COMPONENT",...i?["COMPONENT_SET"]:[]].includes(b.nodes.get(u.parentKey)?.type)||a(`${f}.parentKey`,"Parent must be FRAME, COMPONENT or versioned COMPONENT_SET")):["FRAME","COMPONENT",...i?["INSTANCE","COMPONENT_SET"]:[]].includes(u.type)||a(f,"Root node must be FRAME or COMPONENT");let p=u.props??{};if(!y(p,`${f}.props`,[...Nn,...i?Sn:[]]))continue;if(i){let S=`${f}.props`;p.layoutMode!==void 0&&(A(p.layoutMode,`${S}.layoutMode`,["NONE","HORIZONTAL","VERTICAL"]),["FRAME","COMPONENT","INSTANCE"].includes(u.type)||a(S,"Layout container required"));for(let C of["itemSpacing","paddingTop","paddingRight","paddingBottom","paddingLeft"])p[C]!==void 0&&(w(p[C],`${S}.${C}`,C==="itemSpacing"?-1e4:0,1e5),["HORIZONTAL","VERTICAL"].includes(p.layoutMode)||a(S,"Spacing requires auto layout"));p.primaryAxisAlignItems!==void 0&&A(p.primaryAxisAlignItems,`${S}.primaryAxisAlignItems`,["MIN","CENTER","MAX","SPACE_BETWEEN"]),p.counterAxisAlignItems!==void 0&&A(p.counterAxisAlignItems,`${S}.counterAxisAlignItems`,["MIN","CENTER","MAX","BASELINE"]),p.layoutWrap!==void 0&&A(p.layoutWrap,`${S}.layoutWrap`,["NO_WRAP","WRAP"]);for(let C of["layoutSizingHorizontal","layoutSizingVertical"])p[C]!==void 0&&(A(p[C],`${S}.${C}`,["FIXED","HUG","FILL"]),p[C]==="FILL"&&!["HORIZONTAL","VERTICAL"].includes(b.nodes.get(u.parentKey)?.props?.layoutMode)&&a(S,"Fill requires auto-layout parent"),p[C]==="HUG"&&u.type!=="TEXT"&&!["HORIZONTAL","VERTICAL"].includes(p.layoutMode)&&a(S,"Hug requires auto layout or text"));if(p.constraints!==void 0&&y(p.constraints,`${S}.constraints`,["horizontal","vertical"]))for(let C of["horizontal","vertical"])A(p.constraints[C],`${S}.constraints.${C}`,["MIN","CENTER","MAX","STRETCH","SCALE"]);p.isMask!==void 0&&F(p.isMask,`${S}.isMask`),p.maskType!==void 0&&A(p.maskType,`${S}.maskType`,["ALPHA","VECTOR","LUMINANCE"]),p.isMask&&!p.maskType&&a(S,"Mask requires explicit maskType"),p.rotation!==void 0&&w(p.rotation,`${S}.rotation`,-3600,3600),p.relativeTransform!==void 0&&R(p.relativeTransform,`${S}.relativeTransform`),p.textRanges!==void 0&&(u.type!=="TEXT"&&a(S,"Text ranges require TEXT"),$(p.textRanges,p.characters,`${S}.textRanges`))}for(let S of["visible","clipsContent","isFixed"])p[S]!==void 0&&F(p[S],`${f}.props.${S}`);p.clipsContent!==void 0&&!["FRAME","COMPONENT","INSTANCE"].includes(u.type)&&a(`${f}.props.clipsContent`,"Clipping requires FRAME, COMPONENT or INSTANCE"),p.cornerRadius!==void 0&&!["FRAME","COMPONENT","INSTANCE","RECTANGLE"].includes(u.type)&&a(`${f}.props.cornerRadius`,"Corner radius requires a rectangular node"),p.isFixed&&(u.parentKey===null||!["HORIZONTAL","VERTICAL","BOTH"].includes(b.nodes.get(u.parentKey)?.props?.overflowDirection))&&a(`${f}.props.isFixed`,"Fixed child requires a scrolling parent");for(let S of["strokeWeight","cornerRadius"])p[S]!==void 0&&w(p[S],`${f}.props.${S}`,0,1e5);if(p.opacity!==void 0&&w(p.opacity,`${f}.props.opacity`,0,1),p.layoutPositioning!==void 0&&A(p.layoutPositioning,`${f}.props.layoutPositioning`,["AUTO","ABSOLUTE"]),p.overflowDirection!==void 0&&(A(p.overflowDirection,`${f}.props.overflowDirection`,["NONE","HORIZONTAL","VERTICAL","BOTH"]),["FRAME","COMPONENT",...i?["INSTANCE"]:[]].includes(u.type)||a(f,"Overflow requires FRAME or COMPONENT")),p.fills!==void 0&&D(p.fills,`${f}.props.fills`),p.strokes!==void 0&&D(p.strokes,`${f}.props.strokes`,!1),p.strokeAlign!==void 0&&A(p.strokeAlign,`${f}.props.strokeAlign`,["INSIDE","OUTSIDE","CENTER"]),p.dashPattern!==void 0){let S=M(p.dashPattern,`${f}.props.dashPattern`,16);S.length||a(`${f}.props.dashPattern`,"Expected at least one dash length");for(let[C,_]of S.entries())w(_,`${f}.props.dashPattern[${C}]`,0,1e4)}if(p.effects!==void 0)for(let[S,C]of M(p.effects,`${f}.props.effects`,16).entries()){let _=`${f}.props.effects[${S}]`;y(C,_,["type","color","offset","radius","spread","visible"])&&(A(C.type,`${_}.type`,["DROP_SHADOW","INNER_SHADOW"]),K(C.color,`${_}.color`,!0),y(C.offset,`${_}.offset`,["x","y"])&&(w(C.offset.x,`${_}.offset.x`,-1e5,1e5),w(C.offset.y,`${_}.offset.y`,-1e5,1e5)),w(C.radius,`${_}.radius`,0,1e5),C.spread!==void 0&&w(C.spread,`${_}.spread`,-1e5,1e5),C.visible!==void 0&&F(C.visible,`${_}.visible`))}if(p.overrides!==void 0){u.type!=="INSTANCE"&&a(`${f}.props.overrides`,"Overrides require INSTANCE");let S=new Set;for(let[C,_]of M(p.overrides,`${f}.props.overrides`,1e3).entries()){let V=`${f}.props.overrides[${C}]`;if(!y(_,V,["sourceKey","characters","visible","fills",...i?["strokes","strokeWeight","cornerRadius","opacity","clipsContent","isMask","maskType","x","y","width","height","rotation","relativeTransform","fontName","fontSize","lineHeight","letterSpacing","textRanges"]:[]]))continue;q("nodes",_.sourceKey,`${V}.sourceKey`),S.has(_.sourceKey)&&a(V,"Duplicate override source"),S.add(_.sourceKey);let ie=b.nodes.get(_.sourceKey),X=ie&&b.nodes.get(ie.parentKey),ne=new Set,oe=!1;for(;X&&!ne.has(X.key);){if(X.key===p.componentKey){oe=!0;break}ne.add(X.key),X=b.nodes.get(X.parentKey)}if(oe||a(`${V}.sourceKey`,"Override source must be a descendant of the referenced component"),_.characters!==void 0&&(ie?.type!=="TEXT"&&a(`${V}.characters`,"Text override requires TEXT source"),N(_.characters,`${V}.characters`,1e5,!0)),_.visible!==void 0&&F(_.visible,`${V}.visible`),_.fills!==void 0&&D(_.fills,`${V}.fills`),i){_.strokes!==void 0&&D(_.strokes,`${V}.strokes`);for(let re of["x","y","rotation"])_[re]!==void 0&&w(_[re],`${V}.${re}`);for(let re of["width","height","strokeWeight","cornerRadius"])_[re]!==void 0&&w(_[re],`${V}.${re}`,["width","height"].includes(re)?.01:0,1e5);_.opacity!==void 0&&w(_.opacity,`${V}.opacity`,0,1);for(let re of["clipsContent","isMask"])_[re]!==void 0&&F(_[re],`${V}.${re}`);_.maskType!==void 0&&A(_.maskType,`${V}.maskType`,["ALPHA","VECTOR","LUMINANCE"]),_.relativeTransform!==void 0&&R(_.relativeTransform,`${V}.relativeTransform`);for(let re of["fontName","fontSize","lineHeight","letterSpacing","textRanges"])_[re]!==void 0&&ie?.type!=="TEXT"&&a(V,"Typography override requires TEXT");_.fontName!==void 0&&W(_.fontName,`${V}.fontName`),_.fontSize!==void 0&&w(_.fontSize,`${V}.fontSize`,.1,1e4),_.lineHeight!==void 0&&k(_.lineHeight,`${V}.lineHeight`,!0),_.letterSpacing!==void 0&&k(_.letterSpacing,`${V}.letterSpacing`),_.textRanges!==void 0&&$(_.textRanges,_.characters??ie?.props?.characters,`${V}.textRanges`)}Object.keys(_).length<2&&a(V,"Override must change characters, visible or fills")}}for(let S of["characters","fontName","fontSize","fontWeight","lineHeight","letterSpacing","textAlignHorizontal","textAutoResize","textStyleKey"])p[S]!==void 0&&u.type!=="TEXT"&&a(`${f}.props.${S}`,"Text-only property");if(u.type==="TEXT"){if(N(p.characters,`${f}.props.characters`,1e5,!0),!p.fontName&&!p.textStyleKey&&a(f,"Text requires fontName or textStyleKey"),p.fontName!==void 0&&W(p.fontName,`${f}.props.fontName`),p.fontSize!==void 0&&w(p.fontSize,`${f}.props.fontSize`,.1,1e4),p.fontWeight!==void 0){A(p.fontWeight,`${f}.props.fontWeight`,[100,200,300,400,500,600,700,800,900]);let S={100:"thin",200:"extralight",300:"light",400:"regular",500:"medium",600:"semibold",700:"bold",800:"extrabold",900:"black"}[p.fontWeight];((p.fontName??b.textStyles.get(p.textStyleKey)?.fontName)?.style?.toLowerCase().replace(/[ -]/g,"").replace(/italic$/,"")||"regular")!==S&&a(`${f}.props.fontWeight`,"fontWeight must match the explicit fontName.style; the font style controls Figma weight")}p.lineHeight!==void 0&&k(p.lineHeight,`${f}.props.lineHeight`,!0),p.letterSpacing!==void 0&&k(p.letterSpacing,`${f}.props.letterSpacing`),p.textAlignHorizontal!==void 0&&A(p.textAlignHorizontal,`${f}.props.textAlignHorizontal`,["LEFT","CENTER","RIGHT","JUSTIFIED"]),p.textAutoResize!==void 0&&A(p.textAutoResize,`${f}.props.textAutoResize`,["NONE","HEIGHT","WIDTH_AND_HEIGHT"]),p.textStyleKey!==void 0&&q("textStyles",p.textStyleKey,`${f}.props.textStyleKey`)}if(u.type==="INSTANCE"?(q("nodes",p.componentKey,`${f}.props.componentKey`),b.nodes.get(p.componentKey)?.type!=="COMPONENT"&&a(f,"Instance must reference COMPONENT")):p.componentKey!==void 0&&a(f,"componentKey requires INSTANCE"),p.vectorPaths!==void 0){u.type!=="VECTOR"&&a(f,"vectorPaths requires VECTOR");for(let[S,C]of M(p.vectorPaths,`${f}.props.vectorPaths`,1e3).entries()){let _=`${f}.props.vectorPaths[${S}]`;y(C,_,["windingRule","data"])&&(A(C.windingRule,`${_}.windingRule`,["NONZERO","EVENODD"]),N(C.data,`${_}.data`,2e5),typeof C.data=="string"&&(!/^[Mm]/.test(C.data.trim())||!/^[MmZzLlHhVvCcSsQqTtAaEe0-9+.,\s-]+$/.test(C.data))&&a(_,"Only SVG path command data allowed"))}}}let U=new Map,j=new Map;if(i)for(let[u,f]of M(s.componentSets??[],"$.componentSets",2e3).entries()){let p=`$.componentSets[${u}]`;if(!y(f,p,["key","memberKeys"]))continue;q("nodes",f.key,`${p}.key`);let S=b.nodes.get(f.key);(S?.type!=="COMPONENT_SET"||U.has(f.key))&&a(p,"Expected unique COMPONENT_SET node"),U.set(f.key,f);let C=M(f.memberKeys,`${p}.memberKeys`,5e3),_=new Set;C.length||a(p,"Component set must not be empty");for(let[X,ne]of C.entries()){q("nodes",ne,`${p}.memberKeys[${X}]`);let oe=b.nodes.get(ne);(oe?.type!=="COMPONENT"||oe.parentKey!==f.key||j.has(ne))&&a(p,"Members must be unique direct COMPONENT children"),(typeof oe?.name!="string"||!/^State=[^,=]+$/.test(oe.name)||_.has(oe.name))&&a(p,"Expected distinct explicit State variant names"),_.add(oe?.name),j.set(ne,f.key)}let V=S&&b.nodes.get(S.parentKey),ie=new Set;for(;V&&!ie.has(V.key);)ie.add(V.key),["COMPONENT","COMPONENT_SET","INSTANCE"].includes(V.type)&&a(p,"Component set cannot be nested in components or instances"),V=b.nodes.get(V.parentKey)}if(i)for(let[u,f]of Q)u.type==="COMPONENT_SET"&&!U.has(u.key)&&a(f,"COMPONENT_SET requires componentSets grouping record"),b.nodes.get(u.parentKey)?.type==="COMPONENT_SET"&&(u.type!=="COMPONENT"||j.get(u.key)!==u.parentKey)&&a(f,"Component set must contain exactly its declared COMPONENT members");if(!l.length)try{ct(s)}catch(u){a("$.nodes",u.message)}let te=new Set;for(let[u,f]of M(s.reactions??[],"$.reactions",Re.reactions).entries()){let p=`$.reactions[${u}]`;if(y(f,p,["sourceKey","destinationKey","trigger",...i?["navigation"]:[]])){if(q("nodes",f.sourceKey,`${p}.sourceKey`),q("nodes",f.destinationKey,`${p}.destinationKey`),f.navigation!==void 0&&A(f.navigation,`${p}.navigation`,["NAVIGATE","CHANGE_TO"]),f.navigation==="CHANGE_TO"){let S=b.nodes.get(f.sourceKey),C,_=new Set;for(;S&&!_.has(S.key);){if(_.add(S.key),S.type==="INSTANCE"){C=S.props?.componentKey;break}if(S.type==="COMPONENT"){C=S.key;break}S=b.nodes.get(S.parentKey)}(!j.has(C)||j.get(f.destinationKey)!==j.get(C))&&a(p,"CHANGE_TO requires a source and target in the same declared component set")}else(b.nodes.get(f.destinationKey)?.type!=="FRAME"||b.nodes.get(f.destinationKey)?.parentKey!==null)&&a(p,"Destination must be a root FRAME");if(y(f.trigger,`${p}.trigger`,["type","delaySeconds",...i?["timeoutMs","delayMs"]:[]])){A(f.trigger.type,`${p}.trigger.type`,["ON_CLICK","AFTER_TIMEOUT",...i?["ON_HOVER","MOUSE_ENTER","MOUSE_LEAVE"]:[]]),f.trigger.type==="AFTER_TIMEOUT"?f.trigger.timeoutMs!==void 0?(w(f.trigger.timeoutMs,`${p}.trigger.timeoutMs`,0,36e5),f.trigger.delaySeconds!==void 0&&a(p,"Choose explicit milliseconds or legacy seconds")):w(f.trigger.delaySeconds,`${p}.trigger.delaySeconds`,.001,3600):(f.trigger.delaySeconds!==void 0||f.trigger.timeoutMs!==void 0)&&a(p,"Timeout fields only apply to AFTER_TIMEOUT"),["MOUSE_ENTER","MOUSE_LEAVE"].includes(f.trigger.type)?w(f.trigger.delayMs,`${p}.trigger.delayMs`,0,36e5):f.trigger.delayMs!==void 0&&a(p,"delayMs only applies to enter or leave");let S=`${f.sourceKey}:${f.trigger.type}`;te.has(S)&&a(p,"Duplicate source and trigger"),te.add(S)}}}let J=new Set;for(let[u,f]of M(s.flows??[],"$.flows",1e3).entries()){let p=`$.flows[${u}]`;y(f,p,["nodeKey","name"])&&(q("nodes",f.nodeKey,`${p}.nodeKey`),N(f.name,`${p}.name`,256),(b.nodes.get(f.nodeKey)?.parentKey!==null||b.nodes.get(f.nodeKey)?.type!=="FRAME")&&a(p,"Flow start must be a root FRAME"),J.has(f.nodeKey)&&a(p,"Duplicate flow start"),J.add(f.nodeKey))}if(l.length)throw new xe(l);return s}function ct(s){let i=new Map(s.nodes.map(k=>[k.key,k])),l=new Map,a=new Map,y=new Map((s.componentSets??[]).map(k=>[k.key,k])),N=new Map((s.componentSets??[]).flatMap(k=>k.memberKeys.map(b=>[b,k.key]))),v=new Map(s.nodes.filter(k=>k.type==="COMPONENT").map(k=>[k.key,new Set]));for(let k of s.nodes.filter(b=>b.type==="INSTANCE")){let b=new Set,x=i.get(k.parentKey);for(;x;){if(b.has(x.key))throw new Error("Cyclic parent/component dependency");b.add(x.key),x.type==="COMPONENT"&&v.get(x.key).add(k.props?.componentKey),x=i.get(x.parentKey)}}let w=new Set,A=new Set;function F(k){if(!w.has(k)){if(A.has(k))throw new Error("Cyclic component instance dependency");A.add(k);for(let b of v.get(k)??[])F(b);A.delete(k),w.add(k)}}for(let k of v.keys())F(k);let M=new Map;for(let k of s.nodes){let b=i.get(k.parentKey),x=new Set;for(;b;){if(x.has(b.key))throw new Error("Cyclic parent/component dependency");x.add(b.key),b.type==="COMPONENT"&&(M.has(b.key)||M.set(b.key,[]),M.get(b.key).push(k.key)),b=i.get(b.parentKey)}}for(let k of s.nodes){let b=N.get(k.key),x=N.get(k.props?.componentKey),B=q=>(y.get(q)?.memberKeys??[]).flatMap(D=>[D,...M.get(D)??[]]),Q=[...new Set([b?i.get(b)?.parentKey:k.parentKey,...x?[x]:[k.props?.componentKey,...M.get(k.props?.componentKey)??[]],...y.has(k.key)?B(k.key):[]].filter(Boolean))];l.set(k.key,Q.length);for(let q of Q){if(!i.has(q))throw new Error(`Unknown dependency ${q}`);a.has(q)||a.set(q,[]),a.get(q).push(k.key)}}let W=s.nodes.filter(k=>l.get(k.key)===0),K=[];for(let k=0;k<W.length;k++){let b=W[k];K.push(b);for(let x of a.get(b.key)??[])l.set(x,l.get(x)-1),l.get(x)===0&&W.push(i.get(x))}if(K.length!==s.nodes.length)throw new Error("Cyclic parent/component dependency");return K}var ft=/[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y,Ht={M:2,L:2,H:1,V:1,C:6,S:4,Q:4,T:2,A:7},ce=()=>{throw new Error("DESIGN_VECTOR_PATH_INVALID")};function mn(s,i,l,a,y,N,v,w,A){if(s===w&&i===A)return[];if(l=Math.abs(l),a=Math.abs(a),l===0||a===0)return[["L",w,A]];let F=y%360*Math.PI/180,M=Math.cos(F),W=Math.sin(F),K=(s-w)/2,k=(i-A)/2,b=M*K+W*k,x=-W*K+M*k,B=b/l,Q=x/a,q=Math.hypot(B,Q);(!Number.isFinite(q)||q===0)&&ce(),q>1&&(l*=q,a*=q,B=b/l,Q=x/a);let D=B*B+Q*Q;(!Number.isFinite(l)||!Number.isFinite(a)||!Number.isFinite(D)||D===0)&&ce();let R=(N===v?-1:1)*Math.sqrt(Math.max(0,(1-D)/D)),$=R*l*Q,U=-R*a*B,j=M*$-W*U+(s+w)/2,te=W*$+M*U+(i+A)/2,J=[(b-$)/l,(x-U)/a],u=[(-b-$)/l,(-x-U)/a],f=Math.atan2(J[1],J[0]),p=Math.atan2(J[0]*u[1]-J[1]*u[0],J[0]*u[0]+J[1]*u[1]);(!Number.isFinite(f)||!Number.isFinite(p))&&ce(),!v&&p>0&&(p-=Math.PI*2),v&&p<0&&(p+=Math.PI*2);let S=Math.max(1,Math.ceil(Math.abs(p)/(Math.PI/4))),C=p/S,_=X=>[j+l*M*Math.cos(X)-a*W*Math.sin(X),te+l*W*Math.cos(X)+a*M*Math.sin(X)],V=X=>[-l*M*Math.sin(X)-a*W*Math.cos(X),-l*W*Math.sin(X)+a*M*Math.cos(X)],ie=[];for(let X=0;X<S;X++){let ne=f+C,oe=4/3*Math.tan(C/4),re=X===0?[s,i]:_(f),he=X===S-1?[w,A]:_(ne),ke=V(f),Ae=V(ne);ie.push(["C",re[0]+oe*ke[0],re[1]+oe*ke[1],he[0]-oe*Ae[0],he[1]-oe*Ae[1],...he]),f=ne}return ie}function zt(s){(typeof s!="string"||s.length===0||s.length>2e5)&&ce();let i=0,l,a,y=0,N=0,v=0,w=0,A,F,M=[],W=()=>{for(;/\s/.test(s[i]??"")&&i<s.length;)i++},K=(k,b=!1)=>{if(W(),s[i]===","&&(k||ce(),i++,W()),b){let Q=s[i++];return Q!=="0"&&Q!=="1"&&ce(),Number(Q)}ft.lastIndex=i;let x=ft.exec(s);x||ce(),i=ft.lastIndex;let B=Number(x[0]);return Number.isFinite(B)||ce(),B};for(;W(),i!==s.length;){let k=!1;/[a-z]/i.test(s[i])&&(l=s[i++],k=!0),l||ce();let b=l.toUpperCase(),x=l!==b;if(!M.length&&b!=="M"&&ce(),b==="Z"){k||ce(),M.push(["Z"]),y=v,N=w,A=F=void 0,a=b,l=void 0;continue}Ht[b]||ce();let B=Array.from({length:Ht[b]},(U,j)=>K(j>0||!k,b==="A"&&(j===3||j===4))),Q=U=>U+(x?y:0),q=U=>U+(x?N:0),D,R,$;if(b==="M"||b==="L")D=[[b,Q(B[0]),q(B[1])]],b==="M"&&(v=D[0][1],w=D[0][2],l=x?"l":"L");else if(b==="H")D=[["L",Q(B[0]),N]];else if(b==="V")D=[["L",y,q(B[0])]];else if(b==="C"||b==="S"){let U=b==="C"?[Q(B[0]),q(B[1]),Q(B[2]),q(B[3]),Q(B[4]),q(B[5])]:[a==="C"||a==="S"?2*y-A[0]:y,a==="C"||a==="S"?2*N-A[1]:N,Q(B[0]),q(B[1]),Q(B[2]),q(B[3])];D=[["C",...U]],R=U.slice(2,4)}else if(b==="Q"||b==="T"){let U=b==="Q"?Q(B[0]):a==="Q"||a==="T"?2*y-F[0]:y,j=b==="Q"?q(B[1]):a==="Q"||a==="T"?2*N-F[1]:N,te=Q(B.at(-2)),J=q(B.at(-1));D=[["C",y+2/3*(U-y),N+2/3*(j-N),te+2/3*(U-te),J+2/3*(j-J),te,J]],$=[U,j]}else D=mn(y,N,...B.slice(0,5),Q(B[5]),q(B[6]));if(D.length){let U=D.at(-1);y=U.at(-2),N=U.at(-1),M.push(...D)}A=R,F=$,a=b}return(!M.length||M.some(k=>k.slice(1).some(b=>!Number.isFinite(b))))&&ce(),M}function Ut(s,i,l,a){let y=-s+3*i-3*l+a,N=2*(s-2*i+l),v=i-s;if([y,N,v].every(Number.isFinite)||ce(),y===0)return N===0?[]:[-v/N];let w=N*N-4*y*v;if(Number.isFinite(w)||ce(),w<0)return[];let A=-.5*(N+(N<0?-1:1)*Math.sqrt(w));return A===0?[-N/(2*y)]:[A/y,v/A]}function Tn(s){let i=1/0,l=1/0,a=-1/0,y=-1/0,N=!1,v=(F,M)=>{(!Number.isFinite(F)||!Number.isFinite(M))&&ce(),i=Math.min(i,F),l=Math.min(l,M),a=Math.max(a,F),y=Math.max(y,M)};for(let F of s){let M=0,W=0,K=0,k=0;for(let b of F){let[x,...B]=b;if(x==="Z"){M=K,W=k;continue}if(x==="C"){N=!0;let Q=(D,R,$,U,j)=>(1-j)**3*D+3*(1-j)**2*j*R+3*(1-j)*j**2*$+j**3*U,q=[...Ut(M,B[0],B[2],B[4]),...Ut(W,B[1],B[3],B[5])];for(let D of q)D>0&&D<1&&v(Q(M,B[0],B[2],B[4],D),Q(W,B[1],B[3],B[5],D))}else x==="L"&&(N=!0);M=B.at(-2),W=B.at(-1),v(M,W),x==="M"&&(K=M,k=W)}}let w=a-i,A=y-l;return(!N||![i,l,w,A].every(Number.isFinite)||w<=0||A<=0)&&ce(),{left:i,top:l,width:w,height:A}}function lt(s,i){let l=s.map(a=>zt(a.data));if(i!==void 0){(!Number.isFinite(i?.width)||!Number.isFinite(i?.height)||i.width<.01||i.height<.01)&&ce();let a=Tn(l),y=i.width/a.width,N=i.height/a.height;(!Number.isFinite(y)||!Number.isFinite(N)||y<=0||N<=0)&&ce();for(let v of l)for(let w of v)for(let A=1;A<w.length;A++)w[A]=(w[A]-(A%2?a.left:a.top))*(A%2?y:N),Number.isFinite(w[A])||ce()}return s.map((a,y)=>({...a,data:l[y].map(N=>N.join(" ")).join(" ")}))}function Vt(s){let i=[],l,a;for(let y of zt(s)){if(y[0]==="M"&&(l=y[1],a=y[2]),y[0]==="Z"){let N=i.at(-1);N?.[0]==="L"&&N[1]===l&&N[2]===a&&i.pop()}i.push(y)}return i}function Wt(s,i,l=.001){if(!Array.isArray(s)||s.length!==i.length)return!1;try{return i.every((a,y)=>{if(a.windingRule!==s[y].windingRule)return!1;let N=Vt(s[y].data),v=Vt(a.data);return N.length===v.length&&v.every((w,A)=>w.length===N[A].length&&w.every((F,M)=>M===0?F===N[A][M]:Math.abs(F-N[A][M])<=l))})}catch{return!1}}var Ie=Object.freeze({chunkBytes:1024*1024,requestBytes:7*1024*1024,assetBytes:20*1024*1024,totalAssetBytes:80*1024*1024,assets:2e3,chunksPerAsset:4096,chunks:1e4});var se=(s,i)=>{if(!s)throw new Error(i)},qe=/^[a-f0-9]{64}$/,_n=/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,159}$/,pt=s=>Array.isArray(s)?`[${s.map(pt).join(",")}]`:s&&typeof s=="object"?`{${Object.keys(s).sort().map(i=>`${JSON.stringify(i)}:${pt(s[i])}`).join(",")}}`:JSON.stringify(s),Xe=(s,i)=>s&&typeof s=="object"&&!Array.isArray(s)&&[Object.prototype,null].includes(Object.getPrototypeOf(s))&&Object.keys(s).length===i.length&&i.every(l=>Object.hasOwn(s,l));function On(s){let i=new Uint8Array(s.length*3),l=0;for(let a of s){let y=a.codePointAt(0);y>=55296&&y<=57343&&(y=65533),y<128?i[l++]=y:y<2048?(i[l++]=192|y>>6,i[l++]=128|y&63):y<65536?(i[l++]=224|y>>12,i[l++]=128|y>>6&63,i[l++]=128|y&63):(i[l++]=240|y>>18,i[l++]=128|y>>12&63,i[l++]=128|y>>6&63,i[l++]=128|y&63)}return i.subarray(0,l)}function xt(s){return s.length*3/4-(s.endsWith("==")?2:s.endsWith("=")?1:0)}function An(s){se(typeof s=="string"&&s.length<=Math.ceil(Ie.chunkBytes/3)*4&&Ye(s),"DESIGN_ASSET_CHUNK_INVALID");let i=xt(s);se(i>0&&i<=Ie.chunkBytes,"DESIGN_ASSET_CHUNK_BUDGET");let l=new Uint8Array(i),a="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",y=0;for(let N=0;N<s.length;N+=4){let v=a.indexOf(s[N])<<18|a.indexOf(s[N+1])<<12|Math.max(0,a.indexOf(s[N+2]))<<6|Math.max(0,a.indexOf(s[N+3]));l[y++]=v>>16&255,y<i&&(l[y++]=v>>8&255),y<i&&(l[y++]=v&255)}return l}function bn(s){se(Array.isArray(s)&&s.length<=Ie.assets,"DESIGN_ASSET_MANIFEST_INVALID");let i=new Map,l=0;for(let a of s){if(typeof a?.dataBase64=="string"){l+=xt(a.dataBase64);continue}se(Xe(a,["key","mimeType","sha256","decodedBytes"])&&_n.test(a.key)&&!["constructor","prototype","__proto__"].includes(a.key)&&["image/png","image/jpeg","image/webp"].includes(a.mimeType)&&qe.test(a.sha256)&&Number.isSafeInteger(a.decodedBytes)&&a.decodedBytes>0&&a.decodedBytes<=Ie.assetBytes&&!i.has(a.key),"DESIGN_ASSET_MANIFEST_INVALID"),i.set(a.key,a),l+=a.decodedBytes}return se(l<=Ie.totalAssetBytes,"DESIGN_ASSET_TOTAL_BUDGET"),i}function Cn(s){let i=l=>typeof l=="string"&&l.length>0&&l.length<=512;se(Xe(s,["specSignature","runId","scope","ownership"])&&qe.test(s.specSignature)&&typeof s.runId=="string"&&/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(s.runId)&&Xe(s.scope,["fileIdentity","pageId","rootNodeId"])&&/^figma-file:[A-Za-z0-9_-]+$/.test(s.scope.fileIdentity)&&/^\d+:\d+$/.test(s.scope.pageId)&&/^\d+:\d+$/.test(s.scope.rootNodeId)&&Xe(s.ownership,["workspaceId","taskId","revision"])&&Object.values(s.ownership).every(i),"DESIGN_ASSET_BINDING_INVALID")}function Yt(s,i){return i==="image/png"?s.length>=8&&[137,80,78,71,13,10,26,10].every((l,a)=>s[a]===l):i==="image/jpeg"?s.length>=3&&s[0]===255&&s[1]===216&&s[2]===255:s.length>=12&&String.fromCharCode(...s.subarray(0,4))==="RIFF"&&String.fromCharCode(...s.subarray(8,12))==="WEBP"}function Xt(s){for(let D of["sha256Bytes","createImage","readImageBytes","readLedger","writeLedger","verifyContext"])se(typeof s?.[D]=="function","DESIGN_ASSET_HOOK_REQUIRED");let i=new Map,l=new Map,a=0,y=0,N=!1,v=D=>{let R=s.sha256Bytes(D);return se(typeof R=="string"&&qe.test(R),"DESIGN_ASSET_HASH_HOOK_INVALID"),R};async function w(D,R){Cn(D?.binding);let $=bn(D.assets),U=v(On(pt(D.binding)));return await s.verifyContext(D.binding,{mutation:R}),{request:D,binding:D.binding,assets:$,bindingHash:U,mutation:R}}let A=D=>s.verifyContext(D.binding,{mutation:D.mutation}),F=(D,R)=>`${D.bindingHash}:${R.sha256}`;function M(D){let R=i.get(D);R&&(i.delete(D),a-=R.decodedBytes,y-=R.parts.size)}async function W(D,R){await A(D);let $=await s.readLedger(D.binding,R);return await A(D),$?(se(["PENDING","COMMITTED"].includes($.status)&&$.bindingHash===D.bindingHash&&$.sha256===R.sha256&&$.decodedBytes===R.decodedBytes&&$.mimeType===R.mimeType,"DESIGN_ASSET_LEDGER_CONFLICT"),$):null}async function K(D,R,$){if(typeof $!="string"||!$.length||$.length>256)return!1;await A(D);let U=await s.readImageBytes($);return await A(D),U instanceof Uint8Array&&U.byteLength===R.decodedBytes&&Yt(U,R.mimeType)&&v(U)===R.sha256}function k(D,R){let $=i.get(F(D,R));if(!$)return{receivedBytes:0,missingRanges:[{offset:0,bytes:R.decodedBytes}],missingRangeCount:1};let U=[...$.parts].sort((u,f)=>u[0]-f[0]),j=0,te=0,J=[];for(let[u,f]of U)j<u&&(te++,J.length<16&&J.push({offset:j,bytes:u-j})),j=u+f.bytes.length;return j<R.decodedBytes&&(te++,J.length<16&&J.push({offset:j,bytes:R.decodedBytes-j})),{receivedBytes:$.received,missingRanges:J,missingRangeCount:te}}async function b(D,R){let $=await W(D,R);if($?.status==="COMMITTED")return{key:R.key,status:await K(D,R,$.imageHash)?"COMMITTED":"OUTCOME_UNKNOWN",receivedBytes:R.decodedBytes,imageHash:$.imageHash};if($?.status==="PENDING")return{key:R.key,status:"OUTCOME_UNKNOWN",receivedBytes:k(D,R).receivedBytes};let U=k(D,R);return{key:R.key,status:U.receivedBytes===R.decodedBytes?"STAGED":U.receivedBytes?"INCOMPLETE":"NOT_STAGED",...U}}async function x(D){let R=await w(D,!1),$=[];for(let U of R.assets.values())$.push(await b(R,U));return{status:$.every(U=>U.status==="COMMITTED")?"READY":"INCOMPLETE",writes:0,bindingHash:R.bindingHash,assets:$}}async function B(D){let R=await w(D,!0),$=R.assets.get(D.assetKey);se($,"DESIGN_ASSET_REFERENCE_INVALID");let U=An(D.dataBase64);se(Number.isSafeInteger(D.offset)&&D.offset>=0&&D.offset+U.length<=$.decodedBytes,"DESIGN_ASSET_OFFSET_INVALID"),se(qe.test(D.chunkSha256)&&v(U)===D.chunkSha256,"DESIGN_ASSET_CHUNK_HASH_MISMATCH");let j=await W(R,$);if(j)return se(j.status==="COMMITTED"&&await K(R,$,j.imageHash),"DESIGN_ASSET_OUTCOME_UNKNOWN"),{status:"COMMITTED",writes:0,receivedBytes:$.decodedBytes,idempotent:!0};let te=F(R,$),J=i.get(te);J||(se(i.size<Ie.assets&&a+$.decodedBytes<=Ie.totalAssetBytes,"DESIGN_ASSET_MEMORY_BUDGET"),J={parts:new Map,received:0,decodedBytes:$.decodedBytes,mimeType:$.mimeType},i.set(te,J),a+=$.decodedBytes),se(J.decodedBytes===$.decodedBytes&&J.mimeType===$.mimeType,"DESIGN_ASSET_CONTENT_CONFLICT");let u=J.parts.get(D.offset);if(u)return se(u.hash===D.chunkSha256&&u.bytes.length===U.length,"DESIGN_ASSET_CHUNK_CONFLICT"),{status:J.received===$.decodedBytes?"STAGED":"INCOMPLETE",writes:0,receivedBytes:J.received,idempotent:!0};for(let[f,p]of J.parts)se(D.offset+U.length<=f||D.offset>=f+p.bytes.length,"DESIGN_ASSET_CHUNK_OVERLAP");return se(J.parts.size<Ie.chunksPerAsset&&y<Ie.chunks,"DESIGN_ASSET_CHUNK_COUNT_BUDGET"),await A(R),J.parts.set(D.offset,{bytes:U,hash:D.chunkSha256}),J.received+=U.length,y++,{status:J.received===$.decodedBytes?"STAGED":"INCOMPLETE",writes:0,receivedBytes:J.received,idempotent:!1}}async function Q(D){let R=await w(D,!0),$=R.assets.get(D.assetKey);se($,"DESIGN_ASSET_REFERENCE_INVALID");let U=F(R,$),j=await W(R,$);if(j?.status==="COMMITTED")return se(await K(R,$,j.imageHash),"DESIGN_ASSET_OUTCOME_UNKNOWN"),{status:"COMMITTED",writes:0,imageHash:j.imageHash,idempotent:!0};let te=l.get(U);if(j?.status==="PENDING"){se(te&&await K(R,$,te),"DESIGN_ASSET_OUTCOME_UNKNOWN"),await A(R);try{await s.writeLedger(R.binding,$,{...j,status:"COMMITTED",imageHash:te}),await A(R)}catch{throw new Error("DESIGN_ASSET_OUTCOME_UNKNOWN")}return M(U),{status:"COMMITTED",writes:1,imageHash:te,idempotent:!0,reconciled:!0}}let J=i.get(U),u=te&&await K(R,$,te);se(!te||u,"DESIGN_ASSET_OUTCOME_UNKNOWN");let f;if(!u){se(J&&J.received===$.decodedBytes,"DESIGN_ASSET_INCOMPLETE"),f=new Uint8Array($.decodedBytes);for(let[S,C]of J.parts)f.set(C.bytes,S);se(v(f)===$.sha256,"DESIGN_ASSET_HASH_MISMATCH"),se(Yt(f,$.mimeType),"DESIGN_ASSET_MIME_MISMATCH")}se(l.size<Ie.assets||l.has(U),"DESIGN_ASSET_MEMORY_BUDGET");let p={status:"PENDING",sha256:$.sha256,decodedBytes:$.decodedBytes,mimeType:$.mimeType,bindingHash:R.bindingHash};await A(R);try{await s.writeLedger(R.binding,$,p),await A(R);let S=te;return u||(await A(R),S=(await s.createImage(f))?.hash,typeof S=="string"&&S.length<=256&&l.set(U,S),await A(R),se(await K(R,$,S),"DESIGN_ASSET_NATIVE_READBACK_FAILED")),await A(R),await s.writeLedger(R.binding,$,{...p,status:"COMMITTED",imageHash:S}),await A(R),M(U),{status:"COMMITTED",writes:3,imageHash:S,idempotent:!!te}}catch{throw new Error("DESIGN_ASSET_OUTCOME_UNKNOWN")}}let q=D=>async R=>{se(!N,"DESIGN_ASSET_BUSY"),N=!0;try{return await D(R)}finally{N=!1}};return{plan:q(x),stage:q(B),commit:q(Q)}}var me="bridge-design-v1-",Oe=`${me}spec`,Se=`${me}digest`,we=`${me}intent`,Ke=`${me}state`,je=`${me}source`,gt={NONE:"NONE",HORIZONTAL:"HORIZONTAL",VERTICAL:"VERTICAL",BOTH:"BOTH"},Dn=Object.fromEntries(Object.entries(gt).map(([s,i])=>[i,s])),ee=s=>JSON.parse(JSON.stringify(s));function ve(s){let i=new Uint8Array(s.length*3),l=0;for(let a of s){let y=a.codePointAt(0);y>=55296&&y<=57343&&(y=65533),y<128?i[l++]=y:y<2048?(i[l++]=192|y>>6,i[l++]=128|y&63):y<65536?(i[l++]=224|y>>12,i[l++]=128|y>>6&63,i[l++]=128|y&63):(i[l++]=240|y>>18,i[l++]=128|y>>12&63,i[l++]=128|y>>6&63,i[l++]=128|y&63)}return i.subarray(0,l)}function H(s){return Array.isArray(s)?`[${s.map(H).join(",")}]`:s&&typeof s=="object"?`{${Object.keys(s).filter(i=>s[i]!==void 0).sort().map(i=>`${JSON.stringify(i)}:${H(s[i])}`).join(",")}}`:JSON.stringify(s)}var Z=s=>Ve(We(ve(H(s)))),E=(s,i)=>{if(!s)throw new Error(i)},Me=(s,i)=>{let l=s.getPluginData(i);return l?JSON.parse(l):null},fe=s=>typeof s=="symbol"||s===void 0?null:ee(s),ue=s=>`${s.family}\0${s.style}`,yt=s=>s?.unit==="AUTO"?{unit:"AUTO"}:ee(s),ut=["layoutMode","itemSpacing","paddingTop","paddingRight","paddingBottom","paddingLeft","primaryAxisAlignItems","counterAxisAlignItems","layoutWrap","layoutSizingHorizontal","layoutSizingVertical","constraints","isMask","maskType","rotation","relativeTransform"],Ze=["fontName","fontSize","lineHeight","letterSpacing","fills"];function Ne(s,i){return typeof i=="number"?typeof s=="number"&&Number.isFinite(s)&&Math.abs(s-i)<=.001:Array.isArray(i)?Array.isArray(s)&&s.length===i.length&&i.every((l,a)=>Ne(s[a],l)):i&&typeof i=="object"?s&&typeof s=="object"&&Object.keys(i).every(l=>Ne(s[l],i[l])):s===i}function qt(s){let i="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",l=new Uint8Array(s.length*3/4-(s.endsWith("==")?2:s.endsWith("=")?1:0)),a=0;for(let y=0;y<s.length;y+=4){let N=i.indexOf(s[y])<<18|i.indexOf(s[y+1])<<12|Math.max(0,i.indexOf(s[y+2]))<<6|Math.max(0,i.indexOf(s[y+3]));a<l.length&&(l[a++]=N>>>16&255),a<l.length&&(l[a++]=N>>>8&255),a<l.length&&(l[a++]=N&255)}return l}function Rn(s){let i="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",l="";for(let a=0;a<s.length;a+=3){let y=s[a]<<16|(s[a+1]??0)<<8|(s[a+2]??0);l+=i[y>>>18&63]+i[y>>>12&63]+(a+1<s.length?i[y>>>6&63]:"=")+(a+2<s.length?i[y&63]:"=")}return l}function wn(s,i){let l=!1,a,y=()=>i.onMutation?.(),N=(e,t,n)=>{y(),e.setPluginData(t,typeof n=="string"?n:JSON.stringify(n))},v=Xt({sha256Bytes:e=>Ve(We(e)),createImage:e=>(y(),s.createImage(e)),readImageBytes:async e=>await s.getImageByHash?.(e)?.getBytesAsync?.(),readLedger:(e,t)=>K(a,"asset-transfer",t.key),writeLedger:(e,t,n)=>N(a.scope.root,M(a,"asset-transfer",t.key),n),verifyContext:async(e,{mutation:t})=>{let n=a;E(n&&e.specSignature===n.signature&&e.runId===n.payload.runId,"DESIGN_ASSET_CONTEXT_CHANGED");let o=await i.resolveScope(n.message.trustedScope);E(o.root===n.scope.root&&o.page===n.scope.page,"DESIGN_ASSET_SCOPE_CHANGED"),i.assertTrustedOwnership(n.ownership,n.message.operationId),i.assertInScope(n.scope.root,n.scope),t&&n.scope.root.type!=="PAGE"&&i.assertTaskOwned(n.scope.root,n.ownership)}}),w=e=>({binding:{specSignature:e.signature,runId:e.payload.runId,scope:{fileIdentity:e.message.trustedScope.fileIdentity,pageId:e.message.trustedScope.pageId,rootNodeId:e.message.trustedScope.rootNodeId},ownership:{workspaceId:e.ownership.workspaceId,taskId:e.ownership.taskId,revision:e.ownership.revision}},assets:e.spec.assets??[]});async function A(e){let t=await i.resolveScope(e.trustedScope);i.assertTrustedOwnership(e.trustedOwnership,e.operationId);let n=e.payload??{};E(typeof n.runId=="string"&&/^[A-Za-z0-9._:-]{1,160}$/.test(n.runId),"DESIGN_RUN_ID_REQUIRED");let o=Bt(n.spec),d=e.trustedOwnership,c=Z({workspace:d.workspaceId,task:d.taskId,spec:o.id}).slice(0,24),m=`${me}${c}-ledger`,I=Z(o),T=n.timerUnit??"milliseconds";E(["seconds","milliseconds"].includes(T),"DESIGN_TIMER_UNIT_INVALID");let L=Me(t.root,m);L&&(E(L.specSignature===I,"DESIGN_SPEC_REVISION_CONFLICT: use a new spec id for a changed specification"),E(L.timerUnit===T,"DESIGN_TIMER_UNIT_CONFLICT"));let r={message:e,scope:t,payload:n,spec:o,ownership:d,ns:c,ledgerKey:m,signature:I,timerUnit:T,state:L??{version:1,specSignature:I,timerUnit:T,cursor:0,pending:null,complete:!1},existing:!!L,map:new Map,idToKey:new Map,fonts:new Map,substitutions:[],styles:new Map,variables:new Map,images:new Map,resourceKeys:{styles:new Map,variables:new Map,images:new Map},preparedComponents:new Set};r.order=ct(o),r.definitions=new Map(r.order.map(O=>[O.key,O])),r.componentSets=new Map((o.componentSets??[]).map(O=>[O.key,O])),r.memberSets=new Map((o.componentSets??[]).flatMap(O=>O.memberKeys.map(P=>[P,O.key]))),r.children=new Map,r.reactionDefs=new Map;for(let O of o.nodes)r.children.has(O.parentKey)||r.children.set(O.parentKey,[]),r.children.get(O.parentKey).push(O);for(let O of o.reactions??[])r.reactionDefs.has(O.sourceKey)||r.reactionDefs.set(O.sourceKey,[]),r.reactionDefs.get(O.sourceKey).push(O);let g=new Map,h=!1;for(let O=0;O<r.order.length;O+=16){let P=r.order.slice(O,O+16).map(z=>({def:z,record:null})),G=await Promise.allSettled(P.map(async z=>(z.record=Me(t.root,`${me}${c}-n-${Z(z.def.key).slice(0,24)}`),z.record?await s.getNodeByIdAsync(z.record.id):null)));for(let z=0;z<P.length;z++){let{def:Y,record:de}=P[z],pe=G[z];if(pe.status==="rejected")throw pe.reason;if(!de)continue;let le=pe.value;if(!le||le.getPluginData(Oe)!==c||le.getPluginData(i.specNodeKey)!==Y.key){if(!h){let et=[...t.root.children??[]];for(let tt=0;tt<et.length;tt++){let De=et[tt];if(De.getPluginData(Oe)===c){let nt=De.getPluginData(i.specNodeKey);g.has(nt)||g.set(nt,[]),g.get(nt).push(De)}"children"in De&&De.type!=="INSTANCE"&&et.push(...De.children)}h=!0}let Fe=g.get(Y.key)??[];E(Fe.length===1,`DESIGN_MAPPING_AMBIGUOUS:${Y.key}`),le=Fe[0]}E(le&&!le.removed,`DESIGN_NODE_MISSING:${Y.key}`),i.assertInScope(le,t),i.assertTaskOwned(le,d),E(le.getPluginData(Oe)===c&&le.getPluginData(i.specNodeKey)===Y.key,`DESIGN_KEY_OWNERSHIP_CONFLICT:${Y.key}`),E(le.type===Y.type,`DESIGN_NODE_TYPE_CONFLICT:${Y.key}`),r.map.set(Y.key,le),r.idToKey.set(le.id,Y.key),Y.type==="INSTANCE"&&E((await le.getMainComponentAsync())?.id===r.map.get(Y.props.componentKey)?.id,`DESIGN_INSTANCE_COMPONENT_CONFLICT:${Y.key}`)}}return r}let F=e=>{i.assertInScope(e.scope.root,e.scope),N(e.scope.root,e.ledgerKey,e.state)},M=(e,t,n)=>`${me}${e.ns}-${t}-${Z(n).slice(0,24)}`,W=(e,t,n)=>`${me}${e.ns}:${t}:${n}`,K=(e,t,n)=>Me(e.scope.root,M(e,t,n));function k(e,t,n,o){e[t].set(n,o);let d=t==="images"?o:o.id;e.resourceKeys[t].has(d)||e.resourceKeys[t].set(d,n)}function b(e,t=!1,n=!1){let o={type:e.type,name:e.name,parentKey:e.parent?.getPluginData?.(i.specNodeKey)??""};for(let d of["x","y","width","height","visible","opacity","fills","strokes","strokeWeight","cornerRadius","clipsContent","overflowDirection","numberOfFixedChildren","layoutPositioning","characters","fontName","fontSize","lineHeight","letterSpacing","textAlignHorizontal","textAutoResize","vectorPaths","effects","strokeAlign","dashPattern"])d in e&&(o[d]=fe(e[d]));if("textStyleId"in e&&(o.textStyleId=e.textStyleId),n&&e.type==="COMPONENT_SET"&&(o.memberKeys=e.children.map(d=>d.getPluginData(i.specNodeKey)??"")),n&&(t||e.type==="INSTANCE")&&(o.inheritedReactions=ne(e)),n){for(let d of ut)d in e&&(o[d]=fe(e[d]));e.type==="TEXT"&&(E(typeof e.getStyledTextSegments=="function","DESIGN_TEXT_RANGE_READ_UNSUPPORTED"),o.textRanges=fe(e.getStyledTextSegments(Ze))),o.layoutDriven={position:["HORIZONTAL","VERTICAL"].includes(e.parent?.layoutMode)&&e.layoutPositioning!=="ABSOLUTE",width:["HUG","FILL"].includes(e.layoutSizingHorizontal),height:["HUG","FILL"].includes(e.layoutSizingVertical)}}return t&&(o.sourceKey=e.getPluginData(je)),(e.type==="INSTANCE"||t)&&"children"in e&&(o.instanceChildren=e.children.map(d=>b(d,!0,n))),o}function x(e,t){let n={...t};t.layoutDriven&&(t.layoutDriven.position&&(n.x=0,n.y=0,n.relativeTransform&&(n.relativeTransform=ee(n.relativeTransform),n.relativeTransform[0][2]=0,n.relativeTransform[1][2]=0)),t.layoutDriven.width&&(n.width=0),t.layoutDriven.height&&(n.height=0));for(let o of["fills","strokes"])Array.isArray(n[o])&&(n[o]=n[o].map(d=>{let c=ee(d);return c.boundVariables?.color?.id&&(c.boundVariables.color.id=e.resourceKeys.variables.get(c.boundVariables.color.id)??"UNKNOWN"),c.imageHash&&(c.imageHash=e.resourceKeys.images.get(c.imageHash)??"UNKNOWN"),c}));return"textStyleId"in t&&(n.textStyleKey=t.textStyleId?e.resourceKeys.styles.get(t.textStyleId)??"UNKNOWN":null,delete n.textStyleId),t.textRanges&&(n.textRanges=t.textRanges.map(o=>({...o,...Array.isArray(o.fills)?{fills:x(e,{fills:o.fills}).fills}:{}}))),t.instanceChildren&&(n.instanceChildren=t.instanceChildren.map(o=>x(e,o))),t.inheritedReactions&&(n.inheritedReactions=re(e,{reactions:t.inheritedReactions})),n}let B=(e,t,n=!1)=>x(e,b(t,n,e.spec.schemaVersion==="1.1"));function Q(e,t,n,o){i.assertInScope(n,e.scope),i.assertTaskOwned(n,e.ownership),E(n.getPluginData(we)===Z(t),`DESIGN_INTENT_CONFLICT:${t.key}`);let d=n.getPluginData(Se),c=b(n,!1,e.spec.schemaVersion==="1.1"),m=o&&Object.hasOwn(c,"inheritedReactions")?{...c,inheritedReactions:o.inheritedReactions}:c;if(d&&E(d===Z(x(e,m)),`DESIGN_USER_EDIT_CONFLICT:${t.key}`),"children"in n&&n.type!=="INSTANCE")for(let I of n.children)i.assertTaskOwned(I,e.ownership),E(I.getPluginData(Oe)===e.ns,`DESIGN_FOREIGN_CHILD:${t.key}`);return c}function q(e){i.assertInScope(e.scope.root,e.scope);for(let t of e.order)if(e.map.has(t.key)){let n=e.map.get(t.key),o=Q(e,t,n);R(e,t,n,o)}}function D(e,t){let n=e.memberSets.get(t.key);if(!n||e.map.has(n))return t;let o=e.definitions.get(n),d={...t,x:t.x+o.x,y:t.y+o.y};return t.props?.relativeTransform&&(d.props={...t.props,relativeTransform:ee(t.props.relativeTransform)},d.props.relativeTransform[0][2]+=o.x,d.props.relativeTransform[1][2]+=o.y),d}function R(e,t,n,o){let d=D(e,t),c=o??n,m=d.props??{},I={name:d.name??d.key,x:d.x,y:d.y};(d.type!=="TEXT"||!m.textAutoResize||m.textAutoResize==="NONE")&&Object.assign(I,{width:d.width,height:d.height});for(let T of["strokeWeight","strokeAlign","dashPattern","cornerRadius","opacity","visible","clipsContent","characters","fontSize","lineHeight","letterSpacing","textAlignHorizontal","textAutoResize"])m[T]!==void 0&&(I[T]=m[T]);if(m.vectorPaths&&(I.vectorPaths=lt(m.vectorPaths,{width:d.width,height:d.height})),m.overflowDirection&&(I.overflowDirection=gt[m.overflowDirection]),m.effects&&(I.effects=m.effects.map(T=>({...T,blendMode:"NORMAL",visible:T.visible??!0,spread:T.spread??0}))),m.fills&&(I.fills=S(e,m.fills)),m.strokes&&(I.strokes=S(e,m.strokes)),e.spec.schemaVersion==="1.1"){for(let T of ut)m[T]!==void 0&&(I[T]=m[T]);["HORIZONTAL","VERTICAL"].includes(n.parent?.layoutMode)&&m.layoutPositioning!=="ABSOLUTE"&&(delete I.x,delete I.y,I.relativeTransform&&(I.relativeTransform=ee(I.relativeTransform),I.relativeTransform[0][2]=c.relativeTransform?.[0]?.[2],I.relativeTransform[1][2]=c.relativeTransform?.[1]?.[2])),["HUG","FILL"].includes(m.layoutSizingHorizontal)&&delete I.width,["HUG","FILL"].includes(m.layoutSizingVertical)&&delete I.height}if(d.type==="TEXT"){let T=m.fontName??e.spec.textStyles.find(L=>L.key===m.textStyleKey).fontName;if(I.fontName=e.fonts.get(ue(T)),m.textStyleKey&&(I.textStyleId=e.styles.get(m.textStyleKey)?.id),m.textRanges){for(let L of Ze)m.textRanges.some(r=>r[L]!==void 0)&&delete I[L];_(e,n,m.textRanges,d.key)}}for(let[T,L]of Object.entries(I)){if(T==="vectorPaths"?Wt(c[T],L):Ne(c[T],L))continue;let g=new Error(`DESIGN_PROPERTY_READBACK_MISMATCH:${d.key}:${T}`);if(T==="fills"||T==="strokes"){let h={nodeKey:d.key,field:T,expected:fe(L),actual:fe(c[T])};g.readbackMismatch=JSON.stringify(h).length<=8192?h:{nodeKey:d.key,field:T,status:"NOT_VERIFIED_BUDGET_EXCEEDED",budgetCharacters:8192}}throw g}if(d.type==="INSTANCE"&&m.overrides?.length){let T=[...o?o.instanceChildren??[]:n.children],L=new Map;for(let r=0;r<T.length;r++){let g=T[r];L.set(o?g.sourceKey:g.getPluginData(je),g);let h=o?g.instanceChildren:g.children;h&&T.push(...h)}for(let r of m.overrides){let g=L.get(r.sourceKey);E(g,`DESIGN_OVERRIDE_SOURCE_MISSING:${r.sourceKey}`);for(let h of Object.keys(r).filter(O=>!["sourceKey","textRanges"].includes(O)&&!r.textRanges?.some(P=>P[O]!==void 0)))r[h]!==void 0&&E(Ne(g[h],["fills","strokes"].includes(h)?S(e,r[h]):h==="fontName"?e.fonts.get(ue(r.fontName)):r[h]),`DESIGN_OVERRIDE_READBACK_MISMATCH:${d.key}:${r.sourceKey}:${h}`);if(r.textRanges){let h=[...n.children],O;for(let P=0;P<h.length;P++)h[P].getPluginData(je)===r.sourceKey&&(O=h[P]),h[P].children&&h.push(...h[P].children);E(O,`DESIGN_OVERRIDE_SOURCE_MISSING:${r.sourceKey}`),_(e,O,r.textRanges,d.key)}}}}async function $(e,t){let n=[...(e.spec.textStyles??[]).map(d=>d.fontName),...e.spec.nodes.filter(d=>d.type==="TEXT"&&d.props.fontName).map(d=>d.props.fontName),...e.spec.nodes.flatMap(d=>[...d.props?.textRanges??[],...(d.props?.overrides??[]).flatMap(c=>[c.fontName?{fontName:c.fontName}:null,...c.textRanges??[]].filter(Boolean))].map(c=>c.fontName))],o=typeof s.listAvailableFontsAsync=="function"?new Set((await s.listAvailableFontsAsync()).map(d=>ue(d.fontName))):null;for(let d of n){let c=ue(d);if(e.fonts.has(c))continue;let m=d;if(o&&!o.has(c)&&(E(e.spec.fontPolicy?.allowFallback,`DESIGN_FONT_MISSING:${d.family}/${d.style}`),m=e.spec.fontPolicy.fallback,E(o.has(ue(m)),`DESIGN_FALLBACK_FONT_MISSING:${m.family}/${m.style}`)),t)try{await s.loadFontAsync(m)}catch(I){if(m!==d||!e.spec.fontPolicy?.allowFallback)throw I;m=e.spec.fontPolicy.fallback,await s.loadFontAsync(m)}e.fonts.set(c,ee(m)),ue(m)!==c&&e.substitutions.push({requested:ee(d),used:ee(m)})}}async function U(e){let t;(e.spec.assets??[]).some(o=>!o.dataBase64)&&(a=e,t=new Map((await v.plan(w(e))).assets.map(o=>[o.key,o])));for(let o of e.spec.assets??[]){let d=K(e,"image",o.key);if(!o.dataBase64){let c=K(e,"asset-transfer",o.key);!d&&c?.status==="COMMITTED"&&(d={hash:c.imageHash,signature:Z(o)}),d&&(E(c?.status==="COMMITTED"&&c.sha256===o.sha256&&c.imageHash===d.hash&&c.decodedBytes===o.decodedBytes,`DESIGN_ASSET_CONFLICT:${o.key}`),E(t.get(o.key)?.status==="COMMITTED"&&t.get(o.key)?.imageHash===d.hash,`DESIGN_ASSET_READBACK_MISMATCH:${o.key}`))}d&&(E(d.signature===Z(o),`DESIGN_ASSET_CONFLICT:${o.key}`),k(e,"images",o.key,d.hash))}for(let o of e.spec.textStyles??[]){let d=K(e,"style",o.key);if(!d)continue;let c=await s.getStyleByIdAsync(d.id);if(!c||c.description!==W(e,"style",o.key)){let m=(await s.getLocalTextStylesAsync()).filter(I=>I.description===W(e,"style",o.key));E(m.length===1,`DESIGN_STYLE_MAPPING_AMBIGUOUS:${o.key}`),c=m[0]}E(c&&c.type==="TEXT"&&c.description===W(e,"style",o.key),`DESIGN_STYLE_OWNERSHIP_CONFLICT:${o.key}`),E(d.digest===Z(j(c)),`DESIGN_STYLE_USER_EDIT_CONFLICT:${o.key}`),k(e,"styles",o.key,c)}let n=K(e,"collection","colors");if(n){let o=await s.variables.getVariableCollectionByIdAsync(n.id);if(!o||o.name!==n.name){let d=(await s.variables.getLocalVariableCollectionsAsync()).filter(c=>c.name===n.name);E(d.length===1,"DESIGN_COLLECTION_MAPPING_AMBIGUOUS"),o=d[0]}E(o.name===`Bridge/${e.ns}/Colors`,"DESIGN_COLLECTION_OWNERSHIP_CONFLICT"),n.digest&&E(n.digest===Z(J(o)),"DESIGN_COLLECTION_USER_EDIT_CONFLICT"),e.collection=o}for(let o of e.spec.variables??[]){let d=K(e,"variable",o.key);if(!d)continue;let c=await s.variables.getVariableByIdAsync(d.id);if(!c||c.description!==W(e,"variable",o.key)){let m=(await s.variables.getLocalVariablesAsync(o.type??"COLOR")).filter(I=>I.description===W(e,"variable",o.key));E(m.length===1,`DESIGN_VARIABLE_MAPPING_AMBIGUOUS:${o.key}`),c=m[0]}E(c&&c.description===W(e,"variable",o.key),`DESIGN_VARIABLE_OWNERSHIP_CONFLICT:${o.key}`),E(e.collection&&c.variableCollectionId===e.collection.id,`DESIGN_VARIABLE_COLLECTION_CONFLICT:${o.key}`),E(d.digest===Z(te(c)),`DESIGN_VARIABLE_USER_EDIT_CONFLICT:${o.key}`),k(e,"variables",o.key,c)}}let j=e=>({name:e.name,fontName:fe(e.fontName),fontSize:e.fontSize,lineHeight:fe(e.lineHeight),letterSpacing:fe(e.letterSpacing)}),te=e=>({name:e.name,resolvedType:e.resolvedType,values:Object.values(e.valuesByMode).map(fe)}),J=e=>({name:e.name,modes:(e.modes??[]).map(t=>t.name),defaultMode:(e.modes??[]).findIndex(t=>t.modeId===e.defaultModeId)});function u(e,t,n){E(!e.state.pending,"DESIGN_NEEDS_RECONCILIATION"),e.state.pending={kind:t,key:n,startedAt:new Date().toISOString(),operationId:e.message.operationId},F(e)}function f(e){e.state.pending=null,F(e)}async function p(e){(e.spec.textStyles?.length??0)+(e.spec.variables?.length??0)&&E(e.payload.allowGlobalResources===!0,"DESIGN_GLOBAL_RESOURCES_AUTH_REQUIRED");for(let n of e.spec.assets??[]){if(e.images.has(n.key))continue;E(typeof n.dataBase64=="string",`DESIGN_ASSET_NOT_STAGED:${n.key}`),u(e,"image",n.key),y();let o=s.createImage(qt(n.dataBase64));k(e,"images",n.key,o.hash),N(e.scope.root,M(e,"image",n.key),{hash:o.hash,signature:Z(n)}),f(e)}for(let n of e.spec.textStyles??[]){if(e.styles.has(n.key))continue;u(e,"style",n.key),y();let o=s.createTextStyle();e.state.pending.id=o.id,F(e),o.description=W(e,"style",n.key),o.name=`Bridge/${e.ns}/${n.name}`,o.fontName=ee(e.fonts.get(ue(n.fontName))),o.fontSize=n.fontSize,n.lineHeight&&(o.lineHeight=yt(n.lineHeight)),n.letterSpacing&&(o.letterSpacing=ee(n.letterSpacing)),E(Ne(o,{name:`Bridge/${e.ns}/${n.name}`,fontName:e.fonts.get(ue(n.fontName)),fontSize:n.fontSize,...n.lineHeight?{lineHeight:yt(n.lineHeight)}:{},...n.letterSpacing?{letterSpacing:n.letterSpacing}:{}}),`DESIGN_STYLE_READBACK_MISMATCH:${n.key}`),N(e.scope.root,M(e,"style",n.key),{id:o.id,digest:Z(j(o))}),k(e,"styles",n.key,o),f(e)}if(e.spec.variables?.length){let n=K(e,"collection","colors"),o=e.collection;n?E(o&&o.name===`Bridge/${e.ns}/Colors`,"DESIGN_COLLECTION_OWNERSHIP_CONFLICT"):(u(e,"collection","colors"),y(),o=s.variables.createVariableCollection(`Bridge/${e.ns}/Colors`),e.state.pending.id=o.id,F(e),n={id:o.id,name:o.name,digest:Z(J(o))},e.collection=o,N(e.scope.root,M(e,"collection","colors"),n),f(e));for(let d of e.spec.variables){if(e.variables.has(d.key))continue;u(e,"variable",d.key),y();let c=s.variables.createVariable(`Bridge/${e.ns}/${d.name}`,o,d.type??"COLOR");e.state.pending.id=c.id,F(e),c.description=W(e,"variable",d.key),c.setValueForMode(o.defaultModeId,ee(d.value)),E(Ne(c.valuesByMode[o.defaultModeId],d.value),`DESIGN_VARIABLE_READBACK_MISMATCH:${d.key}`),N(e.scope.root,M(e,"variable",d.key),{id:c.id,digest:Z(te(c))}),k(e,"variables",d.key,c),f(e)}}}function S(e,t){return t.map(n=>{if(n.type==="IMAGE")return{type:"IMAGE",imageHash:e.images.get(n.assetKey),scaleMode:n.scaleMode??"FILL",...n.imageTransform?{imageTransform:ee(n.imageTransform)}:{},...n.opacity===void 0?{}:{opacity:n.opacity}};if(n.type.startsWith("GRADIENT_"))return{type:n.type,gradientTransform:ee(n.gradientTransform),gradientStops:ee(n.gradientStops),...n.opacity===void 0?{}:{opacity:n.opacity}};let o={type:"SOLID",color:ee(n.color),...n.opacity===void 0?{}:{opacity:n.opacity}};return n.variableKey&&(o=s.variables.setBoundVariableForPaint(o,"color",e.variables.get(n.variableKey))),o})}function C(e,t,n){for(let o of n)for(let d of Ze)if(o[d]!==void 0){let c=`setRange${d[0].toUpperCase()}${d.slice(1)}`;E(typeof t[c]=="function",`DESIGN_PROPERTY_UNSUPPORTED:${t.name}:${c}`),d==="fills"&&V(e,o.fills);let m=d==="fontName"?ee(e.fonts.get(ue(o.fontName))):d==="fills"?S(e,o.fills):ee(o[d]),I=`getRange${d[0].toUpperCase()}${d.slice(1)}`;if(E(typeof t[I]=="function",`DESIGN_PROPERTY_UNSUPPORTED:${t.name}:${I}`),Ne(t[I](o.start,o.end),m))continue;y(),t[c](o.start,o.end,m)}}function _(e,t,n,o){for(let d of n)for(let c of Ze)if(d[c]!==void 0){let m=`getRange${c[0].toUpperCase()}${c.slice(1)}`;E(typeof t[m]=="function",`DESIGN_PROPERTY_UNSUPPORTED:${o}:${m}`);let I=c==="fontName"?e.fonts.get(ue(d.fontName)):c==="fills"?S(e,d.fills):d[c];E(Ne(t[m](d.start,d.end),I),`DESIGN_TEXT_RANGE_READBACK_MISMATCH:${o}:${d.start}:${c}`)}}function V(e,t){let n=new Set;for(let o of t){if(o.type!=="IMAGE"||n.has(o.assetKey))continue;n.add(o.assetKey);let d=e.spec.assets.find(I=>I.key===o.assetKey),c=K(e,"image",o.assetKey);if(E(d&&c&&c.signature===Z(d),`DESIGN_ASSET_CONFLICT:${o.assetKey}`),E(c.hash===e.images.get(o.assetKey),`DESIGN_IMAGE_HASH_CHANGED:${o.assetKey}`),E(typeof s.getImageByHash=="function","DESIGN_IMAGE_API_UNAVAILABLE"),s.getImageByHash(c.hash))continue;E(typeof d.dataBase64=="string",`DESIGN_ASSET_NOT_STAGED:${o.assetKey}`),y();let m=s.createImage(qt(d.dataBase64));E(m?.hash===c.hash,`DESIGN_IMAGE_HASH_CHANGED:${o.assetKey}`),E(s.getImageByHash(c.hash),`DESIGN_IMAGE_HANDLE_UNAVAILABLE:${o.assetKey}`)}}async function ie(e,t){if(t.type==="INSTANCE"&&!e.preparedComponents.has(t.props.componentKey)){let h=e.componentSets.get(e.memberSets.get(t.props.componentKey)),O=(h?.memberKeys??[t.props.componentKey]).map(P=>e.definitions.get(P));for(let P=0;P<O.length;P++)O.push(...e.children.get(O[P].key)??[]);for(let P of O.reverse())Tt(e,P),h&&await mt(e,P,e.map.get(P.key));h&&q(e);for(let P of h?.memberKeys??[t.props.componentKey])e.preparedComponents.add(P)}let n=D(e,t),o=e.memberSets.get(t.key),d=o&&!e.map.has(o)?e.definitions.get(o).parentKey:t.parentKey,c=d?e.map.get(d):e.scope.root;E(c&&["PAGE","FRAME","COMPONENT","COMPONENT_SET"].includes(c.type),"DESIGN_PARENT_INVALID"),i.assertInScope(c,e.scope),c!==e.scope.root&&i.assertTaskOwned(c,e.ownership);let m=e.componentSets.get(t.key),I=m?.memberKeys.map(h=>e.map.get(h)),T=new Map;if(m){E(typeof s.combineAsVariants=="function"&&I.every(h=>h?.type==="COMPONENT"&&h.parent===c),"DESIGN_COMPONENT_SET_COMBINE_UNSUPPORTED");for(let h of I){let O=e.definitions.get(h.getPluginData(i.specNodeKey)),P=Q(e,O,h);R(e,O,h,P),T.set(h.id,P)}}u(e,"node",t.key);let L={FRAME:"createFrame",COMPONENT:"createComponent",TEXT:"createText",RECTANGLE:"createRectangle",ELLIPSE:"createEllipse",VECTOR:"createVector"};y();let r=m?s.combineAsVariants(I,c):t.type==="INSTANCE"?e.map.get(t.props.componentKey).createInstance():s[L[t.type]]();if(e.state.pending.id=r.id,F(e),i.markTaskOwned(r,"design-node",e.ownership,e.message.operationId),N(r,i.specNodeKey,t.key),N(r,Oe,e.ns),N(r,we,Z(t)),N(r,Ke,"creating"),!m)c.appendChild(r);else{E(r.type==="COMPONENT_SET"&&r.parent===c&&H(r.children.map(h=>h.id))===H(I.map(h=>h.id)),"DESIGN_COMPONENT_SET_READBACK_MISMATCH");for(let h of I){let O=T.get(h.id),P=b(h,!1,!0);E(Ne(h.x+r.x,O.x)&&Ne(h.y+r.y,O.y),"DESIGN_COMPONENT_SET_REPARENT_CONFLICT");let G={...P,parentKey:O.parentKey,x:O.x,y:O.y};G.relativeTransform&&O.relativeTransform&&(G.relativeTransform[0][2]=O.relativeTransform[0][2],G.relativeTransform[1][2]=O.relativeTransform[1][2]),E(H(G)===H(O),"DESIGN_COMPONENT_SET_MEMBER_CONFLICT")}}let g=n.props??{};if(r.name=t.name??t.key,t.type==="TEXT"){let h=g.fontName??e.spec.textStyles.find(O=>O.key===g.textStyleKey).fontName;r.fontName=ee(e.fonts.get(ue(h))),g.fontSize!==void 0&&(r.fontSize=g.fontSize),r.characters=g.characters,r.textAutoResize="NONE",g.lineHeight&&(r.lineHeight=yt(g.lineHeight)),g.letterSpacing&&(r.letterSpacing=ee(g.letterSpacing)),g.textAlignHorizontal&&(r.textAlignHorizontal=g.textAlignHorizontal),g.textStyleKey&&(await r.setTextStyleIdAsync(e.styles.get(g.textStyleKey).id),i.assertInScope(r,e.scope),i.assertTaskOwned(r,e.ownership),E(r.parent===c,`DESIGN_NEW_NODE_PARENT_CONFLICT:${t.key}`),i.assertInScope(c,e.scope),c!==e.scope.root&&i.assertTaskOwned(c,e.ownership))}g.vectorPaths&&(r.vectorPaths=lt(g.vectorPaths,{width:t.width,height:t.height})),g.fills?(V(e,g.fills),r.fills=S(e,g.fills)):["FRAME","COMPONENT","RECTANGLE","ELLIPSE","VECTOR"].includes(t.type)&&(r.fills=[]),g.strokes&&(V(e,g.strokes),r.strokes=S(e,g.strokes)),g.dashPattern&&(E("dashPattern"in r,`DESIGN_PROPERTY_UNSUPPORTED:${t.key}:dashPattern`),r.dashPattern=ee(g.dashPattern));for(let h of["strokeWeight","strokeAlign","cornerRadius","opacity","visible","clipsContent"])g[h]!==void 0&&(E(h in r,`DESIGN_PROPERTY_UNSUPPORTED:${t.key}:${h}`),r[h]=g[h]);if(g.effects&&(r.effects=g.effects.map(h=>({...ee(h),blendMode:"NORMAL",visible:h.visible??!0,spread:h.spread??0}))),g.overflowDirection!==void 0&&(r.overflowDirection=gt[g.overflowDirection]),g.layoutPositioning!==void 0&&c.layoutMode&&c.layoutMode!=="NONE"&&(r.layoutPositioning=g.layoutPositioning),typeof r.resizeWithoutConstraints=="function"?r.resizeWithoutConstraints(n.width,n.height):r.resize(n.width,n.height),r.x=n.x,r.y=n.y,e.spec.schemaVersion==="1.1"){for(let h of ut)g[h]!==void 0&&(E(h in r,`DESIGN_PROPERTY_UNSUPPORTED:${t.key}:${h}`),y(),r[h]=ee(g[h]));g.textRanges&&C(e,r,g.textRanges)}if(t.type==="TEXT"&&g.textAutoResize&&g.textAutoResize!=="NONE"&&(r.textAutoResize=g.textAutoResize),t.type==="INSTANCE"){let h=e.map.get(g.componentKey),O=r.children.map((G,z)=>({child:G,source:h.children[z]})),P=new Map;E(r.children.length===h.children.length,"DESIGN_INSTANCE_STRUCTURE_MISMATCH");for(let G=0;G<O.length;G++){let z=O[G];E(z.source&&z.child.type===z.source.type,"DESIGN_INSTANCE_STRUCTURE_MISMATCH");let Y=z.source.getPluginData(i.specNodeKey);i.markTaskOwned(z.child,"design-instance-child",e.ownership,e.message.operationId),N(z.child,i.specNodeKey,`${t.key}/inherited/${G}`),N(z.child,je,Y),P.set(Y,z.child),"children"in z.child&&(E(z.child.children.length===z.source.children.length,"DESIGN_INSTANCE_STRUCTURE_MISMATCH"),O.push(...z.child.children.map((de,pe)=>({child:de,source:z.source.children[pe]}))))}for(let G of g.overrides??[]){let z=P.get(G.sourceKey);if(E(z,`DESIGN_OVERRIDE_SOURCE_MISSING:${G.sourceKey}`),G.characters!==void 0&&(E(z.type==="TEXT","DESIGN_OVERRIDE_TEXT_REQUIRED"),y(),z.characters=G.characters),G.visible!==void 0&&(y(),z.visible=G.visible),G.fills!==void 0&&(V(e,G.fills),y(),z.fills=S(e,G.fills)),e.spec.schemaVersion==="1.1"){for(let Y of Object.keys(G).filter(de=>!["sourceKey","characters","visible","fills","textRanges","width","height"].includes(de)))E(Y in z,`DESIGN_PROPERTY_UNSUPPORTED:${t.key}:${Y}`),Y==="strokes"&&V(e,G.strokes),y(),z[Y]=Y==="strokes"?S(e,G.strokes):ee(Y==="fontName"?e.fonts.get(ue(G.fontName)):G[Y]);(G.width!==void 0||G.height!==void 0)&&(y(),z.resizeWithoutConstraints(G.width??z.width,G.height??z.height)),G.textRanges&&C(e,z,G.textRanges)}}}if(e.map.set(t.key,r),e.idToKey.set(r.id,t.key),m)for(let h of I){let O=e.definitions.get(h.getPluginData(i.specNodeKey));y(),h.x=O.x,h.y=O.y,O.props?.relativeTransform&&(y(),h.relativeTransform=ee(O.props.relativeTransform)),R(e,O,h),N(h,Se,Z(B(e,h)))}R(e,t,r),N(r,Se,Z(B(e,r))),N(r,Ke,"complete"),N(e.scope.root,M(e,"n",t.key),{id:r.id}),e.state.cursor+=1,f(e)}function X(e,t){let n=t.type==="INSTANCE"&&e.memberSets.has(t.props.componentKey);return(e.reactionDefs.get(t.key)??(n?e.reactionDefs.get(t.props.componentKey):null)??[]).map(d=>({trigger:d.trigger.type==="AFTER_TIMEOUT"?{type:"AFTER_TIMEOUT",timeout:d.trigger.timeoutMs??d.trigger.delaySeconds*(e.timerUnit==="milliseconds"?1e3:1)}:["MOUSE_ENTER","MOUSE_LEAVE"].includes(d.trigger.type)?{type:d.trigger.type,delay:d.trigger.delayMs,deprecatedVersion:!1}:{type:d.trigger.type},actions:[{type:"NODE",destinationId:e.map.get(d.destinationKey)?.id??"MISSING",navigation:d.navigation??"NAVIGATE",transition:null}]}))}let ne=e=>(e.reactions??[]).map(t=>({trigger:fe(t.trigger),actions:(t.actions??(t.action?[t.action]:[])).map(n=>n.type==="NODE"?{type:"NODE",destinationId:n.destinationId,navigation:n.navigation,transition:fe(n.transition)}:fe(n))})),oe=(e,t)=>t.map(n=>e.idToKey.get(n.id)??"FOREIGN"),re=(e,t)=>ne(t).map(n=>({...n,actions:n.actions.map(o=>{if(o.type!=="NODE")return o;let{destinationId:d,...c}=o;return{...c,destinationKey:e.idToKey.get(d)??"UNKNOWN"}})})),he=(e,t)=>t.map(n=>({name:n.name,nodeKey:e.idToKey.get(n.nodeId)??"UNKNOWN"})),ke=(e,t)=>e.order.find(n=>K(e,"n",n.key)?.id===t)?.key??"UNKNOWN",Ae=(e,t)=>t.keys??t.ids.map(n=>ke(e,n)),ht=(e,t)=>t.version===2?t.flows:t.flows.map(n=>({name:n.name,nodeKey:ke(e,n.nodeId)}));function ye(e,t,n={version:2}){return n.version===2?Z(re(e,t)):Z(ne(t).map(o=>({...o,actions:o.actions.map(d=>{if(d.type!=="NODE")return d;let c=e.idToKey.get(d.destinationId);return{...d,destinationId:c?K(e,"n",c)?.id??d.destinationId:d.destinationId}})})))}function Le(e,t){let n=t;for(;n.parent&&n.parent!==e.scope.page;)n=n.parent;return n.parent===e.scope.page&&n.type==="FRAME"&&e.idToKey.has(n.id)?n:null}function $e(e,t){return t.map(n=>({name:n.name,nodeKey:e.idToKey.get(n.nodeId)??null,...e.idToKey.has(n.nodeId)?{}:{nodeId:n.nodeId}}))}function be(e,t){return E(Array.isArray(t)&&t.length<=1e3,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),t.map(n=>{if(E(n&&typeof n.name=="string"&&n.name.length<=256,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),n.nodeKey!==null){let o=e.map.get(n.nodeKey);return E(o?.type==="FRAME"&&o.parent===e.scope.page,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),i.assertTaskOwned(o,e.ownership),{name:n.name,nodeKey:n.nodeKey}}return E(typeof n.nodeId=="string"&&n.nodeId.length<=200,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),{name:n.name,nodeKey:null,nodeId:n.nodeId}})}function Et(e,t,n){let o=new Set(e.map(I=>I.name)),d=1;for(;o.has(`Flow ${d}`);)d+=1;let c=t[t.length-1],m=c&&!o.has(c.name)&&(c.name===`Flow ${e.length+1}`||c.name===`Flow ${d}`);return t.length===e.length+1&&H(t.slice(0,-1))===H(e)&&m&&c.nodeKey===n&&!e.some(I=>I.nodeKey===n)}function It(e){let t=e.state.nativeFlowObservation;return t?(E(t.version===1||t.version===2&&Array.isArray(t.entries)&&t.entries.length>0&&t.entries.length<=1e3,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),t.version===1?[t]:t.entries):[]}function Nt(e){let t=null;for(let n of It(e)){let o=e.map.get(n.sourceKey),d=e.definitions.get(n.sourceKey);E(o&&d,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT");let c=Q(e,d,o);R(e,d,o,c);let m=Le(e,o),I=K(e,"reactions",n.sourceKey);E(m&&e.idToKey.get(m.id)===n.topLevelKey&&I?.digest===n.reactionDigest&&ye(e,o,I)===n.reactionDigest,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),i.assertTaskOwned(m,e.ownership);let T=be(e,n.before),L=be(e,n.after);if(E(Et(T,L,n.topLevelKey)&&(t===null||H(t)===H(T)),"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),n.version===1)E(t===null&&T.length===0&&L.length===1,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT");else if(n.provenance==="NATIVE_SETTER_READBACK"){let r=n.reactionReadback;E(n.version===2&&r?.version===1&&r.sourceKey===n.sourceKey&&r.topLevelKey===n.topLevelKey&&r.digest===n.reactionDigest&&r.operationId===n.operationId&&r.observedAt===n.observedAt,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT")}else{let r=n.recovery,g=r?.explicitPayload;E(n.version===2&&n.provenance==="EXPLICIT_READBACK_ADOPTION"&&n.reactionReadback===null&&I.provenance===n.provenance&&r?.verification==="CURRENT_STATE_ADOPTED_NOT_ORIGIN_PROVED"&&r.operationId===n.operationId&&r.observedAt===n.observedAt&&r.legacyPending?.operationId===g?.pendingOperationId&&r.legacyPending?.key===n.sourceKey&&H(be(e,r.legacyPending.flowBefore))===H(T)&&r.expectedFlowSnapshotSignature===Z(L)&&r.expectedReactionSnapshotSignature===n.reactionDigest&&g.flowSnapshotSignature===r.expectedFlowSnapshotSignature&&g.reactionSnapshotSignature===r.expectedReactionSnapshotSignature,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT")}t=L}return t}function St(e,t,n,o,d,c=null){let m=Le(e,n),I=m&&e.idToKey.get(m.id);E(e.scope.root.type==="PAGE"&&m&&(e.reactionDefs.get(t.key)?.length??0)>0,"DESIGN_NATIVE_FLOW_CHANGE_CONFLICT"),i.assertTaskOwned(m,e.ownership);let T=be(e,$e(e,o)),L=be(e,$e(e,d));E(Et(T,L,I),"DESIGN_NATIVE_FLOW_CHANGE_CONFLICT");let r=Nt(e);E(r?H(r)===H(T):!T.some(O=>O.nodeKey!==null),"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT");let g=It(e).map(ee),h=e.state.pending.reactionReadback;E(g.length<1e3,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),c||E(h?.sourceKey===t.key&&h.sourceId===n.id&&h.topLevelKey===I&&h.operationId===e.message.operationId&&h.digest===ye(e,n),"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),!g.length&&o.length===0&&!c?e.state.nativeFlowObservation={version:1,sourceKey:t.key,topLevelKey:I,before:T,after:L,reactionDigest:h.digest,operationId:h.operationId,observedAt:h.observedAt}:(g.push({version:2,provenance:c?"EXPLICIT_READBACK_ADOPTION":"NATIVE_SETTER_READBACK",sourceKey:t.key,topLevelKey:I,before:T,after:L,reactionDigest:ye(e,n),operationId:e.message.operationId,observedAt:c?.observedAt??h.observedAt,reactionReadback:c?null:ee(h),...c?{recovery:c}:{}}),e.state.nativeFlowObservation={version:2,entries:g}),F(e)}function Pe(e){let t=he(e,(e.scope.page.flowStartingPoints??[]).filter(c=>e.idToKey.has(c.nodeId))),n=K(e,"flows","page");if(n){E(H(ht(e,n))===H(t),"DESIGN_FLOW_USER_EDIT_CONFLICT");return}let o=e.state.nativeFlowObservation;if(o){if(o.version===2){let I=Nt(e);E(H($e(e,e.scope.page.flowStartingPoints??[]))===H(I),"DESIGN_FLOW_USER_EDIT_CONFLICT");return}let c=e.map.get(o.sourceKey),m=K(e,"reactions",o.sourceKey);E(o.version===1&&o.before.length===0&&o.after.length===1&&o.after[0].name==="Flow 1"&&o.after[0].nodeKey===o.topLevelKey&&c&&e.idToKey.get(Le(e,c)?.id)===o.topLevelKey&&m?.digest===o.reactionDigest&&ye(e,c)===o.reactionDigest,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),E(H(t)===H(o.after),"DESIGN_FLOW_USER_EDIT_CONFLICT");return}let d=(e.spec.flows??[]).map(c=>({name:c.name,nodeKey:c.nodeKey}));E(t.length===0||H(t)===H(d),"DESIGN_FLOW_CONFLICT")}async function jt(e,t,n,o){Pe(e);let d=Q(e,t,n),c=ee(e.scope.page.flowStartingPoints??[]),m=Le(e,n),I=o.length>0&&o.every(r=>r.actions.every(g=>g.type==="NODE"&&g.navigation==="CHANGE_TO"));if(o.length&&E(e.scope.root.type==="PAGE"&&(m||I),"DESIGN_NATIVE_FLOW_REQUIRES_PAGE_SCOPE"),I){let r=t,g=new Set;for(;r&&!g.has(r.key)&&!["COMPONENT","INSTANCE"].includes(r.type);)g.add(r.key),r=e.definitions.get(r.parentKey);let h=e.memberSets.get(r?.type==="INSTANCE"?r.props.componentKey:r?.key);E(h&&e.map.get(h)?.type==="COMPONENT_SET"&&o.every(O=>O.actions.every(P=>e.memberSets.get(e.idToKey.get(P.destinationId))===h)),"DESIGN_CHANGE_TO_SET_CONFLICT")}u(e,"reactions",t.key),e.state.pending.flowBefore=c.map(r=>({name:r.name,nodeKey:e.idToKey.get(r.nodeId)??null,nodeId:r.nodeId})),F(e),y(),await n.setReactionsAsync(o);let T=Q(e,t,n,d);R(e,t,n,T),E(H(ne(n))===H(o),`DESIGN_REACTION_READBACK_MISMATCH:${t.key}`),Object.hasOwn(T,"inheritedReactions")&&N(n,Se,Z(x(e,T)));let L=ee(e.scope.page.flowStartingPoints??[]);e.state.pending.flowAfter=L.map(r=>({name:r.name,nodeKey:e.idToKey.get(r.nodeId)??null,nodeId:r.nodeId})),e.state.pending.reactionReadback={version:1,sourceKey:t.key,sourceId:n.id,topLevelKey:m?e.idToKey.get(m.id):null,digest:ye(e,n),operationId:e.message.operationId,observedAt:new Date().toISOString()},F(e),H(L)!==H(c)&&(E(!I,"DESIGN_LOCAL_FLOW_USER_EDIT_CONFLICT"),St(e,t,n,c,L)),N(e.scope.root,M(e,"reactions",t.key),{version:2,digest:ye(e,n)}),f(e)}async function mt(e,t,n){let o=X(e,t),d=ne(n),c=K(e,"reactions",t.key);c?E(c.digest===ye(e,n,c),`DESIGN_REACTION_USER_EDIT_CONFLICT:${t.key}`):E(d.length===0||H(d)===H(o),`DESIGN_REACTION_CONFLICT:${t.key}`),H(d)!==H(o)?(E(!(t.type==="INSTANCE"&&e.memberSets.has(t.props.componentKey)&&!e.reactionDefs.has(t.key)),`DESIGN_INSTANCE_REACTION_INHERITANCE_MISMATCH:${t.key}`),await jt(e,t,n,o)):c||N(e.scope.root,M(e,"reactions",t.key),{version:2,digest:ye(e,n)})}function Tt(e,t){let n=e.map.get(t.key),o=Q(e,t,n);if(R(e,t,n,o),!("children"in n)||n.type==="INSTANCE")return;let d=e.children.get(t.key)??[],c=d.filter(g=>!g.props?.isFixed),m=d.filter(g=>g.props?.isFixed),I=[...c,...m];m.length&&E(t.props?.overflowDirection&&t.props.overflowDirection!=="NONE",`DESIGN_FIXED_REQUIRES_SCROLL_PARENT:${t.key}`);let T=I.map(g=>g.key),L=oe(e,n.children),r=K(e,"order",t.key);if(r&&E(H(Ae(e,r))===H(L),`DESIGN_USER_LAYER_EDIT_CONFLICT:${t.key}`),H(T)!==H(L)||m.length!==(n.numberOfFixedChildren??0)){u(e,"order",t.key);for(let g of I)y(),n.appendChild(e.map.get(g.key));"numberOfFixedChildren"in n&&(n.numberOfFixedChildren=m.length),E(H(oe(e,n.children))===H(T),`DESIGN_LAYER_READBACK_MISMATCH:${t.key}`),N(n,Se,Z(B(e,n))),N(e.scope.root,M(e,"order",t.key),{keys:T}),f(e)}else r||N(e.scope.root,M(e,"order",t.key),{keys:T})}async function Zt(e,t){if(e.state.finalized)return;Pe(e);let n=e.state.finalizeCursor??0;for(let T of e.order.slice(n,n+t)){let L=e.map.get(T.key);Tt(e,T),await mt(e,T,L),e.state.finalizeCursor=(e.state.finalizeCursor??0)+1,F(e)}if(e.state.finalizeCursor<e.order.length)return;let o=(e.spec.flows??[]).map(T=>({nodeId:e.map.get(T.nodeKey).id,name:T.name})),d=new Set([...e.map.values()].map(T=>T.id)),c=e.scope.page.flowStartingPoints??[],m=c.filter(T=>d.has(T.nodeId)),I=K(e,"flows","page");if(Pe(e),H(m)!==H(o)){u(e,"flows","page"),y(),e.scope.page.flowStartingPoints=[...c.filter(L=>!d.has(L.nodeId)),...o];let T=e.scope.page.flowStartingPoints.filter(L=>d.has(L.nodeId));E(H(T)===H(o),"DESIGN_FLOW_READBACK_MISMATCH"),N(e.scope.root,M(e,"flows","page"),{version:2,flows:he(e,T)}),f(e)}else I||N(e.scope.root,M(e,"flows","page"),{version:2,flows:he(e,m)});e.state.finalized=!0,e.state.complete=!0,F(e)}async function Qt(e){let t=e.state.pending;if(!t)return;let o=K(e,{image:"image",style:"style",variable:"variable",collection:"collection",node:"n",order:"order",reactions:"reactions",flows:"flows"}[t.kind],t.key);if(e.payload.adoptNativeFlow!==void 0){let d=e.payload.adoptNativeFlow;E(e.payload.reconcile===!0&&t.kind==="reactions"&&!o&&d&&typeof d=="object"&&!Array.isArray(d)&&Object.keys(d).length===3&&["pendingOperationId","flowSnapshotSignature","reactionSnapshotSignature"].every(h=>Object.hasOwn(d,h))&&typeof d.pendingOperationId=="string"&&d.pendingOperationId===t.operationId&&typeof d.flowSnapshotSignature=="string"&&/^[a-f0-9]{64}$/.test(d.flowSnapshotSignature)&&typeof d.reactionSnapshotSignature=="string"&&/^[a-f0-9]{64}$/.test(d.reactionSnapshotSignature),"DESIGN_NATIVE_FLOW_ADOPTION_INVALID");let c=e.map.get(t.key),m=e.definitions.get(t.key);E(c&&m,"DESIGN_NATIVE_FLOW_ADOPTION_INVALID");let I=Q(e,m,c);R(e,m,c,I);let T=ee(e.scope.page.flowStartingPoints??[]),L=be(e,t.flowBefore);if(!e.state.nativeFlowObservation){let h=t.reactionReadback,O=Le(e,c);E(L.every(P=>P.nodeKey===null)&&h?.version===1&&h.sourceKey===t.key&&h.sourceId===c.id&&O&&h.topLevelKey===e.idToKey.get(O.id)&&h.operationId===t.operationId&&h.digest===ye(e,c)&&typeof h.observedAt=="string"&&Number.isFinite(Date.parse(h.observedAt))&&H(be(e,t.flowAfter))===H($e(e,T)),"DESIGN_NATIVE_FLOW_ADOPTION_INVALID"),i.assertTaskOwned(O,e.ownership)}let r=L.map(h=>({name:h.name,nodeId:h.nodeKey===null?h.nodeId:e.map.get(h.nodeKey).id}));E(H(ne(c))===H(X(e,m))&&Z($e(e,T))===d.flowSnapshotSignature&&ye(e,c)===d.reactionSnapshotSignature,"DESIGN_NATIVE_FLOW_ADOPTION_SNAPSHOT_CONFLICT");let g={legacyPending:ee(t),operationId:e.message.operationId,observedAt:new Date().toISOString(),expectedFlowSnapshotSignature:d.flowSnapshotSignature,expectedReactionSnapshotSignature:d.reactionSnapshotSignature,explicitPayload:ee(d),verification:"CURRENT_STATE_ADOPTED_NOT_ORIGIN_PROVED"};St(e,m,c,r,T,g),N(e.scope.root,M(e,"reactions",t.key),{version:2,digest:ye(e,c),provenance:"EXPLICIT_READBACK_ADOPTION"}),f(e);return}if(E(o,`DESIGN_NEEDS_RECONCILIATION:${t.kind}:${t.key}`),t.kind==="node"){let d=e.order.find(m=>m.key===t.key),c=e.map.get(t.key);E(c&&c.getPluginData(Ke)==="complete","DESIGN_PENDING_NODE_NOT_COMPLETE"),Q(e,d,c),e.state.cursor=e.order.filter(m=>e.map.has(m.key)).length}if(t.kind==="reactions"&&E(o.digest===ye(e,e.map.get(t.key),o),"DESIGN_PENDING_REACTION_CONFLICT"),t.kind==="order"&&E(H(Ae(e,o))===H(oe(e,e.map.get(t.key).children)),"DESIGN_PENDING_LAYER_CONFLICT"),t.kind==="flows"){let d=new Set([...e.map.values()].map(c=>c.id));E(H(ht(e,o))===H(he(e,e.scope.page.flowStartingPoints.filter(c=>d.has(c.nodeId)))),"DESIGN_PENDING_FLOW_CONFLICT")}f(e)}function Te(e){return{applied:e.map.size,total:e.spec.nodes.length,finalizedNodes:e.state.finalizeCursor??0,pending:ee(e.state.pending),finalized:e.state.finalized===!0}}async function _t(e){let t=[];try{q(e)}catch(r){t.push(r.message)}let n=new Map([...e.map].map(([r,g])=>[g.id,r])),o=new Map([...e.variables].map(([r,g])=>[g.id,r])),d=new Map([...e.styles].map(([r,g])=>[g.id,r])),c=new Map([...e.images].map(([r,g])=>[g,r]));function m(r){let g={type:r.type,opacity:r.opacity??1};return r.type==="SOLID"?(g.color=fe(r.color),r.boundVariables?.color&&(g.variableKey=o.get(r.boundVariables.color.id)??"UNKNOWN")):r.type==="IMAGE"?(g.assetKey=c.get(r.imageHash)??"UNKNOWN",g.scaleMode=r.scaleMode,r.imageTransform&&(g.imageTransform=fe(r.imageTransform))):r.type.startsWith("GRADIENT_")&&(g.gradientTransform=fe(r.gradientTransform),g.gradientStops=fe(r.gradientStops)),g}let I=[],T=[];for(let r of e.order){let g=e.map.get(r.key);if(!g){t.push(`MISSING_NODE:${r.key}`);continue}let h=B(e,g);if(delete h.parentKey,e.spec.schemaVersion==="1.1"){for(let Y of["x","y","width","height"])h[Y]=g[Y];delete h.layoutDriven}if(g.type==="TEXT"&&(h.textStyleId=g.textStyleId),g.type==="INSTANCE"){let Y=await g.getMainComponentAsync();h.componentId=Y?.id??null,n.get(h.componentId)!==r.props.componentKey&&t.push(`INSTANCE_COMPONENT_MISMATCH:${r.key}`)}let O={};for(let[Y,de]of Object.entries(h))["type","name","x","y","width","height"].includes(Y)||(O[Y]=de);Array.isArray(g.fills)&&(O.fills=g.fills.map(m)),Array.isArray(g.strokes)&&(O.strokes=g.strokes.map(m)),"textStyleId"in O&&(O.textStyleId&&(O.textStyleKey=d.get(O.textStyleId)??"UNKNOWN"),delete O.textStyleId),"componentId"in O&&(O.componentKey=n.get(O.componentId)??"UNKNOWN",delete O.componentId),"overflowDirection"in O&&(O.overflowDirection=Dn[O.overflowDirection]??O.overflowDirection);let P=g.parent===e.scope.root?null:n.get(g.parent?.id)??"UNKNOWN";P!==r.parentKey&&t.push(`PARENT_MISMATCH:${r.key}`),I.push({key:r.key,id:g.id,type:g.type,name:g.name,parentKey:P,x:g.x,y:g.y,width:g.width,height:g.height,props:O,..."children"in g&&g.type!=="INSTANCE"?{childKeys:g.children.map(Y=>n.get(Y.id)??"FOREIGN")}:{}});let G=X(e,r),z=ne(g);H(z)!==H(G)&&t.push(`REACTION_MISMATCH:${r.key}`);for(let Y of z)for(let de of Y.actions)if(de.type==="NODE"){let pe=(e.reactionDefs.get(r.key)??(r.type==="INSTANCE"?e.reactionDefs.get(r.props.componentKey):null)??[]).find(Fe=>Fe.trigger.type===Y.trigger.type),le=Y.trigger.type==="AFTER_TIMEOUT"?pe?.trigger.timeoutMs!==void 0?{type:"AFTER_TIMEOUT",timeoutMs:Y.trigger.timeout}:{type:"AFTER_TIMEOUT",delaySeconds:Y.trigger.timeout/(e.timerUnit==="milliseconds"?1e3:1)}:["MOUSE_ENTER","MOUSE_LEAVE"].includes(Y.trigger.type)?{type:Y.trigger.type,delayMs:Y.trigger.delay}:Y.trigger;T.push({sourceKey:r.key,destinationKey:n.get(de.destinationId)??"UNKNOWN",...e.spec.schemaVersion==="1.1"?{navigation:de.navigation}:{},trigger:le})}if(g.type!=="INSTANCE"&&"children"in g){let Y=e.children.get(r.key)??[],de=[...Y.filter(pe=>!pe.props?.isFixed),...Y.filter(pe=>pe.props?.isFixed)].map(pe=>pe.key);H(de)!==H(g.children.map(pe=>n.get(pe.id)))&&t.push(`LAYER_ORDER_MISMATCH:${r.key}`)}}let L=(e.scope.page.flowStartingPoints??[]).filter(r=>n.has(r.nodeId)).map(r=>({nodeKey:n.get(r.nodeId),name:r.name}));return H(L)!==H(e.spec.flows??[])&&t.push("FLOW_MISMATCH"),e.state.pending&&t.push("UNRESOLVED_PENDING_OPERATION"),e.state.complete||t.push("DESIGN_NOT_COMPLETE"),e.styles.size!==(e.spec.textStyles?.length??0)&&t.push("TEXT_STYLE_COUNT_MISMATCH"),e.variables.size!==(e.spec.variables?.length??0)&&t.push("VARIABLE_COUNT_MISMATCH"),{schemaVersion:"1.0",runId:e.payload.runId,specId:e.spec.id,specSignature:e.signature,collectedAt:new Date().toISOString(),fileIdentity:{fileKey:s.fileKey},scope:{pageId:e.scope.page.id,rootNodeId:e.scope.root.id},status:t.length?"FAIL":"PASS",writes:0,errors:t,nodes:I,reactions:T,flows:L,...e.spec.source?.behaviorStates?{behaviorStates:e.spec.source.behaviorStates.map(r=>({...r,nodes:r.nodeKeys.map(g=>({key:g,id:e.map.get(g)?.id??null}))}))}:{},...e.spec.componentSets?{componentSets:e.spec.componentSets.map(r=>({key:r.key,id:e.map.get(r.key)?.id??null,memberKeys:e.map.get(r.key)?.children.map(g=>n.get(g.id)??"FOREIGN")??[],variants:e.map.get(r.key)?.children.map(g=>({key:n.get(g.id)??"FOREIGN",name:g.name}))??[]}))}:{},counts:{nodes:I.length,texts:I.filter(r=>r.type==="TEXT").length,components:I.filter(r=>r.type==="COMPONENT").length,instances:I.filter(r=>r.type==="INSTANCE").length,reactions:T.length,flows:L.length,textStyles:e.styles.size,variables:e.variables.size,...e.spec.componentSets?{componentSets:I.filter(r=>r.type==="COMPONENT_SET").length}:{}},textStyles:[...e.styles].map(([r,g])=>({key:r,...j(g),name:e.spec.textStyles.find(h=>h.key===r).name})),variables:[...e.variables].map(([r,g])=>({key:r,name:e.spec.variables.find(h=>h.key===r).name,value:Object.values(g.valuesByMode)[0]})),fontSubstitutions:e.substitutions,timerUnit:e.timerUnit,playback:"NOT VERIFIED",checkpoint:Te(e)}}function Jt(e,t){let n=e.payload.auditOffset??0,o=e.payload.auditLimit??1e3;E(Number.isInteger(n)&&n>=0&&n<=25e3&&n<=t.nodes.length,"DESIGN_AUDIT_OFFSET_INVALID"),E(Number.isInteger(o)&&o>=1&&o<=2e3,"DESIGN_AUDIT_LIMIT_INVALID");let{collectedAt:d,...c}=t,m={...t,nodes:t.nodes.slice(n,n+o),page:{offset:n,limit:o,totalNodes:t.nodes.length,nextOffset:n+o<t.nodes.length?n+o:null,snapshotSignature:Z(c)}};return E(ve(JSON.stringify(m)).byteLength<7*1024*1024,"DESIGN_AUDIT_RESPONSE_BUDGET_EXCEEDED: reduce auditLimit or split the specification"),m}let Ot=6e4,Ee=(e,t)=>H(e)===H(t),At=e=>{let t=ee(e);return delete t.positionRecovery,t.pending=null,t},bt=e=>[...e.map].map(([t,n])=>[t,n.id]);function Ct(e){if(e.type==="PAGE")return;let t=e.relativeTransform;E((!["FRAME","COMPONENT"].includes(e.type)||e.layoutMode==="NONE")&&Array.isArray(t)&&t.length===2&&t.every(n=>Array.isArray(n)&&n.length===3&&n.every(Number.isFinite))&&t[0][0]===1&&t[0][1]===0&&t[1][0]===0&&t[1][1]===1,`DESIGN_POSITION_RECOVERY_TRANSFORM:${e.id}`)}function Dt(e){Ct(e),E(e.type==="PAGE"||e.layoutMode==="NONE",`DESIGN_POSITION_RECOVERY_TRANSFORM:${e.id}`)}function Qe(e){return Z({ledger:Me(e.scope.root,e.ledgerKey),nodes:[...e.map].map(([t,n])=>({mapKey:t,id:n.id,raw:b(n,!1,e.spec.schemaVersion==="1.1"),parentId:n.parent?.id,children:n.children?.map(o=>o.id),transform:fe(n.relativeTransform),layoutMode:fe(n.layoutMode),reactions:ne(n),owner:n.getPluginData(Oe),key:n.getPluginData(i.specNodeKey),state:n.getPluginData(Ke),intent:n.getPluginData(we),digest:n.getPluginData(Se),mapping:K(e,"n",t),order:K(e,"order",t),reaction:K(e,"reactions",t)})),pageChildren:e.scope.page.children.map(t=>t.id),flows:fe(e.scope.page.flowStartingPoints)})}let Rt=e=>Z({version:e.version,runId:e.runId,specSignature:e.specSignature,generationSignature:e.generationSignature,mappingSignature:e.mappingSignature,changes:e.changes,parents:e.parents,flows:e.flows});function Je(e,t,n){let o=e.map.get(t.key),d=B(e,o),c=[t.before,{...t.before,parentId:t.after.parentId},{...t.after,y:t.before.y},t.after],m={parentId:o.parent?.id,x:o.x,y:o.y},I=[...n].reverse().find(T=>Ee(m,c[T])&&Z(d)===t.snapshots[T]);return E(I!==void 0,`DESIGN_POSITION_RECOVERY_STATE_CONFLICT:${t.key}`),I}function Ge(e,t,n){let o=new Map(t.parents.map(d=>[d.id,[...d.children]]));return t.changes.forEach((d,c)=>{if(n[c]<1)return;let m=o.get(d.before.parentId),I=o.get(d.after.parentId);E(m&&I&&m.includes(d.id),"DESIGN_POSITION_RECOVERY_ORDER_CONFLICT"),m.splice(m.indexOf(d.id),1);let T=t.parents.find(g=>g.id===d.after.parentId).wanted,L=T.indexOf(d.id),r=I.findIndex(g=>T.indexOf(g)>L);r<0&&(r=I.length),I.splice(r,0,d.id)}),o}function Ce(e,t,n){i.assertInScope(e.scope.root,e.scope),E(e.scope.root.type==="PAGE"&&e.existing&&e.state.version===1&&!e.state.complete&&!e.state.finalized&&(e.state.finalizeCursor??0)===0&&Number.isInteger(e.state.cursor)&&e.state.cursor>0&&e.state.cursor===e.map.size&&e.state.cursor<=e.order.length&&e.order.every((I,T)=>e.map.has(I.key)===T<e.state.cursor)&&Ee(Me(e.scope.root,e.ledgerKey),e.state),"DESIGN_POSITION_RECOVERY_CHECKPOINT_CONFLICT"),E(!e.state.pending||n&&n.status==="IN_PROGRESS"&&e.state.pending.kind==="position-recovery"&&e.state.pending.runId===e.payload.runId,"DESIGN_POSITION_RECOVERY_PENDING_CONFLICT");let o=new Set(t),d=new Map,c=[];n&&E(n.version===1&&n.runId===e.payload.runId&&n.specSignature===e.signature&&n.mappingSignature===Z(bt(e))&&n.generationSignature===Z(At(e.state))&&n.proofSignature===Rt(n)&&Ee(n.changes.map(I=>I.key),t)&&["IN_PROGRESS","COMPLETE"].includes(n.status)&&Number.isInteger(n.cursor)&&n.cursor>=0&&n.cursor<=t.length&&(n.status==="COMPLETE"?n.cursor===t.length&&!n.pending&&!e.state.pending:!!e.state.pending)&&(!n.pending||n.pending.index===n.cursor&&Number.isInteger(n.pending.stage)&&n.pending.stage>=0&&n.pending.stage<=3)&&Array.isArray(n.parents)&&n.parents.length<=t.length*2&&Ee(n.flows,e.scope.page.flowStartingPoints??[]),"DESIGN_POSITION_RECOVERY_JOURNAL_CONFLICT");for(let I of e.positionPrefix){let T=e.map.get(I.key),L=I.parentKey?e.map.get(I.parentKey):e.scope.root;if(E(T&&K(e,"n",I.key)?.id===T.id&&T.getPluginData(Ke)==="complete",`DESIGN_POSITION_RECOVERY_MAPPING_CONFLICT:${I.key}`),Ct(T),o.has(I.key)){E(I.type==="FRAME"&&L&&T.parent&&T.getPluginData(we)===Z(I),`DESIGN_POSITION_RECOVERY_CANDIDATE_INVALID:${I.key}`);for(let P of[I,e.definitions.get(e.idToKey.get(T.parent.id))]){let G=P;for(;G;)E(!["COMPONENT","INSTANCE"].includes(G.type)&&(G.key===I.key||!o.has(G.key)),"DESIGN_POSITION_RECOVERY_COMPONENT_UNSUPPORTED"),G=G.parentKey&&e.definitions.get(G.parentKey)}for(let P of[T,L,T.parent])Dt(P),P.type!=="PAGE"&&(E(e.map.get(e.idToKey.get(P.id))===P,"DESIGN_POSITION_RECOVERY_PARENT_INVALID"),i.assertTaskOwned(P,e.ownership));E(L.type!=="PAGE"||T.parent===L,"DESIGN_POSITION_RECOVERY_ROOT_REPARENT_UNSUPPORTED");let h=b(T,!1,e.spec.schemaVersion==="1.1"),O={...h,x:I.x,y:I.y,parentKey:L.getPluginData(i.specNodeKey)??""};E(T.getPluginData(Se)===Z(x(e,O)),`DESIGN_POSITION_RECOVERY_CONTENT_CONFLICT:${I.key}`),R(e,I,T,O);for(let P of T.children)i.assertTaskOwned(P,e.ownership),E(P.getPluginData(Oe)===e.ns&&e.map.get(e.idToKey.get(P.id))===P,`DESIGN_FOREIGN_CHILD:${I.key}`);if(d.set(L.id,L),d.set(T.parent.id,T.parent),n){let P=t.indexOf(I.key),G=n.changes[P];E(G.id===T.id&&G.after.parentId===L.id&&G.after.x===I.x&&G.after.y===I.y&&G.digest===T.getPluginData(Se)&&G.intent===T.getPluginData(we)&&Array.isArray(G.snapshots)&&G.snapshots.length===4&&G.snapshots.every(z=>/^[a-f0-9]{64}$/.test(z)),"DESIGN_POSITION_RECOVERY_JOURNAL_CONFLICT"),c[P]=Je(e,G,P<n.cursor?[3]:P===n.cursor&&n.pending?[n.pending.stage,Math.min(3,n.pending.stage+1)]:[0])}}else{E(T.parent===L,`DESIGN_POSITION_RECOVERY_PARENT_CONFLICT:${I.key}`);let h=Q(e,I,T);R(e,I,T,h)}let r=K(e,"reactions",I.key),g=ne(T);if(E(r?r.digest===ye(e,T,r):g.length===0||Ee(g,X(e,I)),`DESIGN_REACTION_USER_EDIT_CONFLICT:${I.key}`),"children"in T&&T.type!=="INSTANCE"){let h=K(e,"order",I.key),O=h?Ae(e,h):(e.positionChildren.get(I.key)??[]).map(P=>P.key);E(Ee(T.children.filter(P=>!o.has(e.idToKey.get(P.id))).map(P=>e.idToKey.get(P.id)),O.filter(P=>!o.has(P))),`DESIGN_POSITION_RECOVERY_LAYER_CONFLICT:${I.key}`)}}let m=e.scope.page.children.filter(I=>I.getPluginData(Oe)===e.ns);E(Ee(m.filter(I=>!o.has(e.idToKey.get(I.id))).map(I=>e.idToKey.get(I.id)),(e.positionChildren.get(null)??[]).filter(I=>!o.has(I.key)).map(I=>I.key)),"DESIGN_POSITION_RECOVERY_PAGE_ORDER_CONFLICT");for(let[I,T]of e.styles)E(K(e,"style",I)?.digest===Z(j(T)),`DESIGN_STYLE_USER_EDIT_CONFLICT:${I}`);for(let[I,T]of e.variables)E(K(e,"variable",I)?.digest===Z(te(T)),`DESIGN_VARIABLE_USER_EDIT_CONFLICT:${I}`);if(e.collection&&E(K(e,"collection","colors")?.digest===Z(J(e.collection)),"DESIGN_COLLECTION_USER_EDIT_CONFLICT"),Pe(e),n){for(let L of n.parents){let r=L.id===e.scope.page.id?e.scope.page:e.map.get(e.idToKey.get(L.id));E(r&&Array.isArray(L.children)&&Array.isArray(L.wanted)&&L.children.length<=25e3&&L.wanted.length<=25e3,"DESIGN_POSITION_RECOVERY_JOURNAL_CONFLICT"),Dt(r),r.type!=="PAGE"&&i.assertTaskOwned(r,e.ownership),d.set(r.id,r)}let I=Ge(e,n,c);![...I].every(([L,r])=>Ee(d.get(L).children.map(g=>g.id),r))&&n.pending&&c[n.cursor]>n.pending.stage&&(c[n.cursor]=Je(e,n.changes[n.cursor],[n.pending.stage]),I=Ge(e,n,c));for(let[L,r]of I)E(Ee(d.get(L).children.map(g=>g.id),r),"DESIGN_POSITION_RECOVERY_ORDER_CONFLICT")}return{parents:d,stages:c}}async function en(e){E(e.spec.schemaVersion==="1.0","DESIGN_POSITION_RECOVERY_VERSION_UNSUPPORTED");let t=e.payload.positionRecovery;E(["scope_design_plan","scope_design_apply"].includes(e.message.command)&&t&&typeof t=="object"&&!Array.isArray(t)&&Object.keys(t).every(r=>["nodeKeys","planSignature"].includes(r))&&Array.isArray(t.nodeKeys)&&t.nodeKeys.length>=1&&t.nodeKeys.length<=20&&t.nodeKeys.every(r=>typeof r=="string"&&e.map.has(r))&&new Set(t.nodeKeys).size===t.nodeKeys.length,"DESIGN_POSITION_RECOVERY_REQUEST_INVALID");let n=e.message.command==="scope_design_plan",o=t.nodeKeys;E(n?t.planSignature===void 0:e.payload.reconcile===!0&&typeof t.planSignature=="string"&&/^[a-f0-9]{64}$/.test(t.planSignature),"DESIGN_POSITION_RECOVERY_RECONCILE_REQUIRED"),E(ve(H(e.state)).length<=Ot,"DESIGN_POSITION_RECOVERY_LEDGER_BUDGET"),e.positionPrefix=e.order.slice(0,e.state.cursor),e.positionChildren=new Map;for(let r of e.positionPrefix)e.positionChildren.has(r.parentKey)||e.positionChildren.set(r.parentKey,[]),e.positionChildren.get(r.parentKey).push(r);let d=Qe(e);await $(e,!1),await U(e),E(d===Qe(e),"DESIGN_POSITION_RECOVERY_STALE_WORLD");let c=e.state.positionRecovery,m=Ce(e,o,c);if(!c){let r=[...m.parents.values()].map(g=>({id:g.id,children:g.children.map(h=>h.id),wanted:g.type==="PAGE"?g.children.filter(h=>!o.includes(e.idToKey.get(h.id))||e.definitions.get(e.idToKey.get(h.id))?.parentKey===null).map(h=>h.id):(K(e,"order",e.idToKey.get(g.id))?Ae(e,K(e,"order",e.idToKey.get(g.id))):(e.positionChildren.get(e.idToKey.get(g.id))??[]).map(h=>h.key)).map(h=>e.map.get(h).id)}));c={version:1,runId:e.payload.runId,specSignature:e.signature,generationSignature:Z(At(e.state)),mappingSignature:Z(bt(e)),status:"IN_PROGRESS",cursor:0,pending:null,parents:r,flows:ee(e.scope.page.flowStartingPoints??[]),changes:o.map(g=>{let h=e.map.get(g),O=e.definitions.get(g),P=O.parentKey?e.map.get(O.parentKey):e.scope.root,G={parentId:h.parent.id,x:h.x,y:h.y},z={parentId:P.id,x:O.x,y:O.y},Y=B(e,h),de=P.getPluginData(i.specNodeKey)??"";return{key:g,id:h.id,before:G,after:z,digest:h.getPluginData(Se),intent:h.getPluginData(we),snapshots:[Y,{...Y,parentKey:de},{...Y,parentKey:de,x:z.x},{...Y,parentKey:de,x:z.x,y:z.y}].map(Z)}})},c.proofSignature=Rt(c)}let I=Z({runId:e.payload.runId,specSignature:e.signature,requestedKeys:o,world:Qe(e),journal:c}),T=c.status==="COMPLETE",L=(r,g={})=>({status:r,runId:e.payload.runId,specId:e.spec.id,specSignature:e.signature,checkpoint:Te(e),positionRecovery:{version:1,maxStagesPerRequest:1,status:c.status==="COMPLETE"?"COMPLETE":n?"PLANNED":"IN_PROGRESS",nodeKeys:ee(o),planSignature:I,changes:c.changes.map(({key:h,id:O,before:P,after:G})=>({key:h,id:O,before:ee(P),after:ee(G)})),...n?{}:{acceptedPlanSignature:t.planSignature},...T?{idempotent:!0}:{}},fontSubstitutions:e.substitutions,...g});if(n)return L(e.state.pending?"NEEDS_RECONCILIATION":"PLANNED",{writes:0});if(E(t.planSignature===I,"DESIGN_POSITION_RECOVERY_STALE_SIGNATURE"),c.status==="COMPLETE")return L("IN_PROGRESS",{writes:0,nextAction:"apply-next-batch"});try{if(e.state.positionRecovery||(e.state.positionRecovery=c,e.state.pending={kind:"position-recovery",runId:e.payload.runId,operationId:e.message.operationId},E(ve(H(e.state)).length<=Ot,"DESIGN_POSITION_RECOVERY_LEDGER_BUDGET"),F(e)),c.cursor<c.changes.length){let r=c.cursor,g=c.changes[r],h=e.map.get(g.key);c.pending||(c.pending={index:r,stage:0},F(e));let O=Ce(e,o,c).stages[r];if(O<3){if(c.pending.stage=O,F(e),Ce(e,o,c),O===0&&h.parent.id!==g.after.parentId||O===0&&!Ee(h.parent.children.map(G=>G.id),Ge(e,c,c.changes.map((G,z)=>z<=r?z===r?1:3:0)).get(g.after.parentId))){let G=e.map.get(e.idToKey.get(g.after.parentId))??e.scope.page,z=Ge(e,c,c.changes.map((Y,de)=>de<=r?de===r?1:3:0)).get(G.id);E(typeof G.insertChild=="function","DESIGN_POSITION_RECOVERY_INSERT_UNAVAILABLE"),y(),G.insertChild(z.indexOf(h.id),h)}O===1&&h.x!==g.after.x&&(y(),h.x=g.after.x),O===2&&h.y!==g.after.y&&(y(),h.y=g.after.y),Je(e,g,[O+1]),Ce(e,o,c),O+=1,c.pending.stage=O,F(e),Ce(e,o,c)}O===3&&(c.cursor+=1,c.pending=null,F(e));let P=L("IN_PROGRESS",{nextAction:"plan"});return P.positionRecovery.checkpointed=!0,P}return q(e),Ce(e,o,c),c.status="COMPLETE",e.state.pending=null,F(e),q(e),Ce(e,o,c),L("IN_PROGRESS",{nextAction:"apply-next-batch"})}catch(r){return e.state=Me(e.scope.root,e.ledgerKey),c=e.state.positionRecovery??c,L("PARTIAL_FAILURE",{error:String(r.message).slice(0,500),nextAction:"plan",replay:"PROHIBITED_UNTIL_READBACK_RECONCILIATION"})}}async function tn(e){E(!l,"DESIGN_RUNTIME_BUSY"),l=!0;try{let t=await A(e);if(["scope_design_assets_plan","scope_design_asset_stage","scope_design_asset_commit"].includes(e.command)){E(t.spec.schemaVersion==="1.1","DESIGN_ASSET_VERSION_REQUIRED"),a=t;let o={...w(t),assetKey:t.payload.assetKey,offset:t.payload.offset,dataBase64:t.payload.dataBase64,chunkSha256:t.payload.chunkSha256},d=await v[e.command==="scope_design_assets_plan"?"plan":e.command==="scope_design_asset_stage"?"stage":"commit"](o);if(e.command==="scope_design_asset_commit"&&d.status==="COMMITTED"){i.assertInScope(t.scope.root,t.scope),i.assertTrustedOwnership(t.ownership,e.operationId);let c=t.spec.assets.find(I=>I.key===t.payload.assetKey),m=K(t,"image",c.key);m?E(m.hash===d.imageHash&&m.signature===Z(c),`DESIGN_ASSET_CONFLICT:${c.key}`):N(t.scope.root,M(t,"image",c.key),{hash:d.imageHash,signature:Z(c)})}return{...d,runId:t.payload.runId,specId:t.spec.id}}if(t.payload.positionRecovery!==void 0)return await en(t);if(t.payload.adoptNativeFlow!==void 0&&E(e.command==="scope_design_apply"&&t.payload.reconcile===!0&&t.state.pending?.kind==="reactions","DESIGN_NATIVE_FLOW_ADOPTION_INVALID"),await $(t,e.command==="scope_design_apply"),await U(t),e.command==="scope_design_apply")for(let o of t.spec.assets??[])o.dataBase64||E(t.images.has(o.key),`DESIGN_ASSET_NOT_STAGED:${o.key}`);if(e.command==="scope_design_audit")return Jt(t,await _t(t));if(t.state.pending?.kind==="node"&&t.definitions.get(t.state.pending.key)?.type==="COMPONENT_SET"&&!t.map.has(t.state.pending.key)){if(t.payload.reconcile===!0)throw new Error(`DESIGN_NEEDS_RECONCILIATION:node:${t.state.pending.key}`);return{status:"NEEDS_RECONCILIATION",writes:0,runId:t.payload.runId,specId:t.spec.id,checkpoint:Te(t),nextAction:"audit"}}if(q(t),e.command==="scope_design_plan")return{status:t.state.pending?"NEEDS_RECONCILIATION":"PLANNED",writes:0,specId:t.spec.id,specSignature:t.signature,runId:t.payload.runId,checkpoint:Te(t),fontSubstitutions:t.substitutions,globalResources:{textStyles:t.spec.textStyles?.length??0,variables:t.spec.variables?.length??0,requiresExplicitAuthorization:!!(t.spec.textStyles?.length||t.spec.variables?.length)},timerUnit:t.timerUnit,playback:"NOT VERIFIED"};if(e.command==="scope_design_export_png"){let o=t.map.get(t.payload.nodeKey);E(o,"DESIGN_EXPORT_NODE_MISSING"),i.assertTaskOwnedSubtree(o,t.ownership);let d=t.payload.scale??1;E(Number.isFinite(d)&&d>=1&&d<=4,"DESIGN_EXPORT_SCALE_INVALID");let c=await o.exportAsync({format:"PNG",constraint:{type:"SCALE",value:d}});return{status:"PASS",writes:0,runId:t.payload.runId,specId:t.spec.id,nodeKey:t.payload.nodeKey,width:o.width,height:o.height,scale:d,bytesBase64:Rn(c),sha256:Ve(We(c)),fileIdentity:{fileKey:s.fileKey}}}E(e.command==="scope_design_apply","DESIGN_COMMAND_INVALID");let n=t.payload.batchSize??100;if(E(Number.isInteger(n)&&n>=1&&n<=500,"DESIGN_BATCH_SIZE_INVALID"),(t.spec.textStyles?.length||t.spec.variables?.length)&&E(t.payload.allowGlobalResources===!0,"DESIGN_GLOBAL_RESOURCES_AUTH_REQUIRED"),t.state.pending){if(t.payload.reconcile!==!0)return{status:"NEEDS_RECONCILIATION",runId:t.payload.runId,specId:t.spec.id,checkpoint:Te(t),nextAction:"audit"};await Qt(t)}if(t.state.complete){let o=await _t(t);return E(o.status==="PASS",`DESIGN_COMPLETED_DRIFT:${o.errors.join(",")}`),{status:"COMPLETE",runId:t.payload.runId,specId:t.spec.id,checkpoint:Te(t),nextAction:"audit",idempotent:!0}}t.scope.root.type!=="PAGE"&&i.assertTaskOwned(t.scope.root,t.ownership),(t.spec.flows?.length??0)>0&&E(t.scope.root.type==="PAGE","DESIGN_FLOW_REQUIRES_PAGE_SCOPE"),s.currentPage.id!==t.scope.page.id&&await s.setCurrentPageAsync(t.scope.page);try{Pe(t),F(t),await p(t);let o=0;for(let d of t.order)if(!t.map.has(d.key)&&(await ie(t,d),o+=1,o>=n))break;return t.map.size===t.spec.nodes.length&&o<n&&await Zt(t,n-o),{status:t.state.complete?"COMPLETE":"IN_PROGRESS",runId:t.payload.runId,specId:t.spec.id,checkpoint:Te(t),nextAction:t.state.complete?"audit":"apply-next-batch",fontSubstitutions:t.substitutions,nodeMap:Object.fromEntries([...t.map].map(([d,c])=>[d,c.id]))}}catch(o){return{status:"PARTIAL_FAILURE",runId:t.payload.runId,specId:t.spec.id,checkpoint:Te(t),nextAction:"audit",error:String(o.message).slice(0,500),replay:"PROHIBITED_UNTIL_READBACK_RECONCILIATION",...o.readbackMismatch?{readbackMismatch:o.readbackMismatch}:{}}}}finally{l=!1}}return{execute:tn}}return cn(Mn);})();
// END GENERATED DESIGN RUNTIME
const ALLOWED_COMMANDS = new Set([
  "status",
  "read_document",
  "create_poc",
  "create_text",
  "set_layout",
  "update_poc",
  "create_prototype_sample",
  "export_poc",
  "delete_poc_owned",
  "scope_read_node", "scope_create_frame", "scope_update_frame",
  "scope_delete_node", "scope_set_prototype",
  "scope_create_foreign_fixture", "scope_delete_foreign_fixture",
  "scope_design_plan", "scope_design_apply", "scope_design_audit", "scope_design_export_png",
  "scope_design_assets_plan", "scope_design_asset_stage", "scope_design_asset_commit",
]);
const READ_COMMANDS = new Set(["status", "read_document", "scope_read_node"]);
const SCOPED_MUTATIONS = new Set(["scope_create_frame", "scope_update_frame", "scope_delete_node", "scope_set_prototype",
  "scope_create_foreign_fixture", "scope_delete_foreign_fixture",
  "scope_design_plan", "scope_design_apply", "scope_design_audit", "scope_design_export_png",
  "scope_design_assets_plan", "scope_design_asset_stage", "scope_design_asset_commit"]);
const TEST_FIXTURE_COMMANDS = new Set(["scope_create_foreign_fixture", "scope_delete_foreign_fixture"]);

figma.showUI(__html__, { width: 320, height: 190 });

let sessionId = null;
let connectionId = null;
let clientId = null;
let pairingRecord = null;
let bridgeAuthenticated = false;
let scopedMutationAttemptCount = 0;
let designRuntime = null;

function createSessionId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function createClientId() {
  return `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function isValidPairingRecord(value) {
  return Boolean(value &&
    typeof value.serverId === "string" && value.serverId.length <= 120 &&
    typeof value.clientId === "string" && value.clientId === clientId &&
    typeof value.pairingId === "string" && value.pairingId.length <= 120 &&
    typeof value.secret === "string" && /^[A-Za-z0-9_-]{43}$/.test(value.secret));
}

async function loadClientState() {
  if (!figma.clientStorage || typeof figma.clientStorage.getAsync !== "function" ||
      typeof figma.clientStorage.setAsync !== "function") {
    throw new Error("PAIRING_STORAGE_UNAVAILABLE: Figma clientStorage is not available in this plugin context.");
  }
  const storedClientId = await figma.clientStorage.getAsync(CLIENT_ID_STORAGE_KEY);
  clientId = typeof storedClientId === "string" && /^client-[a-z0-9-]{8,100}$/.test(storedClientId)
    ? storedClientId
    : createClientId();
  if (clientId !== storedClientId) await figma.clientStorage.setAsync(CLIENT_ID_STORAGE_KEY, clientId);
  const storedPairing = await figma.clientStorage.getAsync(PAIRING_STORAGE_KEY);
  pairingRecord = isValidPairingRecord(storedPairing) ? storedPairing : null;
}

function getFileIdentity() {
  if (typeof figma.fileKey === "string" && figma.fileKey.length > 0) {
    return { fileIdentity: `figma-file:${figma.fileKey}`, quality: "stable" };
  }
  return {
    fileIdentity: `session-file:${sessionId}:${figma.root.id}:${figma.root.name}`,
    quality: "session-only",
  };
}

function sendToUi(message) {
  figma.ui.postMessage(message);
}

function currentStatus() {
  const identity = getFileIdentity();
  return {
    workspaceId: WORKSPACE_ID,
    taskId: TASK_ID,
    sessionId,
    connectionId,
    clientId,
    pairingState: pairingRecord ? "paired" : "unpaired",
    pairingId: pairingRecord?.pairingId ?? null,
    fileIdentity: identity.fileIdentity,
    fileIdentityQuality: identity.quality,
    documentName: figma.root.name,
    pageCount: figma.root.children.length,
    currentPageId: figma.currentPage.id,
    currentPageName: figma.currentPage.name,
    selectionCount: figma.currentPage.selection.length,
    scopeGuardVersion: "8.0-D",
    ownershipGuardVersion: "8.0-E",
    mutationAuditVersion: "8.0-F",
    pageNodeFallback: true,
    scopedMutationAttemptCount,
  };
}

function respond(request, ok, resultOrError) {
  sendToUi({
    type: "plugin-result",
    workspaceId: WORKSPACE_ID,
    taskId: TASK_ID,
    connectionId,
    sessionId,
    fileIdentity: getFileIdentity().fileIdentity,
    requestId: request.requestId,
    ...(request.operationId ? { operationId: request.operationId } : {}),
    ok,
    ...(ok ? { result: resultOrError } : { error: String(resultOrError).slice(0, 1_000) }),
  });
}

function markOwned(node, role) {
  node.setPluginData(OWNER_KEY, OWNER_VALUE);
  node.setPluginData(ROLE_KEY, role);
  return node;
}

function isOwned(node) {
  return node.getPluginData(OWNER_KEY) === OWNER_VALUE;
}

function assertTrustedOwnership(ownership, operationId) {
  if (!ownership || ownership.workspaceId !== WORKSPACE_ID ||
      typeof ownership.taskId !== "string" || !/^[A-Za-z0-9._:-]{1,160}$/.test(ownership.taskId) ||
      typeof ownership.revision !== "string" || !/^[A-Za-z0-9._:-]{1,160}$/.test(ownership.revision) ||
      !/^op-[A-Za-z0-9_-]{8,100}$/.test(operationId || "")) {
    throw new Error("OWNERSHIP_CONTEXT_INVALID");
  }
}

function markTaskOwned(node, role, ownership, operationId) {
  assertTrustedOwnership(ownership, operationId);
  markOwned(node, role);
  node.setPluginData(WORKSPACE_OWNER_KEY, ownership.workspaceId);
  node.setPluginData(TASK_OWNER_KEY, ownership.taskId);
  node.setPluginData(OPERATION_OWNER_KEY, operationId);
  node.setPluginData(REVISION_OWNER_KEY, ownership.revision);
  // A POC key for future DesignSpec mapping; only the server's logical operation is used.
  node.setPluginData(SPEC_NODE_KEY, `poc:${operationId}`);
  return node;
}

function assertTaskOwned(node, ownership) {
  if (!node || !node.getPluginData(OWNER_KEY)) throw new Error("OWNERSHIP_REQUIRED");
  if (!isOwned(node)) throw new Error("OWNERSHIP_MISMATCH");
  if (node.getPluginData(WORKSPACE_OWNER_KEY) !== ownership.workspaceId) {
    throw new Error("OWNERSHIP_WORKSPACE_MISMATCH");
  }
  if (node.getPluginData(TASK_OWNER_KEY) !== ownership.taskId) {
    throw new Error("OWNERSHIP_TASK_MISMATCH");
  }
}

function assertTaskOwnedSubtree(node, ownership) {
  try {
    assertTaskOwned(node, ownership);
  } catch {
    throw new Error("OWNERSHIP_SUBTREE_VIOLATION");
  }
  if ("children" in node) {
    for (const child of node.children) assertTaskOwnedSubtree(child, ownership);
  }
}

async function findPocPage() {
  for (const page of figma.root.children) {
    if (page.name !== POC_PAGE_NAME) continue;
    await page.loadAsync();
    if (page.getPluginData(OWNER_KEY) === OWNER_VALUE) return page;
    throw new Error(`A page named "${POC_PAGE_NAME}" already exists and is not owned by this POC; refusing to modify it.`);
  }
  return null;
}

async function ensurePocPage() {
  let page = await findPocPage();
  if (!page) {
    page = figma.createPage();
    page.name = POC_PAGE_NAME;
    page.setPluginData(OWNER_KEY, OWNER_VALUE);
  }
  await page.loadAsync();
  return page;
}

function findOwnedNode(page, role) {
  for (const child of page.children) {
    if (isOwned(child) && child.getPluginData(ROLE_KEY) === role) return child;
  }
  return null;
}

function vectorReadback(node) {
  const paths = JSON.stringify(node.vectorPaths);
  // Diagnostics must not overflow the bridge response or silently truncate geometry.
  return paths.length <= 512 * 1024
    ? { vectorPaths: JSON.parse(paths), vectorPathsReadback: "PASS" }
    : { vectorPathsReadback: "NOT_VERIFIED_BUDGET_EXCEEDED" };
}

function textTypographyReadback(node) {
  const values = {}, states = {};
  for (const field of ["fontName", "fontSize", "lineHeight", "letterSpacing", "textAutoResize", "hasMissingFont", "textAlignHorizontal"]) {
    try {
      const value = node[field];
      let state = "PASS", captured;
      if (typeof value === "symbol" && value === figma.mixed) state = "MIXED";
      else if (value === undefined) state = "NOT_VERIFIED_UNSUPPORTED";
      else if (field === "fontName") {
        if (value && typeof value === "object" && typeof value.family === "string" && value.family &&
            typeof value.style === "string" && value.style) captured = { family: value.family, style: value.style };
        else state = "NOT_VERIFIED_INVALID";
      } else if (field === "fontSize") {
        if (Number.isFinite(value) && value > 0) captured = value;
        else state = "NOT_VERIFIED_INVALID";
      } else if (field === "lineHeight" || field === "letterSpacing") {
        if (field === "lineHeight" && value?.unit === "AUTO") captured = { unit: "AUTO" };
        else if (value && ["PIXELS", "PERCENT"].includes(value.unit) && Number.isFinite(value.value)) {
          captured = { unit: value.unit, value: value.value };
        } else state = "NOT_VERIFIED_INVALID";
      } else if (field === "hasMissingFont") {
        if (typeof value === "boolean") captured = value;
        else state = "NOT_VERIFIED_INVALID";
      } else if (typeof value === "string" && value) captured = value;
      else state = "NOT_VERIFIED_INVALID";
      values[field] = state === "PASS" ? captured : state;
      states[field] = state;
    } catch {
      // Property getters may be unavailable; never invent metrics or expose error text.
      values[field] = states[field] = "NOT_VERIFIED_READ_ERROR";
    }
  }
  return { ...values, typographyFieldReadback: states,
    typographyReadback: Object.values(states).every(state => state === "PASS") ? "PASS" : "NOT_VERIFIED" };
}

function summarizeNode(node) {
  const paintData = JSON.stringify({ fills: node.fills, strokes: node.strokes });
  const paintReadback = paintData.length <= 512 * 1024
    ? { ...JSON.parse(paintData), paintsReadback: "PASS" }
    : { paintsReadback: "NOT_VERIFIED_BUDGET_EXCEEDED" };
  return {
    id: node.id,
    type: node.type,
    name: node.name,
    parentId: node.parent?.id ?? null,
    owner: node.getPluginData(OWNER_KEY),
    role: node.getPluginData(ROLE_KEY),
    workspaceId: node.getPluginData(WORKSPACE_OWNER_KEY),
    taskId: node.getPluginData(TASK_OWNER_KEY),
    createdOperationId: node.getPluginData(OPERATION_OWNER_KEY),
    revision: node.getPluginData(REVISION_OWNER_KEY),
    specNodeKey: node.getPluginData(SPEC_NODE_KEY),
    testFixture: node.getPluginData(TEST_FIXTURE_KEY),
    width: node.width,
    height: node.height,
    x: node.x,
    y: node.y,
    ...paintReadback,
    ...(node.type === "VECTOR" ? vectorReadback(node) : {}),
    ...(node.type === "TEXT" ? { characters: node.characters, ...textTypographyReadback(node) } : {}),
    ...(node.reactions?.length ? { reactions: node.reactions.map((reaction) => ({
      trigger: reaction.trigger,
      actions: reaction.actions ?? (reaction.action ? [reaction.action] : []),
    })) } : {}),
    ...(node.type === "FRAME"
      ? {
          layoutMode: node.layoutMode,
          itemSpacing: node.itemSpacing,
          paddingTop: node.paddingTop,
          paddingRight: node.paddingRight,
          paddingBottom: node.paddingBottom,
          paddingLeft: node.paddingLeft,
        }
      : {}),
  };
}

function imageResourceReadback(node, summary) {
  const namespace = node.getPluginData("bridge-design-v1-spec");
  const evidence = { imageValidity: "NOT_VERIFIED", verification: "METADATA_AND_SYNC_HANDLE_LOOKUP_ONLY" };
  if (!namespace) return { ...evidence, status: "NOT_VERIFIED_NO_DESIGN_NAMESPACE" };
  if (!/^[a-f0-9]{24}$/.test(namespace)) return { ...evidence, status: "NOT_VERIFIED_INVALID_NAMESPACE" };
  let page = node;
  const ancestors = new Set();
  while (page && page.type !== "PAGE" && !ancestors.has(page)) {
    ancestors.add(page); page = page.parent;
  }
  const base = { ...evidence, namespace, pageId: page?.type === "PAGE" ? page.id : null };
  if (page?.type !== "PAGE") return { ...base, status: "NOT_VERIFIED_NO_ANCESTOR_PAGE" };
  if (typeof page.getPluginDataKeys !== "function" || typeof page.getPluginData !== "function" ||
      typeof figma.getImageByHash !== "function") return { ...base, status: "NOT_VERIFIED_API_UNAVAILABLE" };
  if (summary.paintsReadback !== "PASS" || !Array.isArray(summary.fills)) {
    return { ...base, status: "NOT_VERIFIED_PAINTS" };
  }
  try {
    const keys = page.getPluginDataKeys();
    if (!Array.isArray(keys) || keys.some((key) => typeof key !== "string")) {
      return { ...base, status: "NOT_VERIFIED_MALFORMED_KEYS" };
    }
    const pattern = new RegExp(`^bridge-design-v1-${namespace}-image-[a-f0-9]{24}$`);
    const imageKeys = keys.filter((key) => pattern.test(key));
    if (imageKeys.length > 2000) return { ...base, status: "NOT_VERIFIED_BUDGET_EXCEEDED", budgetRecords: 2000 };
    const resources = [];
    for (const key of imageKeys) {
      const text = page.getPluginData(key);
      if (typeof text !== "string" || text.length > 4096) {
        return { ...base, status: "NOT_VERIFIED_BUDGET_EXCEEDED", recordKey: key, budgetRecordCharacters: 4096 };
      }
      let record;
      try { record = JSON.parse(text); } catch {
        return { ...base, status: "NOT_VERIFIED_MALFORMED_RECORD", recordKey: key };
      }
      if (!record || Array.isArray(record) || typeof record.hash !== "string" || !record.hash.length ||
          record.hash.length > 128 || typeof record.signature !== "string" || !/^[a-f0-9]{64}$/.test(record.signature)) {
        return { ...base, status: "NOT_VERIFIED_MALFORMED_RECORD", recordKey: key };
      }
      // PASS means all scoped metadata/lookups were collected. A handle does not
      // prove image bytes, dimensions, rendering or persistence are valid.
      resources.push({ key, hash: record.hash, signature: record.signature,
        handleExists: Boolean(figma.getImageByHash(record.hash)),
        referencedByTargetFill: summary.fills.some((paint) => paint.type === "IMAGE" && paint.imageHash === record.hash) });
    }
    if (JSON.stringify(resources).length > 512 * 1024) {
      return { ...base, status: "NOT_VERIFIED_BUDGET_EXCEEDED", budgetCharacters: 512 * 1024 };
    }
    return { ...base, status: "PASS", resources };
  } catch {
    return { ...base, status: "NOT_VERIFIED_HOST_ERROR" };
  }
}

function prototypeStateReadback(node, summary) {
  const evidence = { verification: "READ_ONLY_METADATA", writes: 0 };
  const fail = (status) => ({ ...evidence, status });
  let page = node;
  const ancestors = new Set();
  while (page && page.type !== "PAGE" && !ancestors.has(page)) {
    ancestors.add(page); page = page.parent;
  }
  if (page?.type !== "PAGE") return fail("NOT_VERIFIED_NO_ANCESTOR_PAGE");
  if (page.id !== figma.currentPage.id) return { ...fail("NOT_VERIFIED_INACTIVE_PAGE"), pageId: page.id };
  const boundedText = (value, limit, empty = false) => typeof value === "string" && value.length <= limit &&
    (empty || value.length > 0) && !value.includes("\0");
  const stableKey = (value) => boundedText(value, 160) && /^[A-Za-z0-9][A-Za-z0-9_.:/-]*$/.test(value);
  const nodeId = (value) => boundedText(value, 200) && /^(?:I)?\d+:\d+(?:;\d+:\d+)*$/.test(value);
  const plain = (value) => value && typeof value === "object" && !Array.isArray(value);
  const digest = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
  const isoTime = (value) => boundedText(value, 40) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value);
  const takeFlows = (values, semantic = false, pending = false) => {
    if (!Array.isArray(values) || values.length > 1000) throw new Error("NOT_VERIFIED_FLOW_BUDGET_OR_SCHEMA");
    return values.map((flow) => {
      if (!plain(flow) || !boundedText(flow.name, 256) || (!semantic && !nodeId(flow.nodeId)) ||
          (semantic && !stableKey(flow.nodeKey) && !(flow.nodeKey === null && nodeId(flow.nodeId))) || (pending && flow.nodeKey !== null && !stableKey(flow.nodeKey))) {
        throw new Error("NOT_VERIFIED_MALFORMED_FLOW");
      }
      return { name: flow.name, ...(semantic ? { nodeKey: flow.nodeKey } : { nodeId: flow.nodeId }),
        ...(semantic && flow.nodeKey === null ? { nodeId: flow.nodeId } : {}),
        ...(pending ? { nodeKey: flow.nodeKey } : {}) };
    });
  };
  const readRecord = (key) => {
    const text = page.getPluginData(key);
    if (!text) return null;
    if (typeof text !== "string" || text.length > 256 * 1024 ||
        BridgeDesignRuntime.utf8ToBytes(text).byteLength > 256 * 1024) throw new Error("NOT_VERIFIED_LEDGER_BUDGET_EXCEEDED");
    try { const value = JSON.parse(text); if (!plain(value)) throw new Error(); return value; }
    catch { throw new Error("NOT_VERIFIED_MALFORMED_LEDGER"); }
  };
  try {
    if (page.flowStartingPoints === undefined) return fail("NOT_VERIFIED_FLOW_API_UNAVAILABLE");
    const flows = takeFlows(page.flowStartingPoints);
    const base = { ...evidence, status: "PASS", pageId: page.id, flowStartingPoints: flows };
    // Pages have no design namespace: return only their bounded native flows.
    if (node.type === "PAGE") return base;
    const namespace = node.getPluginData("bridge-design-v1-spec");
    if (!namespace) return { ...base, designState: fail("NOT_VERIFIED_NO_DESIGN_NAMESPACE") };
    if (!/^[a-f0-9]{24}$/.test(namespace)) return { ...base, designState: fail("NOT_VERIFIED_INVALID_NAMESPACE") };
    const sourceKey = summary.specNodeKey;
    if (!stableKey(sourceKey)) return { ...base, designState: fail("NOT_VERIFIED_INVALID_SOURCE_KEY") };
    if (typeof page.getPluginData !== "function") return { ...base, designState: fail("NOT_VERIFIED_LEDGER_API_UNAVAILABLE") };
    const state = { namespace, sourceKey, pageId: page.id };
    try {
      // Read exactly two known keys. Never enumerate node or foreign ledgers.
      const ledger = readRecord(`bridge-design-v1-${namespace}-ledger`);
      if (!ledger) return { ...base, designState: { ...state, ...fail("NOT_VERIFIED_NO_LEDGER") } };
      if (!Number.isInteger(ledger.cursor) || ledger.cursor < 0 || ledger.cursor > 25000 ||
          (ledger.finalizeCursor !== undefined && (!Number.isInteger(ledger.finalizeCursor) || ledger.finalizeCursor < 0 || ledger.finalizeCursor > 25000))) {
        throw new Error("NOT_VERIFIED_MALFORMED_LEDGER");
      }
      let pending = null;
      if (ledger.pending !== null) {
        const p = ledger.pending;
        if (!plain(p) || !["image", "style", "variable", "collection", "node", "order", "reactions", "flows"].includes(p.kind) ||
            !stableKey(p.key) || !isoTime(p.startedAt) || !boundedText(p.operationId, 160) ||
            (p.id !== undefined && !boundedText(p.id, 200))) throw new Error("NOT_VERIFIED_MALFORMED_PENDING");
        pending = { kind: p.kind, key: p.key, startedAt: p.startedAt, operationId: p.operationId,
          ...(p.id === undefined ? {} : { id: p.id }), ...(p.flowBefore === undefined ? {} : { flowBefore: takeFlows(p.flowBefore, false, true) }),
          flowAfter: p.flowAfter === undefined ? null : takeFlows(p.flowAfter, false, true),
          flowAfterState: p.flowAfter === undefined ? "NOT_RECORDED" : "RECORDED",
          reactionReadback: null, reactionReadbackState: "NOT_RECORDED" };
        if (p.reactionReadback !== undefined) {
          const r = p.reactionReadback;
          if (!plain(r) || r.version !== 1 || r.sourceKey !== p.key || !stableKey(r.sourceKey) || !nodeId(r.sourceId) ||
              !stableKey(r.topLevelKey) || !digest(r.digest) || r.operationId !== p.operationId || !isoTime(r.observedAt)) {
            throw new Error("NOT_VERIFIED_MALFORMED_REACTION_READBACK");
          }
          pending.reactionReadback = { version: r.version, sourceKey: r.sourceKey, sourceId: r.sourceId,
            topLevelKey: r.topLevelKey, digest: r.digest, operationId: r.operationId, observedAt: r.observedAt };
          pending.reactionReadbackState = "RECORDED";
        }
      }
      let observation = null;
      if (ledger.nativeFlowObservation !== undefined) {
        const takeObservation = (o) => {
          if (!plain(o) || ![1, 2].includes(o.version) || !stableKey(o.sourceKey) || !stableKey(o.topLevelKey) ||
              !digest(o.reactionDigest) || !boundedText(o.operationId, 160) || !isoTime(o.observedAt)) {
            throw new Error("NOT_VERIFIED_MALFORMED_NATIVE_OBSERVATION");
          }
          const result = { version: o.version, sourceKey: o.sourceKey, topLevelKey: o.topLevelKey,
            before: takeFlows(o.before, true), after: takeFlows(o.after, true), reactionDigest: o.reactionDigest,
            operationId: o.operationId, observedAt: o.observedAt };
          if (o.version === 1) return result;
          if (!["NATIVE_SETTER_READBACK", "EXPLICIT_READBACK_ADOPTION"].includes(o.provenance)) {
            throw new Error("NOT_VERIFIED_MALFORMED_NATIVE_OBSERVATION");
          }
          result.provenance = o.provenance;
          if (o.provenance === "NATIVE_SETTER_READBACK") {
            const r = o.reactionReadback;
            if (!plain(r) || r.version !== 1 || r.sourceKey !== o.sourceKey || !nodeId(r.sourceId) ||
                r.topLevelKey !== o.topLevelKey || r.digest !== o.reactionDigest ||
                r.operationId !== o.operationId || !isoTime(r.observedAt)) {
              throw new Error("NOT_VERIFIED_MALFORMED_REACTION_READBACK");
            }
            result.reactionReadback = { version: 1, sourceKey: r.sourceKey, sourceId: r.sourceId,
              topLevelKey: r.topLevelKey, digest: r.digest, operationId: r.operationId, observedAt: r.observedAt };
          } else {
            const r = o.recovery, p = r?.explicitPayload, old = r?.legacyPending;
            if (o.reactionReadback !== null || !plain(r) || !plain(p) || !plain(old) || old.kind !== "reactions" ||
                old.key !== o.sourceKey || !isoTime(old.startedAt) || !boundedText(old.operationId, 160) ||
                r.operationId !== o.operationId || !isoTime(r.observedAt) ||
                r.verification !== "CURRENT_STATE_ADOPTED_NOT_ORIGIN_PROVED" ||
                !digest(r.expectedFlowSnapshotSignature) || !digest(r.expectedReactionSnapshotSignature) ||
                p.pendingOperationId !== old.operationId || p.flowSnapshotSignature !== r.expectedFlowSnapshotSignature ||
                p.reactionSnapshotSignature !== r.expectedReactionSnapshotSignature) {
              throw new Error("NOT_VERIFIED_MALFORMED_FLOW_ADOPTION");
            }
            result.reactionReadback = null;
            result.recovery = { operationId: r.operationId, observedAt: r.observedAt,
              verification: r.verification, expectedFlowSnapshotSignature: r.expectedFlowSnapshotSignature,
              expectedReactionSnapshotSignature: r.expectedReactionSnapshotSignature,
              legacyPending: { kind: old.kind, key: old.key, startedAt: old.startedAt, operationId: old.operationId },
              explicitPayload: { pendingOperationId: p.pendingOperationId, flowSnapshotSignature: p.flowSnapshotSignature,
                reactionSnapshotSignature: p.reactionSnapshotSignature } };
          }
          return result;
        };
        const o = ledger.nativeFlowObservation;
        if (o?.version === 2 && Array.isArray(o.entries)) {
          if (o.entries.length < 1 || o.entries.length > 1000) throw new Error("NOT_VERIFIED_FLOW_BUDGET_OR_SCHEMA");
          observation = { version: 2, entries: o.entries.map(takeObservation), chainVerification: "NOT_VERIFIED_METADATA_ONLY" };
        } else observation = takeObservation(o);
      }
      const record = readRecord(`bridge-design-v1-${namespace}-reactions-${BridgeDesignRuntime.designSignature(sourceKey).slice(0, 24)}`);
      if (record && (!digest(record.digest) || (record.version !== undefined && ![1, 2].includes(record.version)))) {
        throw new Error("NOT_VERIFIED_MALFORMED_REACTION_RECORD");
      }
      const result = { ...state, ...evidence, status: "PASS", cursor: ledger.cursor,
        finalizeCursor: ledger.finalizeCursor ?? null, finalizeCursorState: ledger.finalizeCursor === undefined ? "NOT_RECORDED" : "RECORDED",
        pending, nativeFlowObservation: observation, nativeFlowObservationState: observation ? "RECORDED" : "NOT_RECORDED",
        sourceReactionRecord: record ? { status: "PRESENT", version: record.version ?? null, digest: record.digest } : { status: "MISSING" } };
      if (BridgeDesignRuntime.utf8ToBytes(JSON.stringify(result)).byteLength > 256 * 1024) throw new Error("NOT_VERIFIED_LEDGER_BUDGET_EXCEEDED");
      return { ...base, designState: result };
    } catch (error) {
      const status = typeof error?.message === "string" && error.message.startsWith("NOT_VERIFIED_") ? error.message : "NOT_VERIFIED_HOST_ERROR";
      return { ...base, designState: { ...state, ...fail(status) } };
    }
  } catch (error) {
    const status = typeof error?.message === "string" && error.message.startsWith("NOT_VERIFIED_") ? error.message : "NOT_VERIFIED_HOST_ERROR";
    return { ...fail(status), pageId: page.id };
  }
}

function collectOwnedNodes(node, result = []) {
  if (!isOwned(node)) return result;
  result.push(summarizeNode(node));
  if ("children" in node) {
    for (const child of node.children) collectOwnedNodes(child, result);
  }
  return result;
}

async function createPocFrame() {
  const page = await ensurePocPage();
  let frame = findOwnedNode(page, "poc-frame");
  if (!frame) {
    frame = markOwned(figma.createFrame(), "poc-frame");
    frame.name = POC_FRAME_NAME;
    frame.resize(375, 812);
    frame.x = 0;
    frame.y = 0;
    frame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
    page.appendChild(frame);
  }
  return summarizeNode(frame);
}

async function createPocText() {
  const page = await ensurePocPage();
  const frame = findOwnedNode(page, "poc-frame");
  if (!frame) throw new Error("Run figma_create_poc before creating POC text.");
  let text = frame.children.find(
    (node) => isOwned(node) && node.getPluginData(ROLE_KEY) === "poc-text",
  );
  if (!text) {
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    text = markOwned(figma.createText(), "poc-text");
    text.characters = POC_TEXT_INITIAL;
    text.fontSize = 20;
    text.fills = [{ type: "SOLID", color: { r: 0.09, g: 0.12, b: 0.18 } }];
    frame.appendChild(text);
  }
  return summarizeNode(text);
}

async function setPocLayout() {
  const page = await ensurePocPage();
  const frame = findOwnedNode(page, "poc-frame");
  if (!frame) throw new Error("Run figma_create_poc before setting Auto Layout.");
  if (!subtreeIsFullyOwned(frame)) {
    throw new Error("Refusing to change POC Auto Layout because the frame contains unowned content.");
  }
  frame.layoutMode = "VERTICAL";
  frame.primaryAxisSizingMode = "FIXED";
  frame.counterAxisSizingMode = "FIXED";
  frame.paddingTop = 24;
  frame.paddingRight = 24;
  frame.paddingBottom = 24;
  frame.paddingLeft = 24;
  frame.itemSpacing = 16;
  frame.resize(375, 812);
  return summarizeNode(frame);
}

async function updatePoc() {
  const page = await ensurePocPage();
  const frame = findOwnedNode(page, "poc-frame");
  const text = frame?.children.find(
    (node) => isOwned(node) && node.getPluginData(ROLE_KEY) === "poc-text",
  );
  if (!frame || !text) throw new Error("Create the POC frame and text before updating.");
  if (!subtreeIsFullyOwned(frame)) {
    throw new Error("Refusing to update the POC frame because it contains unowned content.");
  }
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  text.characters = "Local Codex ↔ Local Figma VERIFIED";
  frame.paddingTop = 32;
  frame.paddingRight = 32;
  frame.paddingBottom = 32;
  frame.paddingLeft = 32;
  frame.itemSpacing = 20;
  frame.resize(375, 812);
  return { frame: summarizeNode(frame), text: summarizeNode(text) };
}

function removeOwnedRole(page, role) {
  const existing = findOwnedNode(page, role);
  if (!existing) return;
  if (!subtreeIsFullyOwned(existing)) {
    throw new Error(`Refusing to replace POC node "${existing.name}" because it contains unowned content.`);
  }
  existing.remove();
}

async function createPrototypeSample() {
  const page = await ensurePocPage();
  removeOwnedRole(page, "prototype-frame-a");
  removeOwnedRole(page, "prototype-frame-b");

  const frameA = markOwned(figma.createFrame(), "prototype-frame-a");
  frameA.name = "Frame A";
  frameA.resize(375, 812);
  frameA.x = 480;
  frameA.y = 0;
  frameA.fills = [{ type: "SOLID", color: { r: 0.96, g: 0.97, b: 0.99 } }];
  frameA.layoutMode = "VERTICAL";
  frameA.primaryAxisSizingMode = "FIXED";
  frameA.counterAxisSizingMode = "FIXED";
  frameA.paddingTop = 32;
  frameA.paddingRight = 24;
  frameA.paddingBottom = 32;
  frameA.paddingLeft = 24;
  frameA.itemSpacing = 16;
  frameA.resize(375, 812);
  page.appendChild(frameA);

  const frameB = markOwned(figma.createFrame(), "prototype-frame-b");
  frameB.name = "Frame B";
  frameB.resize(375, 812);
  frameB.x = 900;
  frameB.y = 0;
  frameB.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  page.appendChild(frameB);

  const button = markOwned(figma.createFrame(), "prototype-button");
  button.name = "Button — Navigate to B";
  button.layoutMode = "HORIZONTAL";
  button.primaryAxisSizingMode = "AUTO";
  button.counterAxisSizingMode = "AUTO";
  button.paddingTop = 12;
  button.paddingRight = 20;
  button.paddingBottom = 12;
  button.paddingLeft = 20;
  button.cornerRadius = 12;
  button.fills = [{ type: "SOLID", color: { r: 0.2, g: 0.36, b: 0.9 } }];
  frameA.appendChild(button);

  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  const buttonText = markOwned(figma.createText(), "prototype-button-text");
  buttonText.characters = "Continue";
  buttonText.fontSize = 16;
  buttonText.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  button.appendChild(buttonText);

  const action = {
    type: "NODE",
    destinationId: frameB.id,
    navigation: "NAVIGATE",
    transition: null,
  };
  await button.setReactionsAsync([
    {
      trigger: { type: "ON_CLICK" },
      actions: [action],
    },
  ]);

  const reaction = button.reactions.find((item) => item.trigger?.type === "ON_CLICK");
  const actions = reaction?.actions ?? (reaction?.action ? [reaction.action] : []);
  const readBack = actions.find(
    (item) => item.type === "NODE" && item.destinationId === frameB.id && item.navigation === "NAVIGATE",
  );
  if (!readBack) throw new Error("Figma did not read back the requested ON_CLICK → NAVIGATE reaction.");

  return {
    frameA: { id: frameA.id, name: frameA.name },
    frameB: { id: frameB.id, name: frameB.name },
    button: { id: button.id, name: button.name },
    reaction: { trigger: reaction.trigger, action: readBack },
    playback: "NOT VERIFIED — no Prototype UI or Computer Use was used",
  };
}

async function exportPoc() {
  const page = await findPocPage();
  const frame = page && findOwnedNode(page, "poc-frame");
  if (!frame) throw new Error("The owned C2C Bridge POC frame does not exist.");
  const bytes = await frame.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: 1 } });
  return {
    width: frame.width,
    height: frame.height,
    bytes: Array.from(bytes),
  };
}

function countOwnedTree(node) {
  let count = isOwned(node) ? 1 : 0;
  if ("children" in node) {
    for (const child of node.children) count += countOwnedTree(child);
  }
  return count;
}

function collectNodeIds(node, ids = []) {
  ids.push(node.id);
  if ("children" in node) {
    for (const child of node.children) collectNodeIds(child, ids);
  }
  return ids;
}

function subtreeIsFullyOwned(node) {
  if (!isOwned(node)) return false;
  if (!("children" in node)) return true;
  return node.children.every(subtreeIsFullyOwned);
}

async function deletePocOwned() {
  const page = await findPocPage();
  if (!page) return { deletedNodes: 0, pageDeleted: false, pageFound: false };

  let deletedNodes = 0;
  const deletedNodeIds = [];
  let preservedForeignTrees = 0;
  for (const child of [...page.children]) {
    if (!isOwned(child)) {
      preservedForeignTrees += 1;
      continue;
    }
    if (!subtreeIsFullyOwned(child)) {
      preservedForeignTrees += 1;
      continue;
    }
    deletedNodes += countOwnedTree(child);
    collectNodeIds(child, deletedNodeIds);
    child.remove();
  }

  let pageDeleted = false;
  if (page.children.length === 0 && figma.root.children.length > 1 &&
      page.getPluginData(OWNER_KEY) === OWNER_VALUE && figma.currentPage.id !== page.id &&
      typeof figma.deletePage === "function") {
    figma.deletePage(page);
    pageDeleted = true;
    deletedNodeIds.push(page.id);
  }

  const readBack = await Promise.all(deletedNodeIds.map(async (id) => ({
    id,
    exists: (await figma.getNodeByIdAsync(id)) !== null,
  })));

  return {
    deletedNodes,
    pageDeleted,
    pageFound: true,
    preservedForeignTrees,
    lastPagePreserved: !pageDeleted && figma.root.children.length === 1,
    deletedNodeIds,
    readBackAbsent: readBack.every((entry) => !entry.exists),
    readBack,
  };
}

async function resolveScope(scope) {
  if (!scope || !/^[0-9]+:[0-9]+$/.test(scope.pageId || "") ||
      !/^[0-9]+:[0-9]+$/.test(scope.rootNodeId || "")) throw new Error("SCOPE_REQUIRED");
  if (scope.fileIdentity !== getFileIdentity().fileIdentity) throw new Error("SCOPE_FILE_MISMATCH");
  const page = figma.root.children.find((item) => item.id === scope.pageId) ??
    await figma.getNodeByIdAsync(scope.pageId);
  if (!page || page.type !== "PAGE") throw new Error("SCOPE_PAGE_MISMATCH");
  const root = figma.root.children.find((item) => item.id === scope.rootNodeId) ??
    await figma.getNodeByIdAsync(scope.rootNodeId);
  if (!root) throw new Error("SCOPE_ROOT_NOT_FOUND");
  let ancestor = root;
  while (ancestor && ancestor.type !== "PAGE") ancestor = ancestor.parent;
  if (ancestor?.id !== page.id) throw new Error("SCOPE_ROOT_PAGE_MISMATCH");
  return { page, root };
}

function assertInScope(node, scope, violationCode = "SCOPE_VIOLATION") {
  // A native await can move the entire authorized root, while its descendants
  // still point to that root. Validate the current PAGE before accepting it.
  if (!scope?.root || scope.root.removed) throw new Error("SCOPE_ROOT_NOT_FOUND");
  if (!scope.page || scope.page.removed || scope.page.type !== "PAGE") throw new Error("SCOPE_PAGE_MISMATCH");
  let rootPage = scope.root;
  while (rootPage && rootPage.type !== "PAGE") rootPage = rootPage.parent;
  if (rootPage?.id !== scope.page.id) throw new Error("SCOPE_ROOT_PAGE_MISMATCH");
  if (!node || node.removed) throw new Error(violationCode);
  let ancestor = node;
  while (ancestor) {
    if (ancestor.id === scope.root.id) return;
    if (ancestor.type === "PAGE") {
      if (ancestor.id !== scope.page.id) throw new Error("SCOPE_PAGE_MISMATCH");
      break;
    }
    ancestor = ancestor.parent;
  }
  throw new Error(violationCode);
}

async function executeScopedMutation(message) {
  if (!SCOPED_MUTATIONS.has(message.command)) throw new Error("SCOPE_VIOLATION: implicit POC mutation is disabled");
  if (message.command.startsWith("scope_design_")) {
    if (!designRuntime) designRuntime = BridgeDesignRuntime.createDesignRuntime(figma, {
      resolveScope, assertInScope, assertTrustedOwnership, assertTaskOwned, assertTaskOwnedSubtree,
      markTaskOwned, specNodeKey: SPEC_NODE_KEY,
      onMutation() { scopedMutationAttemptCount += 1; },
    });
    return await designRuntime.execute(message);
  }
  const scope = await resolveScope(message.trustedScope);
  const ownership = message.trustedOwnership;
  assertTrustedOwnership(ownership, message.operationId);
  if (TEST_FIXTURE_COMMANDS.has(message.command) && message.testFixture !== true) {
    throw new Error("TEST_FIXTURE_DISABLED");
  }
  const payload = message.payload || {};
  if (message.command === "scope_create_foreign_fixture") {
    const parent = figma.root.children.find((item) => item.id === payload.parentId) ??
      await figma.getNodeByIdAsync(payload.parentId || "");
    assertInScope(parent, scope, "CREATE_PARENT_SCOPE_VIOLATION");
    if (!["PAGE", "FRAME"].includes(parent.type) ||
        typeof payload.name !== "string" || payload.name.length < 1 || payload.name.length > 100) {
      throw new Error("TEST_FIXTURE_INVALID_INPUT");
    }
    if (figma.currentPage.id !== scope.page.id) await figma.setCurrentPageAsync(scope.page);
    scopedMutationAttemptCount += 1;
    const frame = figma.createFrame();
    frame.setPluginData(TEST_FIXTURE_KEY, "8.0-E");
    frame.name = payload.name;
    frame.resize(120, 80);
    parent.appendChild(frame);
    return { ...summarizeNode(frame), auditBefore: { exists: false } };
  }
  if (message.command === "scope_delete_foreign_fixture") {
    const target = await figma.getNodeByIdAsync(payload.targetNodeId || "");
    assertInScope(target, scope);
    if (target.type !== "FRAME" || target.getPluginData(TEST_FIXTURE_KEY) !== "8.0-E" ||
        target.getPluginData(OWNER_KEY) || target.children.length !== 0) {
      throw new Error("TEST_FIXTURE_INVALID_TARGET");
    }
    const id = target.id;
    const auditBefore = summarizeNode(target);
    scopedMutationAttemptCount += 1;
    target.remove();
    return { id, exists: (await figma.getNodeByIdAsync(id)) !== null, auditBefore };
  }
  if (message.command === "scope_create_frame") {
    const parent = figma.root.children.find((item) => item.id === payload.parentId) ??
      await figma.getNodeByIdAsync(payload.parentId || "");
    assertInScope(parent, scope, "CREATE_PARENT_SCOPE_VIOLATION");
    if (!parent || !["PAGE", "FRAME"].includes(parent.type) ||
        typeof payload.name !== "string" || payload.name.length < 1 || payload.name.length > 100) {
      throw new Error("SCOPE_INVALID_CREATE_INPUT");
    }
    if (figma.currentPage.id !== scope.page.id) await figma.setCurrentPageAsync(scope.page);
    scopedMutationAttemptCount += 1;
    const frame = markTaskOwned(figma.createFrame(), "scope-test-frame", ownership, message.operationId);
    frame.name = payload.name;
    frame.resize(120, 80);
    parent.appendChild(frame);
    return { ...summarizeNode(frame), auditBefore: { exists: false } };
  }
  if (message.command === "scope_set_prototype") {
    const source = await figma.getNodeByIdAsync(payload.sourceNodeId || "");
    const destination = await figma.getNodeByIdAsync(payload.destinationNodeId || "");
    assertInScope(source, scope, "PROTOTYPE_SOURCE_SCOPE_VIOLATION");
    assertInScope(destination, scope, "PROTOTYPE_TARGET_SCOPE_VIOLATION");
    if (source.type !== "FRAME" || destination.type !== "FRAME") {
      throw new Error("SCOPE_INVALID_PROTOTYPE_INPUT");
    }
    assertTaskOwned(source, ownership);
    const auditBefore = summarizeNode(source);
    scopedMutationAttemptCount += 1;
    await source.setReactionsAsync([{ trigger: { type: "ON_CLICK" }, actions: [{
      type: "NODE", destinationId: destination.id, navigation: "NAVIGATE", transition: null,
    }] }]);
    return { ...summarizeNode(source), auditBefore };
  }
  const target = await figma.getNodeByIdAsync(payload.targetNodeId || "");
  assertInScope(target, scope);
  if (target.type !== "FRAME") throw new Error("SCOPE_TARGET_NOT_OWNED_FRAME");
  assertTaskOwned(target, ownership);
  if (message.command === "scope_update_frame") {
    if (typeof payload.name !== "string" || payload.name.length < 1 || payload.name.length > 100) {
      throw new Error("SCOPE_INVALID_UPDATE_INPUT");
    }
    const auditBefore = summarizeNode(target);
    scopedMutationAttemptCount += 1;
    target.name = payload.name;
    return { ...summarizeNode(target), auditBefore };
  }
  assertTaskOwnedSubtree(target, ownership);
  const id = target.id;
  const auditBefore = summarizeNode(target);
  scopedMutationAttemptCount += 1;
  target.remove();
  return { id, exists: (await figma.getNodeByIdAsync(id)) !== null, auditBefore };
}

const EVIDENCE_FIELDS = ["geometry", "vectorPaths", "text", "paints", "mask", "layout", "component", "children"];
const EVIDENCE_FIELD_BYTES = 512 * 1024;
const EVIDENCE_RESPONSE_BYTES = 7 * 1024 * 1024;
const EVIDENCE_ERROR_CODES = new WeakMap();
const EVIDENCE_TEXT_STYLES = ["fontName", "fontSize", "fontWeight", "textDecoration", "lineHeight", "letterSpacing", "fills", "textStyleId", "fillStyleId"];
const evidenceNodeId = value => typeof value === "string" && /^(?:I)?[0-9]+:[0-9]+(?:;[0-9]+:[0-9]+)*$/.test(value);

function evidenceFailure(code) {
  const error = new Error(code); EVIDENCE_ERROR_CODES.set(error, code); throw error;
}
function evidenceObject(value, keys) {
  return value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).every(key => keys.includes(key));
}
function validateEvidenceRequest(payload) {
  const request = payload?.evidence;
  if (!evidenceObject(payload, ["targetNodeId", "evidence"]) || !evidenceNodeId(payload.targetNodeId) ||
      !evidenceObject(request, ["fields", "readScope", "childOffset", "childLimit", "segmentOffset", "segmentLimit"]) ||
      !Array.isArray(request.fields) || request.fields.length < 1 || request.fields.length > EVIDENCE_FIELDS.length ||
      request.fields.some(field => !EVIDENCE_FIELDS.includes(field)) || new Set(request.fields).size !== request.fields.length ||
      !evidenceObject(request.readScope, ["fileIdentity", "pageId", "rootNodeId"]) ||
      typeof request.readScope.fileIdentity !== "string" || request.readScope.fileIdentity.length > 512 ||
      !/^[0-9]+:[0-9]+$/.test(request.readScope.pageId || "") || !/^[0-9]+:[0-9]+$/.test(request.readScope.rootNodeId || "")) {
    evidenceFailure("EVIDENCE_REQUEST_INVALID");
  }
  for (const [key, minimum, maximum] of [["childOffset", 0, 25000], ["childLimit", 1, 1000],
    ["segmentOffset", 0, 25000], ["segmentLimit", 1, 1000]]) {
    if (request[key] !== undefined && (!Number.isInteger(request[key]) || request[key] < minimum || request[key] > maximum)) {
      evidenceFailure("EVIDENCE_REQUEST_INVALID");
    }
  }
  return request;
}

function evidenceCharge(budget, units) {
  // UTF-16 string length and JSON punctuation are cheap lower bounds. Share
  // this counter across each native field so many small values cannot evade it.
  budget.units += units;
  if (budget.units > EVIDENCE_FIELD_BYTES) evidenceFailure("NOT_VERIFIED_BUDGET_EXCEEDED");
}

function evidenceHash(value) {
  const text = JSON.stringify(value);
  if (text.length > EVIDENCE_FIELD_BYTES || BridgeDesignRuntime.utf8ToBytes(text).byteLength > EVIDENCE_FIELD_BYTES) {
    evidenceFailure("NOT_VERIFIED_BUDGET_EXCEEDED");
  }
  return BridgeDesignRuntime.designSignature(value);
}

function evidenceCopy(value, depth = 0, seen = new Set(), budget = { units: 0 }) {
  if (typeof value === "symbol" && value === figma.mixed) evidenceFailure("NOT_VERIFIED_MIXED");
  evidenceCharge(budget, typeof value === "string" ? value.length + 2 : 2);
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (!value || typeof value !== "object") evidenceFailure("NOT_VERIFIED_INVALID");
  if (depth > 16 || seen.has(value)) evidenceFailure("NOT_VERIFIED_INVALID");
  if (Array.isArray(value) && value.length > 25000) evidenceFailure("NOT_VERIFIED_BUDGET_EXCEEDED");
  const keys = Object.keys(value);
  if (keys.length > 25000) evidenceFailure("NOT_VERIFIED_BUDGET_EXCEEDED");
  seen.add(value);
  const output = Array.isArray(value) ? [] : {};
  for (const key of keys) {
    if (["__proto__", "constructor", "prototype"].includes(key)) evidenceFailure("NOT_VERIFIED_INVALID");
    evidenceCharge(budget, Array.isArray(value) ? 1 : key.length + 3);
    output[key] = evidenceCopy(value[key], depth + 1, seen, budget);
  }
  seen.delete(value);
  return output;
}

function evidenceProperties(node, properties, budget) {
  const value = {}, propertyStatus = {};
  for (const property of properties) {
    try {
      const native = node[property];
      if (native === undefined) propertyStatus[property] = "NOT_VERIFIED_UNSUPPORTED";
      else {
        evidenceCharge(budget, property.length + 3);
        value[property] = evidenceCopy(native, 0, new Set(), budget); propertyStatus[property] = "VERIFIED";
      }
    } catch (error) {
      if (EVIDENCE_ERROR_CODES.get(error) === "NOT_VERIFIED_BUDGET_EXCEEDED") throw error;
      propertyStatus[property] = EVIDENCE_ERROR_CODES.get(error) || "NOT_VERIFIED_READ_ERROR";
    }
  }
  return { value, propertyStatus };
}

function evidencePaints(paints, budget) {
  if (typeof paints === "symbol" && paints === figma.mixed) evidenceFailure("NOT_VERIFIED_MIXED");
  if (!Array.isArray(paints)) evidenceFailure("NOT_VERIFIED_UNSUPPORTED");
  if (paints.length > 4000) evidenceFailure("NOT_VERIFIED_BUDGET_EXCEEDED");
  return paints.map(paint => {
    evidenceCharge(budget, 16);
    if (!["SOLID", "IMAGE", "GRADIENT_LINEAR", "GRADIENT_RADIAL", "GRADIENT_ANGULAR", "GRADIENT_DIAMOND"].includes(paint?.type)) {
      evidenceFailure("NOT_VERIFIED_UNSUPPORTED_PAINT");
    }
    const matrix = value => Array.isArray(value) && value.length === 2 &&
      value.every(row => Array.isArray(row) && row.length === 3 && row.every(Number.isFinite));
    const color = (value, alpha) => value && (alpha ? ["r", "g", "b", "a"] : ["r", "g", "b"])
      .every(key => Number.isFinite(value[key]) && value[key] >= 0 && value[key] <= 1);
    if (paint.type === "SOLID" && !color(paint.color, false)) evidenceFailure("NOT_VERIFIED_INVALID");
    if (paint.type === "IMAGE") {
      if (!["FILL", "FIT", "CROP", "TILE"].includes(paint.scaleMode)) evidenceFailure("NOT_VERIFIED_UNSUPPORTED_PAINT");
      if (typeof paint.imageHash !== "string" || !paint.imageHash.length) evidenceFailure("NOT_VERIFIED_MISSING_IMAGE");
      if (paint.imageTransform !== undefined && !matrix(paint.imageTransform)) evidenceFailure("NOT_VERIFIED_INVALID");
    }
    if (paint.type.startsWith("GRADIENT_")) {
      if (!matrix(paint.gradientTransform) || !Array.isArray(paint.gradientStops) || paint.gradientStops.length < 2 ||
          paint.gradientStops.some((stop, index, stops) => !Number.isFinite(stop?.position) || stop.position < 0 || stop.position > 1 ||
            index > 0 && stop.position < stops[index - 1].position || !color(stop.color, true))) evidenceFailure("NOT_VERIFIED_INVALID");
    }
    const value = { type: paint.type };
    for (const key of ["opacity", "visible", "blendMode", "boundVariables", ...(paint.type === "SOLID" ? ["color"] :
      paint.type === "IMAGE" ? ["imageHash", "scaleMode", "imageTransform", "scalingFactor", "rotation", "filters"] :
        ["gradientStops", "gradientTransform"])]) {
      if (paint[key] !== undefined) {
        evidenceCharge(budget, key.length + 3);
        value[key] = evidenceCopy(paint[key], 0, new Set(), budget);
      }
    }
    return value;
  });
}

function evidenceAppearance(node, strokes, budget) {
  const rounded = ["FRAME", "COMPONENT", "INSTANCE", "RECTANGLE"].includes(node.type);
  const properties = ["effects", ...(rounded ? ["cornerRadius"] : []), ...(strokes.length ? ["strokeWeight", "strokeAlign"] : [])];
  const result = evidenceProperties(node, properties, budget);
  if (!rounded) result.propertyStatus.cornerRadius = "NOT_APPLICABLE";
  if (!strokes.length) {
    result.propertyStatus.strokeWeight = "NOT_APPLICABLE";
    result.propertyStatus.strokeAlign = "NOT_APPLICABLE";
  }
  for (const [key, valid] of [["effects", value => Array.isArray(value)],
    ["cornerRadius", value => Number.isFinite(value) && value >= 0],
    ["strokeWeight", value => Number.isFinite(value) && value >= 0],
    ["strokeAlign", value => ["CENTER", "INSIDE", "OUTSIDE"].includes(value)]]) {
    if (result.propertyStatus[key] === "VERIFIED" && !valid(result.value[key])) {
      delete result.value[key]; result.propertyStatus[key] = "NOT_VERIFIED_INVALID";
    }
  }
  return { ...result, complete: Object.values(result.propertyStatus).every(status => ["VERIFIED", "NOT_APPLICABLE"].includes(status)) };
}

function evidenceFixedPosition(node, scope, budget) {
  const parent = node.parent;
  const derivation = { parentId: typeof parent?.id === "string" ? parent.id : null,
    parentType: typeof parent?.type === "string" ? parent.type : null,
    childIndex: null, childCount: null, numberOfFixedChildren: null };
  evidenceCharge(budget, (derivation.parentId?.length ?? 0) + (derivation.parentType?.length ?? 0) + 100);
  const unavailable = (status, reason) => ({ status, derivation: { ...derivation, reason } });
  if (!parent || !derivation.parentId || !derivation.parentType) return unavailable("NOT_VERIFIED_UNSUPPORTED", "HOST_API_UNAVAILABLE");
  if (["PAGE", "SECTION", "GROUP", "COMPONENT_SET", "DOCUMENT"].includes(derivation.parentType)) {
    return { status: "VERIFIED", value: false, derivation: { ...derivation, reason: "PARENT_HAS_NO_FIXED_CHILDREN" } };
  }
  if (!["FRAME", "COMPONENT", "INSTANCE"].includes(derivation.parentType)) {
    return unavailable("NOT_VERIFIED_UNSUPPORTED_PARENT", "UNSUPPORTED_PARENT_TYPE");
  }
  try { assertInScope(parent, scope); }
  catch { return unavailable("NOT_VERIFIED_PARENT_SCOPE_REQUIRED", "PARENT_SCOPE_REQUIRED"); }
  try {
    const count = parent.numberOfFixedChildren;
    if (count === undefined) return unavailable("NOT_VERIFIED_UNSUPPORTED", "HOST_API_UNAVAILABLE");
    if (!Number.isInteger(count) || count < 0 || count > 25000) return unavailable("NOT_VERIFIED_INVALID", "INVALID_FIXED_CHILDREN");
    const children = parent.children;
    if (children === undefined) return unavailable("NOT_VERIFIED_UNSUPPORTED", "HOST_API_UNAVAILABLE");
    if (!Array.isArray(children)) return unavailable("NOT_VERIFIED_INVALID", "INVALID_FIXED_CHILDREN");
    if (children.length > 25000) evidenceFailure("NOT_VERIFIED_BUDGET_EXCEEDED");
    let childIndex = -1;
    for (let index = 0; index < children.length; index += 1) {
      evidenceCharge(budget, 2);
      if (children[index]?.id === node.id) {
        if (childIndex !== -1) return unavailable("NOT_VERIFIED_INVALID", "INVALID_FIXED_CHILDREN");
        childIndex = index;
      }
    }
    if (childIndex === -1 || count > children.length) return unavailable("NOT_VERIFIED_INVALID", "INVALID_FIXED_CHILDREN");
    return { status: "VERIFIED", value: childIndex >= children.length - count,
      derivation: { ...derivation, childIndex, childCount: children.length, numberOfFixedChildren: count } };
  } catch (error) {
    if (EVIDENCE_ERROR_CODES.get(error) === "NOT_VERIFIED_BUDGET_EXCEEDED") throw error;
    return unavailable("NOT_VERIFIED_READ_ERROR", "HOST_API_UNAVAILABLE");
  }
}

function evidencePage(value) {
  const seen = new Set();
  while (value && value.type !== "PAGE" && !seen.has(value)) { seen.add(value); value = value.parent; }
  return value?.type === "PAGE" ? value : null;
}

function evidencePageSlice(items, offset, limit) {
  if (!Array.isArray(items) || items.length > 25000 || offset > items.length) evidenceFailure("NOT_VERIFIED_INVALID");
  const end = Math.min(items.length, offset + limit);
  return { items: items.slice(offset, end), complete: offset === 0 && end === items.length,
    pagination: { offset, limit, total: items.length, nextOffset: end < items.length ? end : null } };
}

function evidenceText(node, request, budget) {
  if (node.type !== "TEXT" || typeof node.getStyledTextSegments !== "function") evidenceFailure("NOT_VERIFIED_UNSUPPORTED");
  const characters = node.characters;
  if (typeof characters !== "string") evidenceFailure("NOT_VERIFIED_INVALID");
  evidenceCharge(budget, characters.length + 2);
  if (BridgeDesignRuntime.utf8ToBytes(characters).byteLength > EVIDENCE_FIELD_BYTES) evidenceFailure("NOT_VERIFIED_BUDGET_EXCEEDED");
  const native = node.getStyledTextSegments(EVIDENCE_TEXT_STYLES);
  if (!Array.isArray(native) || native.length > 25000) evidenceFailure("NOT_VERIFIED_BUDGET_EXCEEDED");
  let end = 0;
  const boundary = index => index === 0 || index === characters.length ||
    !(characters.charCodeAt(index - 1) >= 0xd800 && characters.charCodeAt(index - 1) <= 0xdbff &&
      characters.charCodeAt(index) >= 0xdc00 && characters.charCodeAt(index) <= 0xdfff);
  for (const segment of native) {
    if (!Number.isInteger(segment.start) || !Number.isInteger(segment.end) || segment.start !== end || segment.end <= end ||
        segment.end > characters.length || !boundary(segment.start) || !boundary(segment.end) ||
        segment.characters !== characters.slice(segment.start, segment.end)) evidenceFailure("NOT_VERIFIED_INVALID");
    end = segment.end;
  }
  if (end !== characters.length) evidenceFailure("NOT_VERIFIED_INVALID");
  const allSegments = native.map(segment => {
    evidenceCharge(budget, segment.characters.length + 20);
    const value = { start: segment.start, end: segment.end, characters: segment.characters, styleFieldStatus: {} };
    for (const key of EVIDENCE_TEXT_STYLES) {
      if (segment[key] === undefined) value.styleFieldStatus[key] = "NOT_VERIFIED_UNSUPPORTED";
      else {
        evidenceCharge(budget, key.length + 3);
        value[key] = key === "fills" ? evidencePaints(segment[key], budget) : evidenceCopy(segment[key], 0, new Set(), budget);
        value.styleFieldStatus[key] = "VERIFIED";
      }
    }
    return value;
  });
  const page = evidencePageSlice(allSegments, request.segmentOffset ?? 0, request.segmentLimit ?? 100);
  const typography = evidenceProperties(node, ["fontName", "fontSize", "fontWeight", "textDecoration", "lineHeight", "letterSpacing",
    "textAutoResize", "textAlignHorizontal", "textAlignVertical", "hasMissingFont"], budget);
  const stylesComplete = allSegments.every(segment => Object.values(segment.styleFieldStatus).every(status => status === "VERIFIED"));
  const typographyComplete = Object.entries(typography.propertyStatus).every(([key, status]) => status === "VERIFIED" ||
    status === "NOT_VERIFIED_MIXED" && EVIDENCE_TEXT_STYLES.includes(key) && allSegments.length > 0 && stylesComplete);
  return { value: { characters, segments: page.items, typography: typography.value, typographyFieldStatus: typography.propertyStatus },
    complete: page.complete && stylesComplete && typographyComplete,
    pagination: page.pagination, snapshotHash: evidenceHash({ characters, segments: allSegments,
      typography: typography.value, typographyFieldStatus: typography.propertyStatus }) };
}

async function evidenceField(node, field, request, scope) {
  const budget = { units: 0 };
  if (field === "geometry") {
    const result = evidenceProperties(node, ["name", "type", "x", "y", "width", "height", "rotation", "relativeTransform", "absoluteTransform", "opacity", "visible"], budget);
    result.value.parentId = node.parent?.id ?? null;
    return { ...result, complete: Object.values(result.propertyStatus).every(status => status === "VERIFIED") };
  }
  if (field === "vectorPaths") {
    if (node.type !== "VECTOR") evidenceFailure("NOT_VERIFIED_UNSUPPORTED");
    const paths = node.vectorPaths;
    if (!Array.isArray(paths) || paths.length > 25000 || paths.some(path => !["NONZERO", "EVENODD"].includes(path?.windingRule) || typeof path.data !== "string")) {
      evidenceFailure("NOT_VERIFIED_INVALID");
    }
    return { value: paths.map(path => {
      evidenceCharge(budget, path.data.length + path.windingRule.length + 32);
      return { windingRule: path.windingRule, data: path.data };
    }), complete: true };
  }
  if (field === "text") return evidenceText(node, request, budget);
  if (field === "paints") {
    const fills = evidencePaints(node.fills, budget), strokes = evidencePaints(node.strokes, budget);
    const appearance = evidenceAppearance(node, strokes, budget);
    return { value: { fills, strokes, appearance: appearance.value, appearancePropertyStatus: appearance.propertyStatus }, complete: appearance.complete };
  }
  if (field === "mask") {
    if (typeof node.isMask !== "boolean") evidenceFailure("NOT_VERIFIED_UNSUPPORTED");
    if (!["ALPHA", "VECTOR", "LUMINANCE"].includes(node.maskType)) evidenceFailure("NOT_VERIFIED_UNSUPPORTED_MASK");
    return { value: { isMask: node.isMask, maskType: node.maskType }, complete: true };
  }
  if (field === "layout") {
    const result = evidenceProperties(node, ["layoutMode", "itemSpacing", "counterAxisSpacing", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
      "primaryAxisSizingMode", "counterAxisSizingMode", "primaryAxisAlignItems", "counterAxisAlignItems", "layoutWrap",
      "layoutSizingHorizontal", "layoutSizingVertical", "layoutAlign", "layoutGrow", "layoutPositioning", "constraints", "clipsContent", "overflowDirection"], budget);
    const fixed = evidenceFixedPosition(node, scope, budget);
    result.propertyStatus.isFixed = fixed.status;
    if (fixed.status === "VERIFIED") result.value.isFixed = fixed.value;
    const enums = { layoutMode: ["NONE", "HORIZONTAL", "VERTICAL", "GRID"], layoutWrap: ["NO_WRAP", "WRAP"],
      primaryAxisSizingMode: ["FIXED", "AUTO"], counterAxisSizingMode: ["FIXED", "AUTO"],
      primaryAxisAlignItems: ["MIN", "CENTER", "MAX", "SPACE_BETWEEN"], counterAxisAlignItems: ["MIN", "CENTER", "MAX", "BASELINE"],
      layoutSizingHorizontal: ["FIXED", "HUG", "FILL"], layoutSizingVertical: ["FIXED", "HUG", "FILL"],
      layoutAlign: ["MIN", "CENTER", "MAX", "STRETCH", "INHERIT"], layoutPositioning: ["AUTO", "ABSOLUTE"],
      overflowDirection: ["NONE", "HORIZONTAL", "VERTICAL", "BOTH"] };
    for (const [key, values] of Object.entries(enums)) if (result.value[key] !== undefined && !values.includes(result.value[key])) {
      evidenceFailure("NOT_VERIFIED_UNSUPPORTED_LAYOUT");
    }
    if (result.value.constraints !== undefined && (!evidenceObject(result.value.constraints, ["horizontal", "vertical"]) ||
        !["MIN", "CENTER", "MAX", "STRETCH", "SCALE"].includes(result.value.constraints.horizontal) ||
        !["MIN", "CENTER", "MAX", "STRETCH", "SCALE"].includes(result.value.constraints.vertical))) evidenceFailure("NOT_VERIFIED_UNSUPPORTED_LAYOUT");
    return { ...result, derivations: { isFixed: fixed.derivation }, complete: Object.values(result.propertyStatus).every(status => status === "VERIFIED") };
  }
  if (field === "children") {
    const children = "children" in node ? node.children : [];
    if (!Array.isArray(children) || children.length > 25000) evidenceFailure("NOT_VERIFIED_BUDGET_EXCEEDED");
    const ids = children.map(child => {
      const id = child.id;
      if (!evidenceNodeId(id)) evidenceFailure("NOT_VERIFIED_INVALID");
      evidenceCharge(budget, id.length + 3); return id;
    });
    if (ids.some(id => !evidenceNodeId(id))) evidenceFailure("NOT_VERIFIED_INVALID");
    const page = evidencePageSlice(ids, request.childOffset ?? 0, request.childLimit ?? 100);
    return { value: page.items, complete: page.complete, pagination: page.pagination, snapshotHash: evidenceHash(ids) };
  }
  if (field === "component") {
    if (!["COMPONENT", "COMPONENT_SET", "INSTANCE"].includes(node.type)) evidenceFailure("NOT_VERIFIED_UNSUPPORTED");
    const value = { type: node.type, componentSetId: node.parent?.type === "COMPONENT_SET" ? node.parent.id : null };
    if (node.type === "INSTANCE") {
      if (typeof node.getMainComponentAsync !== "function") evidenceFailure("NOT_VERIFIED_UNSUPPORTED");
      const master = await node.getMainComponentAsync();
      if (!master) evidenceFailure("NOT_VERIFIED_MISSING_MASTER");
      value.mainComponentId = master?.id ?? null;
      if (master) {
        try { assertInScope(master, scope); }
        catch {
          const page = evidencePage(master);
          return { status: "NOT_VERIFIED_MASTER_SCOPE_REQUIRED", complete: false, referenceNodeId: master.id,
            ...(page ? { requiredReadScope: { fileIdentity: request.readScope.fileIdentity, pageId: page.id, rootNodeId: master.id } } : {}) };
        }
      }
    }
    for (const key of ["variantProperties", "componentProperties", "componentPropertyDefinitions", "overrides"]) {
      if (node[key] !== undefined) value[key] = evidenceCopy(node[key], 0, new Set(), budget);
    }
    return { value, complete: true };
  }
  evidenceFailure("NOT_VERIFIED_UNSUPPORTED");
}

async function readNodeEvidence(payload) {
  const request = validateEvidenceRequest(payload), identity = getFileIdentity().fileIdentity;
  if (request.readScope.fileIdentity !== identity) evidenceFailure("SCOPE_FILE_MISMATCH");
  const connection = { connectionId, sessionId, bridgeAuthenticated };
  const checkConnection = () => {
    if (getFileIdentity().fileIdentity !== identity) evidenceFailure("SCOPE_FILE_MISMATCH");
    if (connection.connectionId !== connectionId || connection.sessionId !== sessionId || connection.bridgeAuthenticated !== bridgeAuthenticated) {
      evidenceFailure("EVIDENCE_CONNECTION_CHANGED");
    }
  };
  const page = figma.root.children.find(item => item.id === request.readScope.pageId);
  if (!page || page.type !== "PAGE") evidenceFailure("SCOPE_PAGE_MISMATCH");
  const result = { schemaVersion: "1.0", source: "PluginAPI", readVersion: "scope-evidence-1.0", fileIdentity: identity,
    nodeId: payload.targetNodeId, pageId: page.id, readScope: { ...request.readScope }, fields: {}, complete: false, writes: 0 };
  if (figma.currentPage.id !== page.id) {
    result.scopeVerification = "NOT_VERIFIED_INACTIVE_PAGE";
    for (const field of request.fields) result.fields[field] = { status: "NOT_VERIFIED_INACTIVE_PAGE", complete: false };
  } else {
    const scope = await resolveScope(request.readScope);
    checkConnection(); assertInScope(scope.root, scope);
    const node = scope.root.id === payload.targetNodeId ? scope.root : await figma.getNodeByIdAsync(payload.targetNodeId);
    checkConnection(); assertInScope(node, scope);
    const checkScope = () => {
      checkConnection(); assertInScope(node, scope);
      if (figma.currentPage.id !== page.id) evidenceFailure("EVIDENCE_ACTIVE_PAGE_CHANGED");
    };
    checkScope(); result.scopeVerification = "VERIFIED";
    for (const field of request.fields) {
      checkScope();
      try {
        const record = await evidenceField(node, field, request, scope);
        checkScope();
        if (!record.status) record.status = "VERIFIED";
        if (record.value !== undefined) {
          record.sha256 = evidenceHash(record.value);
          if (BridgeDesignRuntime.utf8ToBytes(JSON.stringify(record)).byteLength > EVIDENCE_FIELD_BYTES) evidenceFailure("NOT_VERIFIED_BUDGET_EXCEEDED");
        }
        result.fields[field] = record;
      } catch (error) {
        checkScope();
        const status = EVIDENCE_ERROR_CODES.get(error) || "NOT_VERIFIED_READ_ERROR";
        result.fields[field] = { status, complete: false };
      }
    }
    checkScope(); result.complete = Object.values(result.fields).every(field => field.status === "VERIFIED" && field.complete);
  }
  checkConnection();
  if (BridgeDesignRuntime.utf8ToBytes(JSON.stringify(result)).byteLength > EVIDENCE_RESPONSE_BYTES) evidenceFailure("EVIDENCE_RESPONSE_BUDGET_EXCEEDED");
  result.sha256 = BridgeDesignRuntime.designSignature(result);
  return result;
}

async function execute(command, message) {
  switch (command) {
    case "status":
      return currentStatus();
    case "read_document":
      const pocPage = figma.root.children.find((page) => page.name === POC_PAGE_NAME && isOwned(page));
      if (pocPage) await pocPage.loadAsync();
      return {
        ...currentStatus(),
        pages: figma.root.children.map((page) => ({ id: page.id, name: page.name })),
        selection: figma.currentPage.selection.map((node) => ({ id: node.id, type: node.type, name: node.name })),
        ownedPocNodes: pocPage ? pocPage.children.flatMap((node) => collectOwnedNodes(node)) : [],
      };
    case "scope_read_node": {
      if (message.payload && Object.prototype.hasOwnProperty.call(message.payload, "evidence")) return await readNodeEvidence(message.payload);
      const node = figma.root.children.find((item) => item.id === message.payload?.targetNodeId) ??
        await figma.getNodeByIdAsync(message.payload?.targetNodeId || "");
      if (node?.type === "PAGE" && node.id !== figma.currentPage.id) {
        // Dynamic-page mode may refuse to load an inactive page while Figma is offline.
        // Page identity remains available on DocumentNode.children; no child claim is made.
        return { id: node.id, type: "PAGE", name: node.name, parentId: node.parent?.id ?? null,
          childIds: "NOT VERIFIED", scopedMutationAttemptCount };
      }
      if (!node) return { id: message.payload?.targetNodeId, exists: false };
      const summary = summarizeNode(node);
      return { ...summary, imageResources: imageResourceReadback(node, summary), prototypeState: prototypeStateReadback(node, summary),
        childIds: "children" in node ? node.children.map((child) => child.id) : [], reactions: node.reactions ?? [] };
    }
    case "create_poc":
      return await createPocFrame();
    case "create_text":
      return await createPocText();
    case "set_layout":
      return await setPocLayout();
    case "update_poc":
      return await updatePoc();
    case "create_prototype_sample":
      return await createPrototypeSample();
    case "export_poc":
      return await exportPoc();
    case "delete_poc_owned":
      return await deletePocOwned();
    default:
      throw new Error("Plugin command is not allowlisted");
  }
}

figma.ui.onmessage = async (message) => {
  if (!message || typeof message.type !== "string") return;

  if (message.type === "bridge-initialize") {
    if (!sessionId) sessionId = createSessionId();
    connectionId = null;
    bridgeAuthenticated = false;
    try {
      await loadClientState();
      sendToUi({ type: "bridge-hello", workspaceId: WORKSPACE_ID, taskId: TASK_ID,
        ...currentStatus(), pairingRecord });
    } catch (error) {
      sendToUi({ type: "bridge-initialize-error",
        error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }

  if (message.type === "bridge-auth-reset") {
    bridgeAuthenticated = false;
    return;
  }

  if (message.type === "pairing-persist") {
    const candidate = message.pairingRecord;
    if (message.clientId !== clientId || !isValidPairingRecord(candidate)) {
      sendToUi({ type: "pairing-storage-error", clientId, error: "Pairing record did not match the active Figma client." });
      return;
    }
    try {
      await figma.clientStorage.setAsync(PAIRING_STORAGE_KEY, candidate);
      pairingRecord = candidate;
      sendToUi({ type: "pairing-stored", serverId: candidate.serverId,
        clientId: candidate.clientId, pairingId: candidate.pairingId });
    } catch (error) {
      sendToUi({ type: "pairing-storage-error", clientId,
        serverId: candidate.serverId, pairingId: candidate.pairingId,
        error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }

  if (message.type === "bridge-authenticated") {
    if (message.clientId === clientId && message.connectionId === connectionId &&
        message.pairingId === pairingRecord?.pairingId && message.serverId === pairingRecord?.serverId) {
      bridgeAuthenticated = true;
    }
    return;
  }

  if (message.type === "connection-ready") {
    if (
      message.workspaceId !== WORKSPACE_ID ||
      message.taskId !== TASK_ID ||
      message.sessionId !== sessionId ||
      message.clientId !== clientId ||
      message.fileIdentity !== getFileIdentity().fileIdentity ||
      typeof message.connectionId !== "string"
    ) {
      return;
    }
    connectionId = message.connectionId;
    sendToUi({
      type: "plugin-ready",
      workspaceId: WORKSPACE_ID,
      taskId: TASK_ID,
      sessionId,
      connectionId,
      clientId,
      fileIdentity: getFileIdentity().fileIdentity,
    });
    return;
  }

  if (message.type !== "plugin-command" || !ALLOWED_COMMANDS.has(message.command)) return;

  const identity = getFileIdentity();
  if (
    message.workspaceId !== WORKSPACE_ID ||
    message.taskId !== TASK_ID ||
    message.sessionId !== sessionId ||
    message.connectionId !== connectionId ||
    message.fileIdentity !== identity.fileIdentity ||
    typeof message.requestId !== "string"
  ) {
    return;
  }

  if (!READ_COMMANDS.has(message.command) && identity.quality !== "stable") {
    respond(message, false, "STABLE_FILE_IDENTITY_REQUIRED");
    return;
  }

  if (!READ_COMMANDS.has(message.command) && !bridgeAuthenticated) {
    respond(message, false, "PAIRING_REQUIRED: the local Figma client is not authenticated.");
    return;
  }

  if (!READ_COMMANDS.has(message.command) && message.expectedFileIdentity !== identity.fileIdentity) {
    respond(message, false, "Expected file identity does not match the active Figma document.");
    return;
  }

  if (!READ_COMMANDS.has(message.command) &&
      (!/^op-[A-Za-z0-9_-]{8,100}$/.test(message.operationId || "") ||
       typeof message.authorizationId !== "string" || !message.authorizationId.startsWith("auth-"))) {
    respond(message, false, "OPERATION_ID_REQUIRED_OR_AUTH_INVALID");
    return;
  }

  try {
    const result = READ_COMMANDS.has(message.command)
      ? await execute(message.command, message) : await executeScopedMutation(message);
    if (message.command === "export_poc") {
      sendToUi({
        type: "plugin-result",
        workspaceId: WORKSPACE_ID,
        taskId: TASK_ID,
        connectionId,
        sessionId,
        fileIdentity: getFileIdentity().fileIdentity,
        requestId: message.requestId,
        operationId: message.operationId,
        ok: true,
        result: { width: result.width, height: result.height, bytes: result.bytes },
      });
    } else {
      respond(message, true, result);
    }
  } catch (error) {
    respond(message, false, error instanceof Error ? error.message : String(error));
  }
};

figma.on("close", () => {
  connectionId = null;
  bridgeAuthenticated = false;
});
