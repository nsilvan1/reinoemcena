import type { OAuth2Client } from "google-auth-library";
import Character from "@/models/Character";
import { putUpload, deleteUpload } from "@/lib/blob-storage";
import {
  listChildren,
  downloadFile,
  isImage,
  isFolder,
  mimeToExt,
  type DriveFile,
} from "@/lib/google-drive";

/**
 * Sincronização Acervo ← Google Drive.
 *
 * Varre a árvore de pastas a partir da raiz configurada e trata cada pasta que
 * contém imagens como um PERSONAGEM. Os nomes das pastas ancestrais viram
 * traits/categorias (ex.: "PERSONAGENS RC" → trait "RC"). As imagens são
 * baixadas e reenviadas para o blob-storage; a 1ª vira capa, o resto galeria.
 *
 * Idempotente por `driveFolderId`: re-sincronizar atualiza só o que mudou
 * (compara o maior modifiedTime das imagens). Não toca em personagens manuais.
 */

export interface SyncProgress {
  type: "scan" | "import" | "done" | "error";
  /** Mensagem curta de status. */
  message?: string;
  processed?: number;
  total?: number;
  /** Nome do personagem corrente. */
  current?: string;
  summary?: SyncSummary;
}

export interface SyncSummary {
  created: number;
  updated: number;
  skipped: number;
  images: number;
  errors: number;
}

interface CharacterFolder {
  folderId: string;
  name: string;
  traits: string[];
  images: DriveFile[];
}

const MAX_GALLERY = 20;
const MAX_DEPTH = 6;

/** Normaliza o nome de uma pasta ancestral em trait. Retorna null se não servir. */
function folderToTrait(name: string): string | null {
  let t = name.trim().replace(/\s+/g, " ");
  // Remove prefixo redundante comum no acervo.
  t = t.replace(/^personagens\s+/i, "");
  // Descarta índices alfabéticos (pastas de uma letra só).
  if (t.length <= 1) return null;
  // Descarta faixas etárias soltas? Mantém — pode ser útil ("3-6 anos").
  return t.slice(0, 30);
}

function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, 80) || "Sem nome";
}

/** Varre a árvore coletando as pastas-personagem (que contêm imagens). */
async function collectCharacterFolders(
  client: OAuth2Client,
  folderId: string,
  folderName: string,
  ancestors: string[],
  depth: number,
  acc: CharacterFolder[],
  onScan: (count: number) => void
): Promise<void> {
  if (depth > MAX_DEPTH) return;

  const children = await listChildren(client, folderId);
  const images = children.filter(isImage);
  const subfolders = children.filter(isFolder);

  if (images.length > 0) {
    // Pasta-personagem: registra e NÃO recursa (consistente com o acervo).
    const traits = ancestors.map(folderToTrait).filter((t): t is string => Boolean(t));
    acc.push({
      folderId,
      name: normalizeName(folderName),
      traits: Array.from(new Set(traits)).slice(0, 10),
      images,
    });
    onScan(acc.length);
    return;
  }

  // Pasta-container: desce um nível, acrescentando o nome atual aos ancestrais.
  for (const sub of subfolders) {
    await collectCharacterFolders(
      client,
      sub.id,
      sub.name,
      [...ancestors, folderName],
      depth + 1,
      acc,
      onScan
    );
  }
}

/** Maior modifiedTime entre as imagens (assinatura para detectar mudança). */
function signature(images: DriveFile[]): string {
  return images.reduce((max, f) => (f.modifiedTime > max ? f.modifiedTime : max), "");
}

/**
 * Executa a sincronização completa, emitindo progresso via `onProgress`.
 * `rootFolderId` undefined/"root" usa o My Drive inteiro.
 */
export async function runDriveSync(
  client: OAuth2Client,
  rootFolderId: string | undefined,
  userId: string,
  onProgress: (p: SyncProgress) => void
): Promise<SyncSummary> {
  const summary: SyncSummary = { created: 0, updated: 0, skipped: 0, images: 0, errors: 0 };

  // ── Fase 1: varredura ──────────────────────────────────────────────
  onProgress({ type: "scan", message: "Varrendo pastas do Drive…" });
  const root = rootFolderId && rootFolderId !== "root" ? rootFolderId : "root";
  const folders: CharacterFolder[] = [];

  // Os filhos diretos da raiz são "containers" de topo (ex.: PERSONAGENS RC),
  // cujos nomes NÃO viram trait — a árvore real começa neles.
  const topChildren = await listChildren(client, root);
  const topFolders = topChildren.filter(isFolder);
  const topImages = topChildren.filter(isImage);

  // Imagens soltas na raiz viram um personagem "avulso" (caso raro).
  if (topImages.length > 0) {
    folders.push({ folderId: root, name: "Acervo", traits: [], images: topImages });
    onProgress({ type: "scan", processed: folders.length, message: "Varrendo…" });
  }

  for (const top of topFolders) {
    await collectCharacterFolders(client, top.id, top.name, [], 1, folders, (count) =>
      onProgress({ type: "scan", processed: count, message: `Varrendo… ${count} encontrados` })
    );
  }

  const total = folders.length;
  onProgress({ type: "scan", processed: total, total, message: `${total} personagens encontrados` });

  // ── Fase 2: importação ─────────────────────────────────────────────
  let processed = 0;
  for (const folder of folders) {
    processed++;
    onProgress({
      type: "import",
      processed,
      total,
      current: folder.name,
      message: `Importando ${folder.name}…`,
    });

    try {
      const sig = signature(folder.images);
      const existing = await Character.findOne({ driveFolderId: folder.folderId });

      // Sem mudança desde a última sync → pula (não baixa nada).
      if (existing && existing.source === "drive" && existing.driveModifiedTime === sig) {
        summary.skipped++;
        continue;
      }

      // Baixa e re-hospeda as imagens (cover + galeria, até MAX_GALLERY+1).
      const urls: string[] = [];
      for (const img of folder.images.slice(0, MAX_GALLERY + 1)) {
        try {
          const buf = await downloadFile(client, img.id);
          const ext = mimeToExt(img.mimeType);
          const url = await putUpload(buf, {
            prefix: "char",
            ext,
            contentType: img.mimeType,
          });
          urls.push(url);
          summary.images++;
        } catch (err) {
          console.error(`[sync] download ${img.name}`, err);
          summary.errors++;
        }
      }

      if (urls.length === 0) {
        summary.errors++;
        continue;
      }

      const [cover, ...rest] = urls;
      const gallery = rest.slice(0, MAX_GALLERY);

      if (existing) {
        // Atualiza, removendo as imagens antigas do blob para não acumular.
        const old = [existing.coverImageUrl, ...(existing.gallery ?? [])].filter(
          (u): u is string => Boolean(u)
        );
        existing.name = folder.name;
        existing.traits = folder.traits;
        existing.coverImageUrl = cover;
        existing.gallery = gallery;
        existing.driveModifiedTime = sig;
        existing.source = "drive";
        await existing.save();
        await Promise.all(old.map((u) => deleteUpload(u)));
        summary.updated++;
      } else {
        await Character.create({
          name: folder.name,
          description: "",
          traits: folder.traits,
          coverImageUrl: cover,
          gallery,
          createdBy: userId,
          source: "drive",
          driveFolderId: folder.folderId,
          driveModifiedTime: sig,
        });
        summary.created++;
      }
    } catch (err) {
      console.error(`[sync] ${folder.name}`, err);
      summary.errors++;
    }
  }

  onProgress({ type: "done", summary });
  return summary;
}
