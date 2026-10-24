importScripts('lib.js','finder-sites.js');
const openPage=async p=>{const url=chrome.runtime.getURL(p),t=await chrome.tabs.query({url});if(t[0]){await chrome.tabs.update(t[0].id,{active:true});await chrome.windows.update(t[0].windowId,{focused:true})}else chrome.tabs.create({url})};
chrome.action.onClicked.addListener(()=>openPage('workspace.html'));
chrome.runtime.onInstalled.addListener(()=>chrome.contextMenus.removeAll(()=>chrome.contextMenus.create({id:'send',title:'Send video to active script line',contexts:['video','link']})));
chrome.contextMenus.onClicked.addListener((i,tab)=>{const u=i.srcUrl||i.linkUrl;if(u)enqueue({urls:[u],pageUrl:tab?.url||'',tabId:tab?.id}).catch(()=>{})});

/* Real-browser page loader: sites that block plain fetch (Cloudflare / JS-rendered) are opened in a background tab and the rendered DOM is read. */
let TAB=null,tabQ=Promise.resolve(),tabTimer=null;
function inTab(url,fn,args,o){const run=()=>inTab1(url,fn,args,o),p=tabQ.then(run,run);tabQ=p.catch(()=>{});return p}
async function getTab(url){clearTimeout(tabTimer);if(TAB!=null){try{await chrome.tabs.get(TAB);await chrome.tabs.update(TAB,{url,active:false});return TAB}catch(e){TAB=null}}const t=await chrome.tabs.create({url,active:false});TAB=t.id;return TAB}
async function inTab1(url,fn,args,{wait=1500}={}){const id=await getTab(url);let raised=false;
  try{await new Promise(r=>setTimeout(r,600));
   await new Promise((res,rej)=>{const t0=Date.now(),iv=setInterval(async()=>{try{const t=await chrome.tabs.get(id);if(t.status==='complete'){clearInterval(iv);res()}else if(Date.now()-t0>30000){clearInterval(iv);rej(new Error('Page load timed out'))}}catch(e){clearInterval(iv);rej(e)}},300)});
   for(let i=0;i<24;i++){await new Promise(r=>setTimeout(r,i?1500:wait));
    const[r]=await chrome.scripting.executeScript({target:{tabId:id},func:fn,args:args||[]});const v=r&&r.result;
    if(v&&v.blocked){if(!raised){raised=true;await chrome.tabs.update(id,{active:true}).catch(()=>{})}continue}return v}
   throw new Error('Site shows a human check. Solve it in the opened tab, then retry.')}
  finally{clearTimeout(tabTimer);tabTimer=setTimeout(()=>{if(TAB!=null)chrome.tabs.remove(TAB).catch(()=>{});TAB=null},raised?60000:12000)}}
FINDER.getHtml=async url=>{const v=await inTab(url,async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));
  if(/just a moment|attention required|verify you are human|access denied/i.test(document.title))return{blocked:1};
  for(let i=0;i<4;i++){scrollBy(0,innerHeight*1.5);await w(500)}scrollTo(0,0);await w(300);
  const extra=[...document.querySelectorAll('video,source,[data-src],[data-video],[data-video-src],[data-preview],[data-mp4]')].flatMap(e=>[e.currentSrc,e.src,...[...e.attributes].map(a=>a.value)]).filter(x=>x&&/\.(mp4|webm)/i.test(x)).join('\n');
  return{html:document.documentElement.outerHTML+'\n'+extra}});return v.html};
async function resolveDetail(page){return inTab(page,()=>{if(/just a moment|attention required/i.test(document.title))return{blocked:1};
  const abs=u=>{try{return new URL(u,location.href).href}catch(e){return''}},out=[];
  document.querySelectorAll('a[href]').forEach(a=>{const h=abs(a.href),t=(a.textContent||'').toLowerCase();if(/\.(mp4|mov|webm)(\?|$)/i.test(h)||/download/i.test(h)||a.hasAttribute('download')||/free download|download/.test(t))out.push({u:h,s:/\.(mp4|mov|webm)/i.test(h)?3:/free/.test(t)?2:1})});
  document.querySelectorAll('script[type="application/ld+json"]').forEach(s=>{try{const w=o=>{if(Array.isArray(o))o.forEach(w);else if(o&&typeof o==='object'){if(typeof o.contentUrl==='string')out.push({u:o.contentUrl,s:3});Object.values(o).forEach(x=>x&&typeof x==='object'&&w(x))}};w(JSON.parse(s.textContent))}catch(e){}});
  document.querySelectorAll('video,source').forEach(v=>{[v.currentSrc,v.src].forEach(u=>{if(u&&/^https?:/.test(u))out.push({u,s:2})})});
  document.querySelectorAll('meta[property^="og:video"],meta[name="twitter:player:stream"]').forEach(m=>out.push({u:m.content,s:2}));(document.documentElement.outerHTML.match(/https?:[^"'\s<>\\]+?\.(?:mp4|webm)[^"'\s<>\\]*/g)||[]).forEach(u=>out.push({u,s:2}));
  return{urls:[...new Set(out.sort((a,b)=>b.s-a.s).map(x=>x.u).filter(u=>/^https?:/.test(u)))]}},[],{wait:2500}).then(r=>r.urls)}


async function diag(site,q,tabs){const L=[],e=FINDER.ENG[site];const A=FINDER.alts(q),a=A[0]||'';L.push('Site: '+site+'\nKeyword: '+q+'\nCleaned alternatives: '+JSON.stringify(A));
  if(!a){L.push('→ empty keyword');return L.join('\n')}
  let html='',used='';
  for(const url of FINDER.__urls(site,a)){L.push('\nRoute: '+url);
    try{const r=await fetch(url,{credentials:'include',redirect:'follow'});L.push('  HTTP '+r.status+' · final '+r.url+' · '+(r.headers.get('content-type')||''));let h=await r.text();
      if((r.status===403||r.status===429||r.status===503)&&tabs){L.push('  blocked → trying tab…');try{h=await FINDER.getHtml(url);L.push('  tab HTML '+h.length+' chars')}catch(x){L.push('  tab failed: '+x.message);continue}}
      else if(!r.ok){continue}
      html=h;used=url;let n=0;try{n=e.parse(h,10).length}catch(x){}L.push('  parsed items: '+n);if(n)break}catch(x){L.push('  fetch error: '+x.message)}}
  L.push('\nUsing: '+(used||'(no route returned items)'));
  const t=/<title[^>]*>([^<]*)/i.exec(html);L.push('Page title: '+(t?t[1].trim().slice(0,100):'(none)'));
  L.push('mp4/webm URLs in HTML: '+((html.match(/https?:[^"'\s<>)]+?\.(?:mp4|webm)/g)||[]).length)+' · sample: '+((html.match(/https?:[^"'\s<>)]+?\.(?:mp4|webm)/g)||[]).slice(0,3).join(' , ')||'-'));
  let items=[];try{items=e.parse(html,10)}catch(x){L.push('Parse error: '+x.message)}L.push('Parsed items: '+items.length);
  for(const it of items.slice(0,2)){L.push('\nItem '+it.id+'\n  page: '+it.page+'\n  preview: '+(it.pv||[]).slice(0,2).join(' , '));
    for(const u of (it.dl||[]).slice(0,4)){try{let r=await fetch(u,{method:'HEAD',credentials:'include'});if(r.status===405||r.status===403){r=await fetch(u,{headers:{Range:'bytes=0-1'},credentials:'include'})}L.push('  DL '+u+'\n     → HTTP '+r.status+' · '+(r.headers.get('content-type')||'')+' · '+(r.headers.get('content-length')||r.headers.get('content-range')||'?')+' bytes')}catch(x){L.push('  DL '+u+'\n     → error '+x.message)}}
    if(!(it.dl||[]).length)L.push('  (no direct download URL: resolved from page when you tick the card)')}
  return L.join('\n')}

let queue=Promise.resolve(),lastDl=0;
const enqueue=job=>{const r=queue.then(()=>grab(job));queue=r.catch(()=>{});return r};
function setDl(o,force){const n=Date.now();if(!force&&n-lastDl<250)return;lastDl=n;chrome.storage.local.set({dl:{...o,t:n}})}
const rank=u=>{u=u.toLowerCase();let s=0;if(/1080|fullhd|full_hd/.test(u))s+=4;else if(/2160|uhd|4k/.test(u))s+=2;else if(/\bhd\b|[_\-/]hd[_\-./]|720/.test(u))s+=2;if(/preview|thumb|small|mini|tiny|360|240/.test(u))s-=2;return s};

async function fetchVideo(url,pageUrl,onProg){
  try{await chrome.declarativeNetRequest.updateSessionRules({removeRuleIds:[1],addRules:[{id:1,priority:1,action:{type:'modifyHeaders',requestHeaders:[{header:'Referer',operation:'set',value:pageUrl||url}]},condition:{initiatorDomains:[chrome.runtime.id],resourceTypes:['xmlhttprequest']}}]})}catch(e){}
  const ka=setInterval(()=>chrome.runtime.getPlatformInfo(),20000);
  try{
    if(/\.m3u8(\?|$)/i.test(url))throw new Error('Streaming (HLS) video: no direct file');
    const bad=ct=>{if(/text\/|json|mpegurl/.test(ct))throw new Error('Not a direct video file ('+ct.split(';')[0]+')')},mime=ct=>ct.startsWith('video/')?ct.split(';')[0]:'video/mp4';
    // probe: does the server support byte ranges? then download in parallel pieces (much faster than one stream)
    let total=0,ranged=false,pct='';
    try{const pr=await fetch(url,{headers:{Range:'bytes=0-0'},credentials:'include',redirect:'follow'});pct=(pr.headers.get('content-type')||'').toLowerCase();const cr=pr.headers.get('content-range');
      if(pr.status===206&&cr){total=+cr.split('/')[1]||0;ranged=total>0}else if(pr.status>=400)throw new Error('HTTP '+pr.status);try{pr.body&&pr.body.cancel()}catch(e){}}catch(e){if(/HTTP/.test(e.message))throw e}
    if(pct)bad(pct);
    if(ranged&&total>3e6){
      const CH=2*1024*1024,N=Math.ceil(total/CH),parts=new Array(N),W=Math.min(8,N);let next=0,got=0;
      const one=async i=>{const a=i*CH,b=Math.min(total-1,a+CH-1);for(let t=0;t<4;t++){try{const r=await fetch(url,{headers:{Range:`bytes=${a}-${b}`},credentials:'include',redirect:'follow'});if(r.status!==206&&!(r.status===200&&N===1))throw new Error('HTTP '+r.status);const buf=await r.arrayBuffer();if(buf.byteLength!==b-a+1)throw new Error('short read');parts[i]=buf;got+=buf.byteLength;onProg(got,total);return}catch(e){if(t===3)throw e;await new Promise(r=>setTimeout(r,500*(t+1)))}}};
      await Promise.all(Array.from({length:W},async()=>{for(;;){const i=next++;if(i>=N)return;await one(i)}}));
      return new Blob(parts,{type:mime(pct)});
    }
    const r=await fetch(url,{credentials:'include',redirect:'follow'});if(!r.ok)throw new Error('HTTP '+r.status);
    const ct=(r.headers.get('content-type')||'').toLowerCase();bad(ct);
    const len=+r.headers.get('content-length')||0,rd=r.body.getReader(),ch=[];let got=0;
    for(;;){const{done,value}=await rd.read();if(done)break;ch.push(value);got+=value.length;onProg(got,len)}
    if(got<20000)throw new Error('File too small ('+got+' bytes)');
    return new Blob(ch,{type:mime(ct)});
  }finally{clearInterval(ka);try{await chrome.declarativeNetRequest.updateSessionRules({removeRuleIds:[1]})}catch(e){}}
}

async function grab({urls,pageUrl,dur,w,h,n,tabId,append:fa,noAdvance,key,fq}){
  const p0=await SV.proj();if(!p0)throw new Error('No script yet. Open the workspace and upload your script.');
  const num=n??p0.activeN,line=p0.lines.find(l=>l.n===num);if(!line)throw new Error('No active script line.');
  const T0=Date.now(),{addMore}=await chrome.storage.local.get('addMore'),append=!!((fa!=null?fa:addMore)&&line.mediaId);setDl({n:num,k:key,st:'run',pct:0,t0:T0,got:0,len:0},true);
  const list=[...new Set((urls||[]).filter(u=>/^https?:/i.test(u)))].sort((a,b)=>rank(b)-rank(a));
  if(!list.length){setDl({n:num,k:key,st:'err',msg:'No downloadable video URL'},true);throw new Error('No downloadable video URL found on this element.')}
  let blob=null,used='',errs=[];
  for(const u of list){for(let a=0;a<3&&!blob;a++){try{blob=await fetchVideo(u,pageUrl,(got,len)=>setDl({n:num,k:key,st:'run',pct:len?got/len:Math.min(.95,got/(got+8e6)),got,len,t0:T0}));used=u}catch(e){errs.push(e.message);if(/HTTP 4|Not a direct|HLS|too small/.test(e.message))break;await new Promise(r=>setTimeout(r,800*(a+1)))}}if(blob)break}
  if(!blob){setDl({n:num,k:key,st:'err',msg:errs[0]},true);throw new Error(errs[0])}
  const id=SV.uid(),ext=(blob.type.split('/')[1]||'mp4').replace('quicktime','mov'),name='line-'+String(num).padStart(3,'0')+(append?'-'+((line.extra||[]).length+2):'')+'.'+ext;
  await SV.put('media',{id,blob,name,type:blob.type,size:blob.size});
  let old=null,next=num,done=false;
  await SV.mutate(p=>{const l=p.lines.find(x=>x.n===num);
    if(append){(l.extra=l.extra||[]).push({id,name,size:blob.size,dur:dur>0&&isFinite(dur)?dur:null,w:w||null,h:h||null,inT:0,outT:null,thumb:null,srcUrl:used,srcPage:pageUrl,fq:fq||null});next=num}
    else{old=l.mediaId;Object.assign(l,{mediaId:id,name,size:blob.size,dur:dur>0&&isFinite(dur)?dur:null,w:w||null,h:h||null,inT:0,outT:null,thumb:null,srcUrl:used,srcPage:pageUrl,fq:fq||null});
     const nx=p.lines.find(x=>x.n>num&&!x.mediaId)||p.lines.find(x=>!x.mediaId);if(nx)next=nx.n;else done=true;if(!noAdvance)p.activeN=next}
    p.updated=Date.now();return p});
  if(old)await SV.del('media',old).catch(()=>{});
  setDl({n:num,k:key,st:'ok',size:blob.size,ms:Date.now()-T0,t0:T0,extra:append},true);
  return{ok:true,mediaId:id,n:num,next,done,size:blob.size,ms:Date.now()-T0,extra:append};
}

let lastTick=0;
chrome.runtime.onMessage.addListener((m,s,send)=>{
  if(m.t==='GRAB'){enqueue({...m,tabId:s.tab?.id}).then(send,e=>send({ok:false,error:e.message}));return true}
  if(m.t==='FIND'){FINDER.search(m.site,m.q,m.limit||10,{tabs:!!m.tabs,page:m.page||1}).then(items=>send({ok:true,items}),e=>send({ok:false,error:e.message}));return true}
  if(m.t==='DIAG'){diag(m.site,m.q,!!m.tabs).then(t=>send({ok:true,text:t}),e=>send({ok:true,text:'Diagnose error: '+e.message}));return true}
  if(m.t==='RESOLVE'){resolveDetail(m.page).then(urls=>send({ok:true,urls}),e=>send({ok:false,error:e.message}));return true}
  if(m.t==='DROP'){let r=false;SV.mutate(p=>{if(!p)return null;r=SV.dropMedia(p,m.n,m.id);p.updated=Date.now();return p}).then(async()=>{if(r)await SV.del('media',m.id).catch(()=>{});send({ok:r})});return true}
  if(m.t==='OPEN'){openPage(m.page||'workspace.html');send({ok:1});return}
  if(m.t==='TICK'){const n=Date.now();if(n-lastTick>=8000){const d=Math.min(15000,lastTick?n-lastTick:10000);lastTick=n;SV.mutate(p=>{if(!p)return null;p.workMs=(p.workMs||0)+d;return p}).then(()=>send({ok:1}))}else send({ok:1});return true}
});
