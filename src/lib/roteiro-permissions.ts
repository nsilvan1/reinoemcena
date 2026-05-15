import Scale from "@/models/Scale";
import { Types } from "mongoose";
import type { Role } from "@/types";

interface RoteiroLike {
  createdBy: Types.ObjectId | string;
  scaleId: Types.ObjectId | string;
  weekNumber: number;
}

interface WeekAssignment {
  number: number;
  assignments?: {
    roteiristas?: Array<Types.ObjectId | string>;
  };
}

// Coord+ podem tudo; roteirista pode se for o autor OU se estiver atribuído como
// roteirista na semana daquela escala. Lê a Scale para verificar a atribuição.
export async function canEditRoteiro(
  roteiro: RoteiroLike,
  userId: string,
  userRole: Role
): Promise<boolean> {
  if (userRole === "admin" || userRole === "coordenador") return true;
  if (userRole !== "roteirista") return false;

  if (roteiro.createdBy.toString() === userId) return true;

  const scale = await Scale.findById(roteiro.scaleId).select("weeks.number weeks.assignments.roteiristas").lean<{
    weeks: WeekAssignment[];
  }>();
  if (!scale) return false;

  const week = scale.weeks.find((w) => w.number === roteiro.weekNumber);
  if (!week) return false;

  return Boolean(
    week.assignments?.roteiristas?.some((r) => r.toString() === userId)
  );
}
