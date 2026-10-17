const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const BUSINESS_DIR = path.join(DATA, 'businesses');
const OUT_DIR = path.join(DATA, 'category-index');
const SEO_INDEX = path.join(DATA, 'SEO_INDEX.JSON');
const SHARD_SIZE = 1000;

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function arr(data, keys = []) {
  if (Array.isArray(data)) return data;
  for (const key of keys) if (Array.isArray(data?.[key])) return data[key];
  return [];
}
function field(row, names) {
  for (const name of names) if (row?.[name] != null && String(row[name]).trim() !== '') return String(row[name]).trim();
  return '';
}
function compact(b) {
  return {
    Business_Title: field(b, ['Business_Title']),
    Category_Id: field(b, ['Category_Id']),
    District_Id: field(b, ['District_Id']),
    Business_Id: field(b, ['Business_Id']),
    Business_Slug: field(b, ['Business_Slug']),
    Business_Rating: b.Business_Rating ?? 0,
    Business_Review: b.Business_Review ?? 0,
    Business_Status: field(b, ['Business_Status']),
    Business_Seo_Url: field(b, ['Business_Seo_Url'])
  };
}

const states = arr(readJson(path.join(DATA, 'STATE.JSON')), ['states','data','items']);
const districts = arr(readJson(path.join(DATA, 'DISTRICT.JSON')), ['districts','data','items']);
const categories = arr(readJson(path.join(DATA, 'CATEGORY.JSON')), ['categories','data','items']);
const files = fs.readdirSync(BUSINESS_DIR).filter(f => /_BUSINESS_INDEX\.JSON$/i.test(f)).sort();

const districtFiles = {};
for (const d of districts) {
  const id = field(d, ['District_Id']);
  const slug = field(d, ['District_Slug']);
  const filename = `${slug.toUpperCase()}_BUSINESS_INDEX.JSON`;
  const actual = files.find(f => f.toLowerCase() === filename.toLowerCase());
  districtFiles[id] = actual ? `businesses/${actual}` : null;
}

const grouped = new Map(categories.map(c => [field(c, ['Category_Id']), []]));
for (const file of files) {
  const rows = arr(readJson(path.join(BUSINESS_DIR, file)), ['businesses','data','items']);
  for (const b of rows) {
    const cid = field(b, ['Category_Id']);
    if (grouped.has(cid)) grouped.get(cid).push(compact(b));
  }
}

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const categoryFiles = {};
for (const c of categories) {
  const id = field(c, ['Category_Id']);
  const rows = grouped.get(id) || [];
  rows.sort((a,b) => String(a.Business_Title).localeCompare(String(b.Business_Title)));
  const dir = path.join(OUT_DIR, id);
  fs.mkdirSync(dir, { recursive: true });
  const shards = [];
  for (let i = 0; i < rows.length; i += SHARD_SIZE) {
    const n = String(Math.floor(i / SHARD_SIZE) + 1).padStart(4, '0');
    const name = `${n}.JSON`;
    fs.writeFileSync(path.join(dir, name), JSON.stringify(rows.slice(i, i + SHARD_SIZE)), 'utf8');
    shards.push({ file: `${id}/${name}`, from: i, to: Math.min(i + SHARD_SIZE, rows.length), count: Math.min(SHARD_SIZE, rows.length - i) });
  }
  if (!shards.length) {
    fs.writeFileSync(path.join(dir, '0001.JSON'), '[]', 'utf8');
    shards.push({ file: `${id}/0001.JSON`, from: 0, to: 0, count: 0 });
  }
  categoryFiles[id] = {
    Category_Id: id,
    Category_Slug: field(c, ['Category_Slug']),
    Count: rows.length,
    Page_Size: SHARD_SIZE,
    Shards: shards
  };
}

const index = {
  Version: '2.0.0',
  GeneratedAt: new Date().toISOString(),
  Category_Shard_Size: SHARD_SIZE,
  States: states,
  Districts: districts.map(d => ({ ...d, Business_File: districtFiles[field(d, ['District_Id'])] })),
  Categories: categories,
  Category_Files: categoryFiles
};
fs.writeFileSync(SEO_INDEX, JSON.stringify(index), 'utf8');
console.log(`Built SEO_INDEX for ${states.length} states, ${districts.length} districts, ${categories.length} categories from ${files.length} district business files.`);
