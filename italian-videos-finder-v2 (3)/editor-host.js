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
  else if(m.t==='close')location.href='workspace.html'});
