/* UBnux Fresh SEO Renderer v1.0.0 */
(function (window, document) {
  "use strict";

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function field(row, names) {
    for (var i = 0; i < names.length; i++) {
      if (row && row[names[i]] != null) return row[names[i]];
    }
    return "";
  }

  function text(value, fallback) {
    var v = String(value == null ? "" : value).trim();
    return v || fallback || "";
  }

  function entityName(row, type) {
    if (type === "state") return text(field(row, ["State_Title"]), "State");
    if (type === "district") return text(field(row, ["District_Title"]), "District");
    if (type === "category") return text(field(row, ["Category_Title"]), "Category");
    return text(field(row, ["Business_Title"]), "Business");
  }

  function pageHeading(route, data) {
    if (route.type === "state") return entityName(data.state, "state") + " — Local Businesses & Services";
    if (route.type === "district") return entityName(data.district, "district") + " — Local Businesses & Services";
    if (route.type === "category") return entityName(data.category, "category") + " Businesses in India";
    if (route.type === "district-category") {
      return entityName(data.category, "category") + " in " + entityName(data.district, "district");
    }
    if (route.type === "business") return entityName(data.business, "business");
    return "UBnux — Local Business Search";
  }

  function description(route, data) {
    if (route.type === "state") return "Find local businesses, products and services across " + entityName(data.state, "state") + " on UBnux.";
    if (route.type === "district") return "Discover local businesses, products and services in " + entityName(data.district, "district") + " on UBnux.";
    if (route.type === "category") return "Browse " + entityName(data.category, "category") + " businesses and services across India on UBnux.";
    if (route.type === "district-category") return "Find " + entityName(data.category, "category") + " businesses and services in " + entityName(data.district, "district") + " on UBnux.";
    if (route.type === "business") return entityName(data.business, "business") + " — business details, rating and local information on UBnux.";
    return "UBnux local business search engine for businesses, products and services.";
  }

  function card(business, state, district, category) {
    var name = entityName(business, "business");
    var slug = field(business, ["Business_Slug", "businessSlug", "slug"]);
    var rating = field(business, ["Business_Rating", "rating"]);
    var reviews = field(business, ["Business_Review", "ReviewCount", "reviewCount"]);
    var url = field(business, ["Business_Seo_Url"]);
    if (!url) {
      url = "/in/" + field(state, ["State_Slug"]) + "/" + field(district, ["District_Slug"]) + "/" + field(category, ["Category_Slug"]) + "/" + slug + "/";
    }

    return '<article class="ubnux-business-card">' +
      '<a class="ubnux-business-link" href="' + esc(url) + '">' +
      '<h3>' + esc(name) + '</h3>' +
      '<p class="ubnux-meta">' + esc(entityName(category, "category")) + ' · ' + esc(entityName(district, "district")) + '</p>' +
      (rating !== "" ? '<p class="ubnux-rating">★ ' + esc(rating) + (reviews !== "" ? ' (' + esc(reviews) + ' reviews)' : '') + '</p>' : '') +
      '<span class="ubnux-view">View business →</span>' +
      '</a></article>';
  }

  function renderList(route, data) {
    var title = pageHeading(route, data);
    var list = data.businesses || [];
    var category = data.category;
    var district = data.district;
    var state = data.state;

    if (route.type === "category") {
      return '<section class="ubnux-page-section"><div class="ubnux-container">' +
        '<p class="ubnux-eyebrow">CATEGORY</p><h1>' + esc(title) + '</h1>' +
        '<p class="ubnux-intro">' + esc(description(route, data)) + '</p>' +
        '<div class="ubnux-result-count">' + list.length + ' business' + (list.length === 1 ? '' : 'es') + ' found</div>' +
        '<div class="ubnux-business-grid">' + list.map(function (b) {
          var d = (data.indexes.districts || []).find(function (item) {
            return String(field(item, ["District_Id"])).toLowerCase() === String(field(b, ["District_Id"])).toLowerCase();
          }) || {};
          return card(b, state, d, category);
        }).join("") + '</div></div></section>';
    }

    return '<section class="ubnux-page-section"><div class="ubnux-container">' +
      '<p class="ubnux-eyebrow">LOCAL SEARCH</p><h1>' + esc(title) + '</h1>' +
      '<p class="ubnux-intro">' + esc(description(route, data)) + '</p>' +
      (list.length ? '<div class="ubnux-result-count">' + list.length + ' business' + (list.length === 1 ? '' : 'es') + ' found</div><div class="ubnux-business-grid">' + list.map(function (b) { return card(b, state, district, category); }).join("") + '</div>' : '<div class="ubnux-empty">No matching businesses are available yet.</div>') +
      '</div></section>';
  }

  function renderBusiness(route, data) {
    var b = data.business;
    if (!b) return '<section class="ubnux-page-section"><div class="ubnux-container"><h1>Business not found</h1><p class="ubnux-intro">The requested business could not be matched to the current JSON data.</p></div></section>';
    var name = entityName(b, "business");
    var rating = field(b, ["Business_Rating"]);
    var reviews = field(b, ["Business_Review"]);
    return '<section class="ubnux-page-section"><div class="ubnux-container ubnux-business-detail">' +
      '<p class="ubnux-eyebrow">VERIFIED LOCAL BUSINESS</p><h1>' + esc(name) + '</h1>' +
      '<p class="ubnux-intro">' + esc(entityName(data.category, "category")) + ' in ' + esc(entityName(data.district, "district")) + '</p>' +
      '<div class="ubnux-detail-card">' +
      (rating !== "" ? '<div><strong>Rating</strong><span>★ ' + esc(rating) + (reviews !== "" ? ' · ' + esc(reviews) + ' reviews' : '') + '</span></div>' : '') +
      '<div><strong>Status</strong><span>' + esc(text(field(b, ["Business_Status"]), "Listed")) + '</span></div>' +
      '<div><strong>Business ID</strong><span>' + esc(field(b, ["Business_Id"])) + '</span></div>' +
      '</div></div></section>';
  }

  function render(route, data) {
    var root = document.getElementById("ubnux-seo-root");
    if (!root) return;
    if (route.type === "home") {
      root.innerHTML = '<section class="ubnux-home"><div class="ubnux-container"><p class="ubnux-eyebrow">LOCAL SEARCH ENGINE</p><h1>Find businesses, products and services.</h1><p class="ubnux-intro">Search UBnux by state, district, category or business.</p></div></section>';
      return;
    }
    if (!data.state && route.type === "state") {
      root.innerHTML = '<section class="ubnux-page-section"><div class="ubnux-container"><h1>State not found</h1></div></section>';
      return;
    }
    if (route.type === "business") root.innerHTML = renderBusiness(route, data);
    else root.innerHTML = renderList(route, data);
  }

  window.UBnuxSEORenderer = {
    version: "1.0.0",
    render: render
  };
})(window, document);
