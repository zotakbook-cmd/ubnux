/* UBnux Exact SEO Data Resolver v2.1.0 */
(function(window){"use strict";
var BASE="/data/",cache=Object.create(null);
function n(v){return String(v==null?"":v).trim().toLowerCase()}
function json(p){if(cache[p])return cache[p];cache[p]=fetch(BASE+p,{cache:"default"}).then(function(r){if(!r.ok)throw Error("Data request failed: "+p);return r.json()});return cache[p]}
function arr(d,k){if(Array.isArray(d))return d;for(var i=0;i<k.length;i++)if(Array.isArray(d&&d[k[i]]))return d[k[i]];return[]}
function f(r,ns){for(var i=0;i<ns.length;i++)if(r&&r[ns[i]]!=null&&String(r[ns[i]]).trim()!=="")return String(r[ns[i]]).trim();return""}
function find(a,s,id,sl){s=n(s);return a.find(function(x){return n(f(x,id))===s||n(f(x,sl))===s})||null}
function index(){return json("SEO_INDEX.JSON").then(function(x){return{states:arr(x,["States"]),districts:arr(x,["Districts"]),categories:arr(x,["Categories"]),categoryFiles:x.Category_Files||{},raw:x}})}
function districtIndex(d){return json("district-index/"+encodeURIComponent(f(d,["District_Id","districtId","id"]))+"/INDEX.JSON")}
function page(r){var x=Number(r&&r.page);return isFinite(x)&&x>0?Math.floor(x):1}
function districtBusinesses(d,p){return districtIndex(d).then(function(m){var x=m.Shards&&m.Shards[page({page:p})-1];if(!x)return[];return json("district-index/"+encodeURIComponent(f(d,["District_Id"]))+"/"+String(x.file).split("/").pop()).then(function(v){return arr(v,["businesses","data","items"])})})}
function business(d,s){return districtIndex(d).then(function(m){var file=m.Business_Slug_To_Shard&&m.Business_Slug_To_Shard[n(s)];if(!file)return null;return json("district-index/"+encodeURIComponent(f(d,["District_Id"]))+"/"+file).then(function(v){return arr(v,["businesses","data","items"]).find(function(b){return n(f(b,["Business_Slug","businessSlug","slug"]))===n(s)})||null})})}
function categoryBusinesses(c,p){var id=f(c,["Category_Id","categoryId","id"]);return index().then(function(ix){var m=ix.categoryFiles[id],x=m&&m.Shards&&m.Shards[page({page:p})-1];if(!x)return[];return json("category-index/"+x.file).then(function(v){return arr(v,["businesses","data","items"])})})}
function districtCategoryBusinesses(d,c,p){var did=f(d,["District_Id"]),cid=f(c,["Category_Id"]);return districtIndex(d).then(function(m){var files=m.Category_Shard_Map&&m.Category_Shard_Map[cid]||[],file=files[page({page:p})-1];if(!file)return[];return json("district-index/"+encodeURIComponent(did)+"/"+file).then(function(v){return arr(v,["businesses","data","items"]).filter(function(b){return n(f(b,["Category_Id"]))===n(cid)})})})}
function same(a,b){return n(a)!==""&&n(a)===n(b)}
function resolve(r){return index().then(function(ix){var out={route:r,indexes:ix,state:null,district:null,category:null,business:null,businesses:[],businessTotal:0,page:page(r),errors:[]};if(r.stateSlug)out.state=find(ix.states,r.stateSlug,["State_Id"],["State_Slug"]);if(r.districtSlug)out.district=find(ix.districts,r.districtSlug,["District_Id"],["District_Slug"]);if(r.categorySlug)out.category=find(ix.categories,r.categorySlug,["Category_Id"],["Category_Slug"]);
if(r.type==="home")return out;if(r.type==="state"){if(!out.state)out.errors.push("State not found");return out}
if(r.type==="category"){if(!out.category){out.errors.push("Category not found");return out}var cm=ix.categoryFiles[f(out.category,["Category_Id"])];out.businessTotal=cm?Number(cm.Count||0):0;return categoryBusinesses(out.category,out.page).then(function(x){out.businesses=x;return out})}
if(!out.state)out.errors.push("State not found");if(!out.district)out.errors.push("District not found");if(!out.state||!out.district)return out;if(!same(f(out.state,["State_Id"]),f(out.district,["State_Id"]))) {out.errors.push("District does not belong to state");return out}
if(r.type==="district"&&out.category){out.errors.push("Invalid district route");return out}if((r.type==="district-category"||r.type==="business")&&!out.category){out.errors.push("Category not found");return out}
var dm=ix.districts.find(function(d){return same(f(d,["District_Id"]),f(out.district,["District_Id"]))})||{};out.businessTotal=Number(dm.Count||0);
if(r.type==="business")return business(out.district,r.businessSlug).then(function(b){out.business=b;out.businesses=b?[b]:[];if(!b)out.errors.push("Business not found");return out});
if(r.type==="district-category"){out.businessTotal=Number((dm.Category_Counts||{})[f(out.category,["Category_Id"])]||0);return districtCategoryBusinesses(out.district,out.category,out.page).then(function(x){out.businesses=x;return out})}
return districtBusinesses(out.district,out.page).then(function(x){out.businesses=x;return out})})}
window.UBnuxSEOData={version:"2.1.0",loadIndexes:index,loadDistrictIndex:districtIndex,loadDistrictBusinesses:districtBusinesses,loadBusiness:business,loadCategoryBusinesses:categoryBusinesses,loadDistrictCategoryBusinesses:districtCategoryBusinesses,resolve:resolve};
})(window);
