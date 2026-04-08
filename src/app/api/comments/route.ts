import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Comment from "@/models/Comment";
import { requireAuth } from "@/lib/auth-helpers";

// GET /api/comments?scaleId=xxx&weekNumber=1
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

  const comments = await Comment.find(filter)
    .populate("userId", "name username avatar role")
    .sort({ createdAt: 1 });

  return NextResponse.json(comments);
}

// POST /api/comments
export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error) return error;

  await connectDB();
  const body = await req.json();

  if (!body.scaleId || !body.weekNumber || !body.message) {
    return NextResponse.json({ error: "Campos obrigatorios" }, { status: 400 });
  }

  const comment = await Comment.create({
    scaleId: body.scaleId,
    weekNumber: body.weekNumber,
    userId: user.id,
    message: body.message,
    stage: body.stage || "geral",
  });

  const populated = await Comment.findById(comment._id).populate("userId", "name username avatar role");
  return NextResponse.json(populated, { status: 201 });
}
