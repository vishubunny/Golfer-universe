import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "dh_session";

function getSecret(): Uint8Array | null {
  if (!process.env.JWT_SECRET) return null;
  return new TextEncoder().encode(process.env.JWT_SECRET);
}

/**
 * Auth gate — redirects unauthenticated users away from /dashboard and /admin.
 * Uses local JWT cookie (no Supabase).
 */
export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  let authed = false;
  const secret = getSecret();
  if (token && secret) {
    try { await jwtVerify(token, secret); authed = true; } catch { /* invalid */ }
  }
  if (!authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"]
};

