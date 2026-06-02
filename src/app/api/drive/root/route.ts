import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DriveConnection from "@/models/DriveConnection";
import { requireRole } from "@/lib/auth-helpers";

// POST /api/drive/root — define a pasta-raiz do acervo no Drive.
// Body: { folderId: string | null, folderName?: string }. null = raiz do Drive.
export async function POST(req: NextRequest) {
  const { error } = await requireRole("coordenador");
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const folderId: string | null =
    body.folderId === null || body.folderId === "" ? null : String(body.folderId).trim();
  const folderName: string | undefined =
    body.folderName !== undefined ? String(body.folderName).trim().slice(0, 200) : undefined;

  await connectDB();
  const conn = await DriveConnection.findOne({ key: "default" });
  if (!conn) {
    return NextResponse.json({ error: "Google Drive não conectado" }, { status: 409 });
  }

  conn.rootFolderId = folderId ?? undefined;
  conn.rootFolderName = folderId ? folderName : undefined;
  await conn.save();

  return NextResponse.json({
    rootFolderId: conn.rootFolderId ?? null,
    rootFolderName: conn.rootFolderName ?? null,
  });
}
