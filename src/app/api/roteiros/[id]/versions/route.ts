import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Roteiro from "@/models/Roteiro";
import RoteiroVersion from "@/models/RoteiroVersion";
import { requireAuth } from "@/lib/auth-helpers";
import { canEditRoteiro } from "@/lib/roteiro-permissions";

type Params = { params: Promise<{ id: string }> };

// GET /api/roteiros/[id]/versions
export async function GET(req: NextRequest, { params }: Params) {
  const { error, user } = await requireAuth();
  if (error) return error;

  await connectDB();
  const { id } = await params;

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const roteiro = await Roteiro.findById(id).select("createdBy scaleId weekNumber");
  if (!roteiro) {
    return NextResponse.json({ error: "Roteiro não encontrado" }, { status: 404 });
  }

  // Mesma regra de edição: só quem pode editar enxerga o histórico
  const allowed = await canEditRoteiro(roteiro, user.id, user.role);
  if (!allowed) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const versions = await RoteiroVersion.find({ roteiroId: id })
    .populate("snapshotBy", "name")
    .sort({ createdAt: -1 })
    .limit(100);

  return NextResponse.json(versions);
}
