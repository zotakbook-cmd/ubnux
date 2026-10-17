/* UBnux Fresh SEO Router v1.2.0 */
(function (window) {
  "use strict";

  function clean(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/^\/+|\/+$/g, "");
  }

  function pageFromSearch(search) {
    try {
      var params = new URLSearchParams(search || window.location.search || "");
      var value = Number(params.get("page"));
      return isFinite(value) && value > 0 ? Math.floor(value) : 1;
    } catch (e) {
      return 1;
    }
  }

  function parse(pathname, search) {
    var raw = pathname || window.location.pathname || "/";
    var path = clean(raw);
    var parts = path ? path.split("/").filter(Boolean) : [];
    var page = pageFromSearch(search);

    if (!parts.length) return { type: "home", parts: [], page: page, valid: true };

    if (parts[0] !== "in") {
      return { type: "not-found", parts: parts, page: page, valid: false };
    }

    var rest = parts.slice(1);
    if (!rest.length) return { type: "home", parts: [], page: page, valid: true };

    if (rest.length === 1) {
      return { type: "state", stateSlug: rest[0], parts: rest, page: page, valid: true };
    }

    if (rest.length === 2 && rest[0] === "all") {
      return { type: "category", categorySlug: rest[1], parts: rest, page: page, valid: true };
    }

    if (rest.length === 2) {
      return {
        type: "district",
        stateSlug: rest[0],
        districtSlug: rest[1],
        parts: rest,
        page: page,
        valid: true
      };
    }

    if (rest.length === 3) {
      return {
        type: "district-category",
        stateSlug: rest[0],
        districtSlug: rest[1],
        categorySlug: rest[2],
        parts: rest,
        page: page,
        valid: true
      };
    }

    if (rest.length === 4) {
      return {
        type: "business",
        stateSlug: rest[0],
        districtSlug: rest[1],
        categorySlug: rest[2],
        businessSlug: rest[3],
        parts: rest,
        page: 1,
        valid: true
      };
    }

    return { type: "not-found", parts: rest, page: page, valid: false };
  }

  window.UBnuxSEORouter = {
    version: "1.2.0",
    parse: parse,
    normalize: clean,
    getPage: pageFromSearch
  };
})(window);
