import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Scale from "@/models/Scale";
import "@/models/Roteiro";
import "@/models/User";
import { requireAuth, requireRole } from "@/lib/auth-helpers";

// GET /api/scales/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;

  await connectDB();
  const { id } = await params;
  const scale = await Scale.findById(id)
    .populate("weeks.assignments.roteiristas weeks.assignments.editores weeks.assignments.narradores", "name username avatar skills")
    .populate("weeks.roteiro")
    .populate("createdBy", "name");

  if (!scale) return NextResponse.json({ error: "Escala não encontrada" }, { status: 404 });
  return NextResponse.json(scale);
}

// PUT /api/scales/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole("coordenador");
  if (error) return error;

  await connectDB();
  const { id } = await params;
  const body = await req.json();

  const scale = await Scale.findByIdAndUpdate(id, body, { new: true });
  if (!scale) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });

  return NextResponse.json(scale);
}

// DELETE /api/scales/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole("admin");
  if (error) return error;

  await connectDB();
  const { id } = await params;
  await Scale.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
