import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { google } from "googleapis";
import { connectDB } from "@/lib/mongodb";
import DriveConnection from "@/models/DriveConnection";
import { requireRole } from "@/lib/auth-helpers";
import { createOAuthClient } from "@/lib/google-drive";

// GET /api/drive/callback — recebe o code do Google, troca por tokens e
// persiste a conexão singleton. Redireciona de volta ao Acervo.
export async function GET(req: NextRequest) {
  const { error, user } = await requireRole("admin");
  if (error) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  const back = (status: string) =>
    NextResponse.redirect(new URL(`/acervo?drive=${status}`, req.url));

  if (oauthError) return back("denied");
  if (!code || !state) return back("invalid");

  // Valida o state anti-CSRF.
  const jar = await cookies();
  const expected = jar.get("drive_oauth_state")?.value;
  jar.delete("drive_oauth_state");
  if (!expected || expected !== state) return back("invalid");

  try {
    const client = createOAuthClient();
    const { tokens } = await client.getToken(code);

    if (!tokens.refresh_token) {
      // Sem refresh_token não conseguimos renovar depois. Acontece quando o
      // usuário já havia consentido antes; o prompt=consent deveria evitar.
      return back("norefresh");
    }

    client.setCredentials(tokens);

    // Descobre o email da conta conectada (drive.readonly permite about.get).
    let accountEmail: string | undefined;
    try {
      const drive = google.drive({ version: "v3", auth: client });
      const about = await drive.about.get({ fields: "user(emailAddress)" });
      accountEmail = about.data.user?.emailAddress ?? undefined;
    } catch {
      // best-effort
    }

    await connectDB();
    await DriveConnection.findOneAndUpdate(
      { key: "default" },
      {
        key: "default",
        refreshToken: tokens.refresh_token,
        accessToken: tokens.access_token ?? undefined,
        expiresAt: tokens.expiry_date ?? undefined,
        accountEmail,
        connectedBy: user.id,
      },
      { upsert: true, new: true }
    );

    return back("connected");
  } catch (err) {
    console.error("[drive callback]", err);
    return back("error");
  }
}
