import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Roteiro from "@/models/Roteiro";
import Scale from "@/models/Scale";
import { requireAuth } from "@/lib/auth-helpers";
import { notifyMany } from "@/lib/notifications";

type Params = { params: Promise<{ id: string }> };

// GET /api/roteiros/[id]
export async function GET(req: NextRequest, { params }: Params) {
  const { error } = await requireAuth();
  if (error) return error;

  await connectDB();
  const { id } = await params;
  const roteiro = await Roteiro.findById(id)
    .populate("createdBy", "name username")
    .populate("assignedEditors assignedNarrators", "name username avatar");

  if (!roteiro) return NextResponse.json({ error: "Roteiro não encontrado" }, { status: 404 });
  return NextResponse.json(roteiro);
}

// PUT /api/roteiros/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  const { error, user } = await requireAuth();
  if (error) return error;

  if (!["admin", "coordenador", "roteirista"].includes(user.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  await connectDB();
  const { id } = await params;
  const body = await req.json();

  const roteiro = await Roteiro.findById(id);
  if (!roteiro) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  // Roteirista só edita o próprio
  if (user.role === "roteirista" && roteiro.createdBy.toString() !== user.id) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  // Notificar se novos editores/narradores foram atribuídos
  const newEditors = (body.assignedEditors || []).filter(
    (id: string) => !roteiro.assignedEditors.map((e: any) => e.toString()).includes(id)
  );
  const newNarrators = (body.assignedNarrators || []).filter(
    (id: string) => !roteiro.assignedNarrators.map((n: any) => n.toString()).includes(id)
  );

  if (newEditors.length > 0) {
    await notifyMany(
      newEditors,
      `Você foi atribuído como editor no roteiro "${roteiro.title}"`,
      "roteiro",
      `/roteiros/${id}`
    );
  }
  if (newNarrators.length > 0) {
    await notifyMany(
      newNarrators,
      `Você foi atribuído como narrador no roteiro "${roteiro.title}"`,
      "roteiro",
      `/roteiros/${id}`
    );
  }

  const updated = await Roteiro.findByIdAndUpdate(id, body, { new: true })
    .populate("createdBy", "name")
    .populate("assignedEditors assignedNarrators", "name avatar");

  // Vincular roteiro na escala se ainda não estiver
  if (body.scaleId && body.weekNumber) {
    await Scale.updateOne(
      { _id: body.scaleId, "weeks.number": body.weekNumber },
      { $set: { "weeks.$.roteiro": id } }
    );
  }

  return NextResponse.json(updated);
}

// DELETE /api/roteiros/[id]
export async function DELETE(req: NextRequest, { params }: Params) {
  const { error } = await requireAuth();
  if (error) return error;

  await connectDB();
  const { id } = await params;
  await Roteiro.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
