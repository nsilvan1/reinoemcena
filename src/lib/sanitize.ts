import DOMPurify from "isomorphic-dompurify";

// Re-export para compatibilidade. Quem só precisa validar URL deve importar
// direto de "@/lib/url-safe" para não carregar o jsdom.
export { isSafeUrl } from "./url-safe";

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

