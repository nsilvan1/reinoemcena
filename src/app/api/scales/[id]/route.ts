import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Scale from "@/models/Scale";
import Roteiro from "@/models/Roteiro";
import TaskProgress from "@/models/TaskProgress";
import Comment from "@/models/Comment";
import "@/models/User";
import { requireAuth, requireRole } from "@/lib/auth-helpers";

const MONTH_REGEX = /^\d{4}-\d{2}$/;

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

  const { title, month, weeks } = body;

  if (month !== undefined && !MONTH_REGEX.test(month)) {
    return NextResponse.json({ error: "Mês deve estar no formato AAAA-MM" }, { status: 400 });
  }

  const updateData: { title?: string; month?: string; weeks?: unknown } = {};
  if (title !== undefined) updateData.title = title;
  if (month !== undefined) updateData.month = month;
  if (weeks !== undefined) updateData.weeks = weeks;

  const scale = await Scale.findByIdAndUpdate(id, { $set: updateData }, { new: true });
  if (!scale) return NextResponse.json({ error: "Escala não encontrada" }, { status: 404 });

  return NextResponse.json(scale);
}

// DELETE /api/scales/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole("admin");
  if (error) return error;

  await connectDB();
  const { id } = await params;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const scale = await Scale.findById(id).session(session);
      if (!scale) throw new Error("NOT_FOUND");

      await Roteiro.deleteMany({ scaleId: id }).session(session);
      await TaskProgress.deleteMany({ scaleId: id }).session(session);
      await Comment.deleteMany({ scaleId: id }).session(session);
      await Scale.findByIdAndDelete(id).session(session);
    });
  } catch (err: unknown) {
    await session.endSession();
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Escala não encontrada" }, { status: 404 });
    }
    console.error("[DELETE /api/scales/[id]]", err);
    return NextResponse.json({ error: "Erro interno ao excluir escala" }, { status: 500 });
  }

  await session.endSession();
  return NextResponse.json({ success: true });
}
