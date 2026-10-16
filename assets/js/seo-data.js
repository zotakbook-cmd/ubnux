/* UBnux Fresh SEO Data Resolver v1.0.0 */
(function (window) {
  "use strict";

  var BASE = "/data/";
  var cache = Object.create(null);

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function readJSON(path) {
    if (cache[path]) return cache[path];
    return fetch(BASE + path, { cache: "no-cache" })
      .then(function (response) {
        if (!response.ok) throw new Error("Data request failed: " + path);
        return response.json();
      })
      .then(function (data) {
        cache[path] = data;
        return data;
      });
  }

  function arrayFrom(data, keys) {
    if (Array.isArray(data)) return data;
    for (var i = 0; i < keys.length; i++) {
      if (Array.isArray(data && data[keys[i]])) return data[keys[i]];
    }
    return [];
  }

  function field(row, names) {
    for (var i = 0; i < names.length; i++) {
      if (row && row[names[i]] != null) return row[names[i]];
    }
    return "";
  }

  function loadIndexes() {
    return Promise.all([
      readJSON("STATE.JSON"),
      readJSON("DISTRICT.JSON"),
      readJSON("CATEGORY.JSON")
    ]).then(function (items) {
      return {
        states: arrayFrom(items[0], ["states", "data", "items"]),
        districts: arrayFrom(items[1], ["districts", "data", "items"]),
        categories: arrayFrom(items[2], ["categories", "data", "items"])
      };
    });
  }

  function findBySlugOrId(rows, slug, idNames, slugNames) {
    var target = normalize(slug);
    return rows.find(function (row) {
      var id = normalize(field(row, idNames));
      var value = normalize(field(row, slugNames));
      return id === target || value === target;
    }) || null;
  }

  function findState(indexes, slug) {
    return findBySlugOrId(indexes.states, slug,
      ["State_Id", "stateId", "id"],
      ["State_Slug", "stateSlug", "slug"]);
  }

  function findDistrict(indexes, slug) {
    return findBySlugOrId(indexes.districts, slug,
      ["District_Id", "districtId", "id"],
      ["District_Slug", "districtSlug", "slug"]);
  }

  function findCategory(indexes, slug) {
    return findBySlugOrId(indexes.categories, slug,
      ["Category_Id", "categoryId", "id"],
      ["Category_Slug", "categorySlug", "slug"]);
  }

  function loadDistrictBusinesses(district) {
    var districtId = field(district, ["District_Id", "districtId", "id"]);
    var slug = field(district, ["District_Slug", "districtSlug", "slug"]);
    var file = String(slug || districtId || "").toUpperCase() + "_BUSINESS_INDEX.JSON";
    return readJSON("businesses/" + file).then(function (data) {
      return arrayFrom(data, ["businesses", "data", "items"]);
    });
  }

  function resolve(route) {
    return loadIndexes().then(function (indexes) {
      var result = { route: route, indexes: indexes, state: null, district: null, category: null, businesses: [] };

      if (route.stateSlug) result.state = findState(indexes, route.stateSlug);
      if (route.districtSlug) result.district = findDistrict(indexes, route.districtSlug);
      if (route.categorySlug) result.category = findCategory(indexes, route.categorySlug);

      if (route.type === "category") {
        return Promise.all(indexes.districts.map(loadDistrictBusinesses)).then(function (groups) {
          result.businesses = groups.reduce(function (all, group) { return all.concat(group); }, []);
          if (result.category) {
            var cid = field(result.category, ["Category_Id", "categoryId", "id"]);
            result.businesses = result.businesses.filter(function (b) {
              return normalize(field(b, ["Category_Id", "categoryId", "categoryId"])) === normalize(cid);
            });
          }
          return result;
        });
      }

      if (result.district) {
        return loadDistrictBusinesses(result.district).then(function (businesses) {
          result.businesses = businesses;
          var districtId = field(result.district, ["District_Id", "districtId", "id"]);
          result.businesses = result.businesses.filter(function (b) {
            var bid = field(b, ["District_Id", "districtId", "districtId"]);
            return !bid || normalize(bid) === normalize(districtId);
          });

          if (result.category) {
            var cid = field(result.category, ["Category_Id", "categoryId", "id"]);
            result.businesses = result.businesses.filter(function (b) {
              return normalize(field(b, ["Category_Id", "categoryId"])) === normalize(cid);
            });
          }

          if (route.businessSlug) {
            var target = normalize(route.businessSlug);
            result.business = result.businesses.find(function (b) {
              return normalize(field(b, ["Business_Slug", "businessSlug", "slug"])) === target;
            }) || null;
          }
          return result;
        });
      }

      return result;
    });
  }

  window.UBnuxSEOData = {
    version: "1.0.0",
    loadIndexes: loadIndexes,
    loadDistrictBusinesses: loadDistrictBusinesses,
    resolve: resolve
  };
})(window);
