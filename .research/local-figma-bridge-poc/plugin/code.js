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
var BridgeDesignRuntime=(()=>{var We=Object.defineProperty;var In=Object.getOwnPropertyDescriptor;var Sn=Object.getOwnPropertyNames;var Nn=Object.prototype.hasOwnProperty;var Tn=(s,o,g)=>o in s?We(s,o,{enumerable:!0,configurable:!0,writable:!0,value:g}):s[o]=g;var _n=(s,o)=>{for(var g in o)We(s,g,{get:o[g],enumerable:!0})},mn=(s,o,g,c)=>{if(o&&typeof o=="object"||typeof o=="function")for(let E of Sn(o))!Nn.call(s,E)&&E!==g&&We(s,E,{get:()=>o[E],enumerable:!(c=In(o,E))||c.enumerable});return s};var On=s=>mn(We({},"__esModule",{value:!0}),s);var ce=(s,o,g)=>Tn(s,typeof o!="symbol"?o+"":o,g);var Xn={};_n(Xn,{canonical:()=>$,createDesignRuntime:()=>Wn,designSignature:()=>V,utf8ToBytes:()=>He});var An=s=>s/2**32|0,Cn=s=>s>>>0;function Bt(s,o,g,c){let E=An(g),T=Cn(g);s.setUint32(o,c?T:E,c),s.setUint32(o+4,c?E:T,c)}function Ht(s){return s instanceof Uint8Array||ArrayBuffer.isView(s)&&s.constructor.name==="Uint8Array"&&"BYTES_PER_ELEMENT"in s&&s.BYTES_PER_ELEMENT===1}var yt=s=>s?`"${s}" `:"";function bn(s,o=""){if(typeof s!="number")throw new TypeError(yt(o)+"expected number, got "+typeof s);if(!Number.isSafeInteger(s)||s<0)throw new RangeError(yt(o)+"expected integer >= 0, got "+s);return s}function Xe(s,o,g=""){if(Ht(s)&&(o===void 0||s.length===o))return s;o!==void 0&&bn(o,"length");let c=Ht(s),E=o!==void 0?` of length ${o}`:"",T=c?`length=${s.length}`:`type=${typeof s}`,U=yt(g)+"expected Uint8Array"+E+", got "+T;throw c?new RangeError(U):new TypeError(U)}var Rn=(s,o)=>{if(s===null||typeof s!="object"||Array.isArray(s))throw new TypeError((o==="object"?"":`"${o}" `)+"expected object, got type="+typeof s)},Vt=(s,o)=>{Rn(s,o);let g=Object.getPrototypeOf(s);if(g!==Object.prototype&&g!==null)throw new TypeError(`"${o}" expected plain object`);if(Object.hasOwn(s,"__proto__"))throw new TypeError(`"${o}.__proto__" is not allowed`)};function gt(s,o=!0){if(s.destroyed)throw new Error("hash was destroyed");if(o&&s.finished)throw new Error("digest() was already called")}function zt(s,o){Xe(s,void 0,"output");let g=o.outputLen;if(!(s.length>=g))throw new RangeError('"output" expected length >= '+g)}function ut(...s){for(let o=0;o<s.length;o++)s[o].fill(0)}function Ye(s){return new DataView(s.buffer,s.byteOffset,s.byteLength)}function Ee(s,o){return s<<32-o|s>>>o}var Dn=typeof Uint8Array.from([]).toHex=="function"&&typeof Uint8Array.fromHex=="function",wn=Array.from({length:256},(s,o)=>o.toString(16).padStart(2,"0"));function qe(s){if(Xe(s),Dn)return s.toHex();let o="";for(let g=0;g<s.length;g++)o+=wn[s[g]];return o}function kn(s,o,g="opts"){return Vt(s,"defaults"),o!==void 0&&Vt(o,g),Object.assign(Object.create(null),s,o)}function Wt(s,o={}){if(typeof s!="function")throw new TypeError('"hashCons" expected function, got type='+typeof s);o=kn({},o,"info");let g=(E,T)=>s(T).update(E).digest(),c=s(void 0);return g.outputLen=c.outputLen,g.blockLen=c.blockLen,g.canXOF=c.canXOF,g.create=E=>s(E),Object.assign(g,o),Object.freeze(g)}var Xt=s=>({oid:Uint8Array.from([6,9,96,134,72,1,101,3,4,2,s])});function Yt(s,o,g){return s&o^~s&g}function qt(s,o,g){return s&o^s&g^o&g}var xe=class{constructor(o,g,c,E){ce(this,"blockLen");ce(this,"outputLen");ce(this,"canXOF",!1);ce(this,"padOffset");ce(this,"isLE");ce(this,"buffer");ce(this,"view");ce(this,"finished",!1);ce(this,"length",0);ce(this,"pos",0);ce(this,"destroyed",!1);this.blockLen=o,this.outputLen=g,this.padOffset=c,this.isLE=E,this.buffer=new Uint8Array(o),this.view=Ye(this.buffer)}update(o){gt(this),Xe(o);let{view:g,buffer:c,blockLen:E}=this,T=o.length,U=!1;for(let L=0;L<T;){let C=Math.min(E-this.pos,T-L);if(C===E){let F=Ye(o);for(;E<=T-L;L+=E)this.process(F,L);U=!0;continue}c.set(L===0&&C===T?o:o.subarray(L,L+C),this.pos),this.pos+=C,L+=C,this.pos===E&&(this.process(g,0),this.pos=0,U=!0)}return this.length+=o.length,U&&this.roundClean(),this}digestInto(o){gt(this),zt(o,this),this.finished=!0;let{buffer:g,view:c,blockLen:E,isLE:T}=this,{pos:U}=this;g[U++]=128,g.fill(0,U),this.padOffset>E-U&&(this.process(c,0),g.fill(0)),Bt(c,E-8,this.length*8,T),this.process(c,0),this.roundClean();let L=o===g?c:Ye(o),C=this.outputLen,F=C/4,M=this.get();if(C%4||F>M.length)throw new Error("invalid outputLen");for(let Y=0;Y<F;Y++)L.setUint32(4*Y,M[Y],T)}digest(){let{buffer:o,outputLen:g}=this;this.digestInto(o);let c=o.slice(0,g);return this.destroy(),c}_cloneIntoMeta(o){let{buffer:g,length:c,finished:E,destroyed:T,pos:U}=this;return o.destroyed=T,o.finished=E,o.length=c,o.pos=U,U&&o.buffer.set(g),o}clone(){return this._cloneInto()}},xt=Uint32Array.from([1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225]);var Ln=Uint32Array.from([1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298]),Ae=new Uint32Array(64),Et=class extends xe{constructor(g,c){super(64,g,8,!1);ce(this,"A",0);ce(this,"B",0);ce(this,"C",0);ce(this,"D",0);ce(this,"E",0);ce(this,"F",0);ce(this,"G",0);ce(this,"H",0);this.A=c[0]|0,this.B=c[1]|0,this.C=c[2]|0,this.D=c[3]|0,this.E=c[4]|0,this.F=c[5]|0,this.G=c[6]|0,this.H=c[7]|0}get(){let{A:g,B:c,C:E,D:T,E:U,F:L,G:C,H:F}=this;return[g,c,E,T,U,L,C,F]}set(g,c,E,T,U,L,C,F){this.A=g|0,this.B=c|0,this.C=E|0,this.D=T|0,this.E=U|0,this.F=L|0,this.G=C|0,this.H=F|0}_cloneInto(g){return(g||(g=new this.constructor)).set(...this.get()),this._cloneIntoMeta(g)}process(g,c){for(let K=0;K<16;K++,c+=4)Ae[K]=g.getUint32(c,!1);for(let K=16;K<64;K++){let P=Ae[K-15],b=Ae[K-2],q=Ee(P,7)^Ee(P,18)^P>>>3,H=Ee(b,17)^Ee(b,19)^b>>>10;Ae[K]=H+Ae[K-7]+q+Ae[K-16]|0}let{A:E,B:T,C:U,D:L,E:C,F,G:M,H:Y}=this;for(let K=0;K<64;K++){let P=Ee(C,6)^Ee(C,11)^Ee(C,25),b=Y+P+Yt(C,F,M)+Ln[K]+Ae[K]|0,H=(Ee(E,2)^Ee(E,13)^Ee(E,22))+qt(E,T,U)|0;Y=M,M=F,F=C,C=L+b|0,L=U,U=T,T=E,E=b+H|0}E=E+this.A|0,T=T+this.B|0,U=U+this.C|0,L=L+this.D|0,C=C+this.E|0,F=F+this.F|0,M=M+this.G|0,Y=Y+this.H|0,this.set(E,T,U,L,C,F,M,Y)}roundClean(){ut(Ae)}destroy(){this.destroyed=!0,this.set(0,0,0,0,0,0,0,0),ut(this.buffer)}},ht=class extends Et{constructor(){super(32,xt)}};var Ze=Wt(()=>new ht,Xt(1));function Je(s){if(typeof s!="string"||!s.length||s.length%4!==0)return!1;let o=s.length-(s.endsWith("==")?2:s.endsWith("=")?1:0);for(let g=0;g<o;g++){let c=s.charCodeAt(g);if(!(c>=65&&c<=90||c>=97&&c<=122||c>=48&&c<=57||c===43||c===47))return!1}return!0}var Ge=Object.freeze({nodes:25e3,assets:2e3,reactions:3e4,assetBytes:20*1024*1024,totalAssetBytes:80*1024*1024}),Qe=class extends Error{constructor(o){super(`Invalid DesignSpec: ${o.slice(0,5).map(g=>`${g.path}: ${g.message}`).join("; ")}`),this.name="DesignSpecError",this.issues=o}},Mn=["FRAME","TEXT","RECTANGLE","ELLIPSE","VECTOR","COMPONENT","INSTANCE"],Pn=["fills","strokes","strokeWeight","strokeAlign","dashPattern","effects","cornerRadius","opacity","clipsContent","overflowDirection","layoutPositioning","isFixed","visible","characters","fontName","fontSize","fontWeight","lineHeight","letterSpacing","textAlignHorizontal","textAutoResize","textStyleKey","componentKey","vectorPaths","overrides"],$n=["layoutMode","itemSpacing","paddingTop","paddingRight","paddingBottom","paddingLeft","primaryAxisAlignItems","counterAxisAlignItems","layoutWrap","layoutSizingHorizontal","layoutSizingVertical","constraints","isMask","maskType","textRanges","rotation","relativeTransform"],It=["GRADIENT_LINEAR","GRADIENT_RADIAL","GRADIENT_ANGULAR","GRADIENT_DIAMOND"],Zt=new Set(["__proto__","constructor","prototype"]);function je(s){let o=s?.schemaVersion==="1.1",g=[],c=(S,f)=>{g.length<100&&g.push({path:S,message:f})},E=(S,f,u)=>{if(!S||typeof S!="object"||Array.isArray(S)||![Object.prototype,null].includes(Object.getPrototypeOf(S)))return c(f,"Expected plain object"),!1;for(let m of Object.keys(S))(!u.includes(m)||Zt.has(m))&&c(`${f}.${m}`,"Unknown property");return!0},T=(S,f,u=256,m=!1)=>{(typeof S!="string"||!m&&!S.length||S.length>u||S.includes("\0"))&&c(f,`Expected ${m?"":"nonempty "}string, maximum ${u} characters`)},U=(S,f)=>{T(S,f,160),typeof S=="string"&&(!/^[A-Za-z0-9][A-Za-z0-9_.:/-]*$/.test(S)||Zt.has(S))&&c(f,"Invalid stable key")},L=(S,f,u=-1e7,m=1e7)=>{(typeof S!="number"||!Number.isFinite(S)||S<u||S>m)&&c(f,`Expected finite number in [${u}, ${m}]`)},C=(S,f,u)=>{u.includes(S)||c(f,`Expected one of ${u.join(", ")}`)},F=(S,f)=>{typeof S!="boolean"&&c(f,"Expected boolean")},M=(S,f,u)=>!Array.isArray(S)||S.length>u?(c(f,`Expected array, maximum ${u} entries`),[]):S,Y=(S,f)=>{E(S,f,["family","style"])&&(T(S.family,`${f}.family`,128),T(S.style,`${f}.style`,128))},K=(S,f,u=!1)=>{if(E(S,f,u?["r","g","b","a"]:["r","g","b"]))for(let m of u?["r","g","b","a"]:["r","g","b"])L(S[m],`${f}.${m}`,0,1)},P=(S,f,u=!1)=>{E(S,f,["unit","value"])&&(C(S.unit,`${f}.unit`,u?["PIXELS","PERCENT","AUTO"]:["PIXELS","PERCENT"]),S.unit!=="AUTO"?L(S.value,`${f}.value`,u?0:-1e4,1e5):S.value!==void 0&&L(S.value,`${f}.value`,0,1e5))};if(!E(s,"$",["schemaVersion","id","name","source","nodes","assets","textStyles","variables","reactions","flows","fontPolicy",...o?["componentSets"]:[]]))throw new Qe(g);if(C(s.schemaVersion,"$.schemaVersion",["1.0","1.1"]),U(s.id,"$.id"),T(s.name,"$.name",512),s.source!==void 0&&E(s.source,"$.source",["revision","capturedAt","adapter","url",...o?["modelRevision","sceneIds","sceneRoots","behaviorStates"]:[]])){for(let S of["revision","adapter"])s.source[S]!==void 0&&T(s.source[S],`$.source.${S}`,256);if(s.source.capturedAt!==void 0&&(T(s.source.capturedAt,"$.source.capturedAt",64),Number.isFinite(Date.parse(s.source.capturedAt))||c("$.source.capturedAt","Invalid timestamp")),s.source.url!==void 0&&(T(s.source.url,"$.source.url",2048),(typeof s.source.url!="string"||!/^https?:\/\/(?:\[[a-fA-F0-9:]+\]|[A-Za-z0-9.-]+)(?::[0-9]{1,5})?(?:\/[^\s?#\\]*)?$/.test(s.source.url))&&c("$.source.url","Only HTTP(S) source URL without credentials, query or fragment is allowed")),s.source.modelRevision!==void 0&&(T(s.source.modelRevision,"$.source.modelRevision",64),(!/^[a-f0-9]{64}$/.test(s.source.modelRevision)||s.source.modelRevision!==s.source.revision)&&c("$.source.modelRevision","Must match full revision hash")),s.source.sceneIds!==void 0){let S=M(s.source.sceneIds,"$.source.sceneIds",500);S.forEach((f,u)=>U(f,`$.source.sceneIds[${u}]`)),new Set(S).size!==S.length&&c("$.source.sceneIds","Duplicate scene id")}if(s.source.sceneRoots!==void 0&&E(s.source.sceneRoots,"$.source.sceneRoots",Object.keys(s.source.sceneRoots??{}))){Object.keys(s.source.sceneRoots).length>500&&c("$.source.sceneRoots","Scene root budget exceeded");for(let[S,f]of Object.entries(s.source.sceneRoots))U(S,"$.source.sceneRoots"),U(f,"$.source.sceneRoots");(!Array.isArray(s.source.sceneIds)||s.source.sceneIds.length!==Object.keys(s.source.sceneRoots).length||s.source.sceneIds.some(S=>!Object.hasOwn(s.source.sceneRoots,S)))&&c("$.source.sceneRoots","Scene root keys must match sceneIds")}}s.fontPolicy!==void 0&&E(s.fontPolicy,"$.fontPolicy",["allowFallback","fallback"])&&(F(s.fontPolicy.allowFallback,"$.fontPolicy.allowFallback"),s.fontPolicy.fallback!==void 0&&Y(s.fontPolicy.fallback,"$.fontPolicy.fallback"),s.fontPolicy.allowFallback&&!s.fontPolicy.fallback&&c("$.fontPolicy.fallback","Fallback font required when enabled"));let b={nodes:new Map,assets:new Map,variables:new Map,textStyles:new Map},q=(S,f)=>M(s[S]??[],`$.${S}`,f).map((u,m)=>{let R=`$.${S}[${m}]`;return u&&typeof u=="object"&&(U(u.key,`${R}.key`),b[S].has(u.key)&&c(`${R}.key`,"Duplicate key"),b[S].set(u.key,u)),[u,R]}),H=0;for(let[S,f]of q("assets",Ge.assets))if(E(S,f,["key","mimeType","dataBase64",...o?["sha256","decodedBytes"]:[]])){if(C(S.mimeType,`${f}.mimeType`,["image/png","image/jpeg","image/webp"]),o&&S.dataBase64===void 0){T(S.sha256,`${f}.sha256`,64),/^[a-f0-9]{64}$/.test(S.sha256)||c(`${f}.sha256`,"Invalid SHA-256"),L(S.decodedBytes,`${f}.decodedBytes`,1,Ge.assetBytes),Number.isInteger(S.decodedBytes)||c(`${f}.decodedBytes`,"Expected integer bytes"),H+=S.decodedBytes;continue}if(o&&(S.sha256!==void 0||S.decodedBytes!==void 0)&&c(f,"Choose inline data or staged hash reference"),T(S.dataBase64,`${f}.dataBase64`,Math.ceil(Ge.assetBytes/3)*4),typeof S.dataBase64=="string"){Je(S.dataBase64)||c(`${f}.dataBase64`,"Invalid base64"),H+=Math.floor(S.dataBase64.length*3/4);let u={"image/png":/^iVBORw0KGgo/,"image/jpeg":/^\/9j\//,"image/webp":/^UklGR/}[S.mimeType];u&&!u.test(S.dataBase64)&&c(`${f}.dataBase64`,"Image signature does not match MIME type")}}H>Ge.totalAssetBytes&&c("$.assets","Total asset byte budget exceeded");for(let[S,f]of q("variables",5e3))E(S,f,["key","name","value",...o?["type"]:[]])&&(T(S.name,`${f}.name`,256),o&&S.type!==void 0&&C(S.type,`${f}.type`,["COLOR","FLOAT"]),o&&S.type==="FLOAT"?L(S.value,`${f}.value`,-1e4,1e4):K(S.value,`${f}.value`,!0));for(let[S,f]of q("textStyles",5e3))E(S,f,["key","name","fontName","fontSize","lineHeight","letterSpacing"])&&(T(S.name,`${f}.name`,256),Y(S.fontName,`${f}.fontName`),L(S.fontSize,`${f}.fontSize`,.1,1e4),S.lineHeight!==void 0&&P(S.lineHeight,`${f}.lineHeight`,!0),S.letterSpacing!==void 0&&P(S.letterSpacing,`${f}.letterSpacing`));let Q=q("nodes",Ge.nodes);Q.length||c("$.nodes","At least one node required");for(let S of Object.values(s.source?.sceneRoots??{})){let f=b.nodes.get(S);(f?.type!=="FRAME"||f.parentKey!==null)&&c("$.source.sceneRoots","Scene viewport must be a root FRAME")}let Z=(S,f,u)=>{U(f,u),b[S].has(f)||c(u,`Unknown ${S} reference`)};if(s.source?.behaviorStates!==void 0){let S=new Set;for(let[f,u]of M(s.source.behaviorStates,"$.source.behaviorStates",1e3).entries()){let m=`$.source.behaviorStates[${f}]`;if(!E(u,m,["behaviorId","mode","nodeKeys"]))continue;U(u.behaviorId,`${m}.behaviorId`),C(u.mode,`${m}.mode`,["SIMULATED"]),S.has(u.behaviorId)&&c(m,"Duplicate behavior state"),S.add(u.behaviorId);let R=M(u.nodeKeys,`${m}.nodeKeys`,25e3);(!R.length||new Set(R).size!==R.length)&&c(m,"Expected nonempty distinct state nodes"),R.forEach((A,X)=>Z("nodes",A,`${m}.nodeKeys[${X}]`))}}let w=(S,f,u=!0)=>{for(let[m,R]of M(S,f,16).entries()){let A=`${f}[${m}]`;if(E(R,A,["type","color","opacity","variableKey","assetKey","scaleMode","gradientStops","gradientTransform",...o?["imageTransform"]:[]])){if(C(R.type,`${A}.type`,u||o?["SOLID","IMAGE",...o?It:["GRADIENT_LINEAR"]]:["SOLID"]),R.opacity!==void 0&&L(R.opacity,`${A}.opacity`,0,1),R.type==="SOLID")K(R.color,`${A}.color`),R.variableKey!==void 0&&Z("variables",R.variableKey,`${A}.variableKey`),(R.assetKey!==void 0||R.scaleMode!==void 0)&&c(A,"Image fields require IMAGE paint");else if(R.type==="IMAGE")Z("assets",R.assetKey,`${A}.assetKey`),R.scaleMode!==void 0&&C(R.scaleMode,`${A}.scaleMode`,["FILL","FIT","CROP","TILE"]),(R.color!==void 0||R.variableKey!==void 0)&&c(A,"Solid fields require SOLID paint"),R.imageTransform!==void 0&&D(R.imageTransform,`${A}.imageTransform`);else if(It.includes(R.type)){["color","variableKey","assetKey","scaleMode"].some(x=>R[x]!==void 0)&&c(A,"Solid and image fields are invalid on gradients");let X=M(R.gradientStops,`${A}.gradientStops`,16);X.length<2&&c(`${A}.gradientStops`,"Expected at least two color stops");for(let[x,ne]of X.entries()){let re=`${A}.gradientStops[${x}]`;E(ne,re,["position","color"])&&(L(ne.position,`${re}.position`,0,1),K(ne.color,`${re}.color`,!0),x&&ne.position<X[x-1]?.position&&c(`${re}.position`,"Color stops must be nondecreasing"))}let oe=M(R.gradientTransform,`${A}.gradientTransform`,2);oe.length!==2&&c(`${A}.gradientTransform`,"Expected a two by three transform");for(let[x,ne]of oe.entries()){let re=M(ne,`${A}.gradientTransform[${x}]`,3);re.length!==3&&c(`${A}.gradientTransform[${x}]`,"Expected three transform values");for(let[de,Se]of re.entries())L(Se,`${A}.gradientTransform[${x}][${de}]`,-1e4,1e4)}oe.length===2&&oe.every(x=>Array.isArray(x)&&x.length===3&&x.every(Number.isFinite))&&Math.abs(oe[0][0]*oe[1][1]-oe[0][1]*oe[1][0])<=1e-8&&c(`${A}.gradientTransform`,"Transform must be invertible")}!It.includes(R.type)&&(R.gradientStops!==void 0||R.gradientTransform!==void 0)&&c(A,"Gradient fields require gradient paint"),R.type!=="IMAGE"&&R.imageTransform!==void 0&&c(A,"imageTransform requires IMAGE")}}},D=(S,f)=>{let u=M(S,f,2);u.length!==2&&c(f,"Expected two by three transform");for(let[m,R]of u.entries()){let A=M(R,`${f}[${m}]`,3);A.length!==3&&c(f,"Expected two by three transform"),A.forEach((X,oe)=>L(X,`${f}[${m}][${oe}]`))}u.length===2&&u.every(m=>Array.isArray(m)&&m.length===3)&&Math.abs(u[0][0]*u[1][1]-u[0][1]*u[1][0])<1e-8&&c(f,"Transform must be invertible")},G=(S,f,u)=>{let m=0;for(let[R,A]of M(S,u,1e4).entries()){let X=`${u}[${R}]`;if(!E(A,X,["start","end","fontName","fontSize","lineHeight","letterSpacing","fills"]))continue;let oe=x=>Number.isInteger(x)&&x>=0&&x<=f?.length&&!(x>0&&x<f.length&&/[\uD800-\uDBFF]/.test(f[x-1])&&/[\uDC00-\uDFFF]/.test(f[x]));(A.start!==m||!oe(A.start)||!oe(A.end)||A.end<=A.start)&&c(X,"Ranges must cover UTF-16 text contiguously without splitting surrogates"),m=A.end,Y(A.fontName,`${X}.fontName`),L(A.fontSize,`${X}.fontSize`,.1,1e4),A.lineHeight!==void 0&&P(A.lineHeight,`${X}.lineHeight`,!0),A.letterSpacing!==void 0&&P(A.letterSpacing,`${X}.letterSpacing`),A.fills!==void 0&&w(A.fills,`${X}.fills`)}m!==f?.length&&c(u,"Ranges must cover all text")};for(let[S,f]of Q)if(E(S,f,["key","type","name","parentKey","x","y","width","height","props"])){C(S.type,`${f}.type`,[...Mn,...o?["COMPONENT_SET"]:[]]),S.name!==void 0&&T(S.name,`${f}.name`,512);for(let m of["x","y"])L(S[m],`${f}.${m}`);for(let m of["width","height"])L(S[m],`${f}.${m}`,.01,1e5);S.parentKey!==null?(Z("nodes",S.parentKey,`${f}.parentKey`),["FRAME","COMPONENT",...o?["COMPONENT_SET"]:[]].includes(b.nodes.get(S.parentKey)?.type)||c(`${f}.parentKey`,"Parent must be FRAME, COMPONENT or versioned COMPONENT_SET")):["FRAME","COMPONENT",...o?["INSTANCE","COMPONENT_SET"]:[]].includes(S.type)||c(f,"Root node must be FRAME or COMPONENT");let u=S.props??{};if(!E(u,`${f}.props`,[...Pn,...o?$n:[]]))continue;if(o){let m=`${f}.props`;u.layoutMode!==void 0&&(C(u.layoutMode,`${m}.layoutMode`,["NONE","HORIZONTAL","VERTICAL"]),["FRAME","COMPONENT","INSTANCE"].includes(S.type)||c(m,"Layout container required"));for(let R of["itemSpacing","paddingTop","paddingRight","paddingBottom","paddingLeft"])u[R]!==void 0&&(L(u[R],`${m}.${R}`,R==="itemSpacing"?-1e4:0,1e5),["HORIZONTAL","VERTICAL"].includes(u.layoutMode)||c(m,"Spacing requires auto layout"));u.primaryAxisAlignItems!==void 0&&C(u.primaryAxisAlignItems,`${m}.primaryAxisAlignItems`,["MIN","CENTER","MAX","SPACE_BETWEEN"]),u.counterAxisAlignItems!==void 0&&C(u.counterAxisAlignItems,`${m}.counterAxisAlignItems`,["MIN","CENTER","MAX","BASELINE"]),u.layoutWrap!==void 0&&C(u.layoutWrap,`${m}.layoutWrap`,["NO_WRAP","WRAP"]);for(let R of["layoutSizingHorizontal","layoutSizingVertical"])u[R]!==void 0&&(C(u[R],`${m}.${R}`,["FIXED","HUG","FILL"]),u[R]==="FILL"&&!["HORIZONTAL","VERTICAL"].includes(b.nodes.get(S.parentKey)?.props?.layoutMode)&&c(m,"Fill requires auto-layout parent"),u[R]==="HUG"&&S.type!=="TEXT"&&!["HORIZONTAL","VERTICAL"].includes(u.layoutMode)&&c(m,"Hug requires auto layout or text"));if(u.constraints!==void 0&&E(u.constraints,`${m}.constraints`,["horizontal","vertical"]))for(let R of["horizontal","vertical"])C(u.constraints[R],`${m}.constraints.${R}`,["MIN","CENTER","MAX","STRETCH","SCALE"]);u.isMask!==void 0&&F(u.isMask,`${m}.isMask`),u.maskType!==void 0&&C(u.maskType,`${m}.maskType`,["ALPHA","VECTOR","LUMINANCE"]),u.isMask&&!u.maskType&&c(m,"Mask requires explicit maskType"),u.rotation!==void 0&&L(u.rotation,`${m}.rotation`,-3600,3600),u.relativeTransform!==void 0&&D(u.relativeTransform,`${m}.relativeTransform`),u.textRanges!==void 0&&(S.type!=="TEXT"&&c(m,"Text ranges require TEXT"),G(u.textRanges,u.characters,`${m}.textRanges`))}for(let m of["visible","clipsContent","isFixed"])u[m]!==void 0&&F(u[m],`${f}.props.${m}`);u.clipsContent!==void 0&&!["FRAME","COMPONENT","INSTANCE"].includes(S.type)&&c(`${f}.props.clipsContent`,"Clipping requires FRAME, COMPONENT or INSTANCE"),u.cornerRadius!==void 0&&!["FRAME","COMPONENT","INSTANCE","RECTANGLE"].includes(S.type)&&c(`${f}.props.cornerRadius`,"Corner radius requires a rectangular node"),u.isFixed&&(S.parentKey===null||!["HORIZONTAL","VERTICAL","BOTH"].includes(b.nodes.get(S.parentKey)?.props?.overflowDirection))&&c(`${f}.props.isFixed`,"Fixed child requires a scrolling parent");for(let m of["strokeWeight","cornerRadius"])u[m]!==void 0&&L(u[m],`${f}.props.${m}`,0,1e5);if(u.opacity!==void 0&&L(u.opacity,`${f}.props.opacity`,0,1),u.layoutPositioning!==void 0&&C(u.layoutPositioning,`${f}.props.layoutPositioning`,["AUTO","ABSOLUTE"]),u.overflowDirection!==void 0&&(C(u.overflowDirection,`${f}.props.overflowDirection`,["NONE","HORIZONTAL","VERTICAL","BOTH"]),["FRAME","COMPONENT",...o?["INSTANCE"]:[]].includes(S.type)||c(f,"Overflow requires FRAME or COMPONENT")),u.fills!==void 0&&w(u.fills,`${f}.props.fills`),u.strokes!==void 0&&w(u.strokes,`${f}.props.strokes`,!1),u.strokeAlign!==void 0&&C(u.strokeAlign,`${f}.props.strokeAlign`,["INSIDE","OUTSIDE","CENTER"]),u.dashPattern!==void 0){let m=M(u.dashPattern,`${f}.props.dashPattern`,16);m.length||c(`${f}.props.dashPattern`,"Expected at least one dash length");for(let[R,A]of m.entries())L(A,`${f}.props.dashPattern[${R}]`,0,1e4)}if(u.effects!==void 0)for(let[m,R]of M(u.effects,`${f}.props.effects`,16).entries()){let A=`${f}.props.effects[${m}]`;E(R,A,["type","color","offset","radius","spread","visible"])&&(C(R.type,`${A}.type`,["DROP_SHADOW","INNER_SHADOW"]),K(R.color,`${A}.color`,!0),E(R.offset,`${A}.offset`,["x","y"])&&(L(R.offset.x,`${A}.offset.x`,-1e5,1e5),L(R.offset.y,`${A}.offset.y`,-1e5,1e5)),L(R.radius,`${A}.radius`,0,1e5),R.spread!==void 0&&L(R.spread,`${A}.spread`,-1e5,1e5),R.visible!==void 0&&F(R.visible,`${A}.visible`))}if(u.overrides!==void 0){S.type!=="INSTANCE"&&c(`${f}.props.overrides`,"Overrides require INSTANCE");let m=new Set;for(let[R,A]of M(u.overrides,`${f}.props.overrides`,1e3).entries()){let X=`${f}.props.overrides[${R}]`;if(!E(A,X,["sourceKey","characters","visible","fills",...o?["strokes","strokeWeight","cornerRadius","opacity","clipsContent","isMask","maskType","x","y","width","height","rotation","relativeTransform","fontName","fontSize","lineHeight","letterSpacing","textRanges"]:[]]))continue;Z("nodes",A.sourceKey,`${X}.sourceKey`),m.has(A.sourceKey)&&c(X,"Duplicate override source"),m.add(A.sourceKey);let oe=b.nodes.get(A.sourceKey),x=oe&&b.nodes.get(oe.parentKey),ne=new Set,re=!1;for(;x&&!ne.has(x.key);){if(x.key===u.componentKey){re=!0;break}ne.add(x.key),x=b.nodes.get(x.parentKey)}if(re||c(`${X}.sourceKey`,"Override source must be a descendant of the referenced component"),A.characters!==void 0&&(oe?.type!=="TEXT"&&c(`${X}.characters`,"Text override requires TEXT source"),T(A.characters,`${X}.characters`,1e5,!0)),A.visible!==void 0&&F(A.visible,`${X}.visible`),A.fills!==void 0&&w(A.fills,`${X}.fills`),o){A.strokes!==void 0&&w(A.strokes,`${X}.strokes`);for(let de of["x","y","rotation"])A[de]!==void 0&&L(A[de],`${X}.${de}`);for(let de of["width","height","strokeWeight","cornerRadius"])A[de]!==void 0&&L(A[de],`${X}.${de}`,["width","height"].includes(de)?.01:0,1e5);A.opacity!==void 0&&L(A.opacity,`${X}.opacity`,0,1);for(let de of["clipsContent","isMask"])A[de]!==void 0&&F(A[de],`${X}.${de}`);A.maskType!==void 0&&C(A.maskType,`${X}.maskType`,["ALPHA","VECTOR","LUMINANCE"]),A.relativeTransform!==void 0&&D(A.relativeTransform,`${X}.relativeTransform`);for(let de of["fontName","fontSize","lineHeight","letterSpacing","textRanges"])A[de]!==void 0&&oe?.type!=="TEXT"&&c(X,"Typography override requires TEXT");A.fontName!==void 0&&Y(A.fontName,`${X}.fontName`),A.fontSize!==void 0&&L(A.fontSize,`${X}.fontSize`,.1,1e4),A.lineHeight!==void 0&&P(A.lineHeight,`${X}.lineHeight`,!0),A.letterSpacing!==void 0&&P(A.letterSpacing,`${X}.letterSpacing`),A.textRanges!==void 0&&G(A.textRanges,A.characters??oe?.props?.characters,`${X}.textRanges`)}Object.keys(A).length<2&&c(X,"Override must change characters, visible or fills")}}for(let m of["characters","fontName","fontSize","fontWeight","lineHeight","letterSpacing","textAlignHorizontal","textAutoResize","textStyleKey"])u[m]!==void 0&&S.type!=="TEXT"&&c(`${f}.props.${m}`,"Text-only property");if(S.type==="TEXT"){if(T(u.characters,`${f}.props.characters`,1e5,!0),!u.fontName&&!u.textStyleKey&&c(f,"Text requires fontName or textStyleKey"),u.fontName!==void 0&&Y(u.fontName,`${f}.props.fontName`),u.fontSize!==void 0&&L(u.fontSize,`${f}.props.fontSize`,.1,1e4),u.fontWeight!==void 0){C(u.fontWeight,`${f}.props.fontWeight`,[100,200,300,400,500,600,700,800,900]);let m={100:"thin",200:"extralight",300:"light",400:"regular",500:"medium",600:"semibold",700:"bold",800:"extrabold",900:"black"}[u.fontWeight];((u.fontName??b.textStyles.get(u.textStyleKey)?.fontName)?.style?.toLowerCase().replace(/[ -]/g,"").replace(/italic$/,"")||"regular")!==m&&c(`${f}.props.fontWeight`,"fontWeight must match the explicit fontName.style; the font style controls Figma weight")}u.lineHeight!==void 0&&P(u.lineHeight,`${f}.props.lineHeight`,!0),u.letterSpacing!==void 0&&P(u.letterSpacing,`${f}.props.letterSpacing`),u.textAlignHorizontal!==void 0&&C(u.textAlignHorizontal,`${f}.props.textAlignHorizontal`,["LEFT","CENTER","RIGHT","JUSTIFIED"]),u.textAutoResize!==void 0&&C(u.textAutoResize,`${f}.props.textAutoResize`,["NONE","HEIGHT","WIDTH_AND_HEIGHT"]),u.textStyleKey!==void 0&&Z("textStyles",u.textStyleKey,`${f}.props.textStyleKey`)}if(S.type==="INSTANCE"?(Z("nodes",u.componentKey,`${f}.props.componentKey`),b.nodes.get(u.componentKey)?.type!=="COMPONENT"&&c(f,"Instance must reference COMPONENT")):u.componentKey!==void 0&&c(f,"componentKey requires INSTANCE"),u.vectorPaths!==void 0){S.type!=="VECTOR"&&c(f,"vectorPaths requires VECTOR");for(let[m,R]of M(u.vectorPaths,`${f}.props.vectorPaths`,1e3).entries()){let A=`${f}.props.vectorPaths[${m}]`;E(R,A,["windingRule","data"])&&(C(R.windingRule,`${A}.windingRule`,["NONZERO","EVENODD"]),T(R.data,`${A}.data`,2e5),typeof R.data=="string"&&(!/^[Mm]/.test(R.data.trim())||!/^[MmZzLlHhVvCcSsQqTtAaEe0-9+.,\s-]+$/.test(R.data))&&c(A,"Only SVG path command data allowed"))}}}let z=new Map,J=new Map;if(o)for(let[S,f]of M(s.componentSets??[],"$.componentSets",2e3).entries()){let u=`$.componentSets[${S}]`;if(!E(f,u,["key","memberKeys"]))continue;Z("nodes",f.key,`${u}.key`);let m=b.nodes.get(f.key);(m?.type!=="COMPONENT_SET"||z.has(f.key))&&c(u,"Expected unique COMPONENT_SET node"),z.set(f.key,f);let R=M(f.memberKeys,`${u}.memberKeys`,5e3),A=new Set;R.length||c(u,"Component set must not be empty");for(let[x,ne]of R.entries()){Z("nodes",ne,`${u}.memberKeys[${x}]`);let re=b.nodes.get(ne);(re?.type!=="COMPONENT"||re.parentKey!==f.key||J.has(ne))&&c(u,"Members must be unique direct COMPONENT children"),(typeof re?.name!="string"||!/^State=[^,=]+$/.test(re.name)||A.has(re.name))&&c(u,"Expected distinct explicit State variant names"),A.add(re?.name),J.set(ne,f.key)}let X=m&&b.nodes.get(m.parentKey),oe=new Set;for(;X&&!oe.has(X.key);)oe.add(X.key),["COMPONENT","COMPONENT_SET","INSTANCE"].includes(X.type)&&c(u,"Component set cannot be nested in components or instances"),X=b.nodes.get(X.parentKey)}if(o)for(let[S,f]of Q)S.type==="COMPONENT_SET"&&!z.has(S.key)&&c(f,"COMPONENT_SET requires componentSets grouping record"),b.nodes.get(S.parentKey)?.type==="COMPONENT_SET"&&(S.type!=="COMPONENT"||J.get(S.key)!==S.parentKey)&&c(f,"Component set must contain exactly its declared COMPONENT members");if(!g.length)try{et(s)}catch(S){c("$.nodes",S.message)}let te=new Set;for(let[S,f]of M(s.reactions??[],"$.reactions",Ge.reactions).entries()){let u=`$.reactions[${S}]`;if(E(f,u,["sourceKey","destinationKey","trigger",...o?["navigation"]:[]])){if(Z("nodes",f.sourceKey,`${u}.sourceKey`),Z("nodes",f.destinationKey,`${u}.destinationKey`),f.navigation!==void 0&&C(f.navigation,`${u}.navigation`,["NAVIGATE","CHANGE_TO"]),f.navigation==="CHANGE_TO"){let m=b.nodes.get(f.sourceKey),R,A=new Set;for(;m&&!A.has(m.key);){if(A.add(m.key),m.type==="INSTANCE"){R=m.props?.componentKey;break}if(m.type==="COMPONENT"){R=m.key;break}m=b.nodes.get(m.parentKey)}(!J.has(R)||J.get(f.destinationKey)!==J.get(R))&&c(u,"CHANGE_TO requires a source and target in the same declared component set")}else(b.nodes.get(f.destinationKey)?.type!=="FRAME"||b.nodes.get(f.destinationKey)?.parentKey!==null)&&c(u,"Destination must be a root FRAME");if(E(f.trigger,`${u}.trigger`,["type","delaySeconds",...o?["timeoutMs","delayMs"]:[]])){C(f.trigger.type,`${u}.trigger.type`,["ON_CLICK","AFTER_TIMEOUT",...o?["ON_HOVER","MOUSE_ENTER","MOUSE_LEAVE"]:[]]),f.trigger.type==="AFTER_TIMEOUT"?f.trigger.timeoutMs!==void 0?(L(f.trigger.timeoutMs,`${u}.trigger.timeoutMs`,0,36e5),f.trigger.delaySeconds!==void 0&&c(u,"Choose explicit milliseconds or legacy seconds")):L(f.trigger.delaySeconds,`${u}.trigger.delaySeconds`,.001,3600):(f.trigger.delaySeconds!==void 0||f.trigger.timeoutMs!==void 0)&&c(u,"Timeout fields only apply to AFTER_TIMEOUT"),["MOUSE_ENTER","MOUSE_LEAVE"].includes(f.trigger.type)?L(f.trigger.delayMs,`${u}.trigger.delayMs`,0,36e5):f.trigger.delayMs!==void 0&&c(u,"delayMs only applies to enter or leave");let m=`${f.sourceKey}:${f.trigger.type}`;te.has(m)&&c(u,"Duplicate source and trigger"),te.add(m)}}}let j=new Set;for(let[S,f]of M(s.flows??[],"$.flows",1e3).entries()){let u=`$.flows[${S}]`;E(f,u,["nodeKey","name"])&&(Z("nodes",f.nodeKey,`${u}.nodeKey`),T(f.name,`${u}.name`,256),(b.nodes.get(f.nodeKey)?.parentKey!==null||b.nodes.get(f.nodeKey)?.type!=="FRAME")&&c(u,"Flow start must be a root FRAME"),j.has(f.nodeKey)&&c(u,"Duplicate flow start"),j.add(f.nodeKey))}if(g.length)throw new Qe(g);return s}function et(s){let o=new Map(s.nodes.map(P=>[P.key,P])),g=new Map,c=new Map,E=new Map((s.componentSets??[]).map(P=>[P.key,P])),T=new Map((s.componentSets??[]).flatMap(P=>P.memberKeys.map(b=>[b,P.key]))),U=new Map(s.nodes.filter(P=>P.type==="COMPONENT").map(P=>[P.key,new Set]));for(let P of s.nodes.filter(b=>b.type==="INSTANCE")){let b=new Set,q=o.get(P.parentKey);for(;q;){if(b.has(q.key))throw new Error("Cyclic parent/component dependency");b.add(q.key),q.type==="COMPONENT"&&U.get(q.key).add(P.props?.componentKey),q=o.get(q.parentKey)}}let L=new Set,C=new Set;function F(P){if(!L.has(P)){if(C.has(P))throw new Error("Cyclic component instance dependency");C.add(P);for(let b of U.get(P)??[])F(b);C.delete(P),L.add(P)}}for(let P of U.keys())F(P);let M=new Map;for(let P of s.nodes){let b=o.get(P.parentKey),q=new Set;for(;b;){if(q.has(b.key))throw new Error("Cyclic parent/component dependency");q.add(b.key),b.type==="COMPONENT"&&(M.has(b.key)||M.set(b.key,[]),M.get(b.key).push(P.key)),b=o.get(b.parentKey)}}for(let P of s.nodes){let b=T.get(P.key),q=T.get(P.props?.componentKey),H=Z=>(E.get(Z)?.memberKeys??[]).flatMap(w=>[w,...M.get(w)??[]]),Q=[...new Set([b?o.get(b)?.parentKey:P.parentKey,...q?[q]:[P.props?.componentKey,...M.get(P.props?.componentKey)??[]],...E.has(P.key)?H(P.key):[]].filter(Boolean))];g.set(P.key,Q.length);for(let Z of Q){if(!o.has(Z))throw new Error(`Unknown dependency ${Z}`);c.has(Z)||c.set(Z,[]),c.get(Z).push(P.key)}}let Y=s.nodes.filter(P=>g.get(P.key)===0),K=[];for(let P=0;P<Y.length;P++){let b=Y[P];K.push(b);for(let q of c.get(b.key)??[])g.set(q,g.get(q)-1),g.get(q)===0&&Y.push(o.get(q))}if(K.length!==s.nodes.length)throw new Error("Cyclic parent/component dependency");return K}var St=/[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y,Jt={M:2,L:2,H:1,V:1,C:6,S:4,Q:4,T:2,A:7},fe=()=>{throw new Error("DESIGN_VECTOR_PATH_INVALID")};function Gn(s,o,g,c,E,T,U,L,C){if(s===L&&o===C)return[];if(g=Math.abs(g),c=Math.abs(c),g===0||c===0)return[["L",L,C]];let F=E%360*Math.PI/180,M=Math.cos(F),Y=Math.sin(F),K=(s-L)/2,P=(o-C)/2,b=M*K+Y*P,q=-Y*K+M*P,H=b/g,Q=q/c,Z=Math.hypot(H,Q);(!Number.isFinite(Z)||Z===0)&&fe(),Z>1&&(g*=Z,c*=Z,H=b/g,Q=q/c);let w=H*H+Q*Q;(!Number.isFinite(g)||!Number.isFinite(c)||!Number.isFinite(w)||w===0)&&fe();let D=(T===U?-1:1)*Math.sqrt(Math.max(0,(1-w)/w)),G=D*g*Q,z=-D*c*H,J=M*G-Y*z+(s+L)/2,te=Y*G+M*z+(o+C)/2,j=[(b-G)/g,(q-z)/c],S=[(-b-G)/g,(-q-z)/c],f=Math.atan2(j[1],j[0]),u=Math.atan2(j[0]*S[1]-j[1]*S[0],j[0]*S[0]+j[1]*S[1]);(!Number.isFinite(f)||!Number.isFinite(u))&&fe(),!U&&u>0&&(u-=Math.PI*2),U&&u<0&&(u+=Math.PI*2);let m=Math.max(1,Math.ceil(Math.abs(u)/(Math.PI/4))),R=u/m,A=x=>[J+g*M*Math.cos(x)-c*Y*Math.sin(x),te+g*Y*Math.cos(x)+c*M*Math.sin(x)],X=x=>[-g*M*Math.sin(x)-c*Y*Math.cos(x),-g*Y*Math.sin(x)+c*M*Math.cos(x)],oe=[];for(let x=0;x<m;x++){let ne=f+R,re=4/3*Math.tan(R/4),de=x===0?[s,o]:A(f),Se=x===m-1?[L,C]:A(ne),Ke=X(f),be=X(ne);oe.push(["C",de[0]+re*Ke[0],de[1]+re*Ke[1],Se[0]-re*be[0],Se[1]-re*be[1],...Se]),f=ne}return oe}function en(s){(typeof s!="string"||s.length===0||s.length>2e5)&&fe();let o=0,g,c,E=0,T=0,U=0,L=0,C,F,M=[],Y=()=>{for(;/\s/.test(s[o]??"")&&o<s.length;)o++},K=(P,b=!1)=>{if(Y(),s[o]===","&&(P||fe(),o++,Y()),b){let Q=s[o++];return Q!=="0"&&Q!=="1"&&fe(),Number(Q)}St.lastIndex=o;let q=St.exec(s);q||fe(),o=St.lastIndex;let H=Number(q[0]);return Number.isFinite(H)||fe(),H};for(;Y(),o!==s.length;){let P=!1;/[a-z]/i.test(s[o])&&(g=s[o++],P=!0),g||fe();let b=g.toUpperCase(),q=g!==b;if(!M.length&&b!=="M"&&fe(),b==="Z"){P||fe(),M.push(["Z"]),E=U,T=L,C=F=void 0,c=b,g=void 0;continue}Jt[b]||fe();let H=Array.from({length:Jt[b]},(z,J)=>K(J>0||!P,b==="A"&&(J===3||J===4))),Q=z=>z+(q?E:0),Z=z=>z+(q?T:0),w,D,G;if(b==="M"||b==="L")w=[[b,Q(H[0]),Z(H[1])]],b==="M"&&(U=w[0][1],L=w[0][2],g=q?"l":"L");else if(b==="H")w=[["L",Q(H[0]),T]];else if(b==="V")w=[["L",E,Z(H[0])]];else if(b==="C"||b==="S"){let z=b==="C"?[Q(H[0]),Z(H[1]),Q(H[2]),Z(H[3]),Q(H[4]),Z(H[5])]:[c==="C"||c==="S"?2*E-C[0]:E,c==="C"||c==="S"?2*T-C[1]:T,Q(H[0]),Z(H[1]),Q(H[2]),Z(H[3])];w=[["C",...z]],D=z.slice(2,4)}else if(b==="Q"||b==="T"){let z=b==="Q"?Q(H[0]):c==="Q"||c==="T"?2*E-F[0]:E,J=b==="Q"?Z(H[1]):c==="Q"||c==="T"?2*T-F[1]:T,te=Q(H.at(-2)),j=Z(H.at(-1));w=[["C",E+2/3*(z-E),T+2/3*(J-T),te+2/3*(z-te),j+2/3*(J-j),te,j]],G=[z,J]}else w=Gn(E,T,...H.slice(0,5),Q(H[5]),Z(H[6]));if(w.length){let z=w.at(-1);E=z.at(-2),T=z.at(-1),M.push(...w)}C=D,F=G,c=b}return(!M.length||M.some(P=>P.slice(1).some(b=>!Number.isFinite(b))))&&fe(),M}function Qt(s,o,g,c){let E=-s+3*o-3*g+c,T=2*(s-2*o+g),U=o-s;if([E,T,U].every(Number.isFinite)||fe(),E===0)return T===0?[]:[-U/T];let L=T*T-4*E*U;if(Number.isFinite(L)||fe(),L<0)return[];let C=-.5*(T+(T<0?-1:1)*Math.sqrt(L));return C===0?[-T/(2*E)]:[C/E,U/C]}function Kn(s){let o=1/0,g=1/0,c=-1/0,E=-1/0,T=!1,U=(F,M)=>{(!Number.isFinite(F)||!Number.isFinite(M))&&fe(),o=Math.min(o,F),g=Math.min(g,M),c=Math.max(c,F),E=Math.max(E,M)};for(let F of s){let M=0,Y=0,K=0,P=0;for(let b of F){let[q,...H]=b;if(q==="Z"){M=K,Y=P;continue}if(q==="C"){T=!0;let Q=(w,D,G,z,J)=>(1-J)**3*w+3*(1-J)**2*J*D+3*(1-J)*J**2*G+J**3*z,Z=[...Qt(M,H[0],H[2],H[4]),...Qt(Y,H[1],H[3],H[5])];for(let w of Z)w>0&&w<1&&U(Q(M,H[0],H[2],H[4],w),Q(Y,H[1],H[3],H[5],w))}else q==="L"&&(T=!0);M=H.at(-2),Y=H.at(-1),U(M,Y),q==="M"&&(K=M,P=Y)}}let L=c-o,C=E-g;return(!T||![o,g,L,C].every(Number.isFinite)||L<=0||C<=0)&&fe(),{left:o,top:g,width:L,height:C}}function Nt(s,o){let g=s.map(c=>en(c.data));if(o!==void 0){(!Number.isFinite(o?.width)||!Number.isFinite(o?.height)||o.width<.01||o.height<.01)&&fe();let c=Kn(g),E=o.width/c.width,T=o.height/c.height;(!Number.isFinite(E)||!Number.isFinite(T)||E<=0||T<=0)&&fe();for(let U of g)for(let L of U)for(let C=1;C<L.length;C++)L[C]=(L[C]-(C%2?c.left:c.top))*(C%2?E:T),Number.isFinite(L[C])||fe()}return s.map((c,E)=>({...c,data:g[E].map(T=>T.join(" ")).join(" ")}))}function jt(s){let o=[],g,c;for(let E of en(s)){if(E[0]==="M"&&(g=E[1],c=E[2]),E[0]==="Z"){let T=o.at(-1);T?.[0]==="L"&&T[1]===g&&T[2]===c&&o.pop()}o.push(E)}return o}function tn(s,o,g=.001){if(!Array.isArray(s)||s.length!==o.length)return!1;try{return o.every((c,E)=>{if(c.windingRule!==s[E].windingRule)return!1;let T=jt(s[E].data),U=jt(c.data);return T.length===U.length&&U.every((L,C)=>L.length===T[C].length&&L.every((F,M)=>M===0?F===T[C][M]:Math.abs(F-T[C][M])<=g))})}catch{return!1}}var Te=Object.freeze({chunkBytes:1024*1024,requestBytes:7*1024*1024,assetBytes:20*1024*1024,totalAssetBytes:80*1024*1024,assets:2e3,chunksPerAsset:4096,chunks:1e4});var ie=(s,o)=>{if(!s)throw new Error(o)},nt=/^[a-f0-9]{64}$/,vn=/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,159}$/,Tt=s=>Array.isArray(s)?`[${s.map(Tt).join(",")}]`:s&&typeof s=="object"?`{${Object.keys(s).sort().map(o=>`${JSON.stringify(o)}:${Tt(s[o])}`).join(",")}}`:JSON.stringify(s),tt=(s,o)=>s&&typeof s=="object"&&!Array.isArray(s)&&[Object.prototype,null].includes(Object.getPrototypeOf(s))&&Object.keys(s).length===o.length&&o.every(g=>Object.hasOwn(s,g));function Fn(s){let o=new Uint8Array(s.length*3),g=0;for(let c of s){let E=c.codePointAt(0);E>=55296&&E<=57343&&(E=65533),E<128?o[g++]=E:E<2048?(o[g++]=192|E>>6,o[g++]=128|E&63):E<65536?(o[g++]=224|E>>12,o[g++]=128|E>>6&63,o[g++]=128|E&63):(o[g++]=240|E>>18,o[g++]=128|E>>12&63,o[g++]=128|E>>6&63,o[g++]=128|E&63)}return o.subarray(0,g)}function sn(s){return s.length*3/4-(s.endsWith("==")?2:s.endsWith("=")?1:0)}function Un(s){ie(typeof s=="string"&&s.length<=Math.ceil(Te.chunkBytes/3)*4&&Je(s),"DESIGN_ASSET_CHUNK_INVALID");let o=sn(s);ie(o>0&&o<=Te.chunkBytes,"DESIGN_ASSET_CHUNK_BUDGET");let g=new Uint8Array(o),c="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",E=0;for(let T=0;T<s.length;T+=4){let U=c.indexOf(s[T])<<18|c.indexOf(s[T+1])<<12|Math.max(0,c.indexOf(s[T+2]))<<6|Math.max(0,c.indexOf(s[T+3]));g[E++]=U>>16&255,E<o&&(g[E++]=U>>8&255),E<o&&(g[E++]=U&255)}return g}function Bn(s){ie(Array.isArray(s)&&s.length<=Te.assets,"DESIGN_ASSET_MANIFEST_INVALID");let o=new Map,g=0;for(let c of s){if(typeof c?.dataBase64=="string"){g+=sn(c.dataBase64);continue}ie(tt(c,["key","mimeType","sha256","decodedBytes"])&&vn.test(c.key)&&!["constructor","prototype","__proto__"].includes(c.key)&&["image/png","image/jpeg","image/webp"].includes(c.mimeType)&&nt.test(c.sha256)&&Number.isSafeInteger(c.decodedBytes)&&c.decodedBytes>0&&c.decodedBytes<=Te.assetBytes&&!o.has(c.key),"DESIGN_ASSET_MANIFEST_INVALID"),o.set(c.key,c),g+=c.decodedBytes}return ie(g<=Te.totalAssetBytes,"DESIGN_ASSET_TOTAL_BUDGET"),o}function Hn(s){let o=g=>typeof g=="string"&&g.length>0&&g.length<=512;ie(tt(s,["specSignature","runId","scope","ownership"])&&nt.test(s.specSignature)&&typeof s.runId=="string"&&/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(s.runId)&&tt(s.scope,["fileIdentity","pageId","rootNodeId"])&&/^figma-file:[A-Za-z0-9_-]+$/.test(s.scope.fileIdentity)&&/^\d+:\d+$/.test(s.scope.pageId)&&/^\d+:\d+$/.test(s.scope.rootNodeId)&&tt(s.ownership,["workspaceId","taskId","revision"])&&Object.values(s.ownership).every(o),"DESIGN_ASSET_BINDING_INVALID")}function nn(s,o){return o==="image/png"?s.length>=8&&[137,80,78,71,13,10,26,10].every((g,c)=>s[c]===g):o==="image/jpeg"?s.length>=3&&s[0]===255&&s[1]===216&&s[2]===255:s.length>=12&&String.fromCharCode(...s.subarray(0,4))==="RIFF"&&String.fromCharCode(...s.subarray(8,12))==="WEBP"}function on(s){for(let w of["sha256Bytes","createImage","readImageBytes","readLedger","writeLedger","verifyContext"])ie(typeof s?.[w]=="function","DESIGN_ASSET_HOOK_REQUIRED");let o=new Map,g=new Map,c=0,E=0,T=!1,U=w=>{let D=s.sha256Bytes(w);return ie(typeof D=="string"&&nt.test(D),"DESIGN_ASSET_HASH_HOOK_INVALID"),D};async function L(w,D){Hn(w?.binding);let G=Bn(w.assets),z=U(Fn(Tt(w.binding)));return await s.verifyContext(w.binding,{mutation:D}),{request:w,binding:w.binding,assets:G,bindingHash:z,mutation:D}}let C=w=>s.verifyContext(w.binding,{mutation:w.mutation}),F=(w,D)=>`${w.bindingHash}:${D.sha256}`;function M(w){let D=o.get(w);D&&(o.delete(w),c-=D.decodedBytes,E-=D.parts.size)}async function Y(w,D){await C(w);let G=await s.readLedger(w.binding,D);return await C(w),G?(ie(["PENDING","COMMITTED"].includes(G.status)&&G.bindingHash===w.bindingHash&&G.sha256===D.sha256&&G.decodedBytes===D.decodedBytes&&G.mimeType===D.mimeType,"DESIGN_ASSET_LEDGER_CONFLICT"),G):null}async function K(w,D,G){if(typeof G!="string"||!G.length||G.length>256)return!1;await C(w);let z=await s.readImageBytes(G);return await C(w),z instanceof Uint8Array&&z.byteLength===D.decodedBytes&&nn(z,D.mimeType)&&U(z)===D.sha256}function P(w,D){let G=o.get(F(w,D));if(!G)return{receivedBytes:0,missingRanges:[{offset:0,bytes:D.decodedBytes}],missingRangeCount:1};let z=[...G.parts].sort((S,f)=>S[0]-f[0]),J=0,te=0,j=[];for(let[S,f]of z)J<S&&(te++,j.length<16&&j.push({offset:J,bytes:S-J})),J=S+f.bytes.length;return J<D.decodedBytes&&(te++,j.length<16&&j.push({offset:J,bytes:D.decodedBytes-J})),{receivedBytes:G.received,missingRanges:j,missingRangeCount:te}}async function b(w,D){let G=await Y(w,D);if(G?.status==="COMMITTED")return{key:D.key,status:await K(w,D,G.imageHash)?"COMMITTED":"OUTCOME_UNKNOWN",receivedBytes:D.decodedBytes,imageHash:G.imageHash};if(G?.status==="PENDING")return{key:D.key,status:"OUTCOME_UNKNOWN",receivedBytes:P(w,D).receivedBytes};let z=P(w,D);return{key:D.key,status:z.receivedBytes===D.decodedBytes?"STAGED":z.receivedBytes?"INCOMPLETE":"NOT_STAGED",...z}}async function q(w){let D=await L(w,!1),G=[];for(let z of D.assets.values())G.push(await b(D,z));return{status:G.every(z=>z.status==="COMMITTED")?"READY":"INCOMPLETE",writes:0,bindingHash:D.bindingHash,assets:G}}async function H(w){let D=await L(w,!0),G=D.assets.get(w.assetKey);ie(G,"DESIGN_ASSET_REFERENCE_INVALID");let z=Un(w.dataBase64);ie(Number.isSafeInteger(w.offset)&&w.offset>=0&&w.offset+z.length<=G.decodedBytes,"DESIGN_ASSET_OFFSET_INVALID"),ie(nt.test(w.chunkSha256)&&U(z)===w.chunkSha256,"DESIGN_ASSET_CHUNK_HASH_MISMATCH");let J=await Y(D,G);if(J)return ie(J.status==="COMMITTED"&&await K(D,G,J.imageHash),"DESIGN_ASSET_OUTCOME_UNKNOWN"),{status:"COMMITTED",writes:0,receivedBytes:G.decodedBytes,idempotent:!0};let te=F(D,G),j=o.get(te);j||(ie(o.size<Te.assets&&c+G.decodedBytes<=Te.totalAssetBytes,"DESIGN_ASSET_MEMORY_BUDGET"),j={parts:new Map,received:0,decodedBytes:G.decodedBytes,mimeType:G.mimeType},o.set(te,j),c+=G.decodedBytes),ie(j.decodedBytes===G.decodedBytes&&j.mimeType===G.mimeType,"DESIGN_ASSET_CONTENT_CONFLICT");let S=j.parts.get(w.offset);if(S)return ie(S.hash===w.chunkSha256&&S.bytes.length===z.length,"DESIGN_ASSET_CHUNK_CONFLICT"),{status:j.received===G.decodedBytes?"STAGED":"INCOMPLETE",writes:0,receivedBytes:j.received,idempotent:!0};for(let[f,u]of j.parts)ie(w.offset+z.length<=f||w.offset>=f+u.bytes.length,"DESIGN_ASSET_CHUNK_OVERLAP");return ie(j.parts.size<Te.chunksPerAsset&&E<Te.chunks,"DESIGN_ASSET_CHUNK_COUNT_BUDGET"),await C(D),j.parts.set(w.offset,{bytes:z,hash:w.chunkSha256}),j.received+=z.length,E++,{status:j.received===G.decodedBytes?"STAGED":"INCOMPLETE",writes:0,receivedBytes:j.received,idempotent:!1}}async function Q(w){let D=await L(w,!0),G=D.assets.get(w.assetKey);ie(G,"DESIGN_ASSET_REFERENCE_INVALID");let z=F(D,G),J=await Y(D,G);if(J?.status==="COMMITTED")return ie(await K(D,G,J.imageHash),"DESIGN_ASSET_OUTCOME_UNKNOWN"),{status:"COMMITTED",writes:0,imageHash:J.imageHash,idempotent:!0};let te=g.get(z);if(J?.status==="PENDING"){ie(te&&await K(D,G,te),"DESIGN_ASSET_OUTCOME_UNKNOWN"),await C(D);try{await s.writeLedger(D.binding,G,{...J,status:"COMMITTED",imageHash:te}),await C(D)}catch{throw new Error("DESIGN_ASSET_OUTCOME_UNKNOWN")}return M(z),{status:"COMMITTED",writes:1,imageHash:te,idempotent:!0,reconciled:!0}}let j=o.get(z),S=te&&await K(D,G,te);ie(!te||S,"DESIGN_ASSET_OUTCOME_UNKNOWN");let f;if(!S){ie(j&&j.received===G.decodedBytes,"DESIGN_ASSET_INCOMPLETE"),f=new Uint8Array(G.decodedBytes);for(let[m,R]of j.parts)f.set(R.bytes,m);ie(U(f)===G.sha256,"DESIGN_ASSET_HASH_MISMATCH"),ie(nn(f,G.mimeType),"DESIGN_ASSET_MIME_MISMATCH")}ie(g.size<Te.assets||g.has(z),"DESIGN_ASSET_MEMORY_BUDGET");let u={status:"PENDING",sha256:G.sha256,decodedBytes:G.decodedBytes,mimeType:G.mimeType,bindingHash:D.bindingHash};await C(D);try{await s.writeLedger(D.binding,G,u),await C(D);let m=te;return S||(await C(D),m=(await s.createImage(f))?.hash,typeof m=="string"&&m.length<=256&&g.set(z,m),await C(D),ie(await K(D,G,m),"DESIGN_ASSET_NATIVE_READBACK_FAILED")),await C(D),await s.writeLedger(D.binding,G,{...u,status:"COMMITTED",imageHash:m}),await C(D),M(z),{status:"COMMITTED",writes:3,imageHash:m,idempotent:!!te}}catch{throw new Error("DESIGN_ASSET_OUTCOME_UNKNOWN")}}let Z=w=>async D=>{ie(!T,"DESIGN_ASSET_BUSY"),T=!0;try{return await w(D)}finally{T=!1}};return{plan:Z(q),stage:Z(H),commit:Z(Q)}}var me="bridge-design-v1-",_e=`${me}spec`,he=`${me}digest`,Ce=`${me}intent`,ke=`${me}state`,st=`${me}source`,Ot={NONE:"NONE",HORIZONTAL:"HORIZONTAL",VERTICAL:"VERTICAL",BOTH:"BOTH"},Vn=Object.fromEntries(Object.entries(Ot).map(([s,o])=>[o,s])),ee=s=>JSON.parse(JSON.stringify(s));function He(s){let o=new Uint8Array(s.length*3),g=0;for(let c of s){let E=c.codePointAt(0);E>=55296&&E<=57343&&(E=65533),E<128?o[g++]=E:E<2048?(o[g++]=192|E>>6,o[g++]=128|E&63):E<65536?(o[g++]=224|E>>12,o[g++]=128|E>>6&63,o[g++]=128|E&63):(o[g++]=240|E>>18,o[g++]=128|E>>12&63,o[g++]=128|E>>6&63,o[g++]=128|E&63)}return o.subarray(0,g)}function $(s){return Array.isArray(s)?`[${s.map($).join(",")}]`:s&&typeof s=="object"?`{${Object.keys(s).filter(o=>s[o]!==void 0).sort().map(o=>`${JSON.stringify(o)}:${$(s[o])}`).join(",")}}`:JSON.stringify(s)}var V=s=>qe(Ze(He($(s)))),l=(s,o)=>{if(!s)throw new Error(o)},ge=(s,o)=>{let g=s.getPluginData(o);return g?JSON.parse(g):null},pe=s=>typeof s=="symbol"||s===void 0?null:ee(s),ue=s=>`${s.family}\0${s.style}`,_t=s=>s?.unit==="AUTO"?{unit:"AUTO"}:ee(s),mt=["layoutMode","itemSpacing","paddingTop","paddingRight","paddingBottom","paddingLeft","primaryAxisAlignItems","counterAxisAlignItems","layoutWrap","layoutSizingHorizontal","layoutSizingVertical","constraints","isMask","maskType","rotation","relativeTransform"],Be=["fontName","fontSize","lineHeight","letterSpacing","fills"];function Ie(s,o){return typeof o=="number"?typeof s=="number"&&Number.isFinite(s)&&Math.abs(s-o)<=.001:Array.isArray(o)?Array.isArray(s)&&s.length===o.length&&o.every((g,c)=>Ie(s[c],g)):o&&typeof o=="object"?s&&typeof s=="object"&&Object.keys(o).every(g=>Ie(s[g],o[g])):s===o}function rn(s){let o="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",g=new Uint8Array(s.length*3/4-(s.endsWith("==")?2:s.endsWith("=")?1:0)),c=0;for(let E=0;E<s.length;E+=4){let T=o.indexOf(s[E])<<18|o.indexOf(s[E+1])<<12|Math.max(0,o.indexOf(s[E+2]))<<6|Math.max(0,o.indexOf(s[E+3]));c<g.length&&(g[c++]=T>>>16&255),c<g.length&&(g[c++]=T>>>8&255),c<g.length&&(g[c++]=T&255)}return g}function zn(s){let o="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",g="";for(let c=0;c<s.length;c+=3){let E=s[c]<<16|(s[c+1]??0)<<8|(s[c+2]??0);g+=o[E>>>18&63]+o[E>>>12&63]+(c+1<s.length?o[E>>>6&63]:"=")+(c+2<s.length?o[E&63]:"=")}return g}function Wn(s,o){let g=!1,c,E=()=>o.onMutation?.(),T=(e,t,n)=>{E(),e.setPluginData(t,typeof n=="string"?n:JSON.stringify(n))},U=on({sha256Bytes:e=>qe(Ze(e)),createImage:e=>(E(),s.createImage(e)),readImageBytes:async e=>await s.getImageByHash?.(e)?.getBytesAsync?.(),readLedger:(e,t)=>K(c,"asset-transfer",t.key),writeLedger:(e,t,n)=>T(c.scope.root,M(c,"asset-transfer",t.key),n),verifyContext:async(e,{mutation:t})=>{let n=c;l(n&&e.specSignature===n.signature&&e.runId===n.payload.runId,"DESIGN_ASSET_CONTEXT_CHANGED");let i=await o.resolveScope(n.message.trustedScope);l(i.root===n.scope.root&&i.page===n.scope.page,"DESIGN_ASSET_SCOPE_CHANGED"),o.assertTrustedOwnership(n.ownership,n.message.operationId),o.assertInScope(n.scope.root,n.scope),t&&n.scope.root.type!=="PAGE"&&o.assertTaskOwned(n.scope.root,n.ownership)}}),L=e=>({binding:{specSignature:e.signature,runId:e.payload.runId,scope:{fileIdentity:e.message.trustedScope.fileIdentity,pageId:e.message.trustedScope.pageId,rootNodeId:e.message.trustedScope.rootNodeId},ownership:{workspaceId:e.ownership.workspaceId,taskId:e.ownership.taskId,revision:e.ownership.revision}},assets:e.spec.assets??[]});async function C(e){let t=await o.resolveScope(e.trustedScope);o.assertTrustedOwnership(e.trustedOwnership,e.operationId);let n=e.payload??{};l(typeof n.runId=="string"&&/^[A-Za-z0-9._:-]{1,160}$/.test(n.runId),"DESIGN_RUN_ID_REQUIRED");let i=je(n.spec),r=e.trustedOwnership,a=V({workspace:r.workspaceId,task:r.taskId,spec:i.id}).slice(0,24),N=`${me}${a}-ledger`,y=V(i),p=n.timerUnit??"milliseconds";l(["seconds","milliseconds"].includes(p),"DESIGN_TIMER_UNIT_INVALID");let _=ge(t.root,N);_&&(l(_.specSignature===y,"DESIGN_SPEC_REVISION_CONFLICT: use a new spec id for a changed specification"),l(_.timerUnit===p,"DESIGN_TIMER_UNIT_CONFLICT"));let d={message:e,scope:t,payload:n,spec:i,ownership:r,ns:a,ledgerKey:N,signature:y,timerUnit:p,state:_??{version:1,specSignature:y,timerUnit:p,cursor:0,pending:null,complete:!1},existing:!!_,map:new Map,idToKey:new Map,fonts:new Map,substitutions:[],styles:new Map,variables:new Map,images:new Map,resourceKeys:{styles:new Map,variables:new Map,images:new Map},preparedComponents:new Set};d.order=et(i),d.definitions=new Map(d.order.map(O=>[O.key,O])),d.componentSets=new Map((i.componentSets??[]).map(O=>[O.key,O])),d.memberSets=new Map((i.componentSets??[]).flatMap(O=>O.memberKeys.map(k=>[k,O.key]))),d.children=new Map,d.reactionDefs=new Map;for(let O of i.nodes)d.children.has(O.parentKey)||d.children.set(O.parentKey,[]),d.children.get(O.parentKey).push(O);for(let O of i.reactions??[])d.reactionDefs.has(O.sourceKey)||d.reactionDefs.set(O.sourceKey,[]),d.reactionDefs.get(O.sourceKey).push(O);let h=new Map,I=!1;for(let O=0;O<d.order.length;O+=16){let k=d.order.slice(O,O+16).map(B=>({def:B,record:null})),v=await Promise.allSettled(k.map(async B=>(B.record=ge(t.root,`${me}${a}-n-${V(B.def.key).slice(0,24)}`),B.record?await s.getNodeByIdAsync(B.record.id):null)));for(let B=0;B<k.length;B++){let{def:W,record:se}=k[B],ae=v[B];if(ae.status==="rejected")throw ae.reason;if(!se)continue;let le=ae.value;if(!le||le.getPluginData(_e)!==a||le.getPluginData(o.specNodeKey)!==W.key){if(!I){let ft=[...t.root.children??[]];for(let pt=0;pt<ft.length;pt++){let $e=ft[pt];if($e.getPluginData(_e)===a){let lt=$e.getPluginData(o.specNodeKey);h.has(lt)||h.set(lt,[]),h.get(lt).push($e)}"children"in $e&&$e.type!=="INSTANCE"&&ft.push(...$e.children)}I=!0}let ze=h.get(W.key)??[];l(ze.length===1,`DESIGN_MAPPING_AMBIGUOUS:${W.key}`),le=ze[0]}l(le&&!le.removed,`DESIGN_NODE_MISSING:${W.key}`),o.assertInScope(le,t),o.assertTaskOwned(le,r),l(le.getPluginData(_e)===a&&le.getPluginData(o.specNodeKey)===W.key,`DESIGN_KEY_OWNERSHIP_CONFLICT:${W.key}`),l(le.type===W.type,`DESIGN_NODE_TYPE_CONFLICT:${W.key}`),d.map.set(W.key,le),d.idToKey.set(le.id,W.key),W.type==="INSTANCE"&&l((await le.getMainComponentAsync())?.id===d.map.get(W.props.componentKey)?.id,`DESIGN_INSTANCE_COMPONENT_CONFLICT:${W.key}`)}}return d}let F=e=>{o.assertInScope(e.scope.root,e.scope),T(e.scope.root,e.ledgerKey,e.state)},M=(e,t,n)=>`${me}${e.ns}-${t}-${V(n).slice(0,24)}`,Y=(e,t,n)=>`${me}${e.ns}:${t}:${n}`,K=(e,t,n)=>ge(e.scope.root,M(e,t,n));function P(e,t,n,i){e[t].set(n,i);let r=t==="images"?i:i.id;e.resourceKeys[t].has(r)||e.resourceKeys[t].set(r,n)}function b(e,t=!1,n=!1){let i={type:e.type,name:e.name,parentKey:e.parent?.getPluginData?.(o.specNodeKey)??""};for(let r of["x","y","width","height","visible","opacity","fills","strokes","strokeWeight","cornerRadius","clipsContent","overflowDirection","numberOfFixedChildren","layoutPositioning","characters","fontName","fontSize","lineHeight","letterSpacing","textAlignHorizontal","textAutoResize","vectorPaths","effects","strokeAlign","dashPattern"])r in e&&(i[r]=pe(e[r]));if("textStyleId"in e&&(i.textStyleId=e.textStyleId),n&&e.type==="COMPONENT_SET"&&(i.memberKeys=e.children.map(r=>r.getPluginData(o.specNodeKey)??"")),n&&(t||e.type==="INSTANCE")&&(i.inheritedReactions=ne(e)),n){for(let r of mt)r in e&&(i[r]=pe(e[r]));e.type==="TEXT"&&(l(typeof e.getStyledTextSegments=="function","DESIGN_TEXT_RANGE_READ_UNSUPPORTED"),i.textRanges=pe(e.getStyledTextSegments(Be))),i.layoutDriven={position:["HORIZONTAL","VERTICAL"].includes(e.parent?.layoutMode)&&e.layoutPositioning!=="ABSOLUTE",width:["HUG","FILL"].includes(e.layoutSizingHorizontal),height:["HUG","FILL"].includes(e.layoutSizingVertical)}}return t&&(i.sourceKey=e.getPluginData(st)),(e.type==="INSTANCE"||t)&&"children"in e&&(i.instanceChildren=e.children.map(r=>b(r,!0,n))),i}function q(e,t){let n={...t};t.layoutDriven&&(t.layoutDriven.position&&(n.x=0,n.y=0,n.relativeTransform&&(n.relativeTransform=ee(n.relativeTransform),n.relativeTransform[0][2]=0,n.relativeTransform[1][2]=0)),t.layoutDriven.width&&(n.width=0),t.layoutDriven.height&&(n.height=0));for(let i of["fills","strokes"])Array.isArray(n[i])&&(n[i]=n[i].map(r=>{let a=ee(r);return a.boundVariables?.color?.id&&(a.boundVariables.color.id=e.resourceKeys.variables.get(a.boundVariables.color.id)??"UNKNOWN"),a.imageHash&&(a.imageHash=e.resourceKeys.images.get(a.imageHash)??"UNKNOWN"),a}));return"textStyleId"in t&&(n.textStyleKey=t.textStyleId?e.resourceKeys.styles.get(t.textStyleId)??"UNKNOWN":null,delete n.textStyleId),t.textRanges&&(n.textRanges=t.textRanges.map(i=>({...i,...Array.isArray(i.fills)?{fills:q(e,{fills:i.fills}).fills}:{}}))),t.instanceChildren&&(n.instanceChildren=t.instanceChildren.map(i=>q(e,i))),t.inheritedReactions&&(n.inheritedReactions=de(e,{reactions:t.inheritedReactions})),n}let H=(e,t,n=!1)=>q(e,b(t,n,e.spec.schemaVersion==="1.1"));function Q(e,t,n,i){o.assertInScope(n,e.scope),o.assertTaskOwned(n,e.ownership),l(n.getPluginData(Ce)===V(t),`DESIGN_INTENT_CONFLICT:${t.key}`);let r=n.getPluginData(he),a=b(n,!1,e.spec.schemaVersion==="1.1"),N=i&&Object.hasOwn(a,"inheritedReactions")?{...a,inheritedReactions:i.inheritedReactions}:a;if(r&&l(r===V(q(e,N)),`DESIGN_USER_EDIT_CONFLICT:${t.key}`),"children"in n&&n.type!=="INSTANCE")for(let y of n.children)o.assertTaskOwned(y,e.ownership),l(y.getPluginData(_e)===e.ns,`DESIGN_FOREIGN_CHILD:${t.key}`);return a}function Z(e){o.assertInScope(e.scope.root,e.scope);for(let t of e.order)if(e.map.has(t.key)){let n=e.map.get(t.key),i=Q(e,t,n);D(e,t,n,i)}}function w(e,t){let n=e.memberSets.get(t.key);if(!n||e.map.has(n))return t;let i=e.definitions.get(n),r={...t,x:t.x+i.x,y:t.y+i.y};return t.props?.relativeTransform&&(r.props={...t.props,relativeTransform:ee(t.props.relativeTransform)},r.props.relativeTransform[0][2]+=i.x,r.props.relativeTransform[1][2]+=i.y),r}function D(e,t,n,i){let r=w(e,t),a=i??n,N=r.props??{},y={name:r.name??r.key,x:r.x,y:r.y};(r.type!=="TEXT"||!N.textAutoResize||N.textAutoResize==="NONE")&&Object.assign(y,{width:r.width,height:r.height});for(let p of["strokeWeight","strokeAlign","dashPattern","cornerRadius","opacity","visible","clipsContent","characters","fontSize","lineHeight","letterSpacing","textAlignHorizontal","textAutoResize"])N[p]!==void 0&&(y[p]=N[p]);if(N.vectorPaths&&(y.vectorPaths=Nt(N.vectorPaths,{width:r.width,height:r.height})),N.overflowDirection&&(y.overflowDirection=Ot[N.overflowDirection]),N.effects&&(y.effects=N.effects.map(p=>({...p,blendMode:"NORMAL",visible:p.visible??!0,spread:p.spread??0}))),N.fills&&(y.fills=m(e,N.fills)),N.strokes&&(y.strokes=m(e,N.strokes)),e.spec.schemaVersion==="1.1"){for(let p of mt)N[p]!==void 0&&(y[p]=N[p]);["HORIZONTAL","VERTICAL"].includes(n.parent?.layoutMode)&&N.layoutPositioning!=="ABSOLUTE"&&(delete y.x,delete y.y,y.relativeTransform&&(y.relativeTransform=ee(y.relativeTransform),y.relativeTransform[0][2]=a.relativeTransform?.[0]?.[2],y.relativeTransform[1][2]=a.relativeTransform?.[1]?.[2])),["HUG","FILL"].includes(N.layoutSizingHorizontal)&&delete y.width,["HUG","FILL"].includes(N.layoutSizingVertical)&&delete y.height}if(r.type==="TEXT"){let p=N.fontName??e.spec.textStyles.find(_=>_.key===N.textStyleKey).fontName;if(y.fontName=e.fonts.get(ue(p)),N.textStyleKey&&(y.textStyleId=e.styles.get(N.textStyleKey)?.id),N.textRanges){for(let _ of Be)N.textRanges.some(d=>d[_]!==void 0)&&delete y[_];A(e,n,N.textRanges,r.key)}}for(let[p,_]of Object.entries(y)){if(p==="vectorPaths"?tn(a[p],_):Ie(a[p],_))continue;let h=new Error(`DESIGN_PROPERTY_READBACK_MISMATCH:${r.key}:${p}`);if(p==="fills"||p==="strokes"){let I={nodeKey:r.key,field:p,expected:pe(_),actual:pe(a[p])};h.readbackMismatch=JSON.stringify(I).length<=8192?I:{nodeKey:r.key,field:p,status:"NOT_VERIFIED_BUDGET_EXCEEDED",budgetCharacters:8192}}throw h}if(r.type==="INSTANCE"&&N.overrides?.length){let p=[...i?i.instanceChildren??[]:n.children],_=new Map;for(let d=0;d<p.length;d++){let h=p[d];_.set(i?h.sourceKey:h.getPluginData(st),h);let I=i?h.instanceChildren:h.children;I&&p.push(...I)}for(let d of N.overrides){let h=_.get(d.sourceKey);l(h,`DESIGN_OVERRIDE_SOURCE_MISSING:${d.sourceKey}`);for(let I of Object.keys(d).filter(O=>!["sourceKey","textRanges"].includes(O)&&!d.textRanges?.some(k=>k[O]!==void 0)))d[I]!==void 0&&l(Ie(h[I],["fills","strokes"].includes(I)?m(e,d[I]):I==="fontName"?e.fonts.get(ue(d.fontName)):d[I]),`DESIGN_OVERRIDE_READBACK_MISMATCH:${r.key}:${d.sourceKey}:${I}`);if(d.textRanges){let I=[...n.children],O;for(let k=0;k<I.length;k++)I[k].getPluginData(st)===d.sourceKey&&(O=I[k]),I[k].children&&I.push(...I[k].children);l(O,`DESIGN_OVERRIDE_SOURCE_MISSING:${d.sourceKey}`),A(e,O,d.textRanges,r.key)}}}}async function G(e,t){let n=[...(e.spec.textStyles??[]).map(r=>r.fontName),...e.spec.nodes.filter(r=>r.type==="TEXT"&&r.props.fontName).map(r=>r.props.fontName),...e.spec.nodes.flatMap(r=>[...r.props?.textRanges??[],...(r.props?.overrides??[]).flatMap(a=>[a.fontName?{fontName:a.fontName}:null,...a.textRanges??[]].filter(Boolean))].map(a=>a.fontName))],i=typeof s.listAvailableFontsAsync=="function"?new Set((await s.listAvailableFontsAsync()).map(r=>ue(r.fontName))):null;for(let r of n){let a=ue(r);if(e.fonts.has(a))continue;let N=r;if(i&&!i.has(a)&&(l(e.spec.fontPolicy?.allowFallback,`DESIGN_FONT_MISSING:${r.family}/${r.style}`),N=e.spec.fontPolicy.fallback,l(i.has(ue(N)),`DESIGN_FALLBACK_FONT_MISSING:${N.family}/${N.style}`)),t)try{await s.loadFontAsync(N)}catch(y){if(N!==r||!e.spec.fontPolicy?.allowFallback)throw y;N=e.spec.fontPolicy.fallback,await s.loadFontAsync(N)}e.fonts.set(a,ee(N)),ue(N)!==a&&e.substitutions.push({requested:ee(r),used:ee(N)})}}async function z(e){let t;(e.spec.assets??[]).some(i=>!i.dataBase64)&&(c=e,t=new Map((await U.plan(L(e))).assets.map(i=>[i.key,i])));for(let i of e.spec.assets??[]){let r=K(e,"image",i.key);if(!i.dataBase64){let a=K(e,"asset-transfer",i.key);!r&&a?.status==="COMMITTED"&&(r={hash:a.imageHash,signature:V(i)}),r&&(l(a?.status==="COMMITTED"&&a.sha256===i.sha256&&a.imageHash===r.hash&&a.decodedBytes===i.decodedBytes,`DESIGN_ASSET_CONFLICT:${i.key}`),l(t.get(i.key)?.status==="COMMITTED"&&t.get(i.key)?.imageHash===r.hash,`DESIGN_ASSET_READBACK_MISMATCH:${i.key}`))}r&&(l(r.signature===V(i),`DESIGN_ASSET_CONFLICT:${i.key}`),P(e,"images",i.key,r.hash))}for(let i of e.spec.textStyles??[]){let r=K(e,"style",i.key);if(!r)continue;let a=await s.getStyleByIdAsync(r.id);if(!a||a.description!==Y(e,"style",i.key)){let N=(await s.getLocalTextStylesAsync()).filter(y=>y.description===Y(e,"style",i.key));l(N.length===1,`DESIGN_STYLE_MAPPING_AMBIGUOUS:${i.key}`),a=N[0]}l(a&&a.type==="TEXT"&&a.description===Y(e,"style",i.key),`DESIGN_STYLE_OWNERSHIP_CONFLICT:${i.key}`),l(r.digest===V(J(a)),`DESIGN_STYLE_USER_EDIT_CONFLICT:${i.key}`),P(e,"styles",i.key,a)}let n=K(e,"collection","colors");if(n){let i=await s.variables.getVariableCollectionByIdAsync(n.id);if(!i||i.name!==n.name){let r=(await s.variables.getLocalVariableCollectionsAsync()).filter(a=>a.name===n.name);l(r.length===1,"DESIGN_COLLECTION_MAPPING_AMBIGUOUS"),i=r[0]}l(i.name===`Bridge/${e.ns}/Colors`,"DESIGN_COLLECTION_OWNERSHIP_CONFLICT"),n.digest&&l(n.digest===V(j(i)),"DESIGN_COLLECTION_USER_EDIT_CONFLICT"),e.collection=i}for(let i of e.spec.variables??[]){let r=K(e,"variable",i.key);if(!r)continue;let a=await s.variables.getVariableByIdAsync(r.id);if(!a||a.description!==Y(e,"variable",i.key)){let N=(await s.variables.getLocalVariablesAsync(i.type??"COLOR")).filter(y=>y.description===Y(e,"variable",i.key));l(N.length===1,`DESIGN_VARIABLE_MAPPING_AMBIGUOUS:${i.key}`),a=N[0]}l(a&&a.description===Y(e,"variable",i.key),`DESIGN_VARIABLE_OWNERSHIP_CONFLICT:${i.key}`),l(e.collection&&a.variableCollectionId===e.collection.id,`DESIGN_VARIABLE_COLLECTION_CONFLICT:${i.key}`),l(r.digest===V(te(a)),`DESIGN_VARIABLE_USER_EDIT_CONFLICT:${i.key}`),P(e,"variables",i.key,a)}}let J=e=>({name:e.name,fontName:pe(e.fontName),fontSize:e.fontSize,lineHeight:pe(e.lineHeight),letterSpacing:pe(e.letterSpacing)}),te=e=>({name:e.name,resolvedType:e.resolvedType,values:Object.values(e.valuesByMode).map(pe)}),j=e=>({name:e.name,modes:(e.modes??[]).map(t=>t.name),defaultMode:(e.modes??[]).findIndex(t=>t.modeId===e.defaultModeId)});function S(e,t,n){l(!e.state.pending,"DESIGN_NEEDS_RECONCILIATION"),e.state.pending={kind:t,key:n,startedAt:new Date().toISOString(),operationId:e.message.operationId},F(e)}function f(e){e.state.pending=null,F(e)}async function u(e){(e.spec.textStyles?.length??0)+(e.spec.variables?.length??0)&&l(e.payload.allowGlobalResources===!0,"DESIGN_GLOBAL_RESOURCES_AUTH_REQUIRED");for(let n of e.spec.assets??[]){if(e.images.has(n.key))continue;l(typeof n.dataBase64=="string",`DESIGN_ASSET_NOT_STAGED:${n.key}`),S(e,"image",n.key),E();let i=s.createImage(rn(n.dataBase64));P(e,"images",n.key,i.hash),T(e.scope.root,M(e,"image",n.key),{hash:i.hash,signature:V(n)}),f(e)}for(let n of e.spec.textStyles??[]){if(e.styles.has(n.key))continue;S(e,"style",n.key),E();let i=s.createTextStyle();e.state.pending.id=i.id,F(e),i.description=Y(e,"style",n.key),i.name=`Bridge/${e.ns}/${n.name}`,i.fontName=ee(e.fonts.get(ue(n.fontName))),i.fontSize=n.fontSize,n.lineHeight&&(i.lineHeight=_t(n.lineHeight)),n.letterSpacing&&(i.letterSpacing=ee(n.letterSpacing)),l(Ie(i,{name:`Bridge/${e.ns}/${n.name}`,fontName:e.fonts.get(ue(n.fontName)),fontSize:n.fontSize,...n.lineHeight?{lineHeight:_t(n.lineHeight)}:{},...n.letterSpacing?{letterSpacing:n.letterSpacing}:{}}),`DESIGN_STYLE_READBACK_MISMATCH:${n.key}`),T(e.scope.root,M(e,"style",n.key),{id:i.id,digest:V(J(i))}),P(e,"styles",n.key,i),f(e)}if(e.spec.variables?.length){let n=K(e,"collection","colors"),i=e.collection;n?l(i&&i.name===`Bridge/${e.ns}/Colors`,"DESIGN_COLLECTION_OWNERSHIP_CONFLICT"):(S(e,"collection","colors"),E(),i=s.variables.createVariableCollection(`Bridge/${e.ns}/Colors`),e.state.pending.id=i.id,F(e),n={id:i.id,name:i.name,digest:V(j(i))},e.collection=i,T(e.scope.root,M(e,"collection","colors"),n),f(e));for(let r of e.spec.variables){if(e.variables.has(r.key))continue;S(e,"variable",r.key),E();let a=s.variables.createVariable(`Bridge/${e.ns}/${r.name}`,i,r.type??"COLOR");e.state.pending.id=a.id,F(e),a.description=Y(e,"variable",r.key),a.setValueForMode(i.defaultModeId,ee(r.value)),l(Ie(a.valuesByMode[i.defaultModeId],r.value),`DESIGN_VARIABLE_READBACK_MISMATCH:${r.key}`),T(e.scope.root,M(e,"variable",r.key),{id:a.id,digest:V(te(a))}),P(e,"variables",r.key,a),f(e)}}}function m(e,t){return t.map(n=>{if(n.type==="IMAGE")return{type:"IMAGE",imageHash:e.images.get(n.assetKey),scaleMode:n.scaleMode??"FILL",...n.imageTransform?{imageTransform:ee(n.imageTransform)}:{},...n.opacity===void 0?{}:{opacity:n.opacity}};if(n.type.startsWith("GRADIENT_"))return{type:n.type,gradientTransform:ee(n.gradientTransform),gradientStops:ee(n.gradientStops),...n.opacity===void 0?{}:{opacity:n.opacity}};let i={type:"SOLID",color:ee(n.color),...n.opacity===void 0?{}:{opacity:n.opacity}};return n.variableKey&&(i=s.variables.setBoundVariableForPaint(i,"color",e.variables.get(n.variableKey))),i})}function R(e,t,n){for(let i of n)for(let r of Be)if(i[r]!==void 0){let a=`setRange${r[0].toUpperCase()}${r.slice(1)}`;l(typeof t[a]=="function",`DESIGN_PROPERTY_UNSUPPORTED:${t.name}:${a}`),r==="fills"&&X(e,i.fills);let N=r==="fontName"?ee(e.fonts.get(ue(i.fontName))):r==="fills"?m(e,i.fills):ee(i[r]),y=`getRange${r[0].toUpperCase()}${r.slice(1)}`;if(l(typeof t[y]=="function",`DESIGN_PROPERTY_UNSUPPORTED:${t.name}:${y}`),Ie(t[y](i.start,i.end),N))continue;E(),t[a](i.start,i.end,N)}}function A(e,t,n,i){for(let r of n)for(let a of Be)if(r[a]!==void 0){let N=`getRange${a[0].toUpperCase()}${a.slice(1)}`;l(typeof t[N]=="function",`DESIGN_PROPERTY_UNSUPPORTED:${i}:${N}`);let y=a==="fontName"?e.fonts.get(ue(r.fontName)):a==="fills"?m(e,r.fills):r[a];l(Ie(t[N](r.start,r.end),y),`DESIGN_TEXT_RANGE_READBACK_MISMATCH:${i}:${r.start}:${a}`)}}function X(e,t){let n=new Set;for(let i of t){if(i.type!=="IMAGE"||n.has(i.assetKey))continue;n.add(i.assetKey);let r=e.spec.assets.find(y=>y.key===i.assetKey),a=K(e,"image",i.assetKey);if(l(r&&a&&a.signature===V(r),`DESIGN_ASSET_CONFLICT:${i.assetKey}`),l(a.hash===e.images.get(i.assetKey),`DESIGN_IMAGE_HASH_CHANGED:${i.assetKey}`),l(typeof s.getImageByHash=="function","DESIGN_IMAGE_API_UNAVAILABLE"),s.getImageByHash(a.hash))continue;l(typeof r.dataBase64=="string",`DESIGN_ASSET_NOT_STAGED:${i.assetKey}`),E();let N=s.createImage(rn(r.dataBase64));l(N?.hash===a.hash,`DESIGN_IMAGE_HASH_CHANGED:${i.assetKey}`),l(s.getImageByHash(a.hash),`DESIGN_IMAGE_HANDLE_UNAVAILABLE:${i.assetKey}`)}}async function oe(e,t){if(t.type==="INSTANCE"&&!e.preparedComponents.has(t.props.componentKey)){let I=e.componentSets.get(e.memberSets.get(t.props.componentKey)),O=(I?.memberKeys??[t.props.componentKey]).map(k=>e.definitions.get(k));for(let k=0;k<O.length;k++)O.push(...e.children.get(O[k].key)??[]);for(let k of O.reverse())kt(e,k),I&&await wt(e,k,e.map.get(k.key));I&&Z(e);for(let k of I?.memberKeys??[t.props.componentKey])e.preparedComponents.add(k)}let n=w(e,t),i=e.memberSets.get(t.key),r=i&&!e.map.has(i)?e.definitions.get(i).parentKey:t.parentKey,a=r?e.map.get(r):e.scope.root;l(a&&["PAGE","FRAME","COMPONENT","COMPONENT_SET"].includes(a.type),"DESIGN_PARENT_INVALID"),o.assertInScope(a,e.scope),a!==e.scope.root&&o.assertTaskOwned(a,e.ownership);let N=e.componentSets.get(t.key),y=N?.memberKeys.map(I=>e.map.get(I)),p=new Map;if(N){l(typeof s.combineAsVariants=="function"&&y.every(I=>I?.type==="COMPONENT"&&I.parent===a),"DESIGN_COMPONENT_SET_COMBINE_UNSUPPORTED");for(let I of y){let O=e.definitions.get(I.getPluginData(o.specNodeKey)),k=Q(e,O,I);D(e,O,I,k),p.set(I.id,k)}}S(e,"node",t.key);let _={FRAME:"createFrame",COMPONENT:"createComponent",TEXT:"createText",RECTANGLE:"createRectangle",ELLIPSE:"createEllipse",VECTOR:"createVector"};E();let d=N?s.combineAsVariants(y,a):t.type==="INSTANCE"?e.map.get(t.props.componentKey).createInstance():s[_[t.type]]();if(e.state.pending.id=d.id,F(e),o.markTaskOwned(d,"design-node",e.ownership,e.message.operationId),T(d,o.specNodeKey,t.key),T(d,_e,e.ns),T(d,Ce,V(t)),T(d,ke,"creating"),!N)a.appendChild(d);else{l(d.type==="COMPONENT_SET"&&d.parent===a&&$(d.children.map(I=>I.id))===$(y.map(I=>I.id)),"DESIGN_COMPONENT_SET_READBACK_MISMATCH");for(let I of y){let O=p.get(I.id),k=b(I,!1,!0);l(Ie(I.x+d.x,O.x)&&Ie(I.y+d.y,O.y),"DESIGN_COMPONENT_SET_REPARENT_CONFLICT");let v={...k,parentKey:O.parentKey,x:O.x,y:O.y};v.relativeTransform&&O.relativeTransform&&(v.relativeTransform[0][2]=O.relativeTransform[0][2],v.relativeTransform[1][2]=O.relativeTransform[1][2]),l($(v)===$(O),"DESIGN_COMPONENT_SET_MEMBER_CONFLICT")}}let h=n.props??{};if(d.name=t.name??t.key,t.type==="TEXT"){let I=h.fontName??e.spec.textStyles.find(O=>O.key===h.textStyleKey).fontName;d.fontName=ee(e.fonts.get(ue(I))),h.fontSize!==void 0&&(d.fontSize=h.fontSize),d.characters=h.characters,d.textAutoResize="NONE",h.lineHeight&&(d.lineHeight=_t(h.lineHeight)),h.letterSpacing&&(d.letterSpacing=ee(h.letterSpacing)),h.textAlignHorizontal&&(d.textAlignHorizontal=h.textAlignHorizontal),h.textStyleKey&&(await d.setTextStyleIdAsync(e.styles.get(h.textStyleKey).id),o.assertInScope(d,e.scope),o.assertTaskOwned(d,e.ownership),l(d.parent===a,`DESIGN_NEW_NODE_PARENT_CONFLICT:${t.key}`),o.assertInScope(a,e.scope),a!==e.scope.root&&o.assertTaskOwned(a,e.ownership))}h.vectorPaths&&(d.vectorPaths=Nt(h.vectorPaths,{width:t.width,height:t.height})),h.fills?(X(e,h.fills),d.fills=m(e,h.fills)):["FRAME","COMPONENT","RECTANGLE","ELLIPSE","VECTOR"].includes(t.type)&&(d.fills=[]),h.strokes&&(X(e,h.strokes),d.strokes=m(e,h.strokes)),h.dashPattern&&(l("dashPattern"in d,`DESIGN_PROPERTY_UNSUPPORTED:${t.key}:dashPattern`),d.dashPattern=ee(h.dashPattern));for(let I of["strokeWeight","strokeAlign","cornerRadius","opacity","visible","clipsContent"])h[I]!==void 0&&(l(I in d,`DESIGN_PROPERTY_UNSUPPORTED:${t.key}:${I}`),d[I]=h[I]);if(h.effects&&(d.effects=h.effects.map(I=>({...ee(I),blendMode:"NORMAL",visible:I.visible??!0,spread:I.spread??0}))),h.overflowDirection!==void 0&&(d.overflowDirection=Ot[h.overflowDirection]),h.layoutPositioning!==void 0&&a.layoutMode&&a.layoutMode!=="NONE"&&(d.layoutPositioning=h.layoutPositioning),typeof d.resizeWithoutConstraints=="function"?d.resizeWithoutConstraints(n.width,n.height):d.resize(n.width,n.height),d.x=n.x,d.y=n.y,e.spec.schemaVersion==="1.1"){for(let I of mt)h[I]!==void 0&&(l(I in d,`DESIGN_PROPERTY_UNSUPPORTED:${t.key}:${I}`),E(),d[I]=ee(h[I]));h.textRanges&&R(e,d,h.textRanges)}if(t.type==="TEXT"&&h.textAutoResize&&h.textAutoResize!=="NONE"&&(d.textAutoResize=h.textAutoResize),t.type==="INSTANCE"){let I=e.map.get(h.componentKey),O=d.children.map((v,B)=>({child:v,source:I.children[B]})),k=new Map;l(d.children.length===I.children.length,"DESIGN_INSTANCE_STRUCTURE_MISMATCH");for(let v=0;v<O.length;v++){let B=O[v];l(B.source&&B.child.type===B.source.type,"DESIGN_INSTANCE_STRUCTURE_MISMATCH");let W=B.source.getPluginData(o.specNodeKey);o.markTaskOwned(B.child,"design-instance-child",e.ownership,e.message.operationId),T(B.child,o.specNodeKey,`${t.key}/inherited/${v}`),T(B.child,st,W),k.set(W,B.child),"children"in B.child&&(l(B.child.children.length===B.source.children.length,"DESIGN_INSTANCE_STRUCTURE_MISMATCH"),O.push(...B.child.children.map((se,ae)=>({child:se,source:B.source.children[ae]}))))}for(let v of h.overrides??[]){let B=k.get(v.sourceKey);if(l(B,`DESIGN_OVERRIDE_SOURCE_MISSING:${v.sourceKey}`),v.characters!==void 0&&(l(B.type==="TEXT","DESIGN_OVERRIDE_TEXT_REQUIRED"),E(),B.characters=v.characters),v.visible!==void 0&&(E(),B.visible=v.visible),v.fills!==void 0&&(X(e,v.fills),E(),B.fills=m(e,v.fills)),e.spec.schemaVersion==="1.1"){for(let W of Object.keys(v).filter(se=>!["sourceKey","characters","visible","fills","textRanges","width","height"].includes(se)))l(W in B,`DESIGN_PROPERTY_UNSUPPORTED:${t.key}:${W}`),W==="strokes"&&X(e,v.strokes),E(),B[W]=W==="strokes"?m(e,v.strokes):ee(W==="fontName"?e.fonts.get(ue(v.fontName)):v[W]);(v.width!==void 0||v.height!==void 0)&&(E(),B.resizeWithoutConstraints(v.width??B.width,v.height??B.height)),v.textRanges&&R(e,B,v.textRanges)}}}if(e.map.set(t.key,d),e.idToKey.set(d.id,t.key),N)for(let I of y){let O=e.definitions.get(I.getPluginData(o.specNodeKey));E(),I.x=O.x,I.y=O.y,O.props?.relativeTransform&&(E(),I.relativeTransform=ee(O.props.relativeTransform)),D(e,O,I),T(I,he,V(H(e,I)))}D(e,t,d),T(d,he,V(H(e,d))),T(d,ke,"complete"),T(e.scope.root,M(e,"n",t.key),{id:d.id}),e.state.cursor+=1,f(e)}function x(e,t){let n=t.type==="INSTANCE"&&e.memberSets.has(t.props.componentKey);return(e.reactionDefs.get(t.key)??(n?e.reactionDefs.get(t.props.componentKey):null)??[]).map(r=>({trigger:r.trigger.type==="AFTER_TIMEOUT"?{type:"AFTER_TIMEOUT",timeout:r.trigger.timeoutMs??r.trigger.delaySeconds*(e.timerUnit==="milliseconds"?1e3:1)}:["MOUSE_ENTER","MOUSE_LEAVE"].includes(r.trigger.type)?{type:r.trigger.type,delay:r.trigger.delayMs,deprecatedVersion:!1}:{type:r.trigger.type},actions:[{type:"NODE",destinationId:e.map.get(r.destinationKey)?.id??"MISSING",navigation:r.navigation??"NAVIGATE",transition:null}]}))}let ne=e=>(e.reactions??[]).map(t=>({trigger:pe(t.trigger),actions:(t.actions??(t.action?[t.action]:[])).map(n=>n.type==="NODE"?{type:"NODE",destinationId:n.destinationId,navigation:n.navigation,transition:pe(n.transition)}:pe(n))})),re=(e,t)=>t.map(n=>e.idToKey.get(n.id)??"FOREIGN"),de=(e,t)=>ne(t).map(n=>({...n,actions:n.actions.map(i=>{if(i.type!=="NODE")return i;let{destinationId:r,...a}=i;return{...a,destinationKey:e.idToKey.get(r)??"UNKNOWN"}})})),Se=(e,t)=>t.map(n=>({name:n.name,nodeKey:e.idToKey.get(n.nodeId)??"UNKNOWN"})),Ke=(e,t)=>e.order.find(n=>K(e,"n",n.key)?.id===t)?.key??"UNKNOWN",be=(e,t)=>t.keys??t.ids.map(n=>Ke(e,n)),At=(e,t)=>t.version===2?t.flows:t.flows.map(n=>({name:n.name,nodeKey:Ke(e,n.nodeId)}));function ye(e,t,n={version:2}){return n.version===2?V(de(e,t)):V(ne(t).map(i=>({...i,actions:i.actions.map(r=>{if(r.type!=="NODE")return r;let a=e.idToKey.get(r.destinationId);return{...r,destinationId:a?K(e,"n",a)?.id??r.destinationId:r.destinationId}})})))}function ve(e,t){let n=t;for(;n.parent&&n.parent!==e.scope.page;)n=n.parent;return n.parent===e.scope.page&&n.type==="FRAME"&&e.idToKey.has(n.id)?n:null}function Fe(e,t){return t.map(n=>({name:n.name,nodeKey:e.idToKey.get(n.nodeId)??null,...e.idToKey.has(n.nodeId)?{}:{nodeId:n.nodeId}}))}function Re(e,t){return l(Array.isArray(t)&&t.length<=1e3,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),t.map(n=>{if(l(n&&typeof n.name=="string"&&n.name.length<=256,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),n.nodeKey!==null){let i=e.map.get(n.nodeKey);return l(i?.type==="FRAME"&&i.parent===e.scope.page,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),o.assertTaskOwned(i,e.ownership),{name:n.name,nodeKey:n.nodeKey}}return l(typeof n.nodeId=="string"&&n.nodeId.length<=200,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),{name:n.name,nodeKey:null,nodeId:n.nodeId}})}function Ct(e,t,n){let i=new Set(e.map(y=>y.name)),r=1;for(;i.has(`Flow ${r}`);)r+=1;let a=t[t.length-1],N=a&&!i.has(a.name)&&(a.name===`Flow ${e.length+1}`||a.name===`Flow ${r}`);return t.length===e.length+1&&$(t.slice(0,-1))===$(e)&&N&&a.nodeKey===n&&!e.some(y=>y.nodeKey===n)}function bt(e){let t=e.state.nativeFlowObservation;return t?(l(t.version===1||t.version===2&&Array.isArray(t.entries)&&t.entries.length>0&&t.entries.length<=1e3,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),t.version===1?[t]:t.entries):[]}function Rt(e){let t=null;for(let n of bt(e)){let i=e.map.get(n.sourceKey),r=e.definitions.get(n.sourceKey);l(i&&r,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT");let a=Q(e,r,i);D(e,r,i,a);let N=ve(e,i),y=K(e,"reactions",n.sourceKey);l(N&&e.idToKey.get(N.id)===n.topLevelKey&&y?.digest===n.reactionDigest&&ye(e,i,y)===n.reactionDigest,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),o.assertTaskOwned(N,e.ownership);let p=Re(e,n.before),_=Re(e,n.after);if(l(Ct(p,_,n.topLevelKey)&&(t===null||$(t)===$(p)),"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),n.version===1)l(t===null&&p.length===0&&_.length===1,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT");else if(n.provenance==="NATIVE_SETTER_READBACK"){let d=n.reactionReadback;l(n.version===2&&d?.version===1&&d.sourceKey===n.sourceKey&&d.topLevelKey===n.topLevelKey&&d.digest===n.reactionDigest&&d.operationId===n.operationId&&d.observedAt===n.observedAt,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT")}else{let d=n.recovery,h=d?.explicitPayload;l(n.version===2&&n.provenance==="EXPLICIT_READBACK_ADOPTION"&&n.reactionReadback===null&&y.provenance===n.provenance&&d?.verification==="CURRENT_STATE_ADOPTED_NOT_ORIGIN_PROVED"&&d.operationId===n.operationId&&d.observedAt===n.observedAt&&d.legacyPending?.operationId===h?.pendingOperationId&&d.legacyPending?.key===n.sourceKey&&$(Re(e,d.legacyPending.flowBefore))===$(p)&&d.expectedFlowSnapshotSignature===V(_)&&d.expectedReactionSnapshotSignature===n.reactionDigest&&h.flowSnapshotSignature===d.expectedFlowSnapshotSignature&&h.reactionSnapshotSignature===d.expectedReactionSnapshotSignature,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT")}t=_}return t}function Dt(e,t,n,i,r,a=null){let N=ve(e,n),y=N&&e.idToKey.get(N.id);l(e.scope.root.type==="PAGE"&&N&&(e.reactionDefs.get(t.key)?.length??0)>0,"DESIGN_NATIVE_FLOW_CHANGE_CONFLICT"),o.assertTaskOwned(N,e.ownership);let p=Re(e,Fe(e,i)),_=Re(e,Fe(e,r));l(Ct(p,_,y),"DESIGN_NATIVE_FLOW_CHANGE_CONFLICT");let d=Rt(e);l(d?$(d)===$(p):!p.some(O=>O.nodeKey!==null),"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT");let h=bt(e).map(ee),I=e.state.pending.reactionReadback;l(h.length<1e3,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),a||l(I?.sourceKey===t.key&&I.sourceId===n.id&&I.topLevelKey===y&&I.operationId===e.message.operationId&&I.digest===ye(e,n),"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),!h.length&&i.length===0&&!a?e.state.nativeFlowObservation={version:1,sourceKey:t.key,topLevelKey:y,before:p,after:_,reactionDigest:I.digest,operationId:I.operationId,observedAt:I.observedAt}:(h.push({version:2,provenance:a?"EXPLICIT_READBACK_ADOPTION":"NATIVE_SETTER_READBACK",sourceKey:t.key,topLevelKey:y,before:p,after:_,reactionDigest:ye(e,n),operationId:e.message.operationId,observedAt:a?.observedAt??I.observedAt,reactionReadback:a?null:ee(I),...a?{recovery:a}:{}}),e.state.nativeFlowObservation={version:2,entries:h}),F(e)}function Le(e){let t=Se(e,(e.scope.page.flowStartingPoints??[]).filter(a=>e.idToKey.has(a.nodeId))),n=K(e,"flows","page");if(n){l($(At(e,n))===$(t),"DESIGN_FLOW_USER_EDIT_CONFLICT");return}let i=e.state.nativeFlowObservation;if(i){if(i.version===2){let y=Rt(e);l($(Fe(e,e.scope.page.flowStartingPoints??[]))===$(y),"DESIGN_FLOW_USER_EDIT_CONFLICT");return}let a=e.map.get(i.sourceKey),N=K(e,"reactions",i.sourceKey);l(i.version===1&&i.before.length===0&&i.after.length===1&&i.after[0].name==="Flow 1"&&i.after[0].nodeKey===i.topLevelKey&&a&&e.idToKey.get(ve(e,a)?.id)===i.topLevelKey&&N?.digest===i.reactionDigest&&ye(e,a)===i.reactionDigest,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),l($(t)===$(i.after),"DESIGN_FLOW_USER_EDIT_CONFLICT");return}let r=(e.spec.flows??[]).map(a=>({name:a.name,nodeKey:a.nodeKey}));l(t.length===0||$(t)===$(r),"DESIGN_FLOW_CONFLICT")}async function an(e,t,n,i){Le(e);let r=Q(e,t,n),a=ee(e.scope.page.flowStartingPoints??[]),N=ve(e,n),y=i.length>0&&i.every(d=>d.actions.every(h=>h.type==="NODE"&&h.navigation==="CHANGE_TO"));if(i.length&&l(e.scope.root.type==="PAGE"&&(N||y),"DESIGN_NATIVE_FLOW_REQUIRES_PAGE_SCOPE"),y){let d=t,h=new Set;for(;d&&!h.has(d.key)&&!["COMPONENT","INSTANCE"].includes(d.type);)h.add(d.key),d=e.definitions.get(d.parentKey);let I=e.memberSets.get(d?.type==="INSTANCE"?d.props.componentKey:d?.key);l(I&&e.map.get(I)?.type==="COMPONENT_SET"&&i.every(O=>O.actions.every(k=>e.memberSets.get(e.idToKey.get(k.destinationId))===I)),"DESIGN_CHANGE_TO_SET_CONFLICT")}S(e,"reactions",t.key),e.state.pending.flowBefore=a.map(d=>({name:d.name,nodeKey:e.idToKey.get(d.nodeId)??null,nodeId:d.nodeId})),F(e),E(),await n.setReactionsAsync(i);let p=Q(e,t,n,r);D(e,t,n,p),l($(ne(n))===$(i),`DESIGN_REACTION_READBACK_MISMATCH:${t.key}`),Object.hasOwn(p,"inheritedReactions")&&T(n,he,V(q(e,p)));let _=ee(e.scope.page.flowStartingPoints??[]);e.state.pending.flowAfter=_.map(d=>({name:d.name,nodeKey:e.idToKey.get(d.nodeId)??null,nodeId:d.nodeId})),e.state.pending.reactionReadback={version:1,sourceKey:t.key,sourceId:n.id,topLevelKey:N?e.idToKey.get(N.id):null,digest:ye(e,n),operationId:e.message.operationId,observedAt:new Date().toISOString()},F(e),$(_)!==$(a)&&(l(!y,"DESIGN_LOCAL_FLOW_USER_EDIT_CONFLICT"),Dt(e,t,n,a,_)),T(e.scope.root,M(e,"reactions",t.key),{version:2,digest:ye(e,n)}),f(e)}async function wt(e,t,n){let i=x(e,t),r=ne(n),a=K(e,"reactions",t.key);a?l(a.digest===ye(e,n,a),`DESIGN_REACTION_USER_EDIT_CONFLICT:${t.key}`):l(r.length===0||$(r)===$(i),`DESIGN_REACTION_CONFLICT:${t.key}`),$(r)!==$(i)?(l(!(t.type==="INSTANCE"&&e.memberSets.has(t.props.componentKey)&&!e.reactionDefs.has(t.key)),`DESIGN_INSTANCE_REACTION_INHERITANCE_MISMATCH:${t.key}`),await an(e,t,n,i)):a||T(e.scope.root,M(e,"reactions",t.key),{version:2,digest:ye(e,n)})}function kt(e,t){let n=e.map.get(t.key),i=Q(e,t,n);if(D(e,t,n,i),!("children"in n)||n.type==="INSTANCE")return;let r=e.children.get(t.key)??[],a=r.filter(h=>!h.props?.isFixed),N=r.filter(h=>h.props?.isFixed),y=[...a,...N];N.length&&l(t.props?.overflowDirection&&t.props.overflowDirection!=="NONE",`DESIGN_FIXED_REQUIRES_SCROLL_PARENT:${t.key}`);let p=y.map(h=>h.key),_=re(e,n.children),d=K(e,"order",t.key);if(d&&l($(be(e,d))===$(_),`DESIGN_USER_LAYER_EDIT_CONFLICT:${t.key}`),$(p)!==$(_)||N.length!==(n.numberOfFixedChildren??0)){S(e,"order",t.key);for(let h of y)E(),n.appendChild(e.map.get(h.key));"numberOfFixedChildren"in n&&(n.numberOfFixedChildren=N.length),l($(re(e,n.children))===$(p),`DESIGN_LAYER_READBACK_MISMATCH:${t.key}`),T(n,he,V(H(e,n))),T(e.scope.root,M(e,"order",t.key),{keys:p}),f(e)}else d||T(e.scope.root,M(e,"order",t.key),{keys:p})}async function dn(e,t){if(e.state.finalized)return;Le(e);let n=e.state.finalizeCursor??0;for(let p of e.order.slice(n,n+t)){let _=e.map.get(p.key);kt(e,p),await wt(e,p,_),e.state.finalizeCursor=(e.state.finalizeCursor??0)+1,F(e)}if(e.state.finalizeCursor<e.order.length)return;let i=(e.spec.flows??[]).map(p=>({nodeId:e.map.get(p.nodeKey).id,name:p.name})),r=new Set([...e.map.values()].map(p=>p.id)),a=e.scope.page.flowStartingPoints??[],N=a.filter(p=>r.has(p.nodeId)),y=K(e,"flows","page");if(Le(e),$(N)!==$(i)){S(e,"flows","page"),E(),e.scope.page.flowStartingPoints=[...a.filter(_=>!r.has(_.nodeId)),...i];let p=e.scope.page.flowStartingPoints.filter(_=>r.has(_.nodeId));l($(p)===$(i),"DESIGN_FLOW_READBACK_MISMATCH"),T(e.scope.root,M(e,"flows","page"),{version:2,flows:Se(e,p)}),f(e)}else y||T(e.scope.root,M(e,"flows","page"),{version:2,flows:Se(e,N)});e.state.finalized=!0,e.state.complete=!0,F(e)}async function cn(e){let t=e.state.pending;if(!t)return;let i=K(e,{image:"image",style:"style",variable:"variable",collection:"collection",node:"n",order:"order",reactions:"reactions",flows:"flows"}[t.kind],t.key);if(e.payload.adoptNativeFlow!==void 0){let r=e.payload.adoptNativeFlow;l(e.payload.reconcile===!0&&t.kind==="reactions"&&!i&&r&&typeof r=="object"&&!Array.isArray(r)&&Object.keys(r).length===3&&["pendingOperationId","flowSnapshotSignature","reactionSnapshotSignature"].every(I=>Object.hasOwn(r,I))&&typeof r.pendingOperationId=="string"&&r.pendingOperationId===t.operationId&&typeof r.flowSnapshotSignature=="string"&&/^[a-f0-9]{64}$/.test(r.flowSnapshotSignature)&&typeof r.reactionSnapshotSignature=="string"&&/^[a-f0-9]{64}$/.test(r.reactionSnapshotSignature),"DESIGN_NATIVE_FLOW_ADOPTION_INVALID");let a=e.map.get(t.key),N=e.definitions.get(t.key);l(a&&N,"DESIGN_NATIVE_FLOW_ADOPTION_INVALID");let y=Q(e,N,a);D(e,N,a,y);let p=ee(e.scope.page.flowStartingPoints??[]),_=Re(e,t.flowBefore);if(!e.state.nativeFlowObservation){let I=t.reactionReadback,O=ve(e,a);l(_.every(k=>k.nodeKey===null)&&I?.version===1&&I.sourceKey===t.key&&I.sourceId===a.id&&O&&I.topLevelKey===e.idToKey.get(O.id)&&I.operationId===t.operationId&&I.digest===ye(e,a)&&typeof I.observedAt=="string"&&Number.isFinite(Date.parse(I.observedAt))&&$(Re(e,t.flowAfter))===$(Fe(e,p)),"DESIGN_NATIVE_FLOW_ADOPTION_INVALID"),o.assertTaskOwned(O,e.ownership)}let d=_.map(I=>({name:I.name,nodeId:I.nodeKey===null?I.nodeId:e.map.get(I.nodeKey).id}));l($(ne(a))===$(x(e,N))&&V(Fe(e,p))===r.flowSnapshotSignature&&ye(e,a)===r.reactionSnapshotSignature,"DESIGN_NATIVE_FLOW_ADOPTION_SNAPSHOT_CONFLICT");let h={legacyPending:ee(t),operationId:e.message.operationId,observedAt:new Date().toISOString(),expectedFlowSnapshotSignature:r.flowSnapshotSignature,expectedReactionSnapshotSignature:r.reactionSnapshotSignature,explicitPayload:ee(r),verification:"CURRENT_STATE_ADOPTED_NOT_ORIGIN_PROVED"};Dt(e,N,a,d,p,h),T(e.scope.root,M(e,"reactions",t.key),{version:2,digest:ye(e,a),provenance:"EXPLICIT_READBACK_ADOPTION"}),f(e);return}if(l(i,`DESIGN_NEEDS_RECONCILIATION:${t.kind}:${t.key}`),t.kind==="node"){let r=e.order.find(N=>N.key===t.key),a=e.map.get(t.key);l(a&&a.getPluginData(ke)==="complete","DESIGN_PENDING_NODE_NOT_COMPLETE"),Q(e,r,a),e.state.cursor=e.order.filter(N=>e.map.has(N.key)).length}if(t.kind==="reactions"&&l(i.digest===ye(e,e.map.get(t.key),i),"DESIGN_PENDING_REACTION_CONFLICT"),t.kind==="order"&&l($(be(e,i))===$(re(e,e.map.get(t.key).children)),"DESIGN_PENDING_LAYER_CONFLICT"),t.kind==="flows"){let r=new Set([...e.map.values()].map(a=>a.id));l($(At(e,i))===$(Se(e,e.scope.page.flowStartingPoints.filter(a=>r.has(a.nodeId)))),"DESIGN_PENDING_FLOW_CONFLICT")}f(e)}function Oe(e){return{applied:e.map.size,total:e.spec.nodes.length,finalizedNodes:e.state.finalizeCursor??0,pending:ee(e.state.pending),finalized:e.state.finalized===!0}}async function Me(e){let t=[];try{Z(e)}catch(d){t.push(d.message)}let n=new Map([...e.map].map(([d,h])=>[h.id,d])),i=new Map([...e.variables].map(([d,h])=>[h.id,d])),r=new Map([...e.styles].map(([d,h])=>[h.id,d])),a=new Map([...e.images].map(([d,h])=>[h,d]));function N(d){let h={type:d.type,opacity:d.opacity??1};return d.type==="SOLID"?(h.color=pe(d.color),d.boundVariables?.color&&(h.variableKey=i.get(d.boundVariables.color.id)??"UNKNOWN")):d.type==="IMAGE"?(h.assetKey=a.get(d.imageHash)??"UNKNOWN",h.scaleMode=d.scaleMode,d.imageTransform&&(h.imageTransform=pe(d.imageTransform))):d.type.startsWith("GRADIENT_")&&(h.gradientTransform=pe(d.gradientTransform),h.gradientStops=pe(d.gradientStops)),h}let y=[],p=[];for(let d of e.order){let h=e.map.get(d.key);if(!h){t.push(`MISSING_NODE:${d.key}`);continue}let I=H(e,h);if(delete I.parentKey,e.spec.schemaVersion==="1.1"){for(let W of["x","y","width","height"])I[W]=h[W];delete I.layoutDriven}if(h.type==="TEXT"&&(I.textStyleId=h.textStyleId),h.type==="INSTANCE"){let W=await h.getMainComponentAsync();I.componentId=W?.id??null,n.get(I.componentId)!==d.props.componentKey&&t.push(`INSTANCE_COMPONENT_MISMATCH:${d.key}`)}let O={};for(let[W,se]of Object.entries(I))["type","name","x","y","width","height"].includes(W)||(O[W]=se);Array.isArray(h.fills)&&(O.fills=h.fills.map(N)),Array.isArray(h.strokes)&&(O.strokes=h.strokes.map(N)),"textStyleId"in O&&(O.textStyleId&&(O.textStyleKey=r.get(O.textStyleId)??"UNKNOWN"),delete O.textStyleId),"componentId"in O&&(O.componentKey=n.get(O.componentId)??"UNKNOWN",delete O.componentId),"overflowDirection"in O&&(O.overflowDirection=Vn[O.overflowDirection]??O.overflowDirection);let k=h.parent===e.scope.root?null:n.get(h.parent?.id)??"UNKNOWN";k!==d.parentKey&&t.push(`PARENT_MISMATCH:${d.key}`),y.push({key:d.key,id:h.id,type:h.type,name:h.name,parentKey:k,x:h.x,y:h.y,width:h.width,height:h.height,props:O,..."children"in h&&h.type!=="INSTANCE"?{childKeys:h.children.map(W=>n.get(W.id)??"FOREIGN")}:{}});let v=x(e,d),B=ne(h);$(B)!==$(v)&&t.push(`REACTION_MISMATCH:${d.key}`);for(let W of B)for(let se of W.actions)if(se.type==="NODE"){let ae=(e.reactionDefs.get(d.key)??(d.type==="INSTANCE"?e.reactionDefs.get(d.props.componentKey):null)??[]).find(ze=>ze.trigger.type===W.trigger.type),le=W.trigger.type==="AFTER_TIMEOUT"?ae?.trigger.timeoutMs!==void 0?{type:"AFTER_TIMEOUT",timeoutMs:W.trigger.timeout}:{type:"AFTER_TIMEOUT",delaySeconds:W.trigger.timeout/(e.timerUnit==="milliseconds"?1e3:1)}:["MOUSE_ENTER","MOUSE_LEAVE"].includes(W.trigger.type)?{type:W.trigger.type,delayMs:W.trigger.delay}:W.trigger;p.push({sourceKey:d.key,destinationKey:n.get(se.destinationId)??"UNKNOWN",...e.spec.schemaVersion==="1.1"?{navigation:se.navigation}:{},trigger:le})}if(h.type!=="INSTANCE"&&"children"in h){let W=e.children.get(d.key)??[],se=[...W.filter(ae=>!ae.props?.isFixed),...W.filter(ae=>ae.props?.isFixed)].map(ae=>ae.key);$(se)!==$(h.children.map(ae=>n.get(ae.id)))&&t.push(`LAYER_ORDER_MISMATCH:${d.key}`)}}let _=(e.scope.page.flowStartingPoints??[]).filter(d=>n.has(d.nodeId)).map(d=>({nodeKey:n.get(d.nodeId),name:d.name}));return $(_)!==$(e.spec.flows??[])&&t.push("FLOW_MISMATCH"),e.state.pending&&t.push("UNRESOLVED_PENDING_OPERATION"),e.state.complete||t.push("DESIGN_NOT_COMPLETE"),e.styles.size!==(e.spec.textStyles?.length??0)&&t.push("TEXT_STYLE_COUNT_MISMATCH"),e.variables.size!==(e.spec.variables?.length??0)&&t.push("VARIABLE_COUNT_MISMATCH"),{schemaVersion:"1.0",runId:e.payload.runId,specId:e.spec.id,specSignature:e.signature,collectedAt:new Date().toISOString(),fileIdentity:{fileKey:s.fileKey},scope:{pageId:e.scope.page.id,rootNodeId:e.scope.root.id},status:t.length?"FAIL":"PASS",writes:0,errors:t,nodes:y,reactions:p,flows:_,...e.spec.source?.behaviorStates?{behaviorStates:e.spec.source.behaviorStates.map(d=>({...d,nodes:d.nodeKeys.map(h=>({key:h,id:e.map.get(h)?.id??null}))}))}:{},...e.spec.componentSets?{componentSets:e.spec.componentSets.map(d=>({key:d.key,id:e.map.get(d.key)?.id??null,memberKeys:e.map.get(d.key)?.children.map(h=>n.get(h.id)??"FOREIGN")??[],variants:e.map.get(d.key)?.children.map(h=>({key:n.get(h.id)??"FOREIGN",name:h.name}))??[]}))}:{},counts:{nodes:y.length,texts:y.filter(d=>d.type==="TEXT").length,components:y.filter(d=>d.type==="COMPONENT").length,instances:y.filter(d=>d.type==="INSTANCE").length,reactions:p.length,flows:_.length,textStyles:e.styles.size,variables:e.variables.size,...e.spec.componentSets?{componentSets:y.filter(d=>d.type==="COMPONENT_SET").length}:{}},textStyles:[...e.styles].map(([d,h])=>({key:d,...J(h),name:e.spec.textStyles.find(I=>I.key===d).name})),variables:[...e.variables].map(([d,h])=>({key:d,name:e.spec.variables.find(I=>I.key===d).name,value:Object.values(h.valuesByMode)[0]})),fontSubstitutions:e.substitutions,timerUnit:e.timerUnit,playback:"NOT VERIFIED",checkpoint:Oe(e)}}function fn(e,t){let n=e.payload.auditOffset??0,i=e.payload.auditLimit??1e3;l(Number.isInteger(n)&&n>=0&&n<=25e3&&n<=t.nodes.length,"DESIGN_AUDIT_OFFSET_INVALID"),l(Number.isInteger(i)&&i>=1&&i<=2e3,"DESIGN_AUDIT_LIMIT_INVALID");let{collectedAt:r,...a}=t,N={...t,nodes:t.nodes.slice(n,n+i),page:{offset:n,limit:i,totalNodes:t.nodes.length,nextOffset:n+i<t.nodes.length?n+i:null,snapshotSignature:V(a)}};return l(He(JSON.stringify(N)).byteLength<7*1024*1024,"DESIGN_AUDIT_RESPONSE_BUDGET_EXCEEDED: reduce auditLimit or split the specification"),N}function pn(e){let t=je(e.baseSpec),n=je(e.spec),i=N=>{let y=ee(N);return delete y.nodes,y.source&&(delete y.source.revision,Object.keys(y.source).length||delete y.source),y};l(t.id===n.id&&$(i(t))===$(i(n))&&t.nodes.length===n.nodes.length,"DESIGN_TEXT_REVISION_SPEC_CONFLICT");let r=new Map(t.nodes.map(N=>[N.key,N])),a=[];for(let N=0;N<t.nodes.length;N++){let y=t.nodes[N],p=n.nodes[N];if(l(y.key===p.key&&y.type===p.type,"DESIGN_TEXT_REVISION_NODE_ORDER_CONFLICT"),$(y)===$(p))continue;l(y.type==="TEXT","DESIGN_TEXT_REVISION_TEXT_ONLY");let _=h=>{let I=ee(h);return delete I.name,delete I.props.characters,I};l($(_(y))===$(_(p)),"DESIGN_TEXT_REVISION_PROPERTY_CONFLICT");let d=y.parentKey&&r.get(y.parentKey);for(;d;)l(!["COMPONENT","INSTANCE"].includes(d.type),"DESIGN_TEXT_REVISION_COMPONENT_UNSUPPORTED"),d=d.parentKey&&r.get(d.parentKey);a.push({key:y.key,before:y,after:p})}return l(a.length>=1&&a.length<=100,"DESIGN_TEXT_REVISION_CHANGE_COUNT"),{base:t,target:n,changes:a,baseSignature:V(t),targetSignature:V(n)}}function ln(e,t){let n=e.map.get(t.key),i=H(e,n),r={...i,name:t.after.name??t.after.key},a=t.after.props.characters,N={...r,characters:a};if(e.spec.schemaVersion==="1.1"&&a!==i.characters){l(i.textAutoResize==="NONE"&&!i.layoutDriven.width&&!i.layoutDriven.height,`DESIGN_TEXT_REVISION_GEOMETRY_UNSUPPORTED:${t.key}`);let y=i.textRanges,p=y?.[0];l(Array.isArray(y)&&y.length===1&&p.start===0&&p.end===i.characters.length&&p.characters===i.characters&&Be.every(_=>p[_]!==void 0&&p[_]!==null&&Ie(p[_],i[_])),`DESIGN_TEXT_REVISION_RANGES_UNSUPPORTED:${t.key}`),N.textRanges=a?[{...p,characters:a,end:a.length}]:[]}return{key:t.key,id:n.id,baseIntent:V(t.before),targetIntent:V(t.after),snapshots:[i,r,N].map(V)}}let yn=e=>({applied:e?.cursor??0,total:e?.changes.length??0,pending:ee(e?.pending??null),finalized:e?.status==="COMPLETE"}),it=e=>V([...e.map].map(([t,n])=>[t,n.id])),ot=e=>V((e.scope.root.children??[]).map(t=>t.id)),rt=e=>V(e.scope.page.flowStartingPoints??[]),Lt=100,at=e=>typeof e=="string"&&/^[A-Za-z0-9._:-]{1,160}$/.test(e),Pe=e=>typeof e=="string"&&/^[a-f0-9]{64}$/.test(e);function Mt(e){if(e.predecessor===void 0&&e.predecessorSignature===void 0)return[];let t=e.predecessor;return l(t&&t.version===1&&at(t.runId)&&Pe(t.baseSignature)&&Pe(t.targetSignature)&&Pe(t.journalSignature)&&t.targetSignature===e.baseSignature&&e.predecessorSignature===V(t)&&Array.isArray(t.usedRunIds)&&t.usedRunIds.length>=1&&t.usedRunIds.length<Lt&&t.usedRunIds.every(at)&&new Set(t.usedRunIds).size===t.usedRunIds.length&&t.usedRunIds[t.usedRunIds.length-1]===t.runId&&!t.usedRunIds.includes(e.runId),"DESIGN_TEXT_REVISION_PREDECESSOR_CONFLICT"),t.usedRunIds}function gn(e){return[[e.snapshots[0],e.baseIntent,e.snapshots[0]],[e.snapshots[1],e.baseIntent,e.snapshots[0]],[e.snapshots[2],e.baseIntent,e.snapshots[0]],[e.snapshots[2],e.targetIntent,e.snapshots[0]],[e.snapshots[2],e.targetIntent,e.snapshots[2]]]}function Ue(e,t,n,i){let r=e.map.get(t.key);o.assertInScope(r,e.scope),o.assertTaskOwned(r,e.ownership),l(r.id===n.id&&r.type==="TEXT"&&r.parent===(t.before.parentKey?e.map.get(t.before.parentKey):e.scope.root)&&r.getPluginData(_e)===e.ns&&r.getPluginData(o.specNodeKey)===t.key&&r.getPluginData(ke)==="complete"&&K(e,"n",t.key)?.id===r.id,`DESIGN_TEXT_REVISION_MAPPING_CONFLICT:${t.key}`);let a=[V(H(e,r)),r.getPluginData(Ce),r.getPluginData(he)],N=gn(n),y=[...i].reverse().find(p=>$(a)===$(N[p]));return l(y!==void 0,`DESIGN_TEXT_REVISION_STATE_CONFLICT:${t.key}`),y}function Pt(e,t,n){l(n.version===1&&at(n.runId)&&Pe(n.baseSignature)&&n.status==="COMPLETE"&&n.pending===null&&e.state.pending===null&&e.signature===t.baseSignature&&e.state.specSignature===t.baseSignature&&n.targetSignature===t.baseSignature&&Array.isArray(n.changes)&&n.changes.length>=1&&n.changes.length<=100&&n.cursor===n.changes.length&&Array.isArray(n.receipts)&&n.receipts.length===n.changes.length&&new Set(n.changes.map(r=>r.key)).size===n.changes.length&&new Set(n.changes.map(r=>r.id)).size===n.changes.length&&n.mappingSignature===it(e)&&n.childrenSignature===ot(e)&&n.flowSignature===rt(e),"DESIGN_TEXT_REVISION_HANDOFF_CONFLICT");let i=[...Mt(n),n.runId];l(!i.includes(e.payload.runId),"DESIGN_TEXT_REVISION_RUN_REUSED"),l(i.length<Lt,"DESIGN_TEXT_REVISION_HISTORY_LIMIT");for(let r=0;r<n.changes.length;r++){let a=n.changes[r],N=e.definitions.get(a.key),y=n.receipts[r];l(N?.type==="TEXT"&&Pe(a.baseIntent)&&a.targetIntent===V(N)&&Array.isArray(a.snapshots)&&a.snapshots.length===3&&a.snapshots.every(Pe)&&y?.key===a.key&&y.id===a.id&&y.snapshotSignature===a.snapshots[2]&&typeof y.operationId=="string"&&/^op-[A-Za-z0-9_-]{8,100}$/.test(y.operationId)&&typeof y.observedAt=="string"&&Number.isFinite(Date.parse(y.observedAt)),"DESIGN_TEXT_REVISION_HANDOFF_CONFLICT"),Ue(e,{key:N.key,before:N},a,[4])}return{version:1,runId:n.runId,baseSignature:n.baseSignature,targetSignature:n.targetSignature,journalSignature:V(n),usedRunIds:i}}function De(e,t,n){o.assertInScope(e.scope.root,e.scope),e.scope.root.type!=="PAGE"&&o.assertTaskOwned(e.scope.root,e.ownership);let i=new Map(t.changes.map((r,a)=>[r.key,{change:r,i:a}]));n&&(Mt(n),l(n.version===1&&n.runId===e.payload.runId&&n.baseSignature===t.baseSignature&&n.targetSignature===t.targetSignature&&n.changes.length===t.changes.length&&Number.isInteger(n.cursor)&&n.cursor>=0&&n.cursor<=n.changes.length&&["IN_PROGRESS","COMPLETE"].includes(n.status)&&Array.isArray(n.receipts)&&n.receipts.length===n.cursor&&n.mappingSignature===it(e)&&n.childrenSignature===ot(e)&&n.flowSignature===rt(e),"DESIGN_TEXT_REVISION_JOURNAL_CONFLICT"),l(!n.pending||n.pending.index===n.cursor&&n.pending.key===t.changes[n.cursor]?.key&&Number.isInteger(n.pending.stage)&&n.pending.stage>=0&&n.pending.stage<=3,"DESIGN_TEXT_REVISION_JOURNAL_CONFLICT"),l(n.status!=="COMPLETE"||n.cursor===n.changes.length&&!n.pending,"DESIGN_TEXT_REVISION_JOURNAL_CONFLICT"));for(let r of e.order){let a=e.map.get(r.key),N=i.get(r.key);if(l(a,`DESIGN_NODE_MISSING:${r.key}`),l(a.type===r.type&&a.parent===(r.parentKey?e.map.get(r.parentKey):e.scope.root)&&a.getPluginData(_e)===e.ns&&a.getPluginData(o.specNodeKey)===r.key&&a.getPluginData(ke)==="complete"&&K(e,"n",r.key)?.id===a.id,`DESIGN_TEXT_REVISION_MAPPING_CONFLICT:${r.key}`),N&&n){let y=n.changes[N.i];l(y.key===N.change.key&&y.baseIntent===V(N.change.before)&&y.targetIntent===V(N.change.after)&&Array.isArray(y.snapshots)&&y.snapshots.length===3&&y.snapshots.every(_=>/^[a-f0-9]{64}$/.test(_)),"DESIGN_TEXT_REVISION_JOURNAL_CONFLICT");let p=N.i<n.cursor?[4]:N.i===n.cursor&&n.pending?[n.pending.stage,n.pending.stage+1]:[0];Ue(e,N.change,y,p),N.i<n.cursor&&l(n.receipts[N.i]?.key===r.key&&n.receipts[N.i].id===a.id&&n.receipts[N.i].snapshotSignature===y.snapshots[2],"DESIGN_TEXT_REVISION_JOURNAL_CONFLICT")}else{let y=Q(e,r,a);D(e,r,a,y)}if(l($(ne(a))===$(x(e,r)),`DESIGN_TEXT_REVISION_REACTION_CONFLICT:${r.key}`),"children"in a&&a.type!=="INSTANCE"){let y=e.children.get(r.key)??[];l($(a.children.map(p=>e.idToKey.get(p.id)))===$([...y.filter(p=>!p.props?.isFixed),...y.filter(p=>p.props?.isFixed)].map(p=>p.key)),`DESIGN_TEXT_REVISION_LAYER_CONFLICT:${r.key}`)}}for(let[r,a]of e.styles)l(K(e,"style",r)?.digest===V(J(a)),`DESIGN_STYLE_USER_EDIT_CONFLICT:${r}`);for(let[r,a]of e.variables)l(K(e,"variable",r)?.digest===V(te(a)),`DESIGN_VARIABLE_USER_EDIT_CONFLICT:${r}`);e.collection&&l(K(e,"collection","colors")?.digest===V(j(e.collection)),"DESIGN_COLLECTION_USER_EDIT_CONFLICT"),Le(e)}async function un(e){let t=e.payload??{},n=e.command==="scope_design_text_apply";l(t.reconcile===void 0||typeof t.reconcile=="boolean","DESIGN_TEXT_REVISION_RECONCILE_INVALID"),l(!t.reconcile||n,"DESIGN_TEXT_REVISION_RECONCILE_REQUIRES_APPLY");let i=pn(t),r=await o.resolveScope(e.trustedScope);o.assertTrustedOwnership(e.trustedOwnership,e.operationId);let a=V({workspace:e.trustedOwnership.workspaceId,task:e.trustedOwnership.taskId,spec:i.base.id}).slice(0,24),N=ge(r.root,`${me}${a}-ledger`);l(N?.complete===!0&&N.finalized===!0,"DESIGN_TEXT_REVISION_BASE_NOT_COMPLETE"),l([i.baseSignature,i.targetSignature].includes(N.specSignature),"DESIGN_TEXT_REVISION_BASE_SIGNATURE_CONFLICT");let y=N.specSignature===i.targetSignature?i.target:i.base,p=await C({...e,payload:{...t,spec:y}}),_=p.state.textRevision;l(!p.state.pending||p.state.pending.kind==="text-revision"&&_&&p.state.pending.runId===t.runId,"DESIGN_TEXT_REVISION_BASE_PENDING");let d=null;_&&_.runId!==t.runId&&(l(_.status==="COMPLETE"&&!p.state.pending&&p.signature===i.baseSignature&&_.targetSignature===i.baseSignature,"DESIGN_TEXT_REVISION_JOURNAL_CONFLICT"),d=_,_=null),l(_||p.signature===i.baseSignature,"DESIGN_TEXT_REVISION_JOURNAL_REQUIRED"),_&&l(_.runId===t.runId&&_.baseSignature===i.baseSignature&&_.targetSignature===i.targetSignature,"DESIGN_TEXT_REVISION_JOURNAL_CONFLICT"),await G(p,n),await z(p),l($(ge(p.scope.root,p.ledgerKey))===$(p.state),"DESIGN_TEXT_REVISION_LEDGER_CONFLICT"),d&&Pt(p,i,d),De(p,i,_);let h=(I,O={})=>({status:I,runId:t.runId,specId:i.target.id,baseSpecSignature:i.baseSignature,specSignature:i.targetSignature,checkpoint:{...yn(_),total:i.changes.length},changes:i.changes.map(k=>({key:k.key,id:p.map.get(k.key).id,before:{name:k.before.name??k.before.key,characters:k.before.props.characters},after:{name:k.after.name??k.after.key,characters:k.after.props.characters}})),...O});if(_?.status==="COMPLETE"){l(p.signature===i.targetSignature&&!p.state.pending,"DESIGN_TEXT_REVISION_JOURNAL_CONFLICT");let I=await Me(p);return l(I.status==="PASS",`DESIGN_TEXT_REVISION_TARGET_DRIFT:${I.errors.join(",")}`),l($(ge(p.scope.root,p.ledgerKey))===$(p.state),"DESIGN_TEXT_REVISION_LEDGER_CONFLICT"),De(p,i,_),h(n?"COMPLETE":"PLANNED",{writes:0,idempotent:!0,auditStatus:"PASS"})}if(_){if(l(p.signature===i.baseSignature&&p.state.pending?.kind==="text-revision","DESIGN_TEXT_REVISION_JOURNAL_CONFLICT"),!n||!t.reconcile)return h("NEEDS_RECONCILIATION",{writes:0,nextAction:"text-reconcile"})}else{let I=await Me(p);l(I.status==="PASS",`DESIGN_TEXT_REVISION_BASE_AUDIT_FAILED:${I.errors.join(",")}`),l($(ge(p.scope.root,p.ledgerKey))===$(p.state),"DESIGN_TEXT_REVISION_LEDGER_CONFLICT");let O=d?Pt(p,i,d):null;De(p,i,null);let k=i.changes.map(v=>ln(p,v));if(t.reconcile)return h("RECONCILED_UNCHANGED",{writes:0,baselineAuditStatus:"PASS",revisionState:"NOT_STARTED",nextAction:"text-apply"});if(!n)return h("PLANNED",{writes:0});_={version:1,runId:t.runId,baseSignature:i.baseSignature,targetSignature:i.targetSignature,status:"IN_PROGRESS",cursor:0,pending:null,receipts:[],mappingSignature:it(p),childrenSignature:ot(p),flowSignature:rt(p),...O?{predecessor:O,predecessorSignature:V(O)}:{},changes:k},p.state.textRevision=_,p.state.pending={kind:"text-revision",runId:t.runId,operationId:e.operationId,startedAt:new Date().toISOString()}}try{for(F(p);_.cursor<_.changes.length;){De(p,i,_);let v=_.cursor,B=i.changes[v],W=_.changes[v],se=p.map.get(B.key);_.pending||(_.pending={key:B.key,index:v,stage:0},F(p));let ae=Ue(p,B,W,[_.pending.stage,_.pending.stage+1]);for(;ae<4;ae++)_.pending.stage=ae,F(p),Ue(p,B,W,[ae]),ae===0&&se.name!==(B.after.name??B.after.key)&&(E(),se.name=B.after.name??B.after.key),ae===1&&se.characters!==B.after.props.characters&&(E(),se.characters=B.after.props.characters),ae===2&&T(se,Ce,W.targetIntent),ae===3&&T(se,he,W.snapshots[2]),Ue(p,B,W,[ae+1]);_.receipts.push({key:B.key,id:se.id,snapshotSignature:W.snapshots[2],operationId:e.operationId,observedAt:new Date().toISOString()}),_.cursor+=1,_.pending=null,F(p)}De(p,i,_);let I={...p,spec:i.target,signature:i.targetSignature,order:et(i.target),definitions:new Map(i.target.nodes.map(v=>[v.key,v])),state:ee(p.state)};I.state.textRevision.status="COMPLETE",I.state.pending=null,I.state.specSignature=i.targetSignature;let O=await Me(I);l(O.status==="PASS",`DESIGN_TEXT_REVISION_TARGET_AUDIT_FAILED:${O.errors.join(",")}`),l($(ge(p.scope.root,p.ledgerKey))===$(p.state),"DESIGN_TEXT_REVISION_LEDGER_CONFLICT"),De(p,i,_),F(I);let k=await Me(I);return l(k.status==="PASS",`DESIGN_TEXT_REVISION_TARGET_AUDIT_FAILED:${k.errors.join(",")}`),l($(ge(p.scope.root,p.ledgerKey))===$(I.state),"DESIGN_TEXT_REVISION_LEDGER_CONFLICT"),_=I.state.textRevision,De(I,i,_),h("COMPLETE",{auditStatus:"PASS",nextAction:"audit"})}catch(I){let O=ge(p.scope.root,p.ledgerKey)?.textRevision;return _=O?.runId===t.runId&&O.baseSignature===i.baseSignature&&O.targetSignature===i.targetSignature?O:null,h("PARTIAL_FAILURE",{error:String(I.message).slice(0,500),nextAction:"text-plan",replay:"PROHIBITED_UNTIL_READBACK_RECONCILIATION"})}}let $t=6e4,Ne=(e,t)=>$(e)===$(t),Gt=e=>{let t=ee(e);return delete t.positionRecovery,t.pending=null,t},Kt=e=>[...e.map].map(([t,n])=>[t,n.id]);function vt(e){if(e.type==="PAGE")return;let t=e.relativeTransform;l((!["FRAME","COMPONENT"].includes(e.type)||e.layoutMode==="NONE")&&Array.isArray(t)&&t.length===2&&t.every(n=>Array.isArray(n)&&n.length===3&&n.every(Number.isFinite))&&t[0][0]===1&&t[0][1]===0&&t[1][0]===0&&t[1][1]===1,`DESIGN_POSITION_RECOVERY_TRANSFORM:${e.id}`)}function Ft(e){vt(e),l(e.type==="PAGE"||e.layoutMode==="NONE",`DESIGN_POSITION_RECOVERY_TRANSFORM:${e.id}`)}function dt(e){return V({ledger:ge(e.scope.root,e.ledgerKey),nodes:[...e.map].map(([t,n])=>({mapKey:t,id:n.id,raw:b(n,!1,e.spec.schemaVersion==="1.1"),parentId:n.parent?.id,children:n.children?.map(i=>i.id),transform:pe(n.relativeTransform),layoutMode:pe(n.layoutMode),reactions:ne(n),owner:n.getPluginData(_e),key:n.getPluginData(o.specNodeKey),state:n.getPluginData(ke),intent:n.getPluginData(Ce),digest:n.getPluginData(he),mapping:K(e,"n",t),order:K(e,"order",t),reaction:K(e,"reactions",t)})),pageChildren:e.scope.page.children.map(t=>t.id),flows:pe(e.scope.page.flowStartingPoints)})}let Ut=e=>V({version:e.version,runId:e.runId,specSignature:e.specSignature,generationSignature:e.generationSignature,mappingSignature:e.mappingSignature,changes:e.changes,parents:e.parents,flows:e.flows});function ct(e,t,n){let i=e.map.get(t.key),r=H(e,i),a=[t.before,{...t.before,parentId:t.after.parentId},{...t.after,y:t.before.y},t.after],N={parentId:i.parent?.id,x:i.x,y:i.y},y=[...n].reverse().find(p=>Ne(N,a[p])&&V(r)===t.snapshots[p]);return l(y!==void 0,`DESIGN_POSITION_RECOVERY_STATE_CONFLICT:${t.key}`),y}function Ve(e,t,n){let i=new Map(t.parents.map(r=>[r.id,[...r.children]]));return t.changes.forEach((r,a)=>{if(n[a]<1)return;let N=i.get(r.before.parentId),y=i.get(r.after.parentId);l(N&&y&&N.includes(r.id),"DESIGN_POSITION_RECOVERY_ORDER_CONFLICT"),N.splice(N.indexOf(r.id),1);let p=t.parents.find(h=>h.id===r.after.parentId).wanted,_=p.indexOf(r.id),d=y.findIndex(h=>p.indexOf(h)>_);d<0&&(d=y.length),y.splice(d,0,r.id)}),i}function we(e,t,n){o.assertInScope(e.scope.root,e.scope),l(e.scope.root.type==="PAGE"&&e.existing&&e.state.version===1&&!e.state.complete&&!e.state.finalized&&(e.state.finalizeCursor??0)===0&&Number.isInteger(e.state.cursor)&&e.state.cursor>0&&e.state.cursor===e.map.size&&e.state.cursor<=e.order.length&&e.order.every((y,p)=>e.map.has(y.key)===p<e.state.cursor)&&Ne(ge(e.scope.root,e.ledgerKey),e.state),"DESIGN_POSITION_RECOVERY_CHECKPOINT_CONFLICT"),l(!e.state.pending||n&&n.status==="IN_PROGRESS"&&e.state.pending.kind==="position-recovery"&&e.state.pending.runId===e.payload.runId,"DESIGN_POSITION_RECOVERY_PENDING_CONFLICT");let i=new Set(t),r=new Map,a=[];n&&l(n.version===1&&n.runId===e.payload.runId&&n.specSignature===e.signature&&n.mappingSignature===V(Kt(e))&&n.generationSignature===V(Gt(e.state))&&n.proofSignature===Ut(n)&&Ne(n.changes.map(y=>y.key),t)&&["IN_PROGRESS","COMPLETE"].includes(n.status)&&Number.isInteger(n.cursor)&&n.cursor>=0&&n.cursor<=t.length&&(n.status==="COMPLETE"?n.cursor===t.length&&!n.pending&&!e.state.pending:!!e.state.pending)&&(!n.pending||n.pending.index===n.cursor&&Number.isInteger(n.pending.stage)&&n.pending.stage>=0&&n.pending.stage<=3)&&Array.isArray(n.parents)&&n.parents.length<=t.length*2&&Ne(n.flows,e.scope.page.flowStartingPoints??[]),"DESIGN_POSITION_RECOVERY_JOURNAL_CONFLICT");for(let y of e.positionPrefix){let p=e.map.get(y.key),_=y.parentKey?e.map.get(y.parentKey):e.scope.root;if(l(p&&K(e,"n",y.key)?.id===p.id&&p.getPluginData(ke)==="complete",`DESIGN_POSITION_RECOVERY_MAPPING_CONFLICT:${y.key}`),vt(p),i.has(y.key)){l(y.type==="FRAME"&&_&&p.parent&&p.getPluginData(Ce)===V(y),`DESIGN_POSITION_RECOVERY_CANDIDATE_INVALID:${y.key}`);for(let k of[y,e.definitions.get(e.idToKey.get(p.parent.id))]){let v=k;for(;v;)l(!["COMPONENT","INSTANCE"].includes(v.type)&&(v.key===y.key||!i.has(v.key)),"DESIGN_POSITION_RECOVERY_COMPONENT_UNSUPPORTED"),v=v.parentKey&&e.definitions.get(v.parentKey)}for(let k of[p,_,p.parent])Ft(k),k.type!=="PAGE"&&(l(e.map.get(e.idToKey.get(k.id))===k,"DESIGN_POSITION_RECOVERY_PARENT_INVALID"),o.assertTaskOwned(k,e.ownership));l(_.type!=="PAGE"||p.parent===_,"DESIGN_POSITION_RECOVERY_ROOT_REPARENT_UNSUPPORTED");let I=b(p,!1,e.spec.schemaVersion==="1.1"),O={...I,x:y.x,y:y.y,parentKey:_.getPluginData(o.specNodeKey)??""};l(p.getPluginData(he)===V(q(e,O)),`DESIGN_POSITION_RECOVERY_CONTENT_CONFLICT:${y.key}`),D(e,y,p,O);for(let k of p.children)o.assertTaskOwned(k,e.ownership),l(k.getPluginData(_e)===e.ns&&e.map.get(e.idToKey.get(k.id))===k,`DESIGN_FOREIGN_CHILD:${y.key}`);if(r.set(_.id,_),r.set(p.parent.id,p.parent),n){let k=t.indexOf(y.key),v=n.changes[k];l(v.id===p.id&&v.after.parentId===_.id&&v.after.x===y.x&&v.after.y===y.y&&v.digest===p.getPluginData(he)&&v.intent===p.getPluginData(Ce)&&Array.isArray(v.snapshots)&&v.snapshots.length===4&&v.snapshots.every(B=>/^[a-f0-9]{64}$/.test(B)),"DESIGN_POSITION_RECOVERY_JOURNAL_CONFLICT"),a[k]=ct(e,v,k<n.cursor?[3]:k===n.cursor&&n.pending?[n.pending.stage,Math.min(3,n.pending.stage+1)]:[0])}}else{l(p.parent===_,`DESIGN_POSITION_RECOVERY_PARENT_CONFLICT:${y.key}`);let I=Q(e,y,p);D(e,y,p,I)}let d=K(e,"reactions",y.key),h=ne(p);if(l(d?d.digest===ye(e,p,d):h.length===0||Ne(h,x(e,y)),`DESIGN_REACTION_USER_EDIT_CONFLICT:${y.key}`),"children"in p&&p.type!=="INSTANCE"){let I=K(e,"order",y.key),O=I?be(e,I):(e.positionChildren.get(y.key)??[]).map(k=>k.key);l(Ne(p.children.filter(k=>!i.has(e.idToKey.get(k.id))).map(k=>e.idToKey.get(k.id)),O.filter(k=>!i.has(k))),`DESIGN_POSITION_RECOVERY_LAYER_CONFLICT:${y.key}`)}}let N=e.scope.page.children.filter(y=>y.getPluginData(_e)===e.ns);l(Ne(N.filter(y=>!i.has(e.idToKey.get(y.id))).map(y=>e.idToKey.get(y.id)),(e.positionChildren.get(null)??[]).filter(y=>!i.has(y.key)).map(y=>y.key)),"DESIGN_POSITION_RECOVERY_PAGE_ORDER_CONFLICT");for(let[y,p]of e.styles)l(K(e,"style",y)?.digest===V(J(p)),`DESIGN_STYLE_USER_EDIT_CONFLICT:${y}`);for(let[y,p]of e.variables)l(K(e,"variable",y)?.digest===V(te(p)),`DESIGN_VARIABLE_USER_EDIT_CONFLICT:${y}`);if(e.collection&&l(K(e,"collection","colors")?.digest===V(j(e.collection)),"DESIGN_COLLECTION_USER_EDIT_CONFLICT"),Le(e),n){for(let _ of n.parents){let d=_.id===e.scope.page.id?e.scope.page:e.map.get(e.idToKey.get(_.id));l(d&&Array.isArray(_.children)&&Array.isArray(_.wanted)&&_.children.length<=25e3&&_.wanted.length<=25e3,"DESIGN_POSITION_RECOVERY_JOURNAL_CONFLICT"),Ft(d),d.type!=="PAGE"&&o.assertTaskOwned(d,e.ownership),r.set(d.id,d)}let y=Ve(e,n,a);![...y].every(([_,d])=>Ne(r.get(_).children.map(h=>h.id),d))&&n.pending&&a[n.cursor]>n.pending.stage&&(a[n.cursor]=ct(e,n.changes[n.cursor],[n.pending.stage]),y=Ve(e,n,a));for(let[_,d]of y)l(Ne(r.get(_).children.map(h=>h.id),d),"DESIGN_POSITION_RECOVERY_ORDER_CONFLICT")}return{parents:r,stages:a}}async function En(e){l(e.spec.schemaVersion==="1.0","DESIGN_POSITION_RECOVERY_VERSION_UNSUPPORTED");let t=e.payload.positionRecovery;l(["scope_design_plan","scope_design_apply"].includes(e.message.command)&&t&&typeof t=="object"&&!Array.isArray(t)&&Object.keys(t).every(d=>["nodeKeys","planSignature"].includes(d))&&Array.isArray(t.nodeKeys)&&t.nodeKeys.length>=1&&t.nodeKeys.length<=20&&t.nodeKeys.every(d=>typeof d=="string"&&e.map.has(d))&&new Set(t.nodeKeys).size===t.nodeKeys.length,"DESIGN_POSITION_RECOVERY_REQUEST_INVALID");let n=e.message.command==="scope_design_plan",i=t.nodeKeys;l(n?t.planSignature===void 0:e.payload.reconcile===!0&&typeof t.planSignature=="string"&&/^[a-f0-9]{64}$/.test(t.planSignature),"DESIGN_POSITION_RECOVERY_RECONCILE_REQUIRED"),l(He($(e.state)).length<=$t,"DESIGN_POSITION_RECOVERY_LEDGER_BUDGET"),e.positionPrefix=e.order.slice(0,e.state.cursor),e.positionChildren=new Map;for(let d of e.positionPrefix)e.positionChildren.has(d.parentKey)||e.positionChildren.set(d.parentKey,[]),e.positionChildren.get(d.parentKey).push(d);let r=dt(e);await G(e,!1),await z(e),l(r===dt(e),"DESIGN_POSITION_RECOVERY_STALE_WORLD");let a=e.state.positionRecovery,N=we(e,i,a);if(!a){let d=[...N.parents.values()].map(h=>({id:h.id,children:h.children.map(I=>I.id),wanted:h.type==="PAGE"?h.children.filter(I=>!i.includes(e.idToKey.get(I.id))||e.definitions.get(e.idToKey.get(I.id))?.parentKey===null).map(I=>I.id):(K(e,"order",e.idToKey.get(h.id))?be(e,K(e,"order",e.idToKey.get(h.id))):(e.positionChildren.get(e.idToKey.get(h.id))??[]).map(I=>I.key)).map(I=>e.map.get(I).id)}));a={version:1,runId:e.payload.runId,specSignature:e.signature,generationSignature:V(Gt(e.state)),mappingSignature:V(Kt(e)),status:"IN_PROGRESS",cursor:0,pending:null,parents:d,flows:ee(e.scope.page.flowStartingPoints??[]),changes:i.map(h=>{let I=e.map.get(h),O=e.definitions.get(h),k=O.parentKey?e.map.get(O.parentKey):e.scope.root,v={parentId:I.parent.id,x:I.x,y:I.y},B={parentId:k.id,x:O.x,y:O.y},W=H(e,I),se=k.getPluginData(o.specNodeKey)??"";return{key:h,id:I.id,before:v,after:B,digest:I.getPluginData(he),intent:I.getPluginData(Ce),snapshots:[W,{...W,parentKey:se},{...W,parentKey:se,x:B.x},{...W,parentKey:se,x:B.x,y:B.y}].map(V)}})},a.proofSignature=Ut(a)}let y=V({runId:e.payload.runId,specSignature:e.signature,requestedKeys:i,world:dt(e),journal:a}),p=a.status==="COMPLETE",_=(d,h={})=>({status:d,runId:e.payload.runId,specId:e.spec.id,specSignature:e.signature,checkpoint:Oe(e),positionRecovery:{version:1,maxStagesPerRequest:1,status:a.status==="COMPLETE"?"COMPLETE":n?"PLANNED":"IN_PROGRESS",nodeKeys:ee(i),planSignature:y,changes:a.changes.map(({key:I,id:O,before:k,after:v})=>({key:I,id:O,before:ee(k),after:ee(v)})),...n?{}:{acceptedPlanSignature:t.planSignature},...p?{idempotent:!0}:{}},fontSubstitutions:e.substitutions,...h});if(n)return _(e.state.pending?"NEEDS_RECONCILIATION":"PLANNED",{writes:0});if(l(t.planSignature===y,"DESIGN_POSITION_RECOVERY_STALE_SIGNATURE"),a.status==="COMPLETE")return _("IN_PROGRESS",{writes:0,nextAction:"apply-next-batch"});try{if(e.state.positionRecovery||(e.state.positionRecovery=a,e.state.pending={kind:"position-recovery",runId:e.payload.runId,operationId:e.message.operationId},l(He($(e.state)).length<=$t,"DESIGN_POSITION_RECOVERY_LEDGER_BUDGET"),F(e)),a.cursor<a.changes.length){let d=a.cursor,h=a.changes[d],I=e.map.get(h.key);a.pending||(a.pending={index:d,stage:0},F(e));let O=we(e,i,a).stages[d];if(O<3){if(a.pending.stage=O,F(e),we(e,i,a),O===0&&I.parent.id!==h.after.parentId||O===0&&!Ne(I.parent.children.map(v=>v.id),Ve(e,a,a.changes.map((v,B)=>B<=d?B===d?1:3:0)).get(h.after.parentId))){let v=e.map.get(e.idToKey.get(h.after.parentId))??e.scope.page,B=Ve(e,a,a.changes.map((W,se)=>se<=d?se===d?1:3:0)).get(v.id);l(typeof v.insertChild=="function","DESIGN_POSITION_RECOVERY_INSERT_UNAVAILABLE"),E(),v.insertChild(B.indexOf(I.id),I)}O===1&&I.x!==h.after.x&&(E(),I.x=h.after.x),O===2&&I.y!==h.after.y&&(E(),I.y=h.after.y),ct(e,h,[O+1]),we(e,i,a),O+=1,a.pending.stage=O,F(e),we(e,i,a)}O===3&&(a.cursor+=1,a.pending=null,F(e));let k=_("IN_PROGRESS",{nextAction:"plan"});return k.positionRecovery.checkpointed=!0,k}return Z(e),we(e,i,a),a.status="COMPLETE",e.state.pending=null,F(e),Z(e),we(e,i,a),_("IN_PROGRESS",{nextAction:"apply-next-batch"})}catch(d){return e.state=ge(e.scope.root,e.ledgerKey),a=e.state.positionRecovery??a,_("PARTIAL_FAILURE",{error:String(d.message).slice(0,500),nextAction:"plan",replay:"PROHIBITED_UNTIL_READBACK_RECONCILIATION"})}}async function hn(e){l(!g,"DESIGN_RUNTIME_BUSY"),g=!0;try{if(["scope_design_text_plan","scope_design_text_apply"].includes(e.command))return await un(e);let t=await C(e);if(["scope_design_assets_plan","scope_design_asset_stage","scope_design_asset_commit"].includes(e.command)){l(t.spec.schemaVersion==="1.1","DESIGN_ASSET_VERSION_REQUIRED"),c=t;let i={...L(t),assetKey:t.payload.assetKey,offset:t.payload.offset,dataBase64:t.payload.dataBase64,chunkSha256:t.payload.chunkSha256},r=await U[e.command==="scope_design_assets_plan"?"plan":e.command==="scope_design_asset_stage"?"stage":"commit"](i);if(e.command==="scope_design_asset_commit"&&r.status==="COMMITTED"){o.assertInScope(t.scope.root,t.scope),o.assertTrustedOwnership(t.ownership,e.operationId);let a=t.spec.assets.find(y=>y.key===t.payload.assetKey),N=K(t,"image",a.key);N?l(N.hash===r.imageHash&&N.signature===V(a),`DESIGN_ASSET_CONFLICT:${a.key}`):T(t.scope.root,M(t,"image",a.key),{hash:r.imageHash,signature:V(a)})}return{...r,runId:t.payload.runId,specId:t.spec.id}}if(t.payload.positionRecovery!==void 0)return await En(t);if(t.payload.adoptNativeFlow!==void 0&&l(e.command==="scope_design_apply"&&t.payload.reconcile===!0&&t.state.pending?.kind==="reactions","DESIGN_NATIVE_FLOW_ADOPTION_INVALID"),await G(t,e.command==="scope_design_apply"),await z(t),e.command==="scope_design_apply")for(let i of t.spec.assets??[])i.dataBase64||l(t.images.has(i.key),`DESIGN_ASSET_NOT_STAGED:${i.key}`);if(e.command==="scope_design_audit")return fn(t,await Me(t));if(t.state.pending?.kind==="node"&&t.definitions.get(t.state.pending.key)?.type==="COMPONENT_SET"&&!t.map.has(t.state.pending.key)){if(t.payload.reconcile===!0)throw new Error(`DESIGN_NEEDS_RECONCILIATION:node:${t.state.pending.key}`);return{status:"NEEDS_RECONCILIATION",writes:0,runId:t.payload.runId,specId:t.spec.id,checkpoint:Oe(t),nextAction:"audit"}}if(Z(t),e.command==="scope_design_plan")return{status:t.state.pending?"NEEDS_RECONCILIATION":"PLANNED",writes:0,specId:t.spec.id,specSignature:t.signature,runId:t.payload.runId,checkpoint:Oe(t),fontSubstitutions:t.substitutions,globalResources:{textStyles:t.spec.textStyles?.length??0,variables:t.spec.variables?.length??0,requiresExplicitAuthorization:!!(t.spec.textStyles?.length||t.spec.variables?.length)},timerUnit:t.timerUnit,playback:"NOT VERIFIED"};if(e.command==="scope_design_export_png"){let i=t.map.get(t.payload.nodeKey);l(i,"DESIGN_EXPORT_NODE_MISSING"),o.assertTaskOwnedSubtree(i,t.ownership);let r=t.payload.scale??1;l(Number.isFinite(r)&&r>=1&&r<=4,"DESIGN_EXPORT_SCALE_INVALID");let a=await i.exportAsync({format:"PNG",constraint:{type:"SCALE",value:r}});return{status:"PASS",writes:0,runId:t.payload.runId,specId:t.spec.id,nodeKey:t.payload.nodeKey,width:i.width,height:i.height,scale:r,bytesBase64:zn(a),sha256:qe(Ze(a)),fileIdentity:{fileKey:s.fileKey}}}l(e.command==="scope_design_apply","DESIGN_COMMAND_INVALID");let n=t.payload.batchSize??100;if(l(Number.isInteger(n)&&n>=1&&n<=500,"DESIGN_BATCH_SIZE_INVALID"),(t.spec.textStyles?.length||t.spec.variables?.length)&&l(t.payload.allowGlobalResources===!0,"DESIGN_GLOBAL_RESOURCES_AUTH_REQUIRED"),t.state.pending){if(t.payload.reconcile!==!0)return{status:"NEEDS_RECONCILIATION",runId:t.payload.runId,specId:t.spec.id,checkpoint:Oe(t),nextAction:"audit"};await cn(t)}if(t.state.complete){let i=await Me(t);return l(i.status==="PASS",`DESIGN_COMPLETED_DRIFT:${i.errors.join(",")}`),{status:"COMPLETE",runId:t.payload.runId,specId:t.spec.id,checkpoint:Oe(t),nextAction:"audit",idempotent:!0}}t.scope.root.type!=="PAGE"&&o.assertTaskOwned(t.scope.root,t.ownership),(t.spec.flows?.length??0)>0&&l(t.scope.root.type==="PAGE","DESIGN_FLOW_REQUIRES_PAGE_SCOPE"),s.currentPage.id!==t.scope.page.id&&await s.setCurrentPageAsync(t.scope.page);try{Le(t),F(t),await u(t);let i=0;for(let r of t.order)if(!t.map.has(r.key)&&(await oe(t,r),i+=1,i>=n))break;return t.map.size===t.spec.nodes.length&&i<n&&await dn(t,n-i),{status:t.state.complete?"COMPLETE":"IN_PROGRESS",runId:t.payload.runId,specId:t.spec.id,checkpoint:Oe(t),nextAction:t.state.complete?"audit":"apply-next-batch",fontSubstitutions:t.substitutions,nodeMap:Object.fromEntries([...t.map].map(([r,a])=>[r,a.id]))}}catch(i){return{status:"PARTIAL_FAILURE",runId:t.payload.runId,specId:t.spec.id,checkpoint:Oe(t),nextAction:"audit",error:String(i.message).slice(0,500),replay:"PROHIBITED_UNTIL_READBACK_RECONCILIATION",...i.readbackMismatch?{readbackMismatch:i.readbackMismatch}:{}}}}finally{g=!1}}return{execute:hn}}return On(Xn);})();
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
  "scope_design_text_plan", "scope_design_text_apply",
  "scope_design_assets_plan", "scope_design_asset_stage", "scope_design_asset_commit",
]);
const READ_COMMANDS = new Set(["status", "read_document", "scope_read_node"]);
const SCOPED_MUTATIONS = new Set(["scope_create_frame", "scope_update_frame", "scope_delete_node", "scope_set_prototype",
  "scope_create_foreign_fixture", "scope_delete_foreign_fixture",
  "scope_design_plan", "scope_design_apply", "scope_design_audit", "scope_design_export_png",
  "scope_design_text_plan", "scope_design_text_apply",
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
