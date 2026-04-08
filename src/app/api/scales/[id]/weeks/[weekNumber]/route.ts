import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Scale from "@/models/Scale";
import TaskProgress from "@/models/TaskProgress";
import { requireAuth, requireRole } from "@/lib/auth-helpers";
import { notifyMany } from "@/lib/notifications";
import { WeekStatus, WEEK_STATUS_ORDER } from "@/types";

type Params = { params: Promise<{ id: string; weekNumber: string }> };

// PUT /api/scales/[id]/weeks/[weekNumber] — atualizar semana
export async function PUT(req: NextRequest, { params }: Params) {
  const { error, user } = await requireAuth();
  if (error) return error;

  await connectDB();
  const { id, weekNumber } = await params;
  const body = await req.json();
  const wNum = parseInt(weekNumber);

  const scale = await Scale.findById(id);
  if (!scale) return NextResponse.json({ error: "Escala não encontrada" }, { status: 404 });

  const weekIdx = scale.weeks.findIndex((w: any) => w.number === wNum);
  if (weekIdx === -1) return NextResponse.json({ error: "Semana não encontrada" }, { status: 404 });

  // Atualizar campos da semana
  if (body.theme) scale.weeks[weekIdx].theme = body.theme;
  if (body.deadline) scale.weeks[weekIdx].deadline = body.deadline;
  if (body.assignments) scale.weeks[weekIdx].assignments = body.assignments;
  if (body.roteiro) scale.weeks[weekIdx].roteiro = body.roteiro;

  // Mudar status manualmente (revisão → reprovar volta fase)
  if (body.status) {
    scale.weeks[weekIdx].status = body.status;
  }

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

  const scale = await Scale.findById(id);
  if (!scale) return NextResponse.json({ error: "Escala não encontrada" }, { status: 404 });

  const week = scale.weeks.find((w: any) => w.number === wNum);
  if (!week) return NextResponse.json({ error: "Semana não encontrada" }, { status: 404 });

  // Roteirista só pode concluir se existe roteiro vinculado
  if (body.role === "roteirista" && !week.roteiro) {
    return NextResponse.json({ error: "Crie e vincule um roteiro antes de concluir" }, { status: 400 });
  }

  // Marcar progresso do usuário
  const progress = await TaskProgress.findOneAndUpdate(
    { scaleId: id, weekNumber: wNum, userId: user.id, role: body.role },
    {
      completed: body.completed ?? true,
      completedAt: body.completed !== false ? new Date() : undefined,
      notes: body.notes,
      linkUrl: body.linkUrl,
    },
    { upsert: true, new: true }
  );

  // Verificar se todos da fase atual completaram
  if (body.completed !== false) {
    const currentStatus = week.status as WeekStatus;
    const roleMap: Record<string, string[]> = {
      roteiro: ["roteirista"],
      gravacao: ["narrador"],
      edicao: ["editor"],
    };

    const rolesForPhase = roleMap[currentStatus];
    if (rolesForPhase) {
      const allProgress = await TaskProgress.find({
        scaleId: id,
        weekNumber: wNum,
        role: { $in: rolesForPhase },
      });

      // Contar membros atribuídos para essa fase
      let assignedIds: string[] = [];
      if (currentStatus === "roteiro") {
        assignedIds = week.assignments.roteiristas.map((id: any) => id.toString());
      } else if (currentStatus === "gravacao") {
        assignedIds = week.assignments.narradores.map((id: any) => id.toString());
      } else if (currentStatus === "edicao") {
        assignedIds = week.assignments.editores.map((id: any) => id.toString());
      }

      const completedIds = allProgress
        .filter((p) => p.completed)
        .map((p) => p.userId.toString());

      const allDone = assignedIds.every((id) => completedIds.includes(id));

      if (allDone && assignedIds.length > 0) {
        // Avançar para próxima fase
        const currentIdx = WEEK_STATUS_ORDER.indexOf(currentStatus);
        if (currentIdx < WEEK_STATUS_ORDER.length - 1) {
          const nextStatus = WEEK_STATUS_ORDER[currentIdx + 1];
          week.status = nextStatus;
          await scale.save();

          // Notificar próxima equipe
          let nextUserIds: string[] = [];
          if (nextStatus === "gravacao") {
            nextUserIds = week.assignments.narradores.map((id: any) => id.toString());
          } else if (nextStatus === "edicao") {
            nextUserIds = week.assignments.editores.map((id: any) => id.toString());
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

  return NextResponse.json(progress);
}
