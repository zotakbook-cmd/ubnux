/* UBnux Fresh SEO Data Resolver v1.2.0 */
(function (window) {
  "use strict";

  var BASE = "/data/";
  var cache = Object.create(null);

  function normalize(value) {
    return String(value == null ? "" : value).trim().toLowerCase();
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
    return data && typeof data === "object" ? [data] : [];
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

  function sameId(a, b) {
    return normalize(a) !== "" && normalize(a) === normalize(b);
  }

  function stateOwnsDistrict(state, district) {
    return !!state && !!district && sameId(
      field(district, ["State_Id", "stateId"]),
      field(state, ["State_Id", "stateId", "id"])
    );
  }

  function businessMatchesContext(business, district, category) {
    var districtId = field(district, ["District_Id", "districtId", "id"]);
    var categoryId = field(category, ["Category_Id", "categoryId", "id"]);
    var businessDistrictId = field(business, ["District_Id", "districtId"]);
    var businessCategoryId = field(business, ["Category_Id", "categoryId"]);

    if (businessDistrictId && !sameId(businessDistrictId, districtId)) return false;
    if (category && businessCategoryId && !sameId(businessCategoryId, categoryId)) return false;
    return true;
  }

  function resolve(route) {
    return loadIndexes().then(function (indexes) {
      var result = {
        route: route,
        indexes: indexes,
        state: null,
        district: null,
        category: null,
        business: null,
        businesses: [],
        errors: []
      };

      if (route.stateSlug) result.state = findState(indexes, route.stateSlug);
      if (route.districtSlug) result.district = findDistrict(indexes, route.districtSlug);
      if (route.categorySlug) result.category = findCategory(indexes, route.categorySlug);

      if (route.type === "state") {
        if (!result.state) result.errors.push("State not found");
        return result;
      }

      if (route.type === "category") {
        if (!result.category) {
          result.errors.push("Category not found");
          return result;
        }

        return Promise.all(indexes.districts.map(function (district) {
          return loadDistrictBusinesses(district).catch(function () { return []; });
        })).then(function (groups) {
          var cid = field(result.category, ["Category_Id", "categoryId", "id"]);
          result.businesses = groups.reduce(function (all, group) {
            return all.concat(group);
          }, []).filter(function (business) {
            return sameId(field(business, ["Category_Id", "categoryId"]), cid);
          });
          return result;
        });
      }

      if (!result.state) result.errors.push("State not found");
      if (!result.district) result.errors.push("District not found");

      if (!result.state || !result.district) return result;

      if (!stateOwnsDistrict(result.state, result.district)) {
        result.errors.push("District does not belong to state");
        return result;
      }

      if (route.type === "district" && result.category) {
        result.errors.push("Invalid district route");
        return result;
      }

      if ((route.type === "district-category" || route.type === "business") && !result.category) {
        result.errors.push("Category not found");
        return result;
      }

      return loadDistrictBusinesses(result.district).catch(function () { return []; }).then(function (businesses) {
        result.businesses = businesses.filter(function (business) {
          return businessMatchesContext(business, result.district, result.category);
        });

        if (route.businessSlug) {
          var target = normalize(route.businessSlug);
          result.business = result.businesses.find(function (business) {
            return normalize(field(business, ["Business_Slug", "businessSlug", "slug"])) === target;
          }) || null;

          if (!result.business) result.errors.push("Business not found");
        }

        return result;
      });
    });
  }

  window.UBnuxSEOData = {
    version: "1.2.0",
    loadIndexes: loadIndexes,
    loadDistrictBusinesses: loadDistrictBusinesses,
    resolve: resolve
  };
})(window);
