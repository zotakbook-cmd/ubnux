/* UBnux Fresh SEO Router v1.1.0 */
(function (window) {
  "use strict";

  function clean(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/^\/+|\/+$/g, "");
  }

  function parse(pathname) {
    var raw = pathname || window.location.pathname || "/";
    var path = clean(raw);
    var parts = path ? path.split("/").filter(Boolean) : [];

    if (!parts.length) return { type: "home", parts: [], valid: true };

    if (parts[0] !== "in") {
      return { type: "not-found", parts: parts, valid: false };
    }

    var rest = parts.slice(1);
    if (!rest.length) return { type: "home", parts: [], valid: true };

    if (rest.length === 1) {
      return { type: "state", stateSlug: rest[0], parts: rest, valid: true };
    }

    if (rest.length === 2 && rest[0] === "all") {
      return { type: "category", categorySlug: rest[1], parts: rest, valid: true };
    }

    if (rest.length === 2) {
      return {
        type: "district",
        stateSlug: rest[0],
        districtSlug: rest[1],
        parts: rest,
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
        valid: true
      };
    }

    return { type: "not-found", parts: rest, valid: false };
  }

  window.UBnuxSEORouter = {
    version: "1.1.0",
    parse: parse,
    normalize: clean
  };
})(window);
