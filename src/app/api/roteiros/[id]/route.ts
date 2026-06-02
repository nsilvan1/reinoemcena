import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Roteiro from "@/models/Roteiro";
import Scale from "@/models/Scale";
import { requireAuth, requireRole } from "@/lib/auth-helpers";
import { notifyMany } from "@/lib/notifications";
import { sanitizeHtml } from "@/lib/sanitize";
import { isSafeUrl } from "@/lib/url-safe";
import { canEditRoteiro } from "@/lib/roteiro-permissions";
import { deleteUpload } from "@/lib/blob-storage";
import RoteiroVersion from "@/models/RoteiroVersion";

type Params = { params: Promise<{ id: string }> };

// GET /api/roteiros/[id]
export async function GET(req: NextRequest, { params }: Params) {
  const { error, user } = await requireAuth();
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

  // Anota permissões da sessão atual para a UI usar sem replicar regras de auth.
  const canEdit = await canEditRoteiro(roteiro, user.id, user.role);
  const canManageAssignments =
    user.role === "admin" ||
    user.role === "coordenador" ||
    roteiro.createdBy._id?.toString() === user.id ||
    roteiro.createdBy.toString() === user.id;

  return NextResponse.json({
    ...roteiro.toObject(),
    canEdit,
    canManageAssignments,
  });
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

  // Coord+: tudo. Roteirista: autor original OU atribuído como roteirista na semana.
  const allowed = await canEditRoteiro(roteiro, user.id, user.role);
  if (!allowed) {
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

  let fileUrlToRemove: string | undefined;
  if (body.fileUrl !== undefined) {
    if (body.fileUrl === null || body.fileUrl === "") {
      update.fileUrl = undefined;
      if (roteiro.fileUrl) fileUrlToRemove = roteiro.fileUrl;
    } else if (typeof body.fileUrl === "string" && isSafeUrl(body.fileUrl)) {
      // Substituição direta de URL: agenda remoção do antigo se for diferente
      if (roteiro.fileUrl && roteiro.fileUrl !== body.fileUrl) {
        fileUrlToRemove = roteiro.fileUrl;
      }
      update.fileUrl = body.fileUrl;
    } else {
      return NextResponse.json({ error: "fileUrl inválido" }, { status: 400 });
    }
  }

  // Assignments só por autor original OU coord+. Roteirista "apenas atribuído"
  // pode editar conteúdo mas não muda a equipe.
  const canManageAssignments =
    user.role === "admin" ||
    user.role === "coordenador" ||
    roteiro.createdBy.toString() === user.id;

  if (canManageAssignments && Array.isArray(body.assignedEditors)) {
    update.assignedEditors = body.assignedEditors.filter(
      (x: unknown) => typeof x === "string" && mongoose.isValidObjectId(x)
    );
  }
  if (canManageAssignments && Array.isArray(body.assignedNarrators)) {
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

  // Snapshot da versão anterior se houve mudança real em title/content
  const titleChanged =
    typeof update.title === "string" && update.title !== roteiro.title;
  const contentChanged =
    typeof update.content === "string" &&
    update.content !== (roteiro.content || "");

  if (titleChanged || contentChanged) {
    await RoteiroVersion.create({
      roteiroId: roteiro._id,
      title: roteiro.title,
      content: roteiro.content || "",
      snapshotBy: user.id,
    });
  }

  const updated = await Roteiro.findByIdAndUpdate(id, update, { new: true })
    .populate("createdBy", "name")
    .populate("assignedEditors assignedNarrators", "name avatar");

  if (fileUrlToRemove) {
    await deleteUpload(fileUrlToRemove);
  }

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

  const fileUrlToRemove = roteiro.fileUrl;

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
    if (fileUrlToRemove) {
      await deleteUpload(fileUrlToRemove);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/roteiros/:id] transaction failed:", err);
    return NextResponse.json({ error: "Erro ao deletar roteiro" }, { status: 500 });
  } finally {
    await session.endSession();
  }
}
