import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Roteiro from "@/models/Roteiro";
import Scale from "@/models/Scale";
import { requireAuth, requireRole } from "@/lib/auth-helpers";
import { sanitizeHtml } from "@/lib/sanitize";
import { isSafeUrl } from "@/lib/url-safe";
import { notifyMany } from "@/lib/notifications";

// GET /api/roteiros
export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  await connectDB();
  const { searchParams } = new URL(req.url);
  const scaleId = searchParams.get("scaleId");

  const filter: Record<string, unknown> = {};
  if (scaleId && mongoose.isValidObjectId(scaleId)) filter.scaleId = scaleId;

  const roteiros = await Roteiro.find(filter)
    .populate("createdBy", "name")
    .populate("assignedEditors assignedNarrators", "name avatar")
    .sort({ createdAt: -1 });

  return NextResponse.json(roteiros);
}

// POST /api/roteiros
export async function POST(req: NextRequest) {
  const { error, user } = await requireRole("roteirista");
  if (error) return error;

  await connectDB();
  const body = await req.json();

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const scaleId = typeof body.scaleId === "string" ? body.scaleId : "";
  const weekNumber = Number(body.weekNumber);

  if (!title) {
    return NextResponse.json({ error: "Título obrigatório" }, { status: 400 });
  }
  if (!scaleId || !mongoose.isValidObjectId(scaleId)) {
    return NextResponse.json({ error: "scaleId inválido" }, { status: 400 });
  }
  if (!Number.isFinite(weekNumber) || weekNumber < 1) {
    return NextResponse.json({ error: "weekNumber inválido" }, { status: 400 });
  }

  const content = typeof body.content === "string" ? sanitizeHtml(body.content) : "";

  if (body.fileUrl !== undefined && body.fileUrl !== null && body.fileUrl !== "") {
    if (typeof body.fileUrl !== "string" || !isSafeUrl(body.fileUrl)) {
      return NextResponse.json({ error: "fileUrl inválido" }, { status: 400 });
    }
  }

  const assignedEditors = Array.isArray(body.assignedEditors)
    ? body.assignedEditors.filter((id: unknown) => typeof id === "string" && mongoose.isValidObjectId(id))
    : [];
  const assignedNarrators = Array.isArray(body.assignedNarrators)
    ? body.assignedNarrators.filter((id: unknown) => typeof id === "string" && mongoose.isValidObjectId(id))
    : [];

  const session = await mongoose.startSession();
  try {
    let created;
    await session.withTransaction(async () => {
      const docs = await Roteiro.create(
        [
          {
            title,
            content,
            fileUrl: body.fileUrl || undefined,
            scaleId,
            weekNumber,
            createdBy: user.id,
            assignedEditors,
            assignedNarrators,
          },
        ],
        { session }
      );
      created = docs[0];

      await Scale.updateOne(
        { _id: scaleId, "weeks.number": weekNumber },
        { $set: { "weeks.$.roteiro": created._id } },
        { session }
      );
    });

    // Notificar atribuídos (fora da transação para não bloquear se notificações falharem)
    if (created) {
      const createdDoc = created as { _id: { toString(): string }; title: string };
      const link = `/roteiros/${createdDoc._id.toString()}`;
      if (assignedEditors.length > 0) {
        await notifyMany(
          assignedEditors,
          `Você foi atribuído como editor no roteiro "${createdDoc.title}"`,
          "roteiro",
          link
        );
      }
      if (assignedNarrators.length > 0) {
        await notifyMany(
          assignedNarrators,
          `Você foi atribuído como narrador no roteiro "${createdDoc.title}"`,
          "roteiro",
          link
        );
      }
    }

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("[POST /api/roteiros] transaction failed:", err);
    return NextResponse.json({ error: "Erro ao criar roteiro" }, { status: 500 });
  } finally {
    await session.endSession();
  }
}
