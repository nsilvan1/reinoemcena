import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Roteiro from "@/models/Roteiro";
import { requireRole } from "@/lib/auth-helpers";
import { canEditRoteiro } from "@/lib/roteiro-permissions";
import { putUpload, deleteUpload } from "@/lib/blob-storage";

// MIME -> extensão segura. Rejeita qualquer mismatch entre tipo declarado e extensão final.
const MIME_TO_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
};

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const MIN_SIZE = 100; // 100 bytes

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireRole("roteirista");
  if (error) return error;

  await connectDB();

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const roteiro = await Roteiro.findById(id);
  if (!roteiro) {
    return NextResponse.json({ error: "Roteiro não encontrado" }, { status: 404 });
  }

  // Coord+: tudo. Roteirista: autor original OU atribuído como roteirista na semana.
  const allowed = await canEditRoteiro(roteiro, user.id, user.role);
  if (!allowed) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }

  const ext = MIME_TO_EXT[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Tipo de arquivo não permitido" }, { status: 400 });
  }

  if (file.size < MIN_SIZE) {
    return NextResponse.json({ error: "Arquivo muito pequeno" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Arquivo muito grande (máx. 10MB)" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const fileUrl = await putUpload(bytes, { prefix: "rot", ext, contentType: file.type });

  const displayName = file.name
    .replace(/[^\x20-\x7E -￿]/g, "")
    .trim()
    .slice(0, 120) || fileUrl.split("/").pop() || "arquivo";

  // Semântica deste endpoint legado: troca o "arquivo principal".
  // Remove o anterior do disco e de files[] (se existir lá) e adiciona o novo.
  const previousUrl = roteiro.fileUrl;
  interface FileSubdoc { url: string; _id: unknown }
  roteiro.files = (roteiro.files as FileSubdoc[]).filter(
    (f) => f.url !== previousUrl
  );
  roteiro.files.push({
    url: fileUrl,
    name: displayName,
    mimeType: file.type,
    size: file.size,
    uploadedBy: user.id,
    uploadedAt: new Date(),
  });
  roteiro.fileUrl = fileUrl;
  await roteiro.save();

  if (previousUrl && previousUrl !== fileUrl) {
    await deleteUpload(previousUrl);
  }

  return NextResponse.json({ fileUrl });
}
