/* UBnux Fresh SEO App v1.2.0 */
(function (window, document) {
  "use strict";

  var SEO_ORIGIN = "https://ubnux.com";

  function setMeta(name, content) {
    var node = document.querySelector('meta[name="' + name + '"]');
    if (!node) {
      node = document.createElement("meta");
      node.setAttribute("name", name);
      document.head.appendChild(node);
    }
    node.setAttribute("content", content);
  }

  function setCanonical(url) {
    var node = document.querySelector('link[rel="canonical"]');
    if (!node) {
      node = document.createElement("link");
      node.rel = "canonical";
      document.head.appendChild(node);
    }
    node.href = url;
  }

  function field(row, names) {
    row = row || {};
    for (var i = 0; i < names.length; i++) {
      if (row[names[i]] !== undefined && row[names[i]] !== null && String(row[names[i]]).trim() !== "") return String(row[names[i]]).trim();
    }
    return "";
  }

  function titleFor(route, data) {
    if (route.type === "state") return field(data.state, ["State_Title"]) + " Local Businesses | UBnux";
    if (route.type === "district") return field(data.district, ["District_Title"]) + " Local Businesses | UBnux";
    if (route.type === "category") return field(data.category, ["Category_Title"]) + " Businesses in India | UBnux";
    if (route.type === "district-category") return field(data.category, ["Category_Title"]) + " in " + field(data.district, ["District_Title"]) + " | UBnux";
    if (route.type === "business") return field(data.business, ["Business_Title"]) + " | UBnux";
    if (route.type === "not-found") return "Page Not Found | UBnux";
    return "UBnux — Local Business Search";
  }

  function descriptionFor(route, data) {
    var state = field(data.state, ["State_Title"]);
    var district = field(data.district, ["District_Title"]);
    var category = field(data.category, ["Category_Title"]);
    if (route.type === "state") return "Find businesses, products and services across " + state + " on UBnux.";
    if (route.type === "district") return "Discover local businesses, products and services in " + district + " on UBnux.";
    if (route.type === "category") return "Browse " + category + " businesses and services across India on UBnux.";
    if (route.type === "district-category") return "Find " + category + " businesses and services in " + district + " on UBnux.";
    if (route.type === "business") return "View " + field(data.business, ["Business_Title"]) + " business information on UBnux.";
    if (route.type === "not-found") return "The requested UBnux page could not be found.";
    return "UBnux local business search engine.";
  }

  function canonical() {
    var path = String(window.location.pathname || "/").replace(/\/+/g, "/");
    if (path !== "/" && path.slice(-1) !== "/") path += "/";
    return SEO_ORIGIN + path;
  }

  function isResolved(route, data) {
    if (!route || route.valid === false || !data) return false;
    if (route.type === "home") return true;
    if (route.type === "state") return !!data.state && data.errors.length === 0;
    if (route.type === "district") return !!data.state && !!data.district && data.errors.length === 0;
    if (route.type === "category") return !!data.category && data.errors.length === 0;
    if (route.type === "district-category") return !!data.state && !!data.district && !!data.category && data.errors.length === 0;
    if (route.type === "business") return !!data.state && !!data.district && !!data.category && !!data.business && data.errors.length === 0;
    return false;
  }

  function renderNotFound() {
    var root = document.getElementById("ubnux-seo-root");
    if (!root) return;
    root.innerHTML = '<section class="ubnux-page-section"><div class="ubnux-container"><p class="ubnux-eyebrow">404</p><h1>Page not found</h1><p class="ubnux-intro">The requested UBnux page does not exist.</p><p><a class="ubnux-link" href="/">Go to UBnux home</a></p></div></section>';
  }

  function start() {
    var route = window.UBnuxSEORouter.parse(window.location.pathname);

    if (route.type === "not-found") {
      document.title = titleFor(route, {});
      setMeta("description", descriptionFor(route, {}));
      setMeta("robots", "noindex,nofollow");
      setCanonical(canonical());
      if (window.UBnuxSEOSchema) window.UBnuxSEOSchema.remove();
      renderNotFound();
      return;
    }

    var promise = route.type === "home"
      ? Promise.resolve({ route: route, indexes: { states: [], districts: [], categories: [] }, businesses: [], errors: [] })
      : window.UBnuxSEOData.resolve(route);

    promise.then(function (data) {
      var resolved = isResolved(route, data);
      var title = resolved ? titleFor(route, data) : "Page Not Found | UBnux";
      var description = resolved ? descriptionFor(route, data) : "The requested UBnux page could not be found.";
      document.title = title;
      setMeta("description", description);
      setMeta("robots", resolved ? "index,follow" : "noindex,follow");
      setCanonical(canonical());

      if (!resolved) {
        if (window.UBnuxSEOSchema) window.UBnuxSEOSchema.remove();
        renderNotFound();
        return;
      }

      if (window.UBnuxSEOSchema) window.UBnuxSEOSchema.set(route, data, title);
      window.UBnuxSEORenderer.render(route, data);
    }).catch(function (error) {
      console.error("UBnux SEO bootstrap failed", error);
      document.title = "UBnux — Local Business Search";
      setMeta("description", "UBnux local business search engine.");
      setMeta("robots", "noindex,follow");
      setCanonical(canonical());
      if (window.UBnuxSEOSchema) window.UBnuxSEOSchema.remove();
      var root = document.getElementById("ubnux-seo-root");
      if (root) root.innerHTML = '<section class="ubnux-page-section"><div class="ubnux-container"><h1>UBnux is temporarily unavailable</h1><p class="ubnux-intro">Please try again in a moment.</p></div></section>';
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})(window, document);
