// UBnux Cloudflare Pages Advanced Mode Worker v3.0.0
// SEO routes receive server-rendered HTML content before the browser runs JS.

const ORIGIN = "https://ubnux.com";

function clean(value) {
  return String(value || "").trim().toLowerCase().replace(/^\/+|\/+$/g, "");
}

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function field(row, names) {
  for (const name of names) {
    if (row && row[name] != null && String(row[name]).trim() !== "") return row[name];
  }
  return "";
}

function arr(data, keys = []) {
  if (Array.isArray(data)) return data;
  for (const key of keys) if (Array.isArray(data?.[key])) return data[key];
  return data && typeof data === "object" ? [data] : [];
}

function same(a, b) {
  return clean(a) !== "" && clean(a) === clean(b);
}

function parse(pathname) {
  const parts = clean(pathname).split("/").filter(Boolean);
  if (!parts.length) return { type: "home", valid: true };
  if (parts[0] !== "in") return { type: "not-found", valid: false };
  const r = parts.slice(1);
  if (!r.length) return { type: "home", valid: true };
  if (r.length === 1) return { type: "state", stateSlug: r[0], valid: true };
  if (r.length === 2 && r[0] === "all") return { type: "category", categorySlug: r[1], valid: true };
  if (r.length === 2) return { type: "district", stateSlug: r[0], districtSlug: r[1], valid: true };
  if (r.length === 3) return { type: "district-category", stateSlug: r[0], districtSlug: r[1], categorySlug: r[2], valid: true };
  if (r.length === 4) return { type: "business", stateSlug: r[0], districtSlug: r[1], categorySlug: r[2], businessSlug: r[3], valid: true };
  return { type: "not-found", valid: false };
}

async function json(env, requestUrl, path) {
  const url = new URL(requestUrl);
  url.pathname = "/data/" + path;
  url.search = "";
  const response = await env.ASSETS.fetch(new Request(url.toString()));
  if (!response.ok) throw new Error("Data request failed: " + path);
  return response.json();
}

async function indexes(env, requestUrl) {
  const [stateData, districtData, categoryData] = await Promise.all([
    json(env, requestUrl, "STATE.JSON"),
    json(env, requestUrl, "DISTRICT.JSON"),
    json(env, requestUrl, "CATEGORY.JSON")
  ]);
  return {
    states: arr(stateData, ["states", "data", "items"]),
    districts: arr(districtData, ["districts", "data", "items"]),
    categories: arr(categoryData, ["categories", "data", "items"])
  };
}

function find(rows, slug, idNames, slugNames) {
  const target = clean(slug);
  return rows.find(row => same(field(row, idNames), target) || same(field(row, slugNames), target)) || null;
}

async function districtBusinesses(env, requestUrl, district) {
  const slug = field(district, ["District_Slug", "districtSlug", "slug"]);
  const file = String(slug).toUpperCase() + "_BUSINESS_INDEX.JSON";
  try { return arr(await json(env, requestUrl, "businesses/" + file), ["businesses", "data", "items"]); }
  catch (_) { return []; }
}

function pageTitle(route, data) {
  if (route.type === "state") return `${field(data.state,["State_Title"])} Local Businesses | UBnux`;
  if (route.type === "district") return `${field(data.district,["District_Title"])} Local Businesses | UBnux`;
  if (route.type === "category") return `${field(data.category,["Category_Title"])} Businesses in India | UBnux`;
  if (route.type === "district-category") return `${field(data.category,["Category_Title"])} in ${field(data.district,["District_Title"])} | UBnux`;
  if (route.type === "business") return `${field(data.business,["Business_Title"])} | UBnux`;
  return "UBnux — Local Business Search";
}

function pageDescription(route, data) {
  const state = field(data.state,["State_Title"]), district = field(data.district,["District_Title"]), category = field(data.category,["Category_Title"]), business = field(data.business,["Business_Title"]);
  if (route.type === "state") return `Find businesses, products and services across ${state} on UBnux.`;
  if (route.type === "district") return `Discover local businesses, products and services in ${district} on UBnux.`;
  if (route.type === "category") return `Browse ${category} businesses and services across India on UBnux.`;
  if (route.type === "district-category") return `Find ${category} businesses and services in ${district} on UBnux.`;
  if (route.type === "business") return `View ${business} business information on UBnux.`;
  return "UBnux local business search engine.";
}

function businessUrl(b) {
  return field(b, ["Business_Seo_Url"]) || "/";
}

function listHtml(data) {
  return (data.businesses || []).map(b => {
    const district = data.districtMap?.[field(b,["District_Id"])] || data.district || {};
    const category = data.category || {};
    const name = field(b,["Business_Title"]) || "Business";
    const rating = field(b,["Business_Rating"]);
    return `<article class="ubnux-business-card"><a class="ubnux-business-link" href="${esc(businessUrl(b))}"><h3>${esc(name)}</h3><p class="ubnux-meta">${esc(field(category,["Category_Title"]))}${district ? " · " + esc(field(district,["District_Title"])) : ""}</p>${rating !== "" ? `<p class="ubnux-rating">★ ${esc(rating)}</p>` : ""}<span class="ubnux-view">View business →</span></a></article>`;
  }).join("");
}

function contentHtml(route, data) {
  if (route.type === "home") return `<section class="ubnux-home"><div class="ubnux-container"><p class="ubnux-eyebrow">LOCAL SEARCH ENGINE</p><h1>Find businesses, products and services.</h1><p class="ubnux-intro">Search UBnux by state, district, category or business.</p></div></section>`;
  if (route.type === "business") {
    const b = data.business;
    return `<section class="ubnux-page-section"><div class="ubnux-container ubnux-business-detail"><p class="ubnux-eyebrow">LOCAL BUSINESS</p><h1>${esc(field(b,["Business_Title"]))}</h1><p class="ubnux-intro">${esc(field(data.category,["Category_Title"]))} in ${esc(field(data.district,["District_Title"]))}</p><div class="ubnux-detail-card"><div><strong>Rating</strong><span>★ ${esc(field(b,["Business_Rating"]))} · ${esc(field(b,["Business_Review"]))} reviews</span></div><div><strong>Status</strong><span>${esc(field(b,["Business_Status"]) || "Listed")}</span></div><div><strong>Business ID</strong><span>${esc(field(b,["Business_Id"]))}</span></div></div></div></section>`;
  }
  const title = route.type === "state" ? `${field(data.state,["State_Title"])} — Local Businesses & Services` : route.type === "district" ? `${field(data.district,["District_Title"])} — Local Businesses & Services` : route.type === "category" ? `${field(data.category,["Category_Title"])} Businesses in India` : `${field(data.category,["Category_Title"])} in ${field(data.district,["District_Title"])}`;
  const list = listHtml(data);
  return `<section class="ubnux-page-section"><div class="ubnux-container"><p class="ubnux-eyebrow">LOCAL SEARCH</p><h1>${esc(title)}</h1><p class="ubnux-intro">${esc(pageDescription(route,data))}</p><div class="ubnux-result-count">${data.businesses.length} business${data.businesses.length === 1 ? "" : "es"} found</div>${list ? `<div class="ubnux-business-grid">${list}</div>` : `<div class="ubnux-empty">No matching businesses are available yet.</div>`}</div></section>`;
}

async function resolve(env, requestUrl, route) {
  const ix = await indexes(env, requestUrl);
  const data = { ...ix, state: null, district: null, category: null, business: null, businesses: [], districtMap: {} };
  if (route.stateSlug) data.state = find(ix.states, route.stateSlug, ["State_Id"], ["State_Slug"]);
  if (route.districtSlug) data.district = find(ix.districts, route.districtSlug, ["District_Id"], ["District_Slug"]);
  if (route.categorySlug) data.category = find(ix.categories, route.categorySlug, ["Category_Id"], ["Category_Slug"]);
  ix.districts.forEach(d => data.districtMap[field(d,["District_Id"])] = d);

  if (route.type === "home") return data;
  if (route.type === "state") return data;
  if (route.type === "category") {
    if (!data.category) return data;
    const groups = await Promise.all(ix.districts.map(d => districtBusinesses(env, requestUrl, d)));
    const cid = field(data.category,["Category_Id"]);
    data.businesses = groups.flat().filter(b => same(field(b,["Category_Id"]), cid));
    return data;
  }
  if (!data.state || !data.district) return data;
  if (!same(field(data.district,["State_Id"]), field(data.state,["State_Id"]))) return data;
  if ((route.type === "district-category" || route.type === "business") && !data.category) return data;
  const businesses = await districtBusinesses(env, requestUrl, data.district);
  const did = field(data.district,["District_Id"]), cid = field(data.category,["Category_Id"]);
  data.businesses = businesses.filter(b => same(field(b,["District_Id"]), did) && (!data.category || same(field(b,["Category_Id"]), cid)));
  if (route.type === "business") data.business = data.businesses.find(b => same(field(b,["Business_Slug"]), route.businessSlug)) || null;
  return data;
}

async function renderSeo(env, request, route) {
  const incoming = new URL(request.url);
  const shellUrl = new URL(request.url);
  shellUrl.pathname = "/index.html";
  shellUrl.search = "";
  const shellResponse = await env.ASSETS.fetch(new Request(shellUrl.toString()));
  let html = await shellResponse.text();
  let data;
  try { data = await resolve(env, request.url, route); } catch (_) { data = null; }

  const valid = !!data && (route.type === "home" || route.type === "state" ? !!data.state || route.type === "home" : route.type === "category" ? !!data.category : route.type === "district" ? !!data.state && !!data.district && same(field(data.district,["State_Id"]),field(data.state,["State_Id"])) : !!data.state && !!data.district && !!data.category && !!data.business);
  const title = valid ? pageTitle(route,data) : "Page Not Found | UBnux";
  const description = valid ? pageDescription(route,data) : "The requested UBnux page could not be found.";
  const canonical = ORIGIN + (incoming.pathname === "/" ? "/" : "/" + clean(incoming.pathname) + "/");
  const body = valid ? contentHtml(route,data) : `<section class="ubnux-page-section"><div class="ubnux-container"><p class="ubnux-eyebrow">404</p><h1>Page not found</h1><p class="ubnux-intro">The requested UBnux page does not exist.</p><p><a class="ubnux-link" href="/">Go to UBnux home</a></p></div></section>`;
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
  html = html.replace(/<meta name="description" content="[^"]*">/i, `<meta name="description" content="${esc(description)}">`);
  html = html.replace(/<meta name="robots" content="[^"]*">/i, `<meta name="robots" content="${valid ? "index,follow" : "noindex,follow"}">`);
  html = html.replace(/<link rel="canonical" href="[^"]*">/i, `<link rel="canonical" href="${esc(canonical)}">`);
  html = html.replace(/<main id="ubnux-seo-root">[\s\S]*?<\/main>/i, `<main id="ubnux-seo-root">${body}</main>`);

  const headers = new Headers(shellResponse.headers);
  headers.set("Content-Type", "text/html; charset=UTF-8");
  headers.set("X-UBnux-Route", valid ? "seo-ssr" : "seo-404");
  headers.set("X-UBnux-Path", incoming.pathname);
  headers.set("Cache-Control", "public, max-age=300, s-maxage=3600");
  return new Response(html, { status: valid ? 200 : 404, headers });
}

export default {
  async fetch(request, env) {
    const incoming = new URL(request.url);
    if (incoming.pathname === "/in" || incoming.pathname.startsWith("/in/")) {
      return renderSeo(env, request, parse(incoming.pathname));
    }
    return env.ASSETS.fetch(request);
  }
};
