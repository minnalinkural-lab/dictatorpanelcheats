/*
 * site.js — shared across every public page (index/catalogue/about/contact/page).
 * Handles design-token injection, branding injection, active-nav highlighting,
 * the mobile menu, the music player, and the three Discord/Instagram contact
 * actions. Page-specific rendering (catalogue grid, contact form) lives in
 * its own file.
 */
(function () {
  "use strict";

  var data = Store.loadData();
  window.__storeData = data; // read by catalogue.js / contact.js on pages that need it

  // ---- Design tokens: injected as a <style> so admin-configured colours/radius/
  // shadow/motion/type-scale apply on every public page without editing styles.css ----
  (function applyDesign() {
    var d = data.design, c = d.colors;
    var shadowMap = {
      low: { card: "0 10px 28px #0006", hover: "0 12px 30px #0008,0 0 0 1px " + c.gold + "33" },
      normal: { card: "0 22px 65px #0005", hover: "0 18px 50px #00000066,0 0 0 1px " + c.gold + "33" },
      high: { card: "0 30px 90px #000a,0 0 40px " + c.gold + "22", hover: "0 30px 90px #000c,0 0 60px " + c.gold + "33,0 0 0 1px " + c.gold + "55" }
    };
    var s = shadowMap[d.shadow] || shadowMap.normal;
    var speed = d.animSpeed || 1;
    var css = ":root{" +
      "--bg:" + c.bg + ";--panel:" + c.panel + ";--line:" + c.line + ";--text:" + c.text + ";--muted:" + c.muted +
      ";--gold:" + c.gold + ";--red:" + c.red + ";--green:" + c.green + ";--violet:" + c.violet + ";--magenta:" + c.magenta +
      ";--radius-card:" + d.radius + "px;--shadow-card:" + s.card + ";--shadow-card-hover:" + s.hover +
      ";--font-scale:" + d.fontScale +
      ";--dur-fast:" + (0.16 / speed).toFixed(3) + "s;--dur:" + (0.28 / speed).toFixed(3) + "s;--dur-slow:" + (0.5 / speed).toFixed(3) + "s}" +
      "body{background:radial-gradient(ellipse at 12% 0%," + c.gold + "1c,transparent 32rem),radial-gradient(ellipse at 90% 22%," + c.violet + "33,transparent 35rem),radial-gradient(ellipse at 52% 90%," + c.magenta + "11,transparent 32rem)," + c.bg + "}";
    var tag = document.createElement("style");
    tag.id = "design-tokens";
    tag.textContent = css;
    document.head.appendChild(tag);

    if (data.brand.favicon) {
      var link = document.querySelector('link[rel="icon"]') || document.createElement("link");
      link.rel = "icon";
      link.href = data.brand.favicon;
      if (!link.parentNode) document.head.appendChild(link);
    }
  })();

  var toast = document.getElementById("toast");
  function notify(msg, isError) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.toggle("error", !!isError);
    toast.classList.add("show");
    setTimeout(function () { toast.classList.remove("show"); }, 3200);
  }
  window.__notify = notify;

  function openExternal(url) {
    if (!url) return false;
    window.open(url, "_blank", "noopener,noreferrer");
    return true;
  }
  window.__openExternal = openExternal;

  function openDiscordTicket() {
    if (!data.brand.discordInvite) {
      notify("Discord ticket link is not configured yet. Set it in admin.html → Branding.", true);
      return;
    }
    openExternal(data.brand.discordInvite);
  }
  function openDiscordProfile() {
    if (!data.brand.discordProfile) {
      notify("Direct Discord contact is not configured yet. Set it in admin.html → Branding.", true);
      return;
    }
    openExternal(data.brand.discordProfile);
  }
  function openInstagram() {
    if (!data.brand.instagram) {
      notify("Instagram link is not configured yet. Set it in admin.html → Branding.", true);
      return;
    }
    openExternal(data.brand.instagram);
  }
  window.__contact = { openDiscordTicket: openDiscordTicket, openDiscordProfile: openDiscordProfile, openInstagram: openInstagram };

  // ---- Branding ----
  function applyBranding() {
    var b = data.brand;
    var titleSuffix = document.body.dataset.pageTitle || "";
    document.title = b.name + (titleSuffix ? " — " + titleSuffix : " — " + b.tagline);

    document.querySelectorAll("[data-brand-name]").forEach(function (el) { el.textContent = b.name; });
    document.querySelectorAll("[data-brand-tagline]").forEach(function (el) { el.textContent = b.tagline; });
    document.querySelectorAll("[data-brand-crest]").forEach(function (el) { el.textContent = (b.logoLetter || b.name || "?").charAt(0).toUpperCase(); });
    document.querySelectorAll("[data-footer-note]").forEach(function (el) { el.textContent = b.footerNote; });
    document.querySelectorAll("[data-brand-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

    document.querySelectorAll("[data-purchase-label]").forEach(function (el) { el.textContent = b.purchaseLabel; });
    document.querySelectorAll("[data-secondary-label]").forEach(function (el) { el.textContent = b.secondaryLabel; });
    document.querySelectorAll("[data-instagram-label]").forEach(function (el) { el.textContent = b.instagramLabel; });
    document.querySelectorAll("[data-contact-instructions]").forEach(function (el) { el.textContent = b.contactInstructions; });

    function wireContactLink(selector, enabled, handler) {
      document.querySelectorAll(selector).forEach(function (el) {
        var hideTarget = el.closest(".contact-card") || el;
        hideTarget.style.display = enabled ? "" : "none";
        el.addEventListener("click", function (e) { e.preventDefault(); handler(); });
      });
    }
    wireContactLink("[data-discord-ticket]", !!b.discordInvite, openDiscordTicket);
    wireContactLink("[data-discord-profile]", !!b.discordProfile, openDiscordProfile);
    wireContactLink("[data-instagram]", !!b.instagram, openInstagram);

    var anyContact = b.discordInvite || b.discordProfile || b.instagram;
    document.querySelectorAll("[data-contact-block]").forEach(function (el) { el.style.display = anyContact ? "" : "none"; });
  }

  // ---- Active nav + mobile menu ----
  function initNav() {
    var current = document.body.dataset.page || "home";
    var links = document.getElementById("links");

    data.pages.filter(function (p) { return p.navVisible; }).sort(function (a, b) { return a.order - b.order; }).forEach(function (p) {
      var a = document.createElement("a");
      a.href = "page.html?slug=" + encodeURIComponent(p.slug);
      a.dataset.page = "custom:" + p.slug;
      a.textContent = p.title;
      links.appendChild(a);
    });

    document.querySelectorAll("#links [data-page]").forEach(function (a) {
      a.classList.toggle("active", a.dataset.page === current);
      a.setAttribute("aria-current", a.dataset.page === current ? "page" : "false");
    });
    var menu = document.getElementById("menu");
    if (menu && links) {
      menu.addEventListener("click", function () {
        var open = links.classList.toggle("open");
        menu.setAttribute("aria-expanded", String(open));
      });
    }
  }

  // ---- Music: autoplay-on-load (silently falls back to starting on the
  // visitor's first interaction — true forced audible autoplay isn't possible,
  // every browser blocks it), always loops, with separate Play/Pause, Mute and
  // Stop controls. Persists only within a single page's lifetime. ----
  function initMusic() {
    var music = document.getElementById("siteMusic");
    var controls = document.getElementById("musicControls");
    var musicToggle = document.getElementById("musicToggle");
    var musicMute = document.getElementById("musicMute");
    var musicStop = document.getElementById("musicStop");
    if (!music || !controls) return;
    if (data.brand.musicEnabled === false) {
      music.remove();
      controls.remove();
      return;
    }
    if (data.brand.musicAsset) music.src = data.brand.musicAsset;
    music.loop = true;

    function syncPlay() {
      var playing = !music.paused;
      musicToggle.textContent = playing ? "⏸ Pause" : "▶ Play";
      musicToggle.classList.toggle("playing", playing);
      musicToggle.setAttribute("aria-pressed", String(playing));
    }
    function syncMute() {
      musicMute.textContent = music.muted ? "🔇" : "🔊";
      musicMute.classList.toggle("playing", music.muted);
      musicMute.setAttribute("aria-pressed", String(music.muted));
      musicMute.setAttribute("aria-label", music.muted ? "Unmute music" : "Mute music");
    }
    function start() { return music.play().then(function () { syncPlay(); return true; }).catch(function () { syncPlay(); return false; }); }

    start().then(function (started) {
      if (!started) {
        var gesture = function () {
          start();
          document.removeEventListener("pointerdown", gesture, true);
          document.removeEventListener("keydown", gesture, true);
          document.removeEventListener("touchstart", gesture, true);
        };
        document.addEventListener("pointerdown", gesture, true);
        document.addEventListener("keydown", gesture, true);
        document.addEventListener("touchstart", gesture, true);
      }
    });
    music.addEventListener("play", syncPlay);
    music.addEventListener("pause", syncPlay);

    musicToggle.addEventListener("click", function () {
      if (music.paused) start().then(function (ok) { if (!ok) notify("Your browser blocked playback. Click once anywhere on the page, then try again.", true); });
      else { music.pause(); syncPlay(); }
    });
    musicMute.addEventListener("click", function () {
      music.muted = !music.muted;
      syncMute();
    });
    musicStop.addEventListener("click", function () {
      music.pause();
      music.currentTime = 0;
      syncPlay();
    });

    syncPlay();
    syncMute();
  }

  applyBranding();
  initNav();
  initMusic();
})();
