// ===========================================================================
//  Fa Schadde van Dooren - Container Dashboard (demo)
//  Map: Google Maps when an API key is set below; otherwise an OpenStreetMap
//  fallback so the demo always renders. Drop the key in to get Google Maps.
// ===========================================================================

// >>> PASTE GOOGLE MAPS API KEY HERE to switch the map to Google Maps <<<
const GOOGLE_MAPS_API_KEY = "";

// --- Helpers ---------------------------------------------------------------
const NL_MONTHS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
function fmtDate(iso) {
  return fmtDateObj(new Date(iso + "T00:00:00"));
}
// Format a Date using LOCAL components (avoids toISOString UTC off-by-one).
function fmtDateObj(d) {
  return `${d.getDate()} ${NL_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
// Local YYYY-MM-DD (not UTC) for storing dates.
function isoLocal(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function daysBetween(a, b) {
  return Math.max(0, Math.round((b - a) / 86400000));
}
function durationDays(c) {
  const start = new Date(c.checkIn + "T00:00:00");
  const end = c.checkOut ? new Date(c.checkOut + "T00:00:00") : REF_DATE;
  return daysBetween(start, end);
}
function durationLabel(c) {
  const d = durationDays(c);
  if (d < 7) return `${d} dgn`;
  const w = Math.floor(d / 7);
  return `${w} ${w === 1 ? "week" : "weken"}`;
}
// Duration buckets for the filter
function durationBucket(c) {
  const d = durationDays(c);
  if (d <= 7) return "0-1";
  if (d <= 30) return "1-4";
  if (d <= 90) return "4-12";
  return "12+";
}
// Agreed return date = check-in + agreed rental period.
function expectedReturn(c) {
  const d = new Date(c.checkIn + "T00:00:00");
  d.setDate(d.getDate() + (c.agreedDays || 0));
  return d;
}
// How many days an on-location container is past its agreed return date (0 otherwise).
function overdueDays(c) {
  if (c.status !== "geleverd" || !c.agreedDays) return 0;
  return daysBetween(expectedReturn(c), REF_DATE);
}
function isOverdue(c) {
  return c.status === "geleverd" && expectedReturn(c) < REF_DATE;
}

// --- Boekingsstatus (lifecycle) --------------------------------------------
const STATUS = {
  geboekt:   { label: "Geboekt",   group: "gepland",   pin: "#3a7bd5" },
  ingepland: { label: "Ingepland", group: "gepland",   pin: "#3a7bd5" },
  onderweg:  { label: "Onderweg",  group: "gepland",   pin: "#e0962f" },
  geleverd:  { label: "Geleverd",  group: "locatie",   pin: "#006935" },
  opgehaald: { label: "Opgehaald", group: "afgerond",  pin: "#94a3b8" },
  afgerond:  { label: "Afgerond",  group: "afgerond",  pin: "#94a3b8" },
};
const STATUS_ORDER = ["geboekt", "ingepland", "onderweg", "geleverd", "opgehaald", "afgerond"];
function statusLabel(c) { return (STATUS[c.status] || {}).label || c.status; }
function isOnLocation(c) { return c.status === "geleverd"; }
function isPlanned(c) { return (STATUS[c.status] || {}).group === "gepland"; }
function isClosed(c) { return (STATUS[c.status] || {}).group === "afgerond"; }

const fmtNum = (n) => n.toLocaleString("nl-NL");

// --- State -----------------------------------------------------------------
const state = {
  status: "actief",      // actief | afgerond | alle
  segment: "alle",       // alle | particulier | zakelijk
  type: "alle",
  place: "alle",
  duration: "alle",
  q: "",
  selectedId: null,
};

// --- Filtering -------------------------------------------------------------
function applyFilters() {
  const q = state.q.trim().toLowerCase();
  return CONTAINERS.filter((c) => {
    if (state.status === "actief" && !isOnLocation(c)) return false;
    if (state.status === "gepland" && !isPlanned(c)) return false;
    if (state.status === "afgerond" && !isClosed(c)) return false;
    if (state.status === "telaat" && !isOverdue(c)) return false;
    if (state.segment !== "alle" && c.segment !== state.segment) return false;
    if (state.type !== "alle" && c.type !== state.type) return false;
    if (state.place !== "alle" && c.place !== state.place) return false;
    if (state.duration !== "alle" && durationBucket(c) !== state.duration) return false;
    if (q) {
      const hay = `${c.customer} ${c.street} ${c.postcode} ${c.place} ${c.type} ${c.id}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

// --- KPIs ------------------------------------------------------------------
function renderKpis(rows) {
  const active = CONTAINERS.filter(isOnLocation);
  const places = new Set(active.map((c) => c.place));
  const avg = active.length
    ? Math.round(active.reduce((s, c) => s + durationDays(c), 0) / active.length)
    : 0;
  const zak = active.filter((c) => c.segment === "zakelijk").length;
  const par = active.length - zak;
  const overdue = active.filter(isOverdue).length;
  const planned = CONTAINERS.filter(isPlanned).length;

  document.getElementById("kpi-active").textContent = fmtNum(active.length);
  document.getElementById("kpi-planned").textContent = fmtNum(planned);
  document.getElementById("kpi-places").textContent = fmtNum(places.size);
  document.getElementById("kpi-avg").innerHTML = `${avg}<span class="unit">dgn</span>`;
  document.getElementById("kpi-split").textContent = `${par} / ${zak}`;
  document.getElementById("kpi-overdue").textContent = fmtNum(overdue);
  document.getElementById("kpi-overdue-card").classList.toggle("alert", overdue > 0);
}

// --- List ------------------------------------------------------------------
function renderList(rows) {
  const list = document.getElementById("list");
  document.getElementById("list-count").textContent =
    `${rows.length} ${rows.length === 1 ? "resultaat" : "resultaten"}`;

  if (!rows.length) {
    list.innerHTML = `<div class="empty">Geen containers gevonden voor deze filters.</div>`;
    return;
  }
  list.innerHTML = rows.map((c) => {
    const over = overdueDays(c);
    const segLabel = c.segment === "zakelijk" ? "Zakelijk" : "Particulier";
    // Date line depends on where the booking is in its lifecycle.
    let dateLine;
    if (isClosed(c)) {
      dateLine = `Geleverd ${fmtDate(c.checkIn)} &middot; opgehaald ${fmtDate(c.checkOut)}`;
    } else if (isPlanned(c)) {
      dateLine = `Levering ${fmtDate(c.checkIn)} &middot; ${c.agreedDays} dgn gepland`;
    } else {
      dateLine = `Geleverd ${fmtDate(c.checkIn)} &middot; verwacht retour ${fmtDateObj(expectedReturn(c))}`;
    }
    // Right-hand duration / period indicator.
    let durHtml;
    if (over > 0) {
      durHtml = `<span class="dur overdue">${over} ${over === 1 ? "dag" : "dagen"} te laat</span>`;
    } else if (isPlanned(c)) {
      durHtml = `<span class="dur planned">${c.agreedDays} dgn</span>`;
    } else {
      durHtml = `<span class="dur ${isClosed(c) ? "afgerond" : ""}">${durationLabel(c)}</span>`;
    }
    return `
      <div class="row ${over > 0 ? "overdue" : ""}" data-id="${c.id}">
        <div class="info">
          <div class="cust">${c.customer}</div>
          <div class="addr">${c.street}, ${c.postcode} ${c.place}</div>
          <div class="meta">${segLabel} &middot; ${dateLine} &middot; ${c.id}</div>
        </div>
        <div class="right">
          <span class="badge type">${c.type}</span>
          <select class="status-select st-${c.status}" data-id="${c.id}" title="Status wijzigen">
            ${STATUS_ORDER.map((k) => `<option value="${k}"${k === c.status ? " selected" : ""}>${STATUS[k].label}</option>`).join("")}
          </select>
          ${durHtml}
        </div>
      </div>`;
  }).join("");

  list.querySelectorAll(".row").forEach((el) => {
    el.addEventListener("click", () => selectContainer(el.dataset.id, true));
  });
  // Status dropdown per row - don't let it trigger the row's select/zoom.
  list.querySelectorAll(".status-select").forEach((sel) => {
    ["click", "mousedown"].forEach((ev) => sel.addEventListener(ev, (e) => e.stopPropagation()));
    sel.addEventListener("change", (e) => { e.stopPropagation(); setStatus(sel.dataset.id, sel.value); });
  });
  highlightRow();
}

function highlightRow() {
  document.querySelectorAll(".row").forEach((el) => {
    el.classList.toggle("active", el.dataset.id === state.selectedId);
  });
}

// --- Map adapter -----------------------------------------------------------
const MapAdapter = {
  backend: null, map: null, markers: {}, infowindow: null, gmapsBounds: null,

  popupHtml(c) {
    const over = overdueDays(c);
    const overLine = over > 0
      ? `<div class="pop-over">${over} ${over === 1 ? "dag" : "dagen"} te laat - nog niet opgehaald</div>`
      : "";
    const dateLine = isClosed(c)
      ? `Geleverd ${fmtDate(c.checkIn)} &middot; opgehaald ${fmtDate(c.checkOut)}`
      : isPlanned(c)
        ? `Levering ${fmtDate(c.checkIn)} &middot; ${c.agreedDays} dgn`
        : `Geleverd ${fmtDate(c.checkIn)} &middot; ${durationLabel(c)}`;
    return `<div class="gm-pop">
      <div class="pop-title">${c.customer}</div>
      <div class="pop-line">${c.street}, ${c.postcode} ${c.place}</div>
      <div class="pop-meta">${c.type} &middot; ${c.segment === "zakelijk" ? "Zakelijk" : "Particulier"}
        &middot; <b>${statusLabel(c)}</b><br>${dateLine}</div>
      ${overLine}
    </div>`;
  },

  // Pin colour by status; overdue (on location, past due) overrides to red.
  markerColor(c) {
    if (overdueDays(c) > 0) return "#e4572e";
    return (STATUS[c.status] || {}).pin || "#006830";
  },
  pinSvg(color) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">`
      + `<path d="M14 0C6.27 0 0 6.27 0 14c0 9.5 14 26 14 26s14-16.5 14-26C28 6.27 21.73 0 14 0z" fill="${color}"/>`
      + `<circle cx="14" cy="14" r="5" fill="#ffffff"/></svg>`;
  },

  initGoogle() {
    this.backend = "google";
    this.map = new google.maps.Map(document.getElementById("map"), {
      center: { lat: 52.19, lng: 4.46 }, zoom: 11, mapTypeControl: false, streetViewControl: false,
      styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }],
    });
    this.infowindow = new google.maps.InfoWindow();
  },

  initLeaflet() {
    this.backend = "leaflet";
    this.map = L.map("map", { zoomControl: true }).setView([52.19, 4.46], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: "&copy; OpenStreetMap",
    }).addTo(this.map);
  },

  render(rows) {
    // clear
    if (this.backend === "google") {
      Object.values(this.markers).forEach((m) => m.setMap(null));
    } else {
      Object.values(this.markers).forEach((m) => this.map.removeLayer(m));
    }
    this.markers = {};
    if (!rows.length) return;

    if (this.backend === "google") {
      const bounds = new google.maps.LatLngBounds();
      rows.forEach((c) => {
        const m = new google.maps.Marker({
          position: { lat: c.lat, lng: c.lng }, map: this.map, title: c.customer,
          icon: {
            url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(this.pinSvg(this.markerColor(c))),
            scaledSize: new google.maps.Size(28, 40), anchor: new google.maps.Point(14, 40),
          },
        });
        m.addListener("click", () => {
          this.infowindow.setContent(this.popupHtml(c));
          this.infowindow.open(this.map, m);
          selectContainer(c.id, false);
        });
        this.markers[c.id] = m;
        bounds.extend(m.getPosition());
      });
      if (rows.length > 1) this.map.fitBounds(bounds, 60);
      else this.map.setCenter({ lat: rows[0].lat, lng: rows[0].lng }), this.map.setZoom(13);
    } else {
      const latlngs = [];
      rows.forEach((c) => {
        const icon = L.divIcon({
          html: this.pinSvg(this.markerColor(c)), className: "pin-icon",
          iconSize: [28, 40], iconAnchor: [14, 40], popupAnchor: [0, -36],
        });
        const m = L.marker([c.lat, c.lng], { icon }).addTo(this.map);
        m.bindPopup(this.popupHtml(c));
        m.on("click", () => selectContainer(c.id, false));
        this.markers[c.id] = m;
        latlngs.push([c.lat, c.lng]);
      });
      if (rows.length > 1) this.map.fitBounds(latlngs, { padding: [50, 50] });
      else this.map.setView(latlngs[0], 13);
    }
  },

  focus(c) {
    const ZOOM = 16; // street-level zoom when a container is selected
    const m = this.markers[c.id];
    if (this.backend === "google") {
      this.map.panTo({ lat: c.lat, lng: c.lng });
      this.map.setZoom(ZOOM);
      if (m) { this.infowindow.setContent(this.popupHtml(c)); this.infowindow.open(this.map, m); }
    } else {
      this.map.setView([c.lat, c.lng], ZOOM);
      if (m) m.openPopup();
    }
  },
};

// --- Change a container's status -------------------------------------------
function setStatus(id, status) {
  const c = CONTAINERS.find((x) => x.id === id);
  if (!c || c.status === status || !STATUS[status]) return;
  c.status = status;
  // Picked up / completed gets a check-out date; reopening clears it.
  if (isClosed(c)) { if (!c.checkOut) c.checkOut = isoLocal(REF_DATE); }
  else { c.checkOut = null; }
  refresh();
}

// --- Selection sync --------------------------------------------------------
function selectContainer(id, fromList) {
  state.selectedId = id;
  highlightRow();
  const c = CONTAINERS.find((x) => x.id === id);
  if (!c) return;
  if (fromList) {
    MapAdapter.focus(c);
  } else {
    const el = document.querySelector(`.row[data-id="${id}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

// --- Render-all ------------------------------------------------------------
function refresh() {
  const rows = applyFilters();
  renderKpis(rows);
  renderList(rows);
  MapAdapter.render(rows);
}

// --- Filter UI population --------------------------------------------------
function populateFilters() {
  const types = [...new Set(CONTAINERS.map((c) => c.type))].sort();
  const places = [...new Set(CONTAINERS.map((c) => c.place))].sort();
  const typeSel = document.getElementById("f-type");
  const placeSel = document.getElementById("f-place");
  types.forEach((t) => typeSel.add(new Option(t, t)));
  places.forEach((p) => placeSel.add(new Option(p, p)));
}

function wireControls() {
  document.getElementById("search").addEventListener("input", (e) => { state.q = e.target.value; refresh(); });
  document.getElementById("f-type").addEventListener("change", (e) => { state.type = e.target.value; refresh(); });
  document.getElementById("f-place").addEventListener("change", (e) => { state.place = e.target.value; refresh(); });
  document.getElementById("f-status").addEventListener("change", (e) => { state.status = e.target.value; refresh(); });
  document.getElementById("f-duration").addEventListener("change", (e) => { state.duration = e.target.value; refresh(); });
  document.querySelectorAll(".seg-toggle button").forEach((b) => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".seg-toggle button").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      state.segment = b.dataset.seg;
      refresh();
    });
  });
  document.getElementById("reset").addEventListener("click", () => {
    state.status = "actief"; state.segment = "alle"; state.type = "alle";
    state.place = "alle"; state.duration = "alle"; state.q = ""; state.selectedId = null;
    document.getElementById("search").value = "";
    document.getElementById("f-type").value = "alle";
    document.getElementById("f-place").value = "alle";
    document.getElementById("f-status").value = "actief";
    document.getElementById("f-duration").value = "alle";
    document.querySelectorAll(".seg-toggle button").forEach((x) => x.classList.toggle("active", x.dataset.seg === "alle"));
    refresh();
  });
}

// --- New booking -----------------------------------------------------------
function nextBookingId() {
  const max = CONTAINERS.reduce((m, c) => {
    const n = parseInt((c.id.match(/(\d+)$/) || [])[1] || "0", 10);
    return Math.max(m, n);
  }, 0);
  return "VH-" + (max + 1);
}

function populateBookingForm() {
  const typeSel = document.getElementById("bk-type");
  const placeSel = document.getElementById("bk-place");
  const statusSel = document.getElementById("bk-status");
  CONTAINER_TYPES.forEach((t) => typeSel.add(new Option(t, t)));
  Object.keys(TOWN_COORDS).sort().forEach((p) => placeSel.add(new Option(p, p)));
  STATUS_ORDER.forEach((k) => statusSel.add(new Option(STATUS[k].label, k)));
  statusSel.value = "geboekt";
}

function toggleSegmentFields() {
  const zakelijk = document.querySelector('input[name="bk-seg"]:checked').value === "zakelijk";
  document.getElementById("bk-company-wrap").style.display = zakelijk ? "" : "none";
  document.getElementById("bk-name-wrap").style.display = zakelijk ? "none" : "";
}

function updateExpectedReturn() {
  const date = document.getElementById("bk-date").value;
  const days = parseInt(document.getElementById("bk-days").value, 10);
  const out = document.getElementById("bk-return");
  if (date && days > 0) {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + days);
    out.textContent = "Verwacht retour: " + fmtDateObj(d);
  } else {
    out.textContent = "";
  }
}

function openBooking() {
  document.getElementById("booking-form").reset();
  document.querySelector('input[name="bk-seg"][value="particulier"]').checked = true;
  document.getElementById("bk-status").value = "geboekt";
  document.getElementById("bk-error").textContent = "";
  document.getElementById("bk-return").textContent = "";
  toggleSegmentFields();
  document.getElementById("booking-modal").classList.add("open");
}
function closeBooking() {
  document.getElementById("booking-modal").classList.remove("open");
}

function submitBooking(e) {
  e.preventDefault();
  const g = (id) => document.getElementById(id).value.trim();
  const segment = document.querySelector('input[name="bk-seg"]:checked').value;
  const company = g("bk-company"), first = g("bk-first"), last = g("bk-last");
  const street = g("bk-street"), postcode = g("bk-postcode"), place = g("bk-place");
  const type = g("bk-type"), date = g("bk-date"), status = g("bk-status");
  const days = parseInt(g("bk-days"), 10);

  const customer = segment === "zakelijk" ? company : `${first} ${last}`.trim();
  const missing = [];
  if (segment === "zakelijk" && !company) missing.push("bedrijfsnaam");
  if (segment === "particulier" && (!first || !last)) missing.push("voor- en achternaam");
  if (!street) missing.push("straat en huisnummer");
  if (!place) missing.push("plaats");
  if (!type) missing.push("containertype");
  if (!date) missing.push("leverdatum");
  if (!(days > 0)) missing.push("afgesproken periode");
  if (missing.length) {
    document.getElementById("bk-error").textContent = "Vul de volgende velden in: " + missing.join(", ") + ".";
    return;
  }

  const base = TOWN_COORDS[place] || TOWN_COORDS["Katwijk"];
  const jitter = () => (Math.random() - 0.5) * 0.01;
  const closed = STATUS[status].group === "afgerond";
  const rec = {
    id: nextBookingId(), customer, segment, type,
    street, postcode, place,
    lat: base[0] + jitter(), lng: base[1] + jitter(),
    checkIn: date, agreedDays: days, status,
    checkOut: closed ? isoLocal(REF_DATE) : null,
    phone: g("bk-phone"), email: g("bk-email"), note: g("bk-note"),
  };
  CONTAINERS.unshift(rec);

  // Show the new booking: jump to the filter group it belongs to.
  const group = isPlanned(rec) ? "gepland" : isClosed(rec) ? "afgerond" : "actief";
  state.status = group; state.segment = "alle"; state.type = "alle";
  state.place = "alle"; state.duration = "alle"; state.q = "";
  document.getElementById("search").value = "";
  document.getElementById("f-type").value = "alle";
  document.getElementById("f-place").value = "alle";
  document.getElementById("f-status").value = group;
  document.getElementById("f-duration").value = "alle";
  document.querySelectorAll(".seg-toggle button").forEach((x) => x.classList.toggle("active", x.dataset.seg === "alle"));

  closeBooking();
  refresh();
  selectContainer(rec.id, true);
}

function wireBooking() {
  populateBookingForm();
  document.getElementById("new-booking").addEventListener("click", openBooking);
  document.getElementById("bk-cancel").addEventListener("click", closeBooking);
  document.getElementById("bk-close").addEventListener("click", closeBooking);
  document.getElementById("booking-form").addEventListener("submit", submitBooking);
  document.querySelectorAll('input[name="bk-seg"]').forEach((r) =>
    r.addEventListener("change", toggleSegmentFields));
  document.getElementById("bk-date").addEventListener("change", updateExpectedReturn);
  document.getElementById("bk-days").addEventListener("input", updateExpectedReturn);
  document.getElementById("booking-modal").addEventListener("click", (e) => {
    if (e.target.id === "booking-modal") closeBooking();
  });
}

// --- AI assistent ----------------------------------------------------------
const ASST = {
  endpoint: "/api/schadde",
  history: [],
  greeted: false,
  chips: [
    "Hoeveel containers zijn te laat?",
    "Welke moeten we ophalen?",
    "Waar staat VH-2045?",
    "Containers in Katwijk",
    "Hoeveel staan er op locatie?",
  ],
};

// Build a compact, Dutch-labelled snapshot of the LIVE dashboard for the assistant.
function asstContext() {
  const onLoc = CONTAINERS.filter(isOnLocation);
  return {
    today: isoLocal(REF_DATE),
    bedrijf: "Fa Schadde van Dooren",
    totalen: {
      op_locatie: onLoc.length,
      te_leveren: CONTAINERS.filter(isPlanned).length,
      te_laat: onLoc.filter(isOverdue).length,
      afgerond: CONTAINERS.filter(isClosed).length,
      locaties: new Set(onLoc.map((c) => c.place)).size,
    },
    containers: CONTAINERS.map((c) => ({
      nr: c.id,
      klant: c.customer,
      soort: c.segment,
      type: c.type,
      adres: `${c.street}, ${c.postcode} ${c.place}`,
      plaats: c.place,
      status: statusLabel(c),
      leverdatum: c.checkIn,
      afgesproken_dagen: c.agreedDays,
      verwacht_retour: isClosed(c) ? null : isoLocal(expectedReturn(c)),
      dagen_te_laat: overdueDays(c),
      opgehaald_op: c.checkOut || null,
    })),
  };
}

function asstAddMsg(text, who) {
  const wrap = document.getElementById("asst-msgs");
  const el = document.createElement("div");
  el.className = `asst-msg ${who}`;
  el.textContent = text;
  wrap.appendChild(el);
  wrap.scrollTop = wrap.scrollHeight;
  return el;
}

function asstRenderChips() {
  const box = document.getElementById("asst-chips");
  box.innerHTML = "";
  ASST.chips.forEach((q) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "asst-chip"; b.textContent = q;
    b.addEventListener("click", () => asstSend(q));
    box.appendChild(b);
  });
}

async function asstSend(question) {
  question = (question || "").trim();
  if (!question || ASST.busy) return;
  ASST.busy = true;
  document.getElementById("asst-chips").style.display = "none";
  document.getElementById("asst-send").disabled = true;
  document.getElementById("asst-text").value = "";
  asstAddMsg(question, "user");
  ASST.history.push({ role: "user", content: question });

  const typing = asstAddMsg("", "bot");
  typing.classList.add("typing");
  typing.innerHTML = 'Even kijken<span class="asst-typing-dot">.</span><span class="asst-typing-dot">.</span><span class="asst-typing-dot">.</span>';

  let reply;
  try {
    const r = await fetch(ASST.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question, context: asstContext(), history: ASST.history.slice(0, -1).slice(-6) }),
    });
    const data = await r.json().catch(() => ({}));
    reply = r.ok ? (data.reply || "Sorry, ik kon geen antwoord vinden.") : (data.error || "De assistent is even niet bereikbaar.");
  } catch (e) {
    reply = "De assistent is nu niet bereikbaar. Probeer het later opnieuw.";
  }
  typing.remove();
  asstAddMsg(reply, "bot");
  ASST.history.push({ role: "assistant", content: reply });
  ASST.busy = false;
  document.getElementById("asst-send").disabled = false;
  document.getElementById("asst-text").focus();
}

function asstOpen() {
  document.getElementById("asst-panel").classList.add("open");
  document.getElementById("asst-launch").classList.add("hidden");
  document.getElementById("asst-panel").setAttribute("aria-hidden", "false");
  if (!ASST.greeted) {
    ASST.greeted = true;
    asstAddMsg("Hallo! Ik ben de assistent van Fa Schadde van Dooren. Vraag me bijvoorbeeld waar een container staat, hoeveel er te laat zijn, welke we moeten ophalen, of zoek op klant of plaats.", "bot");
    asstRenderChips();
  }
  document.getElementById("asst-text").focus();
}
function asstClose() {
  document.getElementById("asst-panel").classList.remove("open");
  document.getElementById("asst-launch").classList.remove("hidden");
  document.getElementById("asst-panel").setAttribute("aria-hidden", "true");
}

function wireAssistant() {
  document.getElementById("asst-launch").addEventListener("click", asstOpen);
  document.getElementById("asst-close").addEventListener("click", asstClose);
  document.getElementById("asst-form").addEventListener("submit", (e) => {
    e.preventDefault();
    asstSend(document.getElementById("asst-text").value);
  });
}

// --- Voorstel + digitaal ondertekenen --------------------------------------
const PROP = { drawn: false, ctx: null, lastPdf: null, lastFile: null };

function propVal(id) { return document.getElementById(id).value.trim(); }

function initSignPad() {
  const c = document.getElementById("sign-pad");
  if (!c) return;
  const ratio = window.devicePixelRatio || 1;
  const rect = c.getBoundingClientRect();
  if (!rect.width) { requestAnimationFrame(initSignPad); return; }
  c.width = Math.round(rect.width * ratio);
  c.height = Math.round(rect.height * ratio);
  const ctx = c.getContext("2d");
  ctx.scale(ratio, ratio);
  ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#16331f";
  PROP.ctx = ctx; PROP.drawn = false;
  let drawing = false, lx = 0, ly = 0;
  const pos = (e) => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  c.onpointerdown = (e) => { drawing = true; [lx, ly] = pos(e); c.setPointerCapture(e.pointerId); e.preventDefault(); };
  c.onpointermove = (e) => { if (!drawing) return; const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(x, y); ctx.stroke(); [lx, ly] = [x, y]; PROP.drawn = true; };
  c.onpointerup = c.onpointerleave = () => { drawing = false; };
}
function clearSignPad() {
  const c = document.getElementById("sign-pad");
  if (PROP.ctx) PROP.ctx.clearRect(0, 0, c.width, c.height);
  PROP.drawn = false;
}

function downloadPdf(base64, filename) {
  try {
    const bin = atob(base64), arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([arr], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url; a.download = filename || "voorstel.pdf";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (e) {}
}

function propOpen() {
  document.getElementById("proposal-modal").classList.add("open");
  document.querySelector(".prop-content").classList.remove("hidden");
  document.getElementById("prop-sign").classList.remove("hidden");
  document.getElementById("prop-done").classList.remove("show");
  document.getElementById("sign-error").textContent = "";
  requestAnimationFrame(initSignPad);
}
function propClose() { document.getElementById("proposal-modal").classList.remove("open"); }

async function propSubmit() {
  const name = propVal("sign-name"), email = propVal("sign-email");
  const company = propVal("sign-company") || "Fa Schadde van Dooren", typed = propVal("sign-typed");
  const agree = document.getElementById("sign-agree").checked;
  const err = document.getElementById("sign-error");
  if (!name) return (err.textContent = "Vul uw naam in.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return (err.textContent = "Vul een geldig e-mailadres in.");
  if (!PROP.drawn && !typed) return (err.textContent = "Zet uw handtekening of typ uw naam.");
  if (!agree) return (err.textContent = "Vink aan dat u akkoord gaat met het voorstel.");
  err.textContent = "";

  const sig = PROP.drawn ? document.getElementById("sign-pad").toDataURL("image/png") : "";
  const btn = document.getElementById("sign-submit");
  btn.disabled = true; const label = btn.textContent; btn.textContent = "Bezig met versturen...";
  let data = {};
  try {
    const r = await fetch("/api/schadde-sign", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, company, signature: sig, typedName: typed }),
    });
    data = await r.json().catch(() => ({}));
    if (!r.ok) { err.textContent = data.error || "Er ging iets mis. Probeer het opnieuw."; btn.disabled = false; btn.textContent = label; return; }
  } catch (e) {
    err.textContent = "De service is nu niet bereikbaar. Probeer het later opnieuw."; btn.disabled = false; btn.textContent = label; return;
  }
  btn.disabled = false; btn.textContent = label;

  PROP.lastPdf = data.pdf; PROP.lastFile = data.filename;
  if (data.pdf) downloadPdf(data.pdf, data.filename);
  document.querySelector(".prop-content").classList.add("hidden");
  document.getElementById("prop-sign").classList.add("hidden");
  document.getElementById("prop-done").classList.add("show");
  document.getElementById("prop-done-title").textContent = `Bedankt, ${name}!`;
  document.getElementById("prop-done-text").textContent = data.emailed
    ? `Uw ondertekende voorstel is gedownload en een kopie is naar ${email} gestuurd. Wij nemen spoedig contact met u op voor de korte intake.`
    : `Uw ondertekende voorstel is gedownload. Wij nemen spoedig contact met u op voor de korte intake.`;
}

function wireProposal() {
  document.getElementById("open-proposal").addEventListener("click", propOpen);
  document.getElementById("prop-close").addEventListener("click", propClose);
  document.getElementById("prop-done-close").addEventListener("click", propClose);
  document.getElementById("sign-clear").addEventListener("click", clearSignPad);
  document.getElementById("sign-submit").addEventListener("click", propSubmit);
  document.getElementById("prop-download").addEventListener("click", () => { if (PROP.lastPdf) downloadPdf(PROP.lastPdf, PROP.lastFile); });
  document.getElementById("proposal-modal").addEventListener("click", (e) => { if (e.target.id === "proposal-modal") propClose(); });
}

// --- Boot ------------------------------------------------------------------
function boot() {
  document.getElementById("today").textContent = fmtDateObj(REF_DATE);
  populateFilters();
  wireControls();
  wireBooking();
  wireAssistant();
  wireProposal();
  refresh();
  // Keep the map correctly sized/zoomed when the browser window changes.
  let rt;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (MapAdapter.map && MapAdapter.map.invalidateSize) MapAdapter.map.invalidateSize();
      refresh();
    }, 200);
  });
}

function loadMapThenBoot() {
  if (GOOGLE_MAPS_API_KEY) {
    const note = document.getElementById("map-note-text");
    if (note) note.textContent = "Live kaartweergave - elke pin is een verhuurde container";
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=__gmapsReady`;
    s.async = true;
    window.__gmapsReady = () => { MapAdapter.initGoogle(); boot(); };
    s.onerror = () => { MapAdapter.initLeaflet(); boot(); };
    document.head.appendChild(s);
  } else {
    // No Google key yet: use OpenStreetMap so the demo renders.
    MapAdapter.initLeaflet();
    boot();
  }
}

document.addEventListener("DOMContentLoaded", loadMapThenBoot);
