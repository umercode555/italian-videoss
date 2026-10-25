const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let P=null,sel=null,work0=0,t0=Date.now(),vurl=null,vid=null;
const toast=m=>{const t=$('#toast');t.textContent=m;t.style.display='block';clearTimeout(toast.h);toast.h=setTimeout(()=>t.style.display='none',4500)};
const line=n=>P&&P.lines.find(l=>l.n===n);
let selClip=0,moreMode=false,onClose=null;
const clipsOf=l=>l.mediaId?[{k:0,id:l.mediaId,name:l.name,dur:l.dur,w:l.w,h:l.h,thumb:l.thumb,fq:l.fq,inT:l.inT||0,outT:l.outT||null},...(l.extra||[]).map((c,i)=>({...c,k:i+1,inT:c.inT||0,outT:c.outT||null}))]:[];
const clipLen=c=>c.dur?Math.max(0,(c.outT||c.dur)-(c.inT||0)):0;
const patchClip=(n,k,patch)=>SV.mutate(p=>{const l=p.lines.find(x=>x.n===n);if(!l)return p;if(k===0)Object.assign(l,patch);else if(l.extra&&l.extra[k-1])Object.assign(l.extra[k-1],patch);return p});
async function removeClip(n,k){let old;await SV.mutate(p=>{const l=p.lines.find(x=>x.n===n);if(k>0){old=l.extra[k-1].id;l.extra.splice(k-1,1)}else{old=l.mediaId;const x=(l.extra||[]).shift();if(x)Object.assign(l,{mediaId:x.id,name:x.name,size:x.size,dur:x.dur,w:x.w,h:x.h,thumb:x.thumb,inT:x.inT||0,outT:x.outT||null,srcUrl:x.srcUrl||null,srcPage:x.srcPage||null,fq:x.fq||null,hash:x.hash||null});else Object.assign(l,{mediaId:null,name:null,dur:null,w:null,h:null,thumb:null,inT:0,outT:null,srcUrl:null,srcPage:null,size:null,fq:null,hash:null})}return p});if(old)await SV.del('media',old);selClip=0}
const upd=(n,patch)=>SV.mutate(p=>{const l=p.lines.find(x=>x.n===n);if(l)Object.assign(l,patch);return p});
const modal=h=>{$('#card').innerHTML=h;$('#modal').style.display='flex'};const closeM=()=>{$('#modal').style.display='none';$('#card').style.width='';if(onClose){onClose();onClose=null}};
$('#modal').addEventListener('mousedown',e=>{if(e.target.id==='modal')closeM()});

async function load(){P=await SV.proj();if(P&&(sel==null||!line(sel)))sel=P.activeN??P.lines[0]?.n;work0=P?.workMs||0;t0=Date.now();render();backfill()}
chrome.storage.onChanged.addListener((c,a)=>{if(a!=='local')return;if(c.proj){const keep=document.activeElement&&['TEXTAREA','INPUT'].includes(document.activeElement.tagName);P=c.proj.newValue;work0=P?.workMs||0;t0=Date.now();if(!keep||document.activeElement.type==='checkbox')render();else head();backfill()}if(c.dl)dlStatus(c.dl.newValue)});
function dlStatus(d){const e=$('#dlst');if(!d||Date.now()-d.t>15000){e.textContent='';return}const el=((Date.now()-(d.t0||Date.now()))/1000),f=x=>Math.floor(x/60)+':'+String(Math.round(x%60)).padStart(2,'0');e.textContent=d.st==='run'?'⬇ line '+d.n+' '+Math.round((d.pct||0)*100)+'% · '+f(el):d.st==='ok'?'✓ line '+d.n+' saved in '+f((d.ms||0)/1000):'✗ '+(d.msg||'failed')}
setInterval(()=>{chrome.storage.local.get('dl').then(({dl})=>dl&&dl.st==='run'&&dlStatus(dl))},1000);
function head(){if(!P){$('#sProg').textContent='No script';return}const have=P.lines.filter(l=>l.mediaId),tot=have.reduce((a,l)=>a+clipsOf(l).reduce((b,c)=>b+clipLen(c),0),0);$('#sProg').textContent=have.length+'/'+P.lines.length+' lines';$('#sTot').textContent='Footage '+SV.fmt(tot)}
setInterval(()=>{if(P&&document.visibilityState==='visible')$('#sTim').textContent='⏱ '+SV.fmt(work0/1000+(Date.now()-t0)/1000)},1000);
setInterval(()=>{if(P&&document.visibilityState==='visible'&&document.hasFocus())chrome.runtime.sendMessage({t:'TICK'})},10000);

function render(){head();const L=P?P.lines:[],only=$('#onlyMiss').checked;
  $('#list').innerHTML=!P?'<div class="empty">Upload or paste your numbered script<br><span class="mut">1: first line<br>2: second line …</span></div>':L.filter(l=>!only||!l.mediaId).map(l=>`<div class="row${l.n===sel?' sel':''}${l.n===P.activeN?' act':''}" data-n="${l.n}"><div class="n">${l.n}</div><div class="t">${esc(l.text)}${l.en?`<div class="en">${esc(l.en)}</div>`:''}</div>${l.thumb?`<div class="th" style="background-image:url(${l.thumb})"></div>`:`<div class="th">${l.mediaId?'…':''}</div>`}<span class="tag${l.mediaId?' ok':''}">${l.mediaId?(l.dur?SV.fmt(clipsOf(l).reduce((b,c)=>b+clipLen(c),0)):'✓')+((l.extra||[]).length?' ·'+(l.extra.length+1):''):'empty'}${(l.logos||[]).length?' 🏷':''}${l.unc?' ⚠':''}</span></div>`).join('');
  detail()}
$('#list').addEventListener('click',async e=>{const r=e.target.closest('.row');if(!r)return;sel=+r.dataset.n;await SV.mutate(p=>{p.activeN=sel;return p})});
$('#onlyMiss').onchange=render;

async function detail(){const d=$('#detail');if(vurl){URL.revokeObjectURL(vurl);vurl=null}if(!P){d.innerHTML='<div class="empty">No script loaded.</div>';return}
  const l=line(sel);if(!l){d.innerHTML='';return}
  const CL=clipsOf(l);if(selClip>=CL.length)selClip=0;const clipsLen=CL.reduce((a,c)=>a+clipLen(c),0);
  const searches=SV.SITES.map((s,i)=>`<button data-s="${i}">${s[0]}</button>`).join('');
  d.innerHTML=`<h2>Script ${l.n} ${l.n===P.activeN?'<span class="tag ok">active: downloads go here</span>':''}</h2>
  <textarea id="tx">${esc(l.text)}</textarea><div class="r"><div style="flex:1"><div class="mut">Search keywords</div><input type="text" id="kw" value="${esc(l.kw||'')}"></div></div>
  <div class="r">${searches}<button id="bCopy">Copy keywords</button></div>
  <div id="pv">${l.mediaId?'<video id="v" controls></video>':'<div class="empty">No footage yet.<br>Browse a stock site: hover any video and click “⬇ Add to line '+l.n+'”.</div>'}</div>
  ${l.mediaId?`<h3>Clips on this line (${CL.length})</h3><p class="mut">Total ${clipsLen.toFixed(1)}s kept. With several clips the line's voiceover time is shared between them.</p>`+CL.map(c=>`<div class="clipr${c.k===selClip?' on':''}" data-k="${c.k}"><div class="th" style="background-image:url(${c.thumb||''})"></div><div class="g"><b>${c.k+1}. ${esc(c.name||'clip')}${c.fq?' <span class="mut">· “'+esc(c.fq)+'”</span>':''}</b><span class="mut">${c.dur?'uses '+(c.inT||0).toFixed(1)+'s → '+(c.outT||c.dur).toFixed(1)+'s of '+c.dur.toFixed(1)+'s':'reading…'}</span></div><button class="p" data-trim="${c.k}">✂ Trim</button><button class="d" data-rm="${c.k}" title="Remove clip">✕</button></div>`).join(''):''}
  <div class="r"><button id="bMine">${l.mediaId?'Replace main clip':'Upload my own file'}</button>${l.mediaId?'<button id="bMore">+ Add another clip (upload)</button>':''}<button id="bNext">Next missing →</button>${l.srcPage?`<a href="${esc(l.srcPage)}" target="_blank" class="mut">source page</a>`:''}</div>
  ${l.mediaId?'<p class="mut">Tip: tick “Add as extra clip” in the on-page panel while browsing a stock site to add more clips to this line.</p>':''}
`;
  if(l.mediaId){const c=CL[selClip],m=await SV.get('media',c.id);if(m&&line(sel)?.mediaId===l.mediaId&&$('#v')){vurl=URL.createObjectURL(m.blob);vid=$('#v');vid.src=vurl;vid.currentTime=c.inT||0;vid.ontimeupdate=()=>{if(c.outT&&vid.currentTime>=c.outT){vid.pause();vid.currentTime=c.inT||0}}}else if($('#pv'))$('#pv').innerHTML='<div class="empty">Media file missing. Re-assign it.</div>'}}
$('#detail').addEventListener('change',e=>{const n=sel;if(e.target.id==='tx'){const v=e.target.value.trim();if(v)upd(n,{text:v})}if(e.target.id==='kw')upd(n,{kw:e.target.value.trim()});if(e.target.dataset.lw!=null){const i=+e.target.dataset.lw,v=e.target.value.trim();SV.mutate(p=>{const g=p.lines.find(x=>x.n===n).logos[i];if(g)g.word=v;return p})}});
$('#detail').addEventListener('click',async e=>{const cr=e.target.closest('.clipr[data-k]');if(cr&&!e.target.closest('button')){selClip=+cr.dataset.k;detail();return}const b=e.target.closest('button');if(!b)return;const l=line(sel);
  if(b.dataset.s!=null)window.open(SV.searchUrl(SV.SITES[+b.dataset.s][1],l.kw||l.text),'_blank');
  if(b.id==='bCopy')navigator.clipboard.writeText(l.kw||l.text).then(()=>toast('Copied'));
  if(b.dataset.trim!=null)openTrim(l.n,+b.dataset.trim);
  if(b.dataset.rm!=null&&confirm('Remove this clip?'))removeClip(l.n,+b.dataset.rm);
  if(b.id==='bMine'){moreMode=false;$('#fMine').click()}
  if(b.id==='bMore'){moreMode=true;$('#fMine').click()}
  if(b.dataset.lrm!=null){const i=+b.dataset.lrm,g=l.logos[i];await SV.mutate(p=>{p.lines.find(x=>x.n===l.n).logos.splice(i,1);return p});await SV.del('media',g.id)}
  if(b.id==='bNext'){const x=P.lines.find(z=>z.n>l.n&&!z.mediaId)||P.lines.find(z=>!z.mediaId);if(x){sel=x.n;await SV.mutate(p=>{p.activeN=x.n;return p})}else toast('Every line has footage 🎉')}});
$('#fMine').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;const n=sel,id=SV.uid();await SV.put('media',{id,blob:f,name:f.name,type:f.type,size:f.size});let old;
  await SV.mutate(p=>{const l=p.lines.find(x=>x.n===n);
   if(moreMode&&l.mediaId){(l.extra=l.extra||[]).push({id,name:f.name,size:f.size,dur:null,w:null,h:null,thumb:null,inT:0,outT:null,srcPage:'(uploaded file)'})}
   else{old=l.mediaId;Object.assign(l,{mediaId:id,name:f.name,size:f.size,dur:null,w:null,h:null,thumb:null,inT:0,outT:null,srcUrl:null,srcPage:'(uploaded file)'});const nx=p.lines.find(x=>x.n>n&&!x.mediaId);if(nx&&p.activeN===n)p.activeN=nx.n}return p});moreMode=false;if(old)await SV.del('media',old)};

/* Canva-style trim: see the whole clip, drag the handles to keep only the part you want */
async function openTrim(n,k){const l=line(n),c=clipsOf(l)[k];if(!c)return;const m=await SV.get('media',c.id);if(!m)return toast('File missing');const url=URL.createObjectURL(m.blob);
  modal(`<h2>✂ Trim clip</h2><video id="tv" playsinline></video><div id="ts"><div id="tf"></div><i class="mask" id="m1" style="left:0"></i><i class="mask" id="m2" style="right:0"></i><i class="hd" id="h1"></i><i class="hd" id="h2"></i><u id="ph"></u></div><div class="r"><button id="tp">▶ Play selection</button><span class="mut" id="ti"></span><span style="flex:1"></span><button id="tx">Cancel</button><button class="p" id="tok">Done</button></div><p class="mut">Drag the purple handles to choose which part to keep. Click the strip to jump there. The rest of the clip is ignored.</p>`);
  $('#card').style.width='780px';const v=$('#tv');v.src=url;await new Promise(r=>{v.onloadedmetadata=r;v.onerror=r;setTimeout(r,8000)});
  const D=v.duration||c.dur||1;let a=Math.min(c.inT||0,D-.3),b=c.outT>a?Math.min(c.outT,D):D;
  const S=$('#ts'),pc=t=>(t/D*100)+'%',paint=()=>{$('#h1').style.left=pc(a);$('#h2').style.left=pc(b);$('#m1').style.width=pc(a);$('#m2').style.width=(100-b/D*100)+'%';$('#ti').textContent='Keep '+a.toFixed(1)+'s → '+b.toFixed(1)+'s  ('+(b-a).toFixed(1)+'s of '+D.toFixed(1)+'s)'};paint();
  const tAt=e=>{const r=S.getBoundingClientRect();return Math.min(D,Math.max(0,(e.clientX-r.left)/r.width*D))};
  for(const id of ['h1','h2']){const h=$('#'+id);h.onpointerdown=e=>{e.preventDefault();h.setPointerCapture(e.pointerId);const mv=ev=>{const t=tAt(ev);if(id==='h1'){a=Math.min(t,b-.3);v.currentTime=a}else{b=Math.max(t,a+.3);v.currentTime=Math.max(a,b-.05)}paint()};h.onpointermove=mv;h.onpointerup=()=>{h.onpointermove=null}}}
  S.onpointerdown=e=>{if(e.target.classList.contains('hd'))return;v.currentTime=tAt(e)};
  $('#tp').onclick=()=>{if(v.paused){if(v.currentTime<a||v.currentTime>=b-.05)v.currentTime=a;v.play();$('#tp').textContent='⏸ Pause'}else{v.pause();$('#tp').textContent='▶ Play selection'}};
  v.ontimeupdate=()=>{$('#ph').style.left=pc(v.currentTime);if(v.currentTime>=b&&!v.paused){v.pause();v.currentTime=a;$('#tp').textContent='▶ Play selection'}};
  v.currentTime=a;onClose=()=>{try{v.pause()}catch(e){}URL.revokeObjectURL(url)};
  $('#tx').onclick=closeM;$('#tok').onclick=async()=>{await patchClip(n,k,{inT:+a.toFixed(2),outT:b>=D-.05?null:+b.toFixed(2)});closeM();toast('Trim saved')};
  // filmstrip
  (async()=>{const fv=document.createElement('video');fv.muted=true;fv.src=url;await new Promise(r=>{fv.onloadedmetadata=r;fv.onerror=r});const N=14,tf=$('#tf');for(let i=0;i<N&&tf&&tf.isConnected;i++){await new Promise(r=>{fv.onseeked=r;fv.currentTime=(i+.5)*D/N});const cv=document.createElement('canvas');cv.width=120;cv.height=68;cv.getContext('2d').drawImage(fv,0,0,120,68);const im=new Image();im.src=cv.toDataURL('image/jpeg',.6);tf.appendChild(im)}})();
}

/* metadata + thumbnails for new footage */
let bf=false;async function backfill(){if(bf||!P)return;bf=true;try{for(const l of P.lines){for(const c of clipsOf(l)){if(c.dur&&c.thumb&&c.w)continue;const m=await SV.get('media',c.id);if(!m)continue;const info=await probe(m.blob);if(info)await SV.mutate(p=>{const x=p.lines.find(z=>z.n===l.n);if(!x)return p;const t=c.k===0?(x.mediaId===c.id?x:null):(x.extra||[]).find(e=>e.id===c.id);if(t)Object.assign(t,info);return p})}}}finally{bf=false}}
const probe=blob=>new Promise(res=>{const v=document.createElement('video'),u=URL.createObjectURL(blob);v.muted=true;v.preload='auto';const fin=r=>{URL.revokeObjectURL(u);res(r)};v.onerror=()=>fin(null);setTimeout(()=>fin(null),15000);
  v.onloadedmetadata=()=>{v.currentTime=Math.min(.5,(v.duration||1)/2)};v.onseeked=()=>{const c=document.createElement('canvas');c.width=128;c.height=72;c.getContext('2d').drawImage(v,0,0,128,72);fin({dur:v.duration,w:v.videoWidth,h:v.videoHeight,thumb:c.toDataURL('image/jpeg',.6)})}});

/* script input */
async function setScript(raw){const L=SV.parseScript(raw);if(!L.length)return toast('No lines found. Use “1: text” per line.');const old=P,fp=SV.fp;
  const{fndQ=[],fndPick={}}=await chrome.storage.local.get(['fndQ','fndPick']);
  const want=new Set([...(old?.lines||[]).filter(l=>l.mediaId||(l.logos||[]).length).map(l=>l.n),...fndQ.map(x=>x.n).filter(n=>n!=null)]);
  const newBy=new Map();L.forEach(x=>{const f=fp(x.text);(newBy.get(f)||newBy.set(f,[]).get(f)).push(x.n)});
  const map=new Map(),used=new Set(),unc=new Set(),lost=[],ol=n=>old.lines.find(z=>z.n===n);
  if(old){for(const n of want){const o=ol(n);if(!o)continue;const c=(newBy.get(fp(o.text))||[]).filter(z=>!used.has(z)).sort((a,b)=>Math.abs(a-n)-Math.abs(b-n))[0];if(c!=null){map.set(n,c);used.add(c)}}
    for(const n of want){if(map.has(n)||!ol(n))continue;if(L.some(x=>x.n===n)&&!used.has(n)){map.set(n,n);used.add(n);unc.add(n)}else lost.push(n)}}
  const moved=[...map].filter(([a,b])=>a!==b&&!unc.has(a)).length,hasFoot=old&&old.lines.some(l=>l.mediaId);
  if(hasFoot&&(moved||unc.size||lost.length)&&!confirm('Script changed. Footage links:\n• '+moved+' moved with their sentence (exact text match)\n• '+unc.size+' uncertain: same number, different sentence. Kept but marked ⚠ for you to check\n• '+lost.length+' have no matching line'+(lost.length?' (lines '+lost.slice(0,8).join(', ')+'): their footage will be removed':'')+'\n\nContinue?'))return;
  const keep=new Map();if(old)for(const [on,nn] of map){const o=ol(on);if(o&&(o.mediaId||(o.logos||[]).length))keep.set(nn,o)}
  const lines=L.map(l=>{const k=keep.get(l.n);return k?{...k,n:l.n,text:l.text,kw:l.kw||k.kw,en:l.en||k.en||'',unc:unc.has(l.n)}:{n:l.n,text:l.text,kw:l.kw,en:l.en||'',mediaId:null}});
  const ids=l=>[l.mediaId,...(l.extra||[]).map(x=>x.id),...(l.logos||[]).map(x=>x.id)].filter(Boolean),kept=new Set(lines.flatMap(ids));for(const l of old?.lines||[])for(const id of ids(l))if(!kept.has(id))await SV.del('media',id);
  const nfp=n=>fp(L.find(x=>x.n===n).text),keepFp=(n,f)=>unc.has(n)?f:nfp(n);
  const Q2=fndQ.map(x=>{const m=x.n!=null?map.get(x.n):undefined;return m==null?{...x,n:null}:{...x,n:m,fp:keepFp(m,x.fp||(ol(x.n)?fp(ol(x.n).text):nfp(m)))}});
  const P2={};for(const [k,arr] of Object.entries(fndPick)){const m=map.get(+k);if(m==null)continue;P2[m]=(P2[m]||[]).concat(arr.map(p=>({...p,fp:keepFp(m,p.fp)})))}
  await chrome.storage.local.set({fndQ:Q2,fndPick:P2});
  const first=lines.find(l=>!l.mediaId);
  await chrome.storage.local.set({proj:{id:old?.id||SV.uid(),name:old?.name||'My video',lines,activeN:(first||lines[0]).n,workMs:old?.workMs||0,created:old?.created||Date.now(),updated:Date.now()}});sel=(first||lines[0]).n;toast(lines.length+' segments loaded'+(unc.size?' · '+unc.size+' ⚠ to check':''))}
$('#bUp').onclick=()=>$('#fScript').click();$('#fScript').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(f)setScript(await f.text())};
const splitSent=raw=>{let n=0;return String(raw).replace(/\r/g,'').split(/\n+/).map(p=>p.trim()).filter(Boolean).flatMap(p=>p.split(/(?<=[.!?…])\s+(?=[\p{Lu}¿¡"«“])/u)).map(s=>s.trim()).filter(Boolean).map(s=>(++n)+': '+s).join('\n')};
const DS_PROMPT=`I will paste an Italian video script. Translate every sentence into English and add a stock-footage search keyword.

Return ONLY plain text, one line per sentence, in EXACTLY this format (no table, no markdown, no bullets, no commentary before or after):

N: <Italian sentence> || <English translation> || <search keyword>

Rules:
- Keep the Italian exactly as I wrote it. Do not correct, shorten or reword it.
- One sentence per line. N starts at 1 and goes up by 1.
- Use exactly two separators, written as two vertical bars with a space on each side ( || ).
- The English translation is natural English, on the same line.
- The search keyword is English, 2-6 words, concrete and visual (what the camera shows), no punctuation.
- Do not use || anywhere inside the sentences themselves.

Example:
1: Un trapano avvitatore con batteria a 29 euro e 99 centesimi. || A cordless drill with battery for 29 euros 99 cents. || cordless drill with battery closeup
2: Una stazione di saldatura a 14 euro e 99. || A soldering station for 14 euros and 99. || soldering station on workbench

Here is the Italian script:
`;
$('#bPaste').onclick=()=>{modal(`<h2>Paste script</h2><p class="mut">Paste the full script. One line (or “N: text”) = one segment.</p>
<div style="background:#f3f8f4;border:1px solid #bfe3c9;border-radius:10px;padding:10px 12px;margin:8px 0"><b>With English translations (optional, recommended)</b>
<div class="mut" style="margin:4px 0">One line per sentence: <code>N: Italian || English || keyword</code><br>The English is shown beside each Italian sentence for you only. It is never used for search, voiceover, subtitles or the exported video. The keyword (3rd part) is optional and fills the search keyword like “Italian | keyword” always did.</div>
<div class="mut">Ask DeepSeek / ChatGPT with this prompt, then paste its answer below:</div>
<textarea id="dsP" readonly style="min-height:120px;font:12px/1.35 ui-monospace,monospace;background:#fff">${esc(DS_PROMPT)}</textarea><div class="r"><button id="dsC" class="p">Copy prompt for DeepSeek</button></div></div>
<textarea id="pt" style="min-height:220px" placeholder="1: Un trapano avvitatore con batteria a 29 euro e 99 centesimi. || A cordless drill with battery for 29 euros 99 cents. || cordless drill with battery closeup\n2: ..."></textarea><label style="font-weight:400"><input type="checkbox" id="pSp"> Split paragraphs into one segment per sentence</label><div class="r"><button class="p" id="pOk">Load script</button><button id="pNo">Cancel</button></div>`);
$('#dsC').onclick=()=>navigator.clipboard.writeText(DS_PROMPT).then(()=>toast('Prompt copied. Paste it into DeepSeek, then add your Italian script'));
$('#pt').oninput=()=>{if(!$('#pSp').dataset.t&&!/\|\|/.test($('#pt').value)&&$('#pt').value.split('\n').some(x=>x.length>250))$('#pSp').checked=true};$('#pSp').onchange=()=>$('#pSp').dataset.t=1;$('#pOk').onclick=()=>{let v=$('#pt').value;const sp=$('#pSp').checked&&!/\|\|/.test(v);closeM();setScript(sp?splitSent(v):v)};$('#pNo').onclick=closeM};
$('#bResume').onclick=async()=>{if(!P)return toast('Load a script first');const x=P.lines.find(l=>!l.mediaId);if(!x)return toast('Every line has footage. Open the editor.');sel=x.n;await SV.mutate(p=>{p.activeN=x.n;return p});toast('Resumed at line '+x.n)};
$('#bFind').onclick=()=>{if(!P)return toast('Load a script first');location.href='finder.html'};
$('#bEditor').onclick=()=>{if(!P)return toast('Load a script first');const n=P.lines.filter(l=>l.mediaId).length;if(!n)return toast('Assign at least one footage clip first');location.href='editor-host.html'};

/* export */
const pad=n=>String(n).padStart(3,'0'),ext=l=>(l.name||'').split('.').pop()||'mp4';
const projJson=()=>({version:1,name:P.name,exportedAt:new Date().toISOString(),canvas:{w:1920,h:1080},lines:P.lines.map(l=>({n:l.n,text:l.text,keywords:l.kw||'',footage:l.mediaId?{file:'footage/'+pad(l.n)+'.'+ext(l),durationSec:l.dur||null,width:l.w||null,height:l.h||null,inPointSec:l.inT||0,sourceUrl:l.srcUrl||null,sourcePage:l.srcPage||null}:null,timing:null}))});
$('#bJson').onclick=()=>{if(!P)return;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(projJson(),null,2)],{type:'application/json'}));a.download='project.json';a.click()};
$('#bMedia').onclick=async()=>{if(!P)return;let n=0;const dl=(blob,name)=>chrome.downloads.download({url:URL.createObjectURL(blob),filename:'ScriptFootage/'+name,conflictAction:'overwrite'});
  for(const l of P.lines){if(!l.mediaId)continue;const m=await SV.get('media',l.mediaId);if(m){await dl(m.blob,'footage/'+pad(l.n)+'.'+ext(l));n++}}await dl(new Blob([JSON.stringify(projJson(),null,2)],{type:'application/json'}),'project.json');toast(n+' files + project.json saved to Downloads/ScriptFootage')};

/* settings */
$('#bSet').onclick=async()=>{const c=(await chrome.storage.local.get('cfg')).cfg||{};modal(`<h2>Settings</h2><label>Groq API key (free, console.groq.com)</label><input type="password" id="sk" value="${esc(c.key||'')}" placeholder="gsk_…"><label>Voiceover language</label><select id="sl">${[["auto","Auto-detect"],["it","Italian"],["es","Spanish"],["en","English"],["pt","Portuguese"],["fr","French"],["de","German"]].map(([k,n])=>`<option value="${k}" ${k===(c.wl||"auto")?"selected":""}>${n}</option>`).join("")}</select><label>Model</label><input type="text" id="sm" value="${esc(c.model||'whisper-large-v3-turbo')}"><div class="r"><button class="p" id="sOk">Save</button><button id="sNo">Close</button></div><p class="mut">Stored only in this browser profile. Used by the editor's Sync.</p>`);
  $('#sOk').onclick=async()=>{await chrome.storage.local.set({cfg:{...((await chrome.storage.local.get('cfg')).cfg||{}),key:$('#sk').value.trim(),wl:$('#sl').value||'auto',model:$('#sm').value.trim()||'whisper-large-v3-turbo',url:'https://api.groq.com/openai/v1'}});closeM();toast('Saved')};$('#sNo').onclick=closeM};
load();
