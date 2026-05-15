import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Character from "@/models/Character";
import { requireAuth, requireRole } from "@/lib/auth-helpers";
import { isSafeUrl } from "@/lib/sanitize";

// GET /api/characters?scaleId=X&weekNumber=N
export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const scaleId = searchParams.get("scaleId");
  const weekNumberRaw = searchParams.get("weekNumber");

  if (!scaleId || !mongoose.isValidObjectId(scaleId)) {
    return NextResponse.json({ error: "scaleId inválido" }, { status: 400 });
  }

  const weekNumber = parseInt(weekNumberRaw ?? "", 10);
  if (!weekNumberRaw || isNaN(weekNumber) || weekNumber < 1) {
    return NextResponse.json({ error: "weekNumber inválido" }, { status: 400 });
  }

  await connectDB();

  const characters = await Character.find({ scaleId, weekNumber })
    .populate("createdBy", "name")
    .sort({ createdAt: 1 });

  return NextResponse.json(characters);
}

// POST /api/characters
export async function POST(req: NextRequest) {
  const { error, user } = await requireRole("roteirista");
  if (error) return error;

  const body = await req.json();

  const { scaleId, weekNumber: weekNumberRaw, name, description, prompt, imageUrl } = body;

  // Validações de payload antes de tocar o DB
  if (!scaleId || !mongoose.isValidObjectId(scaleId)) {
    return NextResponse.json({ error: "scaleId inválido" }, { status: 400 });
  }

  const weekNumber = Number(weekNumberRaw);
  if (!weekNumberRaw || isNaN(weekNumber) || weekNumber < 1) {
    return NextResponse.json({ error: "weekNumber inválido" }, { status: 400 });
  }

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name é obrigatório" }, { status: 400 });
  }
  const trimmedName = name.trim();
  if (!trimmedName) {
    return NextResponse.json({ error: "name não pode estar vazio" }, { status: 400 });
  }
  if (trimmedName.length > 80) {
    return NextResponse.json({ error: "name deve ter no máximo 80 caracteres" }, { status: 400 });
  }

  const trimmedDescription =
    description !== undefined ? String(description).trim().slice(0, 500) : "";

  const trimmedPrompt =
    prompt !== undefined ? String(prompt).trim().slice(0, 4000) : "";

  if (imageUrl !== undefined && imageUrl !== null && imageUrl !== "") {
    if (typeof imageUrl !== "string" || !isSafeUrl(imageUrl)) {
      return NextResponse.json({ error: "imageUrl inválida" }, { status: 400 });
    }
  }

  await connectDB();

  const character = await Character.create({
    scaleId,
    weekNumber,
    name: trimmedName,
    description: trimmedDescription,
    prompt: trimmedPrompt,
    ...(imageUrl ? { imageUrl } : {}),
    createdBy: user.id,
  });

  await character.populate("createdBy", "name");

  return NextResponse.json(character, { status: 201 });
}
