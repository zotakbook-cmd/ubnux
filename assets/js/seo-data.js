/* UBnux SEO Data Resolver v2.5.2 */
(function (window) {
  "use strict";

  var BASE = "/data/";
  var PAGE_SIZE = 24;
  var SHARD_SIZE = 1000;
  var cache = Object.create(null);

  function norm(value) {
    return String(value == null ? "" : value).trim().toLowerCase();
  }

  function field(row, names) {
    row = row || {};
    for (var i = 0; i < names.length; i++) {
      var value = row[names[i]];
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return String(value).trim();
      }
    }
    return "";
  }

  function arrayOf(data, keys) {
    if (Array.isArray(data)) return data;
    for (var i = 0; i < keys.length; i++) {
      if (Array.isArray(data && data[keys[i]])) return data[keys[i]];
    }
    return [];
  }

  function json(path) {
    if (!cache[path]) {
      cache[path] = fetch(BASE + path, { cache: "no-store" }).then(function (response) {
        if (!response.ok) throw new Error("Data request failed: " + path);
        return response.json();
      });
    }
    return cache[path];
  }

  function find(rows, value, idNames, slugNames) {
    var target = norm(value);
    var list = Array.isArray(rows) ? rows : [];
    for (var i = 0; i < list.length; i++) {
      var row = list[i];
      if (norm(field(row, idNames)) === target || norm(field(row, slugNames)) === target) {
        return row;
      }
    }
    return null;
  }

  function dedupe(rows) {
    var seen = Object.create(null);
    var out = [];
    var list = Array.isArray(rows) ? rows : [];
    for (var i = 0; i < list.length; i++) {
      var row = list[i];
      var key = field(row, ["Business_Id", "Business_Slug", "Business_Seo_Url"]);
      if (!key) {
        out.push(row);
        continue;
      }
      key = norm(key);
      if (seen[key]) continue;
      seen[key] = true;
      out.push(row);
    }
    return out;
  }

  function pageNumber(route) {
    var value = Number(route && route.page);
    return isFinite(value) && value > 0 ? Math.floor(value) : 1;
  }

  function clampPage(page, pageCount) {
    return Math.min(Math.max(1, page), Math.max(1, pageCount));
  }

  function loadIndexes() {
    return json("SEO_INDEX.JSON").then(function (data) {
      return {
        states: arrayOf(data, ["States"]),
        districts: arrayOf(data, ["Districts"]),
        categories: arrayOf(data, ["Categories"]),
        categoryFiles: data && data.Category_Files ? data.Category_Files : {},
        raw: data
      };
    });
  }

  function loadDistrictIndex(district) {
    var path = field(district, ["Index"]);
    if (!path) return Promise.reject(new Error("District index is missing"));
    return json(path);
  }

  function loadDistrictShard(district, shardFile) {
    var id = field(district, ["District_Id"]);
    var file = String(shardFile || "").split("/").pop();
    return json("district-index/" + encodeURIComponent(id) + "/" + file).then(function (data) {
      return dedupe(arrayOf(data, ["businesses", "data", "items"]));
    });
  }

  function loadCategoryShard(shardFile) {
    var file = String(shardFile || "").split("/").pop();
    return json("category-index/" + file).then(function (data) {
      return dedupe(arrayOf(data, ["businesses", "data", "items"]));
    });
  }

  function pagedRows(loadOne, shards, page) {
    var p = Math.max(1, Number(page) || 1);
    var start = (p - 1) * PAGE_SIZE;
    var first = Math.floor(start / SHARD_SIZE);
    var offset = start % SHARD_SIZE;
    var out = [];

    function next(index) {
      if (index >= shards.length || out.length >= PAGE_SIZE) {
        return Promise.resolve(out.slice(0, PAGE_SIZE));
      }
      return Promise.resolve(loadOne(index)).then(function (rows) {
        rows = Array.isArray(rows) ? rows : [];
        var from = index === first ? offset : 0;
        if (from < rows.length) {
          out = out.concat(rows.slice(from, from + (PAGE_SIZE - out.length)));
        }
        return out.length >= PAGE_SIZE ? out.slice(0, PAGE_SIZE) : next(index + 1);
      });
    }

    return next(first);
  }

  function loadDistrictBusinesses(district, page) {
    return loadDistrictIndex(district).then(function (meta) {
      var shards = Array.isArray(meta && meta.Shards) ? meta.Shards : [];
      return pagedRows(function (i) {
        return loadDistrictShard(district, shards[i] && shards[i].file);
      }, shards, page);
    });
  }

  function loadBusiness(district, businessSlug) {
    return loadDistrictIndex(district).then(function (meta) {
      var map = meta && meta.Business_Slug_To_Shard ? meta.Business_Slug_To_Shard : {};
      var file = map[norm(businessSlug)];
      if (!file) return null;
      return loadDistrictShard(district, file).then(function (rows) {
        var target = norm(businessSlug);
        for (var i = 0; i < rows.length; i++) {
          if (norm(field(rows[i], ["Business_Slug", "businessSlug", "slug"])) === target) {
            return rows[i];
          }
        }
        return null;
      });
    });
  }

  function loadCategoryBusinesses(category, page) {
    var categoryId = field(category, ["Category_Id"]);
    return loadIndexes().then(function (indexes) {
      var meta = indexes.categoryFiles[categoryId] || {};
      return pagedRows(loadCategoryShard, meta.Shards || [], page);
    });
  }

  function loadDistrictCategoryBusinesses(district, category, page) {
    var categoryId = field(category, ["Category_Id"]);
    return loadDistrictIndex(district).then(function (meta) {
      var files = meta && meta.Category_Shard_Map && meta.Category_Shard_Map[categoryId];
      files = Array.isArray(files) ? files : [];
      return pagedRows(function (i) {
        return loadDistrictShard(district, files[i]).then(function (rows) {
          return rows.filter(function (business) {
            return norm(field(business, ["Category_Id"])) === norm(categoryId);
          });
        });
      }, files, page);
    });
  }

  function resolve(route) {
    return loadIndexes().then(function (indexes) {
      var data = {
        route: route,
        indexes: indexes,
        state: null,
        district: null,
        category: null,
        business: null,
        businesses: [],
        businessTotal: 0,
        page: pageNumber(route),
        pageCount: 0,
        hasNext: false,
        errors: []
      };

      if (route.stateSlug) data.state = find(indexes.states, route.stateSlug, ["State_Id"], ["State_Slug"]);
      if (route.districtSlug) data.district = find(indexes.districts, route.districtSlug, ["District_Id"], ["District_Slug"]);
      if (route.categorySlug) data.category = find(indexes.categories, route.categorySlug, ["Category_Id"], ["Category_Slug"]);

      if (route.type === "home") return data;

      if (route.type === "state") {
        if (!data.state) data.errors.push("State not found");
        return data;
      }

      if (route.type === "category") {
        if (!data.category) {
          data.errors.push("Category not found");
          return data;
        }
        var categoryMeta = indexes.categoryFiles[field(data.category, ["Category_Id"])] || {};
        data.businessTotal = Number(categoryMeta.Count || 0);
        data.pageCount = Math.max(1, Math.ceil(data.businessTotal / PAGE_SIZE));
        data.page = clampPage(data.page, data.pageCount);
        return loadCategoryBusinesses(data.category, data.page).then(function (rows) {
          data.businesses = dedupe(rows);
          data.hasNext = data.page < data.pageCount;
          return data;
        });
      }

      if (!data.state) data.errors.push("State not found");
      if (!data.district) data.errors.push("District not found");
      if (!data.state || !data.district) return data;

      if (norm(field(data.state, ["State_Id"])) !== norm(field(data.district, ["State_Id"]))) {
        data.errors.push("District does not belong to state");
      }
      if (data.errors.length) return data;

      if (route.type === "business" || route.type === "district-category") {
        if (!data.category) data.errors.push("Category not found");
        if (data.errors.length) return data;
      }

      if (route.type === "business") {
        return loadBusiness(data.district, route.businessSlug).then(function (business) {
          data.business = business;
          data.businesses = business ? [business] : [];
          if (!business) data.errors.push("Business not found");
          return data;
        });
      }

      return loadDistrictIndex(data.district).then(function (meta) {
        if (route.type === "district") {
          data.businessTotal = Number(meta && meta.Count || 0);
          data.pageCount = Math.max(1, Math.ceil(data.businessTotal / PAGE_SIZE));
          data.page = clampPage(data.page, data.pageCount);
          return loadDistrictBusinesses(data.district, data.page).then(function (rows) {
            data.businesses = dedupe(rows);
            data.hasNext = data.page < data.pageCount;
            return data;
          });
        }

        var categoryId = field(data.category, ["Category_Id"]);
        var files = meta && meta.Category_Shard_Map && meta.Category_Shard_Map[categoryId];
        files = Array.isArray(files) ? files : [];
        data.businessTotal = Number((meta && meta.Category_Counts || {})[categoryId] || 0);
        data.pageCount = Math.max(1, Math.ceil(data.businessTotal / PAGE_SIZE));
        data.page = clampPage(data.page, data.pageCount);
        return loadDistrictCategoryBusinesses(data.district, data.category, data.page).then(function (rows) {
          data.businesses = dedupe(rows);
          data.hasNext = data.page < data.pageCount;
          return data;
        });
      });
    });
  }

  window.UBnuxSEOData = {
    version: "2.5.2",
    PAGE_SIZE: PAGE_SIZE,
    SHARD_SIZE: SHARD_SIZE,
    loadIndexes: loadIndexes,
    loadDistrictIndex: loadDistrictIndex,
    loadDistrictBusinesses: loadDistrictBusinesses,
    loadBusiness: loadBusiness,
    loadCategoryBusinesses: loadCategoryBusinesses,
    loadDistrictCategoryBusinesses: loadDistrictCategoryBusinesses,
    resolve: resolve
  };
})(window);
