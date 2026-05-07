/**
 * @fileoverview Convert raw PDF text into structured, readable HTML blocks.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { PDFParse } = require("pdf-parse");

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function looksLikeHeading(line) {
  const t = line.trim();
  if (!t) return false;
  if (t.length > 80) return false;
  if (/^[A-Z0-9\s:()\-]+$/.test(t) && t.length >= 4) return true;
  if (/^[0-9]+(\.[0-9]+)*\s+/.test(t)) return true;
  if (/^[A-Z][A-Za-z0-9\s\-]{2,}$/.test(t) && !/[.!?]$/.test(t)) return true;
  return false;
}

function toBeautifulHtml(rawText, title = "Formatted Notes") {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const parts = [];
  parts.push(`<h1>${escapeHtml(title)}</h1>`);

  let para = [];
  let listOpen = false;

  const flushPara = () => {
    if (para.length > 0) {
      parts.push(`<p>${escapeHtml(para.join(" "))}</p>`);
      para = [];
    }
  };

  const closeList = () => {
    if (listOpen) {
      parts.push("</ul>");
      listOpen = false;
    }
  };

  for (const line of lines) {
    if (looksLikeHeading(line)) {
      flushPara();
      closeList();
      parts.push(`<h2>${escapeHtml(line)}</h2>`);
      continue;
    }

    if (/^[-*•]\s+/.test(line)) {
      flushPara();
      if (!listOpen) {
        parts.push("<ul>");
        listOpen = true;
      }
      parts.push(`<li>${escapeHtml(line.replace(/^[-*•]\s+/, ""))}</li>`);
      continue;
    }

    if (line.length <= 2) {
      flushPara();
      closeList();
      continue;
    }

    closeList();
    para.push(line);
  }

  flushPara();
  closeList();

  return parts.join("\n");
}

async function formatPdfBuffer(buffer, opts = {}) {
  const title = opts.title || "Formatted Notes";
  const tempFilePath = path.join(
    os.tmpdir(),
    `unisage-pdf-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`
  );

  try {
    fs.writeFileSync(tempFilePath, buffer);

    const parser = new PDFParse({ url: tempFilePath, verbosity: 0 });
    const parsed = await parser.getText();
    const text = parsed.text || "";

    return {
      html: toBeautifulHtml(text, title),
      meta: {
        pages: parsed.numpages || 0,
        words: text.split(/\s+/).filter(Boolean).length,
        chars: text.length,
      },
    };
  } finally {
    try {
      fs.unlinkSync(tempFilePath);
    } catch {
      // Ignore temp file cleanup errors.
    }
  }
}

module.exports = {
  formatPdfBuffer,
  toBeautifulHtml,
};
