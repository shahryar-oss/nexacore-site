/* Nexa website assistant — FAB toggle + welcome→chat + POST /wp-json/nexa/v1/chat */
(function () {
  if (typeof NEXA === "undefined") return;

  var fab, panel, welcome, chat, messages, newChatBtn;
  var inputW, sendW, inputC, sendC, suggestions;
  var history = [];   // [{role, content}]
  var busy = false;
  var deepPending = false;
  var deepStatusTimer = null;
  var justOpened = false;

  // Robust bootstrap: if the DOM is already parsed (e.g. the script was
  // deferred/combined by a host optimizer), DOMContentLoaded has fired —
  // run init immediately instead of waiting for an event that never comes.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  function init() {
    fab        = document.getElementById("nexaFab");
    panel      = document.getElementById("nexaPanel");
    welcome    = document.getElementById("nexaWelcome");
    chat       = document.getElementById("nexaChat");
    messages   = document.getElementById("nexaMessages");
    newChatBtn = document.getElementById("nexaNewChat");
    inputW     = document.getElementById("nexaInputWelcome");
    sendW      = document.getElementById("nexaSendWelcome");
    inputC     = document.getElementById("nexaInputChat");
    sendC      = document.getElementById("nexaSendChat");
    suggestions= document.getElementById("nexaSuggestions");
    if (!fab || !panel) return;

    fab.addEventListener("click", function () {
      panel.classList.contains("open") ? close() : open();
    });
    panel.querySelector(".nexa-close").addEventListener("click", close);
    newChatBtn.addEventListener("click", reset);

    sendW.addEventListener("click", function () { submit(inputW.value); });
    sendC.addEventListener("click", function () { submit(inputC.value); });
    [inputW, inputC].forEach(function (el) {
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(el.value); }
      });
      el.addEventListener("input", function () { autoGrow(el); });
    });
    suggestions.querySelectorAll(".nexa-chip").forEach(function (c) {
      c.addEventListener("click", function () { submit(c.getAttribute("data-prompt")); });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && panel.classList.contains("open")) close();
    });
    document.addEventListener("click", function (e) {
      if (justOpened) { justOpened = false; return; }   // ignore the click that just opened it (e.g. the homepage orb)
      if (!panel.classList.contains("open")) return;
      if (panel.contains(e.target) || fab.contains(e.target)) return;
      close();
    });

    // Public hook: let any element on the site (e.g. the homepage orb) open
    // Nexa straight into the "inspect my website" flow.
    window.nexaInspect = nexaInspect;
  }

  // Open the panel and have Nexa ask for the visitor's website link.
  function nexaInspect() {
    justOpened = true;                                  // stop the outside-click handler from closing it on this same click
    setTimeout(function () { justOpened = false; }, 0);
    open();
    toChatState();
    if (history.length === 0) {
      var line = "Happy to take a look. Drop your website link below and our team will do a deep read across your whole site — technical health, your messaging, and where AI and automation could help your business.";
      var b = addMsg("assistant", "");
      history.push({ role: "assistant", content: line });
      typeInto(b, line, function () { try { inputC.focus(); } catch (e) {} });
    } else {
      try { inputC.focus(); } catch (e) {}
    }
  }

  function open() {
    panel.classList.add("open");
    fab.classList.add("open");
    document.body.classList.add("nexa-panel-open");
    panel.setAttribute("aria-hidden", "false");
    setTimeout(function () { (chat.hidden ? inputW : inputC).focus(); }, 250);
  }
  function close() {
    panel.classList.remove("open");
    fab.classList.remove("open");
    document.body.classList.remove("nexa-panel-open");
    panel.setAttribute("aria-hidden", "true");
  }
  function reset() {
    history = [];
    messages.innerHTML = "";
    chat.hidden = true;
    welcome.hidden = false;
    newChatBtn.hidden = true;
    inputW.value = "";
    inputW.focus();
  }
  function autoGrowReset(el){ el.style.height = "auto"; }
  function autoGrow(el){ el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 160) + "px"; }

  function toChatState() {
    if (!chat.hidden) return;
    welcome.hidden = true;
    chat.hidden = false;
    newChatBtn.hidden = false;
  }

  function submit(text) {
    text = (text || "").trim();
    if (!text || busy) return;
    toChatState();
    inputW.value = ""; inputC.value = ""; autoGrowReset(inputC);
    addMsg("user", text);
    history.push({ role: "user", content: text });
    deepPending = hasUrl(text);
    sendToServer();
  }

  // Detect a website address so we can show a "going deep into your site" status.
  function hasUrl(t) {
    return /(https?:\/\/|www\.)\S+/i.test(t) ||
           /\b[a-z0-9][a-z0-9-]*\.(com|nl|org|net|io|ai|co|eu|de|uk|be|fr|app|dev|shop|store|info|biz|me|online|site)\b/i.test(t);
  }

  function addMsg(role, text) {
    var wrap = document.createElement("div");
    wrap.className = "nexa-msg-wrap " + role;
    var b = document.createElement("div");
    b.className = "nexa-msg " + role;
    b.setAttribute("dir", "auto");
    if (role === "assistant") b.innerHTML = renderMd(text);
    else b.textContent = text;
    wrap.appendChild(b);
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
    return b;
  }

  function addTyping() {
    var wrap = document.createElement("div");
    wrap.className = "nexa-msg-wrap assistant";
    wrap.id = "nexaTyping";
    wrap.innerHTML = '<div class="nexa-msg assistant"><span class="nexa-typing"><i></i><i></i><i></i></span></div>';
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
  }
  function removeTyping() { var t = document.getElementById("nexaTyping"); if (t) t.remove(); }

  // Deep-read acknowledgement: Nexa says it's taking a real look, with a live
  // cycling status — so the visitor sees something happening, not dead dots.
  function startDeepStatus() {
    var wrap = document.createElement("div");
    wrap.className = "nexa-msg-wrap assistant";
    wrap.id = "nexaPending";
    wrap.innerHTML = '<div class="nexa-msg assistant">' +
      '<div class="nexa-deeplead"></div>' +
      '<div style="margin-top:8px;font-size:.86em;opacity:.7;display:flex;align-items:center;gap:7px;">' +
        '<span class="nexa-typing"><i></i><i></i><i></i></span><span class="nexa-stat"></span></div>' +
      '</div>';
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
    typeInto(wrap.querySelector(".nexa-deeplead"),
      "Give me a moment — our team is taking a deep look across your site, reading your pages and running technical checks.", null);
    var stats = ["Opening your site…", "Reading your homepage…", "Crawling your key pages…",
      "Checking security headers…", "Reviewing SEO & accessibility…", "Putting it all together…"];
    var i = 0; var st = wrap.querySelector(".nexa-stat"); st.textContent = stats[0];
    deepStatusTimer = setInterval(function () { i = (i + 1) % stats.length; st.textContent = stats[i]; }, 2200);
  }
  function clearPending() {
    if (deepStatusTimer) { clearInterval(deepStatusTimer); deepStatusTimer = null; }
    var p = document.getElementById("nexaPending"); if (p) p.remove();
    removeTyping();
  }

  function sendToServer() {
    busy = true; sendW.disabled = sendC.disabled = true;
    if (deepPending) startDeepStatus(); else addTyping();
    fetch(NEXA.rest, {
      method: "POST",
      // The chat route is public (no auth). We deliberately DON'T send the WP
      // cookie or nonce: the homepage is CDN-cached, so a baked-in nonce can be
      // stale and would make WordPress 403 the request for logged-in users.
      // Omitting credentials keeps the call stateless and immune to that.
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: history[history.length - 1].content, history: history.slice(0, -1) })
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        clearPending();
        if (res.ok && res.j && res.j.reply) {
          var b = addMsg("assistant", "");
          history.push({ role: "assistant", content: res.j.reply });
          typeInto(b, res.j.reply, doneEnable);
        } else {
          var m = (res.j && res.j.error) || "Something went wrong. Please try again.";
          var be = addMsg("assistant", m); be.classList.add("error");
          doneEnable();
        }
      })
      .catch(function () {
        clearPending();
        var bc = addMsg("assistant", "I couldn't reach the server. Please try again."); bc.classList.add("error");
        doneEnable();
      });
  }
  function doneEnable() { busy = false; sendW.disabled = sendC.disabled = false; inputC.focus(); }

  /* Smooth, time-based typewriter reveal. Re-renders markdown of the growing
     slice each frame so bold/links/lists settle naturally as it types. */
  function typeInto(el, full, done) {
    full = String(full);
    var total = full.length;
    if (!total) { if (done) done(); return; }
    var duration = Math.max(700, Math.min(6500, total * 16)); // ~smooth, capped
    var startT = null, last = -1;
    var caret = '<span style="display:inline-block;width:2px;height:1em;margin-left:1px;background:currentColor;opacity:.45;vertical-align:text-bottom;"></span>';
    function frame(ts) {
      if (startT === null) startT = ts;
      var p = (ts - startT) / duration; if (p > 1) p = 1;
      var shown = Math.floor(p * total);
      if (shown !== last) {
        last = shown;
        el.innerHTML = renderMd(full.slice(0, shown)) + (p < 1 ? caret : "");
        messages.scrollTop = messages.scrollHeight;
      }
      if (p < 1) { requestAnimationFrame(frame); }
      else { el.innerHTML = renderMd(full); messages.scrollTop = messages.scrollHeight; if (done) done(); }
    }
    requestAnimationFrame(frame);
  }

  /* tiny safe markdown: escape, then bold/italic/code/links/lists/paragraphs */
  function renderMd(src) {
    var esc = String(src)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    esc = esc.replace(/`([^`]+)`/g, "<code>$1</code>");
    esc = esc.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    esc = esc.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    esc = esc.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>');
    // bare urls
    esc = esc.replace(/(^|[\s(])((https?:\/\/)[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
    var lines = esc.split(/\n/), out = [], list = null;
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i].trim();
      var m = ln.match(/^[-*]\s+(.*)/);
      var mo = ln.match(/^\d+\.\s+(.*)/);
      if (m) { if (list !== "ul") { closeList(); out.push("<ul>"); list = "ul"; } out.push("<li>" + m[1] + "</li>"); }
      else if (mo) { if (list !== "ol") { closeList(); out.push("<ol>"); list = "ol"; } out.push("<li>" + mo[1] + "</li>"); }
      else if (ln === "") { closeList(); }
      else { closeList(); out.push("<p>" + ln + "</p>"); }
    }
    closeList();
    function closeList() { if (list) { out.push(list === "ul" ? "</ul>" : "</ol>"); list = null; } }
    return out.join("");
  }
})();
