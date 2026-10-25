/* Free (no API key) stock-video search engines. Runs in the service worker.
   Technique borrowed from Pinterest grabber: fetch the public search page HTML with the
   user's cookies, then regex the media URLs out of the raw markup. Selectors are not used,
   so small markup changes rarely break it. */
(function(g){
const norm=h=>String(h).replace(/\\u002F/gi,'/').replace(/\\\//g,'/').replace(/&amp;/g,'&');
const uniq=a=>[...new Set(a)];
const mk=(site,id,o)=>({site,id:site+':'+id,title:'',thumb:'',pv:[],dl:[],page:'',dur:null,w:null,h:null,hd:true,...o});

const ENG={
Pexels:{url:q=>'https://www.pexels.com/search/videos/'+encodeURIComponent(q).replace(/%20/g,'%20')+'/',
 parse(html,lim){html=norm(html);const re=/https:\/\/videos\.pexels\.com\/video-files\/(\d+)\/\1-(?:(?:sd|hd|uhd)_)?(\d+)_(\d+)_(\d+)fps\.mp4/g,by=new Map();let m;
  while((m=re.exec(html))){const id=m[1],v={u:m[0],w:+m[2],h:+m[3]};(by.get(id)||by.set(id,[]).get(id)).push(v)}
  return[...by].slice(0,lim).map(([id,vs])=>{vs.sort((a,b)=>b.w-a.w);const small=[...vs].sort((a,b)=>a.w-b.w)[0],big=vs[0];
   return mk('Pexels',id,{thumb:`https://images.pexels.com/videos/${id}/free-video-${id}.jpg?auto=compress&cs=tinysrgb&w=640`,pv:[small.u],
    dl:[...vs.filter(v=>v.w===1920).map(v=>v.u),...vs.filter(v=>v.w>1920).map(v=>v.u),`https://www.pexels.com/download/video/${id}/?h=1080&w=1920`,...vs.filter(v=>v.w<1920).map(v=>v.u)],
    page:'https://www.pexels.com/video/'+id+'/',w:big.w,h:big.h})})}},
Pixabay:{url:q=>'https://pixabay.com/videos/search/'+encodeURIComponent(q).replace(/%20/g,'%20')+'/',
 parse(html,lim){html=norm(html);const re=/https:\/\/cdn\.pixabay\.com\/(?:video|vimeo)\/[^"'\s<>)]*?(\d+)(?:-\d+)?_(tiny|small|medium|large)\.mp4/g,by=new Map();let m;
  while((m=re.exec(html))){const base=m[0].replace(/_(tiny|small|medium|large)\.mp4$/,''),id=m[1];if(!by.has(base))by.set(base,{id,base})}
  return[...by.values()].slice(0,lim).map(({id,base})=>mk('Pixabay',id,{pv:[base+'_tiny.mp4',base+'_small.mp4'],thumb:'',
   dl:[base+'_large.mp4',base+'_medium.mp4'],page:'https://pixabay.com/videos/id-'+id+'/',w:1920,h:1080}))}},
Mixkit:{url:q=>'https://mixkit.co/free-stock-video/'+encodeURIComponent(q).replace(/%20/g,'-')+'/',
 parse(html,lim){html=norm(html);const pv={},by=new Map();let m;const re=/https:\/\/assets\.mixkit\.co\/[^"'\s<>)]*?\.mp4/g;
  while((m=re.exec(html))){const u=m[0],id=(/-(\d+)-(?:tiny|small|medium|large)\.mp4/.exec(u)||/\/videos\/(\d+)\//.exec(u)||[])[1];if(id&&!pv[id])pv[id]=u}
  const ra=/\/free-stock-video\/([a-z0-9-]+?)-(\d+)\/?(?=["'#?\s<])/g;while((m=ra.exec(html))){if(!by.has(m[2]))by.set(m[2],m[1])}
  for(const id in pv)if(!by.has(id))by.set(id,'');
  return[...by].slice(0,lim).map(([id,slug])=>mk('Mixkit',id,{title:slug.replace(/-/g,' '),
   pv:[pv[id],slug&&`https://assets.mixkit.co/videos/preview/mixkit-${slug}-${id}-large.mp4`,`https://assets.mixkit.co/videos/${id}/${id}-360.mp4`].filter(Boolean),
   dl:[`https://assets.mixkit.co/videos/${id}/${id}-1080.mp4`,`https://assets.mixkit.co/videos/${id}/${id}-720.mp4`,`https://assets.mixkit.co/videos/${id}/${id}-360.mp4`],page:slug?`https://mixkit.co/free-stock-video/${slug}-${id}/`:'',w:1280,h:720}))},warn:'Mixkit free downloads are 720p',multi:1},
Coverr:{url:q=>'https://coverr.co/s?q='+encodeURIComponent(q).replace(/%20/g,'+'),
 parse(html,lim){html=norm(html);const re=/https:\/\/(?:cdn|storage)\.coverr\.co\/videos\/([^\/"'\s<>?\\]+)/g,by=new Map();let m;
  while((m=re.exec(html))){if(!/^coverr-/.test(m[1])&&m[1].length<8)continue;if(!by.has(m[1]))by.set(m[1],m[0])}
  return[...by].slice(0,lim).map(([slug,base])=>mk('Coverr',slug,{title:slug.replace(/^coverr-/,'').replace(/-/g,' ').replace(/\s[0-9a-z]{8,}$/,''),
   pv:[base+'/360p.mp4',base+'/720p.mp4',base+'/1080p.mp4'],thumb:'',dl:[base+'/4k.mp4',base+'/1080p.mp4',base+'/720p.mp4'],page:'https://coverr.co/s?q='+encodeURIComponent(slug)}))}},
Videezy:{url:q=>'https://www.videezy.com/free-video/'+encodeURIComponent(q).replace(/%20/g,'-'),
 parse:(html,lim)=>generic('Videezy',html,lim,/href="((?:https:\/\/www\.videezy\.com)?\/[a-z0-9-]+\/\d+-[a-z0-9-]+)"/gi,'https://www.videezy.com'),warn:'Free HD needs Videezy login – resolved from page on select'},
Magnific:{js:1,url:q=>'https://www.magnific.com/search?format=search&last_filter=type&last_value=video&query='+encodeURIComponent(q)+'&type=video',
 parse:(html,lim)=>generic('Magnific',html,lim,/href="((?:https:\/\/www\.magnific\.com)?\/(?:free|premium)-video\/[^"#?]+)/gi,'https://www.magnific.com','cdnpk\\.net|magnific\\.com|freepik\\.com|fpcdn\\.[a-z]+',{fullId:1,paid:1}),warn:'Magnific: most clips are Premium (crown). Previews are watermarked; downloads need login/licence'},
Artgrid:{js:1,url:q=>'https://artgrid.io/?'+q.split(' ').filter(w=>w.length>1).map(w=>'search='+encodeURIComponent(w)).join('&')+'&sortId=1',
 parse:(html,lim)=>generic('Artgrid',html,lim,/href="((?:https:\/\/artgrid\.io)?\/clip\/\d+[^"#?]*)/gi,'https://artgrid.io','[a-z0-9.\\-]*artgrid[a-z0-9.\\-]*|cloudfront\\.net',{fullId:1,paid:1}),warn:'Artgrid is a paid library: previews only, clean downloads need a subscription'},
Vista:{js:1,url:q=>'https://create.vista.com/videos/'+encodeURIComponent(q).replace(/%20/g,'-')+'/',more:a=>topWords(a,2).map(w=>'https://create.vista.com/videos/'+encodeURIComponent(w)+'/'),
 parse:(html,lim)=>anyMedia('Vista',html,lim),warn:'Vista: uses the same file the page plays (what “open video in new tab” gives). Check it has no watermark'},
Shutterstock:{js:1,url:q=>'https://www.shutterstock.com/video/search/'+encodeURIComponent(String(q).toLowerCase()).replace(/%20/g,'-'),
 parse:(html,lim)=>ssParse(html,lim),warn:'Shutterstock is a paid library. Previews are watermarked; clean HD/4K files need your licence or subscription (stay logged in to shutterstock.com in this browser). The 4K/HD badge is the one Shutterstock shows. If results are empty, tick “Tab fallback” in the toolbar.'},
Vecteezy:{url:q=>'https://www.vecteezy.com/free-videos/'+encodeURIComponent(q).replace(/%20/g,'-'),
 parse:(html,lim)=>generic('Vecteezy',html,lim,/href="((?:https:\/\/www\.vecteezy\.com)?\/video\/\d+-[a-z0-9-]+)"/gi,'https://www.vecteezy.com'),warn:'Free HD needs Vecteezy login – resolved from page on select'}
};
/* Shutterstock: result cards link to /video/clip-<id>-<slug>; media lives at /shutterstock/videos/<id>/(thumb|preview)/... (also ak.picdn.net).
   The "4K"/"HD" badge and "0:16" duration are short text nodes inside each card. Cards are read in page order; badge/duration text is assigned to the card it sits in
   (after the card's link, or before it if the page puts overlays first). Not verified against the live site from the build sandbox: use Diagnose if a field is missing. */
function ssParse(html,lim){html=norm(html);const ev=[],seen=new Set();let m;
  const ra=/\/video\/clip-(\d{6,})-([a-z0-9-]+)/gi;while((m=ra.exec(html)))ev.push({at:m.index,t:'a',id:m[1],slug:m[2].toLowerCase()});
  const rm=/\/shutterstock\/videos\/(\d{6,})\/(?:thumb|preview)\//g;while((m=rm.exec(html)))ev.push({at:m.index,t:'a',id:m[1],slug:'',weak:1});
  const rt=/>([^<>]{1,120})</g;while((m=rt.exec(html))){const x=m[1],b=/(?:^|[^A-Za-z0-9])(4K|UHD|HD)(?![A-Za-z0-9])/.exec(x),d=/(?:^|[^0-9:])(\d{1,2}:\d{2})(?![0-9:])/.exec(x);if(b||d)ev.push({at:m.index,t:'b',q:b?(b[1]==='HD'?'HD':'4K'):'',d:d?d[1]:''})}
  ev.sort((x,y)=>x.at-y.at);
  const cards=[],by=new Map();let firstA=ev.findIndex(e=>e.t==='a');
  const before=firstA>0&&ev.slice(0,firstA).some(e=>e.t==='b'&&e.d&&ev[firstA].at-e.at<900);   /* overlays come before the link */
  let pend=[],cur=null;const give=(c,e)=>{if(!c)return;if(e.q&&!c.q)c.q=e.q;if(e.d&&!c.d)c.d=e.d};
  for(const e of ev){
    if(e.t==='a'){let c=by.get(e.id);if(!c){c={id:e.id,slug:e.slug,q:'',d:''};by.set(e.id,c);cards.push(c);if(before){pend.forEach(x=>give(c,x));pend=[]}}else if(e.slug&&!c.slug)c.slug=e.slug;cur=c}
    else if(before)pend.push(e);else give(cur,e)}
  const host='(?:https?:)?\\/\\/[a-z0-9.\\-]*(?:shutterstock\\.com|picdn\\.net)',fix=u=>u.startsWith('//')?'https:'+u:u;
  return cards.slice(0,lim).map(c=>{const th=new RegExp(host+'\\/shutterstock\\/videos\\/'+c.id+'\\/thumb\\/[^"\'\\s<>)\\\\]+','i').exec(html),pvm=new RegExp(host+'\\/shutterstock\\/videos\\/'+c.id+'\\/preview\\/[^"\'\\s<>)\\\\]+?\\.(?:mp4|webm)','i').exec(html),
      base='https://www.shutterstock.com/shutterstock/videos/'+c.id,pv=pvm?[fix(pvm[0])]:(c.slug?[base+'/preview/stock-footage-'+c.slug+'.webm',base+'/preview/stock-footage-'+c.slug+'.mp4']:[]),
      dur=c.d?+c.d.split(':')[0]*60+ +c.d.split(':')[1]:null;
    return mk('Shutterstock',c.id,{title:c.slug.replace(/-/g,' '),thumb:th?fix(th[0]).replace(/&amp;/g,'&'):base+'/thumb/1.jpg?ip=x480',pv,dl:[],resolve:true,paid:true,hd:!!c.q,rl:c.q,
      w:c.q==='4K'?3840:c.q==='HD'?1920:null,h:c.q==='4K'?2160:c.q==='HD'?1080:null,dur,page:'https://www.shutterstock.com/video/clip-'+c.id+(c.slug?'-'+c.slug:'')})})}
function generic(site,html,lim,hre,origin,host,opt={}){html=norm(html);const out=[],seen=new Set();let m;
  const vre=new RegExp('https?:\\/\\/[a-z0-9.\\-]*(?:'+(host||'videezy\\.com|vecteezy\\.com')+')\\/[^"\'\\s<>)]+?\\.(?:mp4|webm)(?:\\?[^"\'\\s<>)]*)?','gi'),vids=[];
  while((m=vre.exec(html)))if(!/\/(?:assets|packs|logo)\//.test(m[0]))vids.push(m[0]);
  const pages=[];while((m=hre.exec(html))){const p=m[1].startsWith('/')?origin+m[1]:m[1];if(!pages.includes(p))pages.push(p)}
  const n=Math.max(lim,0);
  if(pages.length){pages.slice(0,n).forEach((p,i)=>{const last=p.split('/').filter(Boolean).pop(),id=opt.fullId?p.replace(/^https?:\/\/[^/]+/,'').replace(/[^a-z0-9]+/gi,'-').slice(-60):last.split('-')[0]+'-'+last.split('-').slice(1,4).join('-');
    out.push(mk(site,id,{title:last.replace(/^\d+[-_]/,'').replace(/[-_]\d+$/,'').replace(/[-_]/g,' '),page:p,pv:vids[i]?[vids[i]]:[],dl:[],resolve:true,hd:false,paid:!!opt.paid,thumb:thumbFor(html,p)}))});return out}
  for(const u of vids){const k=u.split('?')[0];if(seen.has(k))continue;seen.add(k);out.push(mk(site,k.split('/').slice(-2).join('_'),{pv:[u],dl:[u],hd:false}));if(out.length>=n)break}
  return out}
function anyMedia(site,html,lim){html=norm(html);const re=/https?:[^"'\s<>)\\]+?\.(?:mp4|webm)(?:\?[^"'\s<>)\\]*)?/gi,seen=new Set(),out=[];let m;
  while((m=re.exec(html))){const u=m[0],k=u.split('?')[0];if(seen.has(k))continue;seen.add(k);out.push(mk(site,k.split('/').slice(-3).join('_'),{title:k.split('/').pop().replace(/\.[a-z0-9]+$/i,'').replace(/[-_]+/g,' ').slice(0,60),pv:[u],dl:[u],hd:false,w:null,h:null}));if(out.length>=lim)break}
  return out}
function thumbFor(html,p){const path=p.replace(/^https?:\/\/[^/]+/,''),i=html.indexOf(path);if(i<0)return'';const seg=html.slice(i,i+1500),m=/(?:src|data-src)="(https?:\/\/[^"]+\.(?:jpg|jpeg|webp|png)[^"]*)"/i.exec(seg);return m?m[1]:''}
g.FINDER={ENG,sites:()=>Object.keys(ENG),
 getHtml:null,
 STOP:[...'a an the of in on at to for with and or by from into near is are'.split(' ')],
 clean,alts,
 async search(site,q,lim=10,opts={}){const e=ENG[site];if(!e)throw new Error('Unknown site '+site);const A=alts(q);if(!A.length)throw new Error('Keyword is empty after removing symbols');
  const pg=opts.page||1,per=A.length>1?Math.ceil(lim/A.length)+1:lim,lists=[];let err=null;
  for(const a of A){try{lists.push(e.multi?await mixOne(a,per,opts.tabs,pg):await onePage(site,a,per,opts.tabs,pg))}catch(x){err=err||x;lists.push([])}}
  if(lists.every(l=>!l.length)&&err)throw err;
  const out=[],seen=new Set();for(let i=0;out.length<lim;i++){let any=false;for(const l of lists){if(l[i]){any=true;if(!seen.has(l[i].id)){seen.add(l[i].id);out.push(l[i])}if(out.length>=lim)break}}if(!any)break}
  if(e.warn)out.forEach(i=>i.warn=i.warn||e.warn);return out}};
/* ---- helpers ---- */
const PGP={Pexels:'page',Pixabay:'pagi',Mixkit:'page',Coverr:'page',Videezy:'page',Vecteezy:'page',Magnific:'page',Artgrid:'page',Vista:'page',Shutterstock:'page'};
const withPage=(u,site,p)=>p>1?u+(u.includes('?')?'&':'?')+PGP[site]+'='+p:u;
const topWords=(a,n)=>[...new Set(a.toLowerCase().split(' ').filter(w=>w.length>2&&!STOPS.has(w)&&!/(ing|ed)$/.test(w)))].sort((x,y)=>y.length-x.length).slice(0,n);
ENG.Vecteezy.more=a=>['https://www.vecteezy.com/search?qterm='+encodeURIComponent(a)+'&content_type=video',...topWords(a,2).map(w=>'https://www.vecteezy.com/free-videos/'+encodeURIComponent(w))];
ENG.Videezy.more=a=>topWords(a,2).map(w=>'https://www.videezy.com/free-video/'+encodeURIComponent(w));

function clean(s){return String(s).replace(/^\s*\d+\s*[\.\):,\-]\s*/,'').replace(/[^\p{L}\p{N}\s'-]+/gu,' ').replace(/\s+/g,' ').trim().split(' ').slice(0,10).join(' ')}
function alts(q){return String(q).split(/\s*(?:\/|\||;|\n)\s*/).map(clean).filter(Boolean).slice(0,4)}
const STOPS=new Set('a an the of in on at to for with and or by from into near is are'.split(' '));
/* v2.5 per-website pacing. Every host gets its own queue: min gap between requests (with jitter), escalating cooldown after 429/503, gap shrinks again after successes.
   Different websites run in parallel, so one throttled site never stalls the others. kind 'media' = video file hosts (short gap). */
const HS={},_sl2=ms=>new Promise(r=>setTimeout(r,ms));
const hostOf=u=>{try{return new URL(u).hostname}catch(_){return'x'}};
const baseGap=(h,k)=>k==='media'?250:k==='api'?300:/pexels\.com$|pixabay\.com$/.test(h)?2200:1600;
function hs(u,k){const h=hostOf(u),key=(k||'p')+':'+h;return HS[key]||(HS[key]={key,next:0,cool:0,n:0,base:baseGap(h,k),gap:baseGap(h,k),q:Promise.resolve()})}
function gate(u,k){const s=hs(u,k);const p=s.q.then(async()=>{for(;;){const t=Math.max(s.next,s.cool),now=Date.now();if(t<=now)break;await _sl2(Math.min(t-now,5000))}s.next=Date.now()+s.gap*(.8+Math.random()*.4)});s.q=p.catch(()=>{});return p}
function penalize(u,retryAfterMs,k,capMs){const s=hs(u,k);s.n++;let w=Math.max(retryAfterMs||0,15000*Math.pow(2,Math.min(6,s.n-1)));w=Math.min(capMs||600000,w);s.cool=Math.max(s.cool,Date.now()+w);s.gap=Math.min(8000,Math.round(s.gap*1.5));return s.cool-Date.now()}
function reward(u,k){const s=hs(u,k);s.n=0;s.gap=Math.max(s.base,Math.round(s.gap*.92))}
const coolLeft=(u,k)=>Math.max(0,hs(u,k).cool-Date.now());
g.FINDER.gate=gate;g.FINDER.penalize=penalize;g.FINDER.reward=reward;g.FINDER.coolLeft=coolLeft;
async function fetchPage(url,tabs){let r;for(let a=0;a<4;a++){await gate(url);r=await fetch(url,{credentials:'include',redirect:'follow'});if(r.status!==429&&r.status!==503)break;try{r.body&&r.body.cancel()}catch(_){}
    const left=penalize(url,(+r.headers.get('retry-after')||0)*1000);if(a===3||left>150000)break}
  if(r.ok){reward(url);return r.text()}if(r.status===404)return null;
  if(r.status===403||r.status===429||r.status===503){if(tabs&&g.FINDER.getHtml)return g.FINDER.getHtml(url);
    throw new Error('Blocked by '+new URL(url).hostname+' (HTTP '+r.status+'). Tick “Tab fallback” in the toolbar to load it through one background tab, or open the site once and solve its check.')}
  throw new Error(new URL(url).hostname+' returned HTTP '+r.status)}
/* v2.4 Pexels official API (free key from pexels.com/api): no Cloudflare, no 1015 bans. Used automatically when a key is saved. */
async function pexApi(q,lim,page,key){const U='https://api.pexels.com/videos/search';await gate(U,'api');const r=await fetch('https://api.pexels.com/videos/search?query='+encodeURIComponent(q)+'&per_page='+Math.min(80,Math.max(1,lim||30))+'&page='+page,{headers:{Authorization:key}});
  if(r.status===401||r.status===403)throw new Error('Pexels API key rejected (HTTP '+r.status+'). Check the key.');
  if(r.status===429)throw new Error('Pexels API hourly limit reached (HTTP 429). It resets within the hour.');
  if(!r.ok)throw new Error('Pexels API returned HTTP '+r.status);
  const j=await r.json();return(j.videos||[]).slice(0,lim).map(v=>{const fs=(v.video_files||[]).filter(f=>f.link&&(!f.file_type||f.file_type==='video/mp4')).sort((x,y)=>(y.width||0)-(x.width||0)),small=[...fs].sort((x,y)=>(x.width||1e9)-(y.width||1e9))[0];
   return mk('Pexels',String(v.id),{thumb:v.image||'',pv:small?[small.link]:[],dl:[...fs.filter(f=>f.width===1920),...fs.filter(f=>f.width>1920),...fs.filter(f=>f.width<1920)].map(f=>f.link),page:v.url||'',dur:v.duration||null,w:v.width||null,h:v.height||null})})}
async function onePage(site,a,lim,tabs,page=1){if(site==='Pexels'){let key='';try{key=((await chrome.storage.local.get('pexelsKey')).pexelsKey||'').trim()}catch(_){}if(key)return pexApi(a,lim,page,key)}
  const e=ENG[site],list=[e.url(a),...(e.more?e.more(a):[])];let any=false;
  for(const u of list){const html=(e.js&&tabs&&g.FINDER.getHtml)?await g.FINDER.getHtml(withPage(u,site,page)):await fetchPage(withPage(u,site,page),tabs);if(html==null)continue;any=true;const items=e.parse(html,lim);if(items.length)return items}
  if(e.js&&!tabs&&page===1)throw new Error(site+' loads its results with JavaScript. Tick “Tab fallback” in the toolbar and search again.');
  if(!any&&page===1)throw new Error(site+' has no page for “'+a+'” (HTTP 404, tried '+list.length+' route'+(list.length>1?'s':'')+')');return[]}
/* Mixkit has tag pages (/free-stock-video/pharmacy/), not free-text search: fetch tag page per significant word, rank by title words. */
async function mixOne(a,lim,tabs,page=1){const words=a.toLowerCase().split(' ').filter(w=>w.length>2&&!STOPS.has(w)),verb=w=>/(ing|ed)$/.test(w)?1:0,tags=[...new Set(words)].sort((x,y)=>verb(x)-verb(y)||y.length-x.length).slice(0,3),seen=new Map();let ok=false,last=null,calls=0;
  for(const w of tags){let html=null;for(const v of [...new Set([w,w.replace(/ies$/,'y').replace(/s$/,''),w+'s'])]){if(++calls>7)break;try{html=await fetchPage('https://mixkit.co/free-stock-video/'+encodeURIComponent(v)+'/'+(page>1?'?page='+page:''),tabs)}catch(e){last=e;break}if(html!=null)break}
    if(html==null)continue;ok=true;ENG.Mixkit.parse(html,60).forEach(it=>{if(!seen.has(it.id))seen.set(it.id,it)})}
  if(!ok&&page>1)return[];if(!ok)throw last||new Error('Mixkit has no tag page for “'+a+'”. It only supports single-word tags (pharmacy, pills, doctor…).');
  const sc=it=>words.filter(w=>(it.title+' ').includes(w)).length;
  return[...seen.values()].map((it,i)=>[it,sc(it),i]).sort((p,q)=>q[1]-p[1]||p[2]-q[2]).slice(0,lim).map(x=>x[0])}
g.FINDER.__urls=(site,a)=>site==='Mixkit'?[g.FINDER.__diagUrl(site,a)]:[ENG[site].url(a),...(ENG[site].more?ENG[site].more(a):[])];
g.FINDER.__diagUrl=(site,a)=>site==='Mixkit'?'https://mixkit.co/free-stock-video/'+encodeURIComponent((a.toLowerCase().split(' ').filter(w=>w.length>2&&!STOPS.has(w)&&!/(ing|ed)$/.test(w)).sort((x,y)=>y.length-x.length)[0])||'discover')+'/':ENG[site].url(a);
})(typeof self!=='undefined'?self:globalThis);
