import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Scale from "@/models/Scale";
import TaskProgress from "@/models/TaskProgress";
import Attachment from "@/models/Attachment";
import { requireAuth } from "@/lib/auth-helpers";
import { tryAdvanceWeek } from "@/lib/week-advance";

const VIDEO_MIME_TO_EXT: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

const MAX_SIZE = 200 * 1024 * 1024; // 200MB
const MIN_SIZE = 1024;

type Params = { params: Promise<{ id: string; weekNumber: string }> };

// POST /api/scales/[id]/weeks/[weekNumber]/video — editor atribuído envia
// um corte de vídeo. Persiste como Attachment(stage=edicao) e atualiza
// TaskProgress.linkUrl/completed. Não toca em link externo do narrador.
export async function POST(req: NextRequest, { params }: Params) {
  const { error, user } = await requireAuth();
  if (error) return error;

  const { id, weekNumber } = await params;
  const wNum = parseInt(weekNumber, 10);

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "scaleId inválido" }, { status: 400 });
  }
  if (!Number.isFinite(wNum) || wNum < 1) {
    return NextResponse.json({ error: "weekNumber inválido" }, { status: 400 });
  }

  await connectDB();

  const scale = await Scale.findById(id).select("weeks.number weeks.assignments.editores");
  if (!scale) {
    return NextResponse.json({ error: "Escala não encontrada" }, { status: 404 });
  }

  const week = scale.weeks.find((w: { number: number }) => w.number === wNum);
  if (!week) {
    return NextResponse.json({ error: "Semana não encontrada" }, { status: 404 });
  }

  const isAssigned = week.assignments?.editores?.some(
    (uid: { toString(): string }) => uid.toString() === user.id
  );
  if (!isAssigned) {
    return NextResponse.json({ error: "Você não está atribuído como editor nesta semana" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }

  const ext = VIDEO_MIME_TO_EXT[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Tipo não permitido (MP4, WebM ou MOV)" }, { status: 400 });
  }

  if (file.size < MIN_SIZE) {
    return NextResponse.json({ error: "Arquivo muito pequeno" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Arquivo muito grande (máx. 200MB)" }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const fileName = `vid-${id}-${user.id}-${crypto.randomUUID()}.${ext}`;
  const filePath = path.join(uploadDir, fileName);
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()));
  const url = `/uploads/${fileName}`;

  const displayName = file.name
    .replace(/[^\x20-\x7E -￿]/g, "")
    .trim()
    .slice(0, 120) || fileName;

  const attachment = await Attachment.create({
    scaleId: id,
    weekNumber: wNum,
    stage: "edicao",
    url,
    name: displayName,
    mimeType: file.type,
    size: file.size,
    uploadedBy: user.id,
  });

  const progress = await TaskProgress.findOneAndUpdate(
    { scaleId: id, weekNumber: wNum, userId: user.id, role: "editor" },
    { linkUrl: url, completed: true, completedAt: new Date() },
    { upsert: true, new: true }
  );

  const advance = await tryAdvanceWeek(id, wNum);

  await attachment.populate("uploadedBy", "name");

  return NextResponse.json(
    { attachment, progress, advanced: advance.advanced, newStatus: advance.newStatus },
    { status: 201 }
  );
}
