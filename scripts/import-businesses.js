const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const BUSINESS_DIR = path.join(DATA, 'businesses');
const IMPORT_FILE = path.join(DATA, 'import', 'BUSINESSES.JSON');
const BASE = 'https://ubnux.com';

function read(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function arr(value) {
  return Array.isArray(value) ? value : [value];
}

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function clean(value) {
  return String(value || '').trim().toLowerCase();
}

function findById(rows, key, value) {
  return rows.find(row => String(row[key]) === String(value));
}

function districtFileName(district) {
  return `${String(district.District_Slug || '').toUpperCase()}_BUSINESS_INDEX.JSON`;
}

const states = arr(read(path.join(DATA, 'STATE.JSON')));
const districts = arr(read(path.join(DATA, 'DISTRICT.JSON')));
const categories = arr(read(path.join(DATA, 'CATEGORY.JSON')));

const stateById = new Map(states.map(x => [String(x.State_Id), x]));
const districtById = new Map(districts.map(x => [String(x.District_Id), x]));
const categoryById = new Map(categories.map(x => [String(x.Category_Id), x]));

function buildRecord(input) {
  if (!input || !input.Business_Title) throw new Error('Business_Title is required.');
  if (!input.Business_Id) throw new Error('Business_Id is required.');
  if (!input.District_Id) throw new Error('District_Id is required.');
  if (!input.Category_Id) throw new Error('Category_Id is required.');

  const district = districtById.get(String(input.District_Id));
  if (!district) throw new Error(`District not found: ${input.District_Id}`);

  const state = stateById.get(String(district.State_Id));
  if (!state) throw new Error(`State not found for district: ${input.District_Id}`);

  const category = categoryById.get(String(input.Category_Id));
  if (!category) throw new Error(`Category not found: ${input.Category_Id}`);

  const slug = slugify(input.Business_Slug || input.Business_Title);
  if (!slug) throw new Error(`Business ${input.Business_Id}: slug could not be generated.`);

  return {
    ...input,
    Business_Slug: slug,
    Business_Seo_Url: `${BASE}/in/${state.State_Slug}/${district.District_Slug}/${category.Category_Slug}/${slug}/`
  };
}

function loadExisting() {
  const byDistrict = new Map();
  for (const district of districts) {
    const file = path.join(BUSINESS_DIR, districtFileName(district));
    byDistrict.set(String(district.District_Id), fs.existsSync(file) ? arr(read(file)) : []);
  }
  return byDistrict;
}

function importBusinesses(inputRows) {
  if (!Array.isArray(inputRows) || !inputRows.length) {
    throw new Error('Import file must contain a non-empty JSON array.');
  }

  const existingByDistrict = loadExisting();
  const globalIds = new Map();
  const globalSlugs = new Map();

  for (const rows of existingByDistrict.values()) {
    for (const row of rows) {
      if (row.Business_Id) globalIds.set(clean(row.Business_Id), row.Business_Id);
      if (row.Business_Slug) globalSlugs.set(clean(row.Business_Slug), row.Business_Slug);
    }
  }

  const seenImportIds = new Set();
  const seenImportSlugs = new Set();
  const grouped = new Map();

  for (const input of inputRows) {
    const record = buildRecord(input);
    const idKey = clean(record.Business_Id);
    const slugKey = clean(record.Business_Slug);

    if (seenImportIds.has(idKey)) throw new Error(`Duplicate Business_Id in import: ${record.Business_Id}`);
    if (seenImportSlugs.has(slugKey)) throw new Error(`Duplicate Business_Slug in import: ${record.Business_Slug}`);
    if (globalIds.has(idKey)) throw new Error(`Business_Id already exists: ${record.Business_Id}`);
    if (globalSlugs.has(slugKey)) throw new Error(`Business_Slug already exists: ${record.Business_Slug}`);

    seenImportIds.add(idKey);
    seenImportSlugs.add(slugKey);
    grouped.set(String(record.District_Id), [...(grouped.get(String(record.District_Id)) || []), record]);
  }

  let added = 0;
  for (const [districtId, records] of grouped) {
    const district = districtById.get(districtId);
    const current = existingByDistrict.get(districtId) || [];
    const output = [...current, ...records];
    output.sort((a, b) => String(a.Business_Id).localeCompare(String(b.Business_Id), undefined, { numeric: true }));

    const file = path.join(BUSINESS_DIR, districtFileName(district));
    fs.writeFileSync(file, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    added += records.length;
    console.log(`Updated ${path.relative(ROOT, file)}: +${records.length}, total ${output.length}`);
  }

  return { added, districtsUpdated: grouped.size };
}

if (require.main === module) {
  try {
    const inputFile = process.argv[2] ? path.resolve(process.argv[2]) : IMPORT_FILE;
    if (!fs.existsSync(inputFile)) throw new Error(`Import file not found: ${inputFile}`);
    const result = importBusinesses(arr(read(inputFile)));
    console.log(`Bulk import complete: ${result.added} businesses added across ${result.districtsUpdated} districts.`);
  } catch (error) {
    console.error(`Bulk import failed: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { buildRecord, importBusinesses, slugify };
