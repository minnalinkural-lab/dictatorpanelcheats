/*
 * render.js — pure rendering helpers shared by the public storefront and the
 * admin preview panel. Nothing here touches localStorage; it only turns a
 * data object into HTML strings. Keeping this separate from store.js and
 * index.html means product cards are never hand-written into the page.
 */
(function (global) {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function visualStyle(item) {
    if (item.image && item.image.type !== "none" && item.image.value) {
      return ' style="background-image:url(\'' + esc(item.image.value) + '\')"';
    }
    return "";
  }

  function visualClass(item) {
    var cls = "item-visual";
    if (item.image && item.image.type !== "none" && item.image.value) cls += " image";
    else if (item.tone) cls += " " + esc(item.tone);
    return cls;
  }

  function card(item, index, purchaseLabel) {
    var available = item.status === "Available";
    var visualCls = visualClass(item);
    var visualInline = visualStyle(item);
    var label = purchaseLabel || "Purchase via Discord Ticket";
    return (
      '<article class="item glass" tabindex="0" role="button" aria-label="View details for ' + esc(item.name) + '" data-open="' + esc(item.id) + '" style="--i:' + index + '">' +
        '<div class="' + visualCls + '" data-num="' + String(index + 1).padStart(2, "0") + '"' + visualInline + '>' +
          (item.featured ? '<span class="badge-featured">Featured</span>' : "") +
          '<span class="pill">' + esc(item.group) + '</span>' +
        '</div>' +
        '<div class="body">' +
          '<div class="item-head"><h3>' + esc(item.name) + '</h3><span class="ref">' + esc(item.id) + '</span></div>' +
          '<div class="features">' + (item.features || []).map(function (f) { return '<span class="feature">' + esc(f) + '</span>'; }).join("") + '</div>' +
          '<p class="desc">' + esc(item.description) + '</p>' +
          '<div class="price-row"><span class="price">' + esc(item.price) + '</span><span class="status ' + (available ? "available" : "soon") + '">' + (available ? "Available" : esc(item.status)) + '</span></div>' +
          (available
            ? '<button class="buy" data-purchase="' + esc(item.id) + '">🎫 ' + esc(label) + ' ↗</button>'
            : '<button class="buy disabled" disabled>' + esc(item.status) + '</button>') +
        '</div>' +
      '</article>'
    );
  }

  function emptyState(message) {
    return '<div class="empty">' + esc(message) + '</div>';
  }

  function renderCatalogue(data, opts) {
    opts = opts || {};
    var query = (opts.query || "").trim().toLowerCase();
    var filter = opts.filter || "All";
    var published = data.items.filter(function (it) { return it.visibility === "published"; });

    if (!published.length) {
      return emptyState("No products have been published yet. Check back soon.");
    }

    var out = "";
    var total = 0;
    data.categories.forEach(function (group) {
      var items = published
        .filter(function (it) { return it.group === group; })
        .filter(function (it) { return filter === "All" || it.status === filter; })
        .filter(function (it) {
          if (!query) return true;
          var haystack = [it.name, it.id, it.group, it.price, it.status, it.description].concat(it.features || []).join(" ").toLowerCase();
          return haystack.includes(query);
        })
        .sort(function (a, b) { return a.order - b.order; });

      if (items.length) {
        total += items.length;
        out += '<div class="group-title">' + esc(group) + ' <span style="color:var(--muted);letter-spacing:0">· ' + items.length + ' listing' + (items.length === 1 ? "" : "s") + '</span></div>';
        out += '<div class="grid">' + items.map(function (it, i) { return card(it, i, data.brand && data.brand.purchaseLabel); }).join("") + '</div>';
      }
    });

    return total ? out : emptyState("No products match your search. Try another keyword or filter.");
  }

  // Pricing tiers render as a responsive grid of distinct tiles.
  function renderTiers(tiers) {
    if (!tiers || !tiers.length) return "";
    return '<div class="pricing-tiles">' + tiers.map(function (t) {
      return '<div class="pricing-tile"><div class="pt-label">' + esc(t.label) + '</div><div class="pt-price">' + esc(t.price) + '</div></div>';
    }).join("") + '</div>';
  }

  // item.details is a flat array of strings. A line starting with "## " is
  // treated as a subsection heading — everything after it groups under that
  // heading with its own numbered subsection, until the next "## " line.
  // Plain items before any heading render as a single flat list.
  function renderDetailGroups(details) {
    if (!details || !details.length) {
      return '<div class="detail-list"><div class="detail-line"><span>›</span><span>No additional details provided.</span></div></div>';
    }
    var groups = [];
    var current = { heading: null, items: [] };
    details.forEach(function (d) {
      var m = /^##\s*(.+)/.exec(d);
      if (m) {
        if (current.heading || current.items.length) groups.push(current);
        current = { heading: m[1], items: [] };
      } else {
        current.items.push(d);
      }
    });
    groups.push(current);

    var headingIndex = 0;
    return groups.map(function (g) {
      var listHtml = '<div class="detail-list">' + g.items.map(function (d) {
        return '<div class="detail-line"><span>›</span><span>' + esc(d) + '</span></div>';
      }).join("") + '</div>';
      if (!g.heading) return listHtml;
      headingIndex++;
      return '<div class="detail-group"><h4 class="detail-group-heading">' + String(headingIndex).padStart(2, "0") + '. ' + esc(g.heading) + '</h4>' + listHtml + '</div>';
    }).join("");
  }

  function modalContent(item, index) {
    var available = item.status === "Available";
    return {
      topClass: "modal-top " + (item.image && item.image.type !== "none" && item.image.value ? "" : esc(item.tone || "")),
      topStyle: visualStyle(item),
      num: String(index + 1).padStart(2, "0"),
      group: item.group,
      title: item.name,
      metaHtml: '<span class="status ' + (available ? "available" : "soon") + '">' + (available ? "✅ Available" : "⏳ " + esc(item.status)) + '</span><span class="feature">🔖 Ref: ' + esc(item.id) + '</span>' + (item.featured ? '<span class="feature">⭐ Featured</span>' : ""),
      description: item.description,
      featuresHtml: (item.features || []).map(function (f) { return '<span class="feature">' + esc(f) + '</span>'; }).join(""),
      detailsHtml: renderDetailGroups(item.details),
      tiersHtml: renderTiers(item.tiers),
      price: item.price,
      available: available,
      status: item.status
    };
  }

  // ---- Content blocks (bounded page-builder vocabulary) ----
  function block(b) {
    switch (b.type) {
      case "heading":
        return '<div class="block block-heading">' +
          (b.eyebrow ? '<span class="eyebrow">' + esc(b.eyebrow) + '</span>' : "") +
          '<h2>' + esc(b.title) + '</h2>' +
          (b.text ? '<p>' + esc(b.text) + '</p>' : "") +
          '</div>';
      case "feature-list":
        return '<div class="block block-feature-list">' +
          (b.title ? '<h3>' + esc(b.title) + '</h3>' : "") +
          '<div class="block-feature-grid">' + (b.items || []).map(function (i) { return '<div class="block-feature-item">' + esc(i) + '</div>'; }).join("") + '</div>' +
          '</div>';
      case "button-row":
        return '<div class="block block-button-row">' +
          (b.buttons || []).map(function (btn) {
            var cls = "btn" + (btn.style && btn.style !== "primary" ? " " + esc(btn.style) : "");
            return '<a class="' + cls + '" href="' + esc(btn.url || "#") + '"' + (/^https?:\/\//.test(btn.url || "") ? ' target="_blank" rel="noopener noreferrer"' : "") + '>' + esc(btn.label || "Button") + '</a>';
          }).join("") +
          '</div>';
      case "image-text":
        return '<div class="block block-image-text ' + (b.imageSide === "right" ? "side-right" : "") + '">' +
          '<div class="bit-media"' + (b.image && b.image.value ? ' style="background-image:url(\'' + esc(b.image.value) + '\')"' : "") + '></div>' +
          '<div><h3>' + esc(b.title) + '</h3><p>' + esc(b.text) + '</p></div>' +
          '</div>';
      case "divider":
        return '<div class="block-divider" role="separator"></div>';
      default:
        return "";
    }
  }

  function blocks(list) {
    return (list || []).slice().sort(function (a, b2) { return a.order - b2.order; }).map(block).join("");
  }

  global.Render = {
    esc: esc,
    card: card,
    emptyState: emptyState,
    renderCatalogue: renderCatalogue,
    modalContent: modalContent,
    block: block,
    blocks: blocks
  };
})(window);
