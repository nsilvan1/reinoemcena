import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { getAuthedClient, listSubfolders } from "@/lib/google-drive";

// GET /api/drive/folders?parentId=xxx — lista as subpastas de uma pasta (ou da
// raiz "My Drive" se omitido). Usado para o admin escolher a pasta-raiz do
// acervo após conectar.
export async function GET(req: NextRequest) {
  const { error } = await requireRole("coordenador");
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const parentId = searchParams.get("parentId")?.trim() || "root";

  try {
    const client = await getAuthedClient();
    const folders = await listSubfolders(client, parentId);
    return NextResponse.json(
      folders.map((f) => ({ id: f.id, name: f.name }))
    );
  } catch (err) {
    console.error("[drive folders]", err);
    const msg = err instanceof Error ? err.message : "Erro ao listar pastas";
    const status = /não conectado/i.test(msg) ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
