import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Scale from "@/models/Scale";
import TaskProgress from "@/models/TaskProgress";
import Attachment from "@/models/Attachment";
import { requireAuth } from "@/lib/auth-helpers";
import { tryAdvanceWeek } from "@/lib/week-advance";
import { putUpload } from "@/lib/blob-storage";

const AUDIO_MIME_TO_EXT: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
};

const MAX_SIZE = 30 * 1024 * 1024; // 30MB
const MIN_SIZE = 100;

type Params = { params: Promise<{ id: string; weekNumber: string }> };

// POST /api/scales/[id]/weeks/[weekNumber]/audio — narrador atribuído envia
// uma tomada de áudio. Persiste como Attachment (stage=gravacao) e atualiza
// TaskProgress.linkUrl/completed. Não toca em Roteiro.fileUrl.
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

  const scale = await Scale.findById(id).select("weeks.number weeks.assignments.narradores");
  if (!scale) {
    return NextResponse.json({ error: "Escala não encontrada" }, { status: 404 });
  }

  const week = scale.weeks.find((w: { number: number }) => w.number === wNum);
  if (!week) {
    return NextResponse.json({ error: "Semana não encontrada" }, { status: 404 });
  }

  const isAssigned = week.assignments?.narradores?.some(
    (uid: { toString(): string }) => uid.toString() === user.id
  );
  if (!isAssigned) {
    return NextResponse.json({ error: "Você não está atribuído como narrador nesta semana" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }

  const ext = AUDIO_MIME_TO_EXT[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Tipo não permitido (MP3, WAV, M4A, OGG ou WebM)" }, { status: 400 });
  }

  if (file.size < MIN_SIZE) {
    return NextResponse.json({ error: "Arquivo muito pequeno" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Arquivo muito grande (máx. 30MB)" }, { status: 400 });
  }

  const url = await putUpload(await file.arrayBuffer(), { prefix: "aud", ext, contentType: file.type });

  const displayName = file.name
    .replace(/[^\x20-\x7E -￿]/g, "")
    .trim()
    .slice(0, 120) || url.split("/").pop() || "audio";

  const attachment = await Attachment.create({
    scaleId: id,
    weekNumber: wNum,
    stage: "gravacao",
    url,
    name: displayName,
    mimeType: file.type,
    size: file.size,
    uploadedBy: user.id,
  });

  // Atualiza TaskProgress: aponta linkUrl para a tomada mais recente e marca completa.
  const progress = await TaskProgress.findOneAndUpdate(
    { scaleId: id, weekNumber: wNum, userId: user.id, role: "narrador" },
    { linkUrl: url, completed: true, completedAt: new Date() },
    { upsert: true, new: true }
  );

  // Avança a fase se todos os narradores concluíram.
  const advance = await tryAdvanceWeek(id, wNum);

  await attachment.populate("uploadedBy", "name");

  return NextResponse.json(
    { attachment, progress, advanced: advance.advanced, newStatus: advance.newStatus },
    { status: 201 }
  );
}
