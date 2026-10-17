/* UBnux SEO Router v1.4.0 */
(function (window) {
  "use strict";
  function clean(value){return String(value||"").trim().toLowerCase().replace(/^\/+|\/+$/g,"");}
  function pageFromSearch(search){try{var params=new URLSearchParams(search||window.location.search||"");var raw=params.get("page");var value=Number(raw);return raw!==null&&Number.isInteger(value)&&value>0?value:1;}catch(error){return 1;}}
  function parse(pathname,search){
    var raw=pathname||window.location.pathname||"/",path=clean(raw),parts=path?path.split("/").filter(Boolean):[],page=pageFromSearch(search);
    if(!parts.length)return{type:"home",parts:[],page:1,valid:true};
    if(parts[0]==="search")return{type:"search",parts:parts,page:page,valid:true};
    if(parts[0]!=="in")return{type:"not-found",parts:parts,page:1,valid:false};
    var rest=parts.slice(1);if(!rest.length)return{type:"home",parts:[],page:1,valid:true};
    if(rest.length===1)return{type:"state",stateSlug:rest[0],parts:rest,page:1,valid:true};
    if(rest.length===2&&rest[0]==="all")return{type:"category",categorySlug:rest[1],parts:rest,page:page,valid:true};
    if(rest.length===2)return{type:"district",stateSlug:rest[0],districtSlug:rest[1],parts:rest,page:page,valid:true};
    if(rest.length===3)return{type:"district-category",stateSlug:rest[0],districtSlug:rest[1],categorySlug:rest[2],parts:rest,page:page,valid:true};
    if(rest.length===4)return{type:"business",stateSlug:rest[0],districtSlug:rest[1],categorySlug:rest[2],businessSlug:rest[3],parts:rest,page:1,valid:true};
    return{type:"not-found",parts:rest,page:1,valid:false};
  }
  window.UBnuxSEORouter={version:"1.4.0",parse:parse,normalize:clean,getPage:pageFromSearch};
})(window);
