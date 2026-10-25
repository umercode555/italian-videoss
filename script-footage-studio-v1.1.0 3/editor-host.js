/* Background removal (IS-Net via onnxruntime-web, runs fully offline from ./bg). One job at a time. Output cropped to the subject. */
let BGM=null,CQ=Promise.resolve();
async function cropAlpha(b){const bm=await createImageBitmap(b),W=bm.width,H=bm.height,c=new OffscreenCanvas(W,H),g=c.getContext('2d');g.drawImage(bm,0,0);const d=g.getImageData(0,0,W,H).data;let x0=W,y0=H,x1=-1,y1=-1;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(d[(y*W+x)*4+3]>16){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
  if(x1<0)throw new Error('no foreground found in image');const pad=Math.round(Math.max(x1-x0,y1-y0)*.02);x0=Math.max(0,x0-pad);y0=Math.max(0,y0-pad);x1=Math.min(W-1,x1+pad);y1=Math.min(H-1,y1+pad);
  const w=x1-x0+1,h=y1-y0+1,o=new OffscreenCanvas(w,h);o.getContext('2d').drawImage(c,x0,y0,w,h,0,0,w,h);return o.convertToBlob({type:'image/png'})}
async function cutBg(blob){BGM=BGM||import('./bg/bgremove.mjs');const{removeBackground}=await BGM;
  const out=await removeBackground(blob,{publicPath:chrome.runtime.getURL('bg/'),model:'medium',proxyToWorker:false,output:{format:'image/png',quality:1}});return cropAlpha(out)}
const f=document.getElementById('f');
async function payload(){const p=await SV.proj();if(!p){location.href='workspace.html';return null}
  const media=(await SV.all('media')).filter(m=>!m.tray),blobs={};media.forEach(m=>blobs[m.id]={blob:m.blob,name:m.name});
  const ws={id:p.id,name:p.name,lines:p.lines.map(l=>({n:l.n,text:l.text,mediaId:l.mediaId||null,inT:l.inT||0,dur:l.dur||null,clips:l.mediaId?[{mediaId:l.mediaId,inT:l.inT||0,outT:l.outT||null},...(l.extra||[]).map(c=>({mediaId:c.id,inT:c.inT||0,outT:c.outT||null}))]:[]}))};
  const cfg=(await chrome.storage.local.get('cfg')).cfg||{};return{ws,blobs,cfg}}
addEventListener('message',async e=>{if(e.source!==f.contentWindow)return;const m=e.data||{};
  if(m.t==='ready'||m.t==='needWS'){const d=await payload();if(!d)return;const projects=m.t==='ready'?await SV.all('projects'):[];f.contentWindow.postMessage({t:m.t==='ready'?'init':'ws',...d,projects},'*');f.focus()}
  else if(m.t==='saveP')SV.put('projects',{...m.p,id:m.id});
  else if(m.t==='delP')SV.del('projects',m.id);
  else if(m.t==='putMedia')SV.put('media',{id:m.id,blob:m.blob,name:m.name,type:m.blob.type,size:m.blob.size,editor:true});
  else if(m.t==='cfg')chrome.storage.local.get('cfg').then(({cfg})=>chrome.storage.local.set({cfg:{...(cfg||{}),[m.k]:m.v}}));
  else if(m.t==='download'){const a=document.createElement('a');a.href=URL.createObjectURL(m.blob);a.download=m.name;document.body.appendChild(a);a.click();a.remove()}
  else if(m.t==='cut'){const w=f.contentWindow;CQ=CQ.then(()=>cutBg(m.blob)).then(b=>w.postMessage({t:'cutDone',rid:m.rid,blob:b},'*'),er=>w.postMessage({t:'cutErr',rid:m.rid,err:String(er&&er.message||er)},'*'))}
  else if(m.t==='close')location.href='workspace.html'});
