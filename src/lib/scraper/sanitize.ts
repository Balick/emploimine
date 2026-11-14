import sanitize from "sanitize-html";

/**
 * Descriptions come from third-party sites and are rendered with
 * `dangerouslySetInnerHTML`, so they must be sanitized before storage.
 * Only structural/text tags survive; links are forced to open safely.
 */
export function sanitizeDescription(html: string | null | undefined): string | null {
  if (!html) return null;
  const result = sanitize(html, {
    allowedTags: [
      "p", "br", "hr", "div", "span",
      "h2", "h3", "h4", "h5", "h6",
      "strong", "b", "em", "i", "u",
      "ul", "ol", "li",
      "table", "thead", "tbody", "tr", "th", "td",
      "blockquote", "a",
    ],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      // Page titles inside descriptions would compete with the offer title.
      h1: "h2",
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer nofollow" },
      }),
    },
    // Drop blocks left empty, including those that only held an (unallowed) image.
    exclusiveFilter: (frame) => ["p", "div", "span", "li"].includes(frame.tag) && !frame.text.trim(),
  }).trim();
  return result || null;
}
