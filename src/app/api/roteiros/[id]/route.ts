import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Roteiro from "@/models/Roteiro";
import Scale from "@/models/Scale";
import { requireAuth, requireRole } from "@/lib/auth-helpers";
import { notifyMany } from "@/lib/notifications";
import { sanitizeHtml, isSafeUrl } from "@/lib/sanitize";

type Params = { params: Promise<{ id: string }> };

// GET /api/roteiros/[id]
export async function GET(req: NextRequest, { params }: Params) {
  const { error } = await requireAuth();
  if (error) return error;

  await connectDB();
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  const roteiro = await Roteiro.findById(id)
    .populate("createdBy", "name username")
    .populate("assignedEditors assignedNarrators", "name username avatar");

  if (!roteiro) return NextResponse.json({ error: "Roteiro não encontrado" }, { status: 404 });
  return NextResponse.json(roteiro);
}

// PUT /api/roteiros/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  const { error, user } = await requireRole("roteirista");
  if (error) return error;

  await connectDB();
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const body = await req.json();

  const roteiro = await Roteiro.findById(id);
  if (!roteiro) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  // Roteirista só edita o próprio; coordenador/admin pode editar qualquer
  if (user.role === "roteirista" && roteiro.createdBy.toString() !== user.id) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  // Whitelist de campos: nunca confiar no body cru
  const update: Record<string, unknown> = {};

  if (typeof body.title === "string") {
    const t = body.title.trim();
    if (!t) return NextResponse.json({ error: "Título obrigatório" }, { status: 400 });
    update.title = t;
  }

  if (typeof body.content === "string") {
    update.content = sanitizeHtml(body.content);
  }

  if (body.fileUrl !== undefined) {
    if (body.fileUrl === null || body.fileUrl === "") {
      update.fileUrl = undefined;
    } else if (typeof body.fileUrl === "string" && isSafeUrl(body.fileUrl)) {
      update.fileUrl = body.fileUrl;
    } else {
      return NextResponse.json({ error: "fileUrl inválido" }, { status: 400 });
    }
  }

  if (Array.isArray(body.assignedEditors)) {
    update.assignedEditors = body.assignedEditors.filter(
      (x: unknown) => typeof x === "string" && mongoose.isValidObjectId(x)
    );
  }
  if (Array.isArray(body.assignedNarrators)) {
    update.assignedNarrators = body.assignedNarrators.filter(
      (x: unknown) => typeof x === "string" && mongoose.isValidObjectId(x)
    );
  }

  // Notificar novos editores/narradores
  const editorsList = (update.assignedEditors as string[]) || [];
  const narratorsList = (update.assignedNarrators as string[]) || [];
  const newEditors = editorsList.filter(
    (eid) => !roteiro.assignedEditors.map((e: mongoose.Types.ObjectId) => e.toString()).includes(eid)
  );
  const newNarrators = narratorsList.filter(
    (nid) => !roteiro.assignedNarrators.map((n: mongoose.Types.ObjectId) => n.toString()).includes(nid)
  );

  if (newEditors.length > 0) {
    await notifyMany(
      newEditors,
      `Você foi atribuído como editor no roteiro "${roteiro.title}"`,
      "roteiro",
      `/roteiros/${id}`
    );
  }
  if (newNarrators.length > 0) {
    await notifyMany(
      newNarrators,
      `Você foi atribuído como narrador no roteiro "${roteiro.title}"`,
      "roteiro",
      `/roteiros/${id}`
    );
  }

  const updated = await Roteiro.findByIdAndUpdate(id, update, { new: true })
    .populate("createdBy", "name")
    .populate("assignedEditors assignedNarrators", "name avatar");

  return NextResponse.json(updated);
}

// DELETE /api/roteiros/[id]
export async function DELETE(req: NextRequest, { params }: Params) {
  const { error, user } = await requireRole("roteirista");
  if (error) return error;

  await connectDB();
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const roteiro = await Roteiro.findById(id);
  if (!roteiro) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  if (user.role === "roteirista" && roteiro.createdBy.toString() !== user.id) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Roteiro.findByIdAndDelete(id, { session });
      await Scale.updateOne(
        { "weeks.roteiro": id },
        { $unset: { "weeks.$.roteiro": "" } },
        { session }
      );
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/roteiros/:id] transaction failed:", err);
    return NextResponse.json({ error: "Erro ao deletar roteiro" }, { status: 500 });
  } finally {
    await session.endSession();
  }
}
