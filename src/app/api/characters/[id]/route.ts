import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Character from "@/models/Character";
import { requireAuth, requireRole } from "@/lib/auth-helpers";
import { isSafeUrl } from "@/lib/url-safe";
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

function normalizeGallery(input: unknown): string[] | null {
  if (input === undefined) return null;
  if (!Array.isArray(input)) return null;
  const cleaned: string[] = [];
  for (const url of input) {
    if (typeof url === "string" && isSafeUrl(url)) cleaned.push(url);
  }
  return cleaned.slice(0, 20);
}

// GET /api/characters/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  await connectDB();
  const character = await Character.findById(id).populate("createdBy", "name");
  if (!character) {
    return NextResponse.json({ error: "Personagem não encontrado" }, { status: 404 });
  }
  return NextResponse.json(character);
}

// PATCH /api/characters/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  const { error, user } = await requireRole("roteirista");
  if (error) return error;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  await connectDB();

  const character = await Character.findById(id);
  if (!character) {
    return NextResponse.json({ error: "Personagem não encontrado" }, { status: 404 });
  }

  const isOwner = character.createdBy.toString() === user.id;
  const isPrivileged = ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY.coordenador;
  if (!isOwner && !isPrivileged) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json();
  const update: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const trimmedName = String(body.name).trim();
    if (!trimmedName) {
      return NextResponse.json({ error: "name não pode estar vazio" }, { status: 400 });
    }
    if (trimmedName.length > 80) {
      return NextResponse.json({ error: "name deve ter no máximo 80 caracteres" }, { status: 400 });
    }
    update.name = trimmedName;
  }

  if (body.description !== undefined) {
    update.description = String(body.description).trim().slice(0, 1000);
  }

  if (body.traits !== undefined) {
    const t = normalizeTraits(body.traits);
    if (t === null) {
      return NextResponse.json({ error: "traits inválido" }, { status: 400 });
    }
    update.traits = t;
  }

  if (body.gallery !== undefined) {
    const g = normalizeGallery(body.gallery);
    if (g === null) {
      return NextResponse.json({ error: "gallery inválido" }, { status: 400 });
    }
    update.gallery = g;
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

  const updated = await Character.findByIdAndUpdate(id, update, { new: true }).populate(
    "createdBy",
    "name"
  );

  return NextResponse.json(updated);
}

// DELETE /api/characters/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error, user } = await requireRole("roteirista");
  if (error) return error;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  await connectDB();

  const character = await Character.findById(id);
  if (!character) {
    return NextResponse.json({ error: "Personagem não encontrado" }, { status: 404 });
  }

  const isOwner = character.createdBy.toString() === user.id;
  const isPrivileged = ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY.coordenador;
  if (!isOwner && !isPrivileged) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  await Character.findByIdAndDelete(id);

  return NextResponse.json({ ok: true });
}
