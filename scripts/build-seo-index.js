const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const BUSINESS_DIR = path.join(DATA, 'businesses');
const CATEGORY_OUT = path.join(DATA, 'category-index');
const DISTRICT_OUT = path.join(DATA, 'district-index');
const SEO_INDEX = path.join(DATA, 'SEO_INDEX.JSON');
const SHARD_SIZE = 1000;
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function arr(data,keys=[]){if(Array.isArray(data))return data;for(const key of keys)if(Array.isArray(data?.[key]))return data[key];return data&&typeof data==='object'?[data]:[];}
function field(row,names){for(const name of names)if(row?.[name]!=null&&String(row[name]).trim()!=='')return String(row[name]).trim();return '';}
function compact(b){return{Business_Title:field(b,['Business_Title']),Category_Id:field(b,['Category_Id']),District_Id:field(b,['District_Id']),Business_Id:field(b,['Business_Id']),Business_Slug:field(b,['Business_Slug']),Business_Rating:b.Business_Rating??0,Business_Review:b.Business_Review??0,Business_Status:field(b,['Business_Status']),Business_Seo_Url:field(b,['Business_Seo_Url'])};}
const states=arr(readJson(path.join(DATA,'STATE.JSON')),['states','data','items']);
const districts=arr(readJson(path.join(DATA,'DISTRICT.JSON')),['districts','data','items']);
const categories=arr(readJson(path.join(DATA,'CATEGORY.JSON')),['categories','data','items']);
const files=fs.readdirSync(BUSINESS_DIR).filter(f=>/_BUSINESS_INDEX\.JSON$/i.test(f)).sort();
fs.rmSync(CATEGORY_OUT,{recursive:true,force:true});fs.rmSync(DISTRICT_OUT,{recursive:true,force:true});fs.mkdirSync(CATEGORY_OUT,{recursive:true});fs.mkdirSync(DISTRICT_OUT,{recursive:true});
const districtById=new Map(districts.map(d=>[field(d,['District_Id']),d]));
const grouped=new Map(categories.map(c=>[field(c,['Category_Id']),[]]));
const districtMeta=new Map();
for(const file of files){
  const rows=arr(readJson(path.join(BUSINESS_DIR,file)),['businesses','data','items']);
  const did=field(rows[0],['District_Id']); if(!did||!districtById.has(did))continue;
  const dir=path.join(DISTRICT_OUT,did);fs.mkdirSync(dir,{recursive:true});
  const shards=[],slugToShard={},categoryCounts={},categoryShards={};
  for(let i=0;i<rows.length;i+=SHARD_SIZE){
    const n=String(Math.floor(i/SHARD_SIZE)+1).padStart(4,'0'),name=`${n}.JSON`,slice=rows.slice(i,i+SHARD_SIZE);
    fs.writeFileSync(path.join(dir,name),JSON.stringify(slice),'utf8');
    for(const b of slice){
      const slug=field(b,['Business_Slug']);if(slug)slugToShard[slug.toLowerCase()]=name;
      const cid=field(b,['Category_Id']);
      if(cid){categoryCounts[cid]=(categoryCounts[cid]||0)+1;(categoryShards[cid]||(categoryShards[cid]=[])).push(name);}
      if(grouped.has(cid))grouped.get(cid).push(compact(b));
    }
    shards.push({file:`${did}/${name}`,from:i,to:i+slice.length,count:slice.length});
  }
  for(const cid of Object.keys(categoryShards)) categoryShards[cid]=[...new Set(categoryShards[cid])];
  fs.writeFileSync(path.join(dir,'INDEX.JSON'),JSON.stringify({Version:'1.1.0',District_Id:did,Count:rows.length,Page_Size:SHARD_SIZE,Category_Counts:categoryCounts,Category_Shard_Map:categoryShards,Shards:shards,Business_Slug_To_Shard:slugToShard}),'utf8');
  districtMeta.set(did,{Index:`district-index/${did}/INDEX.JSON`,Count:rows.length,Page_Size:SHARD_SIZE,Category_Counts:categoryCounts,Category_Shard_Map:categoryShards,Shards:shards});
}
const categoryFiles={};
for(const c of categories){
  const id=field(c,['Category_Id']),rows=grouped.get(id)||[];rows.sort((a,b)=>String(a.Business_Title).localeCompare(String(b.Business_Title)));
  const dir=path.join(CATEGORY_OUT,id);fs.mkdirSync(dir,{recursive:true});const shards=[];
  for(let i=0;i<rows.length;i+=SHARD_SIZE){const n=String(Math.floor(i/SHARD_SIZE)+1).padStart(4,'0'),name=`${n}.JSON`,slice=rows.slice(i,i+SHARD_SIZE);fs.writeFileSync(path.join(dir,name),JSON.stringify(slice),'utf8');shards.push({file:`${id}/${name}`,from:i,to:i+slice.length,count:slice.length});}
  if(!shards.length){fs.writeFileSync(path.join(dir,'0001.JSON'),'[]','utf8');shards.push({file:`${id}/0001.JSON`,from:0,to:0,count:0});}
  categoryFiles[id]={Category_Id:id,Category_Slug:field(c,['Category_Slug']),Count:rows.length,Page_Size:SHARD_SIZE,Shards:shards};
}
const index={Version:'3.3.0',GeneratedAt:new Date().toISOString(),Shard_Size:SHARD_SIZE,States:states,Districts:districts.map(d=>{const id=field(d,['District_Id']);return{...d,...(districtMeta.get(id)||{Count:0,Category_Counts:{},Category_Shard_Map:{},Shards:[]})};}),Categories:categories,Category_Files:categoryFiles};
fs.writeFileSync(SEO_INDEX,JSON.stringify(index),'utf8');
console.log(`Built exact SEO index: ${states.length} states, ${districts.length} districts, ${categories.length} categories, ${files.length} district source files.`);
