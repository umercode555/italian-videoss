(()=>{const LS='__cs';const read=()=>{try{return JSON.parse(localStorage.getItem(LS)||'{}')}catch(e){return{}}};
const L=[],CH=[];const stub=()=>new Proxy(function(){},{get:(t,k)=>k==='then'?undefined:(k==='addListener'?()=>{}:stub()),apply:()=>Promise.resolve({})});
const c=new Proxy({},{get(t,k){return k in t?t[k]:(t[k]=stub())}});
c.storage={local:{async get(k){const s=read();if(k==null)return s;const o={};(Array.isArray(k)?k:typeof k==='object'?Object.keys(k):[k]).forEach(x=>{if(x in s)o[x]=s[x]});return o},
 async set(o){const s=read(),ch={};for(const k in o){ch[k]={oldValue:s[k],newValue:o[k]};s[k]=o[k]}localStorage.setItem(LS,JSON.stringify(s));CH.forEach(f=>f(ch,'local'))},async remove(k){const s=read();[].concat(k).forEach(x=>delete s[x]);localStorage.setItem(LS,JSON.stringify(s))}},onChanged:{addListener:f=>CH.push(f)}};
c.runtime={id:'testid',getURL:p=>'/'+p,onMessage:{addListener:f=>L.push(f)},getPlatformInfo:async()=>({os:'mac'}),
 sendMessage(m){return new Promise(res=>{let async_=false;for(const f of L){const r=f(m,{tab:{id:1}},res);if(r===true)async_=true}if(!async_)res(undefined)})}};
c.runtime=new Proxy(c.runtime,{get:(t,k)=>k in t?t[k]:stub()});c.storage=new Proxy(c.storage,{get:(t,k)=>k in t?t[k]:stub()});window.__tabs=0;c.tabs={create:async()=>{window.__tabs++;return{id:1}},get:async()=>({status:'complete'}),update:async()=>({}),remove:async()=>{}};window.chrome=c;window.importScripts=()=>{};
const orig=Window.prototype.postMessage;window.__log=[];Window.prototype.postMessage=function(m,...a){try{if(m&&m.t==='init'||m&&m.t==='ws')window.__log.push({t:m.t,lines:m.ws.lines.map(l=>({n:l.n,clips:l.clips})),blobs:Object.keys(m.blobs)})}catch(e){}return orig.call(this,m,...a)}})();
if(/finder\.html$/.test(location.pathname))document.addEventListener('DOMContentLoaded',()=>{['finder-sites.js','background.js'].forEach(s=>{const e=document.createElement('script');e.src='/'+s;e.async=false;document.head.appendChild(e)})});
window.__rx=[];addEventListener('message',e=>{try{window.__rx.push(e.data&&e.data.t)}catch(x){}});
addEventListener('message',e=>{const m=e.data;try{if(m&&(m.t==='init'||m.t==='ws'))window.__log.push({t:m.t,lines:m.ws.lines.map(l=>({n:l.n,clips:l.clips})),blobs:Object.keys(m.blobs)})}catch(x){window.__log.push({t:'err',e:String(x)})}});
