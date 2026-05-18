import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Attachment from "@/models/Attachment";
import Character from "@/models/Character";
import { requireAuth } from "@/lib/auth-helpers";
import { ROLE_HIERARCHY } from "@/types";
import { deleteUpload } from "@/lib/blob-storage";

type Params = { params: Promise<{ id: string }> };

// DELETE /api/attachments/[id]
export async function DELETE(req: NextRequest, { params }: Params) {
  const { error, user } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  await connectDB();

  const attachment = await Attachment.findById(id);
  if (!attachment) {
    return NextResponse.json({ error: "Anexo não encontrado" }, { status: 404 });
  }

  // Autorização: uploader original OU admin/coordenador
  const isOwner = attachment.uploadedBy.toString() === user.id;
  const isPrivileged = ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY.coordenador;
  if (!isOwner && !isPrivileged) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  // Antes de remover o arquivo físico, garante que nenhum outro registro
  // depende dele — pode ser referenciado por outros Attachments (importação
  // do acervo cria refs múltiplas) ou por Characters (cover/gallery). Se
  // existir outro consumidor, só remove o documento Attachment.
  const otherAttachmentUsing = await Attachment.exists({
    _id: { $ne: attachment._id },
    url: attachment.url,
  });
  const characterUsing = await Character.exists({
    $or: [{ coverImageUrl: attachment.url }, { gallery: attachment.url }],
  });

  if (!otherAttachmentUsing && !characterUsing) {
    await deleteUpload(attachment.url);
  }
  await Attachment.findByIdAndDelete(id);

  return NextResponse.json({ ok: true });
}
