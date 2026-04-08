import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { requireRole } from "@/lib/auth-helpers";

// GET /api/users — listar membros
export async function GET() {
  const { error, user } = await requireRole("membro");
  if (error) return error;

  await connectDB();

  let filter = {};
  // Coordenador só vê membros gerenciados por ele
  if (user.role === "coordenador") {
    filter = { $or: [{ managedBy: user.id }, { _id: user.id }] };
  }

  const users = await User.find(filter).select("-password").sort({ name: 1 });
  return NextResponse.json(users);
}

// POST /api/users — criar membro
export async function POST(req: NextRequest) {
  const { error, user } = await requireRole("coordenador");
  if (error) return error;

  await connectDB();
  const body = await req.json();
  const { name, username, password, role, skills } = body;

  if (!name || !username || !password) {
    return NextResponse.json({ error: "Nome, usuário e senha são obrigatórios" }, { status: 400 });
  }

  // Coordenador não pode criar admin ou outro coordenador
  if (user.role === "coordenador" && (role === "admin" || role === "coordenador")) {
    return NextResponse.json({ error: "Sem permissão para criar esse papel" }, { status: 403 });
  }

  const exists = await User.findOne({ username: username.toLowerCase() });
  if (exists) {
    return NextResponse.json({ error: "Usuário já cadastrado" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await User.create({
    name,
    username: username.toLowerCase(),
    password: hashedPassword,
    role: role || "membro",
    skills: skills || [],
    managedBy: user.role === "coordenador" ? user.id : undefined,
  });

  const result = newUser.toObject();
  delete result.password;
  return NextResponse.json(result, { status: 201 });
}
