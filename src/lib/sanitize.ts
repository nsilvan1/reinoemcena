import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "br",
  "strong",
  "em",
  "u",
  "s",
  "ol",
  "ul",
  "li",
  "a",
  "blockquote",
  "code",
  "pre",
  "span",
  "mark",
];

const ALLOWED_ATTR = ["href", "class", "target", "rel", "data-color"];

// Aceita apenas http(s):, mailto:, e URIs relativas. Bloqueia javascript:, data:, file:, etc.
const ALLOWED_URI_REGEXP =
  /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i;

export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== "string") return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP,
    FORBID_TAGS: ["script", "iframe", "object", "embed", "style", "form", "input"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "style"],
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: true,
  });
}

export function isSafeUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (trimmed.length === 0 || trimmed.length > 2048) return false;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }
  return false;
}
