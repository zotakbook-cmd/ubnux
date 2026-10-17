/* UBnux Business Contact API v2.6.0
 * A = Business ID
 * B = Phone
 * C = Map / Google Maps URL or location text
 * D = Website URL
 * E = Business Description
 *
 * Browser uses JSONP directly. Cloudflare Worker remains a fallback.
 *
 * Supported requests:
 *   ?district=Siwan&businessId=B00001
 *   ?district=Siwan&businessId=B00001&callback=myCallback
 *   ?health=1
 */

const UBNUX_CONTACT_CONFIG = {
  SPREADSHEET_ID: '1wPp7VT54l_ff3u_hlCnwNIHLRshthkyj77MBvJmxRJY',
  CACHE_SECONDS: 300,
  EMPTY_CACHE_SECONDS: 15,
  CACHE_PREFIX: 'bc8:'
};

function doGet(e) {
  const p = (e && e.parameter) || {};
  const callback = String(p.callback || '').trim();

  // Lightweight deployment/endpoint test. This does not touch the Sheet.
  if (String(p.health || '').trim() === '1') {
    return response_({
      ok: true,
      service: 'UBnux Business Contact API',
      version: '2.6.0',
      timestamp: new Date().toISOString(),
      error: ''
    }, callback);
  }

  const district = firstParam_(p, ['district', 'districtName']);
  const businessId = firstParam_(p, ['businessId', 'businessID', 'business_id', 'id']);
  let payload;

  if (!district || !businessId) {
    payload = {
      ok: false,
      found: false,
      businessId: businessId,
      district: district,
      phone: '',
      map: '',
      website: '',
      description: '',
      error: 'district and businessId are required'
    };
    return response_(payload, callback);
  }

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
      description: record.description || '',
      error: record.found ? '' : 'Business ID not found'
    };
  } catch (err) {
    payload = {
      ok: false,
      found: false,
      businessId: businessId,
      district: district,
      phone: '',
      map: '',
      website: '',
      description: '',
      error: errorMessage_(err)
    };
  }

  return response_(payload, callback);
}

function response_(payload, callback) {
  const json = JSON.stringify(payload);

  if (callback && /^[A-Za-z_$][0-9A-Za-z_$]*(?:\.[A-Za-z_$][0-9A-Za-z_$]*)*$/.test(callback)) {
    return ContentService
      .createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function findBusiness_(district, businessId) {
  const cache = CacheService.getScriptCache();
  const key = UBNUX_CONTACT_CONFIG.CACHE_PREFIX + normalize_(district) + ':' + normalizeId_(businessId);
  const cached = cache.get(key);

  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      // Ignore malformed old cache and read the Sheet again.
    }
  }

  const ss = SpreadsheetApp.openById(UBNUX_CONTACT_CONFIG.SPREADSHEET_ID);
  const sheet = findDistrictSheet_(ss, district);
  if (!sheet) {
    throw new Error('District sheet not found: ' + district);
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 1) {
    return cacheEmpty_(cache, key);
  }

  const values = sheet.getRange(1, 1, lastRow, 5).getDisplayValues();
  const target = normalizeId_(businessId);

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

    cache.put(
      key,
      JSON.stringify(record),
      UBNUX_CONTACT_CONFIG.CACHE_SECONDS
    );

    return record;
  }

  return cacheEmpty_(cache, key);
}

function findDistrictSheet_(ss, district) {
  const wanted = normalize_(district);
  const wantedCompact = wanted.replace(/[^a-z0-9]/g, '');
  const sheets = ss.getSheets();

  // Preferred: exact district tab, e.g. "Siwan".
  for (let i = 0; i < sheets.length; i++) {
    if (normalize_(sheets[i].getName()) === wanted) {
      return sheets[i];
    }
  }

  // Compatibility: "Siwan_Business", "Siwan Business", etc.
  for (let i = 0; i < sheets.length; i++) {
    const name = normalize_(sheets[i].getName());
    const compact = name.replace(/[^a-z0-9]/g, '');
    if (
      compact === wantedCompact ||
      compact === wantedCompact + 'business'
    ) {
      return sheets[i];
    }
  }

  return null;
}

function firstParam_(params, names) {
  for (let i = 0; i < names.length; i++) {
    const value = clean_(params[names[i]]);
    if (value) return value;
  }
  return '';
}

function normalize_(value) {
  return String(value == null ? '' : value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeId_(value) {
  return String(value == null ? '' : value)
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, '');
}

function clean_(value) {
  return String(value == null ? '' : value)
    .trim()
    .slice(0, 4000);
}

function normalizePhone_(value) {
  const raw = String(value == null ? '' : value).trim();
  if (!raw) return '';

  let digits = raw.replace(/\D/g, '');

  // India: 10-digit mobile -> +91 international form without +.
  if (digits.length === 10) {
    digits = '91' + digits;
  } else if (digits.length === 11 && digits.charAt(0) === '0') {
    digits = '91' + digits.slice(1);
  }

  return digits;
}

function cacheEmpty_(cache, key) {
  const record = {
    found: false,
    phone: '',
    map: '',
    website: '',
    description: ''
  };

  cache.put(
    key,
    JSON.stringify(record),
    UBNUX_CONTACT_CONFIG.EMPTY_CACHE_SECONDS
  );

  return record;
}

function errorMessage_(err) {
  if (!err) return 'Unknown error';
  if (err.message) return String(err.message);
  return String(err);
}
