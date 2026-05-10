"use client";

import React, { useEffect, useState } from "react";

type Props = { html: string; className?: string };

/**
 * Render admin-uploaded HTML safely AND without letting Word / Google Docs
 * styles leak into our dark theme.
 *
 * Admin tools paste HTML that contains:
 *  - <style> blocks with body backgrounds, white-on-white tables, etc.
 *  - inline style="color: #000; background: white; font-family: 'Calibri'"
 *  - <font color> attributes
 *
 * If we render that HTML as-is, it overrides our dark prose styles and the
 * page becomes unreadable (white text on white background).
 *
 * Strategy:
 *  1. Strip all <script> + <style> blocks
 *  2. Walk the DOM and remove:
 *      - color, background, background-color, font-family from inline style
 *      - color/bgcolor/face attributes
 *      - class names that come from Word ("MsoNormal", etc.)
 *  3. Run DOMPurify on the resulting body
 *  4. Render inside a scoped container so our .prose-notes always wins
 */
export default function HtmlContent({
  html,
  className = "",
}: Props) {
  const [safeHtml, setSafeHtml] = useState<string>("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const DOMPurify = (await import("dompurify")).default;
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // 1) Drop scripts + styles entirely
        doc.querySelectorAll("script, style, link[rel=stylesheet]").forEach(
          (n) => n.remove(),
        );

        // 2) Strip color / background / font from every element so our
        //    theme variables take over.
        const KILL_STYLE = [
          "color",
          "background",
          "background-color",
          "background-image",
          "font-family",
          "font",
        ];
        const KILL_ATTR = [
          "color",
          "bgcolor",
          "face",
          "text",
          "link",
          "vlink",
          "alink",
        ];

        const all = Array.from(
          doc.body.querySelectorAll<HTMLElement>("*"),
        );
        for (const el of all) {
          // Inline style: remove color/background-related declarations
          const style = el.getAttribute("style");
          if (style) {
            const cleaned = style
              .split(";")
              .map((d) => d.trim())
              .filter((d) => {
                if (!d) return false;
                const prop = d.split(":")[0]?.trim().toLowerCase() || "";
                return !KILL_STYLE.includes(prop);
              })
              .join("; ");
            if (cleaned) el.setAttribute("style", cleaned);
            else el.removeAttribute("style");
          }
          // Legacy color attributes
          for (const a of KILL_ATTR) el.removeAttribute(a);
          // Word / Office class noise
          const cls = el.getAttribute("class");
          if (cls && /^(Mso|docs-|gd-)/.test(cls)) el.removeAttribute("class");
        }

        // Remove empty paragraphs Word loves to insert
        doc.body
          .querySelectorAll("p")
          .forEach((p) => {
            if (!p.textContent?.trim() && !p.querySelector("img")) p.remove();
          });

        const cleanBody = DOMPurify.sanitize(doc.body.innerHTML, {
          USE_PROFILES: { html: true },
          ALLOWED_ATTR: [
            "href",
            "src",
            "alt",
            "title",
            "id",
            "class",
            "rowspan",
            "colspan",
            "target",
            "rel",
            "loading",
            "width",
            "height",
            "align",
            "style",
          ],
          FORBID_TAGS: ["style", "script", "link", "meta", "iframe"],
          FORBID_ATTR: ["onerror", "onclick", "onload", "onmouseover"],
        });
        if (alive) setSafeHtml(cleanBody);
      } catch (e) {
        if (alive) {
          // Last-ditch: at least drop scripts + styles textually
          const stripped = html
            .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");
          setSafeHtml(stripped);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [html]);

  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: safeHtml }} />
  );
}
