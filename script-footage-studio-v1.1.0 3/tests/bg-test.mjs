import chromium from '@sparticuz/chromium';import puppeteer from 'puppeteer-core';import http from 'http';import fs from 'fs';import path from 'path';
const EXT=path.resolve(new URL('..',import.meta.url).pathname);
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json'};
const HOSTCSP="script-src 'self' 'wasm-unsafe-eval'; object-src 'self'";
const EDCSP="sandbox allow-scripts allow-forms allow-popups allow-modals allow-downloads; script-src 'self' 'unsafe-inline' 'unsafe-eval'; object-src 'self'";
const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/workspace.html';const f=path.join(EXT,u);
 if(fs.existsSync(f)&&fs.statSync(f).isFile()){const h={'content-type':mime[path.extname(f)]||'application/octet-stream','access-control-allow-origin':'*'};
  if(u==='/editor.html')h['content-security-policy']=EDCSP;else if(u.endsWith('.html'))h['content-security-policy']=HOSTCSP;
  r.writeHead(200,h);fs.createReadStream(f).pipe(r)}else{r.writeHead(404);r.end()}}).listen(0);
const BASE='http://localhost:'+srv.address().port;
const res=[];const ok=(n,c,i='')=>{res.push(c);console.log((c?'PASS ':'FAIL ')+n+(i?'  -> '+i:''))};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const br=await puppeteer.launch({executablePath:await chromium.executablePath(),headless:'shell',userDataDir:'/tmp/pt_ud',args:[...chromium.args,'--no-sandbox'],defaultViewport:{width:1400,height:1000}});
const page=await br.newPage();const errs=[];
await page.evaluateOnNewDocument(fs.readFileSync(path.resolve(new URL('shim.js',import.meta.url).pathname),'utf8'));
await page.evaluateOnNewDocument(()=>{chrome.runtime.getURL=p=>location.origin+'/'+p});
page.on('pageerror',e=>errs.push('pageerror: '+e.message));page.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text());if(/bg|cut|onnx/i.test(m.text()))console.log('  [log]',m.text().slice(0,200))});
page.on('dialog',async d=>{await d.accept()});
await page.setRequestInterception(true);page.on('request',rq=>{const u=rq.url();if(/fonts\.(googleapis|gstatic)/.test(u))return rq.respond({status:200,contentType:'text/css',body:''});rq.continue()});
try{
await page.goto(BASE+'/workspace.html');await page.waitForSelector('#bPaste');await page.click('#bPaste');await page.waitForSelector('#pt');
await page.$eval('#pt',e=>{e.value='1: Uno.\n2: Due.';e.dispatchEvent(new Event('input'))});await page.click('#pOk');
await page.waitForFunction(()=>{try{return JSON.parse(localStorage.getItem('__cs')).proj.lines.length===2}catch(e){return false}});
await page.goto(BASE+'/editor-host.html');
let fr=null;for(let i=0;i<60&&!fr;i++){const f=page.frames().find(f=>/editor\.html/.test(f.url()));if(f&&await f.evaluate(()=>typeof P!=='undefined'&&!!P&&typeof addBg==='function').catch(()=>false))fr=f;else await sleep(500)}
ok('editor loaded with addBg()',!!fr);
// make logo: beige bg + red circle + dark bar
const info=await fr.evaluate(async()=>{const c=document.createElement('canvas');c.width=600;c.height=400;const g=c.getContext('2d');g.fillStyle='#d9c7a0';g.fillRect(0,0,600,400);g.fillStyle='#d41f2a';g.beginPath();g.arc(300,170,110,0,7);g.fill();g.fillStyle='#111';g.fillRect(180,300,240,40);
 const b=await new Promise(r=>c.toBlob(r,'image/png'));const id=await addMedia(new File([b],'logo.png',{type:'image/png'}),null,'image');M[id].kw='Levis';const pm=P.media.find(x=>x.id===id);pm.kw='Levis';return {id}});
const id=info.id;
// 1 bg default duration
const bg=await fr.evaluate(()=>{addBg();const b=P.items.find(i=>i.k==='bg');return {d:b.d,s:b.s,tr:b.tr,n:P.items.filter(i=>i.k==='bg').length}});
ok('white background added, default duration 2.8s',bg.d===2.8&&bg.tr==='v'&&bg.n===1,JSON.stringify(bg));
// overlay on bg: default OFF
await fr.evaluate(id=>{addOverlay(id,{s:.3,d:2})},id);await sleep(4000);
const d0=await fr.evaluate(()=>{const o=P.items.find(i=>i.tr==='o');const cb=document.querySelector('#panel input[type=checkbox][onchange^=cutToggle]');return {same:o.mid===o.aid,rmbg:!!o.rmbg,box:!!cb,checked:cb&&cb.checked,label:/Remove background/.test(document.getElementById('panel').textContent)}});
ok('checkbox "Remove background" shown, UNTICKED, original image untouched',d0.same&&!d0.rmbg&&d0.box&&d0.checked===false&&d0.label,JSON.stringify(d0));
const t0=Date.now();
await fr.evaluate(()=>document.querySelector('#panel input[type=checkbox][onchange^=cutToggle]').click());
await fr.waitForFunction(()=>{const o=P.items.find(i=>i.tr==='o');return o&&o.mid!==o.aid},{timeout:240000,polling:500}).catch(()=>{});
const st=await fr.evaluate(()=>{const o=P.items.find(i=>i.tr==='o');return {mid:o.mid,aid:o.aid,cut:o.cut,err:M[o.aid].cutErr,name:M[o.mid].name,checked:document.querySelector('#panel input[type=checkbox][onchange^=cutToggle]')?.checked}});
ok('ticking the box removes the background',st.mid!==st.aid&&st.cut===1&&st.checked===true,JSON.stringify(st)+' '+((Date.now()-t0)/1000).toFixed(1)+'s');
// alpha check on cutout
const a=await fr.evaluate(async()=>{const o=P.items.find(i=>i.tr==='o'),m=M[o.mid];await m.img.decode().catch(()=>{});const w=m.img.naturalWidth,h=m.img.naturalHeight,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.drawImage(m.img,0,0);
 const px=(x,y)=>[...g.getImageData(Math.min(w-1,Math.max(0,x)),Math.min(h-1,Math.max(0,y)),1,1).data];return {w,h,corner:px(2,2),center:px(Math.round(w/2),Math.round(h*.4)),mediaInUploads:P.media.filter(x=>!x.cutOf).length}});
ok('cutout: corner transparent, subject opaque, cropped to subject',a.corner[3]<20&&a.center[3]>240&&a.w<600&&a.h<400,JSON.stringify(a));
// render frame: bg white, logo present, no beige
const r=await fr.evaluate(()=>{const c=document.createElement('canvas');c.width=1920;c.height=1080;const g=c.getContext('2d');draw(g,1.5);const px=(x,y)=>[...g.getImageData(x,y,1,1).data];return {tl:px(20,20),mid:px(960,440),beigeFound:(()=>{const d=g.getImageData(0,0,1920,1080).data;let n=0;for(let i=0;i<d.length;i+=4*7)if(Math.abs(d[i]-217)<6&&Math.abs(d[i+1]-199)<6&&Math.abs(d[i+2]-160)<6)n++;return n})()}});
ok('rendered frame: white background, logo visible, no leftover beige',r.tl[0]===255&&r.tl[1]===255&&r.tl[2]===255&&r.beigeFound===0&&r.mid[0]>150&&r.mid[1]<80,JSON.stringify(r));
// overlay NOT on bg stays original
await fr.evaluate(id=>{addOverlay(id,{s:10,d:1.5})},id);await sleep(1500);
const o2=await fr.evaluate(()=>{const os=P.items.filter(i=>i.tr==='o');const x=os.find(i=>i.s>9);return {mid:x.mid,aid:x.aid}});
ok('logo NOT over white bg keeps original',o2.mid===o2.aid);
// untick -> original again; retick -> instant (cached)
await fr.evaluate(()=>{sel=P.items.find(i=>i.tr==='o'&&i.s<1).id;tab='edit';panel()});
await fr.evaluate(()=>document.querySelector('#panel input[type=checkbox][onchange^=cutToggle]').click());await sleep(300);
const u1=await fr.evaluate(()=>{const o=P.items.find(i=>i.tr==='o');return o.mid===o.aid&&!o.rmbg});ok('unticking restores the original image',u1);
const t1=Date.now();await fr.evaluate(()=>{document.querySelector('#panel input[type=checkbox][onchange^=cutToggle]').click()});await sleep(1500);
const u2=await fr.evaluate(()=>{const o=P.items.find(i=>i.tr==='o');return o.mid!==o.aid});ok('re-ticking reuses cutout instantly',u2&&(Date.now()-t1)<5000);
// export gate ignores bg
ok('no page errors',errs.length===0,errs.slice(0,4).join(' | '));
}catch(e){console.log('TESTERR',e.message);res.push(false)}
await br.close();srv.close();console.log(res.every(Boolean)?'ALL PASS':'SOME FAIL');process.exit(0)
