/* UBnux Exact SEO Data Resolver v2.0.0 */
(function (window) {
  "use strict";

  var BASE = "/data/";
  var cache = Object.create(null);

  function normalize(value) { return String(value == null ? "" : value).trim().toLowerCase(); }
  function readJSON(path) {
    if (cache[path]) return cache[path];
    var request = fetch(BASE + path, { cache: "default" }).then(function (response) {
      if (!response.ok) throw new Error("Data request failed: " + path);
      return response.json();
    });
    cache[path] = request;
    return request;
  }
  function arrayFrom(data, keys) {
    if (Array.isArray(data)) return data;
    for (var i = 0; i < keys.length; i++) if (Array.isArray(data && data[keys[i]])) return data[keys[i]];
    return [];
  }
  function field(row, names) {
    for (var i = 0; i < names.length; i++) if (row && row[names[i]] != null && String(row[names[i]]).trim() !== "") return String(row[names[i]]).trim();
    return "";
  }
  function findBySlugOrId(rows, slug, idNames, slugNames) {
    var target = normalize(slug);
    return rows.find(function (row) { return normalize(field(row, idNames)) === target || normalize(field(row, slugNames)) === target; }) || null;
  }
  function findDistrict(indexes, slug) { return findBySlugOrId(indexes.districts, slug, ["District_Id","districtId","id"], ["District_Slug","districtSlug","slug"]); }
  function findState(indexes, slug) { return findBySlugOrId(indexes.states, slug, ["State_Id","stateId","id"], ["State_Slug","stateSlug","slug"]); }
  function findCategory(indexes, slug) { return findBySlugOrId(indexes.categories, slug, ["Category_Id","categoryId","id"], ["Category_Slug","categorySlug","slug"]); }

  function loadIndex() {
    return readJSON("SEO_INDEX.JSON").then(function (raw) {
      return {
        states: arrayFrom(raw, ["States"]),
        districts: arrayFrom(raw, ["Districts"]),
        categories: arrayFrom(raw, ["Categories"]),
        categoryFiles: raw.Category_Files || {},
        raw: raw
      };
    });
  }
  function loadIndexes() { return loadIndex(); }

  function loadDistrictIndex(district) {
    var id = field(district, ["District_Id","districtId","id"]);
    return readJSON("district-index/" + encodeURIComponent(id) + "/INDEX.JSON");
  }
  function loadDistrictBusinesses(district, shardNumber) {
    var shard = Number(shardNumber || 1);
    return loadDistrictIndex(district).then(function (meta) {
      var item = meta.Shards && meta.Shards[shard - 1];
      if (!item) return [];
      return readJSON(item.file).then(function (data) { return arrayFrom(data, ["businesses","data","items"]); });
    });
  }
  function loadBusiness(district, businessSlug) {
    return loadDistrictIndex(district).then(function (meta) {
      var file = meta.Business_Slug_To_Shard && meta.Business_Slug_To_Shard[normalize(businessSlug)];
      if (!file) return null;
      return readJSON("district-index/" + encodeURIComponent(field(district,["District_Id"])) + "/" + file).then(function (rows) {
        rows = arrayFrom(rows, ["businesses","data","items"]);
        return rows.find(function (b) { return normalize(field(b,["Business_Slug","businessSlug","slug"])) === normalize(businessSlug); }) || null;
      });
    });
  }
  function loadCategoryBusinesses(category, shardNumber) {
    var id = field(category, ["Category_Id","categoryId","id"]);
    if (!id) return Promise.resolve([]);
    var meta = null;
    return loadIndex().then(function (ix) {
      meta = ix.categoryFiles[id];
      if (!meta) return [];
      var shard = Number(shardNumber || 1), item = meta.Shards && meta.Shards[shard - 1];
      if (!item) return [];
      return readJSON("category-index/" + item.file).then(function (data) { return arrayFrom(data, ["businesses","data","items"]); });
    });
  }
  function same(a,b) { return normalize(a) !== "" && normalize(a) === normalize(b); }
  function stateOwnsDistrict(state,district) { return !!state && !!district && same(field(state,["State_Id"]),field(district,["State_Id"])); }
  function businessMatchesContext(b,d,c) { return same(field(b,["District_Id"]),field(d,["District_Id"])) && (!c || same(field(b,["Category_Id"]),field(c,["Category_Id"]))); }

  function resolve(route) {
    return loadIndex().then(function (indexes) {
      var result = { route: route, indexes: indexes, state:null, district:null, category:null, business:null, businesses:[], businessTotal:0, errors:[] };
      if (route.stateSlug) result.state = findState(indexes, route.stateSlug);
      if (route.districtSlug) result.district = findDistrict(indexes, route.districtSlug);
      if (route.categorySlug) result.category = findCategory(indexes, route.categorySlug);

      if (route.type === "home") return result;
      if (route.type === "state") { if (!result.state) result.errors.push("State not found"); return result; }
      if (route.type === "category") {
        if (!result.category) { result.errors.push("Category not found"); return result; }
        var meta = indexes.categoryFiles[field(result.category,["Category_Id"])];
        result.businessTotal = meta ? Number(meta.Count || 0) : 0;
        return loadCategoryBusinesses(result.category, 1).then(function (rows) {
          result.businesses = rows.filter(function (b) { return same(field(b,["Category_Id"]),field(result.category,["Category_Id"])); });
          return result;
        });
      }

      if (!result.state) result.errors.push("State not found");
      if (!result.district) result.errors.push("District not found");
      if (!result.state || !result.district) return result;
      if (!stateOwnsDistrict(result.state,result.district)) { result.errors.push("District does not belong to state"); return result; }
      if (route.type === "district" && result.category) { result.errors.push("Invalid district route"); return result; }
      if ((route.type === "district-category" || route.type === "business") && !result.category) { result.errors.push("Category not found"); return result; }

      var did = field(result.district,["District_Id"]);
      var districtMeta = result.district;
      result.businessTotal = Number(districtMeta.Count || 0);
      if (route.type === "business") {
        return loadBusiness(result.district, route.businessSlug).then(function (business) {
          result.business = business;
          result.businesses = business ? [business] : [];
          if (!business) result.errors.push("Business not found");
          return result;
        });
      }
      return loadDistrictBusinesses(result.district,1).then(function (rows) {
        result.businesses = rows.filter(function (b) { return businessMatchesContext(b,result.district,result.category); });
        if (result.category) result.businessTotal = result.businesses.length < 1000 ? result.businesses.length : Number(districtMeta.Count || 0);
        return result;
      });
    });
  }

  window.UBnuxSEOData = {
    version: "2.0.0",
    loadIndexes: loadIndexes,
    loadDistrictIndex: loadDistrictIndex,
    loadDistrictBusinesses: loadDistrictBusinesses,
    loadBusiness: loadBusiness,
    loadCategoryBusinesses: loadCategoryBusinesses,
    resolve: resolve
  };
})(window);
