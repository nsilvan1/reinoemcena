import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Roteiro from "@/models/Roteiro";
import TaskProgress from "@/models/TaskProgress";
import Scale from "@/models/Scale";
import Notification from "@/models/Notification";
import Comment from "@/models/Comment";
import { requireAuth, requireRole } from "@/lib/auth-helpers";
import { ROLE_HIERARCHY, Role } from "@/types";

const OBJECTID_REGEX = /^[0-9a-fA-F]{24}$/;

// GET /api/users/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user: currentUser } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  if (!OBJECTID_REGEX.test(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  await connectDB();

  const isAdmin = currentUser.role === "admin";
  const isSelf = currentUser.id === id;

  if (!isAdmin && !isSelf) {
    if (currentUser.role === "coordenador") {
      const target = await User.findById(id).select("managedBy").lean() as { managedBy?: mongoose.Types.ObjectId } | null;
      if (!target || !target.managedBy || target.managedBy.toString() !== currentUser.id) {
        return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
  }

  const user = await User.findById(id).select("-password");
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  return NextResponse.json(user);
}

// PUT /api/users/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user: currentUser } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  if (!OBJECTID_REGEX.test(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  await connectDB();
  const body = await req.json();

  // SELF-EDIT: whitelist fechada — NÃO adicione role/skills aqui (vetor de auto-elevação)
  if (currentUser.id === id) {
    const allowed: { name?: string; avatar?: string; password?: string } = {};
    if (body.name !== undefined) allowed.name = body.name;
    if (body.avatar !== undefined) allowed.avatar = body.avatar;
    if (body.password !== undefined) {
      if (typeof body.password !== "string" || body.password.length < 8) {
        return NextResponse.json({ error: "Senha deve ter no mínimo 8 caracteres" }, { status: 400 });
      }
      allowed.password = await bcrypt.hash(body.password, 12);
    }
    const updated = await User.findByIdAndUpdate(id, allowed, { new: true }).select("-password");
    return NextResponse.json(updated);
  }

  const userLevel = ROLE_HIERARCHY[currentUser.role as Role] || 0;
  if (userLevel < ROLE_HIERARCHY.coordenador) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const targetUser = await User.findById(id);
  if (!targetUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const targetLevel = ROLE_HIERARCHY[targetUser.role as Role] || 0;
  if (currentUser.role === "coordenador" && targetLevel >= ROLE_HIERARCHY.coordenador) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const updateData: { name?: string; role?: string; skills?: string[]; password?: string; avatar?: string } = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.role !== undefined) updateData.role = body.role;
  if (body.skills !== undefined) updateData.skills = body.skills;
  if (body.avatar !== undefined) updateData.avatar = body.avatar;
  if (body.password !== undefined) {
    if (typeof body.password !== "string" || body.password.length < 8) {
      return NextResponse.json({ error: "Senha deve ter no mínimo 8 caracteres" }, { status: 400 });
    }
    updateData.password = await bcrypt.hash(body.password, 12);
  }

  const updated = await User.findByIdAndUpdate(id, updateData, { new: true }).select("-password");
  return NextResponse.json(updated);
}

// DELETE /api/users/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user: currentUser } = await requireRole("coordenador");
  if (error) return error;

  const { id } = await params;

  if (!OBJECTID_REGEX.test(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  await connectDB();

  const target = await User.findById(id);
  if (!target) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const targetLevel = ROLE_HIERARCHY[target.role as Role] || 0;
  if (currentUser.role === "coordenador" && targetLevel >= ROLE_HIERARCHY.coordenador) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  // Verificar vínculos ativos antes de excluir
  if (await User.exists({ managedBy: id })) {
    return NextResponse.json({ error: "Usuário possui membros vinculados" }, { status: 409 });
  }
  if (await TaskProgress.exists({ userId: id })) {
    return NextResponse.json({ error: "Usuário possui progresso registrado" }, { status: 409 });
  }
  if (await Roteiro.exists({ $or: [{ createdBy: id }, { assignedEditors: id }, { assignedNarrators: id }] })) {
    return NextResponse.json({ error: "Usuário está vinculado a roteiros" }, { status: 409 });
  }
  if (await Scale.exists({ createdBy: id })) {
    return NextResponse.json({ error: "Usuário possui escalas criadas" }, { status: 409 });
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Notification.deleteMany({ userId: id }).session(session);
      await Comment.deleteMany({ userId: id }).session(session);
      await User.findByIdAndDelete(id).session(session);
    });
  } catch (err: unknown) {
    await session.endSession();
    console.error("[DELETE /api/users/[id]]", err);
    return NextResponse.json({ error: "Erro interno ao excluir usuário" }, { status: 500 });
  }

  await session.endSession();
  return NextResponse.json({ success: true });
}
