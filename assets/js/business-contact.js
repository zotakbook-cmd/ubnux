/* UBnux Business Contact Client v2.0.0 */
(function(window,document){'use strict';
var API_URL=window.UBNUX_CONTACT_API_URL||'/api/business-contact';
function field(r,n){r=r||{};for(var i=0;i<n.length;i++){var v=r[n[i]];if(v!==undefined&&v!==null&&String(v).trim()!=='')return String(v).trim();}return '';}
function map(v){v=String(v||'').trim();return v?( /^https?:\/\//i.test(v)?v:'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(v) ):'';}
function site(v){v=String(v||'').trim();return v?( /^https?:\/\//i.test(v)?v:'https://'+v ):'';}
function show(e){if(e)e.removeAttribute('hidden');}function hide(e){if(e)e.setAttribute('hidden','');}
function link(b,s,u){var e=b.querySelector(s);if(!e)return;if(u){e.href=u;show(e);}else{hide(e);e.removeAttribute('href');}}
function apply(b,r){r=r||{};var p=String(r.phone||'').replace(/\D/g,'');if(!r.found||!p)throw Error('Business contact not found');var c=b.querySelector('[data-contact-call]'),w=b.querySelector('[data-contact-whatsapp]');if(c){c.href='tel:+'+p;show(c);}if(w){w.href='https://wa.me/'+p;show(w);}link(b,'[data-contact-map]',map(r.map));link(b,'[data-contact-website]',site(r.website));var d=b.querySelector('[data-contact-description-text]');if(d&&String(r.description||'').trim())d.textContent=String(r.description).trim();b.removeAttribute('data-contact-loading');b.setAttribute('data-contact-ready','true');}
function get(u){return fetch(u,{cache:'no-store',credentials:'same-origin',headers:{Accept:'application/json'}}).then(function(x){return x.text().then(function(t){var r;try{r=JSON.parse(t);}catch(e){throw Error('Invalid contact API response');}if(!x.ok)throw Error(r&&r.error||('HTTP '+x.status));return r;});});}
function hydrate(b,id,d){if(!b||!id||!d)return;b.setAttribute('data-contact-loading','true');var u=API_URL+'?district='+encodeURIComponent(d)+'&businessId='+encodeURIComponent(id);get(u).then(function(r){apply(b,r);}).catch(function(e){b.removeAttribute('data-contact-loading');b.setAttribute('data-contact-unavailable','true');if(console&&console.warn)console.warn('[UBnux contact]',e.message);});}
function hydrateBusiness(business,data){var b=document.querySelector('[data-ubnux-contact-actions]');if(b)hydrate(b,field(business,['Business_Id'])||b.getAttribute('data-business-id')||'',field(data&&data.district,['District_Title'])||b.getAttribute('data-district')||'');}
function auto(){document.querySelectorAll('[data-ubnux-contact-actions]').forEach(function(b){hydrate(b,b.getAttribute('data-business-id')||'',b.getAttribute('data-district')||'');});}
window.UBnuxBusinessContact={version:'2.0.0',hydrateBusiness:hydrateBusiness,autoHydrate:auto};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',auto);else auto();
})(window,document);
