import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Roteiro from "@/models/Roteiro";
import { requireRole } from "@/lib/auth-helpers";
import { canEditRoteiro } from "@/lib/roteiro-permissions";
import { deleteUpload } from "@/lib/blob-storage";

type Params = { params: Promise<{ id: string; fileId: string }> };

// DELETE /api/roteiros/[id]/files/[fileId]
export async function DELETE(req: NextRequest, { params }: Params) {
  const { error, user } = await requireRole("roteirista");
  if (error) return error;

  await connectDB();
  const { id, fileId } = await params;

  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(fileId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const roteiro = await Roteiro.findById(id);
  if (!roteiro) {
    return NextResponse.json({ error: "Roteiro não encontrado" }, { status: 404 });
  }

  const allowed = await canEditRoteiro(roteiro, user.id, user.role);
  if (!allowed) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  interface FileSubdoc {
    _id: mongoose.Types.ObjectId;
    url: string;
  }

  const file = (roteiro.files as FileSubdoc[]).find(
    (f) => f._id.toString() === fileId
  );
  if (!file) {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }

  const removedUrl = file.url;
  roteiro.files = (roteiro.files as FileSubdoc[]).filter(
    (f) => f._id.toString() !== fileId
  );

  // Se o fileUrl principal apontava pra esse, repromove o primeiro restante (ou limpa)
  if (roteiro.fileUrl === removedUrl) {
    roteiro.fileUrl = roteiro.files[0]?.url || undefined;
  }

  await roteiro.save();
  await deleteUpload(removedUrl);

  return NextResponse.json({ ok: true });
}
