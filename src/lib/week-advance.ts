import mongoose from "mongoose";
import Scale from "@/models/Scale";
import TaskProgress from "@/models/TaskProgress";
import { notifyMany } from "@/lib/notifications";
import { WeekStatus, WEEK_STATUS_ORDER } from "@/types";

const ROLES_FOR_PHASE: Record<string, ("roteirista" | "narrador" | "editor")[]> = {
  roteiro: ["roteirista"],
  gravacao: ["narrador"],
  edicao: ["editor"],
};

const ASSIGNMENT_KEY_FOR_PHASE: Record<string, "roteiristas" | "narradores" | "editores"> = {
  roteiro: "roteiristas",
  gravacao: "narradores",
  edicao: "editores",
};

const NEXT_PHASE_ASSIGNMENT_KEY: Record<string, "narradores" | "editores"> = {
  gravacao: "narradores",
  edicao: "editores",
};

// Se todos os atribuídos da fase atual concluíram, avança o status da semana
// e notifica o próximo grupo. Idempotente. Pode rodar dentro de uma sessão.
export async function tryAdvanceWeek(
  scaleId: string,
  weekNumber: number,
  session?: mongoose.ClientSession
): Promise<{ advanced: boolean; newStatus?: WeekStatus }> {
  const scale = await Scale.findById(scaleId).session(session ?? null);
  if (!scale) return { advanced: false };

  const week = scale.weeks.find((w: { number: number }) => w.number === weekNumber);
  if (!week) return { advanced: false };

  const currentStatus = week.status as WeekStatus;
  const rolesForPhase = ROLES_FOR_PHASE[currentStatus];
  if (!rolesForPhase) return { advanced: false };

  const assignmentKey = ASSIGNMENT_KEY_FOR_PHASE[currentStatus];
  const phaseAssignedIds: string[] = (week.assignments[assignmentKey] || []).map(
    (uid: { toString(): string }) => uid.toString()
  );

  if (phaseAssignedIds.length === 0) return { advanced: false };

  const completedProgress = await TaskProgress.find(
    {
      scaleId,
      weekNumber,
      role: { $in: rolesForPhase },
      completed: true,
    },
    null,
    { session }
  );

  const completedIds = completedProgress.map((p: { userId: { toString(): string } }) =>
    p.userId.toString()
  );
  const allDone = phaseAssignedIds.every((uid) => completedIds.includes(uid));
  if (!allDone) return { advanced: false };

  const currentIdx = WEEK_STATUS_ORDER.indexOf(currentStatus);
  if (currentIdx >= WEEK_STATUS_ORDER.length - 1) return { advanced: false };

  const nextStatus = WEEK_STATUS_ORDER[currentIdx + 1];
  week.status = nextStatus;
  await scale.save({ session });

  const nextAssignKey = NEXT_PHASE_ASSIGNMENT_KEY[nextStatus];
  if (nextAssignKey) {
    const nextUserIds: string[] = (week.assignments[nextAssignKey] || []).map(
      (uid: { toString(): string }) => uid.toString()
    );
    if (nextUserIds.length > 0) {
      await notifyMany(
        nextUserIds,
        `Semana ${weekNumber} "${week.theme}" está pronta para ${nextStatus}!`,
        "status",
        `/escalas/${scaleId}`
      );
    }
  }

  return { advanced: true, newStatus: nextStatus };
}
