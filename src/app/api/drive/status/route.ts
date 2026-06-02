import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { getConnection, isDriveConfigured } from "@/lib/google-drive";

// GET /api/drive/status — estado da conexão para a UI do Acervo.
export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const conn = await getConnection();

  return NextResponse.json({
    configured: isDriveConfigured(),
    connected: Boolean(conn),
    accountEmail: conn?.accountEmail ?? null,
    rootFolderId: conn?.rootFolderId ?? null,
    rootFolderName: conn?.rootFolderName ?? null,
    lastSyncedAt: conn?.lastSyncedAt ?? null,
    lastSyncSummary: conn?.lastSyncSummary ?? null,
  });
}
