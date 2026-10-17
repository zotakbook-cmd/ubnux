/* UBnux Business Contact Client v2.0.0 */
(function(window, document){
'use strict';

var API_URL = window.UBNUX_CONTACT_API_URL || '/api/business-contact';
var DIRECT_API_URL = 'https://script.google.com/macros/s/AKfycbzb2ycoXQEZtQW_QkIE8FayjIjH0uwnMhvbJgish3s9y55jkmy1gb1PGx7SJMEn40W_/exec';

function field(row, names){
  row = row || {};
  for(var i=0;i<names.length;i++){
    var value = row[names[i]];
    if(value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
  }
  return '';
}

function normalizeMap(value){
  var v = String(value || '').trim();
  if(!v) return '';
  return /^https?:\/\//i.test(v) ? v : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(v);
}

function normalizeWebsite(value){
  var v = String(value || '').trim();
  if(!v) return '';
  return /^https?:\/\//i.test(v) ? v : 'https://' + v;
}

function hide(el){ if(el) el.setAttribute('hidden',''); }
function show(el){ if(el) el.removeAttribute('hidden'); }

function setLink(box, selector, url){
  var el = box.querySelector(selector);
  if(!el) return;
  if(url){ el.href = url; show(el); }
  else { hide(el); el.removeAttribute('href'); }
}

function reset(box){
  ['[data-contact-call]','[data-contact-whatsapp]','[data-contact-map]','[data-contact-website]'].forEach(function(selector){
    var el = box.querySelector(selector);
    if(el){ hide(el); el.removeAttribute('href'); }
  });
  box.removeAttribute('data-contact-ready');
  box.removeAttribute('data-contact-unavailable');
}

function applyResult(box, result){
  result = result || {};
  var phone = String(result.phone || '').replace(/\D/g,'');
  var call = box.querySelector('[data-contact-call]');
  var whatsapp = box.querySelector('[data-contact-whatsapp]');

  if(!result.found || !phone) throw new Error('Business contact not found');

  if(call){ call.href = 'tel:+' + phone; show(call); }
  if(whatsapp){ whatsapp.href = 'https://wa.me/' + phone; show(whatsapp); }
  setLink(box, '[data-contact-map]', normalizeMap(result.map));
  setLink(box, '[data-contact-website]', normalizeWebsite(result.website));

  var description = box.querySelector('[data-contact-description-text]');
  if(description && String(result.description || '').trim()){
    description.textContent = String(result.description).trim();
  }

  box.removeAttribute('data-contact-loading');
  box.setAttribute('data-contact-ready','true');
  box.removeAttribute('data-contact-unavailable');
}

function requestJSON(url){
  return fetch(url, {
    method:'GET',
    cache:'no-store',
    credentials:'same-origin',
    headers:{Accept:'application/json'}
  }).then(function(response){
    return response.text().then(function(text){
      var result;
      try { result = JSON.parse(text); }
      catch(e){ throw new Error('Invalid contact API response'); }
      if(!response.ok) throw new Error(result && result.error || ('Contact API HTTP ' + response.status));
      return result;
    });
  });
}

function directJSONP(businessId, district){
  return new Promise(function(resolve,reject){
    var callbackName = '__ubnuxContact_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    var script = document.createElement('script');
    var done = false;
    var timer = setTimeout(function(){ finish(new Error('Direct contact lookup timed out')); }, 7000);

    function cleanup(){
      clearTimeout(timer);
      try { delete window[callbackName]; } catch(e){ window[callbackName] = undefined; }
      if(script.parentNode) script.parentNode.removeChild(script);
    }
    function finish(error, result){
      if(done) return;
      done = true;
      cleanup();
      if(error) reject(error); else resolve(result);
    }

    window[callbackName] = function(result){ finish(null, result); };
    script.onerror = function(){ finish(new Error('Direct contact lookup failed')); };
    script.src = DIRECT_API_URL + '?district=' + encodeURIComponent(district) + '&businessId=' + encodeURIComponent(businessId) + '&callback=' + encodeURIComponent(callbackName);
    script.async = true;
    document.head.appendChild(script);
  });
}

function hydrateBox(box, businessId, district){
  if(!box || !businessId || !district) return;

  reset(box);
  box.setAttribute('data-contact-loading','true');

  var url = API_URL + '?district=' + encodeURIComponent(district) + '&businessId=' + encodeURIComponent(businessId);

  // Primary path: one same-origin request returns phone + map + website + description.
  requestJSON(url)
    .then(function(result){ applyResult(box, result); })
    .catch(function(){
      // Fallback only when the same-origin proxy is unavailable.
      return directJSONP(businessId, district).then(function(result){ applyResult(box, result); });
    })
    .catch(function(error){
      box.removeAttribute('data-contact-loading');
      box.setAttribute('data-contact-unavailable','true');
      if(window.console && console.warn) console.warn('[UBnux contact]', error && error.message ? error.message : error);
    });
}

function hydrateBusiness(business, data){
  var box = document.querySelector('[data-ubnux-contact-actions]');
  if(!box) return;
  hydrateBox(
    box,
    field(business, ['Business_Id']) || box.getAttribute('data-business-id') || '',
    field(data && data.district, ['District_Title']) || box.getAttribute('data-district') || ''
  );
}

function autoHydrate(){
  document.querySelectorAll('[data-ubnux-contact-actions]').forEach(function(box){
    hydrateBox(box, box.getAttribute('data-business-id') || '', box.getAttribute('data-district') || '');
  });
}

window.UBnuxBusinessContact = {
  version:'2.0.0',
  hydrateBusiness:hydrateBusiness,
  autoHydrate:autoHydrate
};

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoHydrate);
else autoHydrate();

})(window, document);
