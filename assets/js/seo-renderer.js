/* UBnux SEO Renderer v1.2.0 */
(function (window, document) {
  "use strict";

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function field(row, names) {
    row = row || {};
    for (var i = 0; i < names.length; i++) {
      var value = row[names[i]];
      if (value !== undefined && value !== null && String(value).trim() !== "") return String(value).trim();
    }
    return "";
  }

  function text(value, fallback) {
    var valueText = String(value == null ? "" : value).trim();
    return valueText || fallback || "";
  }

  function entityName(row, type) {
    var names = type === "state" ? ["State_Title"] : type === "district" ? ["District_Title"] : type === "category" ? ["Category_Title"] : ["Business_Title"];
    return text(field(row, names), type === "state" ? "State" : type === "district" ? "District" : type === "category" ? "Category" : "Business");
  }

  function uniqueBusinesses(list) {
    var seen = Object.create(null);
    var out = [];
    (Array.isArray(list) ? list : []).forEach(function (business) {
      var key = field(business, ["Business_Id", "Business_Slug", "Business_Seo_Url"]);
      if (!key) {
        out.push(business);
        return;
      }
      key = key.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      out.push(business);
    });
    return out;
  }

  function pageHeading(route, data) {
    if (route.type === "state") return entityName(data.state, "state") + " — Local Businesses & Services";
    if (route.type === "district") return entityName(data.district, "district") + " — Local Businesses & Services";
    if (route.type === "category") return entityName(data.category, "category") + " Businesses in India";
    if (route.type === "district-category") return entityName(data.category, "category") + " in " + entityName(data.district, "district");
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

  function businessUrl(business, data) {
    var direct = field(business, ["Business_Seo_Url"]);
    if (direct) return direct;

    var slug = field(business, ["Business_Slug", "businessSlug", "slug"]);
    var district = (data.indexes.districts || []).find(function (item) {
      return field(item, ["District_Id"]).toLowerCase() === field(business, ["District_Id"]).toLowerCase();
    });
    var state = (data.indexes.states || []).find(function (item) {
      return field(item, ["State_Id"]).toLowerCase() === field(district, ["State_Id"]).toLowerCase();
    });
    var category = data.category || (data.indexes.categories || []).find(function (item) {
      return field(item, ["Category_Id"]).toLowerCase() === field(business, ["Category_Id"]).toLowerCase();
    });

    if (!slug || !district || !state || !category) return "/";
    return "/in/" + field(state, ["State_Slug"]) + "/" + field(district, ["District_Slug"]) + "/" + field(category, ["Category_Slug"]) + "/" + slug + "/";
  }

  function card(business, data) {
    var name = entityName(business, "business");
    var rating = field(business, ["Business_Rating", "rating"]);
    var reviews = field(business, ["Business_Review", "ReviewCount", "reviewCount"]);
    var url = businessUrl(business, data);
    var meta = entityName(data.category, "category");
    if (data.district) meta += " · " + entityName(data.district, "district");

    return '<article class="ubnux-business-card">' +
      '<a class="ubnux-business-link" href="' + esc(url) + '">' +
      '<h3>' + esc(name) + '</h3>' +
      '<p class="ubnux-meta">' + esc(meta) + '</p>' +
      (rating !== "" ? '<p class="ubnux-rating">★ ' + esc(rating) + (reviews !== "" ? ' (' + esc(reviews) + ' reviews)' : '') + '</p>' : '') +
      '<span class="ubnux-view">View business →</span>' +
      '</a></article>';
  }

  function pageHref(route, page) {
    var path = "/";
    if (route.type === "category") path = "/in/all/" + route.categorySlug + "/";
    else if (route.type === "district") path = "/in/" + route.stateSlug + "/" + route.districtSlug + "/";
    else if (route.type === "district-category") path = "/in/" + route.stateSlug + "/" + route.districtSlug + "/" + route.categorySlug + "/";
    return page <= 1 ? path : path + "?page=" + page;
  }

  function pagination(route, data) {
    if (route.type === "business") return "";
    var page = Math.max(1, Number(data.page || route.page || 1));
    var pageCount = Math.max(1, Number(data.pageCount || 1));
    if (pageCount <= 1) return "";

    var start = Math.max(1, page - 2);
    var end = Math.min(pageCount, page + 2);
    var html = '<nav class="ubnux-pagination" aria-label="Pagination">';
    if (page > 1) html += '<a class="ubnux-page-link" rel="prev" href="' + esc(pageHref(route, page - 1)) + '">← Previous</a>';
    if (start > 1) {
      html += '<a class="ubnux-page-link" href="' + esc(pageHref(route, 1)) + '">1</a>';
      if (start > 2) html += '<span class="ubnux-page-gap">…</span>';
    }
    for (var n = start; n <= end; n++) {
      html += n === page
        ? '<span class="ubnux-page-link is-current" aria-current="page">' + n + '</span>'
        : '<a class="ubnux-page-link" href="' + esc(pageHref(route, n)) + '">' + n + '</a>';
    }
    if (end < pageCount) {
      if (end < pageCount - 1) html += '<span class="ubnux-page-gap">…</span>';
      html += '<a class="ubnux-page-link" href="' + esc(pageHref(route, pageCount)) + '">' + pageCount + '</a>';
    }
    if (page < pageCount) html += '<a class="ubnux-page-link" rel="next" href="' + esc(pageHref(route, page + 1)) + '">Next →</a>';
    return html + '</nav>';
  }

  function renderList(route, data) {
    var title = pageHeading(route, data);
    var list = uniqueBusinesses(data.businesses);
    var total = Number(data.businessTotal || 0);
    var countText = total + " business" + (total === 1 ? "" : "es") + " found";

    return '<section class="ubnux-page-section"><div class="ubnux-container">' +
      '<p class="ubnux-eyebrow">' + (route.type === "category" ? "CATEGORY" : "LOCAL SEARCH") + '</p>' +
      '<h1>' + esc(title) + '</h1>' +
      '<p class="ubnux-intro">' + esc(description(route, data)) + '</p>' +
      '<div class="ubnux-result-count">' + countText + '</div>' +
      (list.length
        ? '<div class="ubnux-business-grid">' + list.map(function (business) { return card(business, data); }).join("") + '</div>'
        : '<div class="ubnux-empty">No matching businesses are available yet.</div>') +
      pagination(route, data) +
      '</div></section>';
  }

  function renderBusiness(data) {
    var business = data.business;
    if (!business) return '<section class="ubnux-page-section"><div class="ubnux-container"><h1>Business not found</h1><p class="ubnux-intro">The requested business could not be matched to the current JSON data.</p></div></section>';
    var rating = field(business, ["Business_Rating"]);
    var reviews = field(business, ["Business_Review", "Business_Review_Count"]);
    return '<section class="ubnux-page-section"><div class="ubnux-container ubnux-business-detail">' +
      '<p class="ubnux-eyebrow">VERIFIED LOCAL BUSINESS</p>' +
      '<h1>' + esc(entityName(business, "business")) + '</h1>' +
      '<p class="ubnux-intro">' + esc(entityName(data.category, "category")) + ' in ' + esc(entityName(data.district, "district")) + '</p>' +
      '<div class="ubnux-detail-card">' +
      (rating !== "" ? '<div><strong>Rating</strong><span>★ ' + esc(rating) + (reviews !== "" ? ' · ' + esc(reviews) + ' reviews' : '') + '</span></div>' : '') +
      '<div><strong>Status</strong><span>' + esc(text(field(business, ["Business_Status"]), "Listed")) + '</span></div>' +
      '<div><strong>Business ID</strong><span>' + esc(field(business, ["Business_Id"])) + '</span></div>' +
      '</div></div></section>';
  }

  function render(route, data) {
    var root = document.getElementById("ubnux-seo-root");
    if (!root) return;
    if (route.type === "home") {
      root.innerHTML = '<section class="ubnux-home"><div class="ubnux-container"><p class="ubnux-eyebrow">LOCAL SEARCH ENGINE</p><h1>Find businesses, products and services.</h1><p class="ubnux-intro">Search UBnux by state, district, category or business.</p></div></section>';
      return;
    }
    if (route.type === "business") root.innerHTML = renderBusiness(data);
    else root.innerHTML = renderList(route, data);
  }

  window.UBnuxSEORenderer = { version: "1.2.0", render: render };
})(window, document);
