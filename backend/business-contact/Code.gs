/* UBnux Business Contact API v1.0.0
 * District sheet name = district (Siwan, Patna, etc.)
 * Column A = Business ID, Column B = phone number
 */

const UBNUX_CONTACT_CONFIG = {
  SPREADSHEET_ID: 'PUT_YOUR_GOOGLE_SHEET_ID_HERE',
  CACHE_SECONDS: 300
};

function doGet(e) {
  const p = (e && e.parameter) || {};
  const district = clean_(p.district);
  const businessId = clean_(p.businessId);
  if (!district || !businessId) return json_({ok:false,error:'district and businessId are required'});
  try {
    const phone = findPhone_(district, businessId);
    return json_({ok:true, found:!!phone, phone:phone || ''});
  } catch (err) {
    return json_({ok:false,error:String(err && err.message ? err.message : err)});
  }
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
