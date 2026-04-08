import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { requireAuth, requireRole } from "@/lib/auth-helpers";
import { ROLE_HIERARCHY, Role } from "@/types";

// GET /api/users/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;

  await connectDB();
  const { id } = await params;
  const user = await User.findById(id).select("-password");
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  return NextResponse.json(user);
}

// PUT /api/users/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user: currentUser } = await requireAuth();
  if (error) return error;

  await connectDB();
  const { id } = await params;
  const body = await req.json();

  // Membro só edita o próprio perfil (nome, avatar)
  if (currentUser.id === id) {
    const allowed: Record<string, any> = {};
    if (body.name) allowed.name = body.name;
    if (body.avatar !== undefined) allowed.avatar = body.avatar;
    if (body.password) allowed.password = await bcrypt.hash(body.password, 10);
    const updated = await User.findByIdAndUpdate(id, allowed, { new: true }).select("-password");
    return NextResponse.json(updated);
  }

  // Precisa ser coordenador+ pra editar outros
  const userLevel = ROLE_HIERARCHY[currentUser.role as Role] || 0;
  if (userLevel < ROLE_HIERARCHY.coordenador) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const targetUser = await User.findById(id);
  if (!targetUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  // Coordenador não edita admin ou outro coordenador
  const targetLevel = ROLE_HIERARCHY[targetUser.role as Role] || 0;
  if (currentUser.role === "coordenador" && targetLevel >= ROLE_HIERARCHY.coordenador) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const updateData: Record<string, any> = {};
  if (body.name) updateData.name = body.name;
  if (body.role) updateData.role = body.role;
  if (body.skills) updateData.skills = body.skills;
  if (body.password) updateData.password = await bcrypt.hash(body.password, 10);
  if (body.avatar !== undefined) updateData.avatar = body.avatar;

  const updated = await User.findByIdAndUpdate(id, updateData, { new: true }).select("-password");
  return NextResponse.json(updated);
}

// DELETE /api/users/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user: currentUser } = await requireRole("coordenador");
  if (error) return error;

  await connectDB();
  const { id } = await params;
  const target = await User.findById(id);
  if (!target) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const targetLevel = ROLE_HIERARCHY[target.role as Role] || 0;
  if (currentUser.role === "coordenador" && targetLevel >= ROLE_HIERARCHY.coordenador) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  await User.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
