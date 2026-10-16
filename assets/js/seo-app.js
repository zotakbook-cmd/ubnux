/* UBnux Fresh SEO App v1.0.0 */
(function (window, document) {
  "use strict";

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

  function titleFor(route, data) {
    var field = function (row, names) {
      for (var i = 0; i < names.length; i++) if (row && row[names[i]] != null) return row[names[i]];
      return "";
    };
    if (route.type === "state") return field(data.state, ["State_Title"]) + " Local Businesses | UBnux";
    if (route.type === "district") return field(data.district, ["District_Title"]) + " Local Businesses | UBnux";
    if (route.type === "category") return field(data.category, ["Category_Title"]) + " Businesses in India | UBnux";
    if (route.type === "district-category") return field(data.category, ["Category_Title"]) + " in " + field(data.district, ["District_Title"]) + " | UBnux";
    if (route.type === "business") return field(data.business, ["Business_Title"]) + " | UBnux";
    return "UBnux — Local Business Search";
  }

  function descriptionFor(route, data) {
    var field = function (row, names) {
      for (var i = 0; i < names.length; i++) if (row && row[names[i]] != null) return row[names[i]];
      return "";
    };
    var state = field(data.state, ["State_Title"]);
    var district = field(data.district, ["District_Title"]);
    var category = field(data.category, ["Category_Title"]);
    if (route.type === "state") return "Find businesses, products and services across " + state + " on UBnux.";
    if (route.type === "district") return "Discover local businesses, products and services in " + district + " on UBnux.";
    if (route.type === "category") return "Browse " + category + " businesses and services across India on UBnux.";
    if (route.type === "district-category") return "Find " + category + " businesses and services in " + district + " on UBnux.";
    if (route.type === "business") return "View " + field(data.business, ["Business_Title"]) + " business information on UBnux.";
    return "UBnux local business search engine.";
  }

  function canonical() {
    var path = String(window.location.pathname || "/").replace(/\/+/g, "/");
    if (path !== "/" && path.slice(-1) !== "/") path += "/";
    return window.location.origin + path;
  }

  function start() {
    var route = window.UBnuxSEORouter.parse(window.location.pathname);
    var promise = route.type === "home"
      ? Promise.resolve({ route: route, indexes: { states: [], districts: [], categories: [] }, businesses: [] })
      : window.UBnuxSEOData.resolve(route);

    promise.then(function (data) {
      var title = titleFor(route, data);
      var description = descriptionFor(route, data);
      document.title = title;
      setMeta("description", description);
      setMeta("robots", route.valid === false ? "noindex,follow" : "index,follow");
      setCanonical(canonical());
      window.UBnuxSEORenderer.render(route, data);
    }).catch(function (error) {
      console.error("UBnux SEO bootstrap failed", error);
      document.title = "UBnux — Local Business Search";
      setMeta("robots", "noindex,follow");
      var root = document.getElementById("ubnux-seo-root");
      if (root) root.innerHTML = '<section class="ubnux-page-section"><div class="ubnux-container"><h1>UBnux is temporarily unavailable</h1><p class="ubnux-intro">Please try again in a moment.</p></div></section>';
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})(window, document);
