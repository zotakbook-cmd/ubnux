const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'https://ubnux.com';
const dataDir = path.join(ROOT, 'data');
const businessDir = path.join(dataDir, 'businesses');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function slashUrl(value) {
  if (!value) return null;
  let url = String(value).trim();
  if (!/^https?:\/\//i.test(url)) url = `${BASE}${url.startsWith('/') ? '' : '/'}${url}`;
  return url.replace(/\/+$/, '') + '/';
}

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function businessFiles() {
  return fs.readdirSync(businessDir)
    .filter(name => /_BUSINESS_INDEX\.JSON$/i.test(name))
    .sort();
}

const stateRaw = readJson(path.join(dataDir, 'STATE.JSON'));
const states = Array.isArray(stateRaw) ? stateRaw : [stateRaw];
const districts = readJson(path.join(dataDir, 'DISTRICT.JSON'));
const categories = readJson(path.join(dataDir, 'CATEGORY.JSON'));

const businesses = [];
for (const file of businessFiles()) {
  const rows = readJson(path.join(businessDir, file));
  if (Array.isArray(rows)) businesses.push(...rows);
}

const stateById = new Map(states.map(x => [x.State_Id, x]));
const districtById = new Map(districts.map(x => [x.District_Id, x]));
const categoryById = new Map(categories.map(x => [x.Category_Id, x]));

const urls = new Set();
const add = value => {
  const url = slashUrl(value);
  if (url) urls.add(url);
};

add('/');
for (const state of states) add(state.State_Seo_Url || `/in/${state.State_Slug}/`);
for (const district of districts) {
  const state = stateById.get(district.State_Id);
  if (!state) continue;
  add(district.District_Seo_Url || `/in/${state.State_Slug}/${district.District_Slug}/`);
}
for (const category of categories) add(category.Category_Seo_Url || `/in/all/${category.Category_Slug}/`);

// Only publish district/category combinations that have at least one business.
const districtCategoryKeys = new Set();
for (const business of businesses) {
  const district = districtById.get(business.District_Id);
  const category = categoryById.get(business.Category_Id);
  if (!district || !category) continue;
  const state = stateById.get(district.State_Id);
  if (!state) continue;
  const key = `${district.District_Id}|${category.Category_Id}`;
  districtCategoryKeys.add(key);
}
for (const key of districtCategoryKeys) {
  const [districtId, categoryId] = key.split('|');
  const district = districtById.get(districtId);
  const category = categoryById.get(categoryId);
  const state = district && stateById.get(district.State_Id);
  if (!state || !district || !category) continue;
  add(`/in/${state.State_Slug}/${district.District_Slug}/${category.Category_Slug}/`);
}

for (const business of businesses) {
  const district = districtById.get(business.District_Id);
  const category = categoryById.get(business.Category_Id);
  const state = district && stateById.get(district.State_Id);
  if (!district || !category || !state) continue;
  add(business.Business_Seo_Url || `/in/${state.State_Slug}/${district.District_Slug}/${category.Category_Slug}/${business.Business_Slug}/`);
}

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...Array.from(urls).sort().map(url => `  <url><loc>${esc(url)}</loc></url>`),
  '</urlset>',
  ''
].join('\n');

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');
console.log(`Generated sitemap.xml with ${urls.size} URLs.`);
