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

  const filter: Record<string, unknown> = {};
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
    return NextResponse.json({ error: "Campos obrigatórios" }, { status: 400 });
  }

  const message: string = String(body.message).trim().slice(0, 2000);
  if (!message) {
    return NextResponse.json({ error: "Mensagem não pode estar vazia" }, { status: 400 });
  }

  const comment = new Comment({
    scaleId: body.scaleId,
    weekNumber: body.weekNumber,
    userId: user.id,
    message,
    stage: body.stage || "geral",
  });
  await comment.save();
  await comment.populate("userId", "name username avatar role");
  return NextResponse.json(comment, { status: 201 });
}
