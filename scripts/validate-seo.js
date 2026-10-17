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
function url(value) {
  const v = String(value || '').trim();
  if (!v) return '';
  return /^https?:\/\//i.test(v) ? v.replace(/\/+$/, '/') : `${BASE}/${v.replace(/^\/+/, '').replace(/\/+$/, '')}/`;
}

const states = arr(read(path.join(DATA, 'STATE.JSON')));
const districts = arr(read(path.join(DATA, 'DISTRICT.JSON')));
const categories = arr(read(path.join(DATA, 'CATEGORY.JSON')));
const stateById = new Map(states.map(x => [x.State_Id, x]));
const districtById = new Map(districts.map(x => [x.District_Id, x]));
const categoryById = new Map(categories.map(x => [x.Category_Id, x]));

let businessCount = 0;
const urls = new Set();
const addUrl = (value, label) => {
  const u = url(value);
  if (!u) throw new Error(`${label}: missing SEO URL`);
  if (!u.endsWith('/')) throw new Error(`${label}: URL must end with /`);
  if (urls.has(u)) throw new Error(`Duplicate URL: ${u}`);
  urls.add(u);
};

for (const state of states) addUrl(state.State_Seo_Url || `/in/${state.State_Slug}/`, `State ${state.State_Id}`);
for (const district of districts) {
  if (!stateById.has(district.State_Id)) throw new Error(`District ${district.District_Id}: invalid State_Id`);
  addUrl(district.District_Seo_Url || `/in/${stateById.get(district.State_Id).State_Slug}/${district.District_Slug}/`, `District ${district.District_Id}`);
}
for (const category of categories) addUrl(category.Category_Seo_Url || `/in/all/${category.Category_Slug}/`, `Category ${category.Category_Id}`);

for (const file of fs.readdirSync(BUSINESS_DIR).filter(x => /_BUSINESS_INDEX\.JSON$/i.test(x))) {
  const rows = arr(read(path.join(BUSINESS_DIR, file)));
  for (const business of rows) {
    businessCount++;
    const district = districtById.get(business.District_Id);
    const category = categoryById.get(business.Category_Id);
    if (!district) throw new Error(`Business ${business.Business_Id}: invalid District_Id`);
    if (!category) throw new Error(`Business ${business.Business_Id}: invalid Category_Id`);
    if (!stateById.has(district.State_Id)) throw new Error(`Business ${business.Business_Id}: district has invalid State_Id`);
    required(business, 'Business_Slug', `Business ${business.Business_Id}`);
    addUrl(business.Business_Seo_Url || `/in/${stateById.get(district.State_Id).State_Slug}/${district.District_Slug}/${category.Category_Slug}/${business.Business_Slug}/`, `Business ${business.Business_Id}`);
  }
}

const districtCategory = new Set();
for (const file of fs.readdirSync(BUSINESS_DIR).filter(x => /_BUSINESS_INDEX\.JSON$/i.test(x))) {
  for (const business of arr(read(path.join(BUSINESS_DIR, file)))) districtCategory.add(`${business.District_Id}|${business.Category_Id}`);
}
for (const key of districtCategory) {
  const [districtId, categoryId] = key.split('|');
  const district = districtById.get(districtId);
  const category = categoryById.get(categoryId);
  const state = stateById.get(district.State_Id);
  addUrl(`/in/${state.State_Slug}/${district.District_Slug}/${category.Category_Slug}/`, `District/category ${key}`);
}

const sitemap = read(path.join(ROOT, 'sitemap.xml').replace(/\.xml$/, '.xml'));
const sitemapText = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const sitemapUrls = [...sitemapText.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
for (const u of sitemapUrls) {
  if (!u.endsWith('/')) throw new Error(`Sitemap URL missing trailing slash: ${u}`);
  if (!u.startsWith(BASE + '/')) throw new Error(`Sitemap contains non-production URL: ${u}`);
}

console.log(`SEO validation passed: ${states.length} states, ${districts.length} districts, ${categories.length} categories, ${businessCount} businesses, ${urls.size} generated entity URLs.`);
console.log(`Sitemap contains ${sitemapUrls.length} URLs.`);
