/*
 * contact.js — contact.html only. Composes the visitor's message, copies it to
 * the clipboard (Discord tickets have no prefill-URL mechanism like wa.me did),
 * then opens the Discord ticket server so they can paste it in.
 */
(function () {
  "use strict";

  var data = window.__storeData;
  var notify = window.__notify;
  var contact = window.__contact;

  var form = document.getElementById("contactForm");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = document.getElementById("name").value.trim();
    var message = document.getElementById("message").value.trim();
    var composed = "Hello! My name is " + name + ".\n\n" + message;

    function proceed(copied) {
      if (!data.brand.discordInvite) {
        notify("Discord ticket link is not configured yet. Set it in admin.html → Branding.", true);
        return;
      }
      notify(copied ? "Message copied — paste it into your ticket on Discord." : "Opening Discord — your message wasn't copied automatically, so please retype it there.");
      contact.openDiscordTicket();
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(composed).then(function () { proceed(true); }, function () { proceed(false); });
    } else {
      proceed(false);
    }
  });
})();
