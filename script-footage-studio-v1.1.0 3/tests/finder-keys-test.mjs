import chromium from '@sparticuz/chromium';import puppeteer from 'puppeteer-core';import http from 'http';import fs from 'fs';import path from 'path';
const EXT=path.resolve(new URL('..',import.meta.url).pathname),MP4=fs.readFileSync((process.env.ASSETS||'/tmp/pt/assets')+'/s1.mp4');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json'};
const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/workspace.html';const f=path.join(EXT,u);if(fs.existsSync(f)&&fs.statSync(f).isFile()){r.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)}else{r.writeHead(404);r.end()}}).listen(0);
const BASE='http://localhost:'+srv.address().port;const res=[];const ok=(n,c,i='')=>{res.push(c);console.log((c?'PASS ':'FAIL ')+n+(i?'  -> '+i:''))};const sleep=ms=>new Promise(r=>setTimeout(r,ms));
fs.rmSync('/tmp/pt_ud2',{recursive:true,force:true});
const br=await puppeteer.launch({executablePath:await chromium.executablePath(),headless:'shell',userDataDir:'/tmp/pt_ud2',args:[...chromium.args,'--no-sandbox'],defaultViewport:{width:1400,height:900}});
const page=await br.newPage();const errs=[];
await page.evaluateOnNewDocument(fs.readFileSync(EXT+'/tests/shim.js','utf8'));
page.on('pageerror',e=>errs.push(e.message));page.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await page.setRequestInterception(true);
page.on('request',rq=>{const u=rq.url(),cors={'access-control-allow-origin':rq.headers().origin||'*','access-control-allow-credentials':'true'};
 if(rq.method()==='OPTIONS')return rq.respond({status:204,headers:{...cors,'access-control-allow-headers':'*','access-control-allow-methods':'GET'}});
 if(/^https:\/\/www\.pexels\.com\/search\/videos\//.test(u)){const q=decodeURIComponent(new URL(u).pathname.split('/videos/')[1]).replace(/\/$/,'');const base=[...q].reduce((a,c)=>a+c.charCodeAt(0),0)*100;
  const html=Array.from({length:10},(_,i)=>String(base+i)).map(x=>`<video src="https://videos.pexels.com/video-files/${x}/${x}-sd_640_360_25fps.mp4"></video><a href="https://videos.pexels.com/video-files/${x}/${x}-hd_1920_1080_25fps.mp4">x</a>`).join('');return rq.respond({status:200,contentType:'text/html',headers:cors,body:html})}
 if(/^https:\/\/videos\.pexels\.com\//.test(u))return rq.respond({status:200,contentType:'video/mp4',headers:cors,body:MP4});
 if(/fonts\.(googleapis|gstatic)/.test(u)||/pexels\.com/.test(u))return rq.respond({status:200,contentType:'text/css',headers:cors,body:''});rq.continue()});
page.on('dialog',d=>d.accept());
const st=()=>page.evaluate(()=>{const f=document.querySelector('.vc.kf'),ln=document.querySelector('.ln.kact'),all=[...(ln?ln.querySelectorAll('.vc'):[])];return{kf:document.querySelectorAll('.vc.kf').length,idx:f?all.indexOf(f):-1,q:ln&&ln.querySelector('.kwi').value,modal:document.getElementById('modal').style.display,pv:!!document.getElementById('pvS')}});
const proj=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('__cs')).proj);
try{
await page.goto(BASE+'/workspace.html');await page.waitForSelector('#bPaste');await page.click('#bPaste');await page.waitForSelector('#pt');
await page.$eval('#pt',e=>{e.value='1: Uno.\n2: Due.\n3: Tre.';e.dispatchEvent(new Event('input'))});await page.click('#pOk');
await page.waitForFunction(()=>{try{return JSON.parse(localStorage.getItem('__cs')).proj.lines.length===3}catch(e){return false}});
await page.goto(BASE+'/finder.html');await page.waitForSelector('#kws');
await page.$eval('#kws',e=>e.value='1: cordless drill\n2: soldering station\n3: angle grinder');await page.click('#bLoad');
await page.waitForFunction(()=>document.querySelectorAll('.vc').length>=30,{timeout:30000});await sleep(1200);
ok('no highlight before any key',(await st()).kf===0);
await page.keyboard.press('d');let s=await st();ok('D selects first clip of first keyword (highlight visible)',s.kf===1&&s.idx===0&&s.q==='cordless drill',JSON.stringify(s));
await page.keyboard.press('ArrowRight');s=await st();ok('ArrowRight -> clip 2',s.idx===1);
const cols=await page.evaluate(()=>{const c=[...document.querySelector('.ln').querySelectorAll('.vc')];const t=c[0].getBoundingClientRect().top;return c.filter(x=>Math.abs(x.getBoundingClientRect().top-t)<4).length});
await page.keyboard.press('s');s=await st();ok('S moves one row down (cols='+cols+')',s.idx===Math.min(1+cols,9),JSON.stringify(s));
await page.keyboard.press('w');s=await st();ok('W moves back up',s.idx===1);
await page.keyboard.press('a');await page.keyboard.press('a');s=await st();ok('A at first clip crosses nowhere (stays at 0, first keyword)',s.idx===0&&s.q==='cordless drill');
// enter flow
await page.keyboard.press('Enter');await sleep(300);s=await st();ok('Enter #1 opens preview',s.modal==='flex'&&s.pv);
await page.keyboard.press('Escape');await sleep(200);s=await st();ok('Esc closes preview, highlight kept',s.modal==='none'&&s.kf===1&&s.idx===0,JSON.stringify(s));
ok('Esc did not download',!(await proj()).lines[0].mediaId);
await page.keyboard.press('Enter');await sleep(250);await page.keyboard.press('Enter');
await page.waitForFunction(()=>{try{return !!JSON.parse(localStorage.getItem('__cs')).proj.lines[0].mediaId}catch(e){return false}},{timeout:20000}).catch(()=>{});await sleep(600);
s=await st();let p=await proj();ok('Enter #2 downloaded clip to segment 1 and closed preview (not reopened)',!!p.lines[0].mediaId&&s.modal==='none'&&!s.pv,JSON.stringify({m:p.lines[0].mediaId&&1,s}));
ok('exactly one clip stored',!(p.lines[0].extra&&p.lines[0].extra.length));
ok('card shows saved state + highlight kept',await page.evaluate(()=>{const f=document.querySelector('.vc.kf');return !!f&&f.classList.contains('on')}));
// reopen saved, Enter must not deselect
await page.keyboard.press('Enter');await sleep(250);await page.keyboard.press('Enter');await sleep(400);p=await proj();s=await st();
ok('Enter on already-saved clip does not deselect or re-download',!!p.lines[0].mediaId&&s.modal==='flex');await page.keyboard.press('Escape');await sleep(200);
// move to next clip + keyword
await page.keyboard.press('d');s=await st();ok('D moves to next clip after download',s.idx===1);
await page.keyboard.press('e');s=await st();ok('E -> next keyword (soldering station), first clip',s.q==='soldering station'&&s.idx===0,JSON.stringify(s));
await page.keyboard.press(']');s=await st();ok('] -> next keyword',s.q==='angle grinder');
await page.keyboard.press('q');await page.keyboard.press('[');s=await st();ok('Q and [ -> previous keyword x2',s.q==='cordless drill');
await page.keyboard.down('Shift');await page.keyboard.press('ArrowDown');await page.keyboard.up('Shift');s=await st();ok('Shift+ArrowDown -> next keyword',s.q==='soldering station');
// cross keyword boundary with S from last row
for(let i=0;i<4;i++)await page.keyboard.press('s');s=await st();ok('S past last row continues into next keyword',s.q==='angle grinder',JSON.stringify(s));
// arrows inside preview switch clip
await page.keyboard.press('Enter');await sleep(250);const t1=await page.evaluate(()=>document.querySelector('#card .mut').textContent);await page.keyboard.press('d');await sleep(250);s=await st();
ok('in preview D switches to next clip, preview stays open',s.modal==='flex'&&s.idx===5,JSON.stringify(s));await page.keyboard.press('Escape');await sleep(200);
// typing safety
await page.keyboard.press('/');await sleep(100);const act=await page.evaluate(()=>document.activeElement.className);
await page.keyboard.type('wasd q e');const val=await page.evaluate(()=>document.activeElement.value);s=await st();
ok('"/" focuses keyword field; typing wasd/q/e types text, does not navigate',/kwi/.test(act)&&/wasd q e/.test(val)&&/wasd q e/.test(s.q||''),act+' | '+val);
await page.keyboard.press('Escape');await sleep(100);ok('Esc leaves field',await page.evaluate(()=>document.activeElement.tagName==='BODY'));
// Cmd+S etc untouched
const pre=await page.evaluate(()=>{window.__d=null;addEventListener('keydown',e=>{if(e.metaKey)window.__d=e.defaultPrevented},false);return 1});
await page.keyboard.down('Meta');await page.keyboard.press('d');await page.keyboard.up('Meta');ok('Cmd+D not intercepted',await page.evaluate(()=>window.__d===false));
// mouse click then keyboard continues
await page.evaluate(()=>document.querySelectorAll('.ln')[0].querySelectorAll('.vc .m')[3].click());await sleep(300);await page.keyboard.press('Escape');await sleep(200);
await page.keyboard.press('ArrowRight');s=await st();ok('mouse click sets position; arrows continue from it',s.q==='cordless drill'&&s.idx===4,JSON.stringify(s));
ok('no page errors',errs.length===0,errs.slice(0,3).join(' | '));
}catch(e){console.log('TESTERR',e.message);res.push(false)}
await br.close();srv.close();console.log(res.every(Boolean)?'ALL PASS':'SOME FAIL');process.exit(0)
