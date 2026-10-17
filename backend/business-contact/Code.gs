/* UBnux Business Contact API v2.0.0
 * A = Business ID
 * B = Phone
 * C = Map / Google Maps URL or location text
 * D = Website URL
 * E = Business Description
 *
 * Designed for one-request frontend hydration.
 */

const UBNUX_CONTACT_CONFIG = {
  SPREADSHEET_ID: '1wPp7VT54l_ffu3_hlCnwNIHLRshthkyj77MBvJmxRJY',
  CACHE_SECONDS: 600,
  EMPTY_CACHE_SECONDS: 30
};

function doGet(e) {
  const p = (e && e.parameter) || {};
  const district = clean_(p.district);
  const businessId = clean_(p.businessId);
  const callback = cleanCallback_(p.callback);

  let payload;
  if (!district || !businessId) {
    payload = { ok:false, found:false, error:'district and businessId are required' };
  } else {
    try {
      const record = findBusiness_(district, businessId);
      payload = {
        ok: true,
        found: !!record.phone,
        businessId: businessId,
        district: district,
        phone: record.phone || '',
        map: record.map || '',
        website: record.website || '',
        description: record.description || ''
      };
    } catch (err) {
      payload = { ok:false, found:false, error:String(err && err.message ? err.message : err) };
    }
  }

  return callback ? jsonp_(callback, payload) : json_(payload);
}

function findBusiness_(district, businessId) {
  const cache = CacheService.getScriptCache();
  const key = 'bc2:' + normalize_(district) + ':' + normalize_(businessId);
  const cached = cache.get(key);
  if (cached) {
    try { return JSON.parse(cached); } catch (e) {}
  }

  const ss = SpreadsheetApp.openById(UBNUX_CONTACT_CONFIG.SPREADSHEET_ID);
  const sheet = findDistrictSheet_(ss, district);
  if (!sheet) return cacheEmpty_(cache, key);

  const lastRow = sheet.getLastRow();
  if (lastRow < 1) return cacheEmpty_(cache, key);

  // Read only A:E once. Display values preserve phone numbers as shown in Sheets.
  const values = sheet.getRange(1, 1, lastRow, 5).getDisplayValues();
  const target = normalize_(businessId);

  for (let i = 0; i < values.length; i++) {
    if (normalize_(values[i][0]) !== target) continue;

    const record = {
      phone: normalizePhone_(values[i][1]),
      map: clean_(values[i][2]),
      website: clean_(values[i][3]),
      description: clean_(values[i][4])
    };

    cache.put(
      key,
      JSON.stringify(record),
      record.phone ? UBNUX_CONTACT_CONFIG.CACHE_SECONDS : UBNUX_CONTACT_CONFIG.EMPTY_CACHE_SECONDS
    );
    return record;
  }

  return cacheEmpty_(cache, key);
}

function cacheEmpty_(cache, key) {
  const empty = { phone:'', map:'', website:'', description:'' };
  cache.put(key, JSON.stringify(empty), UBNUX_CONTACT_CONFIG.EMPTY_CACHE_SECONDS);
  return empty;
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
  return String(value == null ? '' : value).trim().slice(0, 2000);
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
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonp_(callback, payload) {
  return ContentService.createTextOutput(callback + '(' + JSON.stringify(payload) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
