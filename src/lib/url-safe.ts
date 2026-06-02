/**
 * Validação de URL — SEM dependência de DOMPurify/jsdom.
 *
 * Vive separado de `sanitize.ts` de propósito: importar `isSafeUrl` não deve
 * arrastar o isomorphic-dompurify (e o jsdom) para rotas que só precisam
 * validar uma URL. Carregar o jsdom no servidor quebra com ERR_REQUIRE_ESM
 * sob o Turbopack.
 */

// Aceita apenas http(s): absolutas e URIs relativas que começam com "/".
// Bloqueia javascript:, data:, file:, etc.
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
