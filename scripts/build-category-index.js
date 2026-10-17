const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const BUSINESS_DIR = path.join(DATA, 'businesses');
const OUT_DIR = path.join(DATA, 'category-index');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function arr(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.categories)) return data.categories;
  return [];
}

function compact(business) {
  return {
    Business_Title: business.Business_Title || '',
    Category_Id: business.Category_Id || '',
    District_Id: business.District_Id || '',
    Business_Id: business.Business_Id || '',
    Business_Slug: business.Business_Slug || '',
    Business_Rating: business.Business_Rating ?? 0,
    Business_Review: business.Business_Review ?? 0,
    Business_Status: business.Business_Status || '',
    Business_Seo_Url: business.Business_Seo_Url || ''
  };
}

const categories = arr(readJson(path.join(DATA, 'CATEGORY.JSON')));
const files = fs.readdirSync(BUSINESS_DIR)
  .filter(name => /_BUSINESS_INDEX\.JSON$/i.test(name))
  .sort();

const grouped = new Map(categories.map(category => [String(category.Category_Id), []]));

for (const file of files) {
  const rows = arr(readJson(path.join(BUSINESS_DIR, file)));
  for (const business of rows) {
    const categoryId = String(business.Category_Id || '');
    if (!grouped.has(categoryId)) continue;
    grouped.get(categoryId).push(compact(business));
  }
}

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

for (const category of categories) {
  const categoryId = String(category.Category_Id);
  const rows = grouped.get(categoryId) || [];
  rows.sort((a, b) => String(a.Business_Title).localeCompare(String(b.Business_Title)));
  fs.writeFileSync(
    path.join(OUT_DIR, `${categoryId}.JSON`),
    JSON.stringify(rows),
    'utf8'
  );
}

const manifest = {};
for (const category of categories) {
  const id = String(category.Category_Id);
  manifest[id] = {
    Category_Id: id,
    Category_Slug: category.Category_Slug || '',
    Count: (grouped.get(id) || []).length,
    File: `${id}.JSON`
  };
}

fs.writeFileSync(
  path.join(OUT_DIR, 'INDEX.JSON'),
  JSON.stringify(manifest),
  'utf8'
);

console.log(`Built category indexes for ${categories.length} categories from ${files.length} district files.`);
