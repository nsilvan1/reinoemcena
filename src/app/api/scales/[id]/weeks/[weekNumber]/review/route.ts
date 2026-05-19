import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Scale from "@/models/Scale";
import TaskProgress from "@/models/TaskProgress";
import { requireRole } from "@/lib/auth-helpers";
import { createNotification } from "@/lib/notifications";
import type { ReviewStatus } from "@/models/TaskProgress";

type Params = { params: Promise<{ id: string; weekNumber: string }> };

const VALID_STATUSES: ReviewStatus[] = ["pending", "approved", "rejected"];

// POST /api/scales/[id]/weeks/[weekNumber]/review — coordenador+ aprova ou
// rejeita o vídeo de um editor específico. Auto-avança a semana para
// "concluido" se todos os editores atribuídos foram aprovados.
export async function POST(req: NextRequest, { params }: Params) {
  const { error, user } = await requireRole("coordenador");
  if (error) return error;

  const { id, weekNumber } = await params;
  const wNum = parseInt(weekNumber, 10);

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "scaleId inválido" }, { status: 400 });
  }
  if (!Number.isFinite(wNum) || wNum < 1) {
    return NextResponse.json({ error: "weekNumber inválido" }, { status: 400 });
  }

  const body = await req.json();
  const editorId: string | undefined = body.editorId;
  const status: ReviewStatus | undefined = body.status;
  const reason: string | undefined =
    body.reason !== undefined ? String(body.reason).trim().slice(0, 1000) : undefined;

  if (!editorId || !mongoose.isValidObjectId(editorId)) {
    return NextResponse.json({ error: "editorId inválido" }, { status: 400 });
  }
  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `status inválido (use ${VALID_STATUSES.join(", ")})` },
      { status: 400 }
    );
  }
  if (status === "rejected" && !reason) {
    return NextResponse.json({ error: "Motivo é obrigatório ao rejeitar" }, { status: 400 });
  }

  await connectDB();

  const scale = await Scale.findById(id);
  if (!scale) {
    return NextResponse.json({ error: "Escala não encontrada" }, { status: 404 });
  }
  const week = scale.weeks.find((w: { number: number }) => w.number === wNum);
  if (!week) {
    return NextResponse.json({ error: "Semana não encontrada" }, { status: 404 });
  }

  const isEditor = week.assignments?.editores?.some(
    (uid: { toString(): string }) => uid.toString() === editorId
  );
  if (!isEditor) {
    return NextResponse.json(
      { error: "Editor não está atribuído a essa semana" },
      { status: 400 }
    );
  }

  const setUpdate: Record<string, unknown> = {
    reviewStatus: status,
    reviewedAt: new Date(),
    reviewedBy: user.id,
    reviewReason: status === "rejected" ? reason : undefined,
  };
  const ops: Record<string, unknown> = { $set: setUpdate };
  if (status === "rejected") {
    ops.$inc = { rejectionCount: 1 };
  }

  const progress = await TaskProgress.findOneAndUpdate(
    { scaleId: id, weekNumber: wNum, userId: editorId, role: "editor" },
    ops,
    { upsert: true, new: true }
  ).populate("userId", "name").populate("reviewedBy", "name");

  // Notifica editor
  const editorName = (progress.userId as unknown as { name?: string })?.name || "Editor";
  const reviewerName = (user as unknown as { name?: string }).name || "Revisor";
  let message: string;
  if (status === "approved") {
    message = `${reviewerName} aprovou seu vídeo da Semana ${wNum} "${week.theme}"`;
  } else if (status === "rejected") {
    message = `${reviewerName} solicitou ajustes no seu vídeo da Semana ${wNum}: ${reason}`;
  } else {
    message = `Revisão da Semana ${wNum} foi resetada para você`;
  }
  await createNotification(editorId, message, "revisao", `/escalas/${id}`).catch((err) => {
    console.error("[review notify]", err);
  });

  // Auto-advance pra concluído se TODOS aprovados
  if (status === "approved" && week.status === "revisao") {
    const editorIds: string[] = week.assignments.editores.map(
      (uid: { toString(): string }) => uid.toString()
    );
    if (editorIds.length > 0) {
      const approved = await TaskProgress.countDocuments({
        scaleId: id,
        weekNumber: wNum,
        role: "editor",
        userId: { $in: editorIds },
        reviewStatus: "approved",
      });
      if (approved === editorIds.length) {
        week.status = "concluido";
        week.completedAt = new Date();
        await scale.save();
      }
    }
  }

  return NextResponse.json({ progress, weekStatus: scale.weeks.find((w: { number: number }) => w.number === wNum)?.status });
}
