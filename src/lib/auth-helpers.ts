import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { NextResponse } from "next/server";
import { Role, ROLE_HIERARCHY } from "@/types";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  image?: string | null;
}

type AuthSuccess = { error: null; user: SessionUser };
type AuthFailure = { error: NextResponse; user: null };
type AuthResult = AuthSuccess | AuthFailure;

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireAuth(): Promise<AuthResult> {
  const session = await getSession();
  if (!session?.user) {
    return {
      error: NextResponse.json({ error: "Não autorizado" }, { status: 401 }),
      user: null,
    };
  }
  return { error: null, user: session.user as SessionUser };
}

export async function requireRole(minRole: Role): Promise<AuthResult> {
  const result = await requireAuth();
  if (result.error) return result;

  const userLevel = ROLE_HIERARCHY[result.user.role] || 0;
  const requiredLevel = ROLE_HIERARCHY[minRole];

  if (userLevel < requiredLevel) {
    return {
      error: NextResponse.json({ error: "Sem permissão" }, { status: 403 }),
      user: null,
    };
  }

  return result;
}
