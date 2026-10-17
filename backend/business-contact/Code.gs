/* UBnux Business Contact API v2.2.0
 * A = Business ID
 * B = Phone
 * C = Map / Google Maps URL or location text
 * D = Website URL
 * E = Business Description
 * Exact Business ID lookup; one request returns the complete A:E row.
 */

const UBNUX_CONTACT_CONFIG = {
  SPREADSHEET_ID: '1wPp7VT54l_ffu3_hlCnwNIHLRshthkyj77MBvJmxRJY',
  CACHE_SECONDS: 300,
  EMPTY_CACHE_SECONDS: 15
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
        found: !!record.found,
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
  const key = 'bc4:' + normalize_(district) + ':' + normalize_(businessId);
  const cached = cache.get(key);
  if (cached) {
    try { return JSON.parse(cached); } catch (e) {}
  }

  const ss = SpreadsheetApp.openById(UBNUX_CONTACT_CONFIG.SPREADSHEET_ID);
  const sheet = findDistrictSheet_(ss, district);
  if (!sheet) throw new Error('District sheet not found: ' + district);

  const lastRow = sheet.getLastRow();
  if (lastRow < 1) return cacheEmpty_(cache, key);

  const values = sheet.getRange(1, 1, lastRow, 5).getDisplayValues();
  const target = normalizeId_(businessId);

  // Exact Business ID match in Column A only.
  for (let i = 0; i < values.length; i++) {
    const rowId = normalizeId_(values[i][0]);
    if (!rowId || rowId !== target) continue;

    const record = {
      found: true,
      phone: normalizePhone_(values[i][1]),
      map: clean_(values[i][2]),
      website: clean_(values[i][3]),
      description: clean_(values[i][4])
    };
    cache.put(key, JSON.stringify(record), UBNUX_CONTACT_CONFIG.CACHE_SECONDS);
    return record;
  }

  return cacheEmpty_(cache, key);
}

function findDistrictSheet_(ss, district) {
  const wanted = normalize_(district);
  const sheets = ss.getSheets();

  // First preference: exact district sheet name.
  for (let i = 0; i < sheets.length; i++) {
    if (normalize_(sheets[i].getName()) === wanted) return sheets[i];
  }

  // Safe compatibility fallback for names such as Siwan_Business.
  const wantedCompact = wanted.replace(/[^a-z0-9]/g, '');
  for (let i = 0; i < sheets.length; i++) {
    const nameCompact = normalize_(sheets[i].getName()).replace(/[^a-z0-9]/g, '');
    if (nameCompact === wantedCompact || nameCompact === wantedCompact + 'business') return sheets[i];
  }
  return null;
}

function normalize_(value) {
  return String(value == null ? '' : value).trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeId_(value) {
  return String(value == null ? '' : value).trim().toLowerCase();
}

function clean_(value) {
  return String(value == null ? '' : value).trim().slice(0, 4000);
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
  return ContentService.createTextOutput(callback + '(' + JSON.stringify(payload) + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
}
