/* WeshCraft for OpenChamber, built from openchamber/src by openchamber/build.mjs */
(()=>{var Wo=Object.defineProperty;var zo=(e,r,n)=>r in e?Wo(e,r,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[r]=n;var je=(e,r,n)=>zo(e,typeof r!="symbol"?r+"":r,n);var p="openchamber.sdk";var Re="data-oc-scrolling",We=`
:root {
  /* Quiet at rest like the app's own thumbs; hover gives a clear grab target. */
  --oc-scrollbar-thumb: color-mix(in srgb, var(--oc-muted, currentColor) 18%, transparent);
  --oc-scrollbar-thumb-hover: color-mix(in srgb, var(--oc-muted, currentColor) 36%, transparent);
  scrollbar-gutter: stable;
}
* {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
:hover, [${Re}] {
  scrollbar-color: var(--oc-scrollbar-thumb) transparent;
}
/* Chromium's standard scrollbar properties otherwise override its pseudo-elements. */
@supports selector(::-webkit-scrollbar) {
  *, :hover, [${Re}] { scrollbar-width: auto; scrollbar-color: auto; }
  ::-webkit-scrollbar { width: 6px; height: 6px; background: transparent; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 999px;
    min-width: 24px;
    min-height: 24px;
  }
  :hover::-webkit-scrollbar-thumb, [${Re}]::-webkit-scrollbar-thumb { background: var(--oc-scrollbar-thumb); }
  ::-webkit-scrollbar-thumb:hover { background: var(--oc-scrollbar-thumb-hover); }
  ::-webkit-scrollbar-corner { background: transparent; }
  ::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
}
@media (forced-colors: active) {
  *, :hover, [${Re}] { scrollbar-color: auto; }
  ::-webkit-scrollbar-thumb, ::-webkit-scrollbar-thumb:hover { background: CanvasText; }
}
`;function Kt(e){let r=e.documentElement;if(r.hasAttribute("data-oc-scrollbar-activity"))return;r.setAttribute("data-oc-scrollbar-activity","");let n=new WeakMap;e.addEventListener("scroll",_=>{let E=_.target===e?r:_.target;if(!(E instanceof Element))return;E.hasAttribute("data-oc-scrolling")||E.setAttribute("data-oc-scrolling","");let b=n.get(E);b!==void 0&&clearTimeout(b),n.set(E,setTimeout(()=>{n.delete(E),E.removeAttribute("data-oc-scrolling")},1e3))},{capture:!0,passive:!0})}var Jo=`(${Kt.toString()})(document);`;var Jt=/^[a-z][a-z0-9-]{0,39}$/;var jt=e=>Object(e)===e&&!Array.isArray(e),ze=(e,r)=>Object.keys(e).every(n=>r.includes(n)),Wt=e=>String(e)===e&&e.length>=1&&e.length<=60,zt=e=>String(e)===e&&e.length>=1&&e.length<=80,Yt=e=>{if(!Array.isArray(e)||e.length>4)return!1;let r=new Set;for(let n of e){if(!jt(n)||!Jt.test(n.id)||!Wt(n.label)||n.disabled!==void 0&&n.disabled!==!0&&n.disabled!==!1||r.has(n.id))return!1;if(r.add(n.id),n.kind==="button"){if(!ze(n,["kind","id","label","disabled"]))return!1;continue}if(n.kind!=="select"||!ze(n,["kind","id","label","value","options","disabled"])||!zt(n.value)||!Array.isArray(n.options)||n.options.length<1||n.options.length>16)return!1;let _=new Set;for(let E of n.options){if(!jt(E)||!ze(E,["value","label"])||!zt(E.value)||!Wt(E.label)||_.has(E.value))return!1;_.add(E.value)}if(!_.has(n.value))return!1}return!0};var qt=["{id}","{segment}","{segments+}"];var vr=new Set(qt);var Qt=["turn-finished","turn-failed","permission-asked","question-asked"];var Mr=new Set(Qt);var Je=e=>"bytes"in e?e.bytes.byteLength:e.content.length,Zt=(e,r)=>{if(e.path!==r.path||e.readOnly!==r.readOnly)return!1;if(e.encoding==="text"||r.encoding==="text")return e.encoding==="text"&&r.encoding==="text"&&e.content===r.content;if(e.bytes.byteLength!==r.bytes.byteLength)return!1;for(let n=0;n<e.bytes.byteLength;n+=1)if(e.bytes[n]!==r.bytes[n])return!1;return!0};var eo=/^[A-Za-z0-9_-]{1,80}$/;var to=["left","right","top","bottom"];var oo=(e,r=0,n={remaining:16e3})=>{if(--n.remaining<0||r>=32)return!1;if(e===null)return!0;let _=Array.isArray(e)?e:Object(e)===e?Object.values(e):[];for(let E of _)if(!oo(E,r+1,n))return!1;return!0},Ye=e=>{if(e===null||e===!0||e===!1)return!0;if(Array.isArray(e))return Object.keys(e).every(r=>/^(0|[1-9]\d*)$/.test(r)&&Number(r)<e.length)&&e.every(Ye);if(Object(e)===e){let r=Object.getPrototypeOf(e);return(r===null||r===Object.prototype)&&Object.values(e).every(Ye)}return String(e)===e||Number.isFinite(e)},qe=e=>{try{return String(e.id)!==e.id||!eo.test(e.id)||!Number.isFinite(e.anchor.x)||Math.abs(e.anchor.x)>1e5||!Number.isFinite(e.anchor.y)||Math.abs(e.anchor.y)>1e5||!Number.isFinite(e.anchor.width)||!Number.isFinite(e.anchor.height)||e.anchor.width<=0||e.anchor.height<=0||e.anchor.width>1e5||e.anchor.height>1e5||!Number.isInteger(e.width)||e.width<160||e.width>640||!Number.isInteger(e.height)||e.height<48||e.height>480||e.side!==void 0&&!to.includes(e.side)||e.focus!==void 0&&e.focus!==!0&&e.focus!==!1||!oo(e.data)||!Ye(e.data)?!1:JSON.stringify(e.data).length<=16e3}catch{return!1}};var no=["file","directory","other","missing"],Ze=e=>!!(e&&"sessionId"in e),et=e=>!!(e&&"sent"in e&&!("sessionId"in e));var so=/^[0-9a-f]{7,64}$/i,tt=e=>so.test(e),xe=500,be=32e3,io=16e3,ao=128,co=200,lo=2e3,po=16e3,uo=80,Eo=200,_o=16e3;var To=2e3;var ot=2e4,ge=1024,ke=2e6;var Ie=64e3,ye=8e3,rt=4e3;var nt=96e4,qo=60*6e4;var So=999,fo=1e4,le=500,Oo=["HOST_UNAVAILABLE","HOST_TIMEOUT","HOST_REJECTED","DISCONNECTED","DISABLED","BAD_PATH","NO_INTEGRATION","NO_SERVICE","SERVICE_FAILED","REQUEST_FAILED","RESPONSE_TOO_LARGE","NO_SESSION","SESSION_BUSY","NOT_GRANTED","NO_DIRECTORY","NOT_FOUND","FILE_TOO_LARGE","DENIED","NO_MODEL","MODEL_FAILED","UNSUPPORTED"],ho=["stopped","starting","ready","failed"],Qo=new Set(Oo),Ao=e=>Qo.has(e),mo=e=>e&&Ao(e)?e:"HOST_REJECTED",Y=e=>e===void 0?!1:e===null||e===!0||e===!1||String(e)===e?!0:Number(e)===e?Number.isFinite(e):Array.isArray(e)?e.every(Y):Object(e)===e?Object.values(e).every(Y):!1,Ro=e=>Y(e)&&JSON.stringify(e).length<=_o,ro=e=>e?.trim().slice(0,Eo)??"",q=e=>{let r=e.id.trim().slice(0,ao),n=e.title.trim().slice(0,co),_=e.url.trim().slice(0,lo),E=e.text?.trim().slice(0,po),b=e.author?.trim().slice(0,uo),M=e.kind==="pull"?"pull":"issue",I={providerId:e.providerId.trim(),id:r,title:n||r,url:_,kind:M};if(E&&(I.text=E),b&&(I.author=b),M==="pull"){let $=ro(e.branches?.head),F=ro(e.branches?.base);$&&F&&(I.branches={head:$,base:F})}return Ro(e.data)&&(I.data=e.data),I},st=e=>{let r=q(e);return e.projectId&&(r.projectId=e.projectId),e.navigation&&(r.navigation=e.navigation),e.worktree&&(r.worktree=e.worktree),r},it=e=>{let r={text:e.text.trim().slice(0,io)};return e.send&&(r.send=!0),r},at=e=>e===null||!Number.isFinite(e)?null:Math.min(So,Math.max(0,Math.round(e))),ct=e=>Number.isFinite(e)?Math.min(fo,Math.max(0,Math.ceil(e))):0;var Q=e=>e.length>0&&e.length<=ge&&!e.includes("\0")&&!e.includes("\\");var Ue=e=>!e.startsWith("/")||e.includes("\0")||e.includes("\\")||e.includes("://")||e.length>To?!1:!e.split("/").some(n=>n==="."||n===".."),Zo=new Set(ho),dt=e=>!!(e&&"status"in e&&Zo.has(String(e.status))&&!("body"in e)),Ce=e=>!!(e&&"status"in e&&"body"in e&&Number.isInteger(e.status)),lt=e=>!!(e&&"content"in e&&String(e.content)===e.content),pt=e=>!!(e&&"written"in e&&e.written===!0),ut=e=>!!(e&&"entries"in e&&Array.isArray(e.entries)),er=new Set(no),Et=e=>!!(e&&"kind"in e&&"size"in e&&er.has(String(e.kind))&&Number.isFinite(e.size)),_t=e=>!!(e&&"text"in e&&String(e.text)===e.text&&!("status"in e)),tr=new Set(["workspace","shells","ready","directory","session","connection","settings","session-lifecycle","item","resolve","action","status-control-event","popover-closed","file-open","file-snapshot","file-saved","generate-late"]),or=e=>Object(e)===e?e:null,Qe=e=>String(e)===e&&e.length>0,rr=e=>{if(!Qe(e.id))return null;if(e.ok===!0){let r={channel:p,v:1,type:"result",id:e.id,ok:!0};return Object(e.payload)===e.payload&&(r.payload=e.payload),r}return e.ok===!1&&Qe(e.error)?{channel:p,v:1,type:"result",id:e.id,ok:!1,error:e.error,code:mo(Qe(e.code)?e.code:void 0)}:null},Tt=e=>{let r=or(e);return!r||r.channel!==p||r.v!==1?null:r.type==="result"?rr(r):!tr.has(String(r.type))||Object(r.payload)!==r.payload?null:r};var xo=e=>"key"in e&&"metaKey"in e&&"ctrlKey"in e,nr=e=>(e.metaKey||e.ctrlKey)&&!e.altKey&&!e.shiftKey&&e.key.toLowerCase()==="s",a=class extends Error{constructor(n,_){super(_);je(this,"code");this.name="HostRequestError",this.code=n}},bo=()=>Promise.reject(new a("BAD_PATH",'Request path must start with "/" and stay on the declared origin.')),ve=()=>Promise.reject(new a("BAD_PATH",`File path must be 1 to ${ge} characters without NUL or backslash.`)),Ne=e=>{if(e!==void 0){if(Object(e)!==e||Array.isArray(e)||e.scope!==void 0&&e.scope!=="instance"&&e.scope!=="device")throw new a("HOST_REJECTED",'Storage scope must be "instance" or "device".');return e.scope==="device"?"device":void 0}},l=e=>(e.value+=1,`oc-${e.value}`),At=(e={})=>{let r=e.target??("window"in globalThis?window:null);if(!r)throw new a("HOST_UNAVAILABLE","No window. connectHost runs in a browser frame.");let n=e.acceptSource??(t=>t===r.parent),_=e.requestTimeoutMs??ot,E=new Set,b=new Set,M=new Set,I=new Set,$=new Set,F=new Set,re=new Set,Te=new Set,Se=new Set,j=new Set,$e=[],ne=null,se=null,fe=new Set,Oe=new Set,ie=null,ae=null,Fe=!1,W=new Map,z=new Map,J=new Map,P=!1,d={value:0},c=null,G=null,ce=!1,de=!1,Mt=null,Lt=t=>t?{sessionId:t.id,phase:t.busy?"started":"completed"}:null,v=t=>{r.parent.postMessage(t,"*")},wt=()=>{P||r.parent===r||j.size===0||c?.features?.lateGenerateResults!==!0||v({channel:p,v:1,type:"generate-late-listen"})},A=(t,o)=>{for(let s of t)try{s(o)}catch(i){console.error(i)}},Pt=t=>{if(!(t instanceof MessageEvent)||!n(t.source))return;let o=Tt(t.data);if(!o)return;if(o.type==="workspace"){let i=z.get(o.payload.subscriptionId);i&&A([i],o.payload.snapshot);return}if(o.type==="shells"){let i=J.get(o.payload.subscriptionId);i&&A([i],o.payload.snapshot);return}if(o.type==="ready"){c=o.payload,G=Lt(o.payload.session),A(E,o.payload),A(b,o.payload.directory),A(M,o.payload.session),G&&A(I,G),A($,o.payload.connection),A(F,o.payload.settings),A(re,o.payload.item),wt();return}if(o.type==="generate-late"){j.size===0?$e.push(o.payload):A(j,o.payload);return}if(o.type==="directory"){c&&(c={...c,directory:o.payload.directory}),A(b,o.payload.directory);return}if(o.type==="session"){c&&(c={...c,session:o.payload.session}),o.payload.session?G?.sessionId!==o.payload.session.id&&(G=Lt(o.payload.session)):G=null,A(M,o.payload.session);return}if(o.type==="session-lifecycle"){G=o.payload,A(I,o.payload);return}if(o.type==="connection"){c&&(c={...c,connection:o.payload.connection}),A($,o.payload.connection);return}if(o.type==="settings"){c&&(c={...c,settings:o.payload.settings}),A(F,o.payload.settings);return}if(o.type==="item"){c&&(c={...c,item:o.payload.item}),A(re,o.payload.item);return}if(o.type==="status-control-event"){A(Te,o.payload);return}if(o.type==="popover-closed"){A(Se,o.payload);return}if(o.type==="action"){let i=T=>{P||v({channel:p,v:1,type:"action-result",id:o.id,payload:T})},S=se;if(!S){i({ok:!1,error:"This extension does not handle background actions."});return}Promise.resolve().then(()=>S(o.payload)).then(()=>i({ok:!0}),T=>{let x=(T instanceof Error?T.message:String(T)).trim();i({ok:!1,error:(x||"Action failed.").slice(0,le)})});return}if(o.type==="file-open"){let i=o.payload;if(ae&&Zt(ae,i))return;ae=i,A(fe,o.payload);return}if(o.type==="file-saved"){A(Oe,o.payload.version);return}if(o.type==="file-snapshot"){let i=x=>{P||v({channel:p,v:1,type:"file-snapshot-result",id:o.id,payload:x})},S=x=>i({error:(x.trim()||"Could not read the edited file.").slice(0,le)}),T=ie;if(!T){S("This extension does not edit files.");return}Promise.resolve().then(()=>T(o.payload.purpose)).then(x=>{if(Je(x)>2e7){S(`The file is over ${2e7} ${"bytes"in x?"bytes":"characters"}.`);return}if(x.version.length>256){S(`The snapshot version is over ${256} characters.`);return}i({snapshot:"bytes"in x?{bytes:x.bytes,version:x.version}:{content:x.content,version:x.version}})},x=>S(x instanceof Error?x.message:String(x)));return}if(o.type==="resolve"){let i=T=>{v({channel:p,v:1,type:"resolve-result",id:o.id,payload:T})},S=ne;if(!S){i({error:"This extension does not resolve commands."});return}Promise.resolve().then(()=>S(o.payload)).then(T=>i({item:T?q(T):null}),T=>{let x=(T instanceof Error?T.message:String(T)).trim();i({error:(x||"Command failed.").slice(0,le)})});return}let s=W.get(o.id);if(s){if(clearTimeout(s.timer),W.delete(o.id),o.ok){s.resolve(o.payload);return}s.reject(new a(o.code,o.error))}};r.addEventListener("message",Pt),v({channel:p,v:1,type:"hello"});let g=(t,o=_)=>P||r.parent===r?Promise.reject(new a("HOST_UNAVAILABLE","No host frame. This page is not in an iframe.")):new Promise((s,i)=>{let S=setTimeout(()=>{W.delete(t.id),i(new a("HOST_TIMEOUT","Host did not answer in time."))},o);W.set(t.id,{resolve:s,reject:i,timer:S}),v(t)}),m=t=>g(t).then(()=>{}),R={channel:p,v:1},Ve=t=>{!P&&r.parent!==r&&v(t)},Gt=()=>Ve({...R,type:"file-save"}),Dt=t=>{!xo(t)||!nr(t)||(t.preventDefault(),Gt())},Ht=t=>{!xo(t)||t.key!=="Escape"||c?.surface!=="popover"||!c.popover||(t.preventDefault(),Vt(c.popover.id,"escape").catch(()=>{}))},he=()=>{let t=c?.surface==="popover"?c.popover:void 0;if(!t)return;let o=ce||de;Mt!==o&&(Mt=o,Bt(t.id,o).catch(()=>{}))},Ae=()=>{c?.surface!=="popover"||ce||(ce=!0,he())},Xt=t=>{c?.surface!=="popover"||t.relatedTarget!==null||!ce||(ce=!1,he())},$t=()=>{c?.surface!=="popover"||de||(de=!0,he())},Ft=()=>{c?.surface!=="popover"||!de||(de=!1,he())},L=(t,o=1024)=>{if(!t.trim()||t.length>o)throw new a("HOST_REJECTED",`Identity must contain 1 to ${o} characters.`)},Be=async t=>{t.kind!=="projects"&&L(t.projectId);let o=await g({...R,type:"workspace-read",id:l(d),payload:t});if(!o||!("kind"in o)||!("state"in o)||o.kind!==t.kind)throw new a("HOST_REJECTED","Host did not return workspace data.");return o},Ke=async(t,o)=>{t.kind!=="projects"&&L(t.projectId);let s=l(d);z.set(s,o);try{await m({...R,type:"workspace-subscribe",id:l(d),payload:{subscriptionId:s,query:t}})}catch(i){throw z.delete(s),P||v({...R,type:"workspace-unsubscribe",id:l(d),payload:{subscriptionId:s}}),i}return()=>{!z.delete(s)||P||v({...R,type:"workspace-unsubscribe",id:l(d),payload:{subscriptionId:s}})}},jo=async(t,o)=>{t.kind==="session"&&L(t.sessionId),t.kind==="project"&&L(t.projectId);let s=l(d);J.set(s,o);try{await m({...R,type:"shells-subscribe",id:l(d),payload:{subscriptionId:s,scope:t}})}catch(i){throw J.delete(s),P||v({...R,type:"shells-unsubscribe",id:l(d),payload:{subscriptionId:s}}),i}return()=>{!J.delete(s)||P||v({...R,type:"shells-unsubscribe",id:l(d),payload:{subscriptionId:s}})}},me=async t=>{if("key"in t&&(t.key.length===0||t.key.length>128))throw new a("HOST_REJECTED","Storage key must contain 1 to 128 characters.");if(t.op==="set"&&!Y(t.value))throw new a("HOST_REJECTED","Storage values must be JSON.");if(t.op==="set"&&new TextEncoder().encode(JSON.stringify(t.value)).length>65536)throw new a("HOST_REJECTED","Storage value exceeds 64 KiB.");if(t.scope==="device"&&c?.features?.deviceStorage!==!0)throw new a("UNSUPPORTED","This host does not support device storage.");let o=await g({...R,type:"storage",id:l(d),payload:t});if(!o||!("storage"in o)||o.op!==t.op)throw new a("HOST_REJECTED","Host did not return storage data.");return o},Vt=(t,o)=>c?.features?.popovers!==!0&&!(c?.surface==="popover"&&c.popover?.id===t)?Promise.reject(new a("UNSUPPORTED","This host does not support popovers.")):m({...R,type:"popover-close",id:l(d),payload:o?{id:t,reason:o}:{id:t}}),Bt=(t,o)=>c?.features?.popovers!==!0&&!(c?.surface==="popover"&&c.popover?.id===t)?Promise.reject(new a("UNSUPPORTED","This host does not support popovers.")):m({...R,type:"popover-anchor",id:l(d),payload:{id:t,active:o}});return r.addEventListener("keydown",Ht,!0),r.addEventListener("pointerover",Ae),r.addEventListener("pointermove",Ae),r.addEventListener("pointerout",Xt),r.addEventListener("focus",$t),r.addEventListener("blur",Ft),{onAction:t=>(se=t,()=>{se===t&&(se=null)}),listProjects:async()=>{let t=await Be({kind:"projects"});if(t.kind!=="projects")throw new a("HOST_REJECTED","Expected projects.");return t},listWorktrees:async t=>{let o=await Be({kind:"worktrees",projectId:t});if(o.kind!=="worktrees")throw new a("HOST_REJECTED","Expected worktrees.");return o},listSessions:async t=>{let o=await Be({kind:"sessions",projectId:t});if(o.kind!=="sessions")throw new a("HOST_REJECTED","Expected sessions.");return o},onProjects:t=>Ke({kind:"projects"},o=>{o.kind==="projects"&&t(o)}),onWorktrees:(t,o)=>Ke({kind:"worktrees",projectId:t},s=>{s.kind==="worktrees"&&o(s)}),onSessions:(t,o)=>Ke({kind:"sessions",projectId:t},s=>{s.kind==="sessions"&&o(s)}),onRunningShells:(t,o)=>jo(t,o),readShellOutput:async(t,o)=>{L(t,128);let s=o?.cursor;if(s!==void 0&&(!Number.isInteger(s)||s<0))throw new a("HOST_REJECTED","Shell output cursor must be a non-negative integer.");let i=o?.tailBytes;if(i!==void 0&&(!Number.isInteger(i)||i<1||i>65536))throw new a("HOST_REJECTED",`Shell output tailBytes must be an integer between 1 and ${65536}.`);let T=await g({...R,type:"shell-output",id:l(d),payload:{shellId:t,cursor:s,tailBytes:i}});if(!T||typeof T.output!="string"||!Number.isFinite(T.cursor))throw new a("HOST_REJECTED","Host did not return shell output.");return T},stopShell:async t=>{if(L(t,128),(await g({...R,type:"shell-stop",id:l(d),payload:{shellId:t}}))?.stopped!==!0)throw new a("HOST_REJECTED","Host did not stop the shell.");return{stopped:!0}},openSession:async t=>{L(t),await m({...R,type:"open-session",id:l(d),payload:{sessionId:t}})},storage:{get:async(t,o)=>{let s=Ne(o),i={op:"get",key:t};s&&(i.scope=s);let S=await me(i);return S.op==="get"&&S.found?S.value:void 0},set:async(t,o,s)=>{let i=Ne(s),S={op:"set",key:t,value:o};i&&(S.scope=i),await me(S)},delete:async(t,o)=>{let s=Ne(o),i={op:"delete",key:t};s&&(i.scope=s),await me(i)},keys:async t=>{let o=Ne(t),s={op:"keys"};o&&(s.scope=o);let i=await me(s);if(i.op!=="keys")throw new a("HOST_REJECTED","Expected storage keys.");return i.keys}},onReady:t=>(E.add(t),c&&t(c),()=>{E.delete(t)}),onDirectory:t=>(b.add(t),c&&t(c.directory),()=>{b.delete(t)}),onSession:t=>(M.add(t),c&&t(c.session),()=>{M.delete(t)}),onSessionLifecycle:t=>(I.add(t),G&&t(G),()=>{I.delete(t)}),onConnection:t=>($.add(t),c&&t(c.connection),()=>{$.delete(t)}),onSettings:t=>(F.add(t),c&&t(c.settings),()=>{F.delete(t)}),onItem:t=>(re.add(t),c&&t(c.item),()=>{re.delete(t)}),onStatusControl:t=>(Te.add(t),()=>{Te.delete(t)}),onPopoverClosed:t=>(Se.add(t),()=>{Se.delete(t)}),setStatusControls:t=>c?.features?.statusControls!==!0?Promise.reject(new a("UNSUPPORTED","This host does not support status controls.")):Yt(t)?m({...R,type:"status-controls",id:l(d),payload:{controls:t}}):Promise.reject(new a("HOST_REJECTED","Status controls must have unique bounded ids and valid selected options.")),openPopover:t=>c?.features?.popovers!==!0?Promise.reject(new a("UNSUPPORTED","This host does not support popovers.")):qe(t)?m({...R,type:"popover-open",id:l(d),payload:t}):Promise.reject(new a("HOST_REJECTED","Popover requests need bounded geometry and JSON data.")),closePopover:Vt,setPopoverAnchorActive:Bt,onResolve:t=>(ne=t,()=>{ne===t&&(ne=null)}),toast:t=>{let o=t.message.trim();return!o||o.length>xe?Promise.reject(new a("HOST_REJECTED",`Toast message must contain 1 to ${xe} characters.`)):t.copy&&t.copy!==!0&&(!t.copy.text.length||t.copy.text.length>be)?Promise.reject(new a("HOST_REJECTED",`Toast copy text must contain 1 to ${be} characters.`)):m({channel:p,v:1,type:"toast",id:l(d),payload:{...t,message:o}})},openUrl:t=>m({channel:p,v:1,type:"open-url",id:l(d),payload:{url:t}}),openCommit:t=>tt(t)?m({channel:p,v:1,type:"open-commit",id:l(d),payload:{sha:t}}):Promise.reject(new a("HOST_REJECTED","Commit id must be 7 to 64 hex characters.")),openSurface:t=>m({channel:p,v:1,type:"open-surface",id:l(d),payload:{surfaceId:t}}),writeClipboard:t=>m({channel:p,v:1,type:"clipboard-write",id:l(d),payload:{text:t}}),compose:t=>m({channel:p,v:1,type:"compose",id:l(d),payload:t}),attach:t=>m({channel:p,v:1,type:"attach",id:l(d),payload:q(t)}),startSession:async t=>{t.projectId!==void 0&&L(t.projectId);let o=t.worktree;o&&o!==!0&&(o.kind==="existing"?L(o.directory):(o.name!==void 0&&L(o.name,200),o.baseBranch!==void 0&&L(o.baseBranch,200)));let s=await g({channel:p,v:1,type:"start-session",id:l(d),payload:st(t)},e.requestTimeoutMs??18e4);if(!Ze(s))throw new a("HOST_REJECTED","Host did not return a session.");return s},prompt:t=>g({channel:p,v:1,type:"prompt",id:l(d),payload:it(t)}).then(o=>{if(!et(o))throw new a("HOST_REJECTED","Host did not return a prompt result.");return o}),sessionLink:t=>m({channel:p,v:1,type:"session-link",id:l(d),payload:q(t)}),close:()=>m({channel:p,v:1,type:"close",id:l(d)}),oauthStart:()=>m({channel:p,v:1,type:"oauth-start",id:l(d)}),oauthDisconnect:()=>m({channel:p,v:1,type:"oauth-disconnect",id:l(d)}),request:t=>(Ue(t.path)?g({channel:p,v:1,type:"request",id:l(d),payload:t}):bo()).then(o=>{if(!Ce(o))throw new a("HOST_REJECTED","Host request result was empty.");return o}),serviceRequest:t=>(Ue(t.path)?g({channel:p,v:1,type:"service-request",id:l(d),payload:t}):bo()).then(o=>{if(!Ce(o))throw new a("HOST_REJECTED","Host service request result was empty.");return o}),serviceStatus:()=>g({channel:p,v:1,type:"service-status",id:l(d)}).then(t=>{if(!dt(t))throw new a("HOST_REJECTED","Host did not return service status.");return t}),readFile:t=>(Q(t)?g({channel:p,v:1,type:"file-read",id:l(d),payload:{path:t}}):ve()).then(o=>{if(!lt(o))throw new a("HOST_REJECTED","Host did not return file content.");return o}),writeFile:(t,o)=>Q(t)?o.length>ke?Promise.reject(new a("FILE_TOO_LARGE",`Content is over ${ke} characters.`)):g({channel:p,v:1,type:"file-write",id:l(d),payload:{path:t,content:o}}).then(s=>{if(!pt(s))throw new a("HOST_REJECTED","Host did not confirm the write.");return s}):ve(),listDir:t=>(Q(t)?g({channel:p,v:1,type:"file-list",id:l(d),payload:{path:t}}):ve()).then(o=>{if(!ut(o))throw new a("HOST_REJECTED","Host did not return directory entries.");return o}),stat:t=>(Q(t)?g({channel:p,v:1,type:"file-stat",id:l(d),payload:{path:t}}):ve()).then(o=>{if(!Et(o))throw new a("HOST_REJECTED","Host did not return file status.");return o}),generate:t=>{let o=t.prompt.trim(),s=t.system?.trim();if(o.length===0||o.length>Ie)return Promise.reject(new a("HOST_REJECTED",`Prompt must be 1 to ${Ie} characters.`));if(s!==void 0&&(s.length===0||s.length>ye))return Promise.reject(new a("HOST_REJECTED",`System prompt must be 1 to ${ye} characters.`));let i=t.maxOutputTokens===void 0?void 0:Math.min(rt,Math.max(1,Math.floor(t.maxOutputTokens)));if(i!==void 0&&!Number.isFinite(i))return Promise.reject(new a("HOST_REJECTED","maxOutputTokens must be a number."));let S={prompt:o};return s!==void 0&&(S.system=s),i!==void 0&&(S.maxOutputTokens=i),g({channel:p,v:1,type:"generate",id:l(d),payload:S},e.requestTimeoutMs??nt).then(T=>{if(!_t(T))throw new a("HOST_REJECTED","Host did not return generated text.");return T})},onLateGenerateResult:t=>{j.add(t);for(let o of $e.splice(0))A([t],o);return wt(),()=>{j.delete(t)}},setBadge:t=>m({channel:p,v:1,type:"badge",id:l(d),payload:{count:at(t)}}),setHeight:t=>m({channel:p,v:1,type:"resize",id:l(d),payload:{height:ct(t)}}),onFileOpen:t=>(fe.add(t),Fe||(Fe=!0,r.addEventListener("keydown",Dt,!0)),ae&&t(ae),()=>{fe.delete(t)}),onFileSnapshot:t=>(ie=t,()=>{ie===t&&(ie=null)}),onFileSaved:t=>(Oe.add(t),()=>{Oe.delete(t)}),reportFileChange:t=>Ve({...R,type:"file-change",payload:{dirty:t.dirty,edited:t.edited}}),requestFileSave:Gt,reportFileUnsupported:()=>Ve({...R,type:"file-unsupported"}),dispose:()=>{for(let t of z.keys())v({...R,type:"workspace-unsubscribe",id:l(d),payload:{subscriptionId:t}});z.clear();for(let t of J.keys())v({...R,type:"shells-unsubscribe",id:l(d),payload:{subscriptionId:t}});J.clear(),P=!0,ne=null,se=null,ie=null,fe.clear(),Oe.clear(),Fe&&r.removeEventListener("keydown",Dt,!0),r.removeEventListener("message",Pt),r.removeEventListener("keydown",Ht,!0),r.removeEventListener("pointerover",Ae),r.removeEventListener("pointermove",Ae),r.removeEventListener("pointerout",Xt),r.removeEventListener("focus",$t),r.removeEventListener("blur",Ft);for(let t of W.values())clearTimeout(t.timer),t.reject(new a("HOST_UNAVAILABLE","Host client was disposed."));W.clear(),E.clear(),b.clear(),M.clear(),I.clear(),$.clear(),F.clear(),re.clear(),Te.clear(),Se.clear(),j.clear(),$e.length=0}}};var Io=["browser.open","browser.snapshot","browser.click","browser.type","browser.select","browser.scroll","browser.back","browser.forward","browser.inspect","browser.capture","browser.resize","browser.close"];var zr=new Set(Io);var sr=10*6e4;var ir=10*6e4;var ar=10*6e4;var yo=["none","agent","user"];var qr=new Set(yo);var cr=[["--oc-bg","background"],["--oc-elevated","elevated"],["--oc-fg","foreground"],["--oc-muted","muted"],["--oc-subtle","subtle"],["--oc-border","border"],["--oc-hover","hover"],["--oc-selection","selection"],["--oc-focus","focus"],["--oc-primary","primary"],["--oc-muted-surface","mutedSurface"],["--oc-elevated-fg","elevatedForeground"],["--oc-active","active"],["--oc-selection-fg","selectionForeground"],["--oc-primary-fg","primaryForeground"],["--oc-primary-text","primaryText"],["--oc-success-text","successText"],["--oc-warning-text","warningText"],["--oc-error-text","errorText"],["--oc-info-text","infoText"],["--oc-success","success"],["--oc-warning","warning"],["--oc-error","error"],["--oc-info","info"],["--oc-font","font"],["--oc-mono","mono"],["--oc-radius","radius"],["--surface-background","background"],["--surface-elevated","elevated"],["--surface-foreground","foreground"],["--surface-muted-foreground","muted"],["--surface-subtle","subtle"],["--interactive-border","border"],["--interactive-hover","hover"],["--interactive-selection","selection"],["--interactive-focus-ring","focus"],["--primary","primary"],["--surface-muted","mutedSurface"],["--surface-elevated-foreground","elevatedForeground"],["--interactive-active","active"],["--interactive-selection-foreground","selectionForeground"],["--primary-foreground","primaryForeground"],["--primary-text","primaryText"],["--success-text","successText"],["--warning-text","warningText"],["--error-text","errorText"],["--info-text","infoText"],["--status-success","success"],["--status-warning","warning"],["--status-error","error"],["--status-info","info"],["--font-sans","font"],["--font-mono","mono"],["--radius","radius"]],dr=[["--oc-syntax-keyword","--syntax-keyword","syntaxKeyword"],["--oc-syntax-string","--syntax-string","syntaxString"],["--oc-syntax-number","--syntax-number","syntaxNumber"],["--oc-syntax-function","--syntax-function","syntaxFunction"],["--oc-syntax-type","--syntax-type","syntaxType"],["--oc-syntax-comment","--syntax-comment","syntaxComment"],["--oc-syntax-variable","--syntax-variable","syntaxVariable"],["--oc-syntax-operator","--syntax-operator","syntaxOperator"]],Uo=(e,r)=>{r.style.colorScheme=e.mode;for(let[n,_]of cr)r.style.setProperty(n,e.tokens[_]);for(let[n,_,E]of dr){let b=e.tokens[E]??"";r.style.setProperty(n,b),r.style.setProperty(_,b)}r.style.setProperty("font-family",e.tokens.font),r.style.setProperty("font-size","0.875rem"),r.style.setProperty("line-height","1.45"),r.style.setProperty("color",e.tokens.foreground)},mt=(e,r)=>{Uo(e.theme,r),r.dataset&&(r.dataset.ocSurface=e.surface,r.dataset.ocTheme=e.theme.mode)};var lr={"surface-background":"bg","surface-elevated":"elevated","surface-elevated-foreground":"elevated-fg","surface-foreground":"fg","surface-muted-foreground":"muted","surface-muted":"muted-surface","surface-subtle":"subtle","interactive-border":"border","interactive-hover":"hover","interactive-active":"active","interactive-selection":"selection","interactive-selection-foreground":"selection-fg","interactive-focus-ring":"focus",primary:"primary","primary-foreground":"primary-fg","primary-text":"primary-text","success-text":"success-text","warning-text":"warning-text","error-text":"error-text","info-text":"info-text","status-success":"success","status-warning":"warning","status-error":"error","status-info":"info","font-sans":"font","font-mono":"mono",radius:"radius"},f=(e,r)=>`var(--${e}, var(--oc-${lr[e]}, ${r}))`,H=f("surface-background","transparent"),Le=f("surface-elevated","transparent"),Z=f("surface-elevated-foreground","inherit"),N=f("surface-foreground","inherit"),O=f("surface-muted-foreground","gray"),pr=f("surface-muted","transparent"),V=f("interactive-border","currentColor"),y=f("interactive-hover","transparent"),B=f("interactive-active","transparent"),Rt=f("interactive-selection","transparent"),xt=f("interactive-selection-foreground","inherit"),D=f("primary","currentColor"),bt=f("primary-text","inherit"),gt=f("error-text","inherit"),ur=f("font-sans","inherit"),kt=f("font-mono","monospace"),Mo=f("radius","9px"),It=`calc(${Mo} - 2px)`,Co=`calc(${Mo} - 4px)`,h=(e,r,n="transparent")=>`color-mix(in srgb, ${e} ${r}%, ${n})`,vo=`background-image: linear-gradient(${y}, ${y});`,yt=(e,r="0.5px")=>`box-shadow: inset 0 0 0 ${r} ${e}, var(--oc-sdk-field-lift);`,Ut="border-color: var(--oc-sdk-edge); box-shadow: var(--oc-sdk-raised-lift);",No="box-shadow: var(--oc-sdk-lit);",Ct=`inset 0 0.5px 0 0 ${h(N,8)}, 0 1px 2px 0 rgb(0 0 0 / 0.4)`,Er=`
:root {
  --oc-sdk-edge: ${h(N,16)};
  --oc-sdk-field-bg: ${Le};
  --oc-sdk-raised-bg: ${H};
  --oc-sdk-field-lift: inset 0 1px 2px 0 rgb(0 0 0 / 0.04);
  --oc-sdk-raised-lift: 0 1px 1.5px 0 rgb(0 0 0 / 0.08);
  --oc-sdk-lit: inset 0 1px 0 0 rgb(255 255 255 / 0.2), 0 1px 1.5px 0 rgb(0 0 0 / 0.1);
  --oc-sdk-float-edge: rgb(0 0 0 / 0.14);
  --oc-sdk-float: inset 0 1px 0 0 rgb(255 255 255 / 0.7), 0 1px 2px -0.5px rgb(0 0 0 / 0.06), 0 4px 8px -2px rgb(0 0 0 / 0.08), 0 12px 20px -4px rgb(0 0 0 / 0.06);
}
:root[data-oc-theme="dark"] {
  --oc-sdk-edge: ${h(N,14)};
  --oc-sdk-field-bg: ${h(H,50,Le)};
  --oc-sdk-raised-bg: ${Le};
  --oc-sdk-field-lift: ${Ct};
  --oc-sdk-raised-lift: ${Ct};
  --oc-sdk-lit: ${Ct};
  --oc-sdk-float-edge: rgb(0 0 0 / 0.55);
  --oc-sdk-float: inset 0 1px 0 0 rgb(255 255 255 / 0.04), inset 0 0 0 0.5px rgb(255 255 255 / 0.08), 0 8px 16px 0 rgb(0 0 0 / 0.25), 0 4px 8px 0 rgb(0 0 0 / 0.25);
}`,Me=e=>{let r=f(`status-${e}`,"currentColor");return`
.oc-sdk[data-tone="${e}"], .oc-sdk [data-tone="${e}"] { --oc-sdk-tone: ${r}; --oc-sdk-tone-text: ${f(`${e}-text`,"inherit")}; }`},_r=`
.oc-sdk { box-sizing: border-box; font-size: 0.875rem; line-height: 1.45; }
.oc-sdk *, .oc-sdk *::before, .oc-sdk *::after { box-sizing: border-box; }
/* :where() keeps the reset at zero specificity so every primitive class below overrides it. */
:where(.oc-sdk) :where(button, input, textarea), :where(button.oc-sdk, input.oc-sdk, textarea.oc-sdk) { font: inherit; color: inherit; margin: 0; }
:where(.oc-sdk) :where(button), :where(button.oc-sdk) { cursor: pointer; background: none; border: 0; padding: 0; }
.oc-sdk button:disabled, button.oc-sdk:disabled, .oc-sdk[aria-disabled="true"], .oc-sdk [aria-disabled="true"] { opacity: .5; pointer-events: none; }

.oc-sdk-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 32px; padding: 0 12px; border: 1px solid transparent; font-size: 0.875rem; font-weight: 500; line-height: 1; white-space: nowrap; }
.oc-sdk-btn[data-size="sm"] { gap: 6px; height: 28px; padding: 0 10px; font-size: 0.8125rem; }
.oc-sdk-btn[data-size="xs"] { gap: 4px; height: 24px; padding: 0 8px; font-size: 0.75rem; }
.oc-sdk-btn[data-loading="true"] { opacity: .5; pointer-events: none; }
.oc-sdk-btn > .oc-sdk-spinner-ring { width: 14px; height: 14px; }

.oc-sdk-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-field-label { font-size: 0.8125rem; font-weight: 500; }
.oc-sdk-field-note { font-size: 0.75rem; }
.oc-sdk-input { display: block; width: 100%; min-width: 0; height: 32px; padding: 0 10px; border: 0; font-size: 0.875rem; line-height: 1.45; appearance: none; }
textarea.oc-sdk-input { height: auto; padding: 8px 10px; resize: vertical; }

.oc-sdk-search { position: relative; min-width: 0; }
.oc-sdk-search .oc-sdk-input { padding-left: 34px; padding-right: 34px; }
.oc-sdk-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); pointer-events: none; }
.oc-sdk-search-clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); display: none; align-items: center; justify-content: center; width: 24px; height: 24px; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-clear { display: inline-flex; }

.oc-sdk-select { position: relative; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-trigger { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; width: auto; max-width: 100%; min-width: 0; height: 28px; padding: 0 10px; border: 1px solid transparent; font-size: 0.8125rem; text-align: left; }
.oc-sdk-trigger-value { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-trigger-chevron { flex: 0 0 auto; }
.oc-sdk-popup { position: fixed; z-index: 50; display: flex; flex-direction: column; gap: 2px; min-width: 160px; max-width: calc(100vw - 16px); max-height: min(320px, calc(100vh - 16px)); overflow: auto; padding: 4px; border: 1px solid transparent; }
.oc-sdk-popup-search { flex: 0 0 auto; padding: 2px 2px 4px; }
.oc-sdk-popup-search .oc-sdk-input { height: 28px; font-size: 0.8125rem; }
.oc-sdk-option { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; font-size: 0.8125rem; text-align: left; }
.oc-sdk-option-label { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-option-hint { flex: 0 0 auto; font-size: 0.75rem; }
.oc-sdk-option-check { flex: 0 0 auto; display: inline-flex; width: 14px; visibility: hidden; }
.oc-sdk-option[aria-selected="true"] > .oc-sdk-option-check { visibility: visible; }
.oc-sdk-popup-empty { padding: 8px; font-size: 0.8125rem; }

.oc-sdk-check { display: inline-flex; align-items: flex-start; gap: 8px; width: 100%; text-align: left; }
.oc-sdk-check-box { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; margin-top: 3px; border: 1px solid transparent; }
.oc-sdk-check-box > svg { display: none; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box > svg { display: block; }
.oc-sdk-check-thumb { flex: 0 0 auto; position: relative; width: 36px; height: 20px; }
.oc-sdk-check-thumb::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; }
.oc-sdk-check-text { display: flex; flex-direction: column; min-width: 0; }
.oc-sdk-check-label { font-size: 0.875rem; }
.oc-sdk-check-desc { font-size: 0.75rem; }

.oc-sdk-tabs { display: inline-flex; gap: 2px; padding: 2px; max-width: 100%; overflow: auto; }
.oc-sdk-tab { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border: 1px solid transparent; font-size: 0.8125rem; font-weight: 500; white-space: nowrap; }
.oc-sdk-tab-count { font-size: 0.75rem; font-variant-numeric: tabular-nums; }

.oc-sdk-badge { display: inline-flex; align-items: center; padding: 1px 6px; font-size: 11px; font-weight: 500; line-height: 16px; white-space: nowrap; }

.oc-sdk-list { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.oc-sdk-row { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; text-align: left; }
.oc-sdk-row-lead { flex: 0 0 auto; width: 64px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem; }
.oc-sdk-row-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
.oc-sdk-row-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-row-sub { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem; }
.oc-sdk-row-meta { flex: 0 0 auto; font-size: 0.75rem; font-variant-numeric: tabular-nums; }
.oc-sdk-list-empty { padding: 16px 8px; text-align: center; font-size: 0.8125rem; }

.oc-sdk-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 40px 16px; text-align: center; }
.oc-sdk-empty-title { margin: 0; font-size: 0.8125rem; font-weight: 600; }
.oc-sdk-empty-body { margin: 0; max-width: 32rem; font-size: 0.8125rem; }
.oc-sdk-empty-action { margin-top: 12px; }

@keyframes oc-sdk-spin { to { transform: rotate(360deg); } }
.oc-sdk-spinner { display: inline-flex; align-items: center; gap: 8px; font-size: 0.8125rem; }
.oc-sdk-spinner-ring { width: 16px; height: 16px; border: 2px solid transparent; animation: oc-sdk-spin .8s linear infinite; }
.oc-sdk-spinner[data-size="sm"] .oc-sdk-spinner-ring { width: 12px; height: 12px; }

.oc-sdk-banner { display: flex; align-items: flex-start; gap: 12px; padding: 8px 12px; border: 1px solid transparent; }
.oc-sdk-banner-text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.oc-sdk-banner-title { font-size: 0.8125rem; font-weight: 500; }
.oc-sdk-banner-body { font-size: 0.8125rem; }
.oc-sdk-banner-action { flex: 0 0 auto; }

.oc-sdk-separator { display: flex; align-items: center; gap: 8px; width: 100%; margin: 8px 0; font-size: 0.75rem; }
.oc-sdk-separator::before, .oc-sdk-separator::after { content: ""; flex: 1 1 auto; height: 1px; }
.oc-sdk-separator[data-labeled="false"]::after { display: none; }
.oc-sdk-popup > .oc-sdk-separator { margin: 4px 0; }

.oc-sdk-progress { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-progress-label { display: flex; justify-content: space-between; font-size: 0.75rem; font-variant-numeric: tabular-nums; }
.oc-sdk-progress-track { height: 6px; overflow: hidden; }
.oc-sdk-progress-fill { height: 100%; transform-origin: left; transition: transform 200ms ease-out; }
.oc-sdk-progress-value { display: inline-flex; align-items: center; gap: 2px; }
.oc-sdk-progress[data-done="true"] .oc-sdk-progress-value { font-weight: 600; }

.oc-sdk-menu { position: relative; display: inline-flex; }

.oc-sdk-text { white-space: pre-wrap; overflow-wrap: anywhere; }
.oc-sdk-text img { display: block; max-width: 100%; margin: 8px 0; }
`,Lo=`${Er}
.oc-sdk { color: ${N}; font-family: ${ur}; }
.oc-sdk :focus-visible, .oc-sdk:focus-visible { outline: none; }
.oc-sdk :where(button, a[href], [role="button"], [role="tab"], [role="option"]):focus-visible, button.oc-sdk:focus-visible { ${vo} }
.oc-sdk-mono { font-family: ${kt}; }
.oc-sdk-muted { color: ${O}; }
${Me("success")}${Me("warning")}${Me("error")}${Me("info")}
.oc-sdk[data-tone="primary"], .oc-sdk [data-tone="primary"] { --oc-sdk-tone: ${D}; --oc-sdk-tone-text: ${bt}; }

.oc-sdk-btn { border-radius: ${It}; transition: background 150ms ease-out, color 150ms ease-out; }
.oc-sdk-btn[data-size="xs"] { border-radius: ${Co}; }
.oc-sdk-btn[data-variant="default"] { color: ${bt}; background: ${h(D,10,H)}; border-color: ${h(D,12)}; ${No} }
.oc-sdk-btn[data-variant="default"]:hover { background: ${h(D,16,H)}; }
.oc-sdk-btn[data-variant="default"]:active { background: ${h(D,22,H)}; box-shadow: none; }
.oc-sdk-btn[data-variant="secondary"] { background: ${pr}; color: var(--oc-fg); }
.oc-sdk-btn[data-variant="secondary"]:hover { background-image: linear-gradient(${y}, ${y}); }
.oc-sdk-btn[data-variant="secondary"]:active { background-image: linear-gradient(${B}, ${B}); }
.oc-sdk-btn[data-variant="outline"] { background: var(--oc-sdk-raised-bg); color: ${Z}; ${Ut} }
.oc-sdk-btn[data-variant="outline"]:hover { background-image: linear-gradient(${y}, ${y}); }
.oc-sdk-btn[data-variant="outline"]:active { background-image: linear-gradient(${B}, ${B}); box-shadow: none; }
.oc-sdk-btn[data-variant="ghost"] { background: transparent; }
.oc-sdk-btn[data-variant="ghost"]:hover { background: ${y}; }
.oc-sdk-btn[data-variant="ghost"]:active { background: ${B}; }
.oc-sdk-btn[data-variant="destructive"] { --oc-sdk-tone: ${f("status-error","red")}; color: ${gt}; background: ${h("var(--oc-sdk-tone)",7,H)}; border-color: ${h("var(--oc-sdk-tone)",12)}; ${No} }
.oc-sdk-btn[data-variant="destructive"]:hover { background: ${h("var(--oc-sdk-tone)",9,H)}; }
.oc-sdk-btn[data-variant="destructive"]:active { background: ${h("var(--oc-sdk-tone)",11,H)}; box-shadow: none; }

.oc-sdk-field-note { color: ${O}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-field-note { color: ${gt}; }
.oc-sdk-input { border-radius: ${It}; background: var(--oc-sdk-field-bg); color: ${Z}; ${yt("var(--oc-sdk-edge)")} transition: background 150ms ease-out; }
.oc-sdk-input::placeholder { color: ${O}; }
.oc-sdk-input:hover:not(:focus) { background-image: linear-gradient(${y}, ${y}); }
.oc-sdk-input:focus, .oc-sdk-input:focus-visible { ${yt(h(N,26),"1px")} }
.oc-sdk-field[data-invalid="true"] .oc-sdk-input, .oc-sdk-field[data-invalid="true"] .oc-sdk-input:focus { ${yt(f("status-error","red"),"1px")} }
.oc-sdk-input[data-mono="true"] { font-family: ${kt}; }

.oc-sdk-search-icon { color: ${O}; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-icon { color: ${D}; }
.oc-sdk-search-clear { border-radius: ${Co}; color: ${O}; }
.oc-sdk-search-clear:hover { background: ${y}; color: ${N}; }

.oc-sdk-trigger { border-radius: ${It}; background: var(--oc-sdk-raised-bg); color: ${Z}; ${Ut} transition: background 150ms ease-out; }
.oc-sdk-trigger:hover { background-image: linear-gradient(${y}, ${y}); }
.oc-sdk-trigger[aria-expanded="true"] { background-image: linear-gradient(${B}, ${B}); }
.oc-sdk-trigger-value[data-empty="true"] { color: ${O}; }
.oc-sdk-trigger-chevron { color: ${O}; }
/* The app's floating level: the glass edge (a hairline ring and a lit top line, dark outside and light inside in dark themes) over soft shadows. The outer ring is the border, over the page like the app's. */
.oc-sdk-popup { --surface-foreground: ${Z}; border-color: var(--oc-sdk-float-edge); border-radius: 12px; background: ${Le}; background-clip: padding-box; color: ${Z}; box-shadow: var(--oc-sdk-float); }
.oc-sdk-option { border-radius: 8px; }
.oc-sdk-option[data-active="true"] { background: ${y}; }
/* A selected option shows a check mark in the text colour, like the app's own pickers. Options without the mark come
   from bundles built before it existed and keep the selection fill as their only sign of the choice. */
.oc-sdk-option[aria-selected="true"]:not([data-mark]) { background: ${Rt}; color: ${xt}; }
.oc-sdk-option-check { color: ${N}; }
.oc-sdk-option[data-destructive="true"] { color: ${gt}; }
.oc-sdk-option[data-destructive="true"][data-active="true"] { background: ${h(f("status-error","red"),10)}; }
.oc-sdk-option-hint { color: ${O}; }
.oc-sdk-popup-empty { color: ${O}; }

/* Checked stays neutral: the mark carries the state, and the primary colour stays with primary actions. */
.oc-sdk-check-box { border-color: ${V}; border-radius: 4px; color: ${N}; transition: border-color 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box { border-color: ${h(N,60,V)}; }
.oc-sdk-check-thumb { border-radius: 9999px; background: ${V}; transition: background 150ms ease-out; }
.oc-sdk-check-thumb::after { border-radius: 9999px; background: ${H}; transition: transform 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb { background: ${D}; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb::after { transform: translateX(16px); }
.oc-sdk-check:focus-visible { box-shadow: none; }
.oc-sdk-check:focus-visible .oc-sdk-check-box, .oc-sdk-check:focus-visible .oc-sdk-check-thumb { ${vo} }
.oc-sdk-check-desc { color: ${O}; }

.oc-sdk-tabs { border-radius: 10px; }
.oc-sdk-tabs[data-track="true"] { background: ${h(N,4)}; box-shadow: inset 0 1px 2px 0 rgb(0 0 0 / 0.16); }
.oc-sdk-tab { border-radius: 8px; color: ${O}; transition: color 150ms ease-out, background 150ms ease-out; }
.oc-sdk-tab:hover { color: ${N}; }
.oc-sdk-tab[aria-selected="true"] { color: ${xt}; background: ${Rt}; border-color: ${V}; }
.oc-sdk-tabs[data-track="true"] .oc-sdk-tab[aria-selected="true"] { color: ${Z}; background: var(--oc-sdk-raised-bg); ${Ut} }
.oc-sdk-tab-count { color: ${O}; }

/* The app's neutral badge: a step of the text colour, the same in every theme. */
.oc-sdk-badge { border-radius: 9999px; background: ${h(N,6)}; color: ${O}; }
.oc-sdk-badge[data-tone] { color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); background: ${h("var(--oc-sdk-tone)",15)}; }

.oc-sdk-row { border-radius: 6px; transition: background 120ms ease-out; }
.oc-sdk-row:hover, .oc-sdk-row[data-active="true"] { background: ${y}; }
.oc-sdk-row[aria-selected="true"] { background: ${Rt}; color: ${xt}; }
.oc-sdk-row-lead { font-family: ${kt}; color: ${O}; }
.oc-sdk-row-sub { color: ${O}; }
.oc-sdk-row-meta { color: ${O}; }
.oc-sdk-row[aria-selected="true"] .oc-sdk-row-lead, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-sub, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-meta { color: inherit; opacity: .75; }
.oc-sdk-list-empty { color: ${O}; }

.oc-sdk-empty-body { color: ${O}; }

.oc-sdk-spinner { color: ${O}; }
.oc-sdk-spinner-ring { border-color: ${V}; border-top-color: ${D}; border-radius: 9999px; }

/* Set apart by its tint alone, like the app's banners. */
.oc-sdk-banner { border-color: transparent; border-radius: 8px; background: ${h("var(--oc-sdk-tone)",10)}; }
.oc-sdk-banner-title { color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); }
.oc-sdk-banner-body { color: ${O}; }

.oc-sdk-separator { color: ${O}; }
.oc-sdk-separator::before, .oc-sdk-separator::after { background: ${h(V,40)}; }

.oc-sdk-progress-label { color: ${O}; }
/* The app's progress: a groove a step of the text colour, green once done. Older bundles mark done only through aria-valuenow. */
.oc-sdk-progress-track { border-radius: 9999px; background: ${h(N,6)}; }
.oc-sdk-progress-fill { border-radius: 9999px; background: var(--oc-sdk-tone, ${D}); }
.oc-sdk-progress-track[aria-valuenow="100"] > .oc-sdk-progress-fill:not([data-tone]) { background: ${f("status-success","currentColor")}; }
.oc-sdk-progress[data-done="true"] .oc-sdk-progress-value { color: ${f("success-text","inherit")}; }

.oc-sdk-text a { color: ${bt}; text-decoration: underline; text-underline-offset: 2px; }
.oc-sdk-text img { border-radius: 8px; border: 1px solid ${h(V,60)}; }
`,k=`
${We}
${_r}
${Lo}`;var K=(e,r,n)=>{let _=document.createElement(e);return r&&(_.className=r),n!==void 0&&(_.textContent=n),_};async function wo(e,r){let n=await e.serviceRequest({method:"GET",path:"/state",query:{directory:r??""}}),_=n.body?JSON.parse(n.body):{};if(n.status>=400)throw new Error(_.error||`HTTP ${n.status}`);return _}function Po(e){if(e instanceof a){if(e.code==="NO_SERVICE")return"Allow the WeshCraft service in Settings \u2192 Extensions to see this project\u2019s specs.";if(e.code==="DISABLED")return"WeshCraft is paused in Settings \u2192 Extensions.";if(e.code==="SERVICE_FAILED")return"The WeshCraft service did not start. Reload it in Settings \u2192 Extensions."}return e?.message||String(e)}function Go(e,r){return e?.url?r?`${e.url}${e.url.includes("?")?"&":"?"}open=${encodeURIComponent(r)}`:e.url:null}function Do(e){if(!e)return{label:"Connecting",tone:"neutral"};if(e.status==="none")return{label:"Not set up",tone:"neutral"};if(e.status==="error")return{label:"Error",tone:"error"};if(e.running)return{label:"Generating",tone:"info"};let r=e.report;return r?r.ok?{label:`In sync \xB7 ${r.score}%`,tone:"success"}:{label:`Out of sync \xB7 ${r.errors}`,tone:"error"}:{label:"Waiting",tone:"neutral"}}function Ho(e){if(!e)return"";let r=[];return e.screens?.length&&r.push(He(e.screens.length,"screen")),e.tools&&r.push(He(e.tools,"MCP tool")),e.endpoints&&r.push(He(e.endpoints,"endpoint")),r.push(He(e.operations??0,"operation")),r.join(" \xB7 ")}var He=(e,r)=>`${e} ${r}${e===1?"":"s"}`;function Xo(e,{visible:r=2e3,hidden:n=1e4}={}){let _=!1,E=null,b=!1,M=async()=>{if(!_){if(!b){b=!0;try{await e()}finally{b=!1}}E=setTimeout(M,document.hidden?n:r)}},I=()=>{clearTimeout(E),M()};return document.addEventListener("visibilitychange",()=>{document.hidden||I()}),M(),{stop:()=>{_=!0,clearTimeout(E)},now:I}}var ue=At(),hr=document.querySelector("#root"),Xe=null,w=null,Ee=null,$o=!1,Fo=null,_e=K("button","st-row");_e.type="button";var Vo=K("span","st-dot"),Bo=K("span","st-label"),te=K("span","st-meta"),Ko=K("span","st-go","Open");_e.append(Vo,Bo,te,Ko);var oe=K("div","st-sub");_e.addEventListener("click",()=>{let e=Go(w);e&&ue.openUrl(e).catch(()=>{})});function Nt(){let e=Do(w);Vo.dataset.tone=e.tone,Bo.textContent=Ee?"WeshCraft":e.label;let r=w?.status==="ok";if(_e.disabled=!r,Ko.hidden=!r,Ee)te.textContent="",oe.textContent=Ee;else if(!w)te.textContent="",oe.textContent="Looking for a design\u2026";else if(w.status==="none")te.textContent="",oe.textContent="No design in this project.";else if(w.status==="error")te.textContent="",oe.textContent=w.error;else{let n=w.summary;te.textContent=n?`${n.links} links${n.gaps?` \xB7 ${n.gaps} gap${n.gaps===1?"":"s"}`:""}`:"",oe.textContent=Ho(n)||w.source}}async function Ar(){try{w=await wo(ue,Xe),Ee=null}catch(e){Ee=Po(e)}Nt()}ue.onReady(e=>{mt(e,document.documentElement),!$o&&($o=!0,Xe=e.directory,hr.append(_e,oe),Nt(),ue.setHeight(56).catch(()=>{}),Fo=Xo(Ar,{visible:3e3,hidden:15e3}),ue.onDirectory(r=>{r!==Xe&&(Xe=r,w=null,Nt(),Fo.now())}))});})();
