import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Attachment from "@/models/Attachment";
import { requireAuth } from "@/lib/auth-helpers";

// MIME -> extensão segura. Rejeita qualquer tipo não listado.
const MIME_TO_EXT: Record<string, string> = {
  // Audio
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
  // Video
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  // Documents
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
  // Image
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const VALID_STAGES = [
  "roteiro",
  "gravacao",
  "edicao",
  "revisao",
  "concluido",
  "geral",
] as const;

const MAX_SIZE = 50 * 1024 * 1024; // 50MB
const MIN_SIZE = 100; // 100 bytes

// GET /api/attachments?scaleId=X&weekNumber=N&stage=optional
export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const scaleId = searchParams.get("scaleId");
  const weekNumberRaw = searchParams.get("weekNumber");
  const stage = searchParams.get("stage");

  if (!scaleId || !mongoose.isValidObjectId(scaleId)) {
    return NextResponse.json({ error: "scaleId inválido" }, { status: 400 });
  }

  const weekNumber = parseInt(weekNumberRaw ?? "", 10);
  if (!weekNumberRaw || isNaN(weekNumber) || weekNumber < 1) {
    return NextResponse.json({ error: "weekNumber inválido" }, { status: 400 });
  }

  await connectDB();

  const filter: Record<string, unknown> = { scaleId, weekNumber };
  if (stage) {
    if (!VALID_STAGES.includes(stage as (typeof VALID_STAGES)[number])) {
      return NextResponse.json({ error: "stage inválido" }, { status: 400 });
    }
    filter.stage = stage;
  }

  const attachments = await Attachment.find(filter)
    .populate("uploadedBy", "name")
    .sort({ createdAt: -1 });

  return NextResponse.json(attachments);
}

// POST /api/attachments — multipart/form-data
// TODO PROD: o filesystem do Next/Vercel é efêmero — arquivos em /public/uploads
// são perdidos a cada deploy/cold start. Antes de produção, migrar para storage
// externo (S3, R2, Vercel Blob, GCS) e remover a escrita local abaixo. Mantemos
// este código apenas para dev/local.
export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error) return error;

  const formData = await req.formData();
  const file = formData.get("file");
  const scaleId = formData.get("scaleId") as string | null;
  const weekNumberRaw = formData.get("weekNumber") as string | null;
  const stage = formData.get("stage") as string | null;

  // Validações de payload antes de tocar o DB
  if (!scaleId || !mongoose.isValidObjectId(scaleId)) {
    return NextResponse.json({ error: "scaleId inválido" }, { status: 400 });
  }

  const weekNumber = parseInt(weekNumberRaw ?? "", 10);
  if (!weekNumberRaw || isNaN(weekNumber) || weekNumber < 1) {
    return NextResponse.json({ error: "weekNumber inválido" }, { status: 400 });
  }

  if (!stage || !VALID_STAGES.includes(stage as (typeof VALID_STAGES)[number])) {
    return NextResponse.json({ error: "stage inválido" }, { status: 400 });
  }

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }

  if (file.size < MIN_SIZE) {
    return NextResponse.json({ error: "Arquivo muito pequeno (mín. 100 bytes)" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Arquivo muito grande (máx. 50MB)" }, { status: 400 });
  }

  const ext = MIME_TO_EXT[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Tipo de arquivo não permitido" }, { status: 400 });
  }

  await connectDB();

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  // Nome final 100% derivado: prefixo att + scaleId + UUID + extensão segura.
  // Nada do file.name do client é usado no path — evita path traversal e injeção de extensão.
  const fileName = `att-${scaleId}-${crypto.randomUUID()}.${ext}`;
  const filePath = path.join(uploadDir, fileName);
  await writeFile(filePath, buffer);

  // Sanitiza o nome de display: remove caracteres não-printáveis, limita a 120 chars.
  const displayName = file.name
    .replace(/[^\x20-\x7E -￿]/g, "")
    .trim()
    .slice(0, 120) || fileName;

  const attachment = await Attachment.create({
    scaleId,
    weekNumber,
    stage,
    url: `/uploads/${fileName}`,
    name: displayName,
    mimeType: file.type,
    size: file.size,
    uploadedBy: user.id,
  });

  await attachment.populate("uploadedBy", "name");

  return NextResponse.json(attachment, { status: 201 });
}
