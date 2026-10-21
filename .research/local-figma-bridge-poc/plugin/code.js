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
var BridgeDesignRuntime=(()=>{var ke=Object.defineProperty;var Ft=Object.getOwnPropertyDescriptor;var Gt=Object.getOwnPropertyNames;var Ut=Object.prototype.hasOwnProperty;var Ht=(o,s,a)=>s in o?ke(o,s,{enumerable:!0,configurable:!0,writable:!0,value:a}):o[s]=a;var Bt=(o,s)=>{for(var a in s)ke(o,a,{get:s[a],enumerable:!0})},Vt=(o,s,a,l)=>{if(s&&typeof s=="object"||typeof s=="function")for(let p of Gt(s))!Ut.call(o,p)&&p!==a&&ke(o,p,{get:()=>s[p],enumerable:!(l=Ft(s,p))||l.enumerable});return o};var zt=o=>Vt(ke({},"__esModule",{value:!0}),o);var J=(o,s,a)=>Ht(o,typeof s!="symbol"?s+"":s,a);var an={};Bt(an,{canonical:()=>$,createDesignRuntime:()=>rn,designSignature:()=>G,utf8ToBytes:()=>Le});var Wt=o=>o/2**32|0,Yt=o=>o>>>0;function ut(o,s,a,l){let p=Wt(a),O=Yt(a);o.setUint32(s,l?O:p,l),o.setUint32(s+4,l?p:O,l)}function ht(o){return o instanceof Uint8Array||ArrayBuffer.isView(o)&&o.constructor.name==="Uint8Array"&&"BYTES_PER_ELEMENT"in o&&o.BYTES_PER_ELEMENT===1}var Ve=o=>o?`"${o}" `:"";function qt(o,s=""){if(typeof o!="number")throw new TypeError(Ve(s)+"expected number, got "+typeof o);if(!Number.isSafeInteger(o)||o<0)throw new RangeError(Ve(s)+"expected integer >= 0, got "+o);return o}function Ke(o,s,a=""){if(ht(o)&&(s===void 0||o.length===s))return o;s!==void 0&&qt(s,"length");let l=ht(o),p=s!==void 0?` of length ${s}`:"",O=l?`length=${o.length}`:`type=${typeof o}`,m=Ve(a)+"expected Uint8Array"+p+", got "+O;throw l?new RangeError(m):new TypeError(m)}var Xt=(o,s)=>{if(o===null||typeof o!="object"||Array.isArray(o))throw new TypeError((s==="object"?"":`"${s}" `)+"expected object, got type="+typeof o)},gt=(o,s)=>{Xt(o,s);let a=Object.getPrototypeOf(o);if(a!==Object.prototype&&a!==null)throw new TypeError(`"${s}" expected plain object`);if(Object.hasOwn(o,"__proto__"))throw new TypeError(`"${s}.__proto__" is not allowed`)};function ze(o,s=!0){if(o.destroyed)throw new Error("hash was destroyed");if(s&&o.finished)throw new Error("digest() was already called")}function Et(o,s){Ke(o,void 0,"output");let a=s.outputLen;if(!(o.length>=a))throw new RangeError('"output" expected length >= '+a)}function We(...o){for(let s=0;s<o.length;s++)o[s].fill(0)}function $e(o){return new DataView(o.buffer,o.byteOffset,o.byteLength)}function de(o,s){return o<<32-s|o>>>s}var xt=typeof Uint8Array.from([]).toHex=="function"&&typeof Uint8Array.fromHex=="function",Qt=Array.from({length:256},(o,s)=>s.toString(16).padStart(2,"0"));function Ye(o){if(Ke(o),xt)return o.toHex();let s="";for(let a=0;a<o.length;a++)s+=Qt[o[a]];return s}function Jt(o,s,a="opts"){return gt(o,"defaults"),s!==void 0&&gt(s,a),Object.assign(Object.create(null),o,s)}function It(o,s={}){if(typeof o!="function")throw new TypeError('"hashCons" expected function, got type='+typeof o);s=Jt({},s,"info");let a=(p,O)=>o(O).update(p).digest(),l=o(void 0);return a.outputLen=l.outputLen,a.blockLen=l.blockLen,a.canXOF=l.canXOF,a.create=p=>o(p),Object.assign(a,s),Object.freeze(a)}var Nt=o=>({oid:Uint8Array.from([6,9,96,134,72,1,101,3,4,2,o])});function St(o,s,a){return o&s^~o&a}function mt(o,s,a){return o&s^o&a^s&a}var ve=class{constructor(s,a,l,p){J(this,"blockLen");J(this,"outputLen");J(this,"canXOF",!1);J(this,"padOffset");J(this,"isLE");J(this,"buffer");J(this,"view");J(this,"finished",!1);J(this,"length",0);J(this,"pos",0);J(this,"destroyed",!1);this.blockLen=s,this.outputLen=a,this.padOffset=l,this.isLE=p,this.buffer=new Uint8Array(s),this.view=$e(this.buffer)}update(s){ze(this),Ke(s);let{view:a,buffer:l,blockLen:p}=this,O=s.length,m=!1;for(let T=0;T<O;){let C=Math.min(p-this.pos,O-T);if(C===p){let b=$e(s);for(;p<=O-T;T+=p)this.process(b,T);m=!0;continue}l.set(T===0&&C===O?s:s.subarray(T,T+C),this.pos),this.pos+=C,T+=C,this.pos===p&&(this.process(a,0),this.pos=0,m=!0)}return this.length+=s.length,m&&this.roundClean(),this}digestInto(s){ze(this),Et(s,this),this.finished=!0;let{buffer:a,view:l,blockLen:p,isLE:O}=this,{pos:m}=this;a[m++]=128,a.fill(0,m),this.padOffset>p-m&&(this.process(l,0),a.fill(0)),ut(l,p-8,this.length*8,O),this.process(l,0),this.roundClean();let T=s===a?l:$e(s),C=this.outputLen,b=C/4,v=this.get();if(C%4||b>v.length)throw new Error("invalid outputLen");for(let A=0;A<b;A++)T.setUint32(4*A,v[A],O)}digest(){let{buffer:s,outputLen:a}=this;this.digestInto(s);let l=s.slice(0,a);return this.destroy(),l}_cloneIntoMeta(s){let{buffer:a,length:l,finished:p,destroyed:O,pos:m}=this;return s.destroyed=O,s.finished=p,s.length=l,s.pos=m,m&&s.buffer.set(a),s}clone(){return this._cloneInto()}},_t=Uint32Array.from([1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225]);var Zt=Uint32Array.from([1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298]),he=new Uint32Array(64),qe=class extends ve{constructor(a,l){super(64,a,8,!1);J(this,"A",0);J(this,"B",0);J(this,"C",0);J(this,"D",0);J(this,"E",0);J(this,"F",0);J(this,"G",0);J(this,"H",0);this.A=l[0]|0,this.B=l[1]|0,this.C=l[2]|0,this.D=l[3]|0,this.E=l[4]|0,this.F=l[5]|0,this.G=l[6]|0,this.H=l[7]|0}get(){let{A:a,B:l,C:p,D:O,E:m,F:T,G:C,H:b}=this;return[a,l,p,O,m,T,C,b]}set(a,l,p,O,m,T,C,b){this.A=a|0,this.B=l|0,this.C=p|0,this.D=O|0,this.E=m|0,this.F=T|0,this.G=C|0,this.H=b|0}_cloneInto(a){return(a||(a=new this.constructor)).set(...this.get()),this._cloneIntoMeta(a)}process(a,l){for(let k=0;k<16;k++,l+=4)he[k]=a.getUint32(l,!1);for(let k=16;k<64;k++){let w=he[k-15],M=he[k-2],Y=de(w,7)^de(w,18)^w>>>3,L=de(M,17)^de(M,19)^M>>>10;he[k]=L+he[k-7]+Y+he[k-16]|0}let{A:p,B:O,C:m,D:T,E:C,F:b,G:v,H:A}=this;for(let k=0;k<64;k++){let w=de(C,6)^de(C,11)^de(C,25),M=A+w+St(C,b,v)+Zt[k]+he[k]|0,L=(de(p,2)^de(p,13)^de(p,22))+mt(p,O,m)|0;A=v,v=b,b=C,C=T+M|0,T=m,m=O,O=p,p=M+L|0}p=p+this.A|0,O=O+this.B|0,m=m+this.C|0,T=T+this.D|0,C=C+this.E|0,b=b+this.F|0,v=v+this.G|0,A=A+this.H|0,this.set(p,O,m,T,C,b,v,A)}roundClean(){We(he)}destroy(){this.destroyed=!0,this.set(0,0,0,0,0,0,0,0),We(this.buffer)}},Xe=class extends qe{constructor(){super(32,_t)}};var xe=It(()=>new Xe,Nt(1));function Ot(o){if(typeof o!="string"||!o.length||o.length%4!==0)return!1;let s=o.length-(o.endsWith("==")?2:o.endsWith("=")?1:0);for(let a=0;a<s;a++){let l=o.charCodeAt(a);if(!(l>=65&&l<=90||l>=97&&l<=122||l>=48&&l<=57||l===43||l===47))return!1}return!0}var Re=Object.freeze({nodes:25e3,assets:2e3,reactions:3e4,assetBytes:20*1024*1024,totalAssetBytes:80*1024*1024}),Me=class extends Error{constructor(s){super(`Invalid DesignSpec: ${s.slice(0,5).map(a=>`${a.path}: ${a.message}`).join("; ")}`),this.name="DesignSpecError",this.issues=s}},jt=["FRAME","TEXT","RECTANGLE","ELLIPSE","VECTOR","COMPONENT","INSTANCE"],en=["fills","strokes","strokeWeight","strokeAlign","dashPattern","effects","cornerRadius","opacity","clipsContent","overflowDirection","layoutPositioning","isFixed","visible","characters","fontName","fontSize","fontWeight","lineHeight","letterSpacing","textAlignHorizontal","textAutoResize","textStyleKey","componentKey","vectorPaths","overrides"],Tt=new Set(["__proto__","constructor","prototype"]);function bt(o){let s=[],a=(E,f)=>{s.length<100&&s.push({path:E,message:f})},l=(E,f,u)=>{if(!E||typeof E!="object"||Array.isArray(E)||![Object.prototype,null].includes(Object.getPrototypeOf(E)))return a(f,"Expected plain object"),!1;for(let K of Object.keys(E))(!u.includes(K)||Tt.has(K))&&a(`${f}.${K}`,"Unknown property");return!0},p=(E,f,u=256,K=!1)=>{(typeof E!="string"||!K&&!E.length||E.length>u||E.includes("\0"))&&a(f,`Expected ${K?"":"nonempty "}string, maximum ${u} characters`)},O=(E,f)=>{p(E,f,160),typeof E=="string"&&(!/^[A-Za-z0-9][A-Za-z0-9_.:/-]*$/.test(E)||Tt.has(E))&&a(f,"Invalid stable key")},m=(E,f,u=-1e7,K=1e7)=>{(typeof E!="number"||!Number.isFinite(E)||E<u||E>K)&&a(f,`Expected finite number in [${u}, ${K}]`)},T=(E,f,u)=>{u.includes(E)||a(f,`Expected one of ${u.join(", ")}`)},C=(E,f)=>{typeof E!="boolean"&&a(f,"Expected boolean")},b=(E,f,u)=>!Array.isArray(E)||E.length>u?(a(f,`Expected array, maximum ${u} entries`),[]):E,v=(E,f)=>{l(E,f,["family","style"])&&(p(E.family,`${f}.family`,128),p(E.style,`${f}.style`,128))},A=(E,f,u=!1)=>{if(l(E,f,u?["r","g","b","a"]:["r","g","b"]))for(let K of u?["r","g","b","a"]:["r","g","b"])m(E[K],`${f}.${K}`,0,1)},k=(E,f,u=!1)=>{l(E,f,["unit","value"])&&(T(E.unit,`${f}.unit`,u?["PIXELS","PERCENT","AUTO"]:["PIXELS","PERCENT"]),E.unit!=="AUTO"?m(E.value,`${f}.value`,u?0:-1e4,1e5):E.value!==void 0&&m(E.value,`${f}.value`,0,1e5))};if(!l(o,"$",["schemaVersion","id","name","source","nodes","assets","textStyles","variables","reactions","flows","fontPolicy"]))throw new Me(s);if(T(o.schemaVersion,"$.schemaVersion",["1.0"]),O(o.id,"$.id"),p(o.name,"$.name",512),o.source!==void 0&&l(o.source,"$.source",["revision","capturedAt","adapter","url"])){for(let E of["revision","adapter"])o.source[E]!==void 0&&p(o.source[E],`$.source.${E}`,256);o.source.capturedAt!==void 0&&(p(o.source.capturedAt,"$.source.capturedAt",64),Number.isFinite(Date.parse(o.source.capturedAt))||a("$.source.capturedAt","Invalid timestamp")),o.source.url!==void 0&&(p(o.source.url,"$.source.url",2048),(typeof o.source.url!="string"||!/^https?:\/\/(?:\[[a-fA-F0-9:]+\]|[A-Za-z0-9.-]+)(?::[0-9]{1,5})?(?:\/[^\s?#\\]*)?$/.test(o.source.url))&&a("$.source.url","Only HTTP(S) source URL without credentials, query or fragment is allowed"))}o.fontPolicy!==void 0&&l(o.fontPolicy,"$.fontPolicy",["allowFallback","fallback"])&&(C(o.fontPolicy.allowFallback,"$.fontPolicy.allowFallback"),o.fontPolicy.fallback!==void 0&&v(o.fontPolicy.fallback,"$.fontPolicy.fallback"),o.fontPolicy.allowFallback&&!o.fontPolicy.fallback&&a("$.fontPolicy.fallback","Fallback font required when enabled"));let w={nodes:new Map,assets:new Map,variables:new Map,textStyles:new Map},M=(E,f)=>b(o[E]??[],`$.${E}`,f).map((u,K)=>{let D=`$.${E}[${K}]`;return u&&typeof u=="object"&&(O(u.key,`${D}.key`),w[E].has(u.key)&&a(`${D}.key`,"Duplicate key"),w[E].set(u.key,u)),[u,D]}),Y=0;for(let[E,f]of M("assets",Re.assets))if(l(E,f,["key","mimeType","dataBase64"])&&(T(E.mimeType,`${f}.mimeType`,["image/png","image/jpeg","image/webp"]),p(E.dataBase64,`${f}.dataBase64`,Math.ceil(Re.assetBytes/3)*4),typeof E.dataBase64=="string")){Ot(E.dataBase64)||a(`${f}.dataBase64`,"Invalid base64"),Y+=Math.floor(E.dataBase64.length*3/4);let u={"image/png":/^iVBORw0KGgo/,"image/jpeg":/^\/9j\//,"image/webp":/^UklGR/}[E.mimeType];u&&!u.test(E.dataBase64)&&a(`${f}.dataBase64`,"Image signature does not match MIME type")}Y>Re.totalAssetBytes&&a("$.assets","Total asset byte budget exceeded");for(let[E,f]of M("variables",5e3))l(E,f,["key","name","value"])&&(p(E.name,`${f}.name`,256),A(E.value,`${f}.value`,!0));for(let[E,f]of M("textStyles",5e3))l(E,f,["key","name","fontName","fontSize","lineHeight","letterSpacing"])&&(p(E.name,`${f}.name`,256),v(E.fontName,`${f}.fontName`),m(E.fontSize,`${f}.fontSize`,.1,1e4),E.lineHeight!==void 0&&k(E.lineHeight,`${f}.lineHeight`,!0),E.letterSpacing!==void 0&&k(E.letterSpacing,`${f}.letterSpacing`));let L=M("nodes",Re.nodes);L.length||a("$.nodes","At least one node required");let U=(E,f,u)=>{O(f,u),w[E].has(f)||a(u,`Unknown ${E} reference`)},X=(E,f,u=!0)=>{for(let[K,D]of b(E,f,16).entries()){let P=`${f}[${K}]`;if(l(D,P,["type","color","opacity","variableKey","assetKey","scaleMode","gradientStops","gradientTransform"])){if(T(D.type,`${P}.type`,u?["SOLID","IMAGE","GRADIENT_LINEAR"]:["SOLID"]),D.opacity!==void 0&&m(D.opacity,`${P}.opacity`,0,1),D.type==="SOLID")A(D.color,`${P}.color`),D.variableKey!==void 0&&U("variables",D.variableKey,`${P}.variableKey`),(D.assetKey!==void 0||D.scaleMode!==void 0)&&a(P,"Image fields require IMAGE paint");else if(D.type==="IMAGE")U("assets",D.assetKey,`${P}.assetKey`),D.scaleMode!==void 0&&T(D.scaleMode,`${P}.scaleMode`,["FILL","FIT","CROP","TILE"]),(D.color!==void 0||D.variableKey!==void 0)&&a(P,"Solid fields require SOLID paint");else if(D.type==="GRADIENT_LINEAR"){["color","variableKey","assetKey","scaleMode"].some(B=>D[B]!==void 0)&&a(P,"Solid and image fields are invalid on gradients");let Q=b(D.gradientStops,`${P}.gradientStops`,16);Q.length<2&&a(`${P}.gradientStops`,"Expected at least two color stops");for(let[B,te]of Q.entries()){let oe=`${P}.gradientStops[${B}]`;l(te,oe,["position","color"])&&(m(te.position,`${oe}.position`,0,1),A(te.color,`${oe}.color`,!0),B&&te.position<Q[B-1]?.position&&a(`${oe}.position`,"Color stops must be nondecreasing"))}let x=b(D.gradientTransform,`${P}.gradientTransform`,2);x.length!==2&&a(`${P}.gradientTransform`,"Expected a two by three transform");for(let[B,te]of x.entries()){let oe=b(te,`${P}.gradientTransform[${B}]`,3);oe.length!==3&&a(`${P}.gradientTransform[${B}]`,"Expected three transform values");for(let[fe,Ie]of oe.entries())m(Ie,`${P}.gradientTransform[${B}][${fe}]`,-1e4,1e4)}x.length===2&&x.every(B=>Array.isArray(B)&&B.length===3&&B.every(Number.isFinite))&&Math.abs(x[0][0]*x[1][1]-x[0][1]*x[1][0])<=1e-8&&a(`${P}.gradientTransform`,"Transform must be invertible")}D.type!=="GRADIENT_LINEAR"&&(D.gradientStops!==void 0||D.gradientTransform!==void 0)&&a(P,"Gradient fields require GRADIENT_LINEAR paint")}}};for(let[E,f]of L)if(l(E,f,["key","type","name","parentKey","x","y","width","height","props"])){T(E.type,`${f}.type`,jt),E.name!==void 0&&p(E.name,`${f}.name`,512);for(let K of["x","y"])m(E[K],`${f}.${K}`);for(let K of["width","height"])m(E[K],`${f}.${K}`,.01,1e5);E.parentKey!==null?(U("nodes",E.parentKey,`${f}.parentKey`),["FRAME","COMPONENT"].includes(w.nodes.get(E.parentKey)?.type)||a(`${f}.parentKey`,"Parent must be FRAME or COMPONENT")):["FRAME","COMPONENT"].includes(E.type)||a(f,"Root node must be FRAME or COMPONENT");let u=E.props??{};if(!l(u,`${f}.props`,en))continue;for(let K of["visible","clipsContent","isFixed"])u[K]!==void 0&&C(u[K],`${f}.props.${K}`);u.clipsContent!==void 0&&!["FRAME","COMPONENT","INSTANCE"].includes(E.type)&&a(`${f}.props.clipsContent`,"Clipping requires FRAME, COMPONENT or INSTANCE"),u.cornerRadius!==void 0&&!["FRAME","COMPONENT","INSTANCE","RECTANGLE"].includes(E.type)&&a(`${f}.props.cornerRadius`,"Corner radius requires a rectangular node"),u.isFixed&&(E.parentKey===null||!["HORIZONTAL","VERTICAL","BOTH"].includes(w.nodes.get(E.parentKey)?.props?.overflowDirection))&&a(`${f}.props.isFixed`,"Fixed child requires a scrolling parent");for(let K of["strokeWeight","cornerRadius"])u[K]!==void 0&&m(u[K],`${f}.props.${K}`,0,1e5);if(u.opacity!==void 0&&m(u.opacity,`${f}.props.opacity`,0,1),u.layoutPositioning!==void 0&&T(u.layoutPositioning,`${f}.props.layoutPositioning`,["AUTO","ABSOLUTE"]),u.overflowDirection!==void 0&&(T(u.overflowDirection,`${f}.props.overflowDirection`,["NONE","HORIZONTAL","VERTICAL","BOTH"]),["FRAME","COMPONENT"].includes(E.type)||a(f,"Overflow requires FRAME or COMPONENT")),u.fills!==void 0&&X(u.fills,`${f}.props.fills`),u.strokes!==void 0&&X(u.strokes,`${f}.props.strokes`,!1),u.strokeAlign!==void 0&&T(u.strokeAlign,`${f}.props.strokeAlign`,["INSIDE","OUTSIDE","CENTER"]),u.dashPattern!==void 0){let K=b(u.dashPattern,`${f}.props.dashPattern`,16);K.length||a(`${f}.props.dashPattern`,"Expected at least one dash length");for(let[D,P]of K.entries())m(P,`${f}.props.dashPattern[${D}]`,0,1e4)}if(u.effects!==void 0)for(let[K,D]of b(u.effects,`${f}.props.effects`,16).entries()){let P=`${f}.props.effects[${K}]`;l(D,P,["type","color","offset","radius","spread","visible"])&&(T(D.type,`${P}.type`,["DROP_SHADOW","INNER_SHADOW"]),A(D.color,`${P}.color`,!0),l(D.offset,`${P}.offset`,["x","y"])&&(m(D.offset.x,`${P}.offset.x`,-1e5,1e5),m(D.offset.y,`${P}.offset.y`,-1e5,1e5)),m(D.radius,`${P}.radius`,0,1e5),D.spread!==void 0&&m(D.spread,`${P}.spread`,-1e5,1e5),D.visible!==void 0&&C(D.visible,`${P}.visible`))}if(u.overrides!==void 0){E.type!=="INSTANCE"&&a(`${f}.props.overrides`,"Overrides require INSTANCE");let K=new Set;for(let[D,P]of b(u.overrides,`${f}.props.overrides`,1e3).entries()){let Q=`${f}.props.overrides[${D}]`;if(!l(P,Q,["sourceKey","characters","visible","fills"]))continue;U("nodes",P.sourceKey,`${Q}.sourceKey`),K.has(P.sourceKey)&&a(Q,"Duplicate override source"),K.add(P.sourceKey);let x=w.nodes.get(P.sourceKey),B=x&&w.nodes.get(x.parentKey),te=new Set,oe=!1;for(;B&&!te.has(B.key);){if(B.key===u.componentKey){oe=!0;break}te.add(B.key),B=w.nodes.get(B.parentKey)}oe||a(`${Q}.sourceKey`,"Override source must be a descendant of the referenced component"),P.characters!==void 0&&(x?.type!=="TEXT"&&a(`${Q}.characters`,"Text override requires TEXT source"),p(P.characters,`${Q}.characters`,1e5,!0)),P.visible!==void 0&&C(P.visible,`${Q}.visible`),P.fills!==void 0&&X(P.fills,`${Q}.fills`),Object.keys(P).length<2&&a(Q,"Override must change characters, visible or fills")}}for(let K of["characters","fontName","fontSize","fontWeight","lineHeight","letterSpacing","textAlignHorizontal","textAutoResize","textStyleKey"])u[K]!==void 0&&E.type!=="TEXT"&&a(`${f}.props.${K}`,"Text-only property");if(E.type==="TEXT"){if(p(u.characters,`${f}.props.characters`,1e5,!0),!u.fontName&&!u.textStyleKey&&a(f,"Text requires fontName or textStyleKey"),u.fontName!==void 0&&v(u.fontName,`${f}.props.fontName`),u.fontSize!==void 0&&m(u.fontSize,`${f}.props.fontSize`,.1,1e4),u.fontWeight!==void 0){T(u.fontWeight,`${f}.props.fontWeight`,[100,200,300,400,500,600,700,800,900]);let K={100:"thin",200:"extralight",300:"light",400:"regular",500:"medium",600:"semibold",700:"bold",800:"extrabold",900:"black"}[u.fontWeight];((u.fontName??w.textStyles.get(u.textStyleKey)?.fontName)?.style?.toLowerCase().replace(/[ -]/g,"").replace(/italic$/,"")||"regular")!==K&&a(`${f}.props.fontWeight`,"fontWeight must match the explicit fontName.style; the font style controls Figma weight")}u.lineHeight!==void 0&&k(u.lineHeight,`${f}.props.lineHeight`,!0),u.letterSpacing!==void 0&&k(u.letterSpacing,`${f}.props.letterSpacing`),u.textAlignHorizontal!==void 0&&T(u.textAlignHorizontal,`${f}.props.textAlignHorizontal`,["LEFT","CENTER","RIGHT","JUSTIFIED"]),u.textAutoResize!==void 0&&T(u.textAutoResize,`${f}.props.textAutoResize`,["NONE","HEIGHT","WIDTH_AND_HEIGHT"]),u.textStyleKey!==void 0&&U("textStyles",u.textStyleKey,`${f}.props.textStyleKey`)}if(E.type==="INSTANCE"?(U("nodes",u.componentKey,`${f}.props.componentKey`),w.nodes.get(u.componentKey)?.type!=="COMPONENT"&&a(f,"Instance must reference COMPONENT")):u.componentKey!==void 0&&a(f,"componentKey requires INSTANCE"),u.vectorPaths!==void 0){E.type!=="VECTOR"&&a(f,"vectorPaths requires VECTOR");for(let[K,D]of b(u.vectorPaths,`${f}.props.vectorPaths`,1e3).entries()){let P=`${f}.props.vectorPaths[${K}]`;l(D,P,["windingRule","data"])&&(T(D.windingRule,`${P}.windingRule`,["NONZERO","EVENODD"]),p(D.data,`${P}.data`,2e5),typeof D.data=="string"&&(!/^[Mm]/.test(D.data.trim())||!/^[MmZzLlHhVvCcSsQqTtAaEe0-9+.,\s-]+$/.test(D.data))&&a(P,"Only SVG path command data allowed"))}}}if(!s.length)try{Qe(o)}catch(E){a("$.nodes",E.message)}let z=new Set;for(let[E,f]of b(o.reactions??[],"$.reactions",Re.reactions).entries()){let u=`$.reactions[${E}]`;if(l(f,u,["sourceKey","destinationKey","trigger"])&&(U("nodes",f.sourceKey,`${u}.sourceKey`),U("nodes",f.destinationKey,`${u}.destinationKey`),(w.nodes.get(f.destinationKey)?.type!=="FRAME"||w.nodes.get(f.destinationKey)?.parentKey!==null)&&a(u,"Destination must be a root FRAME"),l(f.trigger,`${u}.trigger`,["type","delaySeconds"]))){T(f.trigger.type,`${u}.trigger.type`,["ON_CLICK","AFTER_TIMEOUT"]),f.trigger.type==="AFTER_TIMEOUT"?m(f.trigger.delaySeconds,`${u}.trigger.delaySeconds`,.001,3600):f.trigger.delaySeconds!==void 0&&a(u,"delaySeconds only applies to AFTER_TIMEOUT");let K=`${f.sourceKey}:${f.trigger.type}`;z.has(K)&&a(u,"Duplicate source and trigger"),z.add(K)}}let se=new Set;for(let[E,f]of b(o.flows??[],"$.flows",1e3).entries()){let u=`$.flows[${E}]`;l(f,u,["nodeKey","name"])&&(U("nodes",f.nodeKey,`${u}.nodeKey`),p(f.name,`${u}.name`,256),(w.nodes.get(f.nodeKey)?.parentKey!==null||w.nodes.get(f.nodeKey)?.type!=="FRAME")&&a(u,"Flow start must be a root FRAME"),se.has(f.nodeKey)&&a(u,"Duplicate flow start"),se.add(f.nodeKey))}if(s.length)throw new Me(s);return o}function Qe(o){let s=new Map(o.nodes.map(A=>[A.key,A])),a=new Map,l=new Map,p=new Map(o.nodes.filter(A=>A.type==="COMPONENT").map(A=>[A.key,new Set]));for(let A of o.nodes.filter(k=>k.type==="INSTANCE")){let k=new Set,w=s.get(A.parentKey);for(;w;){if(k.has(w.key))throw new Error("Cyclic parent/component dependency");k.add(w.key),w.type==="COMPONENT"&&p.get(w.key).add(A.props?.componentKey),w=s.get(w.parentKey)}}let O=new Set,m=new Set;function T(A){if(!O.has(A)){if(m.has(A))throw new Error("Cyclic component instance dependency");m.add(A);for(let k of p.get(A)??[])T(k);m.delete(A),O.add(A)}}for(let A of p.keys())T(A);let C=new Map;for(let A of o.nodes){let k=s.get(A.parentKey),w=new Set;for(;k;){if(w.has(k.key))throw new Error("Cyclic parent/component dependency");w.add(k.key),k.type==="COMPONENT"&&(C.has(k.key)||C.set(k.key,[]),C.get(k.key).push(A.key)),k=s.get(k.parentKey)}}for(let A of o.nodes){let k=[...new Set([A.parentKey,A.props?.componentKey,...C.get(A.props?.componentKey)??[]].filter(Boolean))];a.set(A.key,k.length);for(let w of k){if(!s.has(w))throw new Error(`Unknown dependency ${w}`);l.has(w)||l.set(w,[]),l.get(w).push(A.key)}}let b=o.nodes.filter(A=>a.get(A.key)===0),v=[];for(let A=0;A<b.length;A++){let k=b[A];v.push(k);for(let w of l.get(k.key)??[])a.set(w,a.get(w)-1),a.get(w)===0&&b.push(s.get(w))}if(v.length!==o.nodes.length)throw new Error("Cyclic parent/component dependency");return v}var Je=/[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y,At={M:2,L:2,H:1,V:1,C:6,S:4,Q:4,T:2,A:7},Z=()=>{throw new Error("DESIGN_VECTOR_PATH_INVALID")};function tn(o,s,a,l,p,O,m,T,C){if(o===T&&s===C)return[];if(a=Math.abs(a),l=Math.abs(l),a===0||l===0)return[["L",T,C]];let b=p%360*Math.PI/180,v=Math.cos(b),A=Math.sin(b),k=(o-T)/2,w=(s-C)/2,M=v*k+A*w,Y=-A*k+v*w,L=M/a,U=Y/l,X=Math.hypot(L,U);(!Number.isFinite(X)||X===0)&&Z(),X>1&&(a*=X,l*=X,L=M/a,U=Y/l);let z=L*L+U*U;(!Number.isFinite(a)||!Number.isFinite(l)||!Number.isFinite(z)||z===0)&&Z();let se=(O===m?-1:1)*Math.sqrt(Math.max(0,(1-z)/z)),E=se*a*U,f=-se*l*L,u=v*E-A*f+(o+T)/2,K=A*E+v*f+(s+C)/2,D=[(M-E)/a,(Y-f)/l],P=[(-M-E)/a,(-Y-f)/l],Q=Math.atan2(D[1],D[0]),x=Math.atan2(D[0]*P[1]-D[1]*P[0],D[0]*P[0]+D[1]*P[1]);(!Number.isFinite(Q)||!Number.isFinite(x))&&Z(),!m&&x>0&&(x-=Math.PI*2),m&&x<0&&(x+=Math.PI*2);let B=Math.max(1,Math.ceil(Math.abs(x)/(Math.PI/4))),te=x/B,oe=j=>[u+a*v*Math.cos(j)-l*A*Math.sin(j),K+a*A*Math.cos(j)+l*v*Math.sin(j)],fe=j=>[-a*v*Math.sin(j)-l*A*Math.cos(j),-a*A*Math.sin(j)+l*v*Math.cos(j)],Ie=[];for(let j=0;j<B;j++){let _e=Q+te,ee=4/3*Math.tan(te/4),ue=j===0?[o,s]:oe(Q),pe=j===B-1?[T,C]:oe(_e),ce=fe(Q),Ce=fe(_e);Ie.push(["C",ue[0]+ee*ce[0],ue[1]+ee*ce[1],pe[0]-ee*Ce[0],pe[1]-ee*Ce[1],...pe]),Q=_e}return Ie}function Rt(o){(typeof o!="string"||o.length===0||o.length>2e5)&&Z();let s=0,a,l,p=0,O=0,m=0,T=0,C,b,v=[],A=()=>{for(;/\s/.test(o[s]??"")&&s<o.length;)s++},k=(w,M=!1)=>{if(A(),o[s]===","&&(w||Z(),s++,A()),M){let U=o[s++];return U!=="0"&&U!=="1"&&Z(),Number(U)}Je.lastIndex=s;let Y=Je.exec(o);Y||Z(),s=Je.lastIndex;let L=Number(Y[0]);return Number.isFinite(L)||Z(),L};for(;A(),s!==o.length;){let w=!1;/[a-z]/i.test(o[s])&&(a=o[s++],w=!0),a||Z();let M=a.toUpperCase(),Y=a!==M;if(!v.length&&M!=="M"&&Z(),M==="Z"){w||Z(),v.push(["Z"]),p=m,O=T,C=b=void 0,l=M,a=void 0;continue}At[M]||Z();let L=Array.from({length:At[M]},(f,u)=>k(u>0||!w,M==="A"&&(u===3||u===4))),U=f=>f+(Y?p:0),X=f=>f+(Y?O:0),z,se,E;if(M==="M"||M==="L")z=[[M,U(L[0]),X(L[1])]],M==="M"&&(m=z[0][1],T=z[0][2],a=Y?"l":"L");else if(M==="H")z=[["L",U(L[0]),O]];else if(M==="V")z=[["L",p,X(L[0])]];else if(M==="C"||M==="S"){let f=M==="C"?[U(L[0]),X(L[1]),U(L[2]),X(L[3]),U(L[4]),X(L[5])]:[l==="C"||l==="S"?2*p-C[0]:p,l==="C"||l==="S"?2*O-C[1]:O,U(L[0]),X(L[1]),U(L[2]),X(L[3])];z=[["C",...f]],se=f.slice(2,4)}else if(M==="Q"||M==="T"){let f=M==="Q"?U(L[0]):l==="Q"||l==="T"?2*p-b[0]:p,u=M==="Q"?X(L[1]):l==="Q"||l==="T"?2*O-b[1]:O,K=U(L.at(-2)),D=X(L.at(-1));z=[["C",p+2/3*(f-p),O+2/3*(u-O),K+2/3*(f-K),D+2/3*(u-D),K,D]],E=[f,u]}else z=tn(p,O,...L.slice(0,5),U(L[5]),X(L[6]));if(z.length){let f=z.at(-1);p=f.at(-2),O=f.at(-1),v.push(...z)}C=se,b=E,l=M}return(!v.length||v.some(w=>w.slice(1).some(M=>!Number.isFinite(M))))&&Z(),v}function Ct(o,s,a,l){let p=-o+3*s-3*a+l,O=2*(o-2*s+a),m=s-o;if([p,O,m].every(Number.isFinite)||Z(),p===0)return O===0?[]:[-m/O];let T=O*O-4*p*m;if(Number.isFinite(T)||Z(),T<0)return[];let C=-.5*(O+(O<0?-1:1)*Math.sqrt(T));return C===0?[-O/(2*p)]:[C/p,m/C]}function nn(o){let s=1/0,a=1/0,l=-1/0,p=-1/0,O=!1,m=(b,v)=>{(!Number.isFinite(b)||!Number.isFinite(v))&&Z(),s=Math.min(s,b),a=Math.min(a,v),l=Math.max(l,b),p=Math.max(p,v)};for(let b of o){let v=0,A=0,k=0,w=0;for(let M of b){let[Y,...L]=M;if(Y==="Z"){v=k,A=w;continue}if(Y==="C"){O=!0;let U=(z,se,E,f,u)=>(1-u)**3*z+3*(1-u)**2*u*se+3*(1-u)*u**2*E+u**3*f,X=[...Ct(v,L[0],L[2],L[4]),...Ct(A,L[1],L[3],L[5])];for(let z of X)z>0&&z<1&&m(U(v,L[0],L[2],L[4],z),U(A,L[1],L[3],L[5],z))}else Y==="L"&&(O=!0);v=L.at(-2),A=L.at(-1),m(v,A),Y==="M"&&(k=v,w=A)}}let T=l-s,C=p-a;return(!O||![s,a,T,C].every(Number.isFinite)||T<=0||C<=0)&&Z(),{left:s,top:a,width:T,height:C}}function Ze(o,s){let a=o.map(l=>Rt(l.data));if(s!==void 0){(!Number.isFinite(s?.width)||!Number.isFinite(s?.height)||s.width<.01||s.height<.01)&&Z();let l=nn(a),p=s.width/l.width,O=s.height/l.height;(!Number.isFinite(p)||!Number.isFinite(O)||p<=0||O<=0)&&Z();for(let m of a)for(let T of m)for(let C=1;C<T.length;C++)T[C]=(T[C]-(C%2?l.left:l.top))*(C%2?p:O),Number.isFinite(T[C])||Z()}return o.map((l,p)=>({...l,data:a[p].map(O=>O.join(" ")).join(" ")}))}function Dt(o){let s=[],a,l;for(let p of Rt(o)){if(p[0]==="M"&&(a=p[1],l=p[2]),p[0]==="Z"){let O=s.at(-1);O?.[0]==="L"&&O[1]===a&&O[2]===l&&s.pop()}s.push(p)}return s}function wt(o,s,a=.001){if(!Array.isArray(o)||o.length!==s.length)return!1;try{return s.every((l,p)=>{if(l.windingRule!==o[p].windingRule)return!1;let O=Dt(o[p].data),m=Dt(l.data);return O.length===m.length&&m.every((T,C)=>T.length===O[C].length&&T.every((b,v)=>v===0?b===O[C][v]:Math.abs(b-O[C][v])<=a))})}catch{return!1}}var ye="bridge-design-v1-",ge=`${ye}spec`,me=`${ye}digest`,Te=`${ye}intent`,we=`${ye}state`,je=`${ye}source`,tt={NONE:"NONE",HORIZONTAL:"HORIZONTAL",VERTICAL:"VERTICAL",BOTH:"BOTH"},on=Object.fromEntries(Object.entries(tt).map(([o,s])=>[s,o])),W=o=>JSON.parse(JSON.stringify(o));function Le(o){let s=new Uint8Array(o.length*3),a=0;for(let l of o){let p=l.codePointAt(0);p>=55296&&p<=57343&&(p=65533),p<128?s[a++]=p:p<2048?(s[a++]=192|p>>6,s[a++]=128|p&63):p<65536?(s[a++]=224|p>>12,s[a++]=128|p>>6&63,s[a++]=128|p&63):(s[a++]=240|p>>18,s[a++]=128|p>>12&63,s[a++]=128|p>>6&63,s[a++]=128|p&63)}return s.subarray(0,a)}function $(o){return Array.isArray(o)?`[${o.map($).join(",")}]`:o&&typeof o=="object"?`{${Object.keys(o).filter(s=>o[s]!==void 0).sort().map(s=>`${JSON.stringify(s)}:${$(o[s])}`).join(",")}}`:JSON.stringify(o)}var G=o=>Ye(xe(Le($(o)))),h=(o,s)=>{if(!o)throw new Error(s)},be=(o,s)=>{let a=o.getPluginData(s);return a?JSON.parse(a):null},ne=o=>typeof o=="symbol"||o===void 0?null:W(o),Ee=o=>`${o.family}\0${o.style}`,et=o=>o?.unit==="AUTO"?{unit:"AUTO"}:W(o);function Ae(o,s){return typeof s=="number"?typeof o=="number"&&Number.isFinite(o)&&Math.abs(o-s)<=.001:Array.isArray(s)?Array.isArray(o)&&o.length===s.length&&s.every((a,l)=>Ae(o[l],a)):s&&typeof s=="object"?o&&typeof o=="object"&&Object.keys(s).every(a=>Ae(o[a],s[a])):o===s}function Lt(o){let s="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",a=new Uint8Array(o.length*3/4-(o.endsWith("==")?2:o.endsWith("=")?1:0)),l=0;for(let p=0;p<o.length;p+=4){let O=s.indexOf(o[p])<<18|s.indexOf(o[p+1])<<12|Math.max(0,s.indexOf(o[p+2]))<<6|Math.max(0,s.indexOf(o[p+3]));l<a.length&&(a[l++]=O>>>16&255),l<a.length&&(a[l++]=O>>>8&255),l<a.length&&(a[l++]=O&255)}return a}function sn(o){let s="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",a="";for(let l=0;l<o.length;l+=3){let p=o[l]<<16|(o[l+1]??0)<<8|(o[l+2]??0);a+=s[p>>>18&63]+s[p>>>12&63]+(l+1<o.length?s[p>>>6&63]:"=")+(l+2<o.length?s[p&63]:"=")}return a}function rn(o,s){let a=!1,l=()=>s.onMutation?.(),p=(e,t,n)=>{l(),e.setPluginData(t,typeof n=="string"?n:JSON.stringify(n))};async function O(e){let t=await s.resolveScope(e.trustedScope);s.assertTrustedOwnership(e.trustedOwnership,e.operationId);let n=e.payload??{};h(typeof n.runId=="string"&&/^[A-Za-z0-9._:-]{1,160}$/.test(n.runId),"DESIGN_RUN_ID_REQUIRED");let i=bt(n.spec),c=e.trustedOwnership,r=G({workspace:c.workspaceId,task:c.taskId,spec:i.id}).slice(0,24),N=`${ye}${r}-ledger`,y=G(i),I=n.timerUnit??"milliseconds";h(["seconds","milliseconds"].includes(I),"DESIGN_TIMER_UNIT_INVALID");let S=be(t.root,N);S&&(h(S.specSignature===y,"DESIGN_SPEC_REVISION_CONFLICT: use a new spec id for a changed specification"),h(S.timerUnit===I,"DESIGN_TIMER_UNIT_CONFLICT"));let d={message:e,scope:t,payload:n,spec:i,ownership:c,ns:r,ledgerKey:N,signature:y,timerUnit:I,state:S??{version:1,specSignature:y,timerUnit:I,cursor:0,pending:null,complete:!1},existing:!!S,map:new Map,idToKey:new Map,fonts:new Map,substitutions:[],styles:new Map,variables:new Map,images:new Map,resourceKeys:{styles:new Map,variables:new Map,images:new Map},preparedComponents:new Set};d.order=Qe(i),d.definitions=new Map(d.order.map(R=>[R.key,R])),d.children=new Map,d.reactionDefs=new Map;for(let R of i.nodes)d.children.has(R.parentKey)||d.children.set(R.parentKey,[]),d.children.get(R.parentKey).push(R);for(let R of i.reactions??[])d.reactionDefs.has(R.sourceKey)||d.reactionDefs.set(R.sourceKey,[]),d.reactionDefs.get(R.sourceKey).push(R);let g=new Map,_=!1;for(let R=0;R<d.order.length;R+=16){let F=d.order.slice(R,R+16).map(q=>({def:q,record:null})),V=await Promise.allSettled(F.map(async q=>(q.record=be(t.root,`${ye}${r}-n-${G(q.def.key).slice(0,24)}`),q.record?await o.getNodeByIdAsync(q.record.id):null)));for(let q=0;q<F.length;q++){let{def:H,record:ie}=F[q],ae=V[q];if(ae.status==="rejected")throw ae.reason;if(!ie)continue;let re=ae.value;if(!re||re.getPluginData(ge)!==r||re.getPluginData(s.specNodeKey)!==H.key){if(!_){let Ue=[...t.root.children??[]];for(let He=0;He<Ue.length;He++){let Oe=Ue[He];if(Oe.getPluginData(ge)===r){let Be=Oe.getPluginData(s.specNodeKey);g.has(Be)||g.set(Be,[]),g.get(Be).push(Oe)}"children"in Oe&&Oe.type!=="INSTANCE"&&Ue.push(...Oe.children)}_=!0}let yt=g.get(H.key)??[];h(yt.length===1,`DESIGN_MAPPING_AMBIGUOUS:${H.key}`),re=yt[0]}h(re&&!re.removed,`DESIGN_NODE_MISSING:${H.key}`),s.assertInScope(re,t),s.assertTaskOwned(re,c),h(re.getPluginData(ge)===r&&re.getPluginData(s.specNodeKey)===H.key,`DESIGN_KEY_OWNERSHIP_CONFLICT:${H.key}`),h(re.type===H.type,`DESIGN_NODE_TYPE_CONFLICT:${H.key}`),d.map.set(H.key,re),d.idToKey.set(re.id,H.key),H.type==="INSTANCE"&&h((await re.getMainComponentAsync())?.id===d.map.get(H.props.componentKey)?.id,`DESIGN_INSTANCE_COMPONENT_CONFLICT:${H.key}`)}}return d}let m=e=>{s.assertInScope(e.scope.root,e.scope),p(e.scope.root,e.ledgerKey,e.state)},T=(e,t,n)=>`${ye}${e.ns}-${t}-${G(n).slice(0,24)}`,C=(e,t,n)=>`${ye}${e.ns}:${t}:${n}`,b=(e,t,n)=>be(e.scope.root,T(e,t,n));function v(e,t,n,i){e[t].set(n,i);let c=t==="images"?i:i.id;e.resourceKeys[t].has(c)||e.resourceKeys[t].set(c,n)}function A(e,t=!1){let n={type:e.type,name:e.name,parentKey:e.parent?.getPluginData?.(s.specNodeKey)??""};for(let i of["x","y","width","height","visible","opacity","fills","strokes","strokeWeight","cornerRadius","clipsContent","overflowDirection","numberOfFixedChildren","layoutPositioning","characters","fontName","fontSize","lineHeight","letterSpacing","textAlignHorizontal","textAutoResize","vectorPaths","effects","strokeAlign","dashPattern"])i in e&&(n[i]=ne(e[i]));return"textStyleId"in e&&(n.textStyleId=e.textStyleId),t&&(n.sourceKey=e.getPluginData(je)),(e.type==="INSTANCE"||t)&&"children"in e&&(n.instanceChildren=e.children.map(i=>A(i,!0))),n}function k(e,t){let n={...t};for(let i of["fills","strokes"])Array.isArray(n[i])&&(n[i]=n[i].map(c=>{let r=W(c);return r.boundVariables?.color?.id&&(r.boundVariables.color.id=e.resourceKeys.variables.get(r.boundVariables.color.id)??"UNKNOWN"),r.imageHash&&(r.imageHash=e.resourceKeys.images.get(r.imageHash)??"UNKNOWN"),r}));return"textStyleId"in t&&(n.textStyleKey=t.textStyleId?e.resourceKeys.styles.get(t.textStyleId)??"UNKNOWN":null,delete n.textStyleId),t.instanceChildren&&(n.instanceChildren=t.instanceChildren.map(i=>k(e,i))),n}let w=(e,t,n=!1)=>k(e,A(t,n));function M(e,t,n){s.assertInScope(n,e.scope),s.assertTaskOwned(n,e.ownership),h(n.getPluginData(Te)===G(t),`DESIGN_INTENT_CONFLICT:${t.key}`);let i=n.getPluginData(me),c=A(n);if(i&&h(i===G(k(e,c)),`DESIGN_USER_EDIT_CONFLICT:${t.key}`),"children"in n&&n.type!=="INSTANCE")for(let r of n.children)s.assertTaskOwned(r,e.ownership),h(r.getPluginData(ge)===e.ns,`DESIGN_FOREIGN_CHILD:${t.key}`);return c}function Y(e){s.assertInScope(e.scope.root,e.scope);for(let t of e.order)if(e.map.has(t.key)){let n=e.map.get(t.key),i=M(e,t,n);L(e,t,n,i)}}function L(e,t,n,i){let c=i??n,r=t.props??{},N={name:t.name??t.key,x:t.x,y:t.y};(t.type!=="TEXT"||!r.textAutoResize||r.textAutoResize==="NONE")&&Object.assign(N,{width:t.width,height:t.height});for(let y of["strokeWeight","strokeAlign","dashPattern","cornerRadius","opacity","visible","clipsContent","characters","fontSize","lineHeight","letterSpacing","textAlignHorizontal","textAutoResize"])r[y]!==void 0&&(N[y]=r[y]);if(r.vectorPaths&&(N.vectorPaths=Ze(r.vectorPaths,{width:t.width,height:t.height})),r.overflowDirection&&(N.overflowDirection=tt[r.overflowDirection]),r.effects&&(N.effects=r.effects.map(y=>({...y,blendMode:"NORMAL",visible:y.visible??!0,spread:y.spread??0}))),r.fills&&(N.fills=D(e,r.fills)),r.strokes&&(N.strokes=D(e,r.strokes)),t.type==="TEXT"){let y=r.fontName??e.spec.textStyles.find(I=>I.key===r.textStyleKey).fontName;N.fontName=e.fonts.get(Ee(y)),r.textStyleKey&&(N.textStyleId=e.styles.get(r.textStyleKey)?.id)}for(let[y,I]of Object.entries(N)){if(y==="vectorPaths"?wt(c[y],I):Ae(c[y],I))continue;let d=new Error(`DESIGN_PROPERTY_READBACK_MISMATCH:${t.key}:${y}`);if(y==="fills"||y==="strokes"){let g={nodeKey:t.key,field:y,expected:ne(I),actual:ne(c[y])};d.readbackMismatch=JSON.stringify(g).length<=8192?g:{nodeKey:t.key,field:y,status:"NOT_VERIFIED_BUDGET_EXCEEDED",budgetCharacters:8192}}throw d}if(t.type==="INSTANCE"&&r.overrides?.length){let y=[...i?i.instanceChildren??[]:n.children],I=new Map;for(let S=0;S<y.length;S++){let d=y[S];I.set(i?d.sourceKey:d.getPluginData(je),d);let g=i?d.instanceChildren:d.children;g&&y.push(...g)}for(let S of r.overrides){let d=I.get(S.sourceKey);h(d,`DESIGN_OVERRIDE_SOURCE_MISSING:${S.sourceKey}`);for(let g of["characters","visible","fills"])S[g]!==void 0&&h(Ae(d[g],g==="fills"?D(e,S.fills):S[g]),`DESIGN_OVERRIDE_READBACK_MISMATCH:${t.key}:${S.sourceKey}:${g}`)}}}async function U(e,t){let n=[...(e.spec.textStyles??[]).map(c=>c.fontName),...e.spec.nodes.filter(c=>c.type==="TEXT"&&c.props.fontName).map(c=>c.props.fontName)],i=typeof o.listAvailableFontsAsync=="function"?new Set((await o.listAvailableFontsAsync()).map(c=>Ee(c.fontName))):null;for(let c of n){let r=Ee(c);if(e.fonts.has(r))continue;let N=c;if(i&&!i.has(r)&&(h(e.spec.fontPolicy?.allowFallback,`DESIGN_FONT_MISSING:${c.family}/${c.style}`),N=e.spec.fontPolicy.fallback,h(i.has(Ee(N)),`DESIGN_FALLBACK_FONT_MISSING:${N.family}/${N.style}`)),t)try{await o.loadFontAsync(N)}catch(y){if(N!==c||!e.spec.fontPolicy?.allowFallback)throw y;N=e.spec.fontPolicy.fallback,await o.loadFontAsync(N)}e.fonts.set(r,W(N)),Ee(N)!==r&&e.substitutions.push({requested:W(c),used:W(N)})}}async function X(e){for(let n of e.spec.assets??[]){let i=b(e,"image",n.key);i&&(h(i.signature===G(n),`DESIGN_ASSET_CONFLICT:${n.key}`),v(e,"images",n.key,i.hash))}for(let n of e.spec.textStyles??[]){let i=b(e,"style",n.key);if(!i)continue;let c=await o.getStyleByIdAsync(i.id);if(!c||c.description!==C(e,"style",n.key)){let r=(await o.getLocalTextStylesAsync()).filter(N=>N.description===C(e,"style",n.key));h(r.length===1,`DESIGN_STYLE_MAPPING_AMBIGUOUS:${n.key}`),c=r[0]}h(c&&c.type==="TEXT"&&c.description===C(e,"style",n.key),`DESIGN_STYLE_OWNERSHIP_CONFLICT:${n.key}`),h(i.digest===G(z(c)),`DESIGN_STYLE_USER_EDIT_CONFLICT:${n.key}`),v(e,"styles",n.key,c)}let t=b(e,"collection","colors");if(t){let n=await o.variables.getVariableCollectionByIdAsync(t.id);if(!n||n.name!==t.name){let i=(await o.variables.getLocalVariableCollectionsAsync()).filter(c=>c.name===t.name);h(i.length===1,"DESIGN_COLLECTION_MAPPING_AMBIGUOUS"),n=i[0]}h(n.name===`Bridge/${e.ns}/Colors`,"DESIGN_COLLECTION_OWNERSHIP_CONFLICT"),t.digest&&h(t.digest===G(E(n)),"DESIGN_COLLECTION_USER_EDIT_CONFLICT"),e.collection=n}for(let n of e.spec.variables??[]){let i=b(e,"variable",n.key);if(!i)continue;let c=await o.variables.getVariableByIdAsync(i.id);if(!c||c.description!==C(e,"variable",n.key)){let r=(await o.variables.getLocalVariablesAsync("COLOR")).filter(N=>N.description===C(e,"variable",n.key));h(r.length===1,`DESIGN_VARIABLE_MAPPING_AMBIGUOUS:${n.key}`),c=r[0]}h(c&&c.description===C(e,"variable",n.key),`DESIGN_VARIABLE_OWNERSHIP_CONFLICT:${n.key}`),h(e.collection&&c.variableCollectionId===e.collection.id,`DESIGN_VARIABLE_COLLECTION_CONFLICT:${n.key}`),h(i.digest===G(se(c)),`DESIGN_VARIABLE_USER_EDIT_CONFLICT:${n.key}`),v(e,"variables",n.key,c)}}let z=e=>({name:e.name,fontName:ne(e.fontName),fontSize:e.fontSize,lineHeight:ne(e.lineHeight),letterSpacing:ne(e.letterSpacing)}),se=e=>({name:e.name,resolvedType:e.resolvedType,values:Object.values(e.valuesByMode).map(ne)}),E=e=>({name:e.name,modes:(e.modes??[]).map(t=>t.name),defaultMode:(e.modes??[]).findIndex(t=>t.modeId===e.defaultModeId)});function f(e,t,n){h(!e.state.pending,"DESIGN_NEEDS_RECONCILIATION"),e.state.pending={kind:t,key:n,startedAt:new Date().toISOString(),operationId:e.message.operationId},m(e)}function u(e){e.state.pending=null,m(e)}async function K(e){(e.spec.textStyles?.length??0)+(e.spec.variables?.length??0)&&h(e.payload.allowGlobalResources===!0,"DESIGN_GLOBAL_RESOURCES_AUTH_REQUIRED");for(let n of e.spec.assets??[]){if(e.images.has(n.key))continue;f(e,"image",n.key),l();let i=o.createImage(Lt(n.dataBase64));v(e,"images",n.key,i.hash),p(e.scope.root,T(e,"image",n.key),{hash:i.hash,signature:G(n)}),u(e)}for(let n of e.spec.textStyles??[]){if(e.styles.has(n.key))continue;f(e,"style",n.key),l();let i=o.createTextStyle();e.state.pending.id=i.id,m(e),i.description=C(e,"style",n.key),i.name=`Bridge/${e.ns}/${n.name}`,i.fontName=W(e.fonts.get(Ee(n.fontName))),i.fontSize=n.fontSize,n.lineHeight&&(i.lineHeight=et(n.lineHeight)),n.letterSpacing&&(i.letterSpacing=W(n.letterSpacing)),h(Ae(i,{name:`Bridge/${e.ns}/${n.name}`,fontName:e.fonts.get(Ee(n.fontName)),fontSize:n.fontSize,...n.lineHeight?{lineHeight:et(n.lineHeight)}:{},...n.letterSpacing?{letterSpacing:n.letterSpacing}:{}}),`DESIGN_STYLE_READBACK_MISMATCH:${n.key}`),p(e.scope.root,T(e,"style",n.key),{id:i.id,digest:G(z(i))}),v(e,"styles",n.key,i),u(e)}if(e.spec.variables?.length){let n=b(e,"collection","colors"),i=e.collection;n?h(i&&i.name===`Bridge/${e.ns}/Colors`,"DESIGN_COLLECTION_OWNERSHIP_CONFLICT"):(f(e,"collection","colors"),l(),i=o.variables.createVariableCollection(`Bridge/${e.ns}/Colors`),e.state.pending.id=i.id,m(e),n={id:i.id,name:i.name,digest:G(E(i))},e.collection=i,p(e.scope.root,T(e,"collection","colors"),n),u(e));for(let c of e.spec.variables){if(e.variables.has(c.key))continue;f(e,"variable",c.key),l();let r=o.variables.createVariable(`Bridge/${e.ns}/${c.name}`,i,"COLOR");e.state.pending.id=r.id,m(e),r.description=C(e,"variable",c.key),r.setValueForMode(i.defaultModeId,W(c.value)),h(Ae(r.valuesByMode[i.defaultModeId],c.value),`DESIGN_VARIABLE_READBACK_MISMATCH:${c.key}`),p(e.scope.root,T(e,"variable",c.key),{id:r.id,digest:G(se(r))}),v(e,"variables",c.key,r),u(e)}}}function D(e,t){return t.map(n=>{if(n.type==="IMAGE")return{type:"IMAGE",imageHash:e.images.get(n.assetKey),scaleMode:n.scaleMode??"FILL",...n.opacity===void 0?{}:{opacity:n.opacity}};if(n.type==="GRADIENT_LINEAR")return{type:n.type,gradientTransform:W(n.gradientTransform),gradientStops:W(n.gradientStops),...n.opacity===void 0?{}:{opacity:n.opacity}};let i={type:"SOLID",color:W(n.color),...n.opacity===void 0?{}:{opacity:n.opacity}};return n.variableKey&&(i=o.variables.setBoundVariableForPaint(i,"color",e.variables.get(n.variableKey))),i})}function P(e,t){let n=new Set;for(let i of t){if(i.type!=="IMAGE"||n.has(i.assetKey))continue;n.add(i.assetKey);let c=e.spec.assets.find(y=>y.key===i.assetKey),r=b(e,"image",i.assetKey);if(h(c&&r&&r.signature===G(c),`DESIGN_ASSET_CONFLICT:${i.assetKey}`),h(r.hash===e.images.get(i.assetKey),`DESIGN_IMAGE_HASH_CHANGED:${i.assetKey}`),h(typeof o.getImageByHash=="function","DESIGN_IMAGE_API_UNAVAILABLE"),o.getImageByHash(r.hash))continue;l();let N=o.createImage(Lt(c.dataBase64));h(N?.hash===r.hash,`DESIGN_IMAGE_HASH_CHANGED:${i.assetKey}`),h(o.getImageByHash(r.hash),`DESIGN_IMAGE_HANDLE_UNAVAILABLE:${i.assetKey}`)}}async function Q(e,t){if(t.type==="INSTANCE"&&!e.preparedComponents.has(t.props.componentKey)){let N=[e.spec.nodes.find(y=>y.key===t.props.componentKey)];for(let y=0;y<N.length;y++)N.push(...e.children.get(N[y].key)??[]);for(let y of N.reverse())st(e,y);e.preparedComponents.add(t.props.componentKey)}f(e,"node",t.key);let n={FRAME:"createFrame",COMPONENT:"createComponent",TEXT:"createText",RECTANGLE:"createRectangle",ELLIPSE:"createEllipse",VECTOR:"createVector"};l();let i=t.type==="INSTANCE"?e.map.get(t.props.componentKey).createInstance():o[n[t.type]]();e.state.pending.id=i.id,m(e),s.markTaskOwned(i,"design-node",e.ownership,e.message.operationId),p(i,s.specNodeKey,t.key),p(i,ge,e.ns),p(i,Te,G(t)),p(i,we,"creating");let c=t.parentKey?e.map.get(t.parentKey):e.scope.root;h(c&&["PAGE","FRAME","COMPONENT"].includes(c.type),"DESIGN_PARENT_INVALID"),s.assertInScope(c,e.scope),c!==e.scope.root&&s.assertTaskOwned(c,e.ownership),c.appendChild(i);let r=t.props??{};if(i.name=t.name??t.key,t.type==="TEXT"){let N=r.fontName??e.spec.textStyles.find(y=>y.key===r.textStyleKey).fontName;i.fontName=W(e.fonts.get(Ee(N))),r.fontSize!==void 0&&(i.fontSize=r.fontSize),i.characters=r.characters,i.textAutoResize="NONE",r.lineHeight&&(i.lineHeight=et(r.lineHeight)),r.letterSpacing&&(i.letterSpacing=W(r.letterSpacing)),r.textAlignHorizontal&&(i.textAlignHorizontal=r.textAlignHorizontal),r.textStyleKey&&(await i.setTextStyleIdAsync(e.styles.get(r.textStyleKey).id),s.assertInScope(i,e.scope),s.assertTaskOwned(i,e.ownership),h(i.parent===c,`DESIGN_NEW_NODE_PARENT_CONFLICT:${t.key}`),s.assertInScope(c,e.scope),c!==e.scope.root&&s.assertTaskOwned(c,e.ownership))}r.vectorPaths&&(i.vectorPaths=Ze(r.vectorPaths,{width:t.width,height:t.height})),r.fills?(P(e,r.fills),i.fills=D(e,r.fills)):["FRAME","COMPONENT","RECTANGLE","ELLIPSE","VECTOR"].includes(t.type)&&(i.fills=[]),r.strokes&&(P(e,r.strokes),i.strokes=D(e,r.strokes)),r.dashPattern&&(h("dashPattern"in i,`DESIGN_PROPERTY_UNSUPPORTED:${t.key}:dashPattern`),i.dashPattern=W(r.dashPattern));for(let N of["strokeWeight","strokeAlign","cornerRadius","opacity","visible","clipsContent"])r[N]!==void 0&&(h(N in i,`DESIGN_PROPERTY_UNSUPPORTED:${t.key}:${N}`),i[N]=r[N]);if(r.effects&&(i.effects=r.effects.map(N=>({...W(N),blendMode:"NORMAL",visible:N.visible??!0,spread:N.spread??0}))),r.overflowDirection!==void 0&&(i.overflowDirection=tt[r.overflowDirection]),r.layoutPositioning!==void 0&&c.layoutMode&&c.layoutMode!=="NONE"&&(i.layoutPositioning=r.layoutPositioning),typeof i.resizeWithoutConstraints=="function"?i.resizeWithoutConstraints(t.width,t.height):i.resize(t.width,t.height),i.x=t.x,i.y=t.y,t.type==="TEXT"&&r.textAutoResize&&r.textAutoResize!=="NONE"&&(i.textAutoResize=r.textAutoResize),t.type==="INSTANCE"){let N=e.map.get(r.componentKey),y=i.children.map((S,d)=>({child:S,source:N.children[d]})),I=new Map;h(i.children.length===N.children.length,"DESIGN_INSTANCE_STRUCTURE_MISMATCH");for(let S=0;S<y.length;S++){let d=y[S];h(d.source&&d.child.type===d.source.type,"DESIGN_INSTANCE_STRUCTURE_MISMATCH");let g=d.source.getPluginData(s.specNodeKey);s.markTaskOwned(d.child,"design-instance-child",e.ownership,e.message.operationId),p(d.child,s.specNodeKey,`${t.key}/inherited/${S}`),p(d.child,je,g),I.set(g,d.child),"children"in d.child&&(h(d.child.children.length===d.source.children.length,"DESIGN_INSTANCE_STRUCTURE_MISMATCH"),y.push(...d.child.children.map((_,R)=>({child:_,source:d.source.children[R]}))))}for(let S of r.overrides??[]){let d=I.get(S.sourceKey);h(d,`DESIGN_OVERRIDE_SOURCE_MISSING:${S.sourceKey}`),S.characters!==void 0&&(h(d.type==="TEXT","DESIGN_OVERRIDE_TEXT_REQUIRED"),l(),d.characters=S.characters),S.visible!==void 0&&(l(),d.visible=S.visible),S.fills!==void 0&&(P(e,S.fills),l(),d.fills=D(e,S.fills))}}e.map.set(t.key,i),e.idToKey.set(i.id,t.key),L(e,t,i),p(i,me,G(w(e,i))),p(i,we,"complete"),p(e.scope.root,T(e,"n",t.key),{id:i.id}),e.state.cursor+=1,u(e)}function x(e,t){return(e.reactionDefs.get(t.key)??[]).map(n=>({trigger:n.trigger.type==="ON_CLICK"?{type:"ON_CLICK"}:{type:"AFTER_TIMEOUT",timeout:n.trigger.delaySeconds*(e.timerUnit==="milliseconds"?1e3:1)},actions:[{type:"NODE",destinationId:e.map.get(n.destinationKey)?.id??"MISSING",navigation:"NAVIGATE",transition:null}]}))}let B=e=>(e.reactions??[]).map(t=>({trigger:ne(t.trigger),actions:(t.actions??(t.action?[t.action]:[])).map(n=>n.type==="NODE"?{type:"NODE",destinationId:n.destinationId,navigation:n.navigation,transition:ne(n.transition)}:ne(n))})),te=(e,t)=>t.map(n=>e.idToKey.get(n.id)??"FOREIGN"),oe=(e,t)=>B(t).map(n=>({...n,actions:n.actions.map(i=>{if(i.type!=="NODE")return i;let{destinationId:c,...r}=i;return{...r,destinationKey:e.idToKey.get(c)??"UNKNOWN"}})})),fe=(e,t)=>t.map(n=>({name:n.name,nodeKey:e.idToKey.get(n.nodeId)??"UNKNOWN"})),Ie=(e,t)=>e.order.find(n=>b(e,"n",n.key)?.id===t)?.key??"UNKNOWN",j=(e,t)=>t.keys??t.ids.map(n=>Ie(e,n)),_e=(e,t)=>t.version===2?t.flows:t.flows.map(n=>({name:n.name,nodeKey:Ie(e,n.nodeId)}));function ee(e,t,n={version:2}){return n.version===2?G(oe(e,t)):G(B(t).map(i=>({...i,actions:i.actions.map(c=>{if(c.type!=="NODE")return c;let r=e.idToKey.get(c.destinationId);return{...c,destinationId:r?b(e,"n",r)?.id??c.destinationId:c.destinationId}})})))}function ue(e,t){let n=t;for(;n.parent&&n.parent!==e.scope.page;)n=n.parent;return n.parent===e.scope.page&&n.type==="FRAME"&&e.idToKey.has(n.id)?n:null}function pe(e,t){return t.map(n=>({name:n.name,nodeKey:e.idToKey.get(n.nodeId)??null,...e.idToKey.has(n.nodeId)?{}:{nodeId:n.nodeId}}))}function ce(e,t){return h(Array.isArray(t)&&t.length<=1e3,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),t.map(n=>{if(h(n&&typeof n.name=="string"&&n.name.length<=256,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),n.nodeKey!==null){let i=e.map.get(n.nodeKey);return h(i?.type==="FRAME"&&i.parent===e.scope.page,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),s.assertTaskOwned(i,e.ownership),{name:n.name,nodeKey:n.nodeKey}}return h(typeof n.nodeId=="string"&&n.nodeId.length<=200,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),{name:n.name,nodeKey:null,nodeId:n.nodeId}})}function Ce(e,t,n){let i=new Set(e.map(y=>y.name)),c=1;for(;i.has(`Flow ${c}`);)c+=1;let r=t[t.length-1],N=r&&!i.has(r.name)&&(r.name===`Flow ${e.length+1}`||r.name===`Flow ${c}`);return t.length===e.length+1&&$(t.slice(0,-1))===$(e)&&N&&r.nodeKey===n&&!e.some(y=>y.nodeKey===n)}function nt(e){let t=e.state.nativeFlowObservation;return t?(h(t.version===1||t.version===2&&Array.isArray(t.entries)&&t.entries.length>0&&t.entries.length<=1e3,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),t.version===1?[t]:t.entries):[]}function ot(e){let t=null;for(let n of nt(e)){let i=e.map.get(n.sourceKey),c=e.definitions.get(n.sourceKey);h(i&&c,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT");let r=M(e,c,i);L(e,c,i,r);let N=ue(e,i),y=b(e,"reactions",n.sourceKey);h(N&&e.idToKey.get(N.id)===n.topLevelKey&&y?.digest===n.reactionDigest&&ee(e,i,y)===n.reactionDigest,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),s.assertTaskOwned(N,e.ownership);let I=ce(e,n.before),S=ce(e,n.after);if(h(Ce(I,S,n.topLevelKey)&&(t===null||$(t)===$(I)),"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),n.version===1)h(t===null&&I.length===0&&S.length===1,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT");else if(n.provenance==="NATIVE_SETTER_READBACK"){let d=n.reactionReadback;h(n.version===2&&d?.version===1&&d.sourceKey===n.sourceKey&&d.topLevelKey===n.topLevelKey&&d.digest===n.reactionDigest&&d.operationId===n.operationId&&d.observedAt===n.observedAt,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT")}else{let d=n.recovery,g=d?.explicitPayload;h(n.version===2&&n.provenance==="EXPLICIT_READBACK_ADOPTION"&&n.reactionReadback===null&&y.provenance===n.provenance&&d?.verification==="CURRENT_STATE_ADOPTED_NOT_ORIGIN_PROVED"&&d.operationId===n.operationId&&d.observedAt===n.observedAt&&d.legacyPending?.operationId===g?.pendingOperationId&&d.legacyPending?.key===n.sourceKey&&$(ce(e,d.legacyPending.flowBefore))===$(I)&&d.expectedFlowSnapshotSignature===G(S)&&d.expectedReactionSnapshotSignature===n.reactionDigest&&g.flowSnapshotSignature===d.expectedFlowSnapshotSignature&&g.reactionSnapshotSignature===d.expectedReactionSnapshotSignature,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT")}t=S}return t}function it(e,t,n,i,c,r=null){let N=ue(e,n),y=N&&e.idToKey.get(N.id);h(e.scope.root.type==="PAGE"&&N&&(e.reactionDefs.get(t.key)?.length??0)>0,"DESIGN_NATIVE_FLOW_CHANGE_CONFLICT"),s.assertTaskOwned(N,e.ownership);let I=ce(e,pe(e,i)),S=ce(e,pe(e,c));h(Ce(I,S,y),"DESIGN_NATIVE_FLOW_CHANGE_CONFLICT");let d=ot(e);h(d?$(d)===$(I):!I.some(R=>R.nodeKey!==null),"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT");let g=nt(e).map(W),_=e.state.pending.reactionReadback;h(g.length<1e3,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),r||h(_?.sourceKey===t.key&&_.sourceId===n.id&&_.topLevelKey===y&&_.operationId===e.message.operationId&&_.digest===ee(e,n),"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),!g.length&&i.length===0&&!r?e.state.nativeFlowObservation={version:1,sourceKey:t.key,topLevelKey:y,before:I,after:S,reactionDigest:_.digest,operationId:_.operationId,observedAt:_.observedAt}:(g.push({version:2,provenance:r?"EXPLICIT_READBACK_ADOPTION":"NATIVE_SETTER_READBACK",sourceKey:t.key,topLevelKey:y,before:I,after:S,reactionDigest:ee(e,n),operationId:e.message.operationId,observedAt:r?.observedAt??_.observedAt,reactionReadback:r?null:W(_),...r?{recovery:r}:{}}),e.state.nativeFlowObservation={version:2,entries:g}),m(e)}function De(e){let t=fe(e,(e.scope.page.flowStartingPoints??[]).filter(r=>e.idToKey.has(r.nodeId))),n=b(e,"flows","page");if(n){h($(_e(e,n))===$(t),"DESIGN_FLOW_USER_EDIT_CONFLICT");return}let i=e.state.nativeFlowObservation;if(i){if(i.version===2){let y=ot(e);h($(pe(e,e.scope.page.flowStartingPoints??[]))===$(y),"DESIGN_FLOW_USER_EDIT_CONFLICT");return}let r=e.map.get(i.sourceKey),N=b(e,"reactions",i.sourceKey);h(i.version===1&&i.before.length===0&&i.after.length===1&&i.after[0].name==="Flow 1"&&i.after[0].nodeKey===i.topLevelKey&&r&&e.idToKey.get(ue(e,r)?.id)===i.topLevelKey&&N?.digest===i.reactionDigest&&ee(e,r)===i.reactionDigest,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),h($(t)===$(i.after),"DESIGN_FLOW_USER_EDIT_CONFLICT");return}let c=(e.spec.flows??[]).map(r=>({name:r.name,nodeKey:r.nodeKey}));h(t.length===0||$(t)===$(c),"DESIGN_FLOW_CONFLICT")}async function Pt(e,t,n,i){De(e);let c=W(e.scope.page.flowStartingPoints??[]),r=ue(e,n);i.length&&h(e.scope.root.type==="PAGE"&&r,"DESIGN_NATIVE_FLOW_REQUIRES_PAGE_SCOPE"),f(e,"reactions",t.key),e.state.pending.flowBefore=c.map(I=>({name:I.name,nodeKey:e.idToKey.get(I.nodeId)??null,nodeId:I.nodeId})),m(e),l(),await n.setReactionsAsync(i);let N=M(e,t,n);L(e,t,n,N),h($(B(n))===$(i),`DESIGN_REACTION_READBACK_MISMATCH:${t.key}`);let y=W(e.scope.page.flowStartingPoints??[]);e.state.pending.flowAfter=y.map(I=>({name:I.name,nodeKey:e.idToKey.get(I.nodeId)??null,nodeId:I.nodeId})),e.state.pending.reactionReadback={version:1,sourceKey:t.key,sourceId:n.id,topLevelKey:r?e.idToKey.get(r.id):null,digest:ee(e,n),operationId:e.message.operationId,observedAt:new Date().toISOString()},m(e),$(y)!==$(c)&&it(e,t,n,c,y),p(e.scope.root,T(e,"reactions",t.key),{version:2,digest:ee(e,n)}),u(e)}function st(e,t){let n=e.map.get(t.key),i=M(e,t,n);if(L(e,t,n,i),!("children"in n)||n.type==="INSTANCE")return;let c=e.children.get(t.key)??[],r=c.filter(g=>!g.props?.isFixed),N=c.filter(g=>g.props?.isFixed),y=[...r,...N];N.length&&h(t.props?.overflowDirection&&t.props.overflowDirection!=="NONE",`DESIGN_FIXED_REQUIRES_SCROLL_PARENT:${t.key}`);let I=y.map(g=>g.key),S=te(e,n.children),d=b(e,"order",t.key);if(d&&h($(j(e,d))===$(S),`DESIGN_USER_LAYER_EDIT_CONFLICT:${t.key}`),$(I)!==$(S)||N.length!==(n.numberOfFixedChildren??0)){f(e,"order",t.key);for(let g of y)l(),n.appendChild(e.map.get(g.key));"numberOfFixedChildren"in n&&(n.numberOfFixedChildren=N.length),h($(te(e,n.children))===$(I),`DESIGN_LAYER_READBACK_MISMATCH:${t.key}`),p(n,me,G(w(e,n))),p(e.scope.root,T(e,"order",t.key),{keys:I}),u(e)}else d||p(e.scope.root,T(e,"order",t.key),{keys:I})}async function kt(e,t){if(e.state.finalized)return;De(e);let n=e.state.finalizeCursor??0;for(let I of e.order.slice(n,n+t)){let S=e.map.get(I.key);st(e,I);let d=x(e,I),g=B(S),_=b(e,"reactions",I.key);_?h(_.digest===ee(e,S,_),`DESIGN_REACTION_USER_EDIT_CONFLICT:${I.key}`):h(g.length===0||$(g)===$(d),`DESIGN_REACTION_CONFLICT:${I.key}`),$(g)!==$(d)?await Pt(e,I,S,d):_||p(e.scope.root,T(e,"reactions",I.key),{version:2,digest:ee(e,S)}),e.state.finalizeCursor=(e.state.finalizeCursor??0)+1,m(e)}if(e.state.finalizeCursor<e.order.length)return;let i=(e.spec.flows??[]).map(I=>({nodeId:e.map.get(I.nodeKey).id,name:I.name})),c=new Set([...e.map.values()].map(I=>I.id)),r=e.scope.page.flowStartingPoints??[],N=r.filter(I=>c.has(I.nodeId)),y=b(e,"flows","page");if(De(e),$(N)!==$(i)){f(e,"flows","page"),l(),e.scope.page.flowStartingPoints=[...r.filter(S=>!c.has(S.nodeId)),...i];let I=e.scope.page.flowStartingPoints.filter(S=>c.has(S.nodeId));h($(I)===$(i),"DESIGN_FLOW_READBACK_MISMATCH"),p(e.scope.root,T(e,"flows","page"),{version:2,flows:fe(e,I)}),u(e)}else y||p(e.scope.root,T(e,"flows","page"),{version:2,flows:fe(e,N)});e.state.finalized=!0,e.state.complete=!0,m(e)}async function Kt(e){let t=e.state.pending;if(!t)return;let i=b(e,{image:"image",style:"style",variable:"variable",collection:"collection",node:"n",order:"order",reactions:"reactions",flows:"flows"}[t.kind],t.key);if(e.payload.adoptNativeFlow!==void 0){let c=e.payload.adoptNativeFlow;h(e.payload.reconcile===!0&&t.kind==="reactions"&&!i&&c&&typeof c=="object"&&!Array.isArray(c)&&Object.keys(c).length===3&&["pendingOperationId","flowSnapshotSignature","reactionSnapshotSignature"].every(_=>Object.hasOwn(c,_))&&typeof c.pendingOperationId=="string"&&c.pendingOperationId===t.operationId&&typeof c.flowSnapshotSignature=="string"&&/^[a-f0-9]{64}$/.test(c.flowSnapshotSignature)&&typeof c.reactionSnapshotSignature=="string"&&/^[a-f0-9]{64}$/.test(c.reactionSnapshotSignature),"DESIGN_NATIVE_FLOW_ADOPTION_INVALID");let r=e.map.get(t.key),N=e.definitions.get(t.key);h(r&&N,"DESIGN_NATIVE_FLOW_ADOPTION_INVALID");let y=M(e,N,r);L(e,N,r,y);let I=W(e.scope.page.flowStartingPoints??[]),S=ce(e,t.flowBefore);if(!e.state.nativeFlowObservation){let _=t.reactionReadback,R=ue(e,r);h(S.every(F=>F.nodeKey===null)&&_?.version===1&&_.sourceKey===t.key&&_.sourceId===r.id&&R&&_.topLevelKey===e.idToKey.get(R.id)&&_.operationId===t.operationId&&_.digest===ee(e,r)&&typeof _.observedAt=="string"&&Number.isFinite(Date.parse(_.observedAt))&&$(ce(e,t.flowAfter))===$(pe(e,I)),"DESIGN_NATIVE_FLOW_ADOPTION_INVALID"),s.assertTaskOwned(R,e.ownership)}let d=S.map(_=>({name:_.name,nodeId:_.nodeKey===null?_.nodeId:e.map.get(_.nodeKey).id}));h($(B(r))===$(x(e,N))&&G(pe(e,I))===c.flowSnapshotSignature&&ee(e,r)===c.reactionSnapshotSignature,"DESIGN_NATIVE_FLOW_ADOPTION_SNAPSHOT_CONFLICT");let g={legacyPending:W(t),operationId:e.message.operationId,observedAt:new Date().toISOString(),expectedFlowSnapshotSignature:c.flowSnapshotSignature,expectedReactionSnapshotSignature:c.reactionSnapshotSignature,explicitPayload:W(c),verification:"CURRENT_STATE_ADOPTED_NOT_ORIGIN_PROVED"};it(e,N,r,d,I,g),p(e.scope.root,T(e,"reactions",t.key),{version:2,digest:ee(e,r),provenance:"EXPLICIT_READBACK_ADOPTION"}),u(e);return}if(h(i,`DESIGN_NEEDS_RECONCILIATION:${t.kind}:${t.key}`),t.kind==="node"){let c=e.order.find(N=>N.key===t.key),r=e.map.get(t.key);h(r&&r.getPluginData(we)==="complete","DESIGN_PENDING_NODE_NOT_COMPLETE"),M(e,c,r),e.state.cursor=e.order.filter(N=>e.map.has(N.key)).length}if(t.kind==="reactions"&&h(i.digest===ee(e,e.map.get(t.key),i),"DESIGN_PENDING_REACTION_CONFLICT"),t.kind==="order"&&h($(j(e,i))===$(te(e,e.map.get(t.key).children)),"DESIGN_PENDING_LAYER_CONFLICT"),t.kind==="flows"){let c=new Set([...e.map.values()].map(r=>r.id));h($(_e(e,i))===$(fe(e,e.scope.page.flowStartingPoints.filter(r=>c.has(r.nodeId)))),"DESIGN_PENDING_FLOW_CONFLICT")}u(e)}function Ne(e){return{applied:e.map.size,total:e.spec.nodes.length,finalizedNodes:e.state.finalizeCursor??0,pending:W(e.state.pending),finalized:e.state.finalized===!0}}async function rt(e){let t=[];try{Y(e)}catch(d){t.push(d.message)}let n=new Map([...e.map].map(([d,g])=>[g.id,d])),i=new Map([...e.variables].map(([d,g])=>[g.id,d])),c=new Map([...e.styles].map(([d,g])=>[g.id,d])),r=new Map([...e.images].map(([d,g])=>[g,d]));function N(d){let g={type:d.type,opacity:d.opacity??1};return d.type==="SOLID"?(g.color=ne(d.color),d.boundVariables?.color&&(g.variableKey=i.get(d.boundVariables.color.id)??"UNKNOWN")):d.type==="IMAGE"?(g.assetKey=r.get(d.imageHash)??"UNKNOWN",g.scaleMode=d.scaleMode):d.type==="GRADIENT_LINEAR"&&(g.gradientTransform=ne(d.gradientTransform),g.gradientStops=ne(d.gradientStops)),g}let y=[],I=[];for(let d of e.order){let g=e.map.get(d.key);if(!g){t.push(`MISSING_NODE:${d.key}`);continue}let _=w(e,g);if(delete _.parentKey,g.type==="TEXT"&&(_.textStyleId=g.textStyleId),g.type==="INSTANCE"){let H=await g.getMainComponentAsync();_.componentId=H?.id??null,n.get(_.componentId)!==d.props.componentKey&&t.push(`INSTANCE_COMPONENT_MISMATCH:${d.key}`)}let R={};for(let[H,ie]of Object.entries(_))["type","name","x","y","width","height"].includes(H)||(R[H]=ie);Array.isArray(g.fills)&&(R.fills=g.fills.map(N)),Array.isArray(g.strokes)&&(R.strokes=g.strokes.map(N)),"textStyleId"in R&&(R.textStyleId&&(R.textStyleKey=c.get(R.textStyleId)??"UNKNOWN"),delete R.textStyleId),"componentId"in R&&(R.componentKey=n.get(R.componentId)??"UNKNOWN",delete R.componentId),"overflowDirection"in R&&(R.overflowDirection=on[R.overflowDirection]??R.overflowDirection);let F=g.parent===e.scope.root?null:n.get(g.parent?.id)??"UNKNOWN";F!==d.parentKey&&t.push(`PARENT_MISMATCH:${d.key}`),y.push({key:d.key,id:g.id,type:g.type,name:g.name,parentKey:F,x:g.x,y:g.y,width:g.width,height:g.height,props:R,..."children"in g&&g.type!=="INSTANCE"?{childKeys:g.children.map(H=>n.get(H.id)??"FOREIGN")}:{}});let V=x(e,d),q=B(g);$(q)!==$(V)&&t.push(`REACTION_MISMATCH:${d.key}`);for(let H of q)for(let ie of H.actions)ie.type==="NODE"&&I.push({sourceKey:d.key,destinationKey:n.get(ie.destinationId)??"UNKNOWN",trigger:H.trigger.type==="AFTER_TIMEOUT"?{type:"AFTER_TIMEOUT",delaySeconds:H.trigger.timeout/(e.timerUnit==="milliseconds"?1e3:1)}:H.trigger});if(g.type!=="INSTANCE"&&"children"in g){let H=e.children.get(d.key)??[],ie=[...H.filter(ae=>!ae.props?.isFixed),...H.filter(ae=>ae.props?.isFixed)].map(ae=>ae.key);$(ie)!==$(g.children.map(ae=>n.get(ae.id)))&&t.push(`LAYER_ORDER_MISMATCH:${d.key}`)}}let S=(e.scope.page.flowStartingPoints??[]).filter(d=>n.has(d.nodeId)).map(d=>({nodeKey:n.get(d.nodeId),name:d.name}));return $(S)!==$(e.spec.flows??[])&&t.push("FLOW_MISMATCH"),e.state.pending&&t.push("UNRESOLVED_PENDING_OPERATION"),e.state.complete||t.push("DESIGN_NOT_COMPLETE"),e.styles.size!==(e.spec.textStyles?.length??0)&&t.push("TEXT_STYLE_COUNT_MISMATCH"),e.variables.size!==(e.spec.variables?.length??0)&&t.push("VARIABLE_COUNT_MISMATCH"),{schemaVersion:"1.0",runId:e.payload.runId,specId:e.spec.id,specSignature:e.signature,collectedAt:new Date().toISOString(),fileIdentity:{fileKey:o.fileKey},scope:{pageId:e.scope.page.id,rootNodeId:e.scope.root.id},status:t.length?"FAIL":"PASS",writes:0,errors:t,nodes:y,reactions:I,flows:S,counts:{nodes:y.length,texts:y.filter(d=>d.type==="TEXT").length,components:y.filter(d=>d.type==="COMPONENT").length,instances:y.filter(d=>d.type==="INSTANCE").length,reactions:I.length,flows:S.length,textStyles:e.styles.size,variables:e.variables.size},textStyles:[...e.styles].map(([d,g])=>({key:d,...z(g),name:e.spec.textStyles.find(_=>_.key===d).name})),variables:[...e.variables].map(([d,g])=>({key:d,name:e.spec.variables.find(_=>_.key===d).name,value:Object.values(g.valuesByMode)[0]})),fontSubstitutions:e.substitutions,timerUnit:e.timerUnit,playback:"NOT VERIFIED",checkpoint:Ne(e)}}function $t(e,t){let n=e.payload.auditOffset??0,i=e.payload.auditLimit??1e3;h(Number.isInteger(n)&&n>=0&&n<=25e3&&n<=t.nodes.length,"DESIGN_AUDIT_OFFSET_INVALID"),h(Number.isInteger(i)&&i>=1&&i<=2e3,"DESIGN_AUDIT_LIMIT_INVALID");let{collectedAt:c,...r}=t,N={...t,nodes:t.nodes.slice(n,n+i),page:{offset:n,limit:i,totalNodes:t.nodes.length,nextOffset:n+i<t.nodes.length?n+i:null,snapshotSignature:G(r)}};return h(Le(JSON.stringify(N)).byteLength<7*1024*1024,"DESIGN_AUDIT_RESPONSE_BUDGET_EXCEEDED: reduce auditLimit or split the specification"),N}let at=6e4,le=(e,t)=>$(e)===$(t),dt=e=>{let t=W(e);return delete t.positionRecovery,t.pending=null,t},ct=e=>[...e.map].map(([t,n])=>[t,n.id]);function lt(e){if(e.type==="PAGE")return;let t=e.relativeTransform;h((!["FRAME","COMPONENT"].includes(e.type)||e.layoutMode==="NONE")&&Array.isArray(t)&&t.length===2&&t.every(n=>Array.isArray(n)&&n.length===3&&n.every(Number.isFinite))&&t[0][0]===1&&t[0][1]===0&&t[1][0]===0&&t[1][1]===1,`DESIGN_POSITION_RECOVERY_TRANSFORM:${e.id}`)}function ft(e){lt(e),h(e.type==="PAGE"||e.layoutMode==="NONE",`DESIGN_POSITION_RECOVERY_TRANSFORM:${e.id}`)}function Fe(e){return G({ledger:be(e.scope.root,e.ledgerKey),nodes:[...e.map].map(([t,n])=>({mapKey:t,id:n.id,raw:A(n),parentId:n.parent?.id,children:n.children?.map(i=>i.id),transform:ne(n.relativeTransform),layoutMode:ne(n.layoutMode),reactions:B(n),owner:n.getPluginData(ge),key:n.getPluginData(s.specNodeKey),state:n.getPluginData(we),intent:n.getPluginData(Te),digest:n.getPluginData(me),mapping:b(e,"n",t),order:b(e,"order",t),reaction:b(e,"reactions",t)})),pageChildren:e.scope.page.children.map(t=>t.id),flows:ne(e.scope.page.flowStartingPoints)})}let pt=e=>G({version:e.version,runId:e.runId,specSignature:e.specSignature,generationSignature:e.generationSignature,mappingSignature:e.mappingSignature,changes:e.changes,parents:e.parents,flows:e.flows});function Ge(e,t,n){let i=e.map.get(t.key),c=w(e,i),r=[t.before,{...t.before,parentId:t.after.parentId},{...t.after,y:t.before.y},t.after],N={parentId:i.parent?.id,x:i.x,y:i.y},y=[...n].reverse().find(I=>le(N,r[I])&&G(c)===t.snapshots[I]);return h(y!==void 0,`DESIGN_POSITION_RECOVERY_STATE_CONFLICT:${t.key}`),y}function Pe(e,t,n){let i=new Map(t.parents.map(c=>[c.id,[...c.children]]));return t.changes.forEach((c,r)=>{if(n[r]<1)return;let N=i.get(c.before.parentId),y=i.get(c.after.parentId);h(N&&y&&N.includes(c.id),"DESIGN_POSITION_RECOVERY_ORDER_CONFLICT"),N.splice(N.indexOf(c.id),1);let I=t.parents.find(g=>g.id===c.after.parentId).wanted,S=I.indexOf(c.id),d=y.findIndex(g=>I.indexOf(g)>S);d<0&&(d=y.length),y.splice(d,0,c.id)}),i}function Se(e,t,n){s.assertInScope(e.scope.root,e.scope),h(e.scope.root.type==="PAGE"&&e.existing&&e.state.version===1&&!e.state.complete&&!e.state.finalized&&(e.state.finalizeCursor??0)===0&&Number.isInteger(e.state.cursor)&&e.state.cursor>0&&e.state.cursor===e.map.size&&e.state.cursor<=e.order.length&&e.order.every((y,I)=>e.map.has(y.key)===I<e.state.cursor)&&le(be(e.scope.root,e.ledgerKey),e.state),"DESIGN_POSITION_RECOVERY_CHECKPOINT_CONFLICT"),h(!e.state.pending||n&&n.status==="IN_PROGRESS"&&e.state.pending.kind==="position-recovery"&&e.state.pending.runId===e.payload.runId,"DESIGN_POSITION_RECOVERY_PENDING_CONFLICT");let i=new Set(t),c=new Map,r=[];n&&h(n.version===1&&n.runId===e.payload.runId&&n.specSignature===e.signature&&n.mappingSignature===G(ct(e))&&n.generationSignature===G(dt(e.state))&&n.proofSignature===pt(n)&&le(n.changes.map(y=>y.key),t)&&["IN_PROGRESS","COMPLETE"].includes(n.status)&&Number.isInteger(n.cursor)&&n.cursor>=0&&n.cursor<=t.length&&(n.status==="COMPLETE"?n.cursor===t.length&&!n.pending&&!e.state.pending:!!e.state.pending)&&(!n.pending||n.pending.index===n.cursor&&Number.isInteger(n.pending.stage)&&n.pending.stage>=0&&n.pending.stage<=3)&&Array.isArray(n.parents)&&n.parents.length<=t.length*2&&le(n.flows,e.scope.page.flowStartingPoints??[]),"DESIGN_POSITION_RECOVERY_JOURNAL_CONFLICT");for(let y of e.positionPrefix){let I=e.map.get(y.key),S=y.parentKey?e.map.get(y.parentKey):e.scope.root;if(h(I&&b(e,"n",y.key)?.id===I.id&&I.getPluginData(we)==="complete",`DESIGN_POSITION_RECOVERY_MAPPING_CONFLICT:${y.key}`),lt(I),i.has(y.key)){h(y.type==="FRAME"&&S&&I.parent&&I.getPluginData(Te)===G(y),`DESIGN_POSITION_RECOVERY_CANDIDATE_INVALID:${y.key}`);for(let F of[y,e.definitions.get(e.idToKey.get(I.parent.id))]){let V=F;for(;V;)h(!["COMPONENT","INSTANCE"].includes(V.type)&&(V.key===y.key||!i.has(V.key)),"DESIGN_POSITION_RECOVERY_COMPONENT_UNSUPPORTED"),V=V.parentKey&&e.definitions.get(V.parentKey)}for(let F of[I,S,I.parent])ft(F),F.type!=="PAGE"&&(h(e.map.get(e.idToKey.get(F.id))===F,"DESIGN_POSITION_RECOVERY_PARENT_INVALID"),s.assertTaskOwned(F,e.ownership));h(S.type!=="PAGE"||I.parent===S,"DESIGN_POSITION_RECOVERY_ROOT_REPARENT_UNSUPPORTED");let _=A(I),R={..._,x:y.x,y:y.y,parentKey:S.getPluginData(s.specNodeKey)??""};h(I.getPluginData(me)===G(k(e,R)),`DESIGN_POSITION_RECOVERY_CONTENT_CONFLICT:${y.key}`),L(e,y,I,R);for(let F of I.children)s.assertTaskOwned(F,e.ownership),h(F.getPluginData(ge)===e.ns&&e.map.get(e.idToKey.get(F.id))===F,`DESIGN_FOREIGN_CHILD:${y.key}`);if(c.set(S.id,S),c.set(I.parent.id,I.parent),n){let F=t.indexOf(y.key),V=n.changes[F];h(V.id===I.id&&V.after.parentId===S.id&&V.after.x===y.x&&V.after.y===y.y&&V.digest===I.getPluginData(me)&&V.intent===I.getPluginData(Te)&&Array.isArray(V.snapshots)&&V.snapshots.length===4&&V.snapshots.every(q=>/^[a-f0-9]{64}$/.test(q)),"DESIGN_POSITION_RECOVERY_JOURNAL_CONFLICT"),r[F]=Ge(e,V,F<n.cursor?[3]:F===n.cursor&&n.pending?[n.pending.stage,Math.min(3,n.pending.stage+1)]:[0])}}else{h(I.parent===S,`DESIGN_POSITION_RECOVERY_PARENT_CONFLICT:${y.key}`);let _=M(e,y,I);L(e,y,I,_)}let d=b(e,"reactions",y.key),g=B(I);if(h(d?d.digest===ee(e,I,d):g.length===0||le(g,x(e,y)),`DESIGN_REACTION_USER_EDIT_CONFLICT:${y.key}`),"children"in I&&I.type!=="INSTANCE"){let _=b(e,"order",y.key),R=_?j(e,_):(e.positionChildren.get(y.key)??[]).map(F=>F.key);h(le(I.children.filter(F=>!i.has(e.idToKey.get(F.id))).map(F=>e.idToKey.get(F.id)),R.filter(F=>!i.has(F))),`DESIGN_POSITION_RECOVERY_LAYER_CONFLICT:${y.key}`)}}let N=e.scope.page.children.filter(y=>y.getPluginData(ge)===e.ns);h(le(N.filter(y=>!i.has(e.idToKey.get(y.id))).map(y=>e.idToKey.get(y.id)),(e.positionChildren.get(null)??[]).filter(y=>!i.has(y.key)).map(y=>y.key)),"DESIGN_POSITION_RECOVERY_PAGE_ORDER_CONFLICT");for(let[y,I]of e.styles)h(b(e,"style",y)?.digest===G(z(I)),`DESIGN_STYLE_USER_EDIT_CONFLICT:${y}`);for(let[y,I]of e.variables)h(b(e,"variable",y)?.digest===G(se(I)),`DESIGN_VARIABLE_USER_EDIT_CONFLICT:${y}`);if(e.collection&&h(b(e,"collection","colors")?.digest===G(E(e.collection)),"DESIGN_COLLECTION_USER_EDIT_CONFLICT"),De(e),n){for(let S of n.parents){let d=S.id===e.scope.page.id?e.scope.page:e.map.get(e.idToKey.get(S.id));h(d&&Array.isArray(S.children)&&Array.isArray(S.wanted)&&S.children.length<=25e3&&S.wanted.length<=25e3,"DESIGN_POSITION_RECOVERY_JOURNAL_CONFLICT"),ft(d),d.type!=="PAGE"&&s.assertTaskOwned(d,e.ownership),c.set(d.id,d)}let y=Pe(e,n,r);![...y].every(([S,d])=>le(c.get(S).children.map(g=>g.id),d))&&n.pending&&r[n.cursor]>n.pending.stage&&(r[n.cursor]=Ge(e,n.changes[n.cursor],[n.pending.stage]),y=Pe(e,n,r));for(let[S,d]of y)h(le(c.get(S).children.map(g=>g.id),d),"DESIGN_POSITION_RECOVERY_ORDER_CONFLICT")}return{parents:c,stages:r}}async function vt(e){let t=e.payload.positionRecovery;h(["scope_design_plan","scope_design_apply"].includes(e.message.command)&&t&&typeof t=="object"&&!Array.isArray(t)&&Object.keys(t).every(d=>["nodeKeys","planSignature"].includes(d))&&Array.isArray(t.nodeKeys)&&t.nodeKeys.length>=1&&t.nodeKeys.length<=20&&t.nodeKeys.every(d=>typeof d=="string"&&e.map.has(d))&&new Set(t.nodeKeys).size===t.nodeKeys.length,"DESIGN_POSITION_RECOVERY_REQUEST_INVALID");let n=e.message.command==="scope_design_plan",i=t.nodeKeys;h(n?t.planSignature===void 0:e.payload.reconcile===!0&&typeof t.planSignature=="string"&&/^[a-f0-9]{64}$/.test(t.planSignature),"DESIGN_POSITION_RECOVERY_RECONCILE_REQUIRED"),h(Le($(e.state)).length<=at,"DESIGN_POSITION_RECOVERY_LEDGER_BUDGET"),e.positionPrefix=e.order.slice(0,e.state.cursor),e.positionChildren=new Map;for(let d of e.positionPrefix)e.positionChildren.has(d.parentKey)||e.positionChildren.set(d.parentKey,[]),e.positionChildren.get(d.parentKey).push(d);let c=Fe(e);await U(e,!1),await X(e),h(c===Fe(e),"DESIGN_POSITION_RECOVERY_STALE_WORLD");let r=e.state.positionRecovery,N=Se(e,i,r);if(!r){let d=[...N.parents.values()].map(g=>({id:g.id,children:g.children.map(_=>_.id),wanted:g.type==="PAGE"?g.children.filter(_=>!i.includes(e.idToKey.get(_.id))||e.definitions.get(e.idToKey.get(_.id))?.parentKey===null).map(_=>_.id):(b(e,"order",e.idToKey.get(g.id))?j(e,b(e,"order",e.idToKey.get(g.id))):(e.positionChildren.get(e.idToKey.get(g.id))??[]).map(_=>_.key)).map(_=>e.map.get(_).id)}));r={version:1,runId:e.payload.runId,specSignature:e.signature,generationSignature:G(dt(e.state)),mappingSignature:G(ct(e)),status:"IN_PROGRESS",cursor:0,pending:null,parents:d,flows:W(e.scope.page.flowStartingPoints??[]),changes:i.map(g=>{let _=e.map.get(g),R=e.definitions.get(g),F=R.parentKey?e.map.get(R.parentKey):e.scope.root,V={parentId:_.parent.id,x:_.x,y:_.y},q={parentId:F.id,x:R.x,y:R.y},H=w(e,_),ie=F.getPluginData(s.specNodeKey)??"";return{key:g,id:_.id,before:V,after:q,digest:_.getPluginData(me),intent:_.getPluginData(Te),snapshots:[H,{...H,parentKey:ie},{...H,parentKey:ie,x:q.x},{...H,parentKey:ie,x:q.x,y:q.y}].map(G)}})},r.proofSignature=pt(r)}let y=G({runId:e.payload.runId,specSignature:e.signature,requestedKeys:i,world:Fe(e),journal:r}),I=r.status==="COMPLETE",S=(d,g={})=>({status:d,runId:e.payload.runId,specId:e.spec.id,specSignature:e.signature,checkpoint:Ne(e),positionRecovery:{version:1,maxStagesPerRequest:1,status:r.status==="COMPLETE"?"COMPLETE":n?"PLANNED":"IN_PROGRESS",nodeKeys:W(i),planSignature:y,changes:r.changes.map(({key:_,id:R,before:F,after:V})=>({key:_,id:R,before:W(F),after:W(V)})),...n?{}:{acceptedPlanSignature:t.planSignature},...I?{idempotent:!0}:{}},fontSubstitutions:e.substitutions,...g});if(n)return S(e.state.pending?"NEEDS_RECONCILIATION":"PLANNED",{writes:0});if(h(t.planSignature===y,"DESIGN_POSITION_RECOVERY_STALE_SIGNATURE"),r.status==="COMPLETE")return S("IN_PROGRESS",{writes:0,nextAction:"apply-next-batch"});try{if(e.state.positionRecovery||(e.state.positionRecovery=r,e.state.pending={kind:"position-recovery",runId:e.payload.runId,operationId:e.message.operationId},h(Le($(e.state)).length<=at,"DESIGN_POSITION_RECOVERY_LEDGER_BUDGET"),m(e)),r.cursor<r.changes.length){let d=r.cursor,g=r.changes[d],_=e.map.get(g.key);r.pending||(r.pending={index:d,stage:0},m(e));let R=Se(e,i,r).stages[d];if(R<3){if(r.pending.stage=R,m(e),Se(e,i,r),R===0&&_.parent.id!==g.after.parentId||R===0&&!le(_.parent.children.map(V=>V.id),Pe(e,r,r.changes.map((V,q)=>q<=d?q===d?1:3:0)).get(g.after.parentId))){let V=e.map.get(e.idToKey.get(g.after.parentId))??e.scope.page,q=Pe(e,r,r.changes.map((H,ie)=>ie<=d?ie===d?1:3:0)).get(V.id);h(typeof V.insertChild=="function","DESIGN_POSITION_RECOVERY_INSERT_UNAVAILABLE"),l(),V.insertChild(q.indexOf(_.id),_)}R===1&&_.x!==g.after.x&&(l(),_.x=g.after.x),R===2&&_.y!==g.after.y&&(l(),_.y=g.after.y),Ge(e,g,[R+1]),Se(e,i,r),R+=1,r.pending.stage=R,m(e),Se(e,i,r)}R===3&&(r.cursor+=1,r.pending=null,m(e));let F=S("IN_PROGRESS",{nextAction:"plan"});return F.positionRecovery.checkpointed=!0,F}return Y(e),Se(e,i,r),r.status="COMPLETE",e.state.pending=null,m(e),Y(e),Se(e,i,r),S("IN_PROGRESS",{nextAction:"apply-next-batch"})}catch(d){return e.state=be(e.scope.root,e.ledgerKey),r=e.state.positionRecovery??r,S("PARTIAL_FAILURE",{error:String(d.message).slice(0,500),nextAction:"plan",replay:"PROHIBITED_UNTIL_READBACK_RECONCILIATION"})}}async function Mt(e){h(!a,"DESIGN_RUNTIME_BUSY"),a=!0;try{let t=await O(e);if(t.payload.positionRecovery!==void 0)return await vt(t);if(t.payload.adoptNativeFlow!==void 0&&h(e.command==="scope_design_apply"&&t.payload.reconcile===!0&&t.state.pending?.kind==="reactions","DESIGN_NATIVE_FLOW_ADOPTION_INVALID"),await U(t,e.command==="scope_design_apply"),await X(t),e.command==="scope_design_audit")return $t(t,await rt(t));if(Y(t),e.command==="scope_design_plan")return{status:t.state.pending?"NEEDS_RECONCILIATION":"PLANNED",writes:0,specId:t.spec.id,specSignature:t.signature,runId:t.payload.runId,checkpoint:Ne(t),fontSubstitutions:t.substitutions,globalResources:{textStyles:t.spec.textStyles?.length??0,variables:t.spec.variables?.length??0,requiresExplicitAuthorization:!!(t.spec.textStyles?.length||t.spec.variables?.length)},timerUnit:t.timerUnit,playback:"NOT VERIFIED"};if(e.command==="scope_design_export_png"){let i=t.map.get(t.payload.nodeKey);h(i,"DESIGN_EXPORT_NODE_MISSING"),s.assertTaskOwnedSubtree(i,t.ownership);let c=t.payload.scale??1;h(Number.isFinite(c)&&c>=1&&c<=4,"DESIGN_EXPORT_SCALE_INVALID");let r=await i.exportAsync({format:"PNG",constraint:{type:"SCALE",value:c}});return{status:"PASS",writes:0,runId:t.payload.runId,specId:t.spec.id,nodeKey:t.payload.nodeKey,width:i.width,height:i.height,scale:c,bytesBase64:sn(r),sha256:Ye(xe(r)),fileIdentity:{fileKey:o.fileKey}}}h(e.command==="scope_design_apply","DESIGN_COMMAND_INVALID");let n=t.payload.batchSize??100;if(h(Number.isInteger(n)&&n>=1&&n<=500,"DESIGN_BATCH_SIZE_INVALID"),(t.spec.textStyles?.length||t.spec.variables?.length)&&h(t.payload.allowGlobalResources===!0,"DESIGN_GLOBAL_RESOURCES_AUTH_REQUIRED"),t.state.pending){if(t.payload.reconcile!==!0)return{status:"NEEDS_RECONCILIATION",runId:t.payload.runId,specId:t.spec.id,checkpoint:Ne(t),nextAction:"audit"};await Kt(t)}if(t.state.complete){let i=await rt(t);return h(i.status==="PASS",`DESIGN_COMPLETED_DRIFT:${i.errors.join(",")}`),{status:"COMPLETE",runId:t.payload.runId,specId:t.spec.id,checkpoint:Ne(t),nextAction:"audit",idempotent:!0}}t.scope.root.type!=="PAGE"&&s.assertTaskOwned(t.scope.root,t.ownership),(t.spec.flows?.length??0)>0&&h(t.scope.root.type==="PAGE","DESIGN_FLOW_REQUIRES_PAGE_SCOPE"),o.currentPage.id!==t.scope.page.id&&await o.setCurrentPageAsync(t.scope.page);try{De(t),m(t),await K(t);let i=0;for(let c of t.order)if(!t.map.has(c.key)&&(await Q(t,c),i+=1,i>=n))break;return t.map.size===t.spec.nodes.length&&i<n&&await kt(t,n-i),{status:t.state.complete?"COMPLETE":"IN_PROGRESS",runId:t.payload.runId,specId:t.spec.id,checkpoint:Ne(t),nextAction:t.state.complete?"audit":"apply-next-batch",fontSubstitutions:t.substitutions,nodeMap:Object.fromEntries([...t.map].map(([c,r])=>[c,r.id]))}}catch(i){return{status:"PARTIAL_FAILURE",runId:t.payload.runId,specId:t.spec.id,checkpoint:Ne(t),nextAction:"audit",error:String(i.message).slice(0,500),replay:"PROHIBITED_UNTIL_READBACK_RECONCILIATION",...i.readbackMismatch?{readbackMismatch:i.readbackMismatch}:{}}}}finally{a=!1}}return{execute:Mt}}return zt(an);})();
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
]);
const READ_COMMANDS = new Set(["status", "read_document", "scope_read_node"]);
const SCOPED_MUTATIONS = new Set(["scope_create_frame", "scope_update_frame", "scope_delete_node", "scope_set_prototype",
  "scope_create_foreign_fixture", "scope_delete_foreign_fixture",
  "scope_design_plan", "scope_design_apply", "scope_design_audit", "scope_design_export_png"]);
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
