/* UBnux Business Contact Client v1.2.0 */
(function(window, document){
  'use strict';

  var API_URL = 'https://script.google.com/macros/s/AKfycbzb2ycoXQEZtQW_QkIE8FayjIjH0uwnMhvbJgish3s9y55jkmy1gb1PGx7SJMEn40W_/exec';

  function field(row, names){
    row = row || {};
    for (var i = 0; i < names.length; i++) {
      var value = row[names[i]];
      if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
    }
    return '';
  }

  function hydrateBox(box, businessId, district){
    if (!box || !API_URL || !businessId || !district) return;
    var url = API_URL + (API_URL.indexOf('?') >= 0 ? '&' : '?') +
      'district=' + encodeURIComponent(district) + '&businessId=' + encodeURIComponent(businessId);

    fetch(url, { cache: 'no-store' })
      .then(function(response){
        if (!response.ok) throw new Error('Contact API HTTP ' + response.status);
        return response.json();
      })
      .then(function(result){
        var phone = String(result && result.phone || '').replace(/\D/g, '');
        var call = box.querySelector('[data-contact-call]');
        var whatsapp = box.querySelector('[data-contact-whatsapp]');
        if (!result || !result.found || !phone) throw new Error('Business phone not found');
        if (call) { call.href = 'tel:+' + phone; call.removeAttribute('hidden'); }
        if (whatsapp) { whatsapp.href = 'https://wa.me/' + phone; whatsapp.removeAttribute('hidden'); }
        box.removeAttribute('data-contact-loading');
        box.setAttribute('data-contact-ready', 'true');
      })
      .catch(function(){
        box.removeAttribute('data-contact-loading');
        box.setAttribute('data-contact-unavailable', 'true');
      });
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
    version: '1.2.0',
    hydrateBusiness: hydrateBusiness,
    autoHydrate: autoHydrate
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoHydrate);
  else autoHydrate();
})(window, document);
