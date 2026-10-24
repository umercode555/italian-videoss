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
Vecteezy:{url:q=>'https://www.vecteezy.com/free-videos/'+encodeURIComponent(q).replace(/%20/g,'-'),
 parse:(html,lim)=>generic('Vecteezy',html,lim,/href="((?:https:\/\/www\.vecteezy\.com)?\/video\/\d+-[a-z0-9-]+)"/gi,'https://www.vecteezy.com'),warn:'Free HD needs Vecteezy login – resolved from page on select'}
};
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
const PGP={Pexels:'page',Pixabay:'pagi',Mixkit:'page',Coverr:'page',Videezy:'page',Vecteezy:'page',Magnific:'page',Artgrid:'page',Vista:'page'};
const withPage=(u,site,p)=>p>1?u+(u.includes('?')?'&':'?')+PGP[site]+'='+p:u;
const topWords=(a,n)=>[...new Set(a.toLowerCase().split(' ').filter(w=>w.length>2&&!STOPS.has(w)&&!/(ing|ed)$/.test(w)))].sort((x,y)=>y.length-x.length).slice(0,n);
ENG.Vecteezy.more=a=>['https://www.vecteezy.com/search?qterm='+encodeURIComponent(a)+'&content_type=video',...topWords(a,2).map(w=>'https://www.vecteezy.com/free-videos/'+encodeURIComponent(w))];
ENG.Videezy.more=a=>topWords(a,2).map(w=>'https://www.videezy.com/free-video/'+encodeURIComponent(w));

function clean(s){return String(s).replace(/^\s*\d+\s*[\.\):,\-]\s*/,'').replace(/[^\p{L}\p{N}\s'-]+/gu,' ').replace(/\s+/g,' ').trim().split(' ').slice(0,10).join(' ')}
function alts(q){return String(q).split(/\s*(?:\/|\||;|\n)\s*/).map(clean).filter(Boolean).slice(0,4)}
const STOPS=new Set('a an the of in on at to for with and or by from into near is are'.split(' '));
async function fetchPage(url,tabs){const r=await fetch(url,{credentials:'include',redirect:'follow'});
  if(r.ok)return r.text();if(r.status===404)return null;
  if(r.status===403||r.status===429||r.status===503){if(tabs&&g.FINDER.getHtml)return g.FINDER.getHtml(url);
    throw new Error('Blocked by '+new URL(url).hostname+' (HTTP '+r.status+'). Tick “Tab fallback” in the toolbar to load it through one background tab, or open the site once and solve its check.')}
  throw new Error(new URL(url).hostname+' returned HTTP '+r.status)}
async function onePage(site,a,lim,tabs,page=1){const e=ENG[site],list=[e.url(a),...(e.more?e.more(a):[])];let any=false;
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
