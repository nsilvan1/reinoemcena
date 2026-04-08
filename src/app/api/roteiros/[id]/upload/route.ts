import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { connectDB } from "@/lib/mongodb";
import Roteiro from "@/models/Roteiro";
import { requireAuth } from "@/lib/auth-helpers";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireAuth();
  if (error) return error;

  if (!["admin", "coordenador", "roteirista"].includes(user.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id } = await params;
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }

  // Validar tipo e tamanho (max 10MB)
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "audio/mpeg",
    "audio/wav",
    "audio/mp4",
    "audio/webm",
  ];

  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Tipo de arquivo não permitido" }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Arquivo muito grande (max 10MB)" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const ext = file.name.split(".").pop();
  const fileName = `${id}-${Date.now()}.${ext}`;
  const filePath = path.join(uploadDir, fileName);

  await writeFile(filePath, buffer);
  const fileUrl = `/uploads/${fileName}`;

  await connectDB();
  await Roteiro.findByIdAndUpdate(id, { fileUrl });

  return NextResponse.json({ fileUrl });
}
