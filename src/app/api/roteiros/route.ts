import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Roteiro from "@/models/Roteiro";
import Scale from "@/models/Scale";
import { requireAuth } from "@/lib/auth-helpers";

// GET /api/roteiros
export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  await connectDB();
  const { searchParams } = new URL(req.url);
  const scaleId = searchParams.get("scaleId");

  const filter: any = {};
  if (scaleId) filter.scaleId = scaleId;

  const roteiros = await Roteiro.find(filter)
    .populate("createdBy", "name")
    .populate("assignedEditors assignedNarrators", "name avatar")
    .sort({ createdAt: -1 });

  return NextResponse.json(roteiros);
}

// POST /api/roteiros
export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error) return error;

  // Roteirista, coordenador ou admin podem criar
  if (!["admin", "coordenador", "roteirista"].includes(user.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  await connectDB();
  const body = await req.json();

  const roteiro = await Roteiro.create({
    title: body.title,
    content: body.content || "",
    fileUrl: body.fileUrl,
    scaleId: body.scaleId,
    weekNumber: body.weekNumber,
    createdBy: user.id,
    assignedEditors: body.assignedEditors || [],
    assignedNarrators: body.assignedNarrators || [],
  });

  // Vincular roteiro na semana da escala
  if (body.scaleId && body.weekNumber) {
    await Scale.updateOne(
      { _id: body.scaleId, "weeks.number": body.weekNumber },
      { $set: { "weeks.$.roteiro": roteiro._id } }
    );
  }

  return NextResponse.json(roteiro, { status: 201 });
}
