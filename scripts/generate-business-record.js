const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const BASE = 'https://ubnux.com';

function read(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function arr(value) { return Array.isArray(value) ? value : [value]; }
function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const states = arr(read(path.join(DATA, 'STATE.JSON')));
const districts = arr(read(path.join(DATA, 'DISTRICT.JSON')));
const categories = arr(read(path.join(DATA, 'CATEGORY.JSON')));

function findById(rows, key, value) {
  return rows.find(row => String(row[key]) === String(value));
}

function buildBusinessRecord(input) {
  if (!input || !input.Business_Title) throw new Error('Business_Title is required.');
  if (!input.Business_Id) throw new Error('Business_Id is required.');
  if (!input.District_Id) throw new Error('District_Id is required.');
  if (!input.Category_Id) throw new Error('Category_Id is required.');

  const district = findById(districts, 'District_Id', input.District_Id);
  if (!district) throw new Error(`District not found: ${input.District_Id}`);

  const state = findById(states, 'State_Id', district.State_Id);
  if (!state) throw new Error(`State not found for district: ${input.District_Id}`);

  const category = findById(categories, 'Category_Id', input.Category_Id);
  if (!category) throw new Error(`Category not found: ${input.Category_Id}`);

  const businessSlug = slugify(input.Business_Slug || input.Business_Title);
  if (!businessSlug) throw new Error('Business slug could not be generated.');

  return {
    ...input,
    Business_Slug: businessSlug,
    Business_Seo_Url: `${BASE}/in/${state.State_Slug}/${district.District_Slug}/${category.Category_Slug}/${businessSlug}/`
  };
}

if (require.main === module) {
  const input = process.argv[2];
  if (!input) {
    console.error('Usage: node scripts/generate-business-record.js \'{"Business_Title":"Example","Business_Id":"B00001","District_Id":"D001","Category_Id":"C0001"}\'');
    process.exit(1);
  }
  try {
    const result = buildBusinessRecord(JSON.parse(input));
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`Business generation failed: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { buildBusinessRecord, slugify };
