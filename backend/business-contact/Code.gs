/* UBnux Business Contact API v1.1.0
 * District sheet name = district (Siwan, Patna, etc.)
 * Column A = Business ID, Column B = phone number
 */

const UBNUX_CONTACT_CONFIG = {
  SPREADSHEET_ID: '1wPp7VT54l_ffu3_hlCnwNIHLRshthkyj77MBvJmxRJY',
  CACHE_SECONDS: 300
};

function doGet(e) {
  const p = (e && e.parameter) || {};
  const district = clean_(p.district);
  const businessId = clean_(p.businessId);
  const callback = cleanCallback_(p.callback);

  let payload;
  if (!district || !businessId) {
    payload = {ok:false,error:'district and businessId are required'};
  } else {
    try {
      const phone = findPhone_(district, businessId);
      payload = {ok:true, found:!!phone, phone:phone || ''};
    } catch (err) {
      payload = {ok:false,error:String(err && err.message ? err.message : err)};
    }
  }

  return callback ? jsonp_(callback, payload) : json_(payload);
}

function findPhone_(district, businessId) {
  const cache = CacheService.getScriptCache();
  const key = 'phone:' + normalize_(district) + ':' + normalize_(businessId);
  const cached = cache.get(key);
  if (cached !== null) return cached;
  if (!UBNUX_CONTACT_CONFIG.SPREADSHEET_ID || UBNUX_CONTACT_CONFIG.SPREADSHEET_ID === 'PUT_YOUR_GOOGLE_SHEET_ID_HERE') {
    throw new Error('Google Spreadsheet ID is not configured');
  }
  const ss = SpreadsheetApp.openById(UBNUX_CONTACT_CONFIG.SPREADSHEET_ID);
  const sheet = findDistrictSheet_(ss, district);
  if (!sheet) return '';
  const lastRow = sheet.getLastRow();
  if (lastRow < 1) return '';
  const values = sheet.getRange(1, 1, lastRow, 2).getDisplayValues();
  const target = normalize_(businessId);
  for (let i = 0; i < values.length; i++) {
    if (normalize_(values[i][0]) === target) {
      const phone = normalizePhone_(values[i][1]);
      cache.put(key, phone || '', phone ? UBNUX_CONTACT_CONFIG.CACHE_SECONDS : 60);
      return phone;
    }
  }
  cache.put(key, '', 60);
  return '';
}

function findDistrictSheet_(ss, district) {
  const wanted = normalize_(district);
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    if (normalize_(sheets[i].getName()) === wanted) return sheets[i];
  }
  return null;
}

function normalize_(value) {
  return String(value == null ? '' : value).trim().toLowerCase().replace(/\s+/g, ' ');
}

function clean_(value) {
  return String(value == null ? '' : value).trim().slice(0, 120);
}

function cleanCallback_(value) {
  const callback = String(value == null ? '' : value).trim();
  return /^[A-Za-z_$][0-9A-Za-z_$\.]{0,80}$/.test(callback) ? callback : '';
}

function normalizePhone_(value) {
  const raw = String(value == null ? '' : value).trim();
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 10) digits = '91' + digits;
  else if (digits.length === 11 && digits.charAt(0) === '0') digits = '91' + digits.slice(1);
  return digits;
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function jsonp_(callback, payload) {
  return ContentService.createTextOutput(callback + '(' + JSON.stringify(payload) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
