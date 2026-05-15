import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { requireRole } from "@/lib/auth-helpers";

const USERNAME_REGEX = /^[a-z0-9._-]{3,20}$/;

// GET /api/users — listar membros
export async function GET() {
  const { error, user } = await requireRole("membro");
  if (error) return error;

  await connectDB();

  let filter = {};
  if (user.role === "coordenador") {
    filter = { $or: [{ managedBy: user.id }, { _id: user.id }] };
  }

  const users = await User.find(filter).select("-password").sort({ name: 1 });
  return NextResponse.json(users);
}

// POST /api/users — criar membro (coordenador+)
export async function POST(req: NextRequest) {
  const { error, user } = await requireRole("coordenador");
  if (error) return error;

  const body = await req.json();
  const { name, username, password, role, skills } = body;

  if (!name || !username || !password) {
    return NextResponse.json({ error: "Nome, usuário e senha são obrigatórios" }, { status: 400 });
  }

  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Senha deve ter no mínimo 8 caracteres" }, { status: 400 });
  }

  if (!USERNAME_REGEX.test(username)) {
    return NextResponse.json(
      { error: "Usuário deve ter entre 3 e 20 caracteres (letras minúsculas, números, . _ -)" },
      { status: 400 }
    );
  }

  if (user.role === "coordenador" && (role === "admin" || role === "coordenador")) {
    return NextResponse.json({ error: "Sem permissão para criar esse papel" }, { status: 403 });
  }

  await connectDB();

  const exists = await User.findOne({ username: username.toLowerCase() });
  if (exists) {
    return NextResponse.json({ error: "Usuário já cadastrado" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
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
