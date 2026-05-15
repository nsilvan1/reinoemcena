import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { requireRole } from "@/lib/auth-helpers";

const MIME_TO_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "text/plain": "txt",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MAX_SIZE = 25 * 1024 * 1024;
const MIN_SIZE = 100;

// POST /api/history-cards/upload-attachment — multipart/form-data { file }
// Devolve { url, name, mimeType, size } pronto para ser anexado ao HistoryCard.attachments
export async function POST(req: NextRequest) {
  const { error } = await requireRole("roteirista");
  if (error) return error;

  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }
  if (file.size < MIN_SIZE) {
    return NextResponse.json({ error: "Arquivo muito pequeno" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Arquivo muito grande (máx. 25MB)" }, { status: 400 });
  }

  const ext = MIME_TO_EXT[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Tipo não permitido" }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const fileName = `histatt-${crypto.randomUUID()}.${ext}`;
  const filePath = path.join(uploadDir, fileName);
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

  const displayName = file.name
    .replace(/[^\x20-\x7E -￿]/g, "")
    .trim()
    .slice(0, 200) || fileName;

  return NextResponse.json(
    {
      url: `/uploads/${fileName}`,
      name: displayName,
      mimeType: file.type,
      size: file.size,
    },
    { status: 201 }
  );
}
