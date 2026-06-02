import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DriveConnection from "@/models/DriveConnection";
import { requireRole } from "@/lib/auth-helpers";
import { getAuthedClient, getConnection } from "@/lib/google-drive";
import { runDriveSync, type SyncProgress } from "@/lib/drive-sync";

// Sync pode demorar (baixa muitas imagens). Sem limite curto de execução.
export const maxDuration = 300;

// POST /api/drive/sync — sincroniza o acervo a partir do Drive, transmitindo
// o progresso como NDJSON (uma linha JSON por evento). Coordenador+.
export async function POST() {
  const { error, user } = await requireRole("coordenador");
  if (error) return error;

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
