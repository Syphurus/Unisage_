"use client";

import React, { useEffect, useState } from "react";

type Props = { html: string; className?: string };

function stripScripts(input: string) {
  return input.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
}

export default function HtmlContent({
  html,
  className = "prose max-w-none",
}: Props) {
  const [sanitizedBody, setSanitizedBody] = useState<string>(() =>
    stripScripts(html)
  );
  const [extractedCss, setExtractedCss] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const DOMPurify = (await import("dompurify")).default;

        // Parse HTML to extract <style> contents and <body> innerHTML (handles full documents)
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        const bodyHtml = doc.body ? doc.body.innerHTML : html;

        // Collect styles from <style> tags inside the uploaded HTML
        const styleElems = Array.from(doc.querySelectorAll("style"));
        const cssText = styleElems.map((s) => s.textContent || "").join("\n");

        // Basic CSS sanitization: remove expression() and javascript: urls
        const safeCss = cssText
          .replace(/expression\s*\(/gi, "")
          .replace(/url\s*\(\s*['\"]?javascript:[^\)]+\)/gi, "");

        const cleanBody = DOMPurify.sanitize(bodyHtml, {
          SAFE_FOR_TEMPLATES: true,
        });

        if (mounted) {
          setSanitizedBody(cleanBody);
          setExtractedCss(safeCss);
        }
      } catch (e) {
        if (mounted) {
          setSanitizedBody(stripScripts(html));
          setExtractedCss("");
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [html]);

  return (
    <div className={className}>
      {extractedCss ? <style>{extractedCss}</style> : null}
      <div dangerouslySetInnerHTML={{ __html: sanitizedBody }} />
    </div>
  );
}
