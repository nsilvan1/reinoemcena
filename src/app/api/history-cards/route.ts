import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import HistoryCard from "@/models/HistoryCard";
import { requireAuth, requireRole } from "@/lib/auth-helpers";
import { isSafeUrl } from "@/lib/sanitize";

function normalizeTraits(input: unknown): string[] | null {
  if (input === undefined) return null;
  if (!Array.isArray(input)) return null;
  const cleaned = input
    .map((t) => (typeof t === "string" ? t.trim().slice(0, 30) : ""))
    .filter((t) => t.length > 0);
  return Array.from(new Set(cleaned)).slice(0, 10);
}

// GET /api/history-cards?search=
export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() ?? "";

  await connectDB();

  const filter: Record<string, unknown> = {};
  if (search) {
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [{ title: { $regex: safe, $options: "i" } }, { traits: { $regex: safe, $options: "i" } }];
  }

  const cards = await HistoryCard.find(filter)
    .populate("createdBy", "name")
    .sort({ title: 1 });

  return NextResponse.json(cards);
}

// POST /api/history-cards
export async function POST(req: NextRequest) {
  const { error, user } = await requireRole("roteirista");
  if (error) return error;

  const body = await req.json();
  const { title, description, traits, coverImageUrl } = body;

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "title é obrigatório" }, { status: 400 });
  }
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return NextResponse.json({ error: "title não pode estar vazio" }, { status: 400 });
  }
  if (trimmedTitle.length > 120) {
    return NextResponse.json({ error: "title deve ter no máximo 120 caracteres" }, { status: 400 });
  }

  const trimmedDescription =
    description !== undefined ? String(description).trim().slice(0, 2000) : "";

  if (coverImageUrl !== undefined && coverImageUrl !== null && coverImageUrl !== "") {
    if (typeof coverImageUrl !== "string" || !isSafeUrl(coverImageUrl)) {
      return NextResponse.json({ error: "coverImageUrl inválida" }, { status: 400 });
    }
  }

  const cleanedTraits = normalizeTraits(traits) ?? [];

  await connectDB();

  const card = await HistoryCard.create({
    title: trimmedTitle,
    description: trimmedDescription,
    traits: cleanedTraits,
    ...(coverImageUrl ? { coverImageUrl } : {}),
    createdBy: user.id,
  });

  await card.populate("createdBy", "name");

  return NextResponse.json(card, { status: 201 });
}
