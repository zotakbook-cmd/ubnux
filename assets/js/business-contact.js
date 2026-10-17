/* UBnux Business Contact Client v1.4.0 */
(function(window, document){
  'use strict';

  // Same-origin Cloudflare Worker proxy. The Worker talks to Google Apps Script,
  // so the browser never depends on Apps Script CORS/redirect behaviour.
  var API_URL = '/api/business-contact';
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
    var call = box.querySelector('[data-contact-call]');
    var whatsapp = box.querySelector('[data-contact-whatsapp]');
    if (call) { call.setAttribute('hidden', ''); call.removeAttribute('href'); }
    if (whatsapp) { whatsapp.setAttribute('hidden', ''); whatsapp.removeAttribute('href'); }
    box.removeAttribute('data-contact-ready');
    box.removeAttribute('data-contact-unavailable');
  }

  function applyResult(box, result){
    var phone = String(result && result.phone || '').replace(/\D/g, '');
    var call = box.querySelector('[data-contact-call]');
    var whatsapp = box.querySelector('[data-contact-whatsapp]');
    if (!result || !result.found || !phone) throw new Error('Business phone not found');

    if (call) {
      call.href = 'tel:+' + phone;
      call.removeAttribute('hidden');
    }
    if (whatsapp) {
      whatsapp.href = 'https://wa.me/' + phone;
      whatsapp.removeAttribute('hidden');
    }

    box.removeAttribute('data-contact-loading');
    box.setAttribute('data-contact-ready', 'true');
    box.removeAttribute('data-contact-unavailable');
  }

  function request(box, businessId, district){
    var url = API_URL + '?district=' + encodeURIComponent(district) + '&businessId=' + encodeURIComponent(businessId) + '&_=' + (++requestSerial);
    box.setAttribute('data-contact-loading', 'true');
    reset(box);

    return fetch(url, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { 'Accept': 'application/json' }
    })
      .then(function(response){
        return response.text().then(function(text){
          var result;
          try { result = JSON.parse(text); }
          catch (e) { throw new Error('Contact proxy returned invalid JSON'); }
          if (!response.ok) throw new Error(result && result.error || ('Contact proxy HTTP ' + response.status));
          return result;
        });
      })
      .then(function(result){ applyResult(box, result); })
      .catch(function(error){
        box.removeAttribute('data-contact-loading');
        box.setAttribute('data-contact-unavailable', 'true');
        if (window.console && console.warn) console.warn('[UBnux contact]', error && error.message ? error.message : error);
      });
  }

  function hydrateBox(box, businessId, district){
    if (!box || !businessId || !district) return;
    request(box, businessId, district);
  }

  function hydrateBusiness(business, data){
    var box = document.querySelector('[data-ubnux-contact-actions]');
    if (!box) return;
    var businessId = field(business, ['Business_Id']) || box.getAttribute('data-business-id') || '';
    var district = field(data && data.district, ['District_Title']) || box.getAttribute('data-district') || '';
    hydrateBox(box, businessId, district);
  }

  function autoHydrate(){
    var boxes = document.querySelectorAll('[data-ubnux-contact-actions]');
    for (var i = 0; i < boxes.length; i++) {
      var box = boxes[i];
      hydrateBox(box, box.getAttribute('data-business-id') || '', box.getAttribute('data-district') || '');
    }
  }

  window.UBnuxBusinessContact = {
    version: '1.4.0',
    hydrateBusiness: hydrateBusiness,
    autoHydrate: autoHydrate
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoHydrate);
  else autoHydrate();
})(window, document);
