import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Scale from "@/models/Scale";
import TaskProgress from "@/models/TaskProgress";
import Notification from "@/models/Notification";
import "@/models/User";
import { requireAuth } from "@/lib/auth-helpers";
import { ROLE_HIERARCHY, type Role, type WeekStatus } from "@/types";

interface PendingTask {
  scaleId: string;
  scaleTitle: string;
  weekNumber: number;
  theme: string;
  status: WeekStatus;
  deadline: string;
  role: "roteirista" | "narrador" | "editor";
  hint: string;
  reviewStatus?: "pending" | "approved" | "rejected";
  reviewReason?: string;
}

interface PendingReview {
  scaleId: string;
  scaleTitle: string;
  weekNumber: number;
  theme: string;
  editorId: string;
  editorName: string;
  reviewStatus: "pending" | "approved" | "rejected";
}

interface UpcomingDeadline {
  scaleId: string;
  scaleTitle: string;
  weekNumber: number;
  theme: string;
  status: WeekStatus;
  deadline: string;
  daysRemaining: number;
  overdue: boolean;
}

const STATUS_TO_ROLE: Record<string, "roteirista" | "narrador" | "editor"> = {
  roteiro: "roteirista",
  gravacao: "narrador",
  edicao: "editor",
};

const ASSIGN_KEY_FOR_ROLE: Record<string, "roteiristas" | "narradores" | "editores"> = {
  roteirista: "roteiristas",
  narrador: "narradores",
  editor: "editores",
};

const HINT_FOR_STATUS: Record<string, string> = {
  roteiro: "Escrever o roteiro",
  gravacao: "Gravar áudio",
  edicao: "Editar e enviar vídeo",
};

// GET /api/dashboard — agregação consolidada para a página inicial.
// Devolve apenas o que o user logado precisa ver de imediato.
export async function GET() {
  const { error, user } = await requireAuth();
  if (error) return error;

  await connectDB();
  const userLevel = ROLE_HIERARCHY[user.role as Role] ?? 0;
  const canReview = userLevel >= ROLE_HIERARCHY.coordenador;
  const userId = user.id;
  const now = new Date();
  const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const scales = await Scale.find({})
    .select(
      "title weeks.number weeks.theme weeks.status weeks.deadline weeks.assignments"
    )
    .lean();

  // Flatten weeks
  type WeekRow = {
    scaleId: string;
    scaleTitle: string;
    weekNumber: number;
    theme: string;
    status: WeekStatus;
    deadline?: Date;
    assignments: {
      roteiristas: { toString(): string }[];
      narradores: { toString(): string }[];
      editores: { toString(): string }[];
    };
  };

  const weeks: WeekRow[] = [];
  for (const s of scales) {
    for (const w of (s.weeks || []) as unknown as Array<{
      number: number;
      theme: string;
      status: WeekStatus;
      deadline?: Date;
      assignments: WeekRow["assignments"];
    }>) {
      weeks.push({
        scaleId: String(s._id),
        scaleTitle: s.title as string,
        weekNumber: w.number,
        theme: w.theme,
        status: w.status,
        deadline: w.deadline,
        assignments: w.assignments,
      });
    }
  }

  // Phase distribution
  const phaseDistribution: Record<WeekStatus, number> = {
    roteiro: 0,
    gravacao: 0,
    edicao: 0,
    revisao: 0,
    concluido: 0,
  };
  for (const w of weeks) phaseDistribution[w.status] = (phaseDistribution[w.status] || 0) + 1;

  // Upcoming deadlines (semanas não concluídas com deadline em ≤7 dias OU vencidos)
  const upcomingDeadlines: UpcomingDeadline[] = weeks
    .filter((w) => w.status !== "concluido" && w.deadline)
    .map((w) => {
      const d = new Date(w.deadline!);
      const diffMs = d.getTime() - now.getTime();
      const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
      return {
        scaleId: w.scaleId,
        scaleTitle: w.scaleTitle,
        weekNumber: w.weekNumber,
        theme: w.theme,
        status: w.status,
        deadline: d.toISOString(),
        daysRemaining: days,
        overdue: d < now,
      };
    })
    .filter((d) => d.overdue || d.daysRemaining <= 7)
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
    .slice(0, 8);

  // My pending tasks — semanas onde estou atribuído como o role da fase atual
  // e ainda não completei (ou fui rejeitado)
  const myCandidateWeeks = weeks.filter((w) => {
    const expectedRole = STATUS_TO_ROLE[w.status];
    if (!expectedRole) return false;
    const assignKey = ASSIGN_KEY_FOR_ROLE[expectedRole];
    return w.assignments?.[assignKey]?.some((u) => u.toString() === userId);
  });

  let myPendingTasks: PendingTask[] = [];
  if (myCandidateWeeks.length > 0) {
    const myProgress = await TaskProgress.find({
      userId,
      $or: myCandidateWeeks.map((w) => ({
        scaleId: w.scaleId,
        weekNumber: w.weekNumber,
      })),
    }).lean();

    const progressKey = (sid: string, wn: number, role: string) => `${sid}::${wn}::${role}`;
    const progressMap = new Map(
      myProgress.map((p) => [
        progressKey(String(p.scaleId), p.weekNumber as number, p.role as string),
        p,
      ])
    );

    myPendingTasks = myCandidateWeeks
      .map((w) => {
        const expectedRole = STATUS_TO_ROLE[w.status]!;
        const p = progressMap.get(progressKey(w.scaleId, w.weekNumber, expectedRole)) as
          | {
              completed?: boolean;
              reviewStatus?: "pending" | "approved" | "rejected";
              reviewReason?: string;
            }
          | undefined;
        const completed = !!p?.completed;
        const wasRejected = p?.reviewStatus === "rejected";
        if (completed && !wasRejected) return null;
        return {
          scaleId: w.scaleId,
          scaleTitle: w.scaleTitle,
          weekNumber: w.weekNumber,
          theme: w.theme,
          status: w.status,
          deadline: w.deadline?.toISOString() ?? "",
          role: expectedRole,
          hint: wasRejected ? "Refazer entrega (ajuste solicitado)" : HINT_FOR_STATUS[w.status],
          reviewStatus: p?.reviewStatus,
          reviewReason: p?.reviewReason,
        } as PendingTask;
      })
      .filter((t): t is PendingTask => t !== null);
  }

  // Pending reviews (apenas para canReview)
  let pendingReviews: PendingReview[] = [];
  if (canReview) {
    const revWeeks = weeks.filter((w) => w.status === "revisao");
    for (const w of revWeeks) {
      const editorIds = (w.assignments?.editores || []).map((u) => u.toString());
      if (editorIds.length === 0) continue;
      const progress = await TaskProgress.find({
        scaleId: w.scaleId,
        weekNumber: w.weekNumber,
        role: "editor",
        userId: { $in: editorIds },
      })
        .populate("userId", "name")
        .lean();
      for (const p of progress as unknown as Array<{
        userId: { _id: { toString(): string }; name: string };
        reviewStatus?: "pending" | "approved" | "rejected";
        completed?: boolean;
      }>) {
        if (!p.completed) continue;
        const rs = p.reviewStatus || "pending";
        if (rs === "approved") continue;
        pendingReviews.push({
          scaleId: w.scaleId,
          scaleTitle: w.scaleTitle,
          weekNumber: w.weekNumber,
          theme: w.theme,
          editorId: p.userId._id.toString(),
          editorName: p.userId.name,
          reviewStatus: rs,
        });
      }
    }
    pendingReviews = pendingReviews.slice(0, 10);
  }

  // Notifications resumidas
  const unreadCount = await Notification.countDocuments({ userId, read: false });

  // Stats globais
  const totalScales = scales.length;
  const totalWeeks = weeks.length;
  const completedWeeks = phaseDistribution.concluido;
  const progressPct = totalWeeks > 0 ? Math.round((completedWeeks / totalWeeks) * 100) : 0;

  return NextResponse.json({
    myPendingTasks,
    pendingReviews,
    upcomingDeadlines,
    phaseDistribution,
    unreadCount,
    stats: {
      totalScales,
      totalWeeks,
      completedWeeks,
      progressPct,
      pendingWeeks: totalWeeks - completedWeeks,
    },
  });
}
