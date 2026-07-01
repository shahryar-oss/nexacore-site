/* ===========================================================================
 * NexaCore site server — serves the static site AND provides the two dynamic
 * pieces the site needs, so it no longer depends on WordPress:
 *   POST /api/nexa     — Nexa chat brain (Anthropic proxy + website-audit tool)
 *   POST /api/contact  — contact form (validate, store, email the team)
 * Ported from the WordPress nexa-assistant.php. One deployable Node service.
 *
 * Env vars:
 *   ANTHROPIC_API_KEY  (required for Nexa)   NEXA_MODEL (default claude-haiku-4-5)
 *   CONTACT_TO         (default info@nxcore.nl)
 *   RESEND_API_KEY     (optional — if set, emails are sent via Resend;
 *                       otherwise submissions are stored to ./data and logged)
 *   PORT               (default 8080)        SITE_DIR (default ./nxcore.nl)
 * ======================================================================== */
"use strict";
const express = require("express");
const path = require("path");
const fs = require("fs");
const os = require("os");
const zlib = require("zlib");
const dns = require("dns").promises;
const net = require("net");
const { emailHTML, buildPDF } = require("./lib/notify");

function slug(s) { return String(s || "nexacore").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "nexacore"; }
function todayStamp() { return new Date().toISOString().slice(0, 10); }

const PORT = process.env.PORT || 8080;
const SITE_DIR = process.env.SITE_DIR || path.join(__dirname, "nxcore.nl");
const MODEL = process.env.NEXA_MODEL || "claude-haiku-4-5";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";
const CONTACT_TO = process.env.CONTACT_TO || "info@nxcore.nl";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "NexaCore <noreply@nexamails.ai>";
const DATA_DIR = path.join(__dirname, "data");

const NEXA_MAX_CHARS = 4000, NEXA_MAX_TURNS = 16, RL_MAX = 30, RL_WIN = 5 * 60 * 1000;

const app = express();
app.use(express.json({ limit: "256kb" }));

/* Legacy WordPress page-id URLs (mirror artifacts) -> canonical clean URLs. */
const PAGE_REDIRECTS = {
  "/index.html@p=1487.html": "/contact/",
  "/index.html@p=2635.html": "/terms/",
  "/index.html@p=2637.html": "/privacy/",
  "/index.html@p=2685.html": "/web-development/",
  "/index.html@p=2686.html": "/it-support/",
  "/index.html@p=2687.html": "/ai-automation/",
  "/index.html@p=2688.html": "/brand-design/",
  "/index.html@p=2690.html": "/nexamails/",
  "/index.html@p=2695.html": "/klachtenprocedure/",
};
app.use((req, res, next) => { const to = PAGE_REDIRECTS[req.path]; if (to) return res.redirect(301, to); next(); });

/* ---------------------------------------------------------------- prompt -- */
const SYSTEM_PROMPT = process.env.NEXA_SYSTEM_PROMPT || "You are Nexa, the assistant on the NexaCore website (nxcore.nl), a Rotterdam digital studio. Help visitors learn what NexaCore does and get in touch. Be warm and concise, plain text, no emoji, speak as the NexaCore team (we/our). For anything beyond NexaCore, point them to info@nxcore.nl.";

/* -------------------------------------------------------- SSRF-safe fetch -- */
function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const p = ip.split(".").map(Number);
    return p[0] === 10 || p[0] === 127 || p[0] === 0 ||
      (p[0] === 169 && p[1] === 254) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
      (p[0] === 192 && p[1] === 168) || (p[0] === 100 && p[1] >= 64 && p[1] <= 127);
  }
  const l = ip.toLowerCase();
  return l === "::1" || l.startsWith("fc") || l.startsWith("fd") || l.startsWith("fe80") || l === "::";
}
async function siteGuard(raw) {
  let url = String(raw || "").trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  let u; try { u = new URL(url); } catch { return null; }
  if (!/^https?:$/i.test(u.protocol)) return null;
  const host = u.hostname;
  if (!host || /^(localhost)$/i.test(host) || /\.(local|internal|test|localhost)$/i.test(host)) return null;
  try { const { address } = await dns.lookup(host); if (isPrivateIp(address)) return null; } catch { return null; }
  return { url: u.toString(), host };
}
async function httpGet(url, timeoutMs = 6000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      redirect: "follow", signal: ctrl.signal,
      headers: { "User-Agent": "NexaCore-SiteReader/1.0 (+https://nxcore.nl)", Accept: "text/html,application/xhtml+xml" },
    });
    const headers = {}; r.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
    const body = (await r.text()).slice(0, 800000);
    return { code: r.status, body, headers };
  } catch { return { code: 0, body: "", headers: {} }; }
  finally { clearTimeout(t); }
}
function absUrl(href, base) {
  try { return new URL(href, base).toString(); } catch { return ""; }
}
function stripTags(html) {
  return html.replace(/<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ");
}
function decodeEntities(s) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, " ");
}
function pageExtract(body, cap = 1100) {
  let title = "";
  const m = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (m) title = decodeEntities(stripTags(m[1])).trim();
  let text = decodeEntities(stripTags(body)).replace(/\s+/g, " ").trim();
  return { title, text: text.slice(0, cap) };
}
const DEMO_MARKERS = {
  "lorem ipsum": "Lorem ipsum placeholder text", "dolor sit amet": "Lorem ipsum placeholder text",
  "consectetur adipiscing": "Lorem ipsum placeholder text", "lipsum": "Lorem ipsum placeholder text",
  "just another wordpress site": 'Default WordPress tagline still in place ("Just another WordPress site")',
  "hello world!": 'Default "Hello world!" starter post still published',
  "proudly powered by wordpress": 'Default "Proudly powered by WordPress" footer',
  "your tagline here": 'Template placeholder tagline ("Your tagline here")',
  "add your text here": "Template placeholder text", "add your content here": "Template placeholder text",
  "this is a sample": "Sample/template placeholder text", "youremail@": "Placeholder email still in place",
  "@example.com": "Placeholder email address (example.com)", "123-456-7890": "Placeholder phone number",
};
function scanDemo(html) {
  const h = html.toLowerCase(), found = new Set();
  for (const [needle, label] of Object.entries(DEMO_MARKERS)) if (h.includes(needle)) found.add(label);
  return [...found];
}
async function headStatus(url, timeoutMs = 4000) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try { const r = await fetch(url, { method: "HEAD", redirect: "manual", signal: ctrl.signal }); return { code: r.status, location: r.headers.get("location") || "" }; }
  catch { return { code: 0, location: "" }; } finally { clearTimeout(t); }
}
async function techScan(headers, html, base) {
  const f = [], low = html.toLowerCase();
  const xp = headers["x-powered-by"] || "";
  let m = xp.match(/php\/(\d+\.\d+)/i);
  if (m) { const ver = m[1]; const eol = cmpVer(ver, "8.1") < 0 ? ` PHP ${ver} is past end-of-life and no longer gets security updates — a real security and compatibility risk.` : ""; f.push(`The server runs PHP ${ver} and exposes it publicly in its headers.${eol}`); }
  const missing = [];
  if (!headers["strict-transport-security"]) missing.push("HSTS");
  if (!headers["content-security-policy"]) missing.push("Content-Security-Policy");
  if (!headers["x-frame-options"] && !(headers["content-security-policy"] || "").toLowerCase().includes("frame-ancestors")) missing.push("X-Frame-Options (clickjacking protection)");
  if (!headers["x-content-type-options"]) missing.push("X-Content-Type-Options");
  if (missing.length) f.push("Missing common security headers: " + missing.join(", ") + ".");
  if (!/<meta[^>]+name=["']description["']/i.test(html)) f.push("The homepage has no meta description, which weakens search-result click-through.");
  if (!low.includes("og:title") && !low.includes("og:image")) f.push("No Open Graph tags, so shared links (WhatsApp, LinkedIn, etc.) show no proper title/image preview.");
  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) f.push("No mobile viewport tag — the site may not display correctly on phones.");
  if (!/<h1[\s>]/i.test(html)) f.push("The homepage has no H1 heading, which weakens SEO and accessibility.");
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  const noalt = imgs.filter((tag) => !/\balt\s*=/i.test(tag)).length;
  if (noalt > 0) f.push(`${noalt} image(s) on the homepage have no alt text (accessibility + SEO).`);
  const mixed = (html.match(/(?:src|href)=["']http:\/\/[^"']+/gi) || []).length;
  if (mixed > 0) f.push(`${mixed} resource(s) load over insecure http:// (mixed content) — browsers may warn or block these.`);
  if (low.includes("jquery-migrate")) f.push("Loads jQuery Migrate, a legacy compatibility shim that usually signals an outdated theme or plugins.");
  const httpUrl = base.replace(/^https:\/\//i, "http://");
  const hr = await headStatus(httpUrl);
  if (!(hr.code >= 300 && hr.code < 400 && /^https:\/\//i.test(hr.location))) f.push("The plain http:// version does not force a redirect to https — visitors can land on an insecure page.");
  const root = base.replace(/\/+$/, "");
  const sm = await headStatus(root + "/sitemap_index.xml");
  if (sm.code === 0 || sm.code >= 400) { const sm2 = await headStatus(root + "/sitemap.xml"); if (sm2.code === 0 || sm2.code >= 400) f.push("No XML sitemap found at the usual locations, which slows how search engines discover pages."); }
  return f;
}
function cmpVer(a, b) { const pa = a.split("."), pb = b.split("."); for (let i = 0; i < 2; i++) { const d = (+pa[i] || 0) - (+pb[i] || 0); if (d) return d; } return 0; }

async function fetchSite(input) {
  const g = await siteGuard(input && input.url);
  if (!g) return { ok: false, message: "That does not look like a public website address we can reach. Ask the visitor for their full URL (e.g. https://theirsite.com)." };
  const start = Date.now(), budget = 12000, max = 6, base = g.url;
  const home = await httpGet(base);
  if (home.code >= 400 || !home.body) return { ok: false, message: `We could not load that page (status ${home.code}). Ask the visitor to double-check the address.` };
  const technical = await techScan(home.headers, home.body, base);
  const seen = new Set([base.replace(/\/+$/, "").toLowerCase()]);
  const priority = [], other = [];
  const linkRe = /<a\s[^>]*href=["']([^"']+)["']/gi; let lm;
  while ((lm = linkRe.exec(home.body))) {
    let href = decodeEntities(lm[1]).trim();
    if (!href || href[0] === "#" || /^(mailto:|tel:|javascript:)/i.test(href)) continue;
    const abs = absUrl(href, base); if (!abs) continue;
    let pp; try { pp = new URL(abs); } catch { continue; }
    if (pp.hostname.toLowerCase() !== g.host.toLowerCase()) continue;
    const p = (pp.pathname || "/").toLowerCase();
    if (/\.(jpe?g|png|gif|svg|webp|ico|pdf|zip|rar|css|js|mp4|mp3|woff2?|ttf|eot|xml|json)$/i.test(p)) continue;
    const key = abs.replace(/\/+$/, "").toLowerCase(); if (seen.has(key)) continue; seen.add(key);
    (/(about|service|product|solution|donate|give|gift|pray|contact|team|work|project|portfolio|case|pricing|plan|shop|faq|story|stories|mission|program|quote)/i.test(p) ? priority : other).push(abs);
  }
  const queue = [base, ...priority, ...other];
  const pages = []; let demo = []; let crawled = 0;
  for (const u of queue) {
    if (crawled >= max || Date.now() - start > budget) break;
    const r = u === base ? home : await httpGet(u);
    if (r.code >= 400 || !r.body) continue;
    const { title, text } = pageExtract(r.body, u === base ? 2000 : 1000);
    pages.push({ url: u, title, text });
    demo = demo.concat(scanDemo(r.body)); crawled++;
  }
  demo = [...new Set(demo)];
  return {
    ok: true, start_url: base, pages_crawled: crawled, pages,
    demo_or_template_leftovers: demo, technical_findings: technical,
    instruction: `We crawled the ${crawled} page(s) in "pages" and ran technical checks. "technical_findings" were MEASURED — they are FACTUAL, so state them confidently. LEAD with 1-2 concrete technical findings, then 1-2 content/journey observations grounded ONLY in the page text, THEN 2-3 tailored AI/automation possibilities for THIS business. Do NOT invent amounts, statistics, testimonies, names or features, and never use placeholders like "X days". If "demo_or_template_leftovers" is non-empty, call it out plainly. Reveal the WHAT and WHY, never the HOW. Open by noting this is a quick technical + content read across their site, then move toward a brief or a call.`,
  };
}

/* ----------------------------------------------------------- leads/email -- */
function storeLead(rec) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.appendFileSync(path.join(DATA_DIR, "leads.jsonl"), JSON.stringify(rec) + "\n"); } catch (e) { console.error("[lead store]", e.message); }
}
async function sendEmail({ to, subject, text, html, replyTo, attachments }) {
  const recipients = Array.isArray(to) ? to.filter(Boolean) : (to ? [to] : [CONTACT_TO]);
  if (!RESEND_API_KEY) { console.log(`[email NOT sent — no RESEND_API_KEY]\nTo: ${recipients.join(", ")}\nSubject: ${subject}\n${text}`); return false; }
  try {
    const body = { from: EMAIL_FROM, to: recipients, reply_to: replyTo || undefined, subject, text };
    if (html) body.html = html;
    if (attachments && attachments.length) body.attachments = attachments;
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) { console.error("[resend]", r.status, await r.text()); return false; }
    return true;
  } catch (e) { console.error("[resend]", e.message); return false; }
}
function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || "")); }

async function submitBrief(input) {
  const name = String(input.customer_name || "").trim();
  const email = String(input.customer_email || "").trim();
  const phone = String(input.phone || "").trim();
  const org = String(input.organization || "").trim() || "Individual";
  const brief = String(input.brief_markdown || "").trim();
  const missing = [];
  if (!name || /^not provided$/i.test(name)) missing.push("full name");
  if (!validEmail(email)) missing.push("a valid email address");
  if (phone.replace(/[^0-9]/g, "").length < 6) missing.push("a phone number we can reach them on");
  if (missing.length) return { ok: false, message: "Cannot submit yet — still need: " + missing.join(", ") + ". Politely ask the visitor for these before submitting." };
  if (brief.length < 80) return { ok: false, message: "The brief is too short/empty — gather more detail before submitting." };
  const rec = { type: "project_brief", at: new Date().toISOString(), name, org, email, phone, country: input.country || "", preferred_contact: input.preferred_contact || "", language: input.language || "", brief };
  storeLead(rec);
  const fields = [["Name", name], ["Organization", org], ["Email", email], ["Phone", phone], ["Country", input.country], ["Preferred contact", input.preferred_contact], ["Language", input.language]];
  const text = `A new project discovery brief was completed via Nexa on nxcore.nl.\n\nName: ${name}\nOrganization: ${org}\nEmail: ${email}\nPhone: ${phone}\nCountry: ${input.country || "-"}\nPrefers: ${input.preferred_contact || "-"}\nLanguage: ${input.language || "-"}\n\n----\n\n${brief}\n`;
  let attachments = [];
  try {
    const pdf = await buildPDF({ eyebrow: "Project Brief", title: org === "Individual" ? name : org, fields, bodyMd: brief });
    attachments = [{ filename: `NexaCore-Brief-${slug(org === "Individual" ? name : org)}-${todayStamp()}.pdf`, content: pdf.toString("base64"), content_type: "application/pdf" }];
  } catch (e) { console.error("[pdf brief]", e.message); }
  const html = emailHTML({ eyebrow: "New project brief", title: org === "Individual" ? name : org, fields, bodyMd: brief, pdfAttached: attachments.length > 0 });
  const emailed = await sendEmail({ subject: `New project lead — ${org} (${name})`, text, html, replyTo: `${name} <${email}>`, attachments });
  return { ok: true, message: emailed ? "Brief delivered to the NexaCore team." : "Brief saved for the NexaCore team." };
}

/* -------------------------------------------------------------- tools def -- */
const TOOLS = [
  { name: "analyze_company_site", description: "Deep technical + content read of a visitor's PUBLIC website. Crawls SEVERAL pages AND runs measured technical checks (server/PHP version, security headers, SEO tags, mobile viewport, H1, image alt text, mixed content, https redirect, sitemap), plus flags leftover demo/template content. Returns pages[], technical_findings[] and demo_or_template_leftovers[].",
    input_schema: { type: "object", properties: { url: { type: "string", description: "The visitor's website URL (e.g. example.com or https://example.com)." } }, required: ["url"] } },
  { name: "submit_project_brief", description: "Email the confirmed project discovery brief to the NexaCore team. Call ONLY after the visitor has confirmed the compiled brief is correct and you have a real contact email.",
    input_schema: { type: "object", properties: {
      customer_name: { type: "string" }, customer_email: { type: "string" }, phone: { type: "string" },
      organization: { type: "string" }, country: { type: "string" }, preferred_contact: { type: "string" },
      language: { type: "string" }, brief_markdown: { type: "string" },
    }, required: ["customer_name", "customer_email", "phone", "brief_markdown"] } },
];

/* ----------------------------------------------------- rate limit (memory) */
const rl = new Map();
function rateLimited(ip) {
  const now = Date.now(); const e = rl.get(ip);
  if (!e || now > e.reset) { rl.set(ip, { n: 1, reset: now + RL_WIN }); return false; }
  e.n++; return e.n > RL_MAX;
}

/* --------------------------------------------------------------- /api/nexa */
app.post("/api/nexa", async (req, res) => {
  if (!ANTHROPIC_KEY) return res.status(503).json({ error: "Nexa is not available right now." });
  const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "0").split(",")[0].trim();
  if (rateLimited(ip)) return res.status(429).json({ error: "You've sent a lot of messages — please try again in a few minutes." });

  let message = String(req.body.message || "").trim();
  if (!message) return res.status(400).json({ error: "Empty message." });
  if (message.length > NEXA_MAX_CHARS) message = message.slice(0, NEXA_MAX_CHARS);

  const lang = (String(req.query.lang || req.body.lang || "en").toLowerCase() === "nl") ? "nl" : "en";
  const langDirective = lang === "nl"
    ? "\n\nLANGUAGE: The visitor is on the Dutch (Nederlands) version of the site. Begin and conduct the conversation in Dutch by default. HOWEVER, always mirror the visitor: if they write to you in English (or any other language), switch to and continue entirely in that language. Match whatever language the visitor is actually using."
    : "\n\nLANGUAGE: The visitor is on the English version of the site. Conduct the conversation in English by default. HOWEVER, always mirror the visitor: if they write to you in Dutch (or any other language), switch to and continue entirely in that language. Match whatever language the visitor is actually using.";

  const convo = [];
  if (Array.isArray(req.body.history)) {
    for (const h of req.body.history.slice(-2 * NEXA_MAX_TURNS)) {
      const role = h && h.role === "assistant" ? "assistant" : "user";
      const txt = String((h && h.content) || "").trim().slice(0, NEXA_MAX_CHARS);
      if (txt) convo.push({ role, content: txt });
    }
  }
  convo.push({ role: "user", content: message });

  let reply = "", submitted = false;
  try {
    for (let hop = 0; hop < 4; hop++) {
      const payload = {
        model: MODEL, max_tokens: 2048,
        system: [
          { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
          { type: "text", text: langDirective },
        ],
        tools: TOOLS, messages: convo,
      };
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) { console.error("[nexa] API", r.status, (await r.text()).slice(0, 400)); return res.status(502).json({ error: "Nexa is unavailable for a moment. Please try again." }); }
      const data = await r.json();
      const content = Array.isArray(data.content) ? data.content : [];
      reply = "";
      const toolUses = [];
      for (const b of content) { if (b.type === "text") reply += b.text; else if (b.type === "tool_use") toolUses.push(b); }
      if (data.stop_reason !== "tool_use" || !toolUses.length) break;
      convo.push({ role: "assistant", content });
      const results = [];
      for (const tu of toolUses) {
        let out = { ok: false, message: "Unknown tool." };
        if (tu.name === "submit_project_brief") { out = await submitBrief(tu.input || {}); if (out.ok) submitted = true; }
        else if (tu.name === "analyze_company_site") { out = await fetchSite(tu.input || {}); }
        results.push({ type: "tool_result", tool_use_id: tu.id || "", content: JSON.stringify(out) });
      }
      convo.push({ role: "user", content: results });
    }
  } catch (e) { console.error("[nexa]", e.message); return res.status(502).json({ error: "Nexa had trouble responding. Please try again." }); }

  reply = reply.trim() || (submitted ? "Thank you — we've sent your brief to our team. They'll review it and follow up with you by email." : "Sorry, we didn't catch that — could you rephrase?");
  res.json({ reply, submitted });
});

/* ------------------------------------------------------------ /api/contact */
app.post("/api/contact", async (req, res) => {
  const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "0").split(",")[0].trim();
  if (rateLimited(ip)) return res.status(429).json({ error: "Too many submissions — please try again shortly." });
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim();
  const company = String(req.body.company || "").trim();
  const msg = String(req.body.message || "").trim();
  if (req.body.website) return res.json({ ok: true });               // honeypot
  if (!name || !validEmail(email) || msg.length < 5) return res.status(400).json({ error: "Please enter your name, a valid email, and a short message." });
  const rec = { type: "contact", at: new Date().toISOString(), name, email, company, message: msg.slice(0, 5000), ip };
  storeLead(rec);
  const fields = [["Name", name], ["Email", email], ["Company", company]];
  const text = `New contact-form message from nxcore.nl\n\nName: ${name}\nEmail: ${email}\nCompany: ${company || "-"}\n\n${msg}\n`;
  let attachments = [];
  try {
    const pdf = await buildPDF({ eyebrow: "Contact Message", title: name, fields, message: msg });
    attachments = [{ filename: `NexaCore-Contact-${slug(name)}-${todayStamp()}.pdf`, content: pdf.toString("base64"), content_type: "application/pdf" }];
  } catch (e) { console.error("[pdf contact]", e.message); }
  const html = emailHTML({ eyebrow: "New contact message", title: name, fields, message: msg, pdfAttached: attachments.length > 0 });
  const emailed = await sendEmail({ subject: `New contact message — ${name}`, text, html, replyTo: `${name} <${email}>`, attachments });
  res.json({ ok: true, emailed });
});

/* ----------------------------------------------- /api/schadde (demo dashboard)
   Grounded assistant for the Fa Schadde van Dooren container dashboard demo.
   The browser sends the LIVE dashboard data as `context`; we answer only from it. */
const SCHADDE_SYSTEM = `Je bent de assistent in het Container Dashboard van Fa Schadde van Dooren, een container- en afvalbedrijf in Katwijk en omstreken (Zuid-Holland). Je helpt de medewerkers (Dick, Lourens, Carlijne) met vragen over de verhuurde containers.

Bij elke vraag krijg je de ACTUELE dashboardgegevens mee onder DATA: een samenvatting met totalen plus alle containers met containernummer (VH-xxxx), klant, soort (particulier/zakelijk), containertype, adres, plaats, status, leverdatum, afgesproken aantal dagen, verwacht retour, dagen te laat, en (indien afgerond) opgehaald-op.

Statussen (levenscyclus): Geboekt -> Ingepland -> Onderweg -> Geleverd (staat op locatie) -> Opgehaald -> Afgerond. "Te laat" = een geleverde container die over de afgesproken einddatum is en nog niet is opgehaald. "Op te halen" = containers die op locatie staan en (bijna) over hun einddatum zijn, te laat eerst.

Regels:
- Antwoord ALLEEN op basis van de meegegeven DATA. Verzin niets. Staat iets er niet in, zeg dat eerlijk.
- Wees kort, concreet en zakelijk. Noem containernummers, klantnamen, adressen en datums waar relevant.
- Bij "hoeveel"-vragen: geef eerst het aantal, daarna een korte lijst (VH-nummer - klant - plaats).
- Bij zoeken (op klant, plaats, type of nummer): geef de gevonden containers met hun belangrijkste gegevens.
- Antwoord in het Nederlands, tenzij de gebruiker een andere taal gebruikt; spiegel dan die taal.
- Platte tekst. Geen opmaaktekens zoals # of *, geen emoji. Korte regels/opsommingen mogen.
- Praat namens Fa Schadde van Dooren (wij/we). Leg nooit uit hoe je technisch werkt of welke techniek je gebruikt.
- Gebruik Nederlandse datums (bijv. 22 jun 2026). "Vandaag" is de datum 'today' uit de DATA.`;

app.post("/api/schadde", async (req, res) => {
  if (!ANTHROPIC_KEY) return res.status(503).json({ error: "De assistent is nu even niet beschikbaar." });
  const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "0").split(",")[0].trim();
  if (rateLimited(ip)) return res.status(429).json({ error: "Te veel vragen achter elkaar — probeer het zo nog eens." });

  let question = String(req.body.question || "").trim();
  if (!question) return res.status(400).json({ error: "Lege vraag." });
  if (question.length > 1000) question = question.slice(0, 1000);
  let context = "{}";
  try { context = JSON.stringify(req.body.context || {}).slice(0, 80000); } catch (e) {}

  const convo = [];
  if (Array.isArray(req.body.history)) {
    for (const h of req.body.history.slice(-6)) {
      const role = h && h.role === "assistant" ? "assistant" : "user";
      const txt = String((h && h.content) || "").trim().slice(0, 1500);
      if (txt) convo.push({ role, content: txt });
    }
  }
  convo.push({ role: "user", content: `DATA (actuele dashboardgegevens):\n${context}\n\nVRAAG:\n${question}` });

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODEL, max_tokens: 1024,
        system: [{ type: "text", text: SCHADDE_SYSTEM, cache_control: { type: "ephemeral" } }],
        messages: convo,
      }),
    });
    if (!r.ok) { console.error("[schadde] API", r.status, (await r.text()).slice(0, 400)); return res.status(502).json({ error: "De assistent is even niet bereikbaar. Probeer het zo opnieuw." }); }
    const data = await r.json();
    let reply = (Array.isArray(data.content) ? data.content : []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    reply = reply || "Sorry, dat heb ik niet helemaal begrepen — kunt u het anders formuleren?";
    res.json({ reply });
  } catch (e) { console.error("[schadde]", e.message); return res.status(502).json({ error: "De assistent had moeite met antwoorden. Probeer het zo opnieuw." }); }
});

/* ---------------------------------------------- /api/schadde-sign (e-sign)
   Records a signed acceptance of the Container Dashboard proposal: builds a
   branded contract PDF with the signature, emails a copy to the signer + to us,
   and returns the PDF so the browser can download it. */
app.post("/api/schadde-sign", async (req, res) => {
  const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "0").split(",")[0].trim();
  if (rateLimited(ip)) return res.status(429).json({ error: "Te veel verzoeken — probeer het zo opnieuw." });

  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim();
  const company = String(req.body.company || "").trim() || "Fa Schadde van Dooren";
  const typed = String(req.body.typedName || "").trim().slice(0, 80);
  const sigUrl = String(req.body.signature || "");
  if (!name || !validEmail(email)) return res.status(400).json({ error: "Vul uw naam en een geldig e-mailadres in." });
  if (!sigUrl && !typed) return res.status(400).json({ error: "Plaats een handtekening of typ uw naam." });

  let pngBuffer = null;
  const m = sigUrl.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
  if (m) { try { const b = Buffer.from(m[1], "base64"); if (b.length <= 2000000) pngBuffer = b; } catch (e) {} }

  let signedAt;
  try { signedAt = new Date().toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam", dateStyle: "long", timeStyle: "short" }); }
  catch (e) { signedAt = new Date().toISOString(); }

  const terms = `Container Dashboard voor Fa Schadde van Dooren

Een centraal dashboard met een actueel overzicht van alle verhuurde containers (lijst en zoombare kaart), filters op type, plaats, duur en particulier/zakelijk, een zoekfunctie, signalering van te laat op te halen containers en overname van de historische verhuren.

Levering in twee fasen:
- Fase 1 — het dashboard (ontwerp en bouw), op te leveren als werkende demo.
- Fase 2 — koppeling met OMS4Business, geocodering van adressen, migratie van historische verhuren, inlog voor het team, hosting opzetten en livegang.

Investering (eenmalig, excl. btw): dashboard inclusief koppeling met OMS4Business, geocodering, migratie, inlog en hosting-opzet € 7.500 – € 9.500; AI-assistent € 2.500 – € 4.000; totaal € 10.000 – € 13.500. De definitieve vaste prijs wordt na een korte intake schriftelijk bevestigd, afhankelijk van de koppelingswijze met OMS4Business (directe API of export). Ter vergelijking: vergelijkbare maatwerkoplossingen met systeemkoppeling beginnen doorgaans vanaf € 15.000; deze oplossing is eenmalig en u bent eigenaar. Hosting: voor rekening van Schadde van Dooren, geschat € 10 – € 25 per maand. Onderhoud en ondersteuning zijn optioneel (vanaf € 95 per maand), nu niet verplicht.

Doorlooptijd: circa 2 tot 4 weken na akkoord en zodra toegang tot OMS4Business beschikbaar is.

Door dit voorstel elektronisch te ondertekenen gaat u akkoord met de uitvoering zoals hierboven beschreven en geeft u opdracht tot de korte intake. De definitieve vaste prijs wordt daarna schriftelijk bevestigd, voordat de bouw van Fase 2 start.`;

  const filename = `NexaCore-Overeenkomst-Container-Dashboard-${slug(company)}-${todayStamp()}.pdf`;
  let base64;
  try {
    const pdf = await buildPDF({
      eyebrow: "Ondertekend voorstel",
      title: "Container Dashboard — Akkoord op voorstel",
      fields: [["Opdrachtgever", company], ["Ondertekend door", name], ["E-mail", email], ["Datum", signedAt]],
      bodyMd: terms,
      signature: { pngBuffer, typed: pngBuffer ? null : typed, name, role: company, signedAt, ip },
    });
    base64 = pdf.toString("base64");
  } catch (e) { console.error("[schadde-sign pdf]", e.message); return res.status(500).json({ error: "Kon het document niet opmaken. Probeer het opnieuw." }); }

  const fields = [["Opdrachtgever", company], ["Ondertekend door", name], ["E-mail", email], ["Datum", signedAt]];
  const html = emailHTML({
    eyebrow: "Ondertekend voorstel", title: "Container Dashboard — akkoord", fields,
    message: "In de bijlage vindt u het door u ondertekende voorstel voor het Container Dashboard. Wij nemen spoedig contact met u op voor de korte intake.",
    pdfAttached: true,
  });
  const text = `Beste ${name},\n\nBedankt voor uw akkoord op het voorstel voor het Container Dashboard. In de bijlage vindt u het ondertekende document. Wij nemen spoedig contact met u op voor de korte intake.\n\nMet vriendelijke groet,\nNexaCore`;
  const emailed = await sendEmail({
    to: [email, CONTACT_TO],
    subject: `Ondertekend voorstel — Container Dashboard (${company})`,
    text, html,
    attachments: [{ filename, content: base64, content_type: "application/pdf" }],
  });

  res.json({ ok: true, emailed, filename, pdf: base64 });
});

/* ---------------------------------------------- /api/oms-demo (gated real data)
   Serves the Schadde "OMS-aanvulling" demo data ONLY with the correct access code.
   The data lives in oms-demo-data/ (outside the public static path), so it can
   never be fetched directly as a static file. */
const OMS_DEMO_CODE = process.env.OMS_DEMO_CODE || "";
const OMS_DATA_DIR = path.join(__dirname, "oms-demo-data");
app.post("/api/oms-demo", (req, res) => {
  if (!OMS_DEMO_CODE) return res.status(503).json({ error: "Demo is niet beschikbaar." });
  const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "0").split(",")[0].trim();
  if (rateLimited(ip)) return res.status(429).json({ error: "Te veel pogingen — probeer het zo opnieuw." });
  const code = String(req.body.code || "").trim();
  if (code !== OMS_DEMO_CODE) return res.status(401).json({ error: "Onjuiste toegangscode." });
  try {
    const read = (f) => JSON.parse(fs.readFileSync(path.join(OMS_DATA_DIR, f), "utf8"));
    res.json({ orders: read("orders.json"), contracts: read("contracts.json"), locations: read("locations.json") });
  } catch (e) { console.error("[oms-demo]", e.message); return res.status(500).json({ error: "Gegevens niet beschikbaar." }); }
});

/* ----------------------------------------------- /api/oms-live (live OMS data)
   Pulls live data from OMS4Business using the server-side API key (Bearer), gated by
   the same access code. Cached briefly to limit API calls. Key never leaves the server. */
const OMS_API_KEY = process.env.OMS_API_KEY || "";
const OMS_API_BASE = "https://login.oms4business.com/api";
const OMS_GEO_FILE = path.join(os.tmpdir(), "oms-geocode-cache.json"); // off-repo: holds customer coordinates
const OMS_GEO = (() => { try { return JSON.parse(fs.readFileSync(OMS_GEO_FILE, "utf8")); } catch (e) { return {}; } })();
let omsLiveCache = { at: 0, data: null };
let omsBuilding = false;
const OMS_PER_PAGE = 500;
// Global rate gate: spaces OMS request starts ~550ms apart (~110/min, under the 120/min cap)
// so we can fire pages in parallel without 429 storms. This is the key speedup.
const sleepMs = (ms) => new Promise((s) => setTimeout(s, ms));
let _omsGate = Promise.resolve();
function omsGate() { const p = _omsGate.then(() => sleepMs(550)); _omsGate = p; return p; }
async function omsFetchPage(p, page) {
  for (let t = 0; t < 6; t++) {
    await omsGate();
    const url = `${OMS_API_BASE}${p}${p.includes("?") ? "&" : "?"}per_page=${OMS_PER_PAGE}&page=${page}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${OMS_API_KEY}`, Accept: "application/json" } });
    if (r.status === 429) { await sleepMs(3000); continue; }
    if (!r.ok) throw new Error(`${p} p${page} -> ${r.status}`);
    const j = await r.json();
    return { data: Array.isArray(j) ? j : (j.data || []), meta: j.meta };
  }
  throw new Error(`${p} p${page} -> 429 (retries exhausted)`);
}
// Fetches all pages, projecting each page to slim objects via proj() and discarding the
// raw page immediately. This keeps peak memory low (we never hold all fat records at once).
async function omsFetchAll(p, proj) {
  const map = proj || ((x) => x);
  const first = await omsFetchPage(p, 1);
  const out = first.data.map(map);
  const last = (first.meta && first.meta.last_page) || (first.data.length < OMS_PER_PAGE ? 1 : 500);
  if (last > 1) {
    const rest = await Promise.all(
      Array.from({ length: Math.min(last, 500) - 1 }, (_, i) => omsFetchPage(p, i + 2).then((r) => r.data.map(map)))
    );
    for (const arr of rest) for (const x of arr) out.push(x);
  }
  return out;
}
// ---- geocoding: reuse the 695 known Schadde coordinates as a seed; PDOK (free) for new ----
const OMS_LOC_SEED = (() => {
  try { const a = JSON.parse(fs.readFileSync(path.join(OMS_DATA_DIR, "locations.json"), "utf8")); const m = {}; a.forEach((l) => { if (l.adres && l.lat) m[l.adres.toLowerCase()] = { lat: l.lat, lng: l.lng }; }); return m; }
  catch (e) { return {}; }
})();
let GEOCACHE = { ...OMS_GEO };
async function pdokGeocode(q) {
  try {
    const r = await fetch("https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?rows=1&fl=centroide_ll&q=" + encodeURIComponent(q), { headers: { Accept: "application/json" } });
    if (!r.ok) return null;
    const j = await r.json();
    const d = j.response && j.response.docs && j.response.docs[0];
    const m = d && d.centroide_ll && /POINT\(([-\d.]+) ([-\d.]+)\)/.exec(d.centroide_ll);
    return m ? { lat: +m[2], lng: +m[1] } : null;
  } catch (e) { return null; }
}
async function geocodeAll(addrs) {
  const out = {};
  const todo = [];
  for (const a of addrs) {
    const k = a.toLowerCase();
    if (OMS_LOC_SEED[k]) { out[a] = OMS_LOC_SEED[k]; continue; }
    if (GEOCACHE[k]) { out[a] = GEOCACHE[k]; continue; }
    todo.push(a);
  }
  // PDOK is a separate host (no OMS rate limit) — geocode new addresses in parallel batches
  const batch = todo.slice(0, 400), CONC = 10;
  for (let i = 0; i < batch.length; i += CONC) {
    await Promise.all(batch.slice(i, i + CONC).map(async (a) => {
      const g = await pdokGeocode(a);
      if (g) { GEOCACHE[a.toLowerCase()] = g; out[a] = g; }
    }));
  }
  try { fs.writeFileSync(OMS_GEO_FILE, JSON.stringify(GEOCACHE)); } catch (e) {}
  return out;
}
const unitIsTon = (u) => /ton/i.test(typeof u === "string" ? u : (u && (u.name || u.code)) || "");

// Builds the full live dataset (heavy: ~180 paginated calls + geocoding). Runs in the
// BACKGROUND so user requests never wait for it. A concurrency guard prevents stacked builds.
async function buildOmsLive() {
  if (omsBuilding) return;
  omsBuilding = true;
  const t0 = Date.now();
  try {
    // 1. Build SLIM lookup tables first (small memory). Project each record to only the
    //    fields we need so we never retain the fat raw payloads.
    const [naSlim, wasteNums, contactsList, contractsRaw] = await Promise.all([
      omsFetchAll("/v1/orders", (o) => ({ uuid: o.uuid, contact_name: o.contact_name, contact_uuid: o.contact_uuid, street: o.street, houseNumber: o.houseNumber, postalCode: o.postalCode, city: o.city, date: o.date })),
      omsFetchAll("/v1/admin/waste-numbers", (w) => ({ uuid: w.uuid, number: w.number, eural: w.euralCode && (w.euralCode.code || w.euralCode) })),
      omsFetchAll("/v1/contacts", (c) => ({ uuid: c.uuid, cat: (c.isCompany === true || c.is_company === true) ? "Zakelijk" : ((c.isCompany === false || c.is_company === false) ? "Particulier" : "") })),
      omsFetchAll("/v1/contracts", (c) => ({ relatie: c.contact_name, status: c.status, start: c.start, end: c.end, street: c.street, houseNumber: c.houseNumber, postcode: c.postalCode, city: c.city })),
    ]);
    const wmap = {};
    wasteNums.forEach((w) => { const e = { eural: w.eural, number: w.number }; if (w.uuid) wmap[w.uuid] = e; if (w.number) wmap[w.number] = e; });
    const resolveWaste = (wn) => {
      if (!wn) return {};
      if (typeof wn === "object") return { eural: (wn.euralCode && (wn.euralCode.code || wn.euralCode)) || (wmap[wn.uuid] && wmap[wn.uuid].eural), number: wn.number || (wmap[wn.uuid] && wmap[wn.uuid].number) };
      return wmap[wn] || {};
    };
    const catMap = {};
    contactsList.forEach((c) => { if (c.uuid) catMap[c.uuid] = c.cat; });
    const naByUuid = {};
    naSlim.forEach((o) => { if (o.uuid) naByUuid[o.uuid] = o; });
    // 2. Stream admin orders: flatten each page to a slim order as it arrives, so we never
    //    hold all ~24k fat order objects (with nested line items) in memory at once.
    const orders = await omsFetchAll("/v1/admin/orders", (O) => {
      const na = naByUuid[O.uuid] || {};
      const items = O.orderItems || [];
      const wItem = items.find((it) => it.wasteNumber) || {};
      const w = resolveWaste(wItem.wasteNumber);
      const tonKg = Math.round(items.filter((it) => unitIsTon(it.unit)).reduce((s, it) => s + (+it.quantity || 0), 0) * 1000);
      const bestItem = items.slice().sort((a, b) => (+b.total_excl || 0) - (+a.total_excl || 0))[0] || {};
      const st = na.street, hn = na.houseNumber, pc = na.postalCode, city = na.city;
      const adres = st ? (`${st} ${hn || ""}`.trim() + ((pc || city) ? `, ${pc || ""}${pc && city ? ", " : ""}${city || ""}` : "")) : "";
      return {
        ordernr: O.orderNr || na.order_nr,
        relatie: na.contact_name || (O.location && O.location.name) || "(onbekend)",
        categorie: catMap[na.contact_uuid] || "",
        service: (bestItem.serviceType && bestItem.serviceType.name) || "",
        productgroep: (bestItem.product && bestItem.product.name) || "Onbekend",
        product: (bestItem.product && bestItem.product.name) || "",
        uitvoerdatum: String(O.executedAt || O.date || na.date || "").slice(0, 10),
        status: O.status,
        netto_gewicht: tonKg,
        afvalstroom: w.number || "",
        eural: w.eural || "",
        regeltotaal: +O.totalExcl || items.reduce((s, it) => s + (+it.total_excl || 0), 0),
        adres,
      };
    });
    // aggregate locations by address (orders) + contracts as fixed installations
    const locAgg = {};
    orders.forEach((o) => {
      if (!o.adres) return;
      const a = (locAgg[o.adres] = locAgg[o.adres] || { adres: o.adres, klant: o.relatie, count: 0, types: new Set(), laatste: "" });
      a.count++; if (o.product) a.types.add(o.product); if (o.uitvoerdatum > a.laatste) a.laatste = o.uitvoerdatum;
    });
    const contracts = contractsRaw.map((c) => ({ relatie: c.contact_name, status: c.status, start: c.start, end: c.end, street: c.street, postcode: c.postalCode, city: c.city }));
    contractsRaw.forEach((c) => {
      if (!c.street) return;
      const adres = `${c.street} ${c.houseNumber || ""}`.trim() + `, ${c.postalCode || ""}, ${c.city || ""}`;
      const a = (locAgg["INST::" + adres] = locAgg["INST::" + adres] || { adres, klant: c.contact_name, count: 0, types: new Set(), laatste: "", inst: true });
      a.count++;
    });
    const uniqAddrs = [...new Set(Object.values(locAgg).map((a) => a.adres))];
    const geo = await geocodeAll(uniqAddrs);
    const locations = Object.values(locAgg).map((a) => {
      const g = geo[a.adres]; if (!g) return null;
      return { type: a.inst ? "installatie" : "order", adres: a.adres, klant: a.klant, lat: g.lat, lng: g.lng, count: a.count, types: [...a.types].slice(0, 3).join(", "), laatste: a.laatste };
    }).filter(Boolean);
    // strip per-order fields the client never uses (adres/product were only needed above
    // for the location map) — keeps the payload smaller
    for (const o of orders) { delete o.adres; delete o.product; }
    const at = Date.now();
    const data = { orders, contracts, locations, counts: { orders: orders.length, locations: locations.length, contracts: contracts.length } };
    const json = JSON.stringify({ cached: true, builtAt: at, ...data });
    const gz = zlib.gzipSync(json); // pre-compress once; served to any client that accepts gzip
    omsLiveCache = { at, data, json, gz };
    console.log(`[oms-live] snapshot built in ${Math.round((Date.now() - t0) / 1000)}s: ${JSON.stringify(data.counts)} (json ${Math.round(json.length / 1048576)}MB, gz ${Math.round(gz.length / 1048576 * 10) / 10}MB)`);
  } catch (e) { console.error("[oms-live] build failed:", e.message); }
  finally { omsBuilding = false; }
}

// TEMP diagnostic: can we classify orders as incoming/outgoing (needed for LMA stock calc)?
app.post("/api/oms-lma-probe", async (req, res) => {
  if (!OMS_DEMO_CODE || String(req.body.code || "").trim() !== OMS_DEMO_CODE) return res.status(401).json({ error: "Onjuiste toegangscode." });
  const filled = (v) => v !== null && v !== undefined && !(typeof v === "string" && v.trim() === "");
  try {
    const r = await omsFetchPage("/v1/admin/orders?per_page=250", 1);
    const rows = r.data;
    const serviceTypes = new Set(), productTypes = new Set();
    const withStockSection = [], withLmaNotif = [], withRoute = [], withCollectorsArr = [];
    rows.forEach((O) => {
      (O.orderItems || []).forEach((it) => {
        if (it.serviceType && it.serviceType.name) serviceTypes.add(it.serviceType.name);
        if (it.productType && it.productType.name) productTypes.add(it.productType.name);
        if (filled(it.stockSection) || filled(it.stock_batch_id)) withStockSection.push({ nr: O.orderNr, stockSection: it.stockSection, stock_batch_id: it.stock_batch_id, service: it.serviceType && it.serviceType.name });
        if (filled(it.last_lma_notification_at)) withLmaNotif.push({ nr: O.orderNr, last_lma_notification_at: it.last_lma_notification_at });
        if (filled(it.routeCollection)) withRoute.push({ nr: O.orderNr, routeCollection: it.routeCollection, service: it.serviceType && it.serviceType.name });
        if (filled(it.collectorsArrangement)) withCollectorsArr.push({ nr: O.orderNr, collectorsArrangement: it.collectorsArrangement });
      });
    });
    res.json({
      sampled: rows.length,
      serviceTypes: [...serviceTypes], productTypes: [...productTypes],
      withStockSection_count: withStockSection.length, withStockSection_sample: withStockSection.slice(0, 8),
      withLmaNotif_count: withLmaNotif.length, withLmaNotif_sample: withLmaNotif.slice(0, 5),
      withRoute_count: withRoute.length, withRoute_sample: withRoute.slice(0, 5),
      withCollectorsArr_count: withCollectorsArr.length, withCollectorsArr_sample: withCollectorsArr.slice(0, 5),
    });
  } catch (e) { res.status(502).json({ error: e.message }); }
});

app.post("/api/oms-live", (req, res) => {
  if (!OMS_DEMO_CODE) return res.status(503).json({ error: "Demo is niet beschikbaar." });
  if (String(req.body.code || "").trim() !== OMS_DEMO_CODE) return res.status(401).json({ error: "Onjuiste toegangscode." });
  if (!OMS_API_KEY) return res.status(503).json({ error: "Live koppeling is nog niet geconfigureerd." });
  // Serve the prepared snapshot instantly. Refresh in the background when stale (>6h).
  if (omsLiveCache.data) {
    if (Date.now() - omsLiveCache.at > 21600000 && !omsBuilding) buildOmsLive();
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    if (omsLiveCache.gz && /\bgzip\b/.test(req.headers["accept-encoding"] || "")) {
      res.setHeader("Content-Encoding", "gzip");
      return res.end(omsLiveCache.gz);
    }
    return res.end(omsLiveCache.json || JSON.stringify({ cached: true, builtAt: omsLiveCache.at, ...omsLiveCache.data }));
  }
  // No snapshot yet (cold boot): kick off the build and tell the client to retry shortly.
  if (!omsBuilding) buildOmsLive();
  return res.status(202).json({ building: true, error: "Live gegevens worden voorbereid (eenmalig, circa 2-3 minuten). Een moment geduld." });
});

// Warm the snapshot on boot so the first visitor never waits for a cold build.
if (OMS_API_KEY && OMS_DEMO_CODE) setTimeout(() => { buildOmsLive(); }, 3000);

/* ------------------------------------------------------------------ static */
const FRESH = new Set(["nxc-i18n.js", "nxc-app.js", "nexaMails.png"]); // files I edit often
app.use(express.static(SITE_DIR, {
  extensions: ["html"],
  setHeaders: (res, fp) => {
    if (/\.html$/i.test(fp)) {
      res.setHeader("Cache-Control", "public, max-age=0, must-revalidate"); // always fresh HTML
    } else if (FRESH.has(path.basename(fp))) {
      res.setHeader("Cache-Control", "public, max-age=300"); // 5 min — my frequently-updated assets
    } else {
      res.setHeader("Cache-Control", "public, max-age=2592000, immutable"); // 30 days — versioned mirror assets, media, fonts
    }
  },
}));
// Missing files with an extension -> small 404 (don't serve the 172KB HTML page as a fake asset).
app.get("*", (req, res) => {
  if (path.extname(req.path)) { res.set("Cache-Control", "public, max-age=300"); return res.status(404).send("Not found"); }
  res.set("Cache-Control", "public, max-age=0, must-revalidate");
  res.sendFile(path.join(SITE_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`NexaCore site on http://localhost:${PORT}  (static: ${SITE_DIR})`);
  console.log(`Nexa: ${ANTHROPIC_KEY ? "configured" : "NO ANTHROPIC_API_KEY"} · email: ${RESEND_API_KEY ? "Resend" : "store+log only"}`);
});
