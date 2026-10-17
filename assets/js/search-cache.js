/* UBnux Search Data Cache Guard v1.0.0 */
(function(window){
  "use strict";
  var nativeFetch=window.fetch.bind(window);
  var BUCKET=Math.floor(Date.now()/3600000);
  window.fetch=function(input,init){
    var original=typeof input==="string"?input:(input&&input.url)||"";
    if(original.indexOf("/data/")!==-1){
      var u=new URL(original,window.location.origin);
      u.searchParams.set("ubnux_data",String(BUCKET));
      var next=Object.assign({},init||{}, {cache:"no-store"});
      if(typeof input==="string") return nativeFetch(u.toString(),next);
      try{return nativeFetch(new Request(u.toString(),input),next);}catch(e){return nativeFetch(u.toString(),next);}
    }
    return nativeFetch(input,init);
  };
})(window);
