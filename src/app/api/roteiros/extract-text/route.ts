import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { extractText } from "@/lib/extract-text";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIMES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]);

/**
 * POST /api/roteiros/extract-text
 *
 * Aceita dois formatos:
 *   A) multipart/form-data com campo `file` (upload direto)
 *   B) JSON `{ url: string, mimeType?: string }` (extrai de anexo existente)
 *
 * Retorna `{ html, text, warnings? }` pronto pro TipTap.
 *
 * Permissão: roteirista+ (não bloqueia membro pq extração é leitura,
 * mas evita abuso de bot — qualquer logado com role >= roteirista pode).
 */
export async function POST(req: NextRequest) {
  const { error } = await requireRole("roteirista");
  if (error) return error;

  const contentType = req.headers.get("content-type") || "";

  try {
    let buffer: Buffer;
    let mimeType: string;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      if (!file || !(file instanceof File)) {
        return NextResponse.json(
          { error: "Nenhum arquivo enviado" },
          { status: 400 }
        );
      }
      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          { error: "Arquivo muito grande (máx. 10MB)" },
          { status: 400 }
        );
      }
      mimeType = file.type;
      if (!ALLOWED_MIMES.has(mimeType)) {
        return NextResponse.json(
          { error: "Tipo não suportado. Use PDF, DOC ou DOCX." },
          { status: 400 }
        );
      }
      buffer = Buffer.from(await file.arrayBuffer());
    } else {
      const body = await req.json();
      const url = String(body.url || "").trim();
      if (!url) {
        return NextResponse.json({ error: "url obrigatória" }, { status: 400 });
      }

      // Aceita apenas URLs próprias (relativas /uploads ou blob.vercel-storage)
      // e absolutas https confiáveis. Bloqueia data: / file: / http simples.
      const isInternal = url.startsWith("/");
      const isBlob = /blob\.vercel-storage\.com/.test(url);
      const isHttps = /^https:\/\//.test(url);
      if (!isInternal && !isBlob && !isHttps) {
        return NextResponse.json(
          { error: "URL inválida" },
          { status: 400 }
        );
      }

      // Resolve URL absoluta
      const fetchUrl = isInternal
        ? `${req.nextUrl.origin}${url}`
        : url;

      const res = await fetch(fetchUrl);
      if (!res.ok) {
        return NextResponse.json(
          { error: `Falha ao baixar anexo (${res.status})` },
          { status: 502 }
        );
      }

      const contentLength = parseInt(res.headers.get("content-length") || "0", 10);
      if (contentLength && contentLength > MAX_SIZE) {
        return NextResponse.json(
          { error: "Arquivo muito grande (máx. 10MB)" },
          { status: 400 }
        );
      }

      const arrayBuffer = await res.arrayBuffer();
      if (arrayBuffer.byteLength > MAX_SIZE) {
        return NextResponse.json(
          { error: "Arquivo muito grande (máx. 10MB)" },
          { status: 400 }
        );
      }
      buffer = Buffer.from(arrayBuffer);

      // mimeType: prioriza body, depois Content-Type, depois extensão
      const explicit = String(body.mimeType || "").trim();
      mimeType =
        explicit ||
        res.headers.get("content-type")?.split(";")[0] ||
        guessMimeFromUrl(url);

      if (!ALLOWED_MIMES.has(mimeType)) {
        return NextResponse.json(
          { error: "Tipo não suportado. Use PDF, DOC ou DOCX." },
          { status: 400 }
        );
      }
    }

    const result = await extractText(buffer, mimeType);

    return NextResponse.json({
      html: result.html,
      text: result.text,
      warnings: result.warnings,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json(
      { error: `Falha ao extrair texto: ${msg}` },
      { status: 500 }
    );
  }
}

function guessMimeFromUrl(url: string): string {
  const low = url.toLowerCase().split("?")[0];
  if (low.endsWith(".pdf")) return "application/pdf";
  if (low.endsWith(".docx"))
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (low.endsWith(".doc")) return "application/msword";
  return "application/octet-stream";
}
