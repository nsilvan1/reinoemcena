import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function proxy(_request: NextRequest) {
  // Passthrough — autorização é por handler via requireAuth()/requireRole(). Veja AGENTS.md.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
