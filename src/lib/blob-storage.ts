import crypto from "crypto";
import path from "path";
import { writeFile, mkdir, unlink } from "fs/promises";
import { del, put } from "@vercel/blob";

/**
 * Camada de storage unificada para uploads.
 *
 * Em produção (com BLOB_READ_WRITE_TOKEN no env), envia para o Vercel Blob e
 * devolve a URL HTTPS pública. Em dev local (sem o token) cai para
 * `public/uploads/...` igual antes — preserva o fluxo histórico.
 *
 * Os modelos guardam a URL retornada como `url`/`fileUrl`. Pode coexistir URL
 * relativa (`/uploads/xxx`) e absoluta (`https://...blob.vercel-storage.com/...`)
 * sem mudança no consumidor.
 */

function hasBlob(): boolean {
  return typeof process.env.BLOB_READ_WRITE_TOKEN === "string" && process.env.BLOB_READ_WRITE_TOKEN.length > 0;
}

interface PutOptions {
  /** Prefixo opcional no nome do arquivo (ex.: "char", "aud", "vid"). */
  prefix?: string;
  /** Extensão sem o ponto (ex.: "jpg"). */
  ext: string;
  /** MIME a ser usado quando subir para o Blob. */
  contentType: string;
}

/** Sobe `bytes` e retorna a URL final (https em prod, /uploads/... em dev). */
export async function putUpload(bytes: ArrayBuffer | Buffer, opts: PutOptions): Promise<string> {
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const safeExt = opts.ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
  const prefix = (opts.prefix || "u").replace(/[^a-z0-9-]/gi, "");
  const name = `${prefix}-${crypto.randomUUID()}.${safeExt}`;

  if (hasBlob()) {
    const blob = await put(name, buf, {
      access: "public",
      contentType: opts.contentType,
      addRandomSuffix: false,
    });
    return blob.url;
  }

  // Fallback: filesystem local
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buf);
  return `/uploads/${name}`;
}

/**
 * Remove o arquivo apontado pela URL — funciona para ambos os formatos
 * (relativo `/uploads/...` e absoluto `https://...blob.vercel-storage.com/...`).
 * Silencia erros de "não encontrado".
 */
export async function deleteUpload(url: string | null | undefined): Promise<void> {
  if (!url || typeof url !== "string") return;

  // Blob remoto
  if (/^https?:\/\//i.test(url) && hasBlob()) {
    try {
      await del(url);
    } catch (err: unknown) {
      const e = err as { message?: string };
      if (!/not\s*found/i.test(e?.message || "")) {
        console.error("[deleteUpload blob] erro:", err);
      }
    }
    return;
  }

  // Local
  if (url.startsWith("/uploads/")) {
    try {
      const basename = path.basename(url);
      const filePath = path.join(process.cwd(), "public", "uploads", basename);
      await unlink(filePath);
    } catch (err: unknown) {
      const nodeErr = err as NodeJS.ErrnoException;
      if (nodeErr.code !== "ENOENT") {
        console.error("[deleteUpload local] erro:", err);
      }
    }
  }
}

/** Verdadeiro quando o storage remoto está configurado. */
export function isBlobConfigured(): boolean {
  return hasBlob();
}
