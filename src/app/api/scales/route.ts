import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Scale from "@/models/Scale";
import { requireAuth, requireRole } from "@/lib/auth-helpers";

const MONTH_REGEX = /^\d{4}-\d{2}$/;

// GET /api/scales
export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  await connectDB();
  const scales = await Scale.find()
    .populate("weeks.assignments.roteiristas weeks.assignments.editores weeks.assignments.narradores", "name username avatar")
    .populate("createdBy", "name")
    .sort({ month: -1 })
    .lean();

  return NextResponse.json(scales);
}

// POST /api/scales — criar escala (coordenador+)
export async function POST(req: NextRequest) {
  const { error, user } = await requireRole("coordenador");
  if (error) return error;

  const body = await req.json();
  const { title, month, weeks } = body;

  if (!title || !month || !Array.isArray(weeks) || weeks.length === 0) {
    return NextResponse.json({ error: "Título, mês e semanas são obrigatórios" }, { status: 400 });
  }

  if (!MONTH_REGEX.test(month)) {
    return NextResponse.json({ error: "Mês deve estar no formato AAAA-MM" }, { status: 400 });
  }

  await connectDB();
  const scale = await Scale.create({
    title,
    month,
    weeks: weeks.map((w: { theme?: string; deadline?: string; roteiristas?: string[]; editores?: string[]; narradores?: string[] }, i: number) => ({
      number: i + 1,
      theme: w.theme,
      deadline: w.deadline,
      status: "roteiro",
      assignments: {
        roteiristas: w.roteiristas || [],
        editores: w.editores || [],
        narradores: w.narradores || [],
      },
    })),
    createdBy: user.id,
  });

  return NextResponse.json(scale, { status: 201 });
}
