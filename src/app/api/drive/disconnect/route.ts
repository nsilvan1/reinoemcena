import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DriveConnection from "@/models/DriveConnection";
import { requireRole } from "@/lib/auth-helpers";

// DELETE /api/drive/disconnect — remove a conexão. Não apaga os personagens
// já importados (eles continuam no acervo); apenas desliga a sincronização.
export async function DELETE() {
  const { error } = await requireRole("admin");
  if (error) return error;

  await connectDB();
  await DriveConnection.deleteOne({ key: "default" });

  return NextResponse.json({ ok: true });
}
