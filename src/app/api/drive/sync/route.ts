import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DriveConnection from "@/models/DriveConnection";
import { requireRole } from "@/lib/auth-helpers";
import { getAuthedClient, getConnection } from "@/lib/google-drive";
import { runDriveSync, type SyncProgress } from "@/lib/drive-sync";
import { isBlobConfigured } from "@/lib/blob-storage";

// Sync pode demorar (baixa muitas imagens). Sem limite curto de execução.
export const maxDuration = 300;

// POST /api/drive/sync — sincroniza o acervo a partir do Drive, transmitindo
// o progresso como NDJSON (uma linha JSON por evento). Coordenador+.
export async function POST() {
  const { error, user } = await requireRole("coordenador");
  if (error) return error;

  // Na Vercel o filesystem é somente-leitura: sem o Vercel Blob, todo upload
  // de imagem falharia silenciosamente e nenhum personagem seria criado.
  // Avisa de forma clara em vez de "achar tudo e não salvar nada".
  if (process.env.VERCEL && !isBlobConfigured()) {
    return NextResponse.json(
      {
        error:
          "Storage não configurado. Crie o Vercel Blob (Storage → Blob) para sincronizar em produção, ou rode a sincronização pelo localhost.",
      },
      { status: 503 }
    );
  }

  const conn = await getConnection();
  if (!conn) {
    return NextResponse.json({ error: "Google Drive não conectado" }, { status: 409 });
  }

  const encoder = new TextEncoder();
  const rootFolderId = conn.rootFolderId;
  const userId = user.id;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (p: SyncProgress) => {
        controller.enqueue(encoder.encode(JSON.stringify(p) + "\n"));
      };

      try {
        const client = await getAuthedClient();
        const summary = await runDriveSync(client, rootFolderId, userId, send);

        // Persiste o resultado na conexão.
        await connectDB();
        await DriveConnection.updateOne(
          { key: "default" },
          {
            $set: {
              lastSyncedAt: new Date(),
              lastSyncSummary: {
                created: summary.created,
                updated: summary.updated,
                images: summary.images,
                errors: summary.errors,
              },
            },
          }
        );
      } catch (err) {
        console.error("[drive sync]", err);
        const message = err instanceof Error ? err.message : "Erro na sincronização";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
