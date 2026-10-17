/* UBnux Global Search UI v1.2.0 */
(function(window,document){
"use strict";
var DATA="/data/",metaPromise=null;
function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");}
function field(r,n){r=r||{};for(var i=0;i<n.length;i++){if(r[n[i]]!=null&&String(r[n[i]]).trim()!=="")return String(r[n[i]]).trim();}return "";}
function getMeta(){if(metaPromise)return metaPromise;metaPromise=fetch(DATA+"SEO_INDEX.JSON",{cache:"no-cache"}).then(function(r){if(!r.ok)throw new Error("HTTP "+r.status);return r.json();});return metaPromise;}
function params(){var p=new URLSearchParams(window.location.search);return{q:p.get("q")||"",state:p.get("state")||"",district:p.get("district")||"",category:p.get("category")||"",rating:p.get("rating")||"",verified:p.get("verified")||"",sort:p.get("sort")||"relevance"};}
function option(value,label,selected){return '<option value="'+esc(value)+'"'+(selected?' selected':'')+'>'+esc(label)+'</option>';}
function setup(index){
 var form=document.getElementById("ubnux-global-header-form");if(!form)return;
 var q=document.getElementById("ubnux-global-header-q"),state=document.getElementById("ubnux-global-header-state"),district=document.getElementById("ubnux-global-header-district"),category=document.getElementById("ubnux-global-header-category"),rating=document.getElementById("ubnux-global-header-rating"),verified=document.getElementById("ubnux-global-header-verified"),sort=document.getElementById("ubnux-global-header-sort");
 var p=params(),states=index.States||[],districts=index.Districts||[],cats=index.Categories||[];
 q.value=p.q;
 state.innerHTML='<option value="">All States</option>'+states.map(function(x){return option(field(x,["State_Id"]),field(x,["State_Title"]),field(x,["State_Id"])===p.state);}).join("");
 category.innerHTML='<option value="">All Categories</option>'+cats.map(function(x){return option(field(x,["Category_Id"]),field(x,["Category_Title"]),field(x,["Category_Id"])===p.category);}).join("");
 function renderDistricts(selected){var sid=state.value,list=sid?districts.filter(function(x){return field(x,["State_Id"])===sid;}):districts;district.innerHTML='<option value="">All Districts</option>'+list.map(function(x){return option(field(x,["District_Id"]),field(x,["District_Title"]),field(x,["District_Id"])===selected);}).join("");}
 renderDistricts(p.district);rating.value=p.rating;verified.value=p.verified;sort.value=p.sort;
 function clearFilters(){
   state.value="";
   renderDistricts("");
   category.value="";
   rating.value="";
   verified.value="";
   sort.value="relevance";
 }
 function clearSearch(){q.value="";}
 function goWithSearch(){
   var out=new URLSearchParams(),query=q.value.trim();
   if(query)out.set("q",query);
   /* Search mode: filters are intentionally excluded. */
   window.location.href="/search/"+(out.toString()?"?"+out.toString():"");
 }
 function goWithFilters(){
   var out=new URLSearchParams();
   /* Filter mode: search query is intentionally excluded. */
   if(state.value)out.set("state",state.value);
   if(district.value)out.set("district",district.value);
   if(category.value)out.set("category",category.value);
   if(rating.value)out.set("rating",rating.value);
   if(verified.value)out.set("verified",verified.value);
   if(sort.value&&sort.value!=="relevance")out.set("sort",sort.value);
   window.location.href="/search/"+(out.toString()?"?"+out.toString():"");
 }
 state.addEventListener("change",function(){
   clearSearch();
   renderDistricts("");
   goWithFilters();
 });
 [district,category,rating,verified,sort].forEach(function(el){el.addEventListener("change",function(){clearSearch();goWithFilters();});});
 form.addEventListener("submit",function(e){
   e.preventDefault();
   clearFilters();
   goWithSearch();
 });
}
function start(){getMeta().then(setup).catch(function(e){console.error("UBnux global search UI failed",e);});}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
window.UBnuxGlobalSearchUI={version:"1.2.0",start:start};
})(window,document);
