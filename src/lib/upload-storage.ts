import { unlink } from "fs/promises";
import path from "path";

// Remove um arquivo dentro de public/uploads pela URL relativa "/uploads/xxx".
// Silencia ENOENT (arquivo já removido). Loga outros erros sem propagar.
export async function unlinkUploadedFile(url: string | null | undefined): Promise<void> {
  if (!url || typeof url !== "string") return;
  if (!url.startsWith("/uploads/")) return; // só toca em arquivos locais nossos

  try {
    const basename = path.basename(url);
    const filePath = path.join(process.cwd(), "public", "uploads", basename);
    await unlink(filePath);
  } catch (err: unknown) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code !== "ENOENT") {
      console.error("[unlinkUploadedFile] erro:", err);
    }
  }
}
