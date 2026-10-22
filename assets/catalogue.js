/*
 * catalogue.js — catalogue.html only. Renders the product grid from Store data,
 * wires search/filter, and drives the product-detail modal. Relies on site.js
 * having already run (window.__storeData, window.__notify, window.__contact).
 */
(function () {
  "use strict";

  var data = window.__storeData;
  var contact = window.__contact;
  var activeFilter = "All";

  var productsEl = document.getElementById("products");
  var searchEl = document.getElementById("search");
  var filtersEl = document.getElementById("filters");

  function renderFilters() {
    filtersEl.innerHTML =
      '<button class="filter active" data-filter="All">All products</button>' +
      '<button class="filter" data-filter="Available">Available</button>' +
      '<button class="filter" data-filter="Coming soon">Coming soon</button>';
  }

  function renderProducts() {
    productsEl.classList.add("is-refreshing");
    productsEl.innerHTML = Render.renderCatalogue(data, { query: searchEl.value, filter: activeFilter });
    requestAnimationFrame(function () { productsEl.classList.remove("is-refreshing"); });

    productsEl.querySelectorAll("[data-purchase]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        contact.openDiscordTicket();
      });
    });
    productsEl.querySelectorAll("[data-open]").forEach(function (cardEl) {
      var open = function () {
        var item = data.items.find(function (x) { return x.id === cardEl.dataset.open; });
        if (item) openDetails(item);
      };
      cardEl.addEventListener("click", function (e) { if (!e.target.closest("button")) open(); });
      cardEl.addEventListener("keydown", function (e) {
        if ((e.key === "Enter" || e.key === " ") && e.target === cardEl) { e.preventDefault(); open(); }
      });
    });
  }

  var modal = document.getElementById("productModal");
  function openDetails(item) {
    var published = data.items.filter(function (it) { return it.visibility === "published"; });
    var m = Render.modalContent(item, published.indexOf(item));
    var top = document.getElementById("modalTop");
    top.className = m.topClass;
    top.setAttribute("style", m.topStyle.replace(/^ style="|"$/g, ""));
    top.dataset.num = m.num;
    document.getElementById("modalGroup").textContent = m.group;
    document.getElementById("modalTitle").textContent = m.title;
    document.getElementById("modalMeta").innerHTML = m.metaHtml;
    document.getElementById("modalDescription").textContent = m.description;
    document.getElementById("modalFeatures").innerHTML = m.featuresHtml;
    document.getElementById("modalDetails").innerHTML = m.detailsHtml;
    document.getElementById("modalTiers").innerHTML = m.tiersHtml;
    document.getElementById("modalTiers").previousElementSibling.style.display = m.tiersHtml ? "" : "none";
    document.getElementById("modalPrice").textContent = m.price;

    var actions = "";
    if (m.available) {
      actions += '<button class="btn" id="modalPurchase">🎫 ' + Render.esc(data.brand.purchaseLabel) + ' ↗</button>';
    } else {
      actions += '<button class="btn ghost" disabled>⏳ ' + Render.esc(item.status) + '</button>';
    }
    if (data.brand.discordProfile) actions += '<button class="btn discord" id="modalDiscordProfile">💬 ' + Render.esc(data.brand.secondaryLabel) + ' ↗</button>';
    if (data.brand.instagram) actions += '<button class="btn ghost" id="modalInstagram">📷 ' + Render.esc(data.brand.instagramLabel) + ' ↗</button>';
    document.getElementById("modalActions").innerHTML = actions;

    var purchaseBtn = document.getElementById("modalPurchase");
    if (purchaseBtn) purchaseBtn.addEventListener("click", contact.openDiscordTicket);
    var profileBtn = document.getElementById("modalDiscordProfile");
    if (profileBtn) profileBtn.addEventListener("click", contact.openDiscordProfile);
    var igBtn = document.getElementById("modalInstagram");
    if (igBtn) igBtn.addEventListener("click", contact.openInstagram);

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    document.getElementById("modalClose").focus();
  }
  function closeDetails() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
  document.getElementById("modalClose").addEventListener("click", closeDetails);
  modal.addEventListener("click", function (e) { if (e.target === modal) closeDetails(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && modal.classList.contains("open")) closeDetails(); });

  searchEl.addEventListener("input", renderProducts);
  filtersEl.addEventListener("click", function (e) {
    var b = e.target.closest("[data-filter]");
    if (!b) return;
    activeFilter = b.dataset.filter;
    filtersEl.querySelectorAll(".filter").forEach(function (x) { x.classList.toggle("active", x === b); });
    renderProducts();
  });

  // Deep-link support: catalogue.html?item=ID opens that item's modal on load.
  var params = new URLSearchParams(location.search);
  var deepLinkId = params.get("item");

  renderFilters();
  renderProducts();
  document.getElementById("statCategories") && (document.getElementById("statCategories").textContent = data.categories.length);

  if (deepLinkId) {
    var target = data.items.find(function (it) { return it.id === deepLinkId && it.visibility === "published"; });
    if (target) openDetails(target);
  }
})();
