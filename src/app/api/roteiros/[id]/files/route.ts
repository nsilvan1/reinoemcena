import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Roteiro from "@/models/Roteiro";
import { requireAuth, requireRole } from "@/lib/auth-helpers";
import { canEditRoteiro } from "@/lib/roteiro-permissions";
import { putUpload } from "@/lib/blob-storage";

const MIME_TO_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "text/plain": "txt",
};

const MAX_SIZE = 10 * 1024 * 1024;
const MIN_SIZE = 100;

type Params = { params: Promise<{ id: string }> };

// GET /api/roteiros/[id]/files
export async function GET(req: NextRequest, { params }: Params) {
  const { error } = await requireAuth();
  if (error) return error;

  await connectDB();
  const { id } = await params;

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const roteiro = await Roteiro.findById(id)
    .select("files")
    .populate("files.uploadedBy", "name");
  if (!roteiro) {
    return NextResponse.json({ error: "Roteiro não encontrado" }, { status: 404 });
  }

  return NextResponse.json(roteiro.files || []);
}

// POST /api/roteiros/[id]/files — multipart, faz push em files[]
export async function POST(req: NextRequest, { params }: Params) {
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

  const fileUrl = await putUpload(await file.arrayBuffer(), { prefix: "rotfile", ext, contentType: file.type });

  const displayName = file.name
    .replace(/[^\x20-\x7E -￿]/g, "")
    .trim()
    .slice(0, 120) || fileUrl.split("/").pop() || "arquivo";

  const fileEntry = {
    url: fileUrl,
    name: displayName,
    mimeType: file.type,
    size: file.size,
    uploadedBy: user.id,
    uploadedAt: new Date(),
  };

  roteiro.files.push(fileEntry);
  // Mantém fileUrl apontando para o primeiro arquivo (compat com UI antiga)
  if (!roteiro.fileUrl) roteiro.fileUrl = fileUrl;
  await roteiro.save();

  const fresh = await Roteiro.findById(id)
    .select("files")
    .populate("files.uploadedBy", "name");
  const added = fresh?.files?.[fresh.files.length - 1];

  return NextResponse.json(added, { status: 201 });
}
