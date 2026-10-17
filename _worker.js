// UBnux Cloudflare Pages Advanced Mode Worker v4.3.0
// Exact-file SEO SSR with query pagination. SSR is placed directly into the app root
// so the browser never renders a second temporary SEO block.

const ORIGIN = "https://ubnux.com";
const DATA = "/data/";

function clean(v){return String(v||"").trim().toLowerCase().replace(/^\/+|\/+$/g,"");}
function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");}
function field(row,names){for(const n of names)if(row&&row[n]!=null&&String(row[n]).trim()!=="")return String(row[n]).trim();return "";}
function arr(data,keys=[]){if(Array.isArray(data))return data;for(const k of keys)if(Array.isArray(data?.[k]))return data[k];return data&&typeof data==="object"?[data]:[];}
function same(a,b){return clean(a)!==""&&clean(a)===clean(b);}
function abs(p){p=String(p||"");return /^https?:\/\//i.test(p)?p:ORIGIN+(p.startsWith("/")?p:"/"+p);}
function find(rows,slug,idNames,slugNames){const t=clean(slug);return rows.find(x=>same(field(x,idNames),t)||same(field(x,slugNames),t))||null;}
function pageFromSearch(search){const raw=new URLSearchParams(search||"").get("page");if(raw==null||raw==="")return 1;const n=Number(raw);return Number.isInteger(n)&&n>0?n:1;}
function clampPage(page,count){const total=Math.max(1,Number(count||0));return Math.min(Math.max(1,page),total);}

function parse(pathname,search){
  const p=clean(pathname).split("/").filter(Boolean),page=pageFromSearch(search);
  if(!p.length)return {type:"home",page:1,valid:true};
  if(p[0]!=="in")return {type:"not-found",page:1,valid:false};
  const r=p.slice(1);
  if(!r.length)return {type:"home",page:1,valid:true};
  if(r.length===1)return {type:"state",stateSlug:r[0],page:1,valid:true};
  if(r.length===2&&r[0]==="all")return {type:"category",categorySlug:r[1],page,valid:true};
  if(r.length===2)return {type:"district",stateSlug:r[0],districtSlug:r[1],page,valid:true};
  if(r.length===3)return {type:"district-category",stateSlug:r[0],districtSlug:r[1],categorySlug:r[2],page,valid:true};
  if(r.length===4)return {type:"business",stateSlug:r[0],districtSlug:r[1],categorySlug:r[2],businessSlug:r[3],page:1,valid:true};
  return {type:"not-found",page:1,valid:false};
}

async function json(env,requestUrl,path){const u=new URL(requestUrl);u.pathname=DATA+String(path).replace(/^\/+/,"");u.search="";const r=await env.ASSETS.fetch(new Request(u.toString()));if(!r.ok)throw new Error("Data request failed: "+path);return r.json();}
async function loadIndex(env,url){const [index,config]=await Promise.all([json(env,url,"SEO_INDEX.JSON"),json(env,url,"SEO_CONFIG.JSON").catch(()=>({}))]);return {index,indexingEnabled:config.Indexing_Enabled===true};}
async function loadDistrictIndex(env,url,district){return json(env,url,field(district,["Index"]));}
async function loadShard(env,url,path){return arr(await json(env,url,path),["businesses","data","items"]);}
async function loadDistrictShard(env,url,district,shardFile){const did=field(district,["District_Id"]);return loadShard(env,url,"district-index/"+encodeURIComponent(did)+"/"+String(shardFile).split("/").pop());}
async function loadCategoryShard(env,url,shardFile){return loadShard(env,url,"category-index/"+String(shardFile));}
async function exactBusiness(env,url,district,slug){const meta=await loadDistrictIndex(env,url,district);const shard=meta.Business_Slug_To_Shard?.[clean(slug)];if(!shard)return null;const rows=await loadDistrictShard(env,url,district,shard);return rows.find(b=>same(field(b,["Business_Slug"]),slug))||null;}

function pathOf(r){
  if(r.type==="home")return "/";
  if(r.type==="state")return `/in/${r.stateSlug}/`;
  if(r.type==="category")return `/in/all/${r.categorySlug}/`;
  if(r.type==="district")return `/in/${r.stateSlug}/${r.districtSlug}/`;
  if(r.type==="district-category")return `/in/${r.stateSlug}/${r.districtSlug}/${r.categorySlug}/`;
  return `/in/${r.stateSlug}/${r.districtSlug}/${r.categorySlug}/${r.businessSlug}/`;
}
function title(r,d){
  if(r.type==="state")return `${field(d.state,["State_Title"])} Local Businesses | UBnux`;
  if(r.type==="district")return `${field(d.district,["District_Title"])} Local Businesses | UBnux`;
  if(r.type==="category")return `${field(d.category,["Category_Title"])} Businesses in India | UBnux`;
  if(r.type==="district-category")return `${field(d.category,["Category_Title"])} in ${field(d.district,["District_Title"])} | UBnux`;
  if(r.type==="business")return `${field(d.business,["Business_Title"])} | UBnux`;
  return "UBnux — Local Business Search";
}
function description(r,d){
  const s=field(d.state,["State_Title"]),di=field(d.district,["District_Title"]),c=field(d.category,["Category_Title"]),b=field(d.business,["Business_Title"]);
  if(r.type==="state")return `Find businesses, products and services across ${s} on UBnux.`;
  if(r.type==="district")return `Discover local businesses, products and services in ${di} on UBnux.`;
  if(r.type==="category")return `Browse ${c} businesses and services across India on UBnux.`;
  if(r.type==="district-category")return `Find ${c} businesses and services in ${di} on UBnux.`;
  if(r.type==="business")return `View ${b} business information on UBnux.`;
  return "UBnux local business search engine.";
}
function businessUrl(b){return field(b,["Business_Seo_Url"])||"/";}
function crumbs(r,d){
  const a=[{"@type":"ListItem","position":1,"name":"UBnux","item":ORIGIN+"/"}];
  if(d.state)a.push({"@type":"ListItem","position":a.length+1,"name":field(d.state,["State_Title"]),"item":abs(field(d.state,["State_Seo_Url"])||`/in/${r.stateSlug}/`)});
  if(d.district)a.push({"@type":"ListItem","position":a.length+1,"name":field(d.district,["District_Title"]),"item":abs(field(d.district,["District_Seo_Url"])||`/in/${r.stateSlug}/${r.districtSlug}/`)});
  if(d.category)a.push({"@type":"ListItem","position":a.length+1,"name":field(d.category,["Category_Title"]),"item":abs(field(d.category,["Category_Seo_Url"])||(r.type==="category"?`/in/all/${r.categorySlug}/`:`/in/${r.stateSlug}/${r.districtSlug}/${r.categorySlug}/`))});
  if(d.business)a.push({"@type":"ListItem","position":a.length+1,"name":field(d.business,["Business_Title"]),"item":abs(businessUrl(d.business))});
  return a;
}
function schema(r,d){
  const u=ORIGIN+pathOf(r);
  if(r.type==="business"){
    const b=d.business||{},x={"@type":"LocalBusiness","@id":u+"#business","name":field(b,["Business_Title"]),"url":u,"mainEntityOfPage":u,"breadcrumb":{"@type":"BreadcrumbList","itemListElement":crumbs(r,d)}};
    const rating=parseFloat(field(b,["Business_Rating"])),reviews=parseInt(field(b,["Business_Review","Business_Review_Count"]),10);
    if(Number.isFinite(rating)&&rating>0&&Number.isFinite(reviews)&&reviews>0)x.aggregateRating={"@type":"AggregateRating","ratingValue":rating,"reviewCount":reviews};
    const phone=field(b,["Business_Phone","Business_Mobile","Mobile"]),email=field(b,["Business_Email","Email"]),address=field(b,["Business_Address","Address"]);
    if(phone)x.telephone=phone;if(email)x.email=email;if(address)x.address={"@type":"PostalAddress","streetAddress":address};
    return {"@context":"https://schema.org","@graph":[x]};
  }
  const items=(d.businesses||[]).slice(0,100).map((b,i)=>({"@type":"ListItem","position":i+1,"name":field(b,["Business_Title"]),"url":abs(businessUrl(b))}));
  const g=[{"@type":"CollectionPage","@id":u+"#page","url":u,"name":title(r,d)},{"@type":"BreadcrumbList","itemListElement":crumbs(r,d)}];
  if(items.length)g.push({"@type":"ItemList","itemListElement":items});
  return {"@context":"https://schema.org","@graph":g};
}
function uniqueBusinesses(list){const seen=new Set(),out=[];for(const b of Array.isArray(list)?list:[]){const key=field(b,["Business_Id","Business_Slug","Business_Seo_Url"]).toLowerCase();if(key&&seen.has(key))continue;if(key)seen.add(key);out.push(b);}return out;}
function cards(d){return uniqueBusinesses(d.businesses).map(b=>`<article class="ubnux-business-card"><a class="ubnux-business-link" href="${esc(businessUrl(b))}"><h3>${esc(field(b,["Business_Title"]))}</h3><p class="ubnux-meta">${esc(field(d.category,["Category_Title"]))}${d.district?" · "+esc(field(d.district,["District_Title"])):""}</p>${field(b,["Business_Rating"])?`<p class="ubnux-rating">★ ${esc(field(b,["Business_Rating"]))}</p>`:""}<span class="ubnux-view">View business →</span></a></article>`).join("");}
function content(r,d){
  if(r.type==="home")return `<section class="ubnux-home"><div class="ubnux-container"><p class="ubnux-eyebrow">LOCAL SEARCH ENGINE</p><h1>Find businesses, products and services.</h1><p class="ubnux-intro">Search UBnux by state, district, category or business.</p></div></section>`;
  if(r.type==="business"){
    const b=d.business;
    return `<section class="ubnux-page-section"><div class="ubnux-container ubnux-business-detail"><p class="ubnux-eyebrow">LOCAL BUSINESS</p><h1>${esc(field(b,["Business_Title"]))}</h1><p class="ubnux-intro">${esc(field(d.category,["Category_Title"]))} in ${esc(field(d.district,["District_Title"]))}</p><div class="ubnux-detail-card"><div><strong>Rating</strong><span>★ ${esc(field(b,["Business_Rating"]))} · ${esc(field(b,["Business_Review","Business_Review_Count"]))} reviews</span></div><div><strong>Status</strong><span>${esc(field(b,["Business_Status"])||"Listed")}</span></div><div><strong>Business ID</strong><span>${esc(field(b,["Business_Id"]))}</span></div></div></div></section>`;
  }
  const h=r.type==="state"?`${field(d.state,["State_Title"])} — Local Businesses & Services`:r.type==="district"?`${field(d.district,["District_Title"])} — Local Businesses & Services`:r.type==="category"?`${field(d.category,["Category_Title"])} Businesses in India`:`${field(d.category,["Category_Title"])} in ${field(d.district,["District_Title"])}`;
  const count=Number(d.businessTotal||0),page=Number(r.page||1),pageCount=Number(d.pageCount||1);
  const html=cards(d);
  return `<section class="ubnux-page-section"><div class="ubnux-container"><p class="ubnux-eyebrow">LOCAL SEARCH</p><h1>${esc(h)}</h1><p class="ubnux-intro">${esc(description(r,d))}</p><div class="ubnux-result-count">${count} business${count===1?"":"es"} available</div>${html?`<div class="ubnux-business-grid">${html}</div>`:`<div class="ubnux-empty">No matching businesses are available yet.</div>`}${pagination(r,page,pageCount)}</div></section>`;
}
function pagination(r,page,pageCount){
  if(r.type==="business"||pageCount<=1)return "";
  const base=pathOf(r);const href=n=>n===1?base:base+`?page=${n}`;
  let html='<nav class="ubnux-pagination" aria-label="Pagination">';
  if(page>1)html+=`<a class="ubnux-page-link" rel="prev" href="${esc(href(page-1))}">← Previous</a>`;
  const start=Math.max(1,page-2),end=Math.min(pageCount,page+2);
  if(start>1)html+=`<a class="ubnux-page-link" href="${esc(href(1))}">1</a>`+(start>2?'<span class="ubnux-page-gap">…</span>':'');
  for(let n=start;n<=end;n++)html+=n===page?`<span class="ubnux-page-link is-current" aria-current="page">${n}</span>`:`<a class="ubnux-page-link" href="${esc(href(n))}">${n}</a>`;
  if(end<pageCount)html+=(end<pageCount-1?'<span class="ubnux-page-gap">…</span>':'')+`<a class="ubnux-page-link" href="${esc(href(pageCount))}">${pageCount}</a>`;
  if(page<pageCount)html+=`<a class="ubnux-page-link" rel="next" href="${esc(href(page+1))}">Next →</a>`;
  return html+'</nav>';
}

async function resolve(env,url,r){
  const loaded=await loadIndex(env,url),ix=loaded.index;
  const d={indexingEnabled:loaded.indexingEnabled,states:ix.States||[],districts:ix.Districts||[],categories:ix.Categories||[],state:null,district:null,category:null,business:null,businesses:[],businessTotal:0,page:1,pageCount:1,hasNext:false};
  if(r.stateSlug)d.state=find(d.states,r.stateSlug,["State_Id"],["State_Slug"]);
  if(r.districtSlug)d.district=find(d.districts,r.districtSlug,["District_Id"],["District_Slug"]);
  if(r.categorySlug)d.category=find(d.categories,r.categorySlug,["Category_Id"],["Category_Slug"]);
  if(r.type==="home"||r.type==="state")return d;
  if(r.type==="category"){
    if(!d.category)return d;const cid=field(d.category,["Category_Id"]),meta=ix.Category_Files?.[cid];if(!meta)return d;
    d.businessTotal=Number(meta.Count||0);d.pageCount=Math.max(1,(meta.Shards||[]).length);d.page=clampPage(Number(r.page||1),d.pageCount);
    const shard=meta.Shards[d.page-1];d.businesses=shard?await loadCategoryShard(env,url,shard.file):[];d.hasNext=d.page<d.pageCount;return d;
  }
  if(!d.state||!d.district)return d;if(!same(field(d.state,["State_Id"]),field(d.district,["State_Id"])))return d;if((r.type==="district-category"||r.type==="business")&&!d.category)return d;
  if(r.type==="business"){d.business=await exactBusiness(env,url,d.district,r.businessSlug);d.businesses=d.business?[d.business]:[];return d;}
  const districtMeta=await loadDistrictIndex(env,url,d.district);
  if(r.type==="district"){
    d.businessTotal=Number(districtMeta.Count||0);d.pageCount=Math.max(1,(districtMeta.Shards||[]).length);d.page=clampPage(Number(r.page||1),d.pageCount);
    const shard=districtMeta.Shards[d.page-1];d.businesses=shard?await loadDistrictShard(env,url,d.district,shard.file):[];d.hasNext=d.page<d.pageCount;return d;
  }
  const cid=field(d.category,["Category_Id"]),shardNames=districtMeta.Category_Shard_Map?.[cid]||[];
  d.businessTotal=Number(districtMeta.Category_Counts?.[cid]||0);d.pageCount=Math.max(1,shardNames.length);d.page=clampPage(Number(r.page||1),d.pageCount);
  const shard=shardNames[d.page-1];d.businesses=shard?await loadDistrictShard(env,url,d.district,shard):[];d.businesses=d.businesses.filter(b=>same(field(b,["Category_Id"]),cid));d.hasNext=d.page<d.pageCount;return d;
}

async function renderSeo(env,request,r){
  const shell=new URL(request.url);shell.pathname="/index.html";shell.search="";
  const shellResponse=await env.ASSETS.fetch(new Request(shell.toString()));
  let html=await shellResponse.text();let d=null;try{d=await resolve(env,request.url,r);}catch(e){d=null;}
  const valid=!!d&&(r.type==="home"||(r.type==="state"&&!!d.state)||(r.type==="category"&&!!d.category&&d.businessTotal>=0)||(r.type==="district"&&!!d.state&&!!d.district&&same(field(d.state,["State_Id"]),field(d.district,["State_Id"])))||(r.type==="district-category"&&!!d.state&&!!d.district&&!!d.category&&same(field(d.state,["State_Id"]),field(d.district,["State_Id"])))||(r.type==="business"&&!!d.state&&!!d.district&&!!d.category&&!!d.business&&same(field(d.state,["State_Id"]),field(d.district,["State_Id"]))));
  const t=valid?title(r,d):"Page Not Found | UBnux",desc=valid?description(r,d):"The requested UBnux page could not be found.",canonical=ORIGIN+pathOf(r),paged=valid&&r.page>1&&r.type!=="business",robots=valid&&d.indexingEnabled?(paged?"noindex,follow":"index,follow"):"noindex,follow";
  html=html.replace(/<title>[\s\S]*?<\/title>/i,`<title>${esc(t)}</title>`).replace(/<meta[^>]+name=["']description["'][^>]*>/i,`<meta name="description" content="${esc(desc)}">`).replace(/<link[^>]+rel=["']canonical["'][^>]*>/i,`<link rel="canonical" href="${esc(canonical)}">`);
  if(!/<meta[^>]+name=["']robots["']/i.test(html))html=html.replace(/<head>/i,`<head><meta name="robots" content="${robots}">`);else html=html.replace(/<meta[^>]+name=["']robots["'][^>]*>/i,`<meta name="robots" content="${robots}">`);
  const bodyContent=valid?content(r,d):`<section class="ubnux-page-section"><div class="ubnux-container"><h1>Page not found</h1></div></section>`;
  html=html.replace(/<main id=["']ubnux-seo-root["'][^>]*>[\s\S]*?<\/main>/i,`<main id="ubnux-seo-root" data-ubnux-ssr="true">${bodyContent}</main>`);
  html=html.replace(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,"");
  if(valid)html=html.replace(/<\/head>/i,`<script type="application/ld+json">${JSON.stringify(schema(r,d))}</script></head>`);
  const headers=new Headers(shellResponse.headers);headers.set("Content-Type","text/html; charset=UTF-8");headers.set("X-Robots-Tag",robots);headers.set("X-UBnux-Route",r.type);headers.set("X-UBnux-Data","exact-file");headers.set("X-UBnux-Page",String(r.page||1));headers.set("Cache-Control","public, max-age=300, s-maxage=3600");
  return new Response(html,{status:valid?200:404,headers});
}

export default {async fetch(request,env){const url=new URL(request.url),r=parse(url.pathname,url.search);if(r.type!=="home"&&r.type!=="not-found"&&url.pathname.startsWith("/in/"))return renderSeo(env,request,r);return env.ASSETS.fetch(request);}};