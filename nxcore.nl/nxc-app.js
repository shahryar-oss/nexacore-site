/* NexaCore static-site glue — points Nexa at our own backend, wires the
 * contact form to /api/contact, and hides the offline reCAPTCHA badge.
 * Loaded on every page; safe to run even where these elements are absent. */
(function () {
  "use strict";

  // 1) Point the Nexa chat widget at our own endpoint (no WordPress).
  function repoint() { if (window.NEXA && typeof window.NEXA === "object") window.NEXA.rest = "/api/nexa"; }
  repoint();
  document.addEventListener("DOMContentLoaded", repoint);

  document.addEventListener("DOMContentLoaded", function () {
    // 2) Hide the Google reCAPTCHA badge (the WordPress contact form's; unused here).
    var css = document.createElement("style");
    css.textContent = ".grecaptcha-badge{display:none !important;}";
    document.head.appendChild(css);

    // 3) Wire the contact form (Contact Form 7) to our /api/contact endpoint.
    document.querySelectorAll("form.wpcf7-form, form.nxc-contact").forEach(function (form) {
      form.setAttribute("novalidate", "novalidate");
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        var get = function (sel) { var el = form.querySelector(sel); return el ? el.value.trim() : ""; };
        var payload = {
          name: get('[name="your-name"]') || get('[name*="name" i]'),
          email: get('[type="email"]') || get('[name*="email" i]'),
          company: get('[name*="company" i]') || get('[name*="organisation" i]') || get('[name*="organization" i]'),
          message: get("textarea"),
          website: get('[name="nxc_hp"]'), // honeypot
        };
        var nl = (typeof window.nxcLang === "function" && window.nxcLang() === "nl");
        var T = nl ? {
          invalid: "Vul uw naam, een geldig e-mailadres en een kort bericht in.",
          sending: "Versturen…",
          ok: "Bedankt — uw bericht is bij ons team aangekomen. We nemen spoedig contact op.",
          err: "Er ging iets mis — e-mail ons op info@nxcore.nl.",
          neterr: "Kon de server niet bereiken — e-mail ons op info@nxcore.nl."
        } : {
          invalid: "Please enter your name, a valid email, and a short message.",
          sending: "Sending…",
          ok: "Thanks — your message has reached our team. We'll be in touch shortly.",
          err: "Something went wrong — please email info@nxcore.nl.",
          neterr: "Couldn't reach the server — please email info@nxcore.nl."
        };
        var note = form.querySelector(".nxc-form-note");
        if (!note) { note = document.createElement("div"); note.className = "nxc-form-note"; note.style.cssText = "margin-top:12px;font-size:.95em;"; form.appendChild(note); }
        if (!payload.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email) || payload.message.length < 5) {
          note.style.color = "#ff9aa2"; note.textContent = T.invalid; return;
        }
        var btn = form.querySelector('[type="submit"], input.wpcf7-submit, button');
        if (btn) btn.disabled = true;
        note.style.color = ""; note.textContent = T.sending;
        fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
          .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
          .then(function (res) {
            if (res.ok) { note.style.color = "#8fe3c2"; note.textContent = T.ok; form.reset(); }
            else { note.style.color = "#ff9aa2"; note.textContent = (res.j && res.j.error) || T.err; }
          })
          .catch(function () { note.style.color = "#ff9aa2"; note.textContent = T.neterr; })
          .then(function () { if (btn) btn.disabled = false; });
      }, true);
    });
  });
})();
