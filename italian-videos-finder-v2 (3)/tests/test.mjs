import chromium from '@sparticuz/chromium';import puppeteer from 'puppeteer-core';import http from 'http';import fs from 'fs';import path from 'path';
const EXT=path.resolve(new URL('..',import.meta.url).pathname),AS=process.env.ASSETS||'/tmp/pt/assets',UD='/tmp/pt/ud';fs.rmSync(UD,{recursive:true,force:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json'};
const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/workspace.html';const f=path.join(EXT,u);if(fs.existsSync(f)&&fs.statSync(f).isFile()){r.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)}else{r.writeHead(404);r.end()}}).listen(0);
const PORT=srv.address().port,BASE='http://localhost:'+PORT;
const res=[];const ok=(name,cond,info='')=>{res.push([cond?'PASS':'FAIL',name,info]);console.log((cond?'PASS ':'FAIL ')+name+(info?'  → '+info:''))};
const SCRIPT=['1: Entri in farmacia per comprare un cerotto.','2: Il farmacista ti guarda.','3: Scegli una crema.','4: Paghi alla cassa.','5: Esci dal negozio.','6: Torni a casa.'].join('\n');
const launch=async()=>puppeteer.launch({executablePath:await chromium.executablePath(),headless:'shell',userDataDir:UD,args:[...chromium.args,'--no-sandbox','--autoplay-policy=no-user-gesture-required'],defaultViewport:{width:1400,height:1000}});
const ids=['1111','2222','3333','4444'],vids=['s1.mp4','s2.mp4','s3.mp4','s1.mp4'];
async function setup(page,errs){await page.evaluateOnNewDocument(fs.readFileSync(path.resolve(new URL('shim.js',import.meta.url).pathname),'utf8'));page.on('pageerror',e=>errs.push('pageerror: '+e.message+' @'+(e.stack||'').split('\n').slice(1,3).join(' ')));page.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text())});
 page.on('dialog',async d=>{dlg.push(d.message().slice(0,300));await d.accept()});
 await page.setRequestInterception(true);
 page.on('request',rq=>{const u=rq.url();const cors={'access-control-allow-origin':rq.headers().origin||'*','access-control-allow-credentials':'true'};
  if(rq.method()==='OPTIONS')return rq.respond({status:204,headers:{...cors,'access-control-allow-headers':'*','access-control-allow-methods':'GET'}});
  if(/^https:\/\/www\.pexels\.com\/search\/videos\//.test(u)){pxUrls.push(u);const U=new URL(u),q=decodeURIComponent(U.pathname.split('/videos/')[1]).replace(/\/$/,''),pg=+(U.searchParams.get('page')||1);
   let list;if(/many/.test(q)){const cnt=[14,6,0][pg-1]||0;list=Array.from({length:cnt},(_,i)=>String(1000+(pg-1)*100+i))}else{const off=q.length%3;list=ids.slice(0,3).map(id=>String(+id+off*10))}
   const html=list.map(x=>`<video src="https://videos.pexels.com/video-files/${x}/${x}-sd_640_360_25fps.mp4"></video><a href="https://videos.pexels.com/video-files/${x}/${x}-hd_1920_1080_25fps.mp4">x</a>`).join('');return rq.respond({status:200,contentType:'text/html',headers:cors,body:html})}
  if(/^https:\/\/pixabay\.com\/videos\/search\//.test(u)){pbUrls.push(u);const html=[7001,7002,7003].map(i=>`<video src="https://cdn.pixabay.com/video/2023/05/01/${i}-99${i}_tiny.mp4"></video>`).join('');return rq.respond({status:200,contentType:'text/html',headers:cors,body:html})}
  if(/^https:\/\/cdn\.pixabay\.com\//.test(u))return rq.respond({status:200,contentType:'video/mp4',headers:cors,body:fs.readFileSync(AS+'/s2.mp4')});
  if(/(mixkit\.co|coverr\.co|videezy\.com|vecteezy\.com)/.test(u))return rq.respond({status:404,headers:cors,body:''});
  if(/^https:\/\/videos\.pexels\.com\//.test(u)){const id=+u.match(/video-files\/(\d+)/)[1];const f=AS+'/s'+(id%3+1)+'.mp4';return rq.respond({status:200,contentType:'video/mp4',headers:cors,body:fs.readFileSync(f)})}
  if(/fonts\.(googleapis|gstatic)\.com/.test(u))return rq.respond({status:200,contentType:'text/css',body:''});
  if(/pexels\.com/.test(u))return rq.respond({status:404,headers:cors,body:''});rq.continue()})}
const dlg=[];const errs=[];const pxUrls=[],pbUrls=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const proj=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('__cs')).proj);
const wait=(p,fn,arg,t=15000)=>p.waitForFunction(fn,{timeout:t},arg);
let br=await launch(),page=await br.newPage();await setup(page,errs);
try{
// 1 workspace paste
await page.goto(BASE+'/workspace.html');await page.waitForSelector('#bPaste');await page.click('#bPaste');await page.waitForSelector('#pt');await page.type('#pt',SCRIPT.slice(0,0));
await page.$eval('#pt',(e,v)=>{e.value=v;e.dispatchEvent(new Event('input'))},SCRIPT);await page.click('#pOk');await wait(page,()=>{try{return JSON.parse(localStorage.getItem('__cs')).proj.lines.length===6}catch(e){return false}});
ok('workspace: script loaded as 6 segments',(await proj(page)).lines.length===6);
// 2 finder keywords
await page.goto(BASE+'/finder.html');// ---- 6 keywords separated by blank lines (the user's real case) ----
await page.$eval('#kws',e=>e.value='a pharmacy shelf\n\nb pills closeup\n\nc cream jar\n\nd euro notes\n\ne price tag\n\nf gold box');await page.click('#bLoad');
await wait(page,()=>document.querySelectorAll('.sg .ln').length===6+0&&[...document.querySelectorAll('.sg .ln .st')].every(s=>/done/.test(s.className)),null,30000).catch(()=>{});
const mapped=await page.evaluate(()=>[...document.querySelectorAll('.sg')].filter(s=>s.querySelector('.kwi')).map(s=>s.dataset.n+':'+s.querySelector('.kwi').value).join('|'));
ok('blank lines between keywords: all 6 keywords land on segments 1..6 in order (none skipped)',mapped==='1:a pharmacy shelf|2:b pills closeup|3:c cream jar|4:d euro notes|5:e price tag|6:f gold box',mapped);
ok('every keyword searched, status “done” for all 6',await page.evaluate(()=>[...document.querySelectorAll('.sg .ln .st')].length===6&&[...document.querySelectorAll('.sg .ln .st')].every(s=>/done/.test(s.className))));
await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('__cs'));s.fndQ=[];s.fndRes={};s.fndPick={};localStorage.setItem('__cs',JSON.stringify(s))});await page.reload();await page.waitForSelector('#kws');
await page.$eval('#kws',e=>e.value='1: Person entering an Italian pharmacy\n\n2: Pharmacist looking at customer\n\n4: Cashier taking payment');await page.click('#bLoad');
await wait(page,()=>document.querySelectorAll('.vc').length>=9,null,20000);
ok('finder: keywords 1,2,(blank),4 → segments 1,2,4',await page.evaluate(()=>[...document.querySelectorAll('.sg')].filter(s=>s.querySelector('.kwi')).map(s=>s.dataset.n+':'+s.querySelector('.kwi').value).join('|')==='1:Person entering an Italian pharmacy|2:Pharmacist looking at customer|4:Cashier taking payment'));
ok('finder: 3 results per keyword shown',await page.evaluate(()=>[...document.querySelectorAll('.ln')].every(l=>l.querySelectorAll('.vc').length===3)));
// thumbnails
await sleep(2500);
const th=await page.evaluate(()=>[...document.querySelectorAll('.vc video')].map(v=>[v.readyState,v.videoWidth,v.classList.contains('ok')]));
ok('thumbnails: every card shows a decoded first frame without hover',th.length>=9&&th.every(t=>t[0]>=2&&t[1]>0&&t[2]),JSON.stringify(th.slice(0,3)));
ok('thumbnails: video background transparent (no black override)',await page.evaluate(()=>getComputedStyle(document.querySelector('.vc video')).backgroundColor==='rgba(0, 0, 0, 0)'));
// 3 select stock in seg 1 (two clips)
const sel=async(n,i)=>{await page.evaluate((n,i)=>document.querySelectorAll(`.sg[data-n="${n}"] .vc [data-ck]`)[i].click(),n,i)};
await sel(1,0);await wait(page,()=>document.querySelectorAll('.sg[data-n="1"] .chip').length===1,null,20000);
let pr=await proj(page);ok('stock select → clip stored on segment 1 with keyword',!!pr.lines[0].mediaId&&pr.lines[0].fq==='Person entering an Italian pharmacy',pr.lines[0].fq);
// add another keyword on segment 1
await page.evaluate(()=>document.querySelector('.sg[data-n="1"] [data-addkw]').click());await page.waitForSelector('.sg[data-n="1"] .ln:nth-of-type(2) .kwi, .sg[data-n="1"] .ln + .ln .kwi');
await page.type('.sg[data-n="1"] .ln + .ln .kwi','Close-up of medicine shelves');await page.keyboard.press('Enter');
await wait(page,()=>document.querySelectorAll('.sg[data-n="1"] .ln + .ln .vc').length===3,null,20000);
await page.evaluate(()=>document.querySelectorAll('.sg[data-n="1"] .ln + .ln .vc [data-ck]')[1].click());await wait(page,()=>document.querySelectorAll('.sg[data-n="1"] .chip').length===2,null,20000);
pr=await proj(page);ok('extra keyword clip linked to same segment, other segments untouched',pr.lines[0].extra.length===1&&pr.lines[0].extra[0].fq==='Close-up of medicine shelves'&&!pr.lines[1].mediaId&&!pr.lines[3].mediaId);
// deselect + reselect independence
await page.evaluate(()=>document.querySelector('.sg[data-n="1"] .ln + .ln .vc [data-ck]')&&0);

// keyword with slashes / commas / numbering → cleaned alternatives, no 404 URLs, no tabs
pxUrls.length=0;await page.evaluate(()=>document.querySelector('.sg[data-n="4"] [data-addkw]').click());await page.waitForSelector('.sg[data-n="4"] .ln + .ln .kwi');
await page.type('.sg[data-n="4"] .ln + .ln .kwi','4, luxury cream jar gold / expensive serum bottle / high end skincare product');await page.keyboard.press('Enter');
await wait(page,()=>document.querySelectorAll('.sg[data-n="4"] .ln + .ln .vc').length>=3,null,20000);
ok('keyword "4, a / b / c" → 3 cleaned alternatives requested, no %2F or comma in URLs',pxUrls.length===3&&pxUrls.every(u=>!/%2F|%2C/i.test(u))&&/luxury%20cream%20jar%20gold/.test(pxUrls[0]),pxUrls.join(' | '));
ok('keyword alternatives merged into one result group',await page.evaluate(()=>document.querySelectorAll('.sg[data-n="4"] .ln + .ln .vc').length)>=3);
ok('no browser tabs opened by searches',await page.evaluate(()=>window.__tabs)===0);

// ---- per-keyword source, status, More ----
const stBefore=pxUrls.length;
await page.evaluate(()=>{const s=document.querySelector('.sg[data-n="2"] .ksite');s.value='Pixabay';s.dispatchEvent(new Event('change',{bubbles:true}))});
await wait(page,()=>[...document.querySelectorAll('.sg[data-n="2"] .ln .vc .sb')].length>=3&&[...document.querySelectorAll('.sg[data-n="2"] .ln .vc .sb')].every(e=>e.textContent==='Pixabay'),null,20000);
ok('per-keyword source: keyword 2 → Pixabay shows Pixabay results only',true);
ok('per-keyword source: keyword 1 and 4 still Pexels (badge + dropdown), not re-searched',await page.evaluate(()=>['1','4'].every(n=>[...document.querySelectorAll(`.sg[data-n="${n}"] .ln .vc .sb`)].every(e=>e.textContent==='Pexels')&&document.querySelector(`.sg[data-n="${n}"] .ksite`).value==='Pexels'))&&pxUrls.length===stBefore&&pbUrls.length===1,'pexels reqs '+(pxUrls.length-stBefore)+' pixabay reqs '+pbUrls.length);
// All sites
await page.evaluate(()=>{const s=document.querySelector('.sg[data-n="4"] .ln .ksite');s.value='ALL';s.dispatchEvent(new Event('change',{bubbles:true}))});
await wait(page,()=>{const b=[...document.querySelectorAll('.sg[data-n="4"] .ln .vc .sb')].map(e=>e.textContent);return b.includes('Pexels')&&b.includes('Pixabay')},null,20000);
ok('"All sites": results merged from several sources, each card labelled',await page.evaluate(()=>{const b=new Set([...document.querySelectorAll('.sg[data-n="4"] .ln .vc .sb')].map(e=>e.textContent));return b.has('Pexels')&&b.has('Pixabay')}));
ok('"All sites": blocked/missing sources reported as a warning, others still shown',await page.evaluate(()=>document.querySelector('.sg[data-n="4"] .ln').textContent.includes('⚠')));
// failed status
await page.evaluate(()=>{const s=document.querySelector('.sg[data-n="2"] .ksite');s.value='Mixkit';s.dispatchEvent(new Event('change',{bubbles:true}))});
await wait(page,()=>document.querySelector('.sg[data-n="2"] .st-failed'),null,20000);
ok('status badge: failed search shows ✗ failed with a reason',await page.evaluate(()=>document.querySelector('.sg[data-n="2"] .st-failed').textContent.includes('failed')&&document.querySelector('.sg[data-n="2"] .err').textContent.length>10));
await page.evaluate(()=>{const s=document.querySelector('.sg[data-n="2"] .ksite');s.value='Pexels';s.dispatchEvent(new Event('change',{bubbles:true}))});
await wait(page,()=>document.querySelectorAll('.sg[data-n="2"] .ln .vc').length>=3,null,20000);
// More button on segment 5 with a keyword that has 14 + 6 + 0 results
await page.evaluate(()=>document.querySelector('.sg[data-n="5"] [data-addkw]').click());await page.waitForSelector('.sg[data-n="5"] .ln .kwi');
await page.type('.sg[data-n="5"] .ln .kwi','many things');await page.keyboard.press('Enter');
await wait(page,()=>document.querySelectorAll('.sg[data-n="5"] .ln .vc').length===10,null,20000);
ok('More: initial batch shows 10 of 14 fetched',await page.evaluate(()=>document.querySelectorAll('.sg[data-n="5"] .ln .vc').length)===10);
await page.evaluate(()=>document.querySelector('.sg[data-n="5"] .vc [data-ck]').click());await wait(page,()=>document.querySelectorAll('.sg[data-n="5"] .chip').length===1,null,20000);
const others=await page.evaluate(()=>['1','2','4'].map(n=>document.querySelectorAll(`.sg[data-n="${n}"] .ln .vc`).length).join());const reqs0=pxUrls.length;
await page.evaluate(()=>document.querySelector('.sg[data-n="5"] [data-more]').click());await wait(page,()=>document.querySelectorAll('.sg[data-n="5"] .ln .vc').length===14,null,15000);
ok('More #1: reveals the 4 already-fetched clips without a network request',pxUrls.length===reqs0);
await page.evaluate(()=>document.querySelector('.sg[data-n="5"] [data-more]').click());await wait(page,()=>document.querySelectorAll('.sg[data-n="5"] .ln .vc').length===20,null,15000);
const idsShown=await page.evaluate(()=>[...document.querySelectorAll('.sg[data-n="5"] .ln .vc')].map(v=>v.dataset.vk));
ok('More #2: fetched page 2 (6 new clips appended), no duplicates',new Set(idsShown).size===20&&/page=2/.test(pxUrls[pxUrls.length-1]),pxUrls[pxUrls.length-1]);
ok('More: previously selected clip still selected, chip intact',await page.evaluate(()=>document.querySelectorAll('.sg[data-n="5"] .vc.on').length===1&&document.querySelectorAll('.sg[data-n="5"] .chip').length===1));
await page.evaluate(()=>document.querySelector('.sg[data-n="5"] [data-more]').click());await wait(page,()=>document.querySelector('.sg[data-n="5"] [data-more]').disabled,null,15000);
ok('More #3: page 3 empty → button disabled "No more results"',await page.evaluate(()=>document.querySelector('.sg[data-n="5"] [data-more]').textContent.includes('No more')));
ok('More: other keywords untouched (same card counts, no extra requests for them)',await page.evaluate(()=>['1','2','4'].map(n=>document.querySelectorAll(`.sg[data-n="${n}"] .ln .vc`).length).join())===others&&pxUrls.slice(reqs0).every(u=>/many/.test(decodeURIComponent(u))),others);
// the select on seg 5 deselect to keep later counts stable
await page.evaluate(()=>document.querySelector('.sg[data-n="5"] .chip [data-un]').click());await sleep(1200);
// 4 own clip per-segment button
const [fc]=await Promise.all([page.waitForFileChooser(),page.evaluate(()=>document.querySelector('.sg[data-n="3"] [data-my="seg"]').click())]);await fc.accept([AS+'/friend1.mp4']);
await wait(page,()=>document.querySelectorAll('.sg[data-n="3"] .chip').length===1);pr=await proj(page);
ok('own clip via ＋ My clip → segment 3',pr.lines[2].name==='friend1.mp4');
// 5 multi-import: 006.mp4 (auto seg 6), IMG_2031 (tray), friend1_copy (same content as seg3 → other segment: confirm)
dlg.length=0;
const [fc2]=await Promise.all([page.waitForFileChooser(),page.click('#bImp')]);await fc2.accept([AS+'/006.mp4',AS+'/IMG_2031.mp4']);
await wait(page,()=>document.querySelectorAll('.tr').length===1&&document.querySelectorAll('.sg[data-n="6"] .chip').length===1,null,20000);
ok('import: 006.mp4 auto-linked to segment 6',true);ok('import: IMG_2031.mp4 went to Unassigned tray',await page.evaluate(()=>document.querySelector('.tr .tn').textContent.includes('IMG_2031')));
// duplicate checks
dlg.length=0;const [fc3]=await Promise.all([page.waitForFileChooser(),page.click('#bImp')]);await fc3.accept([AS+'/friend1_copy.mp4']);await sleep(2500);
ok('dedupe: renamed identical file → warns where it exists, asks before adding',dlg.some(d=>/same video content/.test(d)&&/segment 3|tray/.test(d)),dlg.join(' || '));
// same segment duplicate
const cnt3=await page.evaluate(()=>document.querySelectorAll('.sg[data-n="3"] .chip').length);
dlg.length=0;const [fc4]=await Promise.all([page.waitForFileChooser(),page.evaluate(()=>document.querySelector('.sg[data-n="3"] [data-my="seg"]').click())]);await fc4.accept([AS+'/friend1_copy.mp4']);await sleep(2000);
ok('dedupe: identical content already on same segment → skipped',await page.evaluate(()=>document.querySelectorAll('.sg[data-n="3"] .chip').length)===cnt3&&dlg.length===0);
// same name + same size, different content
dlg.length=0;const before=await page.evaluate(()=>document.querySelectorAll('.sg[data-n="3"] .chip').length);
const [fc5]=await Promise.all([page.waitForFileChooser(),page.evaluate(()=>document.querySelector('.sg[data-n="3"] [data-my="seg"]').click())]);await fc5.accept([AS+'/other/friend1.mp4']);
await wait(page,b=>document.querySelectorAll('.sg[data-n="3"] .chip').length===b+1,before,15000).catch(()=>{});
ok('dedupe: same name + same size but different content → NOT treated as duplicate',await page.evaluate(()=>document.querySelectorAll('.sg[data-n="3"] .chip').length)===before+1&&dlg.length===0);
// simulated drag-drop of file onto segment 5
const b64=fs.readFileSync(AS+'/friend2.mp4').toString('base64');
await page.evaluate(async b64=>{const bin=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));const f=new File([bin],'friend2.mp4',{type:'video/mp4'});const dt=new DataTransfer();dt.items.add(f);const el=document.querySelector('.sg[data-n="5"] .sh');
 el.dispatchEvent(new DragEvent('dragover',{dataTransfer:dt,bubbles:true,cancelable:true}));el.dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true}))},b64);
await wait(page,()=>document.querySelectorAll('.sg[data-n="5"] .chip').length===1).catch(()=>{});
ok('drag-drop (synthetic DragEvent) file onto segment 5 → linked',await page.evaluate(()=>document.querySelectorAll('.sg[data-n="5"] .chip').length)===1);
// probe metadata
await sleep(1500);pr=await proj(page);const l6=pr.lines[5];ok('own clip metadata probed (duration, size, thumb, hash)',l6.dur>1&&l6.w===320&&!!l6.thumb&&/^f:/.test(l6.hash||''),`dur=${l6.dur} w=${l6.w} hash=${(l6.hash||'').slice(0,8)}`);
// 6 tray persistence: reload
await page.reload();await page.waitForSelector('.tr',{timeout:10000});
ok('tray survives page refresh',await page.evaluate(()=>document.querySelector('.tr .tn').textContent.includes('IMG_2031')&&document.querySelector('.tr .tn').textContent.includes('saved')));
// navigate to workspace and back, new tab
await page.goto(BASE+'/workspace.html');await sleep(800);await page.goto(BASE+'/finder.html');await page.waitForSelector('.tr',{timeout:10000});ok('tray survives navigating away and back',true);
// blob playable after reload
ok('tray clip blob still playable after reload',await page.evaluate(()=>new Promise(r=>{const v=document.querySelector('.tr video');if(v.readyState>=2)return r(true);v.onloadeddata=()=>r(true);setTimeout(()=>r(false),6000)})));
// assign tray via segment number
await page.type('.tr .tnum','4');await page.click('.tr [data-ta]');await wait(page,()=>document.querySelectorAll('.tr').length===1&&document.querySelectorAll('.sg[data-n="4"] .chip').length>=1,null,15000);
pr=await proj(page);ok('tray clip assigned by segment number → linked to segment 4 and removed from tray',pr.lines[3].name==='IMG_2031.mp4'||(pr.lines[3].extra||[]).some(c=>c.name==='IMG_2031.mp4'));
// 7 reorder in seg 1: ▶ on first chip, then synthetic drag
const order=async()=>{pr=await proj(page);const l=pr.lines[0];return[l.mediaId,...(l.extra||[]).map(c=>c.id)]};
const o0=await order();await page.evaluate(()=>document.querySelector('.sg[data-n="1"] .chip [data-mv="1"]').click());await sleep(800);const o1=await order();
ok('reorder: ▶ moves clip later',o1.length===o0.length&&o1[0]===o0[1]&&o1[1]===o0[0],o0.join(',')+' → '+o1.join(','));
// add 3rd clip to seg1 to test drag
const [fc6]=await Promise.all([page.waitForFileChooser(),page.evaluate(()=>document.querySelector('.sg[data-n="1"] [data-my="seg"]').click())]);await fc6.accept([AS+'/friend2.mp4']);await wait(page,()=>document.querySelectorAll('.sg[data-n="1"] .chip').length===3,null,15000);
const o2=await order();
await page.evaluate(()=>{const ch=[...document.querySelectorAll('.sg[data-n="1"] .chip')],dt=new DataTransfer();const mk=(t,el)=>el.dispatchEvent(new DragEvent(t,{dataTransfer:dt,bubbles:true,cancelable:true}));mk('dragstart',ch[2]);mk('dragover',ch[0]);mk('drop',ch[0]);mk('dragend',ch[2])});
await sleep(1000);const o3=await order();ok('reorder: drag last chip onto first (synthetic DragEvent) → moved before it',o3[0]===o2[2]&&o3[1]===o2[0],o2.join(',')+' → '+o3.join(','));
await page.reload();await page.waitForSelector('.sg[data-n="1"] .chip');ok('reorder persists after refresh and chips follow clip order',(await order()).join()===o3.join()&&await page.evaluate(()=>[...document.querySelectorAll('.sg[data-n="1"] .chip')].length)===3);
// 8 open editor
const snap=await proj(page);const clipMap=pr=>pr.lines.map(l=>[l.n,l.mediaId?[l.mediaId,...(l.extra||[]).map(c=>c.id)].join(','):''].join(':')).join('|');const want=clipMap(snap);
const trayIds=await page.evaluate(()=>[...document.querySelectorAll('.tr')].map(e=>e.dataset.t));await page.click('#bEditor');await page.waitForFunction(()=>location.pathname.endsWith('editor-host.html'),{timeout:10000});
const edFrame=async()=>{for(let i=0;i<40;i++){const f=page.frames().find(f=>/editor\.html/.test(f.url()));if(f&&await f.evaluate(()=>(window.__log||[]).some(m=>m.t==='init')).catch(()=>false))return f;await sleep(500)}return null};
let ef=await edFrame();
const init=ef&&await ef.evaluate(()=>window.__log.find(m=>m.t==='init'));
ok('editor: init payload received',!!init);
if(init){const got=init.lines.map(l=>[l.n,l.clips.map(c=>c.mediaId).join(',')].join(':')).join('|');ok('editor: every segment’s clips (and order) match finder/project',got===want,'\n   want '+want+'\n   got  '+got);
 ok('editor: all clip blobs delivered, no tray/unassigned blobs leaked',init.lines.flatMap(l=>l.clips.map(c=>c.mediaId)).every(i=>init.blobs.includes(i))&&trayIds.length>0&&!trayIds.some(i=>init.blobs.includes(i)),'tray ids '+trayIds.length+' not in payload');}
await sleep(2500);
// 9 back & reopen
await page.reload();ef=await edFrame();
const init2=ef&&await ef.evaluate(()=>window.__log.find(m=>m.t==='init'));ok('editor: associations still identical after refreshing the editor',!!init2&&init2.lines.map(l=>[l.n,l.clips.map(c=>c.mediaId).join(',')].join(':')).join('|')===want);
await page.goto(BASE+'/finder.html');await page.waitForSelector('.sg');ok('back in finder: chips + keywords intact',await page.evaluate(()=>document.querySelectorAll('.sg[data-n="1"] .chip').length===3&&document.querySelectorAll('.sg[data-n="1"] .kwi').length===2));
await br.close();
// 10 full close/reopen
br=await launch();page=await br.newPage();await setup(page,errs);await page.goto(BASE+'/finder.html');await page.waitForSelector('.sg .chip',{timeout:10000});
const after=await proj(page);ok('browser closed & reopened: project, segment associations and clip order intact',clipMap(after)===want);
ok('reopened: segment 1 keeps both keywords and 3 clips',await page.evaluate(()=>document.querySelectorAll('.sg[data-n="1"] .chip').length===3&&document.querySelectorAll('.sg[data-n="1"] .kwi').length===2));
// 11 unassigned persists across close: add another tray file then reopen
const [fc7]=await Promise.all([page.waitForFileChooser(),page.click('#bImp')]);await fc7.accept([AS+'/other/friend1.mp4']);await wait(page,()=>document.querySelectorAll('.tr').length===2,null,15000);
await br.close();br=await launch();page=await br.newPage();await setup(page,errs);await page.goto(BASE+'/finder.html');await page.waitForSelector('.tr',{timeout:10000});
ok('tray clip survives closing and reopening the browser',await page.evaluate(()=>[...document.querySelectorAll('.tr .tn')].map(e=>e.textContent).join('|').includes('friend1_copy')&&[...document.querySelectorAll('.tr .tn')].length===2));
// 12 script change keeps associations
await page.goto(BASE+'/workspace.html');await page.waitForSelector('#bPaste');dlg.length=0;await page.click('#bPaste');await page.waitForSelector('#pt');
const NEW=['1: Nuova frase iniziale.',...SCRIPT.split('\n').map((l,i)=>(i+2)+': '+l.replace(/^\d+:\s*/,''))].join('\n');await page.$eval('#pt',(e,v)=>{e.value=v;e.dispatchEvent(new Event('input'))},NEW);await page.click('#pOk');await sleep(2500);
const np=await proj(page);ok('script re-paste with new first sentence: footage moved with its sentence (old seg 1 → 2)',np.lines[1].text.includes('farmacia')&&!!np.lines[1].mediaId&&(np.lines[1].extra||[]).length===2&&!np.lines[0].mediaId,dlg[0]||'');
await page.goto(BASE+'/finder.html');await page.waitForSelector('.sg');ok('after re-paste finder keywords follow their sentence',await page.evaluate(()=>document.querySelector('.sg[data-n="2"] .kwi')?.value==='Person entering an Italian pharmacy'&&!document.querySelector('.sg[data-n="1"] .kwi')));

// deselect removes clip + stored media (segment 5 own clip)
const m5=(await proj(page)).lines[6].mediaId;await page.goto(BASE+'/finder.html');await page.waitForSelector('.sg[data-n="7"] .chip');
await page.evaluate(()=>document.querySelector('.sg[data-n="7"] .chip [data-un]').click());await sleep(1500);
const afterDel=await proj(page);
ok('deselect ✕ removes clip from its segment (other segments untouched)',!afterDel.lines[6].mediaId&&!!afterDel.lines[1].mediaId&&!!afterDel.lines[5].mediaId);
const stillThere=await page.evaluate(async id=>!!(await SV.get('media',id)),m5);ok('deselect also deletes the stored media blob',!stillThere);
// storage failure → loud warning, not silent loss
await page.evaluate(()=>{const o=SV.put;SV.put=async(s,v)=>{if(v&&v.tray)throw new Error('QuotaExceededError (simulated)');return o(s,v)}});
const [fc9]=await Promise.all([page.waitForFileChooser(),page.click('#bImp')]);await fc9.accept([AS+'/friend2.mp4']);
await wait(page,()=>document.body.innerText.includes('NOT SAVED'),null,15000).catch(()=>{});
ok('storage failure: tray shows explicit “NOT SAVED” warning and toast, file kept in page',await page.evaluate(()=>document.body.innerText.includes('NOT SAVED')&&document.querySelector('#toast').textContent.includes('NOT be saved')));
}catch(e){ok('TEST HARNESS ERROR',false,e.stack.split('\n').slice(0,4).join(' / '))}
console.log('\nJS errors seen:',errs.length?errs.slice(0,8):'none');
console.log('\n'+res.filter(r=>r[0]==='PASS').length+' passed, '+res.filter(r=>r[0]==='FAIL').length+' failed');
await br.close();srv.close();process.exit(0);
