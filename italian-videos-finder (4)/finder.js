const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const toast=m=>{const t=$('#toast');t.textContent=m;t.style.display='block';clearTimeout(toast.h);toast.h=setTimeout(()=>t.style.display='none',4500)};
const SITES=['Pexels','Pixabay','Mixkit','Coverr','Videezy','Vecteezy','Magnific','Artgrid','Vista'],FREE=SITES.filter(s=>!['Magnific','Artgrid','Vista'].includes(s));
let P=null,site=SITES[0],RES={},PICK={},Q=[],DLS={},ERR={},BUSY={},BUSYM={},WARN={},QUEUED=new Set(),cancelled=new Set();const ALL='ALL';
const rk=(q,s)=>(s||site)+'|'+q.trim().toLowerCase(),sx=x=>x.site||site,line=n=>P&&P.lines.find(l=>l.n===n),fmt=s=>SV.fmt(s),qi=id=>Q.find(x=>x.id===id);
const clipsOn=l=>l?[...(l.mediaId?[{id:l.mediaId,name:l.name,size:l.size,hash:l.hash,dur:l.dur,fq:l.fq,srcPage:l.srcPage}]:[]),...(l.extra||[])]:[];
const picks=n=>{if(n==null)return[];const l=line(n);if(!l)return[];const reg=PICK[n]||[];
  return clipsOn(l).map(c=>reg.find(p=>p.mediaId===c.id)||{id:'file:'+c.id,mediaId:c.id,site:/uploaded|imported/.test(c.srcPage||'')?'My file':'Clip',title:c.name,dur:c.dur,q:c.fq||''})};
const savePick=()=>chrome.storage.local.set({fndPick:PICK}),saveRes=()=>chrome.storage.local.set({fndRes:RES}),saveQ=()=>chrome.storage.local.set({fndQ:Q});
const snip=(t,n=110)=>{t=String(t||'');return t.length>n?t.slice(0,n)+'…':t};

async function load(){const s=await chrome.storage.local.get(['proj','fndRes','fndPick','fndSite','fndQ']);P=s.proj||null;RES=s.fndRes||{};PICK=s.fndPick||{};site=s.fndSite||site;
  if(s.fndQ)Q=s.fndQ;else if(P){Q=P.lines.filter(l=>(l.kw||'').trim()).map(l=>({id:SV.uid(),q:l.kw.trim(),n:l.n,fp:SV.fp(l.text)}));saveQ()}
  if(P){let ch=0;Q.forEach(x=>{const l=line(x.n);if(l&&!x.fp){x.fp=SV.fp(l.text);ch=1}});if(ch)saveQ();$('#kws').value=P.lines.filter(l=>Q.some(x=>x.n===l.n&&x.q)).map(l=>l.n+': '+Q.find(x=>x.n===l.n).q).join('\n')}
  $('#site').innerHTML=SITES.map(x=>`<option${x===site?' selected':''}>${x}</option>`).join('');await loadTray();navigator.storage&&navigator.storage.persist&&navigator.storage.persist().catch(()=>{});render()}
chrome.storage.onChanged.addListener((c,a)=>{if(a!=='local')return;
  if(c.proj){P=c.proj.newValue||null;if(!document.activeElement||document.activeElement.tagName!=='INPUT')render()}
  if(c.dl&&c.dl.newValue){const d=c.dl.newValue;if(d.k&&DLS[d.k]){DLS[d.k].pct=d.pct||0;document.querySelectorAll(`[data-vk="${CSS.escape(d.k)}"]`).forEach(c=>{const b=c.querySelector('.bar i'),k=c.querySelector('.ck');if(b)b.style.width=Math.round((d.pct||0)*100)+'%';if(k&&DLS[d.k]&&!DLS[d.k].err)k.textContent=Math.round((d.pct||0)*100)+'%'})}}});

/* ---------- search (per keyword source, paging) ---------- */
/* fetch next page from every active source of this keyword and append unseen items (interleaved across sources) */
async function pullPage(x,r){const q=x.q.trim(),lists=[],errs=[];
  for(const s of r.sites){if(r.sdone[s])continue;const pg=(r.pg[s]||0)+1;
    const resp=await chrome.runtime.sendMessage({t:'FIND',site:s,q,limit:r.sites.length>1?12:30,page:pg,tabs:$('#optTabs').checked}).catch(e=>({ok:false,error:e.message}));
    if(resp&&resp.ok){r.pg[s]=pg;const seen=new Set(r.items.map(i=>i.id)),fresh=resp.items.filter(i=>!seen.has(i.id));if(!fresh.length)r.sdone[s]=true;lists.push(fresh)}
    else{const m=(resp&&resp.error)||'failed';errs.push(s+': '+m);if(/no page|HTTP 404/i.test(m))r.sdone[s]=true}}
  const added=[];for(let i=0;;i++){let any=false;for(const l of lists)if(l[i]){any=true;added.push(l[i])}if(!any)break}
  r.items.push(...added);r.done=r.sites.every(s=>r.sdone[s]);return{added:added.length,errs}}
async function search(id,force){const x=qi(id),q=(x&&x.q||'').trim();QUEUED.delete(id);if(!q)return;const s=sx(x),k=rk(q,s),bk=id+k;if(!force&&RES[k]&&RES[k].items&&RES[k].items.length)return;
  BUSY[bk]=1;delete ERR[bk];delete WARN[bk];render();
  const r={items:[],shown:10,pg:{},sdone:{},sites:s===ALL?[...FREE]:[s],done:false,ts:Date.now()},out=await pullPage(x,r);delete BUSY[bk];
  if(!r.items.length)ERR[bk]=out.errs.length?out.errs.join(' · '):'No results on '+(s===ALL?'any site':s)+' for “'+q+'”. Try other words.';
  else{RES[k]=r;if(out.errs.length)WARN[bk]=out.errs.join(' · ');saveRes()}render()}
async function more(id){const x=qi(id);if(!x)return;const k=rk(x.q,sx(x)),r=RES[k],bk=id+k;if(!r||BUSYM[bk])return;
  if(r.items.length>r.shown){r.shown+=10;saveRes();render();return}if(r.done){render();return}
  BUSYM[bk]=1;delete WARN[bk];render();const out=await pullPage(x,r);delete BUSYM[bk];
  if(out.added)r.shown=Math.min(r.items.length,r.shown+10);else if(!out.errs.length)r.done=true;if(out.errs.length)WARN[bk]=out.errs.join(' · ');saveRes();render()}
async function searchMany(ids,force){const b=$('#sBusy');ids.forEach(i=>QUEUED.add(i));render();let i=0;
  try{for(const id of ids){b.style.display='';b.textContent='Searching '+(++i)+'/'+ids.length;await search(id,force);await new Promise(r=>setTimeout(r,350))}}finally{ids.forEach(i=>QUEUED.delete(i));b.style.display='none';render()}}

/* ---------- thumbnails: lazy, 4 at a time, first frame only ---------- */
const LQ=[];let act=0;
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){io.unobserve(e.target);LQ.push(e.target);pump()}}),{rootMargin:'500px'});
function pump(){while(act<4&&LQ.length){const v=LQ.shift();if(!v.isConnected)continue;act++;loadThumb(v)}}
function loadThumb(v){const it=find(v.closest('.vc').dataset.vk),list=[...(it?it.pv:[])];let done=false;
  const fin=()=>{if(!done){done=true;act--;pump()}};
  const next=()=>{const u=list.shift();if(!u){fin();return}v.src=u+'#t=0.1'};
  v.onloadeddata=()=>{fin();v.classList.add('ok')};v.onerror=next;setTimeout(fin,9000);v.preload='metadata';next()}
const find=id=>{for(const r of Object.values(RES)){const x=(r.items||[]).find(i=>i.id===id);if(x)return x}};

/* ---------- render ---------- */
function card(it,x){const n=x.n,sel=picks(n).find(p=>p.id===it.id),d=DLS[it.id],on=!!sel&&!d,cls=d?(d.err?'er':'dl'):on?'on':'';
  const res=it.h?(it.h>=1080||it.w>=1920?'≥1080p':it.h+'p'):'',est=it.w&&it.site!=='Pexels'?'~':'';
  return`<div class="vc ${cls}" data-vk="${esc(it.id)}" data-q="${x.id}"><div class="m" data-pv="1" style="background-image:url('${esc(it.thumb)}')"><video muted loop playsinline preload="none" ${it.pv.length?'data-has="1"':''}></video>
   <button class="ck" data-ck="1" title="${on?'Deselect':'Select + download HD'}">${d?(d.err?'!':d.res?'…':Math.round((d.pct||0)*100)+'%'):on?'✓':''}</button><div class="tg"><i class="du">${it.dur?fmt(it.dur):'…'}</i>${res?`<i>${est}${res}</i>`:''}<i class="sb sb-${esc(it.site)}">${esc(it.site)}</i>${it.resolving?'<i>loading preview…</i>':''}</div></div>
   ${d&&!d.err?`<div class="bar"><i style="width:${Math.round((d.pct||0)*100)}%"></i></div>`:''}${d&&d.err?`<div class="err" style="padding:4px 8px">${esc(d.err)}</div>`:''}${it.warn?`<div class="wn">${esc(it.warn)}</div>`:''}
   <div class="ft"><span>${esc(it.title||it.id.split(':')[1]||'')}</span>${it.page?`<a href="${esc(it.page)}" target="_blank" title="Open source page">↗</a>`:''}</div></div>`}
const uncertain=l=>l.unc||Q.some(x=>x.n===l.n&&x.fp&&x.fp!==SV.fp(l.text))||(PICK[l.n]||[]).some(p=>p.fp&&p.fp!==SV.fp(l.text));
function status(x){const q=(x.q||'').trim(),k=rk(q,sx(x)),bk=x.id+k,r=RES[k];
  if(BUSY[bk])return['searching','🔎 searching…'];if(ERR[bk])return['failed','✗ failed'];if(r)return['done','✓ '+Math.min(r.shown||10,r.items.length)+' of '+r.items.length+(r.done?'':'+')];
  if(QUEUED.has(x.id))return['queued','⏳ queued'];return q?['pending','⏳ pending']:['empty','— no keyword']}
function block(x,i,l){const q=(x.q||'').trim(),s=sx(x),k=rk(q,s),bk=x.id+k,r=RES[k],st=status(x);
  const left=r?r.items.length-(r.shown||10):0,canMore=r&&(left>0||!r.done),mb=BUSYM[bk]?'Loading more…':canMore?'More clips'+(left>0?' ('+left+' ready)':''):'No more results';
  return`<div class="ln" data-q="${x.id}"><div class="lh"><span class="mut">Keyword ${i+1}</span><select class="ksite" title="Source for THIS keyword only">${SITES.map(z=>`<option${z===s?' selected':''}>${z}</option>`).join('')}<option value="${ALL}"${s===ALL?' selected':''}>All free sites</option></select><span class="st st-${st[0]}">${st[1]}</span><input type="text" class="kwi" value="${esc(x.q)}" placeholder="English search keyword"><button class="p" data-go="1">Search</button>${r?'<button data-re="1" title="Fetch fresh results">↻</button>':''}<button data-my="kw" title="Add a clip from your computer for this keyword">＋ My clip</button><button data-rm="1" title="Remove this keyword">✕</button></div>
   ${WARN[bk]?`<div class="err" style="color:#7a5200">⚠ ${esc(WARN[bk])}</div>`:''}
   ${BUSY[bk]?'<div class="sk"></div>':ERR[bk]?`<div class="err">${esc(ERR[bk])} <button data-go="1">Retry</button></div>`:r?`<div class="grid">${r.items.slice(0,r.shown||10).map(it=>card(it,x)).join('')}</div><div class="mr"><button class="p" data-more="1" ${canMore&&!BUSYM[bk]?'':'disabled'}>${mb}</button><span class="mut">${Math.min(r.shown||10,r.items.length)} shown · ${esc(s===ALL?'all sites':s)}</span></div>`:`<div class="err" style="color:#777">${q?'Not searched on '+(s===ALL?'any site':s)+' yet.':'Type a keyword and press Enter.'}</div>`}</div>`}
function render(){
  if(!P){$('#detail').innerHTML='<div class="empty">No script loaded.<br>Open the workspace, paste your full script, then come back.</div>';$('#lineList').innerHTML='';return}
  const tot=P.lines.reduce((a,l)=>a+picks(l.n).length,0);$('#sSel').textContent=tot+' selected';
  $('#lineList').innerHTML='<b>Segments with footage</b>'+(P.lines.filter(l=>picks(l.n).length).map(l=>`<div class="mut" style="margin:3px 0"><b>${l.n}.</b> ${esc(snip(l.text,48))} — ${picks(l.n).length} clip${picks(l.n).length>1?'s':''}</div>`).join('')||'<div class="mut">none yet</div>');
  const only=$('#onlyKw').checked,orph=Q.filter(x=>!line(x.n)),nUnc=P.lines.filter(uncertain).length;
  $('#detail').innerHTML=trayHtml()+(nUnc?`<div class="uw top">⚠ ${nUnc} segment${nUnc>1?'s have':' has'} changed text since keywords/clips were linked. Check them below and press “Confirm link”.</div>`:'')
   +(orph.length?`<div class="uw top">⚠ ${orph.length} keyword${orph.length>1?'s':''} lost their script segment: ${orph.map(x=>`“${esc(snip(x.q,30))}” <button data-orm="${x.id}">remove</button>`).join(' ')}</div>`:'')
   +P.lines.filter(l=>!only||Q.some(x=>x.n===l.n)).map(l=>{const xs=Q.filter(x=>x.n===l.n),pk=picks(l.n),bad=uncertain(l);
   return`<div class="sg" data-n="${l.n}"><div class="sh"><div class="n">${l.n}</div><div class="tt">${esc(snip(l.text,260))}</div><span class="mut">${pk.length?pk.length+' clip'+(pk.length>1?'s':''):''}</span><button data-my="seg" title="Add a clip from your computer">＋ My clip</button><button data-addkw="1">+ Add another keyword</button></div>
   ${bad?`<div class="uw">⚠ Script text changed. Are these keywords/clips still right for this sentence? <button data-conf="1">Confirm link</button></div>`:''}
   ${pk.length?`<div class="strip">${pk.map(p=>`<span class="chip" draggable="true" data-mid="${p.mediaId}" data-n="${l.n}" title="Drag to reorder"><button data-mv="-1" title="Earlier">◀</button>${esc(p.site)} · ${esc((p.title||p.id.split(':')[1]||'').slice(0,24))}${p.dur?' · '+fmt(p.dur):''}${p.q?` <small>(${esc(snip(p.q,24))})</small>`:''}<button data-mv="1" title="Later">▶</button><button data-un="1" title="Deselect">✕</button></span>`).join('')}</div>`:''}
   ${xs.map((x,i)=>block(x,i,l)).join('')}</div>`}).join('')||'<div class="empty">No segments to show.</div>';
  const sq=Q.filter(x=>(x.q||'').trim()),c=n=>sq.filter(x=>status(x)[0]===n).length;$('#sSum').textContent=sq.length?`${c('done')} done · ${c('searching')} searching · ${c('pending')+c('queued')} pending · ${c('failed')} failed`:'';
  wire();kickResolve()}
function wire(){document.querySelectorAll('.vc video').forEach(v=>{const m=v.parentElement;
  m.onmouseenter=()=>{if(v.readyState>0)v.play().catch(()=>{})};m.onmouseleave=()=>v.pause();
  v.onloadedmetadata=()=>{const c=v.closest('.vc'),it=find(c.dataset.vk);if(it&&!it.dur&&isFinite(v.duration)){it.dur=v.duration;document.querySelectorAll(`[data-vk="${CSS.escape(it.id)}"] .du`).forEach(e=>e.textContent=fmt(v.duration));saveRes()}};
  if(v.dataset.has)io.observe(v)})}

/* ---------- select / deselect ---------- */
async function select(it,qid){const x=qi(qid);if(!x)return;if(x.n==null||!line(x.n)){toast('This keyword has no valid script segment');return}const n=x.n;
  if(DLS[it.id]||picks(n).some(p=>p.id===it.id))return;if(it.paid&&!confirm(it.site+' is a paid library. Previews are watermarked and clean downloads need a licence or subscription.\n\nDownload whatever file the page offers anyway?'))return;DLS[it.id]={pct:0};cancelled.delete(it.id);render();
  try{if(it.resolve&&!it.dl.length){DLS[it.id].res=1;render();const r=await chrome.runtime.sendMessage({t:'RESOLVE',page:it.page});if(!r||!r.ok||!r.urls.length)throw new Error((r&&r.error)||'No download link found. Open ↗ source page, log in, retry.');it.dl=r.urls;DLS[it.id].res=0}}
  catch(e){DLS[it.id]={err:e.message};toast('✗ '+e.message);render();setTimeout(()=>{if(DLS[it.id]&&DLS[it.id].err){delete DLS[it.id];render()}},7000);return}
  const r=await chrome.runtime.sendMessage({t:'GRAB',urls:it.dl,pageUrl:it.page||it.dl[0],n,append:true,noAdvance:true,key:it.id,dur:it.dur,w:null,h:null,fq:x.q}).catch(e=>({ok:false,error:e.message}));
  if(r&&r.ok){delete DLS[it.id];if(cancelled.has(it.id)){await chrome.runtime.sendMessage({t:'DROP',n,id:r.mediaId});cancelled.delete(it.id)}else{(PICK[n]=PICK[n]||[]).push({id:it.id,mediaId:r.mediaId,site:it.site,title:it.title,dur:it.dur,q:x.q,fp:SV.fp(line(n).text)});await savePick();toast('✓ Saved to segment '+n);patchProbe(n,r.mediaId)}}
  else{DLS[it.id]={err:(r&&r.error)||'Download failed'};toast('✗ '+DLS[it.id].err);setTimeout(()=>{if(DLS[it.id]&&DLS[it.id].err){delete DLS[it.id];render()}},7000)}render()}
async function unselect(n,mid){PICK[n]=(PICK[n]||[]).filter(p=>p.mediaId!==mid);await savePick();render();await chrome.runtime.sendMessage({t:'DROP',n,id:mid})}

$('#detail').addEventListener('click',async e=>{const b=e.target.closest('button'),sg=e.target.closest('.sg'),tr=e.target.closest('.tr');
  if(tr&&b){const t=TRAY.find(z=>z.rec.id===tr.dataset.t);if(!t)return;
    if(b.dataset.td){if(confirm('Delete “'+t.rec.name+'” from the tray? The saved copy will be removed.')){URL.revokeObjectURL(t.url);TRAY=TRAY.filter(z=>z!==t);if(!t.unsaved)await SV.del('media',t.rec.id);render()}return}
    if(b.dataset.ta){const qid=tr.querySelector('.ts').value,num=+tr.querySelector('.tnum').value,x=qid&&qi(qid),n=x?x.n:num;if(!n||!line(n))return toast('Pick a keyword or type a valid segment number');await assignTray(t,n,x?x.q:'');return}}
  if(b&&b.dataset.mv){const c=b.closest('.chip');moveClip(+c.dataset.n,c.dataset.mid,null,+b.dataset.mv);return}
  if(b&&b.dataset.my&&sg){const ln=b.closest('.ln'),x=ln&&qi(ln.dataset.q);pend={n:+sg.dataset.n,q:x?x.q:''};fImp.click();return}
  if(b&&b.dataset.orm){Q=Q.filter(z=>z.id!==b.dataset.orm);saveQ();render();return}
  if(!sg)return;const n=+sg.dataset.n;
  if(b&&b.dataset.addkw){const x={id:SV.uid(),q:'',n,fp:SV.fp(line(n).text)};Q.push(x);saveQ();render();const i=document.querySelector(`[data-q="${x.id}"] .kwi`);i&&i.focus();return}
  if(b&&b.dataset.conf){const f=SV.fp(line(n).text);Q.forEach(x=>{if(x.n===n)x.fp=f});(PICK[n]||[]).forEach(p=>p.fp=f);saveQ();savePick();await SV.mutate(p=>{const l=p.lines.find(z=>z.n===n);if(l)l.unc=false;return p});toast('Link confirmed');return}
  if(b&&b.dataset.un){const c=b.closest('.chip');unselect(+c.dataset.n,c.dataset.mid);return}
  const ln=e.target.closest('.ln');if(!ln)return;const qid=ln.dataset.q,x=qi(qid),vc=e.target.closest('.vc');
  if(b&&b.dataset.go){kwChange(qid,ln.querySelector('.kwi').value,true);return}
  if(b&&b.dataset.re){search(qid,true);return}
  if(b&&b.dataset.rm){Q=Q.filter(z=>z.id!==qid);saveQ();render();return}
  if(b&&b.dataset.more){more(qid);return}
  if(!vc)return;const it=find(vc.dataset.vk);if(!it)return;
  if(e.target.closest('[data-ck]')){const d=DLS[it.id],s=picks(x.n).find(p=>p.id===it.id);
    if(d&&!d.err){cancelled.add(it.id);delete DLS[it.id];render();toast('Cancelled');return}if(s)unselect(x.n,s.mediaId);else select(it,qid);return}
  if(e.target.closest('[data-pv]'))preview(it,qid)});
$('#detail').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.classList.contains('kwi'))kwChange(e.target.closest('.ln').dataset.q,e.target.value,true)});
$('#detail').addEventListener('change',e=>{if(e.target.classList.contains('ksite')){const x=qi(e.target.closest('.ln').dataset.q);if(x){x.site=e.target.value;saveQ();render();search(x.id)}return}
  if(e.target.classList.contains('kwi'))kwChange(e.target.closest('.ln').dataset.q,e.target.value,false)});
async function kwChange(qid,v,go){v=v.trim();const x=qi(qid);if(!x)return;const changed=v!==(x.q||'');if(changed){x.q=v;saveQ()}if(v&&(changed||go))await search(qid,go&&!changed)}

/* ---------- preview ---------- */
function preview(it,qid){const x=qi(qid),sel=x&&picks(x.n).find(p=>p.id===it.id);$('#card').style.width='900px';$('#card').innerHTML=`<video id="pvv" controls autoplay loop playsinline></video><div class="r"><b>${esc(it.site)}</b><span class="mut">${esc(it.title||'')} ${it.dur?'· '+fmt(it.dur):''} ${it.h?'· up to '+it.h+'p':''}</span><span style="flex:1"></span><button id="pvX">Close</button><button class="p" id="pvS">${sel?'✓ Selected – click to deselect':'Select + download HD'}</button></div><p class="mut">Preview plays a lower-quality sample. Selecting downloads the HD file.</p>`;$('#modal').style.display='flex';
  const v=$('#pvv'),src=[...it.pv];v.onerror=()=>{if(src.length>1){src.shift();v.src=src[0]}};if(src[0])v.src=src[0];else v.outerHTML='<div class="empty">No preview available. Open ↗ source page.</div>';
  $('#pvX').onclick=closeM;$('#pvS').onclick=()=>{closeM();sel?unselect(x.n,sel.mediaId):select(it,qid)}}
const closeM=()=>{const v=$('#pvv');if(v)v.pause();$('#modal').style.display='none';$('#card').innerHTML=''};
$('#modal').addEventListener('mousedown',e=>{if(e.target.id==='modal')closeM()});addEventListener('keydown',e=>{if(e.key==='Escape')closeM()});


/* ---------- own clips: any source (friend, manual download, project folder) ---------- */
let TRAY=[],pend=null;const TURL=new Map();
const isVid=f=>/^video\//.test(f.type)||/\.(mp4|mov|webm|m4v|mkv)$/i.test(f.name);
const numFromName=nm=>{const m=/^(?:line|script|seg(?:ment)?|clip|scene|#)?[\s_\-]*(\d{1,4})(?!\d)/i.exec(nm.replace(/\.[^.]+$/,''));return m?+m[1]:null};
const mb=s=>(s/1048576).toFixed(1)+' MB';
/* content fingerprint: SHA-256 of size + whole file (<=32 MB) or head/middle/tail 1 MB samples. Name/size alone never counts. */
async function hashBlob(b){const S=1<<20,full=b.size<=32*S,parts=full?[b]:[b.slice(0,S),b.slice(Math.floor(b.size/2)-S/2,Math.floor(b.size/2)+S/2),b.slice(b.size-S)],bufs=await Promise.all(parts.map(x=>x.arrayBuffer()));
  const tot=new Uint8Array(bufs.reduce((a,x)=>a+x.byteLength,0)+8);let o=0;bufs.forEach(x=>{tot.set(new Uint8Array(x),o);o+=x.byteLength});new DataView(tot.buffer).setFloat64(tot.length-8,b.size);
  const d=await crypto.subtle.digest('SHA-256',tot);return(full?'f:':'s:')+[...new Uint8Array(d)].slice(0,16).map(x=>x.toString(16).padStart(2,'0')).join('')+':'+b.size}
async function clipHash(c){if(c.hash)return c.hash;const m=await SV.get('media',c.id);if(!m||!m.blob)return null;const h=m.hash||await hashBlob(m.blob);if(!m.hash){m.hash=h;SV.put('media',m).catch(()=>{})}c.hash=h;return h}
/* returns {where:'segment 3'|'tray', name, same:boolean(same segment)} or null */
async function findDup(hash,size,n,skipId){for(const l of (P?P.lines:[]))for(const c of clipsOn(l)){if(c.id===skipId||(c.size&&c.size!==size))continue;const h=await clipHash(c);if(h&&h===hash)return{where:'segment '+l.n,name:c.name,same:l.n===n}}
  const t=TRAY.find(t=>t.rec.id!==skipId&&t.rec.hash===hash);return t?{where:'the unassigned tray',name:t.rec.name,same:false,tray:true}:null}
const probe=blob=>new Promise(res=>{const v=document.createElement('video'),u=URL.createObjectURL(blob);v.muted=true;v.preload='auto';const fin=r=>{URL.revokeObjectURL(u);res(r)};v.onerror=()=>fin(null);setTimeout(()=>fin(null),15000);
  v.onloadedmetadata=()=>{v.currentTime=Math.min(.5,(v.duration||1)/2)};v.onseeked=()=>{const c=document.createElement('canvas');c.width=128;c.height=72;c.getContext('2d').drawImage(v,0,0,128,72);fin({dur:v.duration,w:v.videoWidth,h:v.videoHeight,thumb:c.toDataURL('image/jpeg',.6)})};v.src=u});
async function patchProbe(n,mid){const m=await SV.get('media',mid);if(!m)return;const info=await probe(m.blob)||{},hash=m.hash||await hashBlob(m.blob);if(!m.hash){m.hash=hash;SV.put('media',m).catch(()=>{})}
  await SV.mutate(p=>{const l=p.lines.find(z=>z.n===n);if(!l)return p;const t=l.mediaId===mid?l:(l.extra||[]).find(e=>e.id===mid);if(t)Object.assign(t,info,{hash});return p});
  const pk=(PICK[n]||[]).find(p=>p.mediaId===mid);if(pk&&info.dur){pk.dur=info.dur;savePick()}}
async function linkMedia(n,q,m){const l=line(n);
  await SV.mutate(p=>{const x=p.lines.find(z=>z.n===n);if(!x)return p;const c={id:m.id,name:m.name,size:m.size,dur:m.dur||null,w:m.w||null,h:m.h||null,thumb:m.thumb||null,inT:0,outT:null,srcPage:'(imported file)',fq:q||null,hash:m.hash||null};
    if(x.mediaId)(x.extra=x.extra||[]).push(c);else Object.assign(x,{mediaId:m.id,name:c.name,size:c.size,dur:c.dur,w:c.w,h:c.h,thumb:c.thumb,inT:0,outT:null,srcUrl:null,srcPage:'(imported file)',fq:q||null,hash:c.hash});p.updated=Date.now();return p});
  (PICK[n]=PICK[n]||[]).push({id:'file:'+m.id,mediaId:m.id,site:'My file',title:m.name,dur:m.dur||null,q:q||'',fp:SV.fp(l.text)});await savePick();P=await SV.proj();patchProbe(n,m.id)}
async function dupCheck(hash,size,n,name,skipId){const d=await findDup(hash,size,n,skipId);if(!d)return true;
  if(d.same){toast('Skipped “'+name+'”: identical video already on segment '+n+' (“'+d.name+'”)');return false}
  return confirm('“'+name+'” has the same video content as “'+d.name+'” already in '+d.where+'.\n\nAdd it here anyway?')}
async function addClip(file,n,q){const l=line(n);if(!l)return false;const hash=await hashBlob(file);if(!await dupCheck(hash,file.size,n,file.name))return false;
  const id=SV.uid();try{await SV.put('media',{id,blob:file,name:file.name,type:file.type,size:file.size,hash,added:Date.now()})}catch(e){toast('✗ Could not save “'+file.name+'” ('+e.message+'). Browser storage may be full. Not added.');return false}
  await linkMedia(n,q,{id,name:file.name,size:file.size,hash});return true}
/* tray: stored in IndexedDB (media store, tray:true). Survives refresh / navigation / closing the extension. */
async function loadTray(){const all=(await SV.all('media')).filter(m=>m.tray);TRAY.forEach(t=>t.unsaved||URL.revokeObjectURL(t.url));TRAY=[...TRAY.filter(t=>t.unsaved),...all.sort((a,b)=>(a.added||0)-(b.added||0)).map(rec=>({rec,url:URL.createObjectURL(rec.blob)}))]}
async function trayAdd(file){let unsavedFlag=false;const hash=await hashBlob(file),d=await findDup(hash,file.size,null);
  if(d&&!confirm('“'+file.name+'” has the same video content as “'+d.name+'” already in '+d.where+'.\n\nAdd it to the tray anyway?'))return false;
  const rec={id:SV.uid(),blob:file,name:file.name,type:file.type,size:file.size,hash,tray:true,added:Date.now(),lastModified:file.lastModified};
  try{await SV.put('media',rec);const chk=await SV.get('media',rec.id);if(!chk||!chk.blob||chk.blob.size!==file.size)throw new Error('verification failed');TRAY.push({rec,url:URL.createObjectURL(file)})}
  catch(e){unsavedFlag=true;TRAY.push({rec,url:URL.createObjectURL(file),unsaved:true});toast('⚠ “'+file.name+'” could NOT be saved ('+e.message+'). It is only in this page. Link it now, or reselect the file after a reload.')}
  probe(file).then(async info=>{if(!info)return;Object.assign(rec,{dur:info.dur,w:info.w,h:info.h,thumb:info.thumb});if(!TRAY.find(t=>t.rec===rec&&t.unsaved))SV.put('media',rec).catch(()=>{});render()});return unsavedFlag?2:true}
async function importFiles(files,forceN,q){const vids=[...files].filter(isVid).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));if(!vids.length)return toast('No video files found');let ok=0,tr=0,bad=0;
  for(const f of vids){const n=forceN??numFromName(f.name);if(n!=null&&line(n)){if(await addClip(f,n,q))ok++}else{const r=await trayAdd(f);if(r===2)bad++;else if(r)tr++}}
  P=await SV.proj();render();toast((bad?'⚠ '+bad+' clip'+(bad>1?'s':'')+' could NOT be saved (see red warning in tray). ':'')+ok+' linked'+(tr?' · '+tr+' saved to the Unassigned tray (top of list)':''))}
async function assignTray(t,n,q){const rec=t.rec;if(!line(n))return toast('No such segment');if(!await dupCheck(rec.hash||await hashBlob(rec.blob),rec.size,n,rec.name,rec.id))return;
  if(t.unsaved){try{await SV.put('media',{...rec,tray:false})}catch(e){return toast('✗ Could not save: '+e.message)}}else await SV.put('media',{...rec,tray:false});
  TRAY=TRAY.filter(z=>z!==t);URL.revokeObjectURL(t.url);await linkMedia(n,q,{...rec,id:rec.id});render();toast('Linked to segment '+n)}
const fImp=$('#fImp'),fDir=$('#fDir');
fImp.onchange=()=>{const p=pend;pend=null;const fs=[...fImp.files];fImp.value='';importFiles(fs,p&&p.n,p&&p.q)};fDir.onchange=()=>{const fs=[...fDir.files];fDir.value='';importFiles(fs)};
$('#bImp').onclick=()=>{pend=null;fImp.click()};$('#bDir').onclick=()=>fDir.click();
addEventListener('dragover',e=>{if(e.dataTransfer&&[...e.dataTransfer.types].includes('Files')){e.preventDefault();document.querySelectorAll('.dz').forEach(x=>x.classList.remove('dz'));const s=e.target.closest&&e.target.closest('.sg');if(s)s.classList.add('dz')}});
addEventListener('drop',e=>{if(!(e.dataTransfer&&e.dataTransfer.files.length))return;e.preventDefault();document.querySelectorAll('.dz').forEach(x=>x.classList.remove('dz'));const s=e.target.closest&&e.target.closest('.sg'),l=e.target.closest&&e.target.closest('.ln'),x=l&&qi(l.dataset.q);
  importFiles(e.dataTransfer.files,s?+s.dataset.n:undefined,x&&x.q||undefined)});
const trayHtml=()=>TRAY.length?`<div class="tray"><b>Unassigned clips (${TRAY.length})</b> <span class="mut">Saved in this browser (not linked to the original file), so they survive refresh and reopening. Clearing browser data or removing the extension deletes them.</span>${TRAY.map(t=>`<div class="tr" data-t="${t.rec.id}"><video src="${t.url}#t=0.1" muted preload="metadata"></video><span class="tn">${esc(t.rec.name)} <small>${mb(t.rec.size)}${t.rec.dur?' · '+fmt(t.rec.dur):''}</small>${t.unsaved?' <b style="color:#b3261e">⚠ NOT SAVED – lost on reload; reselect file if it vanishes</b>':' <small>✓ saved</small>'}</span><select class="ts"><option value="">→ keyword…</option>${Q.filter(x=>line(x.n)&&x.q).map(x=>`<option value="${x.id}">${x.n} · ${esc(snip(x.q,40))}</option>`).join('')}</select><input type="number" class="tnum" min="1" placeholder="or segment #"><button class="p" data-ta="1">Link</button><button data-td="1" title="Delete from tray">✕</button></div>`).join('')}</div>`:'';
/* reorder clips inside a segment */
async function moveClip(n,mid,toMid,dir){const ids=clipsOn(line(n)).map(c=>c.id),i=ids.indexOf(mid);if(i<0)return;ids.splice(i,1);
  let j=toMid?ids.indexOf(toMid):-1;if(toMid&&j<0)return;if(toMid)ids.splice(dir>0?j+1:j,0,mid);else ids.splice(Math.max(0,Math.min(ids.length,i+dir)),0,mid);
  await SV.mutate(p=>{SV.reorder(p,n,ids);return p});P=await SV.proj();render()}
let dragC=null;
$('#detail').addEventListener('dragstart',e=>{const c=e.target.closest&&e.target.closest('.chip');if(!c)return;dragC={n:+c.dataset.n,mid:c.dataset.mid};e.dataTransfer.setData('text/plain',c.dataset.mid);e.dataTransfer.effectAllowed='move'});
$('#detail').addEventListener('dragover',e=>{const c=e.target.closest&&e.target.closest('.chip');if(dragC&&c&&+c.dataset.n===dragC.n){e.preventDefault();document.querySelectorAll('.chip.ov').forEach(x=>x.classList.remove('ov'));c.classList.add('ov')}});
$('#detail').addEventListener('drop',e=>{const c=e.target.closest&&e.target.closest('.chip');document.querySelectorAll('.chip.ov').forEach(x=>x.classList.remove('ov'));if(!dragC||!c||+c.dataset.n!==dragC.n||c.dataset.mid===dragC.mid){dragC=null;return}
  e.preventDefault();const ids=clipsOn(line(dragC.n)).map(x=>x.id),dir=ids.indexOf(dragC.mid)<ids.indexOf(c.dataset.mid)?1:-1,d=dragC;dragC=null;moveClip(d.n,d.mid,c.dataset.mid,dir)});
$('#detail').addEventListener('dragend',()=>{dragC=null;document.querySelectorAll('.chip.ov').forEach(x=>x.classList.remove('ov'))});

/* ---------- toolbar ---------- */
const todo=(own)=>Q.filter(x=>(x.q||'').trim()&&(own||!x.site)&&!(RES[rk(x.q,sx(x))]&&RES[rk(x.q,sx(x))].items)).map(x=>x.id);
$('#site').onchange=async e=>{site=e.target.value;await chrome.storage.local.set({fndSite:site});render();searchMany(todo())};
$('#bAll').onclick=()=>searchMany(todo(true));
$('#onlyKw').onchange=render;
$('#bLoad').onclick=()=>{if(!P)return toast('Load a script in the workspace first');
  const rows=$('#kws').value.replace(/\r/g,'').split('\n').map(s=>s.trim()).filter(Boolean);if(!rows.length)return;
  const parsed=rows.map(r=>{const m=/^(\d{1,4})\s*[:.)\-]\s*(.+)$/.exec(r);return m?{n:+m[1],k:m[2].trim()}:{n:null,k:r}}),explicit=parsed.every(p=>p.n!=null);
  const ids=[],touched=new Set(),skipped=[];let cnt=0;
  parsed.forEach((p,i)=>{const n=explicit?p.n:(P.lines[i]&&P.lines[i].n),k=(explicit?p.k:p.k.replace(/^\d{1,4}\s*[:.)\-]\s*/,'')).trim();if(!k)return;const l=line(n);if(!l){skipped.push(explicit?p.n:i+1);return}
    const prim=Q.find(x=>x.n===n);cnt++;
    if(prim&&!touched.has(n)){if(prim.q!==k){prim.q=k;ids.push(prim.id)}}
    else if(!Q.some(x=>x.n===n&&x.q.trim().toLowerCase()===k.toLowerCase())){const x={id:SV.uid(),q:k,n,fp:SV.fp(l.text)};Q.push(x);ids.push(x.id)}
    touched.add(n)});
  saveQ();render();toast(cnt+' keyword'+(cnt!==1?'s':'')+' applied to '+touched.size+' segment'+(touched.size!==1?'s':'')+(skipped.length?' · no such segment: '+skipped.slice(0,6).join(', '):''));
  searchMany(ids.filter(id=>{const x=qi(id);return x&&!(RES[rk(x.q,sx(x))]&&RES[rk(x.q,sx(x))].items)}))};
$('#optTabs').onchange=e=>{chrome.storage.local.set({fndTabs:e.target.checked});kickResolve()};chrome.storage.local.get('fndTabs').then(s=>{$('#optTabs').checked=!!s.fndTabs});
$('#bDiag').onclick=async()=>{const q=(Q.find(x=>(x.q||'').trim())||{}).q||'pharmacy';$('#card').style.width='820px';$('#card').innerHTML='<h2>Diagnosing '+esc(site)+'…</h2><p class="mut">Keyword: '+esc(q)+'</p>';$('#modal').style.display='flex';
  const r=await chrome.runtime.sendMessage({t:'DIAG',site,q,tabs:$('#optTabs').checked}).catch(e=>({text:'Error: '+e.message}));
  $('#card').innerHTML='<h2>Diagnose: '+esc(site)+'</h2><pre id="dg" style="white-space:pre-wrap;max-height:60vh;overflow:auto;font-size:12px;background:#f4f4f8;padding:10px;border-radius:8px">'+esc(r.text)+'</pre><div class="r"><button id="dgC" class="p">Copy</button><button id="dgX">Close</button></div>';
  $('#dgC').onclick=()=>{navigator.clipboard.writeText(r.text);toast('Copied')};$('#dgX').onclick=closeM};
$('#bWs').onclick=()=>location.href='workspace.html';
$('#bEditor').onclick=()=>{if(!P||!P.lines.some(l=>l.mediaId))return toast('Select at least one video first');location.href='editor-host.html'};
load();

/* Videezy/Vecteezy hide preview files until the clip page is opened: resolve them one at a time through the single fallback tab (only if "Tab fallback" is ticked). */
let resolving=false;
async function kickResolve(){if(resolving||!$('#optTabs').checked)return;const todo=[];for(const x of Q){const r=RES[rk((x.q||'').trim(),sx(x))];if(r)r.items.slice(0,r.shown||10).forEach(it=>{if(it.resolve&&!it.pv.length&&!it.rtried)todo.push(it)})}
  if(!todo.length)return;resolving=true;
  for(const it of todo){it.rtried=true;it.resolving=true;render();const r=await chrome.runtime.sendMessage({t:'RESOLVE',page:it.page}).catch(e=>({ok:false,error:e.message}));it.resolving=false;
    if(r&&r.ok){const v=r.urls.filter(u=>/\.(mp4|webm)(\?|$)/i.test(u));if(v.length)it.pv=v;if(r.urls.length)it.dl=[...new Set([...r.urls])]}else it.rerr=(r&&r.error)||'preview not found';saveRes();render()}
  resolving=false}
