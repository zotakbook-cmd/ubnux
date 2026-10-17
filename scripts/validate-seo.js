const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const BUSINESS_DIR = path.join(DATA, 'businesses');
const BASE = 'https://ubnux.com';

function read(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function arr(value) { return Array.isArray(value) ? value : [value]; }
function clean(value) { return String(value || '').trim().toLowerCase(); }
function required(row, key, label) {
  if (!row || !String(row[key] || '').trim()) throw new Error(`${label}: missing ${key}`);
  return row[key];
}
function unique(rows, key, label) {
  const seen = new Map();
  for (const row of rows) {
    const value = clean(row[key]);
    if (!value) throw new Error(`${label}: missing ${key}`);
    if (seen.has(value)) throw new Error(`${label}: duplicate ${key} '${row[key]}' (${seen.get(value)} and ${row[key]})`);
    seen.set(value, row[key]);
  }
}
function url(value) {
  const v = String(value || '').trim();
  if (!v) return '';
  return /^https?:\/\//i.test(v) ? v.replace(/\/+$/, '/') : `${BASE}/${v.replace(/^\/+/, '').replace(/\/+$/, '')}/`;
}
function expectedStateUrl(state) { return `${BASE}/in/${state.State_Slug}/`; }
function expectedDistrictUrl(state, district) { return `${BASE}/in/${state.State_Slug}/${district.District_Slug}/`; }
function expectedCategoryUrl(category) { return `${BASE}/in/all/${category.Category_Slug}/`; }
function expectedDistrictCategoryUrl(state, district, category) { return `${BASE}/in/${state.State_Slug}/${district.District_Slug}/${category.Category_Slug}/`; }
function expectedBusinessUrl(state, district, category, business) { return `${BASE}/in/${state.State_Slug}/${district.District_Slug}/${category.Category_Slug}/${business.Business_Slug}/`; }

const seoConfig = read(path.join(DATA, 'SEO_CONFIG.JSON'));
const indexingEnabled = seoConfig.Indexing_Enabled === true;
const states = arr(read(path.join(DATA, 'STATE.JSON')));
const districts = arr(read(path.join(DATA, 'DISTRICT.JSON')));
const categories = arr(read(path.join(DATA, 'CATEGORY.JSON')));

unique(states, 'State_Id', 'States');
unique(states, 'State_Slug', 'States');
unique(districts, 'District_Id', 'Districts');
unique(districts, 'District_Slug', 'Districts');
unique(categories, 'Category_Id', 'Categories');
unique(categories, 'Category_Slug', 'Categories');

const stateById = new Map(states.map(x => [x.State_Id, x]));
const districtById = new Map(districts.map(x => [x.District_Id, x]));
const categoryById = new Map(categories.map(x => [x.Category_Id, x]));
const stateSlugs = new Set(states.map(x => clean(x.State_Slug)));
const districtSlugs = new Set(districts.map(x => clean(x.District_Slug)));
const categorySlugs = new Set(categories.map(x => clean(x.Category_Slug)));

for (const state of states) {
  required(state, 'State_Slug', `State ${state.State_Id}`);
  const actual = url(state.State_Seo_Url || `/in/${state.State_Slug}/`);
  if (actual !== expectedStateUrl(state)) throw new Error(`State ${state.State_Id}: SEO URL mismatch. Expected ${expectedStateUrl(state)}, got ${actual}`);
}

for (const district of districts) {
  const state = stateById.get(district.State_Id);
  if (!state) throw new Error(`District ${district.District_Id}: invalid State_Id '${district.State_Id}'`);
  required(district, 'District_Slug', `District ${district.District_Id}`);
  const actual = url(district.District_Seo_Url || expectedDistrictUrl(state, district));
  if (actual !== expectedDistrictUrl(state, district)) throw new Error(`District ${district.District_Id}: SEO URL mismatch. Expected ${expectedDistrictUrl(state, district)}, got ${actual}`);
}

for (const category of categories) {
  required(category, 'Category_Slug', `Category ${category.Category_Id}`);
  const actual = url(category.Category_Seo_Url || expectedCategoryUrl(category));
  if (actual !== expectedCategoryUrl(category)) throw new Error(`Category ${category.Category_Id}: SEO URL mismatch. Expected ${expectedCategoryUrl(category)}, got ${actual}`);
}

let businessCount = 0;
const allBusinesses = [];
const businessIds = new Set();
const businessSlugs = new Set();
const generatedUrls = new Map();
const districtCategory = new Set();

const addGeneratedUrl = (value, label) => {
  const u = url(value);
  if (!u) throw new Error(`${label}: missing SEO URL`);
  if (!u.endsWith('/')) throw new Error(`${label}: URL must end with /`);
  const previous = generatedUrls.get(u);
  if (previous) throw new Error(`Duplicate SEO URL: ${u} (${previous} and ${label})`);
  generatedUrls.set(u, label);
};

for (const state of states) addGeneratedUrl(state.State_Seo_Url || expectedStateUrl(state), `State ${state.State_Id}`);
for (const district of districts) {
  const state = stateById.get(district.State_Id);
  addGeneratedUrl(district.District_Seo_Url || expectedDistrictUrl(state, district), `District ${district.District_Id}`);
}
for (const category of categories) addGeneratedUrl(category.Category_Seo_Url || expectedCategoryUrl(category), `Category ${category.Category_Id}`);

const businessFiles = fs.readdirSync(BUSINESS_DIR).filter(x => /_BUSINESS_INDEX\.JSON$/i.test(x));
if (!businessFiles.length) throw new Error('No *_BUSINESS_INDEX.JSON files found.');

for (const file of businessFiles) {
  const rows = arr(read(path.join(BUSINESS_DIR, file)));
  for (const business of rows) {
    businessCount++;
    allBusinesses.push(business);
    required(business, 'Business_Id', `Business in ${file}`);
    required(business, 'Business_Slug', `Business ${business.Business_Id}`);
    const district = districtById.get(business.District_Id);
    const category = categoryById.get(business.Category_Id);
    if (!district) throw new Error(`Business ${business.Business_Id}: invalid District_Id '${business.District_Id}'`);
    if (!category) throw new Error(`Business ${business.Business_Id}: invalid Category_Id '${business.Category_Id}'`);
    const state = stateById.get(district.State_Id);
    if (!state) throw new Error(`Business ${business.Business_Id}: district has invalid State_Id '${district.State_Id}'`);
    const idKey = clean(business.Business_Id);
    const slugKey = clean(business.Business_Slug);
    if (businessIds.has(idKey)) throw new Error(`Duplicate Business_Id: ${business.Business_Id}`);
    if (businessSlugs.has(slugKey)) throw new Error(`Duplicate Business_Slug: ${business.Business_Slug}`);
    businessIds.add(idKey);
    businessSlugs.add(slugKey);
    const actual = url(business.Business_Seo_Url || expectedBusinessUrl(state, district, category, business));
    if (actual !== expectedBusinessUrl(state, district, category, business)) {
      throw new Error(`Business ${business.Business_Id}: SEO URL mismatch. Expected ${expectedBusinessUrl(state, district, category, business)}, got ${actual}`);
    }
    addGeneratedUrl(business.Business_Seo_Url || actual, `Business ${business.Business_Id}`);
    districtCategory.add(`${district.District_Id}|${category.Category_Id}`);
  }
}

for (const key of districtCategory) {
  const [districtId, categoryId] = key.split('|');
  const district = districtById.get(districtId);
  const category = categoryById.get(categoryId);
  const state = stateById.get(district.State_Id);
  addGeneratedUrl(expectedDistrictCategoryUrl(state, district, category), `District/category ${key}`);
}

const sitemapText = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const sitemapUrls = [...sitemapText.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1].trim());
if (!sitemapUrls.length) throw new Error('Sitemap contains no URLs.');
const sitemapSet = new Set();
for (const u of sitemapUrls) {
  if (sitemapSet.has(u)) throw new Error(`Sitemap contains duplicate URL: ${u}`);
  sitemapSet.add(u);
  if (!u.endsWith('/')) throw new Error(`Sitemap URL missing trailing slash: ${u}`);
  if (!u.startsWith(BASE + '/')) throw new Error(`Sitemap contains non-production URL: ${u}`);
}

if (indexingEnabled) {
  for (const u of generatedUrls.keys()) {
    if (!sitemapSet.has(u)) throw new Error(`Indexing enabled but sitemap is missing URL: ${u}`);
  }
  for (const u of sitemapSet) {
    if (!generatedUrls.has(u) && u !== `${BASE}/`) throw new Error(`Sitemap contains unexpected URL: ${u}`);
  }
} else {
  if (sitemapUrls.length !== 1 || sitemapUrls[0] !== `${BASE}/`) throw new Error('Testing mode sitemap must contain only the homepage.');
}

console.log(`SEO validation passed: ${states.length} states, ${districts.length} districts, ${categories.length} categories, ${businessCount} businesses.`);
console.log(`Generated entity URLs: ${generatedUrls.size}. Sitemap URLs: ${sitemapUrls.length}. Indexing enabled: ${indexingEnabled}.`);
console.log(`Business relationships, unique IDs/slugs, canonical SEO URLs, district/category routes and sitemap integrity are valid.`);
