/**
 * Extração server-side de texto a partir de PDF e DOCX.
 * - DOCX → HTML preservando bold/italic/headings via mammoth
 * - PDF → texto puro envelopado em <p> por linha (pdfjs-dist)
 *
 * Usado pelo endpoint /api/roteiros/extract-text para preencher o
 * editor TipTap com o conteúdo do anexo, permitindo conferir/editar
 * direto no sistema.
 */

import DOMPurify from "isomorphic-dompurify";

type ExtractResult = {
  html: string;
  /** Texto puro (sem HTML) — útil pra pré-visualização ou fallback. */
  text: string;
  /** Diagnóstico não-fatal (ex: imagens ignoradas, fontes raras). */
  warnings?: string[];
};

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "h1",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "hr",
];

function sanitizeHtml(rawHtml: string): string {
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}

/**
 * Extrai HTML semântico de um DOCX (.docx Word 2007+).
 * Mapeia headings, listas, negrito/itálico. Imagens são removidas.
 */
export async function extractFromDocx(buffer: Buffer): Promise<ExtractResult> {
  const mammoth = (await import("mammoth")).default;

  // Mapeia estilos do Word pra HTML semântico
  const styleMap = [
    "p[style-name='Heading 1'] => h1:fresh",
    "p[style-name='Heading 2'] => h2:fresh",
    "p[style-name='Heading 3'] => h3:fresh",
    "p[style-name='Title'] => h1.title:fresh",
    "p[style-name='Quote'] => blockquote:fresh",
    "r[style-name='Strong'] => strong",
    "r[style-name='Emphasis'] => em",
  ];

  const result = await mammoth.convertToHtml(
    { buffer },
    {
      styleMap,
      ignoreEmptyParagraphs: true,
      // Sem imagens — só texto pra editor
      convertImage: mammoth.images.imgElement(async () => ({ src: "" })),
    }
  );

  const html = sanitizeHtml(result.value);
  const textResult = await mammoth.extractRawText({ buffer });

  return {
    html,
    text: textResult.value,
    warnings: result.messages?.map((m) => m.message) || [],
  };
}

/**
 * Extrai texto puro de um PDF. Cada bloco de linhas vira um <p>.
 * Usa o build "legacy" do pdfjs-dist (CommonJS) — funciona em Node sem worker.
 */
export async function extractFromPdf(buffer: Buffer): Promise<ExtractResult> {
  // Evita avaliar pdfjs no build do Next pra rotas que não usam
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // Em Node, desabilita worker (pdfjs roda sync na main thread)
  // GlobalWorkerOptions só existe no build legacy
  if ((pdfjsLib as unknown as { GlobalWorkerOptions?: { workerSrc: string } }).GlobalWorkerOptions) {
    (pdfjsLib as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc = "";
  }

  const uint8 = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({
    data: uint8,
    useWorkerFetch: false,
    useSystemFonts: true,
  });

  const doc = await loadingTask.promise;
  const pages: string[] = [];
  const warnings: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();

    // Agrupar items por linha (Y similar)
    interface TextItem {
      str: string;
      transform: number[];
    }
    const items = (content.items as unknown[]).filter(
      (it): it is TextItem =>
        typeof it === "object" && it !== null && "str" in it && "transform" in it
    );

    const lines: { y: number; parts: string[] }[] = [];
    const TOLERANCE = 2;
    items.forEach((it) => {
      const y = Math.round(it.transform[5]);
      const found = lines.find((l) => Math.abs(l.y - y) <= TOLERANCE);
      if (found) found.parts.push(it.str);
      else lines.push({ y, parts: [it.str] });
    });

    // PDF tem Y invertido (maior Y = topo). Ordena decrescente.
    lines.sort((a, b) => b.y - a.y);

    const pageText = lines
      .map((l) => l.parts.join("").trim())
      .filter(Boolean)
      .join("\n");

    if (pageText) pages.push(pageText);
  }

  if (!pages.length) {
    warnings.push("PDF sem texto extraível (possivelmente apenas imagens)");
  }

  const fullText = pages.join("\n\n");

  // Converte para HTML — cada parágrafo separado por dupla quebra
  const html = sanitizeHtml(
    fullText
      .split(/\n{2,}/)
      .map((block) => {
        const lines = block.split("\n").map(escapeHtml).filter(Boolean);
        if (lines.length === 0) return "";
        return `<p>${lines.join("<br />")}</p>`;
      })
      .filter(Boolean)
      .join("")
  );

  return { html, text: fullText, warnings };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Roteador principal — recebe um File-like (com mimeType + buffer)
 * e retorna HTML pronto pra TipTap.
 */
export async function extractText(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractResult> {
  const mt = mimeType.toLowerCase();

  if (
    mt === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mt === "application/msword"
  ) {
    return extractFromDocx(buffer);
  }

  if (mt === "application/pdf" || mt.includes("pdf")) {
    return extractFromPdf(buffer);
  }

  throw new Error(`Tipo não suportado pra extração: ${mimeType}`);
}
