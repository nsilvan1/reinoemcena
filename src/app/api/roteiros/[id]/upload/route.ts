import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Roteiro from "@/models/Roteiro";
import { requireRole } from "@/lib/auth-helpers";

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

// TODO PROD: o filesystem do Next/Vercel é efêmero — arquivos em /public/uploads
// são perdidos a cada deploy/cold start. Antes de produção, migrar para storage
// externo (S3, R2, Vercel Blob, GCS) e remover a escrita local abaixo. Mantemos
// este código apenas para dev/local.
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

  // Ownership: roteirista só altera o próprio; coordenador/admin altera qualquer
  if (user.role === "roteirista" && roteiro.createdBy.toString() !== user.id) {
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
    return NextResponse.json({ error: "Arquivo muito grande (max 10MB)" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  // Nome final 100% derivado: ID do roteiro + UUID + extensão segura.
  // Nada do file.name do client é usado — evita path traversal e injeção de extensão.
  const fileName = `${id}-${crypto.randomUUID()}.${ext}`;
  const filePath = path.join(uploadDir, fileName);

  await writeFile(filePath, buffer);
  const fileUrl = `/uploads/${fileName}`;

  await Roteiro.findByIdAndUpdate(id, { fileUrl });

  return NextResponse.json({ fileUrl });
}
