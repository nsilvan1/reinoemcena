import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Character from "@/models/Character";
import { requireRole } from "@/lib/auth-helpers";
import { isSafeUrl } from "@/lib/sanitize";
import { ROLE_HIERARCHY } from "@/types";

type Params = { params: Promise<{ id: string }> };

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

  // Autorização: criador original OU admin/coordenador
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
      return NextResponse.json(
        { error: "name deve ter no máximo 80 caracteres" },
        { status: 400 }
      );
    }
    update.name = trimmedName;
  }

  if (body.description !== undefined) {
    update.description = String(body.description).trim().slice(0, 500);
  }

  if (body.prompt !== undefined) {
    update.prompt = String(body.prompt).trim().slice(0, 4000);
  }

  if (body.imageUrl !== undefined) {
    if (body.imageUrl === null || body.imageUrl === "") {
      update.imageUrl = undefined;
    } else if (typeof body.imageUrl === "string" && isSafeUrl(body.imageUrl)) {
      update.imageUrl = body.imageUrl;
    } else {
      return NextResponse.json({ error: "imageUrl inválida" }, { status: 400 });
    }
  }

  const updated = await Character.findByIdAndUpdate(id, update, { new: true }).populate(
    "createdBy",
    "name"
  );

  return NextResponse.json(updated);
}

// DELETE /api/characters/[id]
export async function DELETE(req: NextRequest, { params }: Params) {
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

  // Autorização: criador original OU admin/coordenador
  const isOwner = character.createdBy.toString() === user.id;
  const isPrivileged = ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY.coordenador;
  if (!isOwner && !isPrivileged) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  await Character.findByIdAndDelete(id);

  return NextResponse.json({ ok: true });
}
