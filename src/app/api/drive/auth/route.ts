import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";
import { requireRole } from "@/lib/auth-helpers";
import { getConsentUrl, isDriveConfigured } from "@/lib/google-drive";

// GET /api/drive/auth — inicia o fluxo OAuth. Só admin conecta a conta-fonte.
// Gera um state anti-CSRF guardado em cookie httpOnly e redireciona para o
// consentimento do Google.
export async function GET() {
  const { error } = await requireRole("admin");
  if (error) return error;

  if (!isDriveConfigured()) {
    return NextResponse.json(
      { error: "Credenciais do Google não configuradas no servidor" },
      { status: 503 }
    );
  }

  const state = crypto.randomBytes(16).toString("hex");
  const url = getConsentUrl(state);

  const jar = await cookies();
  jar.set("drive_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 min
  });

  return NextResponse.redirect(url);
}
