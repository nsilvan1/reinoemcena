import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Roteiro from "@/models/Roteiro";
import RoteiroVersion from "@/models/RoteiroVersion";
import { requireAuth } from "@/lib/auth-helpers";
import { canEditRoteiro } from "@/lib/roteiro-permissions";

type Params = { params: Promise<{ id: string; versionId: string }> };

// POST /api/roteiros/[id]/versions/[versionId]/restore
// Snapshota o estado atual antes de aplicar a versão escolhida, para não perder
// o conteúdo "vivo" caso o usuário queira voltar.
export async function POST(req: NextRequest, { params }: Params) {
  const { error, user } = await requireAuth();
  if (error) return error;

  await connectDB();
  const { id, versionId } = await params;

  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(versionId)) {
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

  const version = await RoteiroVersion.findOne({ _id: versionId, roteiroId: id });
  if (!version) {
    return NextResponse.json({ error: "Versão não encontrada" }, { status: 404 });
  }

  await RoteiroVersion.create({
    roteiroId: roteiro._id,
    title: roteiro.title,
    content: roteiro.content || "",
    snapshotBy: user.id,
  });

  const updated = await Roteiro.findByIdAndUpdate(
    id,
    { title: version.title, content: version.content },
    { new: true }
  )
    .populate("createdBy", "name")
    .populate("assignedEditors assignedNarrators", "name avatar");

  return NextResponse.json(updated);
}
