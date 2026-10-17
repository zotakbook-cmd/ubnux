/* UBnux Business Contact Client v1.6.0 */
(function(window, document){
  'use strict';

  var PROXY_URL = '/api/business-contact';
  var DIRECT_API_URL = 'https://script.google.com/macros/s/AKfycbzb2ycoXQEZtQW_QkIE8FayjIjH0uwnMhvbJgish3s9y55jkmy1gb1PGx7SJMEn40W_/exec';
  var requestSerial = 0;

  function field(row, names){
    row = row || {};
    for (var i = 0; i < names.length; i++) {
      var value = row[names[i]];
      if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
    }
    return '';
  }

  function reset(box){
    var selectors = ['[data-contact-call]','[data-contact-whatsapp]','[data-contact-map]','[data-contact-website]'];
    for (var i=0;i<selectors.length;i++) {
      var el = box.querySelector(selectors[i]);
      if (el) { el.setAttribute('hidden',''); el.removeAttribute('href'); }
    }
    box.removeAttribute('data-contact-ready');
    box.removeAttribute('data-contact-unavailable');
  }

  function normalizeMap(value){
    var v = String(value || '').trim();
    if (!v) return '';
    if (/^https?:\/\//i.test(v)) return v;
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(v);
  }

  function normalizeWebsite(value){
    var v = String(value || '').trim();
    if (!v) return '';
    return /^https?:\/\//i.test(v) ? v : 'https://' + v;
  }

  function setOptionalLink(box, selector, url){
    var el = box.querySelector(selector);
    if (!el || !url) return;
    el.href = url;
    el.removeAttribute('hidden');
  }

  function setDescription(box, value){
    var el = box.querySelector('[data-contact-description]');
    var text = String(value || '').trim();
    if (!el || !text) return;
    el.textContent = text;
    el.removeAttribute('hidden');
  }

  function applyResult(box, result){
    var phone = String(result && result.phone || '').replace(/\D/g, '');
    var call = box.querySelector('[data-contact-call]');
    var whatsapp = box.querySelector('[data-contact-whatsapp]');
    if (!result || !result.found || !phone) throw new Error('Business phone not found');

    if (call) { call.href = 'tel:+' + phone; call.removeAttribute('hidden'); }
    if (whatsapp) { whatsapp.href = 'https://wa.me/' + phone; whatsapp.removeAttribute('hidden'); }

    setOptionalLink(box, '[data-contact-map]', normalizeMap(result.map));
    setOptionalLink(box, '[data-contact-website]', normalizeWebsite(result.website));
    setDescription(box, result.description);

    box.removeAttribute('data-contact-loading');
    box.setAttribute('data-contact-ready', 'true');
    box.removeAttribute('data-contact-unavailable');
  }

  function proxyRequest(businessId, district){
    var url = PROXY_URL + '?district=' + encodeURIComponent(district) + '&businessId=' + encodeURIComponent(businessId) + '&_=' + (++requestSerial);
    return fetch(url,{method:'GET',cache:'no-store',credentials:'same-origin',headers:{'Accept':'application/json'}})
      .then(function(response){return response.text().then(function(text){
        var result;
        try { result=JSON.parse(text); } catch(e){ throw new Error('Contact proxy returned invalid JSON'); }
        if (!response.ok) throw new Error(result && result.error || ('Contact proxy HTTP '+response.status));
        if (!result || !result.found || !result.phone) throw new Error('Proxy did not return a phone number');
        return result;
      });});
  }

  function jsonpRequest(businessId,district){
    return new Promise(function(resolve,reject){
      var callbackName='__ubnuxContact_'+Date.now()+'_'+(++requestSerial);
      var script=document.createElement('script'),finished=false;
      var timer=setTimeout(function(){finish(new Error('Direct contact lookup timed out'));},9000);
      function cleanup(){clearTimeout(timer);try{delete window[callbackName];}catch(e){window[callbackName]=undefined;}if(script.parentNode)script.parentNode.removeChild(script);}
      function finish(error,result){if(finished)return;finished=true;cleanup();if(error)reject(error);else resolve(result);}
      window[callbackName]=function(result){if(!result||!result.found||!result.phone){finish(new Error('Google Sheet contact not found'));return;}finish(null,result);};
      script.onerror=function(){finish(new Error('Direct contact lookup failed'));};
      script.src=DIRECT_API_URL+'?district='+encodeURIComponent(district)+'&businessId='+encodeURIComponent(businessId)+'&callback='+encodeURIComponent(callbackName)+'&_='+(++requestSerial);
      script.async=true;document.head.appendChild(script);
    });
  }

  function request(box,businessId,district){
    box.setAttribute('data-contact-loading','true');
    reset(box);
    proxyRequest(businessId,district)
      .then(function(result){
        applyResult(box,result);
        return jsonpRequest(businessId,district).then(function(extra){
          var merged={};
          for(var k in result) merged[k]=result[k];
          for(var j in extra||{}) if(extra[j]!==undefined&&extra[j]!==null&&String(extra[j]).trim()!=='') merged[j]=extra[j];
          applyResult(box,merged);
        }).catch(function(){ return result; });
      })
      .catch(function(){ return jsonpRequest(businessId,district).then(function(result){applyResult(box,result);}); })
      .catch(function(error){
        box.removeAttribute('data-contact-loading');
        box.setAttribute('data-contact-unavailable','true');
        if(window.console&&console.warn)console.warn('[UBnux contact]',error&&error.message?error.message:error);
      });
  }

  function hydrateBox(box,businessId,district){if(!box||!businessId||!district)return;request(box,businessId,district);}
  function hydrateBusiness(business,data){
    var box=document.querySelector('[data-ubnux-contact-actions]');if(!box)return;
    var businessId=field(business,['Business_Id'])||box.getAttribute('data-business-id')||'';
    var district=field(data&&data.district,['District_Title'])||box.getAttribute('data-district')||'';
    hydrateBox(box,businessId,district);
  }
  function autoHydrate(){var boxes=document.querySelectorAll('[data-ubnux-contact-actions]');for(var i=0;i<boxes.length;i++){var box=boxes[i];hydrateBox(box,box.getAttribute('data-business-id')||'',box.getAttribute('data-district')||'');}}

  window.UBnuxBusinessContact={version:'1.6.0',hydrateBusiness:hydrateBusiness,autoHydrate:autoHydrate};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',autoHydrate);else autoHydrate();
})(window,document);
