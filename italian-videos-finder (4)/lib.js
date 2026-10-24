(function(g){
const DB='svx';let _db;
function db(){return _db||(_db=new Promise((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('media',{keyPath:'id'});d.createObjectStore('projects',{keyPath:'id'})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}))}
const tx=async(st,mode,fn)=>{const d=await db();return new Promise((res,rej)=>{const t=d.transaction(st,mode),rq=fn(t.objectStore(st));t.oncomplete=()=>res(rq&&rq.result);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error)})};
function parseScript(raw){
  const rx=/^\s*(?:script\s*|line\s*|#)?(\d{1,4})\s*[:.)\]\-–]\s*(.*)$/i,lines=String(raw).replace(/\r/g,'').split('\n'),numbered=lines.some(l=>rx.test(l)),out=[];let cur=null,seq=0;
  for(const l of lines){const t=l.trim();if(!t)continue;
    if(numbered){const m=rx.exec(l);if(m){cur={n:+m[1],text:m[2].trim()};out.push(cur)}else if(cur)cur.text+=' '+t}
    else out.push({n:++seq,text:t})}
  const ok=out.every((x,i)=>i===0||x.n>out[i-1].n);if(!ok)out.forEach((x,i)=>x.n=i+1);
  return out.map(x=>{let text=x.text,kw='';const k=text.split('|');if(k.length>1){text=k[0].trim();kw=k.slice(1).join(' ').trim()}
    if(!kw)kw=text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').split(/\s+/).filter(Boolean).slice(0,6).join(' ');
    return{n:x.n,text,kw}}).filter(x=>x.text)}
const SV={put:(s,v)=>tx(s,'readwrite',o=>o.put(v)),get:(s,k)=>tx(s,'readonly',o=>o.get(k)),all:s=>tx(s,'readonly',o=>o.getAll()),del:(s,k)=>tx(s,'readwrite',o=>o.delete(k)),
  async proj(){return (await chrome.storage.local.get('proj')).proj||null},
  mutate(fn){return navigator.locks.request('svproj',async()=>{const p=await SV.proj();const r=await fn(p);if(r)await chrome.storage.local.set({proj:r});return r})},
  dropMedia(p,n,id){const l=p.lines.find(x=>x.n===n);if(!l)return false;if((l.extra||[]).some(e=>e.id===id)){l.extra=l.extra.filter(e=>e.id!==id);return true}
    if(l.mediaId!==id)return false;const x=(l.extra||[]).shift();if(x)Object.assign(l,{mediaId:x.id,name:x.name,size:x.size,dur:x.dur,w:x.w,h:x.h,thumb:x.thumb,inT:x.inT||0,outT:x.outT||null,srcUrl:x.srcUrl||null,srcPage:x.srcPage||null,fq:x.fq||null,hash:x.hash||null});
    else Object.assign(l,{mediaId:null,name:null,dur:null,w:null,h:null,thumb:null,inT:0,outT:null,srcUrl:null,srcPage:null,size:null,fq:null,hash:null});return true},
  reorder(p,n,ids){const l=p.lines.find(x=>x.n===n);if(!l||!l.mediaId)return false;
    const main={id:l.mediaId,name:l.name,size:l.size,dur:l.dur,w:l.w,h:l.h,thumb:l.thumb,inT:l.inT||0,outT:l.outT||null,srcUrl:l.srcUrl||null,srcPage:l.srcPage||null,fq:l.fq||null,hash:l.hash||null},all=[main,...(l.extra||[])],by=new Map(all.map(c=>[c.id,c])),ord=ids.filter(i=>by.has(i)).map(i=>by.get(i));
    all.forEach(c=>{if(!ord.includes(c))ord.push(c)});const f=ord.shift();
    Object.assign(l,{mediaId:f.id,name:f.name,size:f.size,dur:f.dur,w:f.w,h:f.h,thumb:f.thumb,inT:f.inT||0,outT:f.outT||null,srcUrl:f.srcUrl||null,srcPage:f.srcPage||null,fq:f.fq||null,hash:f.hash||null});l.extra=ord;p.updated=Date.now();return true},
  fp:t=>{const s=String(t||'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return (h>>>0).toString(36)+s.length},
  uid:()=>Math.random().toString(36).slice(2,10),parseScript,
  fmt:s=>{s=Math.max(0,Math.round(s||0));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return(h?h+':'+String(m).padStart(2,'0'):m)+':'+String(x).padStart(2,'0')},
  SITES:[['Pexels','https://www.pexels.com/search/videos/{q}/'],['Pixabay','https://pixabay.com/videos/search/{q}/'],['Mixkit','https://mixkit.co/free-stock-video/{q}/'],['Coverr','https://coverr.co/s?q={q}'],['Videezy','https://www.videezy.com/free-video/{q}'],['Vecteezy','https://www.vecteezy.com/free-videos/{q}']],
  searchUrl:(tpl,q)=>tpl.replace('{q}',encodeURIComponent(q).replace(/%20/g,tpl.includes('?q=')?'+':'-'))};
g.SV=SV})(self);
