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
var BridgeDesignRuntime=(()=>{var Te=Object.defineProperty;var _t=Object.getOwnPropertyDescriptor;var Ot=Object.getOwnPropertyNames;var Ct=Object.prototype.hasOwnProperty;var wt=(o,i,r)=>i in o?Te(o,i,{enumerable:!0,configurable:!0,writable:!0,value:r}):o[i]=r;var Dt=(o,i)=>{for(var r in i)Te(o,r,{get:i[r],enumerable:!0})},kt=(o,i,r,d)=>{if(i&&typeof i=="object"||typeof i=="function")for(let l of Ot(i))!Ct.call(o,l)&&l!==r&&Te(o,l,{get:()=>i[l],enumerable:!(d=_t(i,l))||d.enumerable});return o};var Lt=o=>kt(Te({},"__esModule",{value:!0}),o);var q=(o,i,r)=>wt(o,typeof i!="symbol"?i+"":i,r);var jt={};Dt(jt,{canonical:()=>M,createDesignRuntime:()=>Wt,designSignature:()=>z,utf8ToBytes:()=>Xe});var Rt=o=>o/2**32|0,$t=o=>o>>>0;function nt(o,i,r,d){let l=Rt(r),I=$t(r);o.setUint32(i,d?I:l,d),o.setUint32(i+4,d?l:I,d)}function ot(o){return o instanceof Uint8Array||ArrayBuffer.isView(o)&&o.constructor.name==="Uint8Array"&&"BYTES_PER_ELEMENT"in o&&o.BYTES_PER_ELEMENT===1}var $e=o=>o?`"${o}" `:"";function Kt(o,i=""){if(typeof o!="number")throw new TypeError($e(i)+"expected number, got "+typeof o);if(!Number.isSafeInteger(o)||o<0)throw new RangeError($e(i)+"expected integer >= 0, got "+o);return o}function _e(o,i,r=""){if(ot(o)&&(i===void 0||o.length===i))return o;i!==void 0&&Kt(i,"length");let d=ot(o),l=i!==void 0?` of length ${i}`:"",I=d?`length=${o.length}`:`type=${typeof o}`,N=$e(r)+"expected Uint8Array"+l+", got "+I;throw d?new RangeError(N):new TypeError(N)}var Mt=(o,i)=>{if(o===null||typeof o!="object"||Array.isArray(o))throw new TypeError((i==="object"?"":`"${i}" `)+"expected object, got type="+typeof o)},it=(o,i)=>{Mt(o,i);let r=Object.getPrototypeOf(o);if(r!==Object.prototype&&r!==null)throw new TypeError(`"${i}" expected plain object`);if(Object.hasOwn(o,"__proto__"))throw new TypeError(`"${i}.__proto__" is not allowed`)};function Ke(o,i=!0){if(o.destroyed)throw new Error("hash was destroyed");if(i&&o.finished)throw new Error("digest() was already called")}function st(o,i){_e(o,void 0,"output");let r=i.outputLen;if(!(o.length>=r))throw new RangeError('"output" expected length >= '+r)}function Me(...o){for(let i=0;i<o.length;i++)o[i].fill(0)}function Oe(o){return new DataView(o.buffer,o.byteOffset,o.byteLength)}function se(o,i){return o<<32-i|o>>>i}var vt=typeof Uint8Array.from([]).toHex=="function"&&typeof Uint8Array.fromHex=="function",Ft=Array.from({length:256},(o,i)=>i.toString(16).padStart(2,"0"));function ve(o){if(_e(o),vt)return o.toHex();let i="";for(let r=0;r<o.length;r++)i+=Ft[o[r]];return i}function Pt(o,i,r="opts"){return it(o,"defaults"),i!==void 0&&it(i,r),Object.assign(Object.create(null),o,i)}function rt(o,i={}){if(typeof o!="function")throw new TypeError('"hashCons" expected function, got type='+typeof o);i=Pt({},i,"info");let r=(l,I)=>o(I).update(l).digest(),d=o(void 0);return r.outputLen=d.outputLen,r.blockLen=d.blockLen,r.canXOF=d.canXOF,r.create=l=>o(l),Object.assign(r,i),Object.freeze(r)}var at=o=>({oid:Uint8Array.from([6,9,96,134,72,1,101,3,4,2,o])});function ct(o,i,r){return o&i^~o&r}function lt(o,i,r){return o&i^o&r^i&r}var Ce=class{constructor(i,r,d,l){q(this,"blockLen");q(this,"outputLen");q(this,"canXOF",!1);q(this,"padOffset");q(this,"isLE");q(this,"buffer");q(this,"view");q(this,"finished",!1);q(this,"length",0);q(this,"pos",0);q(this,"destroyed",!1);this.blockLen=i,this.outputLen=r,this.padOffset=d,this.isLE=l,this.buffer=new Uint8Array(i),this.view=Oe(this.buffer)}update(i){Ke(this),_e(i);let{view:r,buffer:d,blockLen:l}=this,I=i.length,N=!1;for(let S=0;S<I;){let A=Math.min(l-this.pos,I-S);if(A===l){let O=Oe(i);for(;l<=I-S;S+=l)this.process(O,S);N=!0;continue}d.set(S===0&&A===I?i:i.subarray(S,S+A),this.pos),this.pos+=A,S+=A,this.pos===l&&(this.process(r,0),this.pos=0,N=!0)}return this.length+=i.length,N&&this.roundClean(),this}digestInto(i){Ke(this),st(i,this),this.finished=!0;let{buffer:r,view:d,blockLen:l,isLE:I}=this,{pos:N}=this;r[N++]=128,r.fill(0,N),this.padOffset>l-N&&(this.process(d,0),r.fill(0)),nt(d,l-8,this.length*8,I),this.process(d,0),this.roundClean();let S=i===r?d:Oe(i),A=this.outputLen,O=A/4,$=this.get();if(A%4||O>$.length)throw new Error("invalid outputLen");for(let b=0;b<O;b++)S.setUint32(4*b,$[b],I)}digest(){let{buffer:i,outputLen:r}=this;this.digestInto(i);let d=i.slice(0,r);return this.destroy(),d}_cloneIntoMeta(i){let{buffer:r,length:d,finished:l,destroyed:I,pos:N}=this;return i.destroyed=I,i.finished=l,i.length=d,i.pos=N,N&&i.buffer.set(r),i}clone(){return this._cloneInto()}},dt=Uint32Array.from([1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225]);var Gt=Uint32Array.from([1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298]),fe=new Uint32Array(64),Fe=class extends Ce{constructor(r,d){super(64,r,8,!1);q(this,"A",0);q(this,"B",0);q(this,"C",0);q(this,"D",0);q(this,"E",0);q(this,"F",0);q(this,"G",0);q(this,"H",0);this.A=d[0]|0,this.B=d[1]|0,this.C=d[2]|0,this.D=d[3]|0,this.E=d[4]|0,this.F=d[5]|0,this.G=d[6]|0,this.H=d[7]|0}get(){let{A:r,B:d,C:l,D:I,E:N,F:S,G:A,H:O}=this;return[r,d,l,I,N,S,A,O]}set(r,d,l,I,N,S,A,O){this.A=r|0,this.B=d|0,this.C=l|0,this.D=I|0,this.E=N|0,this.F=S|0,this.G=A|0,this.H=O|0}_cloneInto(r){return(r||(r=new this.constructor)).set(...this.get()),this._cloneIntoMeta(r)}process(r,d){for(let L=0;L<16;L++,d+=4)fe[L]=r.getUint32(d,!1);for(let L=16;L<64;L++){let C=fe[L-15],K=fe[L-2],U=se(C,7)^se(C,18)^C>>>3,k=se(K,17)^se(K,19)^K>>>10;fe[L]=k+fe[L-7]+U+fe[L-16]|0}let{A:l,B:I,C:N,D:S,E:A,F:O,G:$,H:b}=this;for(let L=0;L<64;L++){let C=se(A,6)^se(A,11)^se(A,25),K=b+C+ct(A,O,$)+Gt[L]+fe[L]|0,k=(se(l,2)^se(l,13)^se(l,22))+lt(l,I,N)|0;b=$,$=O,O=A,A=S+K|0,S=N,N=I,I=l,l=K+k|0}l=l+this.A|0,I=I+this.B|0,N=N+this.C|0,S=S+this.D|0,A=A+this.E|0,O=O+this.F|0,$=$+this.G|0,b=b+this.H|0,this.set(l,I,N,S,A,O,$,b)}roundClean(){Me(fe)}destroy(){this.destroyed=!0,this.set(0,0,0,0,0,0,0,0),Me(this.buffer)}},Pe=class extends Fe{constructor(){super(32,dt)}};var Ge=rt(()=>new Pe,at(1));var me=Object.freeze({nodes:25e3,assets:2e3,reactions:3e4,assetBytes:20971520,totalAssetBytes:83886080}),we=class extends Error{constructor(i){super(`Invalid DesignSpec: ${i.slice(0,5).map(r=>`${r.path}: ${r.message}`).join("; ")}`),this.name="DesignSpecError",this.issues=i}},xt=["FRAME","TEXT","RECTANGLE","ELLIPSE","VECTOR","COMPONENT","INSTANCE"],Ht=["fills","strokes","strokeWeight","strokeAlign","dashPattern","effects","cornerRadius","opacity","clipsContent","overflowDirection","layoutPositioning","isFixed","visible","characters","fontName","fontSize","fontWeight","lineHeight","letterSpacing","textAlignHorizontal","textAutoResize","textStyleKey","componentKey","vectorPaths","overrides"],ft=new Set(["__proto__","constructor","prototype"]);function pt(o){let i=[],r=(y,c)=>{i.length<100&&i.push({path:y,message:c})},d=(y,c,u)=>{if(!y||typeof y!="object"||Array.isArray(y)||![Object.prototype,null].includes(Object.getPrototypeOf(y)))return r(c,"Expected plain object"),!1;for(let R of Object.keys(y))(!u.includes(R)||ft.has(R))&&r(`${c}.${R}`,"Unknown property");return!0},l=(y,c,u=256,R=!1)=>{(typeof y!="string"||!R&&!y.length||y.length>u||y.includes("\0"))&&r(c,`Expected ${R?"":"nonempty "}string, maximum ${u} characters`)},I=(y,c)=>{l(y,c,160),typeof y=="string"&&(!/^[A-Za-z0-9][A-Za-z0-9_.:/-]*$/.test(y)||ft.has(y))&&r(c,"Invalid stable key")},N=(y,c,u=-1e7,R=1e7)=>{(typeof y!="number"||!Number.isFinite(y)||y<u||y>R)&&r(c,`Expected finite number in [${u}, ${R}]`)},S=(y,c,u)=>{u.includes(y)||r(c,`Expected one of ${u.join(", ")}`)},A=(y,c)=>{typeof y!="boolean"&&r(c,"Expected boolean")},O=(y,c,u)=>!Array.isArray(y)||y.length>u?(r(c,`Expected array, maximum ${u} entries`),[]):y,$=(y,c)=>{d(y,c,["family","style"])&&(l(y.family,`${c}.family`,128),l(y.style,`${c}.style`,128))},b=(y,c,u=!1)=>{if(d(y,c,u?["r","g","b","a"]:["r","g","b"]))for(let R of u?["r","g","b","a"]:["r","g","b"])N(y[R],`${c}.${R}`,0,1)},L=(y,c,u=!1)=>{d(y,c,["unit","value"])&&(S(y.unit,`${c}.unit`,u?["PIXELS","PERCENT","AUTO"]:["PIXELS","PERCENT"]),y.unit!=="AUTO"?N(y.value,`${c}.value`,u?0:-1e4,1e5):y.value!==void 0&&N(y.value,`${c}.value`,0,1e5))};if(!d(o,"$",["schemaVersion","id","name","source","nodes","assets","textStyles","variables","reactions","flows","fontPolicy"]))throw new we(i);if(S(o.schemaVersion,"$.schemaVersion",["1.0"]),I(o.id,"$.id"),l(o.name,"$.name",512),o.source!==void 0&&d(o.source,"$.source",["revision","capturedAt","adapter","url"])){for(let y of["revision","adapter"])o.source[y]!==void 0&&l(o.source[y],`$.source.${y}`,256);o.source.capturedAt!==void 0&&(l(o.source.capturedAt,"$.source.capturedAt",64),Number.isFinite(Date.parse(o.source.capturedAt))||r("$.source.capturedAt","Invalid timestamp")),o.source.url!==void 0&&(l(o.source.url,"$.source.url",2048),(typeof o.source.url!="string"||!/^https?:\/\/(?:\[[a-fA-F0-9:]+\]|[A-Za-z0-9.-]+)(?::[0-9]{1,5})?(?:\/[^\s?#\\]*)?$/.test(o.source.url))&&r("$.source.url","Only HTTP(S) source URL without credentials, query or fragment is allowed"))}o.fontPolicy!==void 0&&d(o.fontPolicy,"$.fontPolicy",["allowFallback","fallback"])&&(A(o.fontPolicy.allowFallback,"$.fontPolicy.allowFallback"),o.fontPolicy.fallback!==void 0&&$(o.fontPolicy.fallback,"$.fontPolicy.fallback"),o.fontPolicy.allowFallback&&!o.fontPolicy.fallback&&r("$.fontPolicy.fallback","Fallback font required when enabled"));let C={nodes:new Map,assets:new Map,variables:new Map,textStyles:new Map},K=(y,c)=>O(o[y]??[],`$.${y}`,c).map((u,R)=>{let T=`$.${y}[${R}]`;return u&&typeof u=="object"&&(I(u.key,`${T}.key`),C[y].has(u.key)&&r(`${T}.key`,"Duplicate key"),C[y].set(u.key,u)),[u,T]}),U=0;for(let[y,c]of K("assets",me.assets))if(d(y,c,["key","mimeType","dataBase64"])&&(S(y.mimeType,`${c}.mimeType`,["image/png","image/jpeg","image/webp"]),l(y.dataBase64,`${c}.dataBase64`,Math.ceil(me.assetBytes/3)*4),typeof y.dataBase64=="string")){/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(y.dataBase64)||r(`${c}.dataBase64`,"Invalid base64"),U+=Math.floor(y.dataBase64.length*3/4);let u={"image/png":/^iVBORw0KGgo/,"image/jpeg":/^\/9j\//,"image/webp":/^UklGR/}[y.mimeType];u&&!u.test(y.dataBase64)&&r(`${c}.dataBase64`,"Image signature does not match MIME type")}U>me.totalAssetBytes&&r("$.assets","Total asset byte budget exceeded");for(let[y,c]of K("variables",5e3))d(y,c,["key","name","value"])&&(l(y.name,`${c}.name`,256),b(y.value,`${c}.value`,!0));for(let[y,c]of K("textStyles",5e3))d(y,c,["key","name","fontName","fontSize","lineHeight","letterSpacing"])&&(l(y.name,`${c}.name`,256),$(y.fontName,`${c}.fontName`),N(y.fontSize,`${c}.fontSize`,.1,1e4),y.lineHeight!==void 0&&L(y.lineHeight,`${c}.lineHeight`,!0),y.letterSpacing!==void 0&&L(y.letterSpacing,`${c}.letterSpacing`));let k=K("nodes",me.nodes);k.length||r("$.nodes","At least one node required");let P=(y,c,u)=>{I(c,u),C[y].has(c)||r(u,`Unknown ${y} reference`)},B=(y,c,u=!0)=>{for(let[R,T]of O(y,c,16).entries()){let w=`${c}[${R}]`;if(d(T,w,["type","color","opacity","variableKey","assetKey","scaleMode","gradientStops","gradientTransform"])){if(S(T.type,`${w}.type`,u?["SOLID","IMAGE","GRADIENT_LINEAR"]:["SOLID"]),T.opacity!==void 0&&N(T.opacity,`${w}.opacity`,0,1),T.type==="SOLID")b(T.color,`${w}.color`),T.variableKey!==void 0&&P("variables",T.variableKey,`${w}.variableKey`),(T.assetKey!==void 0||T.scaleMode!==void 0)&&r(w,"Image fields require IMAGE paint");else if(T.type==="IMAGE")P("assets",T.assetKey,`${w}.assetKey`),T.scaleMode!==void 0&&S(T.scaleMode,`${w}.scaleMode`,["FILL","FIT","CROP","TILE"]),(T.color!==void 0||T.variableKey!==void 0)&&r(w,"Solid fields require SOLID paint");else if(T.type==="GRADIENT_LINEAR"){["color","variableKey","assetKey","scaleMode"].some(G=>T[G]!==void 0)&&r(w,"Solid and image fields are invalid on gradients");let j=O(T.gradientStops,`${w}.gradientStops`,16);j.length<2&&r(`${w}.gradientStops`,"Expected at least two color stops");for(let[G,Z]of j.entries()){let J=`${w}.gradientStops[${G}]`;d(Z,J,["position","color"])&&(N(Z.position,`${J}.position`,0,1),b(Z.color,`${J}.color`,!0),G&&Z.position<j[G-1]?.position&&r(`${J}.position`,"Color stops must be nondecreasing"))}let V=O(T.gradientTransform,`${w}.gradientTransform`,2);V.length!==2&&r(`${w}.gradientTransform`,"Expected a two by three transform");for(let[G,Z]of V.entries()){let J=O(Z,`${w}.gradientTransform[${G}]`,3);J.length!==3&&r(`${w}.gradientTransform[${G}]`,"Expected three transform values");for(let[re,ue]of J.entries())N(ue,`${w}.gradientTransform[${G}][${re}]`,-1e4,1e4)}V.length===2&&V.every(G=>Array.isArray(G)&&G.length===3&&G.every(Number.isFinite))&&Math.abs(V[0][0]*V[1][1]-V[0][1]*V[1][0])<=1e-8&&r(`${w}.gradientTransform`,"Transform must be invertible")}T.type!=="GRADIENT_LINEAR"&&(T.gradientStops!==void 0||T.gradientTransform!==void 0)&&r(w,"Gradient fields require GRADIENT_LINEAR paint")}}};for(let[y,c]of k)if(d(y,c,["key","type","name","parentKey","x","y","width","height","props"])){S(y.type,`${c}.type`,xt),y.name!==void 0&&l(y.name,`${c}.name`,512);for(let R of["x","y"])N(y[R],`${c}.${R}`);for(let R of["width","height"])N(y[R],`${c}.${R}`,.01,1e5);y.parentKey!==null?(P("nodes",y.parentKey,`${c}.parentKey`),["FRAME","COMPONENT"].includes(C.nodes.get(y.parentKey)?.type)||r(`${c}.parentKey`,"Parent must be FRAME or COMPONENT")):["FRAME","COMPONENT"].includes(y.type)||r(c,"Root node must be FRAME or COMPONENT");let u=y.props??{};if(!d(u,`${c}.props`,Ht))continue;for(let R of["visible","clipsContent","isFixed"])u[R]!==void 0&&A(u[R],`${c}.props.${R}`);u.clipsContent!==void 0&&!["FRAME","COMPONENT","INSTANCE"].includes(y.type)&&r(`${c}.props.clipsContent`,"Clipping requires FRAME, COMPONENT or INSTANCE"),u.cornerRadius!==void 0&&!["FRAME","COMPONENT","INSTANCE","RECTANGLE"].includes(y.type)&&r(`${c}.props.cornerRadius`,"Corner radius requires a rectangular node"),u.isFixed&&(y.parentKey===null||!["HORIZONTAL","VERTICAL","BOTH"].includes(C.nodes.get(y.parentKey)?.props?.overflowDirection))&&r(`${c}.props.isFixed`,"Fixed child requires a scrolling parent");for(let R of["strokeWeight","cornerRadius"])u[R]!==void 0&&N(u[R],`${c}.props.${R}`,0,1e5);if(u.opacity!==void 0&&N(u.opacity,`${c}.props.opacity`,0,1),u.layoutPositioning!==void 0&&S(u.layoutPositioning,`${c}.props.layoutPositioning`,["AUTO","ABSOLUTE"]),u.overflowDirection!==void 0&&(S(u.overflowDirection,`${c}.props.overflowDirection`,["NONE","HORIZONTAL","VERTICAL","BOTH"]),["FRAME","COMPONENT"].includes(y.type)||r(c,"Overflow requires FRAME or COMPONENT")),u.fills!==void 0&&B(u.fills,`${c}.props.fills`),u.strokes!==void 0&&B(u.strokes,`${c}.props.strokes`,!1),u.strokeAlign!==void 0&&S(u.strokeAlign,`${c}.props.strokeAlign`,["INSIDE","OUTSIDE","CENTER"]),u.dashPattern!==void 0){let R=O(u.dashPattern,`${c}.props.dashPattern`,16);R.length||r(`${c}.props.dashPattern`,"Expected at least one dash length");for(let[T,w]of R.entries())N(w,`${c}.props.dashPattern[${T}]`,0,1e4)}if(u.effects!==void 0)for(let[R,T]of O(u.effects,`${c}.props.effects`,16).entries()){let w=`${c}.props.effects[${R}]`;d(T,w,["type","color","offset","radius","spread","visible"])&&(S(T.type,`${w}.type`,["DROP_SHADOW","INNER_SHADOW"]),b(T.color,`${w}.color`,!0),d(T.offset,`${w}.offset`,["x","y"])&&(N(T.offset.x,`${w}.offset.x`,-1e5,1e5),N(T.offset.y,`${w}.offset.y`,-1e5,1e5)),N(T.radius,`${w}.radius`,0,1e5),T.spread!==void 0&&N(T.spread,`${w}.spread`,-1e5,1e5),T.visible!==void 0&&A(T.visible,`${w}.visible`))}if(u.overrides!==void 0){y.type!=="INSTANCE"&&r(`${c}.props.overrides`,"Overrides require INSTANCE");let R=new Set;for(let[T,w]of O(u.overrides,`${c}.props.overrides`,1e3).entries()){let j=`${c}.props.overrides[${T}]`;if(!d(w,j,["sourceKey","characters","visible","fills"]))continue;P("nodes",w.sourceKey,`${j}.sourceKey`),R.has(w.sourceKey)&&r(j,"Duplicate override source"),R.add(w.sourceKey);let V=C.nodes.get(w.sourceKey),G=V&&C.nodes.get(V.parentKey),Z=new Set,J=!1;for(;G&&!Z.has(G.key);){if(G.key===u.componentKey){J=!0;break}Z.add(G.key),G=C.nodes.get(G.parentKey)}J||r(`${j}.sourceKey`,"Override source must be a descendant of the referenced component"),w.characters!==void 0&&(V?.type!=="TEXT"&&r(`${j}.characters`,"Text override requires TEXT source"),l(w.characters,`${j}.characters`,1e5,!0)),w.visible!==void 0&&A(w.visible,`${j}.visible`),w.fills!==void 0&&B(w.fills,`${j}.fills`),Object.keys(w).length<2&&r(j,"Override must change characters, visible or fills")}}for(let R of["characters","fontName","fontSize","fontWeight","lineHeight","letterSpacing","textAlignHorizontal","textAutoResize","textStyleKey"])u[R]!==void 0&&y.type!=="TEXT"&&r(`${c}.props.${R}`,"Text-only property");if(y.type==="TEXT"){if(l(u.characters,`${c}.props.characters`,1e5,!0),!u.fontName&&!u.textStyleKey&&r(c,"Text requires fontName or textStyleKey"),u.fontName!==void 0&&$(u.fontName,`${c}.props.fontName`),u.fontSize!==void 0&&N(u.fontSize,`${c}.props.fontSize`,.1,1e4),u.fontWeight!==void 0){S(u.fontWeight,`${c}.props.fontWeight`,[100,200,300,400,500,600,700,800,900]);let R={100:"thin",200:"extralight",300:"light",400:"regular",500:"medium",600:"semibold",700:"bold",800:"extrabold",900:"black"}[u.fontWeight];((u.fontName??C.textStyles.get(u.textStyleKey)?.fontName)?.style?.toLowerCase().replace(/[ -]/g,"").replace(/italic$/,"")||"regular")!==R&&r(`${c}.props.fontWeight`,"fontWeight must match the explicit fontName.style; the font style controls Figma weight")}u.lineHeight!==void 0&&L(u.lineHeight,`${c}.props.lineHeight`,!0),u.letterSpacing!==void 0&&L(u.letterSpacing,`${c}.props.letterSpacing`),u.textAlignHorizontal!==void 0&&S(u.textAlignHorizontal,`${c}.props.textAlignHorizontal`,["LEFT","CENTER","RIGHT","JUSTIFIED"]),u.textAutoResize!==void 0&&S(u.textAutoResize,`${c}.props.textAutoResize`,["NONE","HEIGHT","WIDTH_AND_HEIGHT"]),u.textStyleKey!==void 0&&P("textStyles",u.textStyleKey,`${c}.props.textStyleKey`)}if(y.type==="INSTANCE"?(P("nodes",u.componentKey,`${c}.props.componentKey`),C.nodes.get(u.componentKey)?.type!=="COMPONENT"&&r(c,"Instance must reference COMPONENT")):u.componentKey!==void 0&&r(c,"componentKey requires INSTANCE"),u.vectorPaths!==void 0){y.type!=="VECTOR"&&r(c,"vectorPaths requires VECTOR");for(let[R,T]of O(u.vectorPaths,`${c}.props.vectorPaths`,1e3).entries()){let w=`${c}.props.vectorPaths[${R}]`;d(T,w,["windingRule","data"])&&(S(T.windingRule,`${w}.windingRule`,["NONZERO","EVENODD"]),l(T.data,`${w}.data`,2e5),typeof T.data=="string"&&(!/^[Mm]/.test(T.data.trim())||!/^[MmZzLlHhVvCcSsQqTtAaEe0-9+.,\s-]+$/.test(T.data))&&r(w,"Only SVG path command data allowed"))}}}if(!i.length)try{xe(o)}catch(y){r("$.nodes",y.message)}let x=new Set;for(let[y,c]of O(o.reactions??[],"$.reactions",me.reactions).entries()){let u=`$.reactions[${y}]`;if(d(c,u,["sourceKey","destinationKey","trigger"])&&(P("nodes",c.sourceKey,`${u}.sourceKey`),P("nodes",c.destinationKey,`${u}.destinationKey`),(C.nodes.get(c.destinationKey)?.type!=="FRAME"||C.nodes.get(c.destinationKey)?.parentKey!==null)&&r(u,"Destination must be a root FRAME"),d(c.trigger,`${u}.trigger`,["type","delaySeconds"]))){S(c.trigger.type,`${u}.trigger.type`,["ON_CLICK","AFTER_TIMEOUT"]),c.trigger.type==="AFTER_TIMEOUT"?N(c.trigger.delaySeconds,`${u}.trigger.delaySeconds`,.001,3600):c.trigger.delaySeconds!==void 0&&r(u,"delaySeconds only applies to AFTER_TIMEOUT");let R=`${c.sourceKey}:${c.trigger.type}`;x.has(R)&&r(u,"Duplicate source and trigger"),x.add(R)}}let ne=new Set;for(let[y,c]of O(o.flows??[],"$.flows",1e3).entries()){let u=`$.flows[${y}]`;d(c,u,["nodeKey","name"])&&(P("nodes",c.nodeKey,`${u}.nodeKey`),l(c.name,`${u}.name`,256),(C.nodes.get(c.nodeKey)?.parentKey!==null||C.nodes.get(c.nodeKey)?.type!=="FRAME")&&r(u,"Flow start must be a root FRAME"),ne.has(c.nodeKey)&&r(u,"Duplicate flow start"),ne.add(c.nodeKey))}if(i.length)throw new we(i);return o}function xe(o){let i=new Map(o.nodes.map(b=>[b.key,b])),r=new Map,d=new Map,l=new Map(o.nodes.filter(b=>b.type==="COMPONENT").map(b=>[b.key,new Set]));for(let b of o.nodes.filter(L=>L.type==="INSTANCE")){let L=new Set,C=i.get(b.parentKey);for(;C;){if(L.has(C.key))throw new Error("Cyclic parent/component dependency");L.add(C.key),C.type==="COMPONENT"&&l.get(C.key).add(b.props?.componentKey),C=i.get(C.parentKey)}}let I=new Set,N=new Set;function S(b){if(!I.has(b)){if(N.has(b))throw new Error("Cyclic component instance dependency");N.add(b);for(let L of l.get(b)??[])S(L);N.delete(b),I.add(b)}}for(let b of l.keys())S(b);let A=new Map;for(let b of o.nodes){let L=i.get(b.parentKey),C=new Set;for(;L;){if(C.has(L.key))throw new Error("Cyclic parent/component dependency");C.add(L.key),L.type==="COMPONENT"&&(A.has(L.key)||A.set(L.key,[]),A.get(L.key).push(b.key)),L=i.get(L.parentKey)}}for(let b of o.nodes){let L=[...new Set([b.parentKey,b.props?.componentKey,...A.get(b.props?.componentKey)??[]].filter(Boolean))];r.set(b.key,L.length);for(let C of L){if(!i.has(C))throw new Error(`Unknown dependency ${C}`);d.has(C)||d.set(C,[]),d.get(C).push(b.key)}}let O=o.nodes.filter(b=>r.get(b.key)===0),$=[];for(let b=0;b<O.length;b++){let L=O[b];$.push(L);for(let C of d.get(L.key)??[])r.set(C,r.get(C)-1),r.get(C)===0&&O.push(i.get(C))}if($.length!==o.nodes.length)throw new Error("Cyclic parent/component dependency");return $}var He=/[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y,ut={M:2,L:2,H:1,V:1,C:6,S:4,Q:4,T:2,A:7},X=()=>{throw new Error("DESIGN_VECTOR_PATH_INVALID")};function Ut(o,i,r,d,l,I,N,S,A){if(o===S&&i===A)return[];if(r=Math.abs(r),d=Math.abs(d),r===0||d===0)return[["L",S,A]];let O=l%360*Math.PI/180,$=Math.cos(O),b=Math.sin(O),L=(o-S)/2,C=(i-A)/2,K=$*L+b*C,U=-b*L+$*C,k=K/r,P=U/d,B=Math.hypot(k,P);(!Number.isFinite(B)||B===0)&&X(),B>1&&(r*=B,d*=B,k=K/r,P=U/d);let x=k*k+P*P;(!Number.isFinite(r)||!Number.isFinite(d)||!Number.isFinite(x)||x===0)&&X();let ne=(I===N?-1:1)*Math.sqrt(Math.max(0,(1-x)/x)),y=ne*r*P,c=-ne*d*k,u=$*y-b*c+(o+S)/2,R=b*y+$*c+(i+A)/2,T=[(K-y)/r,(U-c)/d],w=[(-K-y)/r,(-U-c)/d],j=Math.atan2(T[1],T[0]),V=Math.atan2(T[0]*w[1]-T[1]*w[0],T[0]*w[0]+T[1]*w[1]);(!Number.isFinite(j)||!Number.isFinite(V))&&X(),!N&&V>0&&(V-=Math.PI*2),N&&V<0&&(V+=Math.PI*2);let G=Math.max(1,Math.ceil(Math.abs(V)/(Math.PI/4))),Z=V/G,J=Y=>[u+r*$*Math.cos(Y)-d*b*Math.sin(Y),R+r*b*Math.cos(Y)+d*$*Math.sin(Y)],re=Y=>[-r*$*Math.sin(Y)-d*b*Math.cos(Y),-r*b*Math.sin(Y)+d*$*Math.cos(Y)],ue=[];for(let Y=0;Y<G;Y++){let he=j+Z,Q=4/3*Math.tan(Z/4),ye=Y===0?[o,i]:J(j),le=Y===G-1?[S,A]:J(he),ae=re(j),Se=re(he);ue.push(["C",ye[0]+Q*ae[0],ye[1]+Q*ae[1],le[0]-Q*Se[0],le[1]-Q*Se[1],...le]),j=he}return ue}function gt(o){(typeof o!="string"||o.length===0||o.length>2e5)&&X();let i=0,r,d,l=0,I=0,N=0,S=0,A,O,$=[],b=()=>{for(;/\s/.test(o[i]??"")&&i<o.length;)i++},L=(C,K=!1)=>{if(b(),o[i]===","&&(C||X(),i++,b()),K){let P=o[i++];return P!=="0"&&P!=="1"&&X(),Number(P)}He.lastIndex=i;let U=He.exec(o);U||X(),i=He.lastIndex;let k=Number(U[0]);return Number.isFinite(k)||X(),k};for(;b(),i!==o.length;){let C=!1;/[a-z]/i.test(o[i])&&(r=o[i++],C=!0),r||X();let K=r.toUpperCase(),U=r!==K;if(!$.length&&K!=="M"&&X(),K==="Z"){C||X(),$.push(["Z"]),l=N,I=S,A=O=void 0,d=K,r=void 0;continue}ut[K]||X();let k=Array.from({length:ut[K]},(c,u)=>L(u>0||!C,K==="A"&&(u===3||u===4))),P=c=>c+(U?l:0),B=c=>c+(U?I:0),x,ne,y;if(K==="M"||K==="L")x=[[K,P(k[0]),B(k[1])]],K==="M"&&(N=x[0][1],S=x[0][2],r=U?"l":"L");else if(K==="H")x=[["L",P(k[0]),I]];else if(K==="V")x=[["L",l,B(k[0])]];else if(K==="C"||K==="S"){let c=K==="C"?[P(k[0]),B(k[1]),P(k[2]),B(k[3]),P(k[4]),B(k[5])]:[d==="C"||d==="S"?2*l-A[0]:l,d==="C"||d==="S"?2*I-A[1]:I,P(k[0]),B(k[1]),P(k[2]),B(k[3])];x=[["C",...c]],ne=c.slice(2,4)}else if(K==="Q"||K==="T"){let c=K==="Q"?P(k[0]):d==="Q"||d==="T"?2*l-O[0]:l,u=K==="Q"?B(k[1]):d==="Q"||d==="T"?2*I-O[1]:I,R=P(k.at(-2)),T=B(k.at(-1));x=[["C",l+2/3*(c-l),I+2/3*(u-I),R+2/3*(c-R),T+2/3*(u-T),R,T]],y=[c,u]}else x=Ut(l,I,...k.slice(0,5),P(k[5]),B(k[6]));if(x.length){let c=x.at(-1);l=c.at(-2),I=c.at(-1),$.push(...x)}A=ne,O=y,d=K}return(!$.length||$.some(C=>C.slice(1).some(K=>!Number.isFinite(K))))&&X(),$}function yt(o,i,r,d){let l=-o+3*i-3*r+d,I=2*(o-2*i+r),N=i-o;if([l,I,N].every(Number.isFinite)||X(),l===0)return I===0?[]:[-N/I];let S=I*I-4*l*N;if(Number.isFinite(S)||X(),S<0)return[];let A=-.5*(I+(I<0?-1:1)*Math.sqrt(S));return A===0?[-I/(2*l)]:[A/l,N/A]}function Bt(o){let i=1/0,r=1/0,d=-1/0,l=-1/0,I=!1,N=(O,$)=>{(!Number.isFinite(O)||!Number.isFinite($))&&X(),i=Math.min(i,O),r=Math.min(r,$),d=Math.max(d,O),l=Math.max(l,$)};for(let O of o){let $=0,b=0,L=0,C=0;for(let K of O){let[U,...k]=K;if(U==="Z"){$=L,b=C;continue}if(U==="C"){I=!0;let P=(x,ne,y,c,u)=>(1-u)**3*x+3*(1-u)**2*u*ne+3*(1-u)*u**2*y+u**3*c,B=[...yt($,k[0],k[2],k[4]),...yt(b,k[1],k[3],k[5])];for(let x of B)x>0&&x<1&&N(P($,k[0],k[2],k[4],x),P(b,k[1],k[3],k[5],x))}else U==="L"&&(I=!0);$=k.at(-2),b=k.at(-1),N($,b),U==="M"&&(L=$,C=b)}}let S=d-i,A=l-r;return(!I||![i,r,S,A].every(Number.isFinite)||S<=0||A<=0)&&X(),{left:i,top:r,width:S,height:A}}function Ue(o,i){let r=o.map(d=>gt(d.data));if(i!==void 0){(!Number.isFinite(i?.width)||!Number.isFinite(i?.height)||i.width<.01||i.height<.01)&&X();let d=Bt(r),l=i.width/d.width,I=i.height/d.height;(!Number.isFinite(l)||!Number.isFinite(I)||l<=0||I<=0)&&X();for(let N of r)for(let S of N)for(let A=1;A<S.length;A++)S[A]=(S[A]-(A%2?d.left:d.top))*(A%2?l:I),Number.isFinite(S[A])||X()}return o.map((d,l)=>({...d,data:r[l].map(I=>I.join(" ")).join(" ")}))}function ht(o){let i=[],r,d;for(let l of gt(o)){if(l[0]==="M"&&(r=l[1],d=l[2]),l[0]==="Z"){let I=i.at(-1);I?.[0]==="L"&&I[1]===r&&I[2]===d&&i.pop()}i.push(l)}return i}function Et(o,i,r=.001){if(!Array.isArray(o)||o.length!==i.length)return!1;try{return i.every((d,l)=>{if(d.windingRule!==o[l].windingRule)return!1;let I=ht(o[l].data),N=ht(d.data);return I.length===N.length&&N.every((S,A)=>S.length===I[A].length&&S.every((O,$)=>$===0?O===I[A][$]:Math.abs(O-I[A][$])<=r))})}catch{return!1}}var ce="bridge-design-v1-",be=`${ce}spec`,Be=`${ce}digest`,It=`${ce}intent`,Ve=`${ce}state`,ze=`${ce}source`,qe={NONE:"NONE",HORIZONTAL:"HORIZONTAL",VERTICAL:"VERTICAL",BOTH:"BOTH"},Vt=Object.fromEntries(Object.entries(qe).map(([o,i])=>[i,o])),W=o=>JSON.parse(JSON.stringify(o));function Xe(o){let i=new Uint8Array(o.length*3),r=0;for(let d of o){let l=d.codePointAt(0);l>=55296&&l<=57343&&(l=65533),l<128?i[r++]=l:l<2048?(i[r++]=192|l>>6,i[r++]=128|l&63):l<65536?(i[r++]=224|l>>12,i[r++]=128|l>>6&63,i[r++]=128|l&63):(i[r++]=240|l>>18,i[r++]=128|l>>12&63,i[r++]=128|l>>6&63,i[r++]=128|l&63)}return i.subarray(0,r)}function M(o){return Array.isArray(o)?`[${o.map(M).join(",")}]`:o&&typeof o=="object"?`{${Object.keys(o).filter(i=>o[i]!==void 0).sort().map(i=>`${JSON.stringify(i)}:${M(o[i])}`).join(",")}}`:JSON.stringify(o)}var z=o=>ve(Ge(Xe(M(o)))),h=(o,i)=>{if(!o)throw new Error(i)},We=(o,i)=>{let r=o.getPluginData(i);return r?JSON.parse(r):null},oe=o=>typeof o=="symbol"||o===void 0?null:W(o),pe=o=>`${o.family}\0${o.style}`,je=o=>o?.unit==="AUTO"?{unit:"AUTO"}:W(o);function Ne(o,i){return typeof i=="number"?typeof o=="number"&&Number.isFinite(o)&&Math.abs(o-i)<=.001:Array.isArray(i)?Array.isArray(o)&&o.length===i.length&&i.every((r,d)=>Ne(o[d],r)):i&&typeof i=="object"?o&&typeof o=="object"&&Object.keys(i).every(r=>Ne(o[r],i[r])):o===i}function Nt(o){let i="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",r=new Uint8Array(o.length*3/4-(o.endsWith("==")?2:o.endsWith("=")?1:0)),d=0;for(let l=0;l<o.length;l+=4){let I=i.indexOf(o[l])<<18|i.indexOf(o[l+1])<<12|Math.max(0,i.indexOf(o[l+2]))<<6|Math.max(0,i.indexOf(o[l+3]));d<r.length&&(r[d++]=I>>>16&255),d<r.length&&(r[d++]=I>>>8&255),d<r.length&&(r[d++]=I&255)}return r}function zt(o){let i="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",r="";for(let d=0;d<o.length;d+=3){let l=o[d]<<16|(o[d+1]??0)<<8|(o[d+2]??0);r+=i[l>>>18&63]+i[l>>>12&63]+(d+1<o.length?i[l>>>6&63]:"=")+(d+2<o.length?i[l&63]:"=")}return r}function Wt(o,i){let r=!1,d=()=>i.onMutation?.(),l=(e,t,n)=>{d(),e.setPluginData(t,typeof n=="string"?n:JSON.stringify(n))};async function I(e){let t=await i.resolveScope(e.trustedScope);i.assertTrustedOwnership(e.trustedOwnership,e.operationId);let n=e.payload??{};h(typeof n.runId=="string"&&/^[A-Za-z0-9._:-]{1,160}$/.test(n.runId),"DESIGN_RUN_ID_REQUIRED");let s=pt(n.spec),f=e.trustedOwnership,a=z({workspace:f.workspaceId,task:f.taskId,spec:s.id}).slice(0,24),E=`${ce}${a}-ledger`,m=z(s),_=n.timerUnit??"milliseconds";h(["seconds","milliseconds"].includes(_),"DESIGN_TIMER_UNIT_INVALID");let D=We(t.root,E);D&&(h(D.specSignature===m,"DESIGN_SPEC_REVISION_CONFLICT: use a new spec id for a changed specification"),h(D.timerUnit===_,"DESIGN_TIMER_UNIT_CONFLICT"));let p={message:e,scope:t,payload:n,spec:s,ownership:f,ns:a,ledgerKey:E,signature:m,timerUnit:_,state:D??{version:1,specSignature:m,timerUnit:_,cursor:0,pending:null,complete:!1},existing:!!D,map:new Map,idToKey:new Map,fonts:new Map,substitutions:[],styles:new Map,variables:new Map,images:new Map,resourceKeys:{styles:new Map,variables:new Map,images:new Map},preparedComponents:new Set};p.order=xe(s),p.definitions=new Map(p.order.map(v=>[v.key,v])),p.children=new Map,p.reactionDefs=new Map;for(let v of s.nodes)p.children.has(v.parentKey)||p.children.set(v.parentKey,[]),p.children.get(v.parentKey).push(v);for(let v of s.reactions??[])p.reactionDefs.has(v.sourceKey)||p.reactionDefs.set(v.sourceKey,[]),p.reactionDefs.get(v.sourceKey).push(v);let g=new Map,F=!1;for(let v=0;v<p.order.length;v+=16){let Ee=p.order.slice(v,v+16).map(ee=>({def:ee,record:null})),De=await Promise.allSettled(Ee.map(async ee=>(ee.record=We(t.root,`${ce}${a}-n-${z(ee.def.key).slice(0,24)}`),ee.record?await o.getNodeByIdAsync(ee.record.id):null)));for(let ee=0;ee<Ee.length;ee++){let{def:H,record:de}=Ee[ee],ie=De[ee];if(ie.status==="rejected")throw ie.reason;if(!de)continue;let te=ie.value;if(!te||te.getPluginData(be)!==a||te.getPluginData(i.specNodeKey)!==H.key){if(!F){let ke=[...t.root.children??[]];for(let Le=0;Le<ke.length;Le++){let Ie=ke[Le];if(Ie.getPluginData(be)===a){let Re=Ie.getPluginData(i.specNodeKey);g.has(Re)||g.set(Re,[]),g.get(Re).push(Ie)}"children"in Ie&&Ie.type!=="INSTANCE"&&ke.push(...Ie.children)}F=!0}let tt=g.get(H.key)??[];h(tt.length===1,`DESIGN_MAPPING_AMBIGUOUS:${H.key}`),te=tt[0]}h(te&&!te.removed,`DESIGN_NODE_MISSING:${H.key}`),i.assertInScope(te,t),i.assertTaskOwned(te,f),h(te.getPluginData(be)===a&&te.getPluginData(i.specNodeKey)===H.key,`DESIGN_KEY_OWNERSHIP_CONFLICT:${H.key}`),h(te.type===H.type,`DESIGN_NODE_TYPE_CONFLICT:${H.key}`),p.map.set(H.key,te),p.idToKey.set(te.id,H.key),H.type==="INSTANCE"&&h((await te.getMainComponentAsync())?.id===p.map.get(H.props.componentKey)?.id,`DESIGN_INSTANCE_COMPONENT_CONFLICT:${H.key}`)}}return p}let N=e=>l(e.scope.root,e.ledgerKey,e.state),S=(e,t,n)=>`${ce}${e.ns}-${t}-${z(n).slice(0,24)}`,A=(e,t,n)=>`${ce}${e.ns}:${t}:${n}`,O=(e,t,n)=>We(e.scope.root,S(e,t,n));function $(e,t,n,s){e[t].set(n,s);let f=t==="images"?s:s.id;e.resourceKeys[t].has(f)||e.resourceKeys[t].set(f,n)}function b(e,t=!1){let n={type:e.type,name:e.name,parentKey:e.parent?.getPluginData?.(i.specNodeKey)??""};for(let s of["x","y","width","height","visible","opacity","fills","strokes","strokeWeight","cornerRadius","clipsContent","overflowDirection","numberOfFixedChildren","layoutPositioning","characters","fontName","fontSize","lineHeight","letterSpacing","textAlignHorizontal","textAutoResize","vectorPaths","effects","strokeAlign","dashPattern"])s in e&&(n[s]=oe(e[s]));return"textStyleId"in e&&(n.textStyleId=e.textStyleId),t&&(n.sourceKey=e.getPluginData(ze)),(e.type==="INSTANCE"||t)&&"children"in e&&(n.instanceChildren=e.children.map(s=>b(s,!0))),n}function L(e,t){let n={...t};for(let s of["fills","strokes"])Array.isArray(n[s])&&(n[s]=n[s].map(f=>{let a=W(f);return a.boundVariables?.color?.id&&(a.boundVariables.color.id=e.resourceKeys.variables.get(a.boundVariables.color.id)??"UNKNOWN"),a.imageHash&&(a.imageHash=e.resourceKeys.images.get(a.imageHash)??"UNKNOWN"),a}));return"textStyleId"in t&&(n.textStyleKey=t.textStyleId?e.resourceKeys.styles.get(t.textStyleId)??"UNKNOWN":null,delete n.textStyleId),t.instanceChildren&&(n.instanceChildren=t.instanceChildren.map(s=>L(e,s))),n}let C=(e,t,n=!1)=>L(e,b(t,n));function K(e,t,n){i.assertInScope(n,e.scope),i.assertTaskOwned(n,e.ownership),h(n.getPluginData(It)===z(t),`DESIGN_INTENT_CONFLICT:${t.key}`);let s=n.getPluginData(Be),f=b(n);if(s&&h(s===z(L(e,f)),`DESIGN_USER_EDIT_CONFLICT:${t.key}`),"children"in n&&n.type!=="INSTANCE")for(let a of n.children)i.assertTaskOwned(a,e.ownership),h(a.getPluginData(be)===e.ns,`DESIGN_FOREIGN_CHILD:${t.key}`);return f}function U(e){for(let t of e.order)if(e.map.has(t.key)){let n=e.map.get(t.key),s=K(e,t,n);k(e,t,n,s)}}function k(e,t,n,s){let f=s??n,a=t.props??{},E={name:t.name??t.key,x:t.x,y:t.y};(t.type!=="TEXT"||!a.textAutoResize||a.textAutoResize==="NONE")&&Object.assign(E,{width:t.width,height:t.height});for(let m of["strokeWeight","strokeAlign","dashPattern","cornerRadius","opacity","visible","clipsContent","characters","fontSize","lineHeight","letterSpacing","textAlignHorizontal","textAutoResize"])a[m]!==void 0&&(E[m]=a[m]);if(a.vectorPaths&&(E.vectorPaths=Ue(a.vectorPaths,{width:t.width,height:t.height})),a.overflowDirection&&(E.overflowDirection=qe[a.overflowDirection]),a.effects&&(E.effects=a.effects.map(m=>({...m,blendMode:"NORMAL",visible:m.visible??!0,spread:m.spread??0}))),a.fills&&(E.fills=T(e,a.fills)),a.strokes&&(E.strokes=T(e,a.strokes)),t.type==="TEXT"){let m=a.fontName??e.spec.textStyles.find(_=>_.key===a.textStyleKey).fontName;E.fontName=e.fonts.get(pe(m)),a.textStyleKey&&(E.textStyleId=e.styles.get(a.textStyleKey)?.id)}for(let[m,_]of Object.entries(E)){if(m==="vectorPaths"?Et(f[m],_):Ne(f[m],_))continue;let p=new Error(`DESIGN_PROPERTY_READBACK_MISMATCH:${t.key}:${m}`);if(m==="fills"||m==="strokes"){let g={nodeKey:t.key,field:m,expected:oe(_),actual:oe(f[m])};p.readbackMismatch=JSON.stringify(g).length<=8192?g:{nodeKey:t.key,field:m,status:"NOT_VERIFIED_BUDGET_EXCEEDED",budgetCharacters:8192}}throw p}if(t.type==="INSTANCE"&&a.overrides?.length){let m=[...s?s.instanceChildren??[]:n.children],_=new Map;for(let D=0;D<m.length;D++){let p=m[D];_.set(s?p.sourceKey:p.getPluginData(ze),p);let g=s?p.instanceChildren:p.children;g&&m.push(...g)}for(let D of a.overrides){let p=_.get(D.sourceKey);h(p,`DESIGN_OVERRIDE_SOURCE_MISSING:${D.sourceKey}`);for(let g of["characters","visible","fills"])D[g]!==void 0&&h(Ne(p[g],g==="fills"?T(e,D.fills):D[g]),`DESIGN_OVERRIDE_READBACK_MISMATCH:${t.key}:${D.sourceKey}:${g}`)}}}async function P(e,t){let n=[...(e.spec.textStyles??[]).map(f=>f.fontName),...e.spec.nodes.filter(f=>f.type==="TEXT"&&f.props.fontName).map(f=>f.props.fontName)],s=typeof o.listAvailableFontsAsync=="function"?new Set((await o.listAvailableFontsAsync()).map(f=>pe(f.fontName))):null;for(let f of n){let a=pe(f);if(e.fonts.has(a))continue;let E=f;if(s&&!s.has(a)&&(h(e.spec.fontPolicy?.allowFallback,`DESIGN_FONT_MISSING:${f.family}/${f.style}`),E=e.spec.fontPolicy.fallback,h(s.has(pe(E)),`DESIGN_FALLBACK_FONT_MISSING:${E.family}/${E.style}`)),t)try{await o.loadFontAsync(E)}catch(m){if(E!==f||!e.spec.fontPolicy?.allowFallback)throw m;E=e.spec.fontPolicy.fallback,await o.loadFontAsync(E)}e.fonts.set(a,W(E)),pe(E)!==a&&e.substitutions.push({requested:W(f),used:W(E)})}}async function B(e){for(let n of e.spec.assets??[]){let s=O(e,"image",n.key);s&&(h(s.signature===z(n),`DESIGN_ASSET_CONFLICT:${n.key}`),$(e,"images",n.key,s.hash))}for(let n of e.spec.textStyles??[]){let s=O(e,"style",n.key);if(!s)continue;let f=await o.getStyleByIdAsync(s.id);if(!f||f.description!==A(e,"style",n.key)){let a=(await o.getLocalTextStylesAsync()).filter(E=>E.description===A(e,"style",n.key));h(a.length===1,`DESIGN_STYLE_MAPPING_AMBIGUOUS:${n.key}`),f=a[0]}h(f&&f.type==="TEXT"&&f.description===A(e,"style",n.key),`DESIGN_STYLE_OWNERSHIP_CONFLICT:${n.key}`),h(s.digest===z(x(f)),`DESIGN_STYLE_USER_EDIT_CONFLICT:${n.key}`),$(e,"styles",n.key,f)}let t=O(e,"collection","colors");if(t){let n=await o.variables.getVariableCollectionByIdAsync(t.id);if(!n||n.name!==t.name){let s=(await o.variables.getLocalVariableCollectionsAsync()).filter(f=>f.name===t.name);h(s.length===1,"DESIGN_COLLECTION_MAPPING_AMBIGUOUS"),n=s[0]}h(n.name===`Bridge/${e.ns}/Colors`,"DESIGN_COLLECTION_OWNERSHIP_CONFLICT"),t.digest&&h(t.digest===z(y(n)),"DESIGN_COLLECTION_USER_EDIT_CONFLICT"),e.collection=n}for(let n of e.spec.variables??[]){let s=O(e,"variable",n.key);if(!s)continue;let f=await o.variables.getVariableByIdAsync(s.id);if(!f||f.description!==A(e,"variable",n.key)){let a=(await o.variables.getLocalVariablesAsync("COLOR")).filter(E=>E.description===A(e,"variable",n.key));h(a.length===1,`DESIGN_VARIABLE_MAPPING_AMBIGUOUS:${n.key}`),f=a[0]}h(f&&f.description===A(e,"variable",n.key),`DESIGN_VARIABLE_OWNERSHIP_CONFLICT:${n.key}`),h(e.collection&&f.variableCollectionId===e.collection.id,`DESIGN_VARIABLE_COLLECTION_CONFLICT:${n.key}`),h(s.digest===z(ne(f)),`DESIGN_VARIABLE_USER_EDIT_CONFLICT:${n.key}`),$(e,"variables",n.key,f)}}let x=e=>({name:e.name,fontName:oe(e.fontName),fontSize:e.fontSize,lineHeight:oe(e.lineHeight),letterSpacing:oe(e.letterSpacing)}),ne=e=>({name:e.name,resolvedType:e.resolvedType,values:Object.values(e.valuesByMode).map(oe)}),y=e=>({name:e.name,modes:(e.modes??[]).map(t=>t.name),defaultMode:(e.modes??[]).findIndex(t=>t.modeId===e.defaultModeId)});function c(e,t,n){h(!e.state.pending,"DESIGN_NEEDS_RECONCILIATION"),e.state.pending={kind:t,key:n,startedAt:new Date().toISOString(),operationId:e.message.operationId},N(e)}function u(e){e.state.pending=null,N(e)}async function R(e){(e.spec.textStyles?.length??0)+(e.spec.variables?.length??0)&&h(e.payload.allowGlobalResources===!0,"DESIGN_GLOBAL_RESOURCES_AUTH_REQUIRED");for(let n of e.spec.assets??[]){if(e.images.has(n.key))continue;c(e,"image",n.key),d();let s=o.createImage(Nt(n.dataBase64));$(e,"images",n.key,s.hash),l(e.scope.root,S(e,"image",n.key),{hash:s.hash,signature:z(n)}),u(e)}for(let n of e.spec.textStyles??[]){if(e.styles.has(n.key))continue;c(e,"style",n.key),d();let s=o.createTextStyle();e.state.pending.id=s.id,N(e),s.description=A(e,"style",n.key),s.name=`Bridge/${e.ns}/${n.name}`,s.fontName=W(e.fonts.get(pe(n.fontName))),s.fontSize=n.fontSize,n.lineHeight&&(s.lineHeight=je(n.lineHeight)),n.letterSpacing&&(s.letterSpacing=W(n.letterSpacing)),h(Ne(s,{name:`Bridge/${e.ns}/${n.name}`,fontName:e.fonts.get(pe(n.fontName)),fontSize:n.fontSize,...n.lineHeight?{lineHeight:je(n.lineHeight)}:{},...n.letterSpacing?{letterSpacing:n.letterSpacing}:{}}),`DESIGN_STYLE_READBACK_MISMATCH:${n.key}`),l(e.scope.root,S(e,"style",n.key),{id:s.id,digest:z(x(s))}),$(e,"styles",n.key,s),u(e)}if(e.spec.variables?.length){let n=O(e,"collection","colors"),s=e.collection;n?h(s&&s.name===`Bridge/${e.ns}/Colors`,"DESIGN_COLLECTION_OWNERSHIP_CONFLICT"):(c(e,"collection","colors"),d(),s=o.variables.createVariableCollection(`Bridge/${e.ns}/Colors`),e.state.pending.id=s.id,N(e),n={id:s.id,name:s.name,digest:z(y(s))},e.collection=s,l(e.scope.root,S(e,"collection","colors"),n),u(e));for(let f of e.spec.variables){if(e.variables.has(f.key))continue;c(e,"variable",f.key),d();let a=o.variables.createVariable(`Bridge/${e.ns}/${f.name}`,s,"COLOR");e.state.pending.id=a.id,N(e),a.description=A(e,"variable",f.key),a.setValueForMode(s.defaultModeId,W(f.value)),h(Ne(a.valuesByMode[s.defaultModeId],f.value),`DESIGN_VARIABLE_READBACK_MISMATCH:${f.key}`),l(e.scope.root,S(e,"variable",f.key),{id:a.id,digest:z(ne(a))}),$(e,"variables",f.key,a),u(e)}}}function T(e,t){return t.map(n=>{if(n.type==="IMAGE")return{type:"IMAGE",imageHash:e.images.get(n.assetKey),scaleMode:n.scaleMode??"FILL",...n.opacity===void 0?{}:{opacity:n.opacity}};if(n.type==="GRADIENT_LINEAR")return{type:n.type,gradientTransform:W(n.gradientTransform),gradientStops:W(n.gradientStops),...n.opacity===void 0?{}:{opacity:n.opacity}};let s={type:"SOLID",color:W(n.color),...n.opacity===void 0?{}:{opacity:n.opacity}};return n.variableKey&&(s=o.variables.setBoundVariableForPaint(s,"color",e.variables.get(n.variableKey))),s})}function w(e,t){let n=new Set;for(let s of t){if(s.type!=="IMAGE"||n.has(s.assetKey))continue;n.add(s.assetKey);let f=e.spec.assets.find(m=>m.key===s.assetKey),a=O(e,"image",s.assetKey);if(h(f&&a&&a.signature===z(f),`DESIGN_ASSET_CONFLICT:${s.assetKey}`),h(a.hash===e.images.get(s.assetKey),`DESIGN_IMAGE_HASH_CHANGED:${s.assetKey}`),h(typeof o.getImageByHash=="function","DESIGN_IMAGE_API_UNAVAILABLE"),o.getImageByHash(a.hash))continue;d();let E=o.createImage(Nt(f.dataBase64));h(E?.hash===a.hash,`DESIGN_IMAGE_HASH_CHANGED:${s.assetKey}`),h(o.getImageByHash(a.hash),`DESIGN_IMAGE_HANDLE_UNAVAILABLE:${s.assetKey}`)}}async function j(e,t){if(t.type==="INSTANCE"&&!e.preparedComponents.has(t.props.componentKey)){let E=[e.spec.nodes.find(m=>m.key===t.props.componentKey)];for(let m=0;m<E.length;m++)E.push(...e.children.get(E[m].key)??[]);for(let m of E.reverse())Je(e,m);e.preparedComponents.add(t.props.componentKey)}c(e,"node",t.key);let n={FRAME:"createFrame",COMPONENT:"createComponent",TEXT:"createText",RECTANGLE:"createRectangle",ELLIPSE:"createEllipse",VECTOR:"createVector"};d();let s=t.type==="INSTANCE"?e.map.get(t.props.componentKey).createInstance():o[n[t.type]]();e.state.pending.id=s.id,N(e),i.markTaskOwned(s,"design-node",e.ownership,e.message.operationId),l(s,i.specNodeKey,t.key),l(s,be,e.ns),l(s,It,z(t)),l(s,Ve,"creating");let f=t.parentKey?e.map.get(t.parentKey):e.scope.root;h(f&&["PAGE","FRAME","COMPONENT"].includes(f.type),"DESIGN_PARENT_INVALID"),i.assertInScope(f,e.scope),f!==e.scope.root&&i.assertTaskOwned(f,e.ownership),f.appendChild(s);let a=t.props??{};if(s.name=t.name??t.key,t.type==="TEXT"){let E=a.fontName??e.spec.textStyles.find(m=>m.key===a.textStyleKey).fontName;s.fontName=W(e.fonts.get(pe(E))),a.fontSize!==void 0&&(s.fontSize=a.fontSize),s.characters=a.characters,s.textAutoResize="NONE",a.lineHeight&&(s.lineHeight=je(a.lineHeight)),a.letterSpacing&&(s.letterSpacing=W(a.letterSpacing)),a.textAlignHorizontal&&(s.textAlignHorizontal=a.textAlignHorizontal),a.textStyleKey&&(await s.setTextStyleIdAsync(e.styles.get(a.textStyleKey).id),i.assertInScope(s,e.scope),i.assertTaskOwned(s,e.ownership),h(s.parent===f,`DESIGN_NEW_NODE_PARENT_CONFLICT:${t.key}`),i.assertInScope(f,e.scope),f!==e.scope.root&&i.assertTaskOwned(f,e.ownership))}a.vectorPaths&&(s.vectorPaths=Ue(a.vectorPaths,{width:t.width,height:t.height})),a.fills?(w(e,a.fills),s.fills=T(e,a.fills)):["FRAME","COMPONENT","RECTANGLE","ELLIPSE","VECTOR"].includes(t.type)&&(s.fills=[]),a.strokes&&(w(e,a.strokes),s.strokes=T(e,a.strokes)),a.dashPattern&&(h("dashPattern"in s,`DESIGN_PROPERTY_UNSUPPORTED:${t.key}:dashPattern`),s.dashPattern=W(a.dashPattern));for(let E of["strokeWeight","strokeAlign","cornerRadius","opacity","visible","clipsContent"])a[E]!==void 0&&(h(E in s,`DESIGN_PROPERTY_UNSUPPORTED:${t.key}:${E}`),s[E]=a[E]);if(a.effects&&(s.effects=a.effects.map(E=>({...W(E),blendMode:"NORMAL",visible:E.visible??!0,spread:E.spread??0}))),a.overflowDirection!==void 0&&(s.overflowDirection=qe[a.overflowDirection]),a.layoutPositioning!==void 0&&f.layoutMode&&f.layoutMode!=="NONE"&&(s.layoutPositioning=a.layoutPositioning),typeof s.resizeWithoutConstraints=="function"?s.resizeWithoutConstraints(t.width,t.height):s.resize(t.width,t.height),s.x=t.x,s.y=t.y,t.type==="TEXT"&&a.textAutoResize&&a.textAutoResize!=="NONE"&&(s.textAutoResize=a.textAutoResize),t.type==="INSTANCE"){let E=e.map.get(a.componentKey),m=s.children.map((D,p)=>({child:D,source:E.children[p]})),_=new Map;h(s.children.length===E.children.length,"DESIGN_INSTANCE_STRUCTURE_MISMATCH");for(let D=0;D<m.length;D++){let p=m[D];h(p.source&&p.child.type===p.source.type,"DESIGN_INSTANCE_STRUCTURE_MISMATCH");let g=p.source.getPluginData(i.specNodeKey);i.markTaskOwned(p.child,"design-instance-child",e.ownership,e.message.operationId),l(p.child,i.specNodeKey,`${t.key}/inherited/${D}`),l(p.child,ze,g),_.set(g,p.child),"children"in p.child&&(h(p.child.children.length===p.source.children.length,"DESIGN_INSTANCE_STRUCTURE_MISMATCH"),m.push(...p.child.children.map((F,v)=>({child:F,source:p.source.children[v]}))))}for(let D of a.overrides??[]){let p=_.get(D.sourceKey);h(p,`DESIGN_OVERRIDE_SOURCE_MISSING:${D.sourceKey}`),D.characters!==void 0&&(h(p.type==="TEXT","DESIGN_OVERRIDE_TEXT_REQUIRED"),d(),p.characters=D.characters),D.visible!==void 0&&(d(),p.visible=D.visible),D.fills!==void 0&&(w(e,D.fills),d(),p.fills=T(e,D.fills))}}e.map.set(t.key,s),e.idToKey.set(s.id,t.key),k(e,t,s),l(s,Be,z(C(e,s))),l(s,Ve,"complete"),l(e.scope.root,S(e,"n",t.key),{id:s.id}),e.state.cursor+=1,u(e)}function V(e,t){return(e.reactionDefs.get(t.key)??[]).map(n=>({trigger:n.trigger.type==="ON_CLICK"?{type:"ON_CLICK"}:{type:"AFTER_TIMEOUT",timeout:n.trigger.delaySeconds*(e.timerUnit==="milliseconds"?1e3:1)},actions:[{type:"NODE",destinationId:e.map.get(n.destinationKey)?.id??"MISSING",navigation:"NAVIGATE",transition:null}]}))}let G=e=>(e.reactions??[]).map(t=>({trigger:oe(t.trigger),actions:(t.actions??(t.action?[t.action]:[])).map(n=>n.type==="NODE"?{type:"NODE",destinationId:n.destinationId,navigation:n.navigation,transition:oe(n.transition)}:oe(n))})),Z=(e,t)=>t.map(n=>e.idToKey.get(n.id)??"FOREIGN"),J=(e,t)=>G(t).map(n=>({...n,actions:n.actions.map(s=>{if(s.type!=="NODE")return s;let{destinationId:f,...a}=s;return{...a,destinationKey:e.idToKey.get(f)??"UNKNOWN"}})})),re=(e,t)=>t.map(n=>({name:n.name,nodeKey:e.idToKey.get(n.nodeId)??"UNKNOWN"})),ue=(e,t)=>e.order.find(n=>O(e,"n",n.key)?.id===t)?.key??"UNKNOWN",Y=(e,t)=>t.keys??t.ids.map(n=>ue(e,n)),he=(e,t)=>t.version===2?t.flows:t.flows.map(n=>({name:n.name,nodeKey:ue(e,n.nodeId)}));function Q(e,t,n={version:2}){return n.version===2?z(J(e,t)):z(G(t).map(s=>({...s,actions:s.actions.map(f=>{if(f.type!=="NODE")return f;let a=e.idToKey.get(f.destinationId);return{...f,destinationId:a?O(e,"n",a)?.id??f.destinationId:f.destinationId}})})))}function ye(e,t){let n=t;for(;n.parent&&n.parent!==e.scope.page;)n=n.parent;return n.parent===e.scope.page&&n.type==="FRAME"&&e.idToKey.has(n.id)?n:null}function le(e,t){return t.map(n=>({name:n.name,nodeKey:e.idToKey.get(n.nodeId)??null,...e.idToKey.has(n.nodeId)?{}:{nodeId:n.nodeId}}))}function ae(e,t){return h(Array.isArray(t)&&t.length<=1e3,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),t.map(n=>{if(h(n&&typeof n.name=="string"&&n.name.length<=256,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),n.nodeKey!==null){let s=e.map.get(n.nodeKey);return h(s?.type==="FRAME"&&s.parent===e.scope.page,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),i.assertTaskOwned(s,e.ownership),{name:n.name,nodeKey:n.nodeKey}}return h(typeof n.nodeId=="string"&&n.nodeId.length<=200,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),{name:n.name,nodeKey:null,nodeId:n.nodeId}})}function Se(e,t,n){return t.length===e.length+1&&M(t.slice(0,-1))===M(e)&&t[t.length-1].name===`Flow ${e.length+1}`&&t[t.length-1].nodeKey===n&&!e.some(s=>s.nodeKey===n)}function Ye(e){let t=e.state.nativeFlowObservation;return t?(h(t.version===1||t.version===2&&Array.isArray(t.entries)&&t.entries.length>0&&t.entries.length<=1e3,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),t.version===1?[t]:t.entries):[]}function Ze(e){let t=null;for(let n of Ye(e)){let s=e.map.get(n.sourceKey),f=e.definitions.get(n.sourceKey);h(s&&f,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT");let a=K(e,f,s);k(e,f,s,a);let E=ye(e,s),m=O(e,"reactions",n.sourceKey);h(E&&e.idToKey.get(E.id)===n.topLevelKey&&m?.digest===n.reactionDigest&&Q(e,s,m)===n.reactionDigest,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),i.assertTaskOwned(E,e.ownership);let _=ae(e,n.before),D=ae(e,n.after);if(h(Se(_,D,n.topLevelKey)&&(t===null||M(t)===M(_)),"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),n.version===1)h(t===null&&_.length===0&&D.length===1,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT");else if(n.provenance==="NATIVE_SETTER_READBACK"){let p=n.reactionReadback;h(n.version===2&&p?.version===1&&p.sourceKey===n.sourceKey&&p.topLevelKey===n.topLevelKey&&p.digest===n.reactionDigest&&p.operationId===n.operationId&&p.observedAt===n.observedAt,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT")}else{let p=n.recovery,g=p?.explicitPayload;h(n.version===2&&n.provenance==="EXPLICIT_READBACK_ADOPTION"&&n.reactionReadback===null&&m.provenance===n.provenance&&p?.verification==="CURRENT_STATE_ADOPTED_NOT_ORIGIN_PROVED"&&p.operationId===n.operationId&&p.observedAt===n.observedAt&&p.legacyPending?.operationId===g?.pendingOperationId&&p.legacyPending?.key===n.sourceKey&&M(ae(e,p.legacyPending.flowBefore))===M(_)&&p.expectedFlowSnapshotSignature===z(D)&&p.expectedReactionSnapshotSignature===n.reactionDigest&&g.flowSnapshotSignature===p.expectedFlowSnapshotSignature&&g.reactionSnapshotSignature===p.expectedReactionSnapshotSignature,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT")}t=D}return t}function Qe(e,t,n,s,f,a=null){let E=ye(e,n),m=E&&e.idToKey.get(E.id);h(e.scope.root.type==="PAGE"&&E&&(e.reactionDefs.get(t.key)?.length??0)>0,"DESIGN_NATIVE_FLOW_CHANGE_CONFLICT"),i.assertTaskOwned(E,e.ownership);let _=ae(e,le(e,s)),D=ae(e,le(e,f));h(Se(_,D,m),"DESIGN_NATIVE_FLOW_CHANGE_CONFLICT");let p=Ze(e);h(p?M(p)===M(_):!_.some(v=>v.nodeKey!==null),"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT");let g=Ye(e).map(W),F=e.state.pending.reactionReadback;h(g.length<1e3,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),a||h(F?.sourceKey===t.key&&F.sourceId===n.id&&F.topLevelKey===m&&F.operationId===e.message.operationId&&F.digest===Q(e,n),"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),!g.length&&s.length===0&&!a?e.state.nativeFlowObservation={version:1,sourceKey:t.key,topLevelKey:m,before:_,after:D,reactionDigest:F.digest,operationId:F.operationId,observedAt:F.observedAt}:(g.push({version:2,provenance:a?"EXPLICIT_READBACK_ADOPTION":"NATIVE_SETTER_READBACK",sourceKey:t.key,topLevelKey:m,before:_,after:D,reactionDigest:Q(e,n),operationId:e.message.operationId,observedAt:a?.observedAt??F.observedAt,reactionReadback:a?null:W(F),...a?{recovery:a}:{}}),e.state.nativeFlowObservation={version:2,entries:g}),N(e)}function Ae(e){let t=re(e,(e.scope.page.flowStartingPoints??[]).filter(a=>e.idToKey.has(a.nodeId))),n=O(e,"flows","page");if(n){h(M(he(e,n))===M(t),"DESIGN_FLOW_USER_EDIT_CONFLICT");return}let s=e.state.nativeFlowObservation;if(s){if(s.version===2){let m=Ze(e);h(M(le(e,e.scope.page.flowStartingPoints??[]))===M(m),"DESIGN_FLOW_USER_EDIT_CONFLICT");return}let a=e.map.get(s.sourceKey),E=O(e,"reactions",s.sourceKey);h(s.version===1&&s.before.length===0&&s.after.length===1&&s.after[0].name==="Flow 1"&&s.after[0].nodeKey===s.topLevelKey&&a&&e.idToKey.get(ye(e,a)?.id)===s.topLevelKey&&E?.digest===s.reactionDigest&&Q(e,a)===s.reactionDigest,"DESIGN_NATIVE_FLOW_EVIDENCE_CONFLICT"),h(M(t)===M(s.after),"DESIGN_FLOW_USER_EDIT_CONFLICT");return}let f=(e.spec.flows??[]).map(a=>({name:a.name,nodeKey:a.nodeKey}));h(t.length===0||M(t)===M(f),"DESIGN_FLOW_CONFLICT")}async function St(e,t,n,s){Ae(e);let f=W(e.scope.page.flowStartingPoints??[]),a=ye(e,n);s.length&&h(e.scope.root.type==="PAGE"&&a,"DESIGN_NATIVE_FLOW_REQUIRES_PAGE_SCOPE"),c(e,"reactions",t.key),e.state.pending.flowBefore=f.map(_=>({name:_.name,nodeKey:e.idToKey.get(_.nodeId)??null,nodeId:_.nodeId})),N(e),d(),await n.setReactionsAsync(s);let E=K(e,t,n);k(e,t,n,E),h(M(G(n))===M(s),`DESIGN_REACTION_READBACK_MISMATCH:${t.key}`);let m=W(e.scope.page.flowStartingPoints??[]);e.state.pending.flowAfter=m.map(_=>({name:_.name,nodeKey:e.idToKey.get(_.nodeId)??null,nodeId:_.nodeId})),e.state.pending.reactionReadback={version:1,sourceKey:t.key,sourceId:n.id,topLevelKey:a?e.idToKey.get(a.id):null,digest:Q(e,n),operationId:e.message.operationId,observedAt:new Date().toISOString()},N(e),M(m)!==M(f)&&Qe(e,t,n,f,m),l(e.scope.root,S(e,"reactions",t.key),{version:2,digest:Q(e,n)}),u(e)}function Je(e,t){let n=e.map.get(t.key),s=K(e,t,n);if(k(e,t,n,s),!("children"in n)||n.type==="INSTANCE")return;let f=e.children.get(t.key)??[],a=f.filter(g=>!g.props?.isFixed),E=f.filter(g=>g.props?.isFixed),m=[...a,...E];E.length&&h(t.props?.overflowDirection&&t.props.overflowDirection!=="NONE",`DESIGN_FIXED_REQUIRES_SCROLL_PARENT:${t.key}`);let _=m.map(g=>g.key),D=Z(e,n.children),p=O(e,"order",t.key);if(p&&h(M(Y(e,p))===M(D),`DESIGN_USER_LAYER_EDIT_CONFLICT:${t.key}`),M(_)!==M(D)||E.length!==(n.numberOfFixedChildren??0)){c(e,"order",t.key);for(let g of m)d(),n.appendChild(e.map.get(g.key));"numberOfFixedChildren"in n&&(n.numberOfFixedChildren=E.length),h(M(Z(e,n.children))===M(_),`DESIGN_LAYER_READBACK_MISMATCH:${t.key}`),l(n,Be,z(C(e,n))),l(e.scope.root,S(e,"order",t.key),{keys:_}),u(e)}else p||l(e.scope.root,S(e,"order",t.key),{keys:_})}async function mt(e,t){if(e.state.finalized)return;Ae(e);let n=e.state.finalizeCursor??0;for(let _ of e.order.slice(n,n+t)){let D=e.map.get(_.key);Je(e,_);let p=V(e,_),g=G(D),F=O(e,"reactions",_.key);F?h(F.digest===Q(e,D,F),`DESIGN_REACTION_USER_EDIT_CONFLICT:${_.key}`):h(g.length===0||M(g)===M(p),`DESIGN_REACTION_CONFLICT:${_.key}`),M(g)!==M(p)?await St(e,_,D,p):F||l(e.scope.root,S(e,"reactions",_.key),{version:2,digest:Q(e,D)}),e.state.finalizeCursor=(e.state.finalizeCursor??0)+1,N(e)}if(e.state.finalizeCursor<e.order.length)return;let s=(e.spec.flows??[]).map(_=>({nodeId:e.map.get(_.nodeKey).id,name:_.name})),f=new Set([...e.map.values()].map(_=>_.id)),a=e.scope.page.flowStartingPoints??[],E=a.filter(_=>f.has(_.nodeId)),m=O(e,"flows","page");if(Ae(e),M(E)!==M(s)){c(e,"flows","page"),d(),e.scope.page.flowStartingPoints=[...a.filter(D=>!f.has(D.nodeId)),...s];let _=e.scope.page.flowStartingPoints.filter(D=>f.has(D.nodeId));h(M(_)===M(s),"DESIGN_FLOW_READBACK_MISMATCH"),l(e.scope.root,S(e,"flows","page"),{version:2,flows:re(e,_)}),u(e)}else m||l(e.scope.root,S(e,"flows","page"),{version:2,flows:re(e,E)});e.state.finalized=!0,e.state.complete=!0,N(e)}async function bt(e){let t=e.state.pending;if(!t)return;let s=O(e,{image:"image",style:"style",variable:"variable",collection:"collection",node:"n",order:"order",reactions:"reactions",flows:"flows"}[t.kind],t.key);if(e.payload.adoptNativeFlow!==void 0){let f=e.payload.adoptNativeFlow;h(e.payload.reconcile===!0&&t.kind==="reactions"&&!s&&f&&typeof f=="object"&&!Array.isArray(f)&&Object.keys(f).length===3&&["pendingOperationId","flowSnapshotSignature","reactionSnapshotSignature"].every(F=>Object.hasOwn(f,F))&&typeof f.pendingOperationId=="string"&&f.pendingOperationId===t.operationId&&typeof f.flowSnapshotSignature=="string"&&/^[a-f0-9]{64}$/.test(f.flowSnapshotSignature)&&typeof f.reactionSnapshotSignature=="string"&&/^[a-f0-9]{64}$/.test(f.reactionSnapshotSignature),"DESIGN_NATIVE_FLOW_ADOPTION_INVALID");let a=e.map.get(t.key),E=e.definitions.get(t.key);h(a&&E&&e.state.nativeFlowObservation,"DESIGN_NATIVE_FLOW_ADOPTION_INVALID");let m=K(e,E,a);k(e,E,a,m);let _=W(e.scope.page.flowStartingPoints??[]),p=ae(e,t.flowBefore).map(F=>({name:F.name,nodeId:F.nodeKey===null?F.nodeId:e.map.get(F.nodeKey).id}));h(M(G(a))===M(V(e,E))&&z(le(e,_))===f.flowSnapshotSignature&&Q(e,a)===f.reactionSnapshotSignature,"DESIGN_NATIVE_FLOW_ADOPTION_SNAPSHOT_CONFLICT");let g={legacyPending:W(t),operationId:e.message.operationId,observedAt:new Date().toISOString(),expectedFlowSnapshotSignature:f.flowSnapshotSignature,expectedReactionSnapshotSignature:f.reactionSnapshotSignature,explicitPayload:W(f),verification:"CURRENT_STATE_ADOPTED_NOT_ORIGIN_PROVED"};Qe(e,E,a,p,_,g),l(e.scope.root,S(e,"reactions",t.key),{version:2,digest:Q(e,a),provenance:"EXPLICIT_READBACK_ADOPTION"}),u(e);return}if(h(s,`DESIGN_NEEDS_RECONCILIATION:${t.kind}:${t.key}`),t.kind==="node"){let f=e.order.find(E=>E.key===t.key),a=e.map.get(t.key);h(a&&a.getPluginData(Ve)==="complete","DESIGN_PENDING_NODE_NOT_COMPLETE"),K(e,f,a),e.state.cursor=e.order.filter(E=>e.map.has(E.key)).length}if(t.kind==="reactions"&&h(s.digest===Q(e,e.map.get(t.key),s),"DESIGN_PENDING_REACTION_CONFLICT"),t.kind==="order"&&h(M(Y(e,s))===M(Z(e,e.map.get(t.key).children)),"DESIGN_PENDING_LAYER_CONFLICT"),t.kind==="flows"){let f=new Set([...e.map.values()].map(a=>a.id));h(M(he(e,s))===M(re(e,e.scope.page.flowStartingPoints.filter(a=>f.has(a.nodeId)))),"DESIGN_PENDING_FLOW_CONFLICT")}u(e)}function ge(e){return{applied:e.map.size,total:e.spec.nodes.length,finalizedNodes:e.state.finalizeCursor??0,pending:W(e.state.pending),finalized:e.state.finalized===!0}}async function et(e){let t=[];try{U(e)}catch(p){t.push(p.message)}let n=new Map([...e.map].map(([p,g])=>[g.id,p])),s=new Map([...e.variables].map(([p,g])=>[g.id,p])),f=new Map([...e.styles].map(([p,g])=>[g.id,p])),a=new Map([...e.images].map(([p,g])=>[g,p]));function E(p){let g={type:p.type,opacity:p.opacity??1};return p.type==="SOLID"?(g.color=oe(p.color),p.boundVariables?.color&&(g.variableKey=s.get(p.boundVariables.color.id)??"UNKNOWN")):p.type==="IMAGE"?(g.assetKey=a.get(p.imageHash)??"UNKNOWN",g.scaleMode=p.scaleMode):p.type==="GRADIENT_LINEAR"&&(g.gradientTransform=oe(p.gradientTransform),g.gradientStops=oe(p.gradientStops)),g}let m=[],_=[];for(let p of e.order){let g=e.map.get(p.key);if(!g){t.push(`MISSING_NODE:${p.key}`);continue}let F=C(e,g);if(delete F.parentKey,g.type==="TEXT"&&(F.textStyleId=g.textStyleId),g.type==="INSTANCE"){let H=await g.getMainComponentAsync();F.componentId=H?.id??null,n.get(F.componentId)!==p.props.componentKey&&t.push(`INSTANCE_COMPONENT_MISMATCH:${p.key}`)}let v={};for(let[H,de]of Object.entries(F))["type","name","x","y","width","height"].includes(H)||(v[H]=de);Array.isArray(g.fills)&&(v.fills=g.fills.map(E)),Array.isArray(g.strokes)&&(v.strokes=g.strokes.map(E)),"textStyleId"in v&&(v.textStyleId&&(v.textStyleKey=f.get(v.textStyleId)??"UNKNOWN"),delete v.textStyleId),"componentId"in v&&(v.componentKey=n.get(v.componentId)??"UNKNOWN",delete v.componentId),"overflowDirection"in v&&(v.overflowDirection=Vt[v.overflowDirection]??v.overflowDirection);let Ee=g.parent===e.scope.root?null:n.get(g.parent?.id)??"UNKNOWN";Ee!==p.parentKey&&t.push(`PARENT_MISMATCH:${p.key}`),m.push({key:p.key,id:g.id,type:g.type,name:g.name,parentKey:Ee,x:g.x,y:g.y,width:g.width,height:g.height,props:v,..."children"in g&&g.type!=="INSTANCE"?{childKeys:g.children.map(H=>n.get(H.id)??"FOREIGN")}:{}});let De=V(e,p),ee=G(g);M(ee)!==M(De)&&t.push(`REACTION_MISMATCH:${p.key}`);for(let H of ee)for(let de of H.actions)de.type==="NODE"&&_.push({sourceKey:p.key,destinationKey:n.get(de.destinationId)??"UNKNOWN",trigger:H.trigger.type==="AFTER_TIMEOUT"?{type:"AFTER_TIMEOUT",delaySeconds:H.trigger.timeout/(e.timerUnit==="milliseconds"?1e3:1)}:H.trigger});if(g.type!=="INSTANCE"&&"children"in g){let H=e.children.get(p.key)??[],de=[...H.filter(ie=>!ie.props?.isFixed),...H.filter(ie=>ie.props?.isFixed)].map(ie=>ie.key);M(de)!==M(g.children.map(ie=>n.get(ie.id)))&&t.push(`LAYER_ORDER_MISMATCH:${p.key}`)}}let D=(e.scope.page.flowStartingPoints??[]).filter(p=>n.has(p.nodeId)).map(p=>({nodeKey:n.get(p.nodeId),name:p.name}));return M(D)!==M(e.spec.flows??[])&&t.push("FLOW_MISMATCH"),e.state.pending&&t.push("UNRESOLVED_PENDING_OPERATION"),e.state.complete||t.push("DESIGN_NOT_COMPLETE"),e.styles.size!==(e.spec.textStyles?.length??0)&&t.push("TEXT_STYLE_COUNT_MISMATCH"),e.variables.size!==(e.spec.variables?.length??0)&&t.push("VARIABLE_COUNT_MISMATCH"),{schemaVersion:"1.0",runId:e.payload.runId,specId:e.spec.id,specSignature:e.signature,collectedAt:new Date().toISOString(),fileIdentity:{fileKey:o.fileKey},scope:{pageId:e.scope.page.id,rootNodeId:e.scope.root.id},status:t.length?"FAIL":"PASS",writes:0,errors:t,nodes:m,reactions:_,flows:D,counts:{nodes:m.length,texts:m.filter(p=>p.type==="TEXT").length,components:m.filter(p=>p.type==="COMPONENT").length,instances:m.filter(p=>p.type==="INSTANCE").length,reactions:_.length,flows:D.length,textStyles:e.styles.size,variables:e.variables.size},textStyles:[...e.styles].map(([p,g])=>({key:p,...x(g),name:e.spec.textStyles.find(F=>F.key===p).name})),variables:[...e.variables].map(([p,g])=>({key:p,name:e.spec.variables.find(F=>F.key===p).name,value:Object.values(g.valuesByMode)[0]})),fontSubstitutions:e.substitutions,timerUnit:e.timerUnit,playback:"NOT VERIFIED",checkpoint:ge(e)}}function At(e,t){let n=e.payload.auditOffset??0,s=e.payload.auditLimit??1e3;h(Number.isInteger(n)&&n>=0&&n<=25e3&&n<=t.nodes.length,"DESIGN_AUDIT_OFFSET_INVALID"),h(Number.isInteger(s)&&s>=1&&s<=2e3,"DESIGN_AUDIT_LIMIT_INVALID");let{collectedAt:f,...a}=t,E={...t,nodes:t.nodes.slice(n,n+s),page:{offset:n,limit:s,totalNodes:t.nodes.length,nextOffset:n+s<t.nodes.length?n+s:null,snapshotSignature:z(a)}};return h(Xe(JSON.stringify(E)).byteLength<7*1024*1024,"DESIGN_AUDIT_RESPONSE_BUDGET_EXCEEDED: reduce auditLimit or split the specification"),E}async function Tt(e){h(!r,"DESIGN_RUNTIME_BUSY"),r=!0;try{let t=await I(e);if(t.payload.adoptNativeFlow!==void 0&&h(e.command==="scope_design_apply"&&t.payload.reconcile===!0&&t.state.pending?.kind==="reactions","DESIGN_NATIVE_FLOW_ADOPTION_INVALID"),await P(t,e.command==="scope_design_apply"),await B(t),e.command==="scope_design_audit")return At(t,await et(t));if(U(t),e.command==="scope_design_plan")return{status:t.state.pending?"NEEDS_RECONCILIATION":"PLANNED",writes:0,specId:t.spec.id,specSignature:t.signature,runId:t.payload.runId,checkpoint:ge(t),fontSubstitutions:t.substitutions,globalResources:{textStyles:t.spec.textStyles?.length??0,variables:t.spec.variables?.length??0,requiresExplicitAuthorization:!!(t.spec.textStyles?.length||t.spec.variables?.length)},timerUnit:t.timerUnit,playback:"NOT VERIFIED"};if(e.command==="scope_design_export_png"){let s=t.map.get(t.payload.nodeKey);h(s,"DESIGN_EXPORT_NODE_MISSING"),i.assertTaskOwnedSubtree(s,t.ownership);let f=t.payload.scale??1;h(Number.isFinite(f)&&f>=1&&f<=4,"DESIGN_EXPORT_SCALE_INVALID");let a=await s.exportAsync({format:"PNG",constraint:{type:"SCALE",value:f}});return{status:"PASS",writes:0,runId:t.payload.runId,specId:t.spec.id,nodeKey:t.payload.nodeKey,width:s.width,height:s.height,scale:f,bytesBase64:zt(a),sha256:ve(Ge(a)),fileIdentity:{fileKey:o.fileKey}}}h(e.command==="scope_design_apply","DESIGN_COMMAND_INVALID");let n=t.payload.batchSize??100;if(h(Number.isInteger(n)&&n>=1&&n<=500,"DESIGN_BATCH_SIZE_INVALID"),(t.spec.textStyles?.length||t.spec.variables?.length)&&h(t.payload.allowGlobalResources===!0,"DESIGN_GLOBAL_RESOURCES_AUTH_REQUIRED"),t.state.pending){if(t.payload.reconcile!==!0)return{status:"NEEDS_RECONCILIATION",runId:t.payload.runId,specId:t.spec.id,checkpoint:ge(t),nextAction:"audit"};await bt(t)}if(t.state.complete){let s=await et(t);return h(s.status==="PASS",`DESIGN_COMPLETED_DRIFT:${s.errors.join(",")}`),{status:"COMPLETE",runId:t.payload.runId,specId:t.spec.id,checkpoint:ge(t),nextAction:"audit",idempotent:!0}}t.scope.root.type!=="PAGE"&&i.assertTaskOwned(t.scope.root,t.ownership),(t.spec.flows?.length??0)>0&&h(t.scope.root.type==="PAGE","DESIGN_FLOW_REQUIRES_PAGE_SCOPE"),o.currentPage.id!==t.scope.page.id&&await o.setCurrentPageAsync(t.scope.page);try{Ae(t),N(t),await R(t);let s=0;for(let f of t.order)if(!t.map.has(f.key)&&(await j(t,f),s+=1,s>=n))break;return t.map.size===t.spec.nodes.length&&s<n&&await mt(t,n-s),{status:t.state.complete?"COMPLETE":"IN_PROGRESS",runId:t.payload.runId,specId:t.spec.id,checkpoint:ge(t),nextAction:t.state.complete?"audit":"apply-next-batch",fontSubstitutions:t.substitutions,nodeMap:Object.fromEntries([...t.map].map(([f,a])=>[f,a.id]))}}catch(s){return{status:"PARTIAL_FAILURE",runId:t.payload.runId,specId:t.spec.id,checkpoint:ge(t),nextAction:"audit",error:String(s.message).slice(0,500),replay:"PROHIBITED_UNTIL_READBACK_RECONCILIATION",...s.readbackMismatch?{readbackMismatch:s.readbackMismatch}:{}}}}finally{r=!1}}return{execute:Tt}}return Lt(jt);})();
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
  if (!node) throw new Error(violationCode);
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
