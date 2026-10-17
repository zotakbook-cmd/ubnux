/* UBnux Business Contact Client v1.0.0 */
(function(window, document){
  'use strict';

  // Replace this with the deployed Google Apps Script Web App URL.
  var API_URL = window.UBNUX_CONTACT_API_URL || '';

  function field(row, names){
    row = row || {};
    for (var i = 0; i < names.length; i++) {
      var value = row[names[i]];
      if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
    }
    return '';
  }

  function hydrateBusiness(business, data){
    var box = document.querySelector('[data-ubnux-contact-actions]');
    if (!box || !API_URL || !business) return;

    var businessId = field(business, ['Business_Id']);
    var district = field(data && data.district, ['District_Title']);
    if (!businessId || !district) return;

    var url = API_URL + (API_URL.indexOf('?') >= 0 ? '&' : '?') +
      'district=' + encodeURIComponent(district) +
      '&businessId=' + encodeURIComponent(businessId);

    fetch(url, { cache: 'no-store' })
      .then(function(response){
        if (!response.ok) throw new Error('Contact API HTTP ' + response.status);
        return response.json();
      })
      .then(function(result){
        var phone = String(result && result.phone || '').replace(/\D/g, '');
        if (!result || !result.found || !phone) return;

        var call = box.querySelector('[data-contact-call]');
        var whatsapp = box.querySelector('[data-contact-whatsapp]');
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
      })
      .catch(function(){
        box.removeAttribute('data-contact-loading');
        box.setAttribute('data-contact-unavailable', 'true');
      });
  }

  window.UBnuxBusinessContact = {
    version: '1.0.0',
    hydrateBusiness: hydrateBusiness
  };
})(window, document);
