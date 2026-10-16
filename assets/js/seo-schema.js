/* UBnux Fresh SEO Schema v1.0.0 */
(function (window, document) {
  "use strict";

  var ORIGIN = "https://ubnux.com";

  function field(row, names) {
    row = row || {};
    for (var i = 0; i < names.length; i++) {
      if (row[names[i]] !== undefined && row[names[i]] !== null && String(row[names[i]]).trim() !== "") {
        return String(row[names[i]]).trim();
      }
    }
    return "";
  }

  function abs(path) {
    var value = String(path || "");
    if (/^https?:\/\//i.test(value)) return value;
    if (value.charAt(0) !== "/") value = "/" + value;
    return ORIGIN + value;
  }

  function urlFor(row, fallback) {
    return abs(field(row, ["Business_Seo_Url", "State_Seo_Url", "District_Seo_Url", "Category_Seo_Url"]) || fallback || "/");
  }

  function removeOld() {
    var old = document.querySelector('script[data-ubnux-schema="true"]');
    if (old && old.parentNode) old.parentNode.removeChild(old);
  }

  function addSchema(payload) {
    removeOld();
    var node = document.createElement("script");
    node.type = "application/ld+json";
    node.setAttribute("data-ubnux-schema", "true");
    node.text = JSON.stringify(payload);
    document.head.appendChild(node);
  }

  function breadcrumbs(route, data) {
    var items = [{
      "@type": "ListItem",
      "position": 1,
      "name": "UBnux",
      "item": ORIGIN + "/"
    }];

    if (route.type === "state" || route.type === "district" || route.type === "district-category" || route.type === "business") {
      var stateName = field(data.state, ["State_Title"]);
      if (stateName) items.push({
        "@type": "ListItem",
        "position": items.length + 1,
        "name": stateName,
        "item": urlFor(data.state, "/in/" + route.stateSlug + "/")
      });
    }

    if (route.type === "district" || route.type === "district-category" || route.type === "business") {
      var districtName = field(data.district, ["District_Title"]);
      if (districtName) items.push({
        "@type": "ListItem",
        "position": items.length + 1,
        "name": districtName,
        "item": urlFor(data.district, "/in/" + route.stateSlug + "/" + route.districtSlug + "/")
      });
    }

    if (route.type === "category" || route.type === "district-category" || route.type === "business") {
      var categoryName = field(data.category, ["Category_Title"]);
      if (categoryName) {
        var categoryPath = route.type === "category"
          ? "/in/all/" + route.categorySlug + "/"
          : "/in/" + route.stateSlug + "/" + route.districtSlug + "/" + route.categorySlug + "/";
        items.push({
          "@type": "ListItem",
          "position": items.length + 1,
          "name": categoryName,
          "item": urlFor(data.category, categoryPath)
        });
      }
    }

    if (route.type === "business") {
      var businessName = field(data.business, ["Business_Title"]);
      if (businessName) items.push({
        "@type": "ListItem",
        "position": items.length + 1,
        "name": businessName,
        "item": urlFor(data.business, "/in/" + route.stateSlug + "/" + route.districtSlug + "/" + route.categorySlug + "/" + route.businessSlug + "/")
      });
    }

    return items;
  }

  function itemList(data) {
    var businesses = Array.isArray(data.businesses) ? data.businesses : [];
    return businesses.slice(0, 100).map(function (business, index) {
      var slug = field(business, ["Business_Slug"]);
      var districtSlug = field(business, ["District_Slug"]) || "";
      var categorySlug = field(business, ["Category_Slug"]) || "";
      var fallback = districtSlug && categorySlug && slug
        ? "/in/bihar/" + districtSlug + "/" + categorySlug + "/" + slug + "/"
        : "/";
      return {
        "@type": "ListItem",
        "position": index + 1,
        "name": field(business, ["Business_Title"]) || "Business",
        "url": urlFor(business, fallback)
      };
    });
  }

  function collectionSchema(route, data, title) {
    var graph = [
      {
        "@type": "CollectionPage",
        "@id": abs(window.location.pathname) + "#page",
        "url": abs(window.location.pathname),
        "name": title
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumbs(route, data)
      }
    ];

    var list = itemList(data);
    if (list.length) graph.push({
      "@type": "ItemList",
      "itemListElement": list
    });

    return {
      "@context": "https://schema.org",
      "@graph": graph
    };
  }

  function businessSchema(route, data, title) {
    var business = data.business || {};
    var payload = {
      "@type": "LocalBusiness",
      "@id": abs(window.location.pathname) + "#business",
      "name": field(business, ["Business_Title"]) || title,
      "url": abs(window.location.pathname),
      "mainEntityOfPage": abs(window.location.pathname),
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumbs(route, data)
      }
    };

    var rating = parseFloat(field(business, ["Business_Rating"]));
    var reviews = parseInt(field(business, ["Business_Review", "Business_Review_Count"]), 10);
    if (isFinite(rating) && rating > 0 && isFinite(reviews) && reviews > 0) {
      payload.aggregateRating = {
        "@type": "AggregateRating",
        "ratingValue": rating,
        "reviewCount": reviews
      };
    }

    var phone = field(business, ["Business_Phone", "Business_Mobile", "Mobile"]);
    var email = field(business, ["Business_Email", "Email"]);
    var address = field(business, ["Business_Address", "Address"]);
    if (phone) payload.telephone = phone;
    if (email) payload.email = email;
    if (address) payload.address = {
      "@type": "PostalAddress",
      "streetAddress": address
    };

    return {
      "@context": "https://schema.org",
      "@graph": [payload]
    };
  }

  function setSchema(route, data, title) {
    if (!route || !data || route.valid === false) {
      removeOld();
      return;
    }

    if (route.type === "home") {
      addSchema({
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "UBnux",
        "url": ORIGIN + "/"
      });
      return;
    }

    if (route.type === "business") addSchema(businessSchema(route, data, title));
    else addSchema(collectionSchema(route, data, title));
  }

  window.UBnuxSEOSchema = {
    version: "1.0.0",
    set: setSchema,
    remove: removeOld
  };
})(window, document);
