/*
 * store.js — local data layer shared by every public page and admin.html.
 *
 * Source of truth, in priority order:
 *   1. localStorage (key STORAGE_KEY) — edits made in admin.html on THIS browser/device.
 *   2. window.SITE_DATA from data.js — the bundled defaults shipped with the site.
 *
 * IMPORTANT (read this before assuming anything "syncs"):
 * localStorage is per-browser, per-device. Saving in admin.html only changes what
 * THIS browser sees. It does NOT edit data.js on disk and does NOT update the
 * copy of this site other visitors load from your host. To publish changes for
 * everyone, use "Export Website" in admin.html and re-upload the result.
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "storefront_v1_data";
  var MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function uid(prefix) {
    return (prefix || "ITEM") + "-" + Date.now().toString(36).toUpperCase() + "-" + Math.floor(Math.random() * 1000);
  }

  function blankBrand() {
    return {
      name: "My Store",
      tagline: "",
      logoLetter: "M",
      favicon: "",
      heroTitle: "Welcome to<br>the catalogue.",
      heroLead: "Browse our products below.",
      discordInvite: "",
      discordProfile: "",
      instagram: "",
      email: "",
      purchaseLabel: "Purchase via Discord Ticket",
      secondaryLabel: "Contact Admin on Discord",
      instagramLabel: "Contact on Instagram",
      contactInstructions: "Join our Discord server and open a ticket with the item name to purchase. For payment details or further questions, you can also contact us directly.",
      footerNote: "Local demo · Replace details before sharing",
      musicEnabled: true,
      musicAsset: ""
    };
  }

  // ---- Design tokens & presets ----
  function blankDesign() {
    return {
      preset: "neon-cyberpunk",
      colors: { bg: "#070910", panel: "rgba(255,255,255,.055)", line: "rgba(145,161,255,.18)", text: "#f4f6ff", muted: "#a6acc4", gold: "#5cf2ff", red: "#ff5478", green: "#74f7bd", violet: "#a78bfa", magenta: "#f472ff" },
      radius: 22,
      shadow: "normal",
      animSpeed: 1,
      fontScale: 1
    };
  }

  var DESIGN_PRESETS = {
    "neon-cyberpunk": { label: "Neon Cyberpunk", colors: { bg: "#070910", panel: "rgba(255,255,255,.055)", line: "rgba(145,161,255,.18)", text: "#f4f6ff", muted: "#a6acc4", gold: "#5cf2ff", red: "#ff5478", green: "#74f7bd", violet: "#a78bfa", magenta: "#f472ff" }, radius: 22, shadow: "normal", animSpeed: 1, fontScale: 1 },
    "minimal-dark": { label: "Minimal Dark", colors: { bg: "#0b0b0d", panel: "rgba(255,255,255,.04)", line: "rgba(255,255,255,.1)", text: "#f2f2f2", muted: "#9a9a9e", gold: "#e8e8ec", red: "#ff6b6b", green: "#8fd3a6", violet: "#b8b8c4", magenta: "#d9d9e0" }, radius: 12, shadow: "low", animSpeed: 0.85, fontScale: 1 },
    "electric-blue": { label: "Electric Blue", colors: { bg: "#050a14", panel: "rgba(90,160,255,.07)", line: "rgba(90,160,255,.22)", text: "#eef5ff", muted: "#9fb3d6", gold: "#4da3ff", red: "#ff5e7a", green: "#5fe3c4", violet: "#6f8cff", magenta: "#4de0ff" }, radius: 18, shadow: "normal", animSpeed: 1.05, fontScale: 1 },
    "purple-holographic": { label: "Purple Holographic", colors: { bg: "#0c0714", panel: "rgba(190,120,255,.08)", line: "rgba(200,140,255,.24)", text: "#f6efff", muted: "#b7a4d6", gold: "#d39bff", red: "#ff6ec7", green: "#7af0d6", violet: "#b084ff", magenta: "#ff8ef0" }, radius: 26, shadow: "high", animSpeed: 1.1, fontScale: 1.02 },
    "clean-gaming-pro": { label: "Clean Gaming Pro", colors: { bg: "#0a0c10", panel: "rgba(255,255,255,.05)", line: "rgba(255,255,255,.14)", text: "#f5f6f8", muted: "#9ba2ad", gold: "#3dd6a3", red: "#ff5c5c", green: "#3dd6a3", violet: "#5ca8ff", magenta: "#ffb347" }, radius: 16, shadow: "low", animSpeed: 0.9, fontScale: 1 }
  };

  function applyPreset(presetKey) {
    var preset = DESIGN_PRESETS[presetKey];
    if (!preset) return blankDesign();
    return { preset: presetKey, colors: Object.assign({}, preset.colors), radius: preset.radius, shadow: preset.shadow, animSpeed: preset.animSpeed, fontScale: preset.fontScale };
  }

  // ---- Content blocks (bounded page-builder vocabulary) ----
  var BLOCK_TYPES = ["heading", "feature-list", "button-row", "image-text", "divider"];
  function blankBlock(type) {
    var base = { id: uid("BLOCK"), type: type, order: 0 };
    switch (type) {
      case "heading": return Object.assign(base, { eyebrow: "", title: "New section", text: "" });
      case "feature-list": return Object.assign(base, { title: "Features", items: [] });
      case "button-row": return Object.assign(base, { buttons: [] });
      case "image-text": return Object.assign(base, { title: "", text: "", image: { type: "none", value: "" }, imageSide: "left" });
      case "divider": return Object.assign(base, {});
      default: return base;
    }
  }

  function normalizeBlocks(list) {
    return (Array.isArray(list) ? list : []).map(function (b, i) {
      return Object.assign(blankBlock(b && b.type), b, { order: (typeof (b && b.order) === "number") ? b.order : i });
    }).sort(function (a, b) { return a.order - b.order; });
  }

  function normalize(data) {
    var out = {
      version: 2,
      brand: Object.assign(blankBrand(), (data && data.brand) || {}),
      design: Object.assign(blankDesign(), (data && data.design) || {}, { colors: Object.assign(blankDesign().colors, (data && data.design && data.design.colors) || {}) }),
      categories: (data && Array.isArray(data.categories) && data.categories.length) ? data.categories : ["General"],
      items: (data && Array.isArray(data.items)) ? data.items : [],
      blocks: {
        home: normalizeBlocks(data && data.blocks && data.blocks.home),
        about: normalizeBlocks(data && data.blocks && data.blocks.about)
      },
      pages: (data && Array.isArray(data.pages)) ? data.pages : [],
      assets: (data && Array.isArray(data.assets)) ? data.assets : []
    };
    out.items = out.items.map(function (it, i) {
      return Object.assign({
        id: uid("ITEM"),
        name: "Untitled item",
        group: out.categories[0],
        status: "Available",
        visibility: "draft",
        featured: false,
        price: "",
        tiers: [],
        features: [],
        description: "",
        details: [],
        image: { type: "none", value: "" },
        tone: "",
        order: i
      }, it, { order: (typeof it.order === "number") ? it.order : i });
    });
    out.pages = out.pages.map(function (p, i) {
      return Object.assign({
        id: uid("PAGE"),
        title: "New page",
        slug: "page-" + (i + 1),
        navVisible: true,
        blocks: []
      }, p, { blocks: normalizeBlocks(p && p.blocks), order: (typeof (p && p.order) === "number") ? p.order : i });
    });
    out.assets = out.assets.map(function (a) {
      return Object.assign({ id: uid("ASSET"), name: "asset", kind: "image", value: "" }, a);
    });
    return out;
  }

  function loadData() {
    try {
      var raw = global.localStorage.getItem(STORAGE_KEY);
      if (raw) return normalize(JSON.parse(raw));
    } catch (e) {
      console.warn("storefront: could not read localStorage, falling back to bundled data.js", e);
    }
    return normalize(global.SITE_DATA ? deepClone(global.SITE_DATA) : null);
  }

  function saveData(data) {
    var normalized = normalize(data);
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch (e) {
      throw new Error(
        "Could not save to this browser's local storage (it may be full, private-mode, or disabled). " +
        "Export a JSON backup regularly so you never rely on localStorage alone."
      );
    }
    return normalized;
  }

  function hasLocalEdits() {
    try {
      return !!global.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return false;
    }
  }

  function resetToBundled() {
    try {
      global.localStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* ignore */ }
    return loadData();
  }

  function exportJSON(data) {
    return JSON.stringify(normalize(data), null, 2);
  }

  function importJSON(str) {
    var parsed;
    try {
      parsed = JSON.parse(str);
    } catch (e) {
      throw new Error("That file is not valid JSON.");
    }
    if (!parsed || typeof parsed !== "object") {
      throw new Error("That file does not look like a storefront backup.");
    }
    return normalize(parsed);
  }

  function addItem(data, item) {
    var out = normalize(data);
    var clean = Object.assign({}, item, { id: item.id || uid("ITEM"), order: out.items.length });
    out.items.push(clean);
    return out;
  }

  function updateItem(data, id, patch) {
    var out = normalize(data);
    out.items = out.items.map(function (it) {
      return it.id === id ? Object.assign({}, it, patch, { id: it.id }) : it;
    });
    return out;
  }

  function duplicateItem(data, id) {
    var out = normalize(data);
    var original = out.items.find(function (it) { return it.id === id; });
    if (!original) return out;
    var copy = deepClone(original);
    copy.id = uid("ITEM");
    copy.name = original.name + " (copy)";
    copy.visibility = "draft";
    copy.order = out.items.length;
    out.items.push(copy);
    return out;
  }

  function deleteItem(data, id) {
    var out = normalize(data);
    out.items = out.items.filter(function (it) { return it.id !== id; }).map(function (it, i) {
      return Object.assign({}, it, { order: i });
    });
    return out;
  }

  function reorderItem(data, id, direction) {
    var out = normalize(data);
    var items = out.items.slice().sort(function (a, b) { return a.order - b.order; });
    var idx = items.findIndex(function (it) { return it.id === id; });
    if (idx < 0) return out;
    var swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= items.length) return out;
    var tmp = items[idx];
    items[idx] = items[swapWith];
    items[swapWith] = tmp;
    items.forEach(function (it, i) { it.order = i; });
    out.items = items;
    return out;
  }

  function setBranding(data, brandPatch) {
    var out = normalize(data);
    out.brand = Object.assign({}, out.brand, brandPatch);
    return out;
  }

  function setCategories(data, categories) {
    var out = normalize(data);
    out.categories = categories.filter(Boolean);
    return out;
  }

  // ---- Design ----
  function setDesign(data, patch) {
    var out = normalize(data);
    out.design = Object.assign({}, out.design, patch, { colors: Object.assign({}, out.design.colors, (patch && patch.colors) || {}) });
    return out;
  }

  // ---- Content blocks (home / about, and per custom-page) ----
  function addBlock(data, scope, type, pageId) {
    var out = normalize(data);
    var list = scope === "page" ? out.pages.find(function (p) { return p.id === pageId; }).blocks : out.blocks[scope];
    list.push(Object.assign(blankBlock(type), { order: list.length }));
    return out;
  }
  function updateBlock(data, scope, blockId, patch, pageId) {
    var out = normalize(data);
    var list = scope === "page" ? out.pages.find(function (p) { return p.id === pageId; }).blocks : out.blocks[scope];
    var idx = list.findIndex(function (b) { return b.id === blockId; });
    if (idx >= 0) list[idx] = Object.assign({}, list[idx], patch, { id: list[idx].id });
    return out;
  }
  function removeBlock(data, scope, blockId, pageId) {
    var out = normalize(data);
    var list = scope === "page" ? out.pages.find(function (p) { return p.id === pageId; }).blocks : out.blocks[scope];
    var filtered = list.filter(function (b) { return b.id !== blockId; }).map(function (b, i) { return Object.assign({}, b, { order: i }); });
    if (scope === "page") out.pages.find(function (p) { return p.id === pageId; }).blocks = filtered;
    else out.blocks[scope] = filtered;
    return out;
  }
  function reorderBlock(data, scope, blockId, direction, pageId) {
    var out = normalize(data);
    var page = scope === "page" ? out.pages.find(function (p) { return p.id === pageId; }) : null;
    var list = (scope === "page" ? page.blocks : out.blocks[scope]).slice();
    var idx = list.findIndex(function (b) { return b.id === blockId; });
    var swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swapWith < 0 || swapWith >= list.length) return out;
    var tmp = list[idx]; list[idx] = list[swapWith]; list[swapWith] = tmp;
    list.forEach(function (b, i) { b.order = i; });
    if (scope === "page") page.blocks = list; else out.blocks[scope] = list;
    return out;
  }

  // ---- Custom pages ----
  function slugify(str) {
    return String(str || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "page";
  }
  function uniqueSlug(out, desired, ignoreId) {
    var taken = out.pages.filter(function (p) { return p.id !== ignoreId; }).map(function (p) { return p.slug; })
      .concat(["index", "catalogue", "about", "contact", "admin", "page"]);
    var base = slugify(desired), slug = base, n = 2;
    while (taken.indexOf(slug) !== -1) { slug = base + "-" + n; n++; }
    return slug;
  }
  function addPage(data, title) {
    var out = normalize(data);
    var page = { id: uid("PAGE"), title: title || "New page", navVisible: true, blocks: [], order: out.pages.length };
    page.slug = uniqueSlug(out, title || "page");
    out.pages.push(page);
    return out;
  }
  function updatePage(data, id, patch) {
    var out = normalize(data);
    var idx = out.pages.findIndex(function (p) { return p.id === id; });
    if (idx < 0) return out;
    var next = Object.assign({}, out.pages[idx], patch, { id: id });
    if (patch && typeof patch.slug === "string") next.slug = uniqueSlug(out, patch.slug, id);
    out.pages[idx] = next;
    return out;
  }
  function duplicatePage(data, id) {
    var out = normalize(data);
    var original = out.pages.find(function (p) { return p.id === id; });
    if (!original) return out;
    var copy = deepClone(original);
    copy.id = uid("PAGE");
    copy.title = original.title + " (copy)";
    copy.slug = uniqueSlug(out, copy.title);
    copy.order = out.pages.length;
    copy.blocks = copy.blocks.map(function (b) { return Object.assign({}, b, { id: uid("BLOCK") }); });
    out.pages.push(copy);
    return out;
  }
  function deletePage(data, id) {
    var out = normalize(data);
    out.pages = out.pages.filter(function (p) { return p.id !== id; }).map(function (p, i) { return Object.assign({}, p, { order: i }); });
    return out;
  }

  // ---- Asset library ----
  function addAsset(data, asset) {
    var out = normalize(data);
    out.assets.push(Object.assign({ id: uid("ASSET") }, asset));
    return out;
  }
  function removeAsset(data, id) {
    var out = normalize(data);
    out.assets = out.assets.filter(function (a) { return a.id !== id; });
    return out;
  }

  // ---- Undo/redo: in-memory snapshot stack (session-only, not a durable backup) ----
  function createHistory(initial, limit) {
    var stack = [JSON.stringify(initial)];
    var cursor = 0;
    var max = limit || 50;
    return {
      push: function (state) {
        stack = stack.slice(0, cursor + 1);
        stack.push(JSON.stringify(state));
        if (stack.length > max) stack.shift();
        cursor = stack.length - 1;
      },
      canUndo: function () { return cursor > 0; },
      canRedo: function () { return cursor < stack.length - 1; },
      undo: function () { if (cursor > 0) cursor--; return JSON.parse(stack[cursor]); },
      redo: function () { if (cursor < stack.length - 1) cursor++; return JSON.parse(stack[cursor]); }
    };
  }

  function isValidUrl(str) {
    if (!str) return true;
    try {
      var u = new URL(str);
      return u.protocol === "https:" || u.protocol === "http:";
    } catch (e) {
      return false;
    }
  }

  function sanitizeText(str, maxLen) {
    var s = String(str == null ? "" : str);
    if (maxLen) s = s.slice(0, maxLen);
    return s;
  }

  function validateImageDataUri(dataUri) {
    if (!/^data:image\/(png|jpeg|jpg|webp|gif);base64,/.test(dataUri)) {
      throw new Error("Only PNG, JPEG, WEBP or GIF images are supported.");
    }
    var approxBytes = Math.ceil((dataUri.length - dataUri.indexOf(",") - 1) * 3 / 4);
    if (approxBytes > MAX_IMAGE_BYTES) {
      throw new Error("Image is too large for local storage (max ~1.5MB). Use an image URL instead for larger images.");
    }
    return true;
  }

  global.Store = {
    STORAGE_KEY: STORAGE_KEY,
    MAX_IMAGE_BYTES: MAX_IMAGE_BYTES,
    loadData: loadData,
    saveData: saveData,
    hasLocalEdits: hasLocalEdits,
    resetToBundled: resetToBundled,
    exportJSON: exportJSON,
    importJSON: importJSON,
    addItem: addItem,
    updateItem: updateItem,
    duplicateItem: duplicateItem,
    deleteItem: deleteItem,
    reorderItem: reorderItem,
    setBranding: setBranding,
    setCategories: setCategories,
    sanitizeText: sanitizeText,
    isValidUrl: isValidUrl,
    validateImageDataUri: validateImageDataUri,
    uid: uid,
    normalize: normalize,
    DESIGN_PRESETS: DESIGN_PRESETS,
    BLOCK_TYPES: BLOCK_TYPES,
    blankBlock: blankBlock,
    setDesign: setDesign,
    applyPreset: applyPreset,
    addBlock: addBlock,
    updateBlock: updateBlock,
    removeBlock: removeBlock,
    reorderBlock: reorderBlock,
    slugify: slugify,
    addPage: addPage,
    updatePage: updatePage,
    duplicatePage: duplicatePage,
    deletePage: deletePage,
    addAsset: addAsset,
    removeAsset: removeAsset,
    createHistory: createHistory
  };
})(window);
