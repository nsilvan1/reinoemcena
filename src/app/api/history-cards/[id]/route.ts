import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import HistoryCard from "@/models/HistoryCard";
import { requireAuth, requireRole } from "@/lib/auth-helpers";
import { isSafeUrl } from "@/lib/sanitize";
import { ROLE_HIERARCHY } from "@/types";

type Params = { params: Promise<{ id: string }> };

function normalizeTraits(input: unknown): string[] | null {
  if (input === undefined) return null;
  if (!Array.isArray(input)) return null;
  const cleaned = input
    .map((t) => (typeof t === "string" ? t.trim().slice(0, 30) : ""))
    .filter((t) => t.length > 0);
  return Array.from(new Set(cleaned)).slice(0, 10);
}

function normalizeAttachments(
  input: unknown
): { url: string; name: string; mimeType: string; size: number }[] | null {
  if (input === undefined) return null;
  if (!Array.isArray(input)) return null;
  const cleaned: { url: string; name: string; mimeType: string; size: number }[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const it = item as Record<string, unknown>;
    if (
      typeof it.url === "string" &&
      isSafeUrl(it.url) &&
      typeof it.name === "string" &&
      typeof it.mimeType === "string" &&
      typeof it.size === "number"
    ) {
      cleaned.push({
        url: it.url,
        name: it.name.trim().slice(0, 200),
        mimeType: it.mimeType,
        size: it.size,
      });
    }
  }
  return cleaned.slice(0, 20);
}

// GET /api/history-cards/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  await connectDB();
  const card = await HistoryCard.findById(id).populate("createdBy", "name");
  if (!card) {
    return NextResponse.json({ error: "Card não encontrado" }, { status: 404 });
  }
  return NextResponse.json(card);
}

// PATCH /api/history-cards/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  const { error, user } = await requireRole("roteirista");
  if (error) return error;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  await connectDB();

  const card = await HistoryCard.findById(id);
  if (!card) {
    return NextResponse.json({ error: "Card não encontrado" }, { status: 404 });
  }

  const isOwner = card.createdBy.toString() === user.id;
  const isPrivileged = ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY.coordenador;
  if (!isOwner && !isPrivileged) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json();
  const update: Record<string, unknown> = {};

  if (body.title !== undefined) {
    const trimmed = String(body.title).trim();
    if (!trimmed) {
      return NextResponse.json({ error: "title não pode estar vazio" }, { status: 400 });
    }
    if (trimmed.length > 120) {
      return NextResponse.json({ error: "title deve ter no máximo 120 caracteres" }, { status: 400 });
    }
    update.title = trimmed;
  }

  if (body.description !== undefined) {
    update.description = String(body.description).trim().slice(0, 2000);
  }

  if (body.traits !== undefined) {
    const t = normalizeTraits(body.traits);
    if (t === null) {
      return NextResponse.json({ error: "traits inválido" }, { status: 400 });
    }
    update.traits = t;
  }

  if (body.attachments !== undefined) {
    const a = normalizeAttachments(body.attachments);
    if (a === null) {
      return NextResponse.json({ error: "attachments inválido" }, { status: 400 });
    }
    update.attachments = a;
  }

  if (body.coverImageUrl !== undefined) {
    if (body.coverImageUrl === null || body.coverImageUrl === "") {
      update.coverImageUrl = undefined;
    } else if (typeof body.coverImageUrl === "string" && isSafeUrl(body.coverImageUrl)) {
      update.coverImageUrl = body.coverImageUrl;
    } else {
      return NextResponse.json({ error: "coverImageUrl inválida" }, { status: 400 });
    }
  }

  const updated = await HistoryCard.findByIdAndUpdate(id, update, { new: true }).populate(
    "createdBy",
    "name"
  );

  return NextResponse.json(updated);
}

// DELETE /api/history-cards/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error, user } = await requireRole("roteirista");
  if (error) return error;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  await connectDB();

  const card = await HistoryCard.findById(id);
  if (!card) {
    return NextResponse.json({ error: "Card não encontrado" }, { status: 404 });
  }

  const isOwner = card.createdBy.toString() === user.id;
  const isPrivileged = ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY.coordenador;
  if (!isOwner && !isPrivileged) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  await HistoryCard.findByIdAndDelete(id);

  return NextResponse.json({ ok: true });
}
