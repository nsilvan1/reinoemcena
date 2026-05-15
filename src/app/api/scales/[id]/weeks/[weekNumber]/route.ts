import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Scale from "@/models/Scale";
import TaskProgress from "@/models/TaskProgress";
import { requireAuth, requireRole } from "@/lib/auth-helpers";
import { notifyMany } from "@/lib/notifications";
import { WeekStatus, WEEK_STATUS_ORDER } from "@/types";

type Params = { params: Promise<{ id: string; weekNumber: string }> };

const VALID_STATUSES: WeekStatus[] = ["roteiro", "gravacao", "edicao", "revisao", "concluido"];
const VALID_ROLES = ["roteirista", "narrador", "editor"] as const;
type ProgressRole = (typeof VALID_ROLES)[number];

const LINK_REGEX = /^https?:\/\//;

// PUT /api/scales/[id]/weeks/[weekNumber] — atualizar semana (coordenador+)
export async function PUT(req: NextRequest, { params }: Params) {
  const { error } = await requireRole("coordenador");
  if (error) return error;

  await connectDB();
  const { id, weekNumber } = await params;
  const body = await req.json();
  const wNum = parseInt(weekNumber);

  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json(
      { error: `Status inválido. Valores aceitos: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const scale = await Scale.findById(id);
  if (!scale) return NextResponse.json({ error: "Escala não encontrada" }, { status: 404 });

  const weekIdx = scale.weeks.findIndex((w: { number: number }) => w.number === wNum);
  if (weekIdx === -1) return NextResponse.json({ error: "Semana não encontrada" }, { status: 404 });

  if (body.theme !== undefined) scale.weeks[weekIdx].theme = body.theme;
  if (body.deadline !== undefined) scale.weeks[weekIdx].deadline = body.deadline;
  if (body.assignments !== undefined) scale.weeks[weekIdx].assignments = body.assignments;
  if (body.status !== undefined) scale.weeks[weekIdx].status = body.status;

  await scale.save();
  return NextResponse.json(scale.weeks[weekIdx]);
}

// POST /api/scales/[id]/weeks/[weekNumber] — marcar progresso individual
export async function POST(req: NextRequest, { params }: Params) {
  const { error, user } = await requireAuth();
  if (error) return error;

  await connectDB();
  const { id, weekNumber } = await params;
  const body = await req.json();
  const wNum = parseInt(weekNumber);

  const role: ProgressRole = body.role;
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json(
      { error: `Papel inválido. Valores aceitos: ${VALID_ROLES.join(", ")}` },
      { status: 400 }
    );
  }

  if (body.linkUrl !== undefined && body.linkUrl !== null && body.linkUrl !== "") {
    if (!LINK_REGEX.test(body.linkUrl)) {
      return NextResponse.json({ error: "linkUrl deve começar com http:// ou https://" }, { status: 400 });
    }
  }

  const notes: string | undefined =
    body.notes !== undefined ? String(body.notes).trim().slice(0, 2000) : undefined;

  const scale = await Scale.findById(id);
  if (!scale) return NextResponse.json({ error: "Escala não encontrada" }, { status: 404 });

  const week = scale.weeks.find((w: { number: number }) => w.number === wNum);
  if (!week) return NextResponse.json({ error: "Semana não encontrada" }, { status: 404 });

  // Verificar se o usuário está atribuído ao papel informado
  const assignmentKey = role === "roteirista" ? "roteiristas" : role === "narrador" ? "narradores" : "editores";
  const assignedIds: string[] = week.assignments[assignmentKey].map((uid: { toString(): string }) => uid.toString());

  if (!assignedIds.includes(user.id)) {
    return NextResponse.json({ error: "Você não está atribuído a este papel nesta semana" }, { status: 403 });
  }

  // Roteirista só pode concluir se existe roteiro vinculado
  if (role === "roteirista" && !week.roteiro) {
    return NextResponse.json({ error: "Crie e vincule um roteiro antes de concluir" }, { status: 400 });
  }

  const session = await mongoose.startSession();
  let progress: unknown;

  try {
    await session.withTransaction(async () => {
      progress = await TaskProgress.findOneAndUpdate(
        { scaleId: id, weekNumber: wNum, userId: user.id, role },
        {
          completed: body.completed ?? true,
          completedAt: body.completed !== false ? new Date() : undefined,
          notes,
          linkUrl: body.linkUrl,
        },
        { upsert: true, new: true, session }
      );

      if (body.completed !== false) {
        const currentStatus = week.status as WeekStatus;
        const roleMap: Record<string, string[]> = {
          roteiro: ["roteirista"],
          gravacao: ["narrador"],
          edicao: ["editor"],
        };

        const rolesForPhase = roleMap[currentStatus];
        if (rolesForPhase) {
          let phaseAssignedIds: string[] = [];
          if (currentStatus === "roteiro") {
            phaseAssignedIds = week.assignments.roteiristas.map((uid: { toString(): string }) => uid.toString());
          } else if (currentStatus === "gravacao") {
            phaseAssignedIds = week.assignments.narradores.map((uid: { toString(): string }) => uid.toString());
          } else if (currentStatus === "edicao") {
            phaseAssignedIds = week.assignments.editores.map((uid: { toString(): string }) => uid.toString());
          }

          const completedProgress = await TaskProgress.find(
            {
              scaleId: id,
              weekNumber: wNum,
              role: { $in: rolesForPhase },
              completed: true,
            },
            null,
            { session }
          );

          const completedIds = completedProgress.map((p: { userId: { toString(): string } }) => p.userId.toString());
          const allDone = phaseAssignedIds.length > 0 && phaseAssignedIds.every((uid) => completedIds.includes(uid));

          if (allDone) {
            const currentIdx = WEEK_STATUS_ORDER.indexOf(currentStatus);
            if (currentIdx < WEEK_STATUS_ORDER.length - 1) {
              const nextStatus = WEEK_STATUS_ORDER[currentIdx + 1];
              week.status = nextStatus;
              await scale.save({ session });

              let nextUserIds: string[] = [];
              if (nextStatus === "gravacao") {
                nextUserIds = week.assignments.narradores.map((uid: { toString(): string }) => uid.toString());
              } else if (nextStatus === "edicao") {
                nextUserIds = week.assignments.editores.map((uid: { toString(): string }) => uid.toString());
              }

              if (nextUserIds.length > 0) {
                await notifyMany(
                  nextUserIds,
                  `Semana ${wNum} "${week.theme}" está pronta para ${nextStatus}!`,
                  "status",
                  `/escalas/${id}`
                );
              }
            }
          }
        }
      }
    });
  } catch (err: unknown) {
    await session.endSession();
    console.error("[POST /api/scales/[id]/weeks/[weekNumber]]", err);
    return NextResponse.json({ error: "Erro interno ao registrar progresso" }, { status: 500 });
  }

  await session.endSession();
  return NextResponse.json(progress);
}
