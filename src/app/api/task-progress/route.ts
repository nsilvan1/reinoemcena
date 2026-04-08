import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import TaskProgress from "@/models/TaskProgress";
import { requireAuth } from "@/lib/auth-helpers";

// GET /api/task-progress?scaleId=xxx&weekNumber=1
export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  await connectDB();
  const { searchParams } = new URL(req.url);
  const scaleId = searchParams.get("scaleId");
  const weekNumber = searchParams.get("weekNumber");

  const filter: any = {};
  if (scaleId) filter.scaleId = scaleId;
  if (weekNumber) filter.weekNumber = parseInt(weekNumber);

  const progress = await TaskProgress.find(filter).populate("userId", "name avatar");
  return NextResponse.json(progress);
}
