import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { NextResponse } from "next/server";
import { Role, ROLE_HIERARCHY } from "@/types";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Não autorizado" }, { status: 401 }), user: null };
  }
  return { error: null, user: session.user as any };
}

export async function requireRole(minRole: Role) {
  const { error, user } = await requireAuth();
  if (error) return { error, user: null };

  const userLevel = ROLE_HIERARCHY[user.role as Role] || 0;
  const requiredLevel = ROLE_HIERARCHY[minRole];

  if (userLevel < requiredLevel) {
    return {
      error: NextResponse.json({ error: "Sem permissão" }, { status: 403 }),
      user: null,
    };
  }

  return { error: null, user };
}
