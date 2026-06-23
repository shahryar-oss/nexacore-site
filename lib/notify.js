/* Branded notifications for NexaCore — a nicely formatted HTML email body
 * plus a formatted PDF attachment (with the NexaCore/Nexa logo).
 * Used by both the project-brief submission and the contact form. */
"use strict";
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");

const ROOT = path.join(__dirname, "..", "nxcore.nl");
const SHIELD = path.join(ROOT, "wp-content/themes/aixor-child/assets/nexa-logo.png");   // chrome shield (dark bg)
const WORDMARK = path.join(ROOT, "wp-content/uploads/2026/02/Logo-nexacore.png");        // NEXACORE wordmark (white text)
const LOGO_URL = "https://nxcore.nl/wp-content/uploads/2026/02/Logo-nexacore.png";       // hosted, for the email header

// Brand palette
const INK = "#0b0b12", LAV = "#b18cff", BLUE = "#6ea8ff", GOLD = "#f5b73e";
const TEXT = "#1d1c2b", MUTED = "#6b7280", LINE = "#e7e9f1", SOFT = "#f6f6fb";

function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

/* ---- tiny markdown -> HTML (headings, bold, bullets, paragraphs) for the email body ---- */
function mdToHtml(md) {
  const lines = String(md || "").split(/\r?\n/);
  let out = "", list = false;
  const closeList = () => { if (list) { out += "</ul>"; list = false; } };
  const inline = (s) => esc(s).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
  for (let raw of lines) {
    const ln = raw.trim();
    let m;
    if (!ln) { closeList(); continue; }
    if ((m = ln.match(/^#{1,6}\s+(.*)/))) { closeList(); out += `<h3 style="margin:22px 0 8px;font-size:15px;color:${INK};font-weight:700">${inline(m[1])}</h3>`; }
    else if ((m = ln.match(/^\*\*(.+?)\*\*:?\s*$/))) { closeList(); out += `<h3 style="margin:22px 0 8px;font-size:15px;color:${INK};font-weight:700">${inline(m[1])}</h3>`; }
    else if ((m = ln.match(/^[-*]\s+(.*)/))) { if (!list) { out += `<ul style="margin:6px 0 6px 18px;padding:0;color:${TEXT}">`; list = true; } out += `<li style="margin:3px 0;font-size:14px;line-height:1.55">${inline(m[1])}</li>`; }
    else { closeList(); out += `<p style="margin:8px 0;font-size:14px;line-height:1.6;color:${TEXT}">${inline(ln)}</p>`; }
  }
  closeList();
  return out;
}

/* ---- HTML email ----
 * kind: "brief" | "contact"; fields: [[label,value],...]; bodyMd / message; pdfAttached:bool */
function emailHTML({ eyebrow, title, fields, bodyMd, message, pdfAttached }) {
  const rows = (fields || []).filter(([, v]) => v != null && String(v).trim() !== "").map(([label, v]) =>
    `<tr>
       <td style="padding:7px 14px 7px 0;font-size:12px;color:${MUTED};white-space:nowrap;vertical-align:top;width:140px">${esc(label)}</td>
       <td style="padding:7px 0;font-size:14px;color:${TEXT};vertical-align:top">${esc(v)}</td>
     </tr>`).join("");
  let body = "";
  if (bodyMd) body = `<div style="margin-top:8px">${mdToHtml(bodyMd)}</div>`;
  else if (message) body = `<div style="margin-top:8px;white-space:pre-wrap;font-size:14px;line-height:1.6;color:${TEXT}">${esc(message)}</div>`;
  const noteHtml = pdfAttached
    ? `<div style="margin-top:24px;padding:12px 16px;background:${SOFT};border:1px solid ${LINE};border-radius:10px;font-size:13px;color:${MUTED}">A formatted PDF copy of this ${eyebrow.toLowerCase()} is attached to this email.</div>` : "";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef0f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${TEXT}">
  <div style="max-width:640px;margin:0 auto;padding:32px 16px">
    <div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px -16px rgba(11,11,18,.25)">
      <div style="background:${INK};background-image:linear-gradient(110deg,#16142a,#0b0b12);padding:26px 30px;border-bottom:3px solid ${LAV}">
        <img src="${LOGO_URL}" alt="NexaCore" height="26" style="height:26px;display:inline-block">
        <div style="margin-top:14px;font-size:11px;letter-spacing:2px;color:${LAV};font-weight:700;text-transform:uppercase">${esc(eyebrow)}</div>
        <div style="margin-top:4px;font-size:21px;color:#fff;font-weight:700">${esc(title)}</div>
      </div>
      <div style="padding:28px 30px">
        ${rows ? `<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-bottom:18px;border-bottom:1px solid ${LINE};padding-bottom:8px">${rows}</table>` : ""}
        ${body}
        ${noteHtml}
      </div>
      <div style="padding:18px 30px;background:${SOFT};border-top:1px solid ${LINE};font-size:11px;line-height:1.6;color:${MUTED}">
        NexaCore — a trade name of LinkRoute Logistics International B.V. · KvK 84263482 · BTW NL863151371B01<br>
        Weena 690, 3012 CN Rotterdam, NL · info@nxcore.nl · +31 (085) 800 0014
      </div>
    </div>
    <div style="text-align:center;margin-top:14px;font-size:11px;color:#9aa3b2">Sent automatically by Nexa from the NexaCore website.</div>
  </div>
</body></html>`;
}

/* ---- formatted PDF (pure pdfkit, no headless browser) ---- */
function buildPDF({ eyebrow, title, fields, bodyMd, message, signature }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margins: { top: 150, bottom: 60, left: 50, right: 50 } });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    const W = doc.page.width, M = 50, CW = W - M * 2;

    const header = () => {
      doc.save();
      doc.rect(0, 0, W, 110).fill(INK);
      doc.rect(0, 110, W, 4).fill(LAV);
      try { if (fs.existsSync(SHIELD)) doc.image(SHIELD, M, 28, { height: 54 }); } catch {}
      try { if (fs.existsSync(WORDMARK)) doc.image(WORDMARK, M + 66, 44, { height: 30 }); } catch {}
      doc.fillColor("#9aa3b2").font("Helvetica").fontSize(9)
        .text("Powering the core of your digital future", W - 250 - M, 50, { width: 250, align: "right" });
      doc.restore();
    };
    header();
    doc.on("pageAdded", () => { doc.rect(0, 0, W, 6).fill(LAV); doc.fillColor(TEXT); doc.y = 60; });

    // Title block
    doc.fillColor(INK).font("Helvetica-Bold").fontSize(20).text(title, M, 142);
    doc.moveDown(0.2);
    doc.fillColor(MUTED).font("Helvetica").fontSize(10).text(eyebrow.toUpperCase() + "  ·  " + new Date().toUTCString());
    doc.moveDown(1);

    // Fields box
    const fl = (fields || []).filter(([, v]) => v != null && String(v).trim() !== "");
    if (fl.length) {
      const top = doc.y;
      doc.roundedRect(M, top, CW, 18 + fl.length * 18, 8).fill(SOFT);
      doc.fillColor(TEXT); let yy = top + 12;
      for (const [label, v] of fl) {
        doc.font("Helvetica-Bold").fontSize(9).fillColor(MUTED).text(String(label).toUpperCase(), M + 14, yy, { width: 120 });
        doc.font("Helvetica").fontSize(11).fillColor(TEXT).text(String(v), M + 140, yy, { width: CW - 140 - 14 });
        yy += 18;
      }
      doc.y = top + 18 + fl.length * 18 + 16;
    }

    // Body
    if (bodyMd) {
      for (const raw of String(bodyMd).split(/\r?\n/)) {
        const ln = raw.trim(); let m;
        if (!ln) { doc.moveDown(0.4); continue; }
        if ((m = ln.match(/^#{1,6}\s+(.*)/)) || (m = ln.match(/^\*\*(.+?)\*\*:?\s*$/))) {
          doc.moveDown(0.5).font("Helvetica-Bold").fontSize(13).fillColor(INK).text(m[1].replace(/\*\*/g, ""), M, doc.y, { width: CW });
          doc.moveDown(0.15);
        } else if ((m = ln.match(/^[-*]\s+(.*)/))) {
          doc.font("Helvetica").fontSize(11).fillColor(TEXT).text("•  " + m[1].replace(/\*\*/g, ""), M + 12, doc.y, { width: CW - 12 });
        } else {
          doc.font("Helvetica").fontSize(11).fillColor(TEXT).text(ln.replace(/\*\*/g, ""), M, doc.y, { width: CW });
        }
      }
    } else if (message) {
      doc.font("Helvetica").fontSize(11).fillColor(TEXT).text(message, M, doc.y, { width: CW });
    }

    // Optional e-signature block.
    if (signature) {
      doc.moveDown(1.2);
      const sy = doc.y;
      doc.moveTo(M, sy).lineTo(M + CW, sy).strokeColor(LINE).lineWidth(1).stroke();
      doc.moveDown(0.7);
      doc.font("Helvetica-Bold").fontSize(12).fillColor(INK).text("Ondertekening", M, doc.y, { width: CW });
      doc.moveDown(0.5);
      let drew = false;
      if (signature.pngBuffer) {
        try { doc.image(signature.pngBuffer, M, doc.y, { fit: [230, 80] }); doc.y += 84; drew = true; } catch (e) {}
      }
      if (!drew && signature.typed) {
        doc.font("Helvetica-Oblique").fontSize(22).fillColor(INK).text(signature.typed, M, doc.y, { width: CW });
        doc.moveDown(0.6);
      }
      doc.moveTo(M, doc.y).lineTo(M + 250, doc.y).strokeColor(MUTED).lineWidth(0.5).stroke();
      doc.moveDown(0.3);
      doc.font("Helvetica-Bold").fontSize(11).fillColor(TEXT).text(signature.name + (signature.role ? "  —  " + signature.role : ""), M, doc.y, { width: CW });
      doc.font("Helvetica").fontSize(9).fillColor(MUTED).text("Elektronisch ondertekend op " + signature.signedAt + (signature.ip ? "  ·  IP " + signature.ip : ""), M, doc.y, { width: CW });
    }

    // Footer on the last page. Disable the bottom margin so placing text near
    // the page bottom does not trigger an extra blank page.
    doc.page.margins.bottom = 0;
    const footY = doc.page.height - 52;
    doc.font("Helvetica").fontSize(8).fillColor(MUTED).text(
      "NexaCore — a trade name of LinkRoute Logistics International B.V.  ·  KvK 84263482  ·  BTW NL863151371B01  ·  Weena 690, 3012 CN Rotterdam, NL  ·  info@nxcore.nl  ·  +31 (085) 800 0014",
      M, footY, { width: CW, align: "center", lineBreak: true });
    doc.end();
  });
}

module.exports = { emailHTML, buildPDF };
