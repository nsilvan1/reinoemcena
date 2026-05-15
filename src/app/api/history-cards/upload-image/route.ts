import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { requireRole } from "@/lib/auth-helpers";

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAX_SIZE = 5 * 1024 * 1024;
const MIN_SIZE = 100;

// POST /api/history-cards/upload-image — multipart/form-data { file }
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
    return NextResponse.json({ error: "Imagem muito grande (máx. 5MB)" }, { status: 400 });
  }

  const ext = MIME_TO_EXT[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Tipo não permitido (use JPG, PNG, WEBP ou GIF)" },
      { status: 400 }
    );
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const fileName = `hist-${crypto.randomUUID()}.${ext}`;
  const filePath = path.join(uploadDir, fileName);
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ url: `/uploads/${fileName}` }, { status: 201 });
}
