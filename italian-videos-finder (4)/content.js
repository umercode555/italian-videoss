(()=>{
if(window.__svx)return;window.__svx=1;
const CSS=`:host{all:initial}*{box-sizing:border-box;font-family:system-ui,Segoe UI,Roboto,sans-serif}
.dl{position:fixed;z-index:2147483647;display:none;align-items:center;gap:6px;background:linear-gradient(90deg,#00c4cc,#7d2ae8);color:#fff;border:0;border-radius:999px;padding:7px 13px;font:600 13px system-ui;cursor:pointer;box-shadow:0 3px 12px #0006}
.dl:hover{filter:brightness(1.1)}
.hud{position:fixed;right:14px;bottom:14px;width:300px;z-index:2147483647;background:#fff;color:#0e1318;border-radius:14px;box-shadow:0 8px 30px #0005;font-size:12px;overflow:hidden}
.hd{display:flex;align-items:center;gap:6px;padding:8px 10px;background:linear-gradient(90deg,#00c4cc,#7d2ae8);color:#fff;font-weight:700;cursor:pointer}
.hd span{flex:1}.bd{padding:10px;display:block}.hud.min .bd{display:none}
.tx{font-size:13px;line-height:1.35;margin:0 0 6px;max-height:84px;overflow:auto}
.kw{color:#666;margin:0 0 8px}
.r{display:flex;gap:5px;flex-wrap:wrap;margin:6px 0}
button.b{border:0;border-radius:7px;background:#eceef3;padding:5px 9px;cursor:pointer;font:600 12px system-ui;color:#0e1318}button.b:hover{background:#dfe2ea}button.p{background:#7d2ae8;color:#fff}
.st{display:flex;justify-content:space-between;color:#444;border-top:1px solid #eee;padding-top:7px;margin-top:6px;font-variant-numeric:tabular-nums}
.pill{display:inline-block;padding:1px 7px;border-radius:9px;font-weight:600}.ok{background:#d6f5e0}.no{background:#fff0c7}
.msg{margin-top:6px;padding:6px 8px;border-radius:7px;background:#111;color:#fff;display:none}.msg.err{background:#b3261e}.msg.show{display:block}
.bar{height:5px;background:#eee;border-radius:3px;overflow:hidden;margin-top:6px;display:none}.bar i{display:block;height:100%;background:#7d2ae8;width:0}
select{font:12px system-ui;border-radius:7px;border:1px solid #ccc;padding:4px}`;
const host=document.createElement('div');host.style.cssText='all:initial';document.documentElement.appendChild(host);
const sh=host.attachShadow({mode:'open'});const sheet=new CSSStyleSheet();sheet.replaceSync(CSS);sh.adoptedStyleSheets=[sheet];
const wrap=document.createElement('div');sh.appendChild(wrap);
wrap.innerHTML=`<button class="dl" id="dl">⬇ Add to script line</button><div class="hud" id="hud"><div class="hd" id="hd">🎬 <span id="ttl">Script → Footage</span><b id="mn">–</b></div><div class="bd" id="bd"></div></div>`;
const $=id=>sh.getElementById(id),dlb=$('dl'),hud=$('hud'),bd=$('bd');
let AM=false,P=null,DL=null,hv=null,overBtn=false,work0=0,t0=Date.now(),msgT,min=false;
const fmt=s=>{s=Math.max(0,Math.round(s));const m=Math.floor(s/60);return m+':'+String(s%60).padStart(2,'0')};
const SITES=[['Pexels','https://www.pexels.com/search/videos/{q}/'],['Pixabay','https://pixabay.com/videos/search/{q}/'],['Mixkit','https://mixkit.co/free-stock-video/{q}/'],['Coverr','https://coverr.co/s?q={q}'],['Videezy','https://www.videezy.com/free-video/{q}'],['Vecteezy','https://www.vecteezy.com/free-videos/{q}']];
const su=(t,q)=>t.replace('{q}',encodeURIComponent(q).replace(/%20/g,t.includes('?q=')?'+':'-'));
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const cur=()=>P&&P.lines.find(l=>l.n===P.activeN);

function render(){
  if(!P){bd.innerHTML=`<p class="tx">No script yet.</p><div class="r"><button class="b p" data-a="open">Open workspace</button></div>`;return}
  const l=cur()||P.lines[0],have=P.lines.filter(x=>x.mediaId).length,tot=P.lines.reduce((a,x)=>a+(x.mediaId?(x.dur||0):0),0);
  $('ttl').textContent='Line '+l.n+' of '+P.lines.length+'  ·  '+have+' done';
  const q=l.kw||l.text;
  bd.innerHTML=`<p class="tx">${esc(l.text)}</p><p class="kw">🔎 ${esc(q)} <button class="b" data-a="copy">Copy</button></p>
  <div class="r">${l.mediaId?`<span class="pill ok">✓ ${l.dur?fmt(l.dur):'saved'}${(l.extra||[]).length?' +'+l.extra.length+' clip':''}</span>`:`<span class="pill no">needs footage</span>`}<button class="b" data-a="prev">◀</button><button class="b" data-a="next">▶</button><button class="b" data-a="nextmiss">Next missing</button></div>
  <div class="r"><select id="site"><option value="">Search this line on…</option>${SITES.map((s,i)=>`<option value="${i}">${s[0]}</option>`).join('')}</select><button class="b p" data-a="open">Workspace</button></div>
  <label style="display:block;margin-top:6px"><input type="checkbox" id="more" ${AM?'checked':''}> ➕ Add as <b>extra clip</b> on this line (keep existing)</label><div class="bar" id="bar"><i id="barf"></i></div><div class="msg show" id="dlt" style="display:none;background:#111"></div><div class="msg" id="msg"></div>
  <div class="st"><span>Footage ${fmt(tot)}</span><span>${have}/${P.lines.length}</span><span id="tm">⏱ ${fmt((P.workMs||0)/1000)}</span></div>`;
  paintDl()}
function say(t,err){const m=$('msg');if(!m)return;m.textContent=t;m.className='msg show'+(err?' err':'');clearTimeout(msgT);msgT=setTimeout(()=>m.className='msg',6000)}
const mb=x=>(x/1048576).toFixed(1);
function paintDl(){const b=$('bar'),f=$('barf'),tx=$('dlt');if(!b||!DL)return;const run=DL.st==='run'&&Date.now()-DL.t<60000;
  if(run){b.style.display='block';f.style.width=Math.round((DL.pct||0)*100)+'%';const el=(Date.now()-(DL.t0||Date.now()))/1000,sp=DL.got&&el>0?DL.got/el:0,eta=sp&&DL.len?(DL.len-DL.got)/sp:0;
   tx.style.display='block';tx.textContent='⬇ '+Math.round((DL.pct||0)*100)+'% · '+(DL.len?mb(DL.got)+'/'+mb(DL.len)+' MB':mb(DL.got||0)+' MB')+' · '+(sp?mb(sp)+' MB/s · ':'')+fmt(el)+' elapsed'+(eta?' · ~'+fmt(eta)+' left':'')}
  else{b.style.display='none';if(DL.st==='ok'&&Date.now()-DL.t<20000){tx.style.display='block';tx.textContent='✓ Downloaded '+mb(DL.size||0)+' MB in '+fmt((DL.ms||0)/1000)+(DL.ms<10000?' ('+((DL.ms||0)/1000).toFixed(1)+'s)':'')}else tx.style.display='none'}}
setInterval(()=>{if(DL&&DL.st==='run')paintDl()},500);
const setActive=n=>{if(!P)return;chrome.storage.local.get('proj').then(({proj})=>{if(!proj)return;proj.activeN=n;chrome.storage.local.set({proj})})};
bd.addEventListener('click',e=>{const a=e.target.dataset?.a;if(!a)return;const i=P.lines.findIndex(l=>l.n===P.activeN),L=P.lines;
  if(a==='open')chrome.runtime.sendMessage({t:'OPEN'});
  if(a==='copy')navigator.clipboard.writeText((cur().kw||cur().text)).then(()=>say('Copied'));
  if(a==='prev'&&i>0)setActive(L[i-1].n);if(a==='next'&&i<L.length-1)setActive(L[i+1].n);
  if(a==='nextmiss'){const x=L.slice(i+1).find(l=>!l.mediaId)||L.find(l=>!l.mediaId);if(x)setActive(x.n);else say('All lines have footage 🎉')}});
bd.addEventListener('change',e=>{if(e.target.id==='more'){AM=e.target.checked;chrome.storage.local.set({addMore:AM})}if(e.target.id==='site'&&e.target.value!==''){const l=cur();window.open(su(SITES[+e.target.value][1],l.kw||l.text),'_blank');e.target.value=''}});
$('hd').addEventListener('click',()=>{min=!min;hud.classList.toggle('min',min)});

/* ---- video detection ---- */
const http=u=>/^https?:/i.test(u||'');
const srcOf=v=>[v.currentSrc,v.src,...[...v.querySelectorAll('source[src]')].map(s=>s.src)].filter(http);
function pageLevel(){const a=[];document.querySelectorAll('script[type="application/ld+json"]').forEach(s=>{try{const walk=o=>{if(Array.isArray(o))o.forEach(walk);else if(o&&typeof o==='object'){if(typeof o.contentUrl==='string')a.push(o.contentUrl);Object.values(o).forEach(x=>x&&typeof x==='object'&&walk(x))}};walk(JSON.parse(s.textContent))}catch(e){}});
  document.querySelectorAll('meta[property^="og:video"],meta[itemprop="contentUrl"]').forEach(m=>a.push(m.content));
  document.querySelectorAll('a[href]').forEach(x=>{if(/\.(mp4|mov|webm)(\?|$)/i.test(x.href))a.push(x.href)});return a.filter(http)}
function candidates(v){const r=v.getBoundingClientRect(),own=srcOf(v);let list=own;if(r.width>=480||!own.length){const vids=[...document.querySelectorAll('video')].filter(x=>x.getBoundingClientRect().width>=200);if(r.width>=480||vids.length<=1)list=[...pageLevel(),...own]}return[...new Set(list)]}
function findVideo(x,y){for(const el of document.elementsFromPoint(x,y)){if(el.tagName==='VIDEO')return el;const v=el.querySelector&&el.querySelector('video');if(v){const r=v.getBoundingClientRect();if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)return v}}return null}
let mt=0;document.addEventListener('mousemove',e=>{if(overBtn)return;const n=Date.now();if(n-mt<80)return;mt=n;const v=findVideo(e.clientX,e.clientY);
  if(!v||v.getBoundingClientRect().width<120){hv=null;dlb.style.display='none';return}
  hv=v;const r=v.getBoundingClientRect();dlb.style.display='flex';dlb.style.left=Math.max(4,r.left+8)+'px';dlb.style.top=Math.max(4,r.top+8)+'px';const l=cur();dlb.textContent='⬇ Add to line '+(l?l.n:'?')},{passive:true});
dlb.addEventListener('mouseenter',()=>overBtn=true);dlb.addEventListener('mouseleave',()=>overBtn=false);
dlb.addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();if(!hv)return;if(!P){say('Upload a script first (Workspace)',1);return}
  const v=hv,urls=candidates(v);dlb.textContent='… saving';
  try{const r=await chrome.runtime.sendMessage({t:'GRAB',urls,pageUrl:location.href,dur:v.duration,w:v.videoWidth,h:v.videoHeight});
    if(!r||!r.ok)throw new Error(r?.error||'Failed');say(r.extra?'✓ Extra clip added to line '+r.n+' in '+(r.ms/1000).toFixed(1)+'s':r.done?'✓ Saved in '+(r.ms/1000).toFixed(1)+'s. All lines have footage!':'✓ Saved to line '+r.n+' in '+(r.ms/1000).toFixed(1)+'s. Next: line '+r.next)}
  catch(err){say('✗ '+err.message,1)}dlb.style.display='none'},true);
document.addEventListener('scroll',()=>{dlb.style.display='none'},{passive:true,capture:true});

/* ---- state ---- */
function load(){chrome.storage.local.get(['proj','dl','addMore']).then(s=>{AM=!!s.addMore;P=s.proj||null;DL=s.dl||null;work0=P?.workMs||0;t0=Date.now();render()})}
chrome.storage.onChanged.addListener((c,a)=>{if(a!=='local')return;if(c.proj){P=c.proj.newValue||null;work0=P?.workMs||0;t0=Date.now();render()}if(c.dl){DL=c.dl.newValue;if(DL&&DL.st==='err')say('✗ '+DL.msg,1);paintDl()}});
setInterval(()=>{const t=$('tm');if(t&&P&&document.visibilityState==='visible')t.textContent='⏱ '+fmt(work0/1000+(Date.now()-t0)/1000)},1000);
setInterval(()=>{if(P&&document.visibilityState==='visible'&&document.hasFocus())chrome.runtime.sendMessage({t:'TICK'}).catch(()=>{})},10000);
load();
})();
