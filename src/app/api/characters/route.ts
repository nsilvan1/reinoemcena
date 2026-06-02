import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Character from "@/models/Character";
import { requireAuth, requireRole } from "@/lib/auth-helpers";
import { isSafeUrl } from "@/lib/url-safe";

function normalizeTraits(input: unknown): string[] | null {
  if (input === undefined) return null;
  if (!Array.isArray(input)) return null;
  const cleaned = input
    .map((t) => (typeof t === "string" ? t.trim().slice(0, 30) : ""))
    .filter((t) => t.length > 0);
  const unique = Array.from(new Set(cleaned));
  return unique.slice(0, 10);
}

function normalizeGallery(input: unknown): string[] | null {
  if (input === undefined) return null;
  if (!Array.isArray(input)) return null;
  const cleaned: string[] = [];
  for (const url of input) {
    if (typeof url === "string" && isSafeUrl(url)) cleaned.push(url);
  }
  return cleaned.slice(0, 20);
}

// GET /api/characters?search=
export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() ?? "";

  await connectDB();

  const filter: Record<string, unknown> = {};
  if (search) {
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [{ name: { $regex: safe, $options: "i" } }, { traits: { $regex: safe, $options: "i" } }];
  }

  const characters = await Character.find(filter)
    .populate("createdBy", "name")
    .sort({ name: 1 });

  return NextResponse.json(characters);
}

// POST /api/characters
export async function POST(req: NextRequest) {
  const { error, user } = await requireRole("roteirista");
  if (error) return error;

  const body = await req.json();
  const { name, description, traits, coverImageUrl, gallery } = body;

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
    description !== undefined ? String(description).trim().slice(0, 1000) : "";

  if (coverImageUrl !== undefined && coverImageUrl !== null && coverImageUrl !== "") {
    if (typeof coverImageUrl !== "string" || !isSafeUrl(coverImageUrl)) {
      return NextResponse.json({ error: "coverImageUrl inválida" }, { status: 400 });
    }
  }

  const cleanedTraits = normalizeTraits(traits) ?? [];
  const cleanedGallery = normalizeGallery(gallery) ?? [];

  await connectDB();

  const character = await Character.create({
    name: trimmedName,
    description: trimmedDescription,
    traits: cleanedTraits,
    gallery: cleanedGallery,
    ...(coverImageUrl ? { coverImageUrl } : {}),
    createdBy: user.id,
  });

  await character.populate("createdBy", "name");

  return NextResponse.json(character, { status: 201 });
}
