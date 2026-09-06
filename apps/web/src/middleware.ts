import { NextResponse, type NextRequest } from "next/server";

import { ROLE_HOME, canAccess } from "@/lib/auth-types";
import { SESSION_COOKIE, readSessionToken } from "@/lib/session";

/**
 * Route protection.
 *
 * Runs before every protected page, on the edge runtime — which is why the
 * session's role travels inside the signed token rather than being looked up:
 * there is no database here, and putting one on this path would tax every
 * request.
 *
 * This gates *visibility*, not authority. Every state-changing operation is
 * still checked by the contracts, so getting past this middleware does not let
 * anyone move an asset they could not otherwise move.
 */
const PROTECTED = ["/console", "/gate", "/audit", "/card"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    const login = new URL("/login", request.url);
    // Come back here once they have signed in, rather than dumping them on a
    // generic landing page and making them navigate again.
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (!canAccess(session.role, pathname)) {
    // Signed in, but wrong role — send them to their own surface rather than
    // showing a dead end.
    return NextResponse.redirect(new URL(ROLE_HOME[session.role], request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/console/:path*", "/gate/:path*", "/audit/:path*", "/card/:path*"],
};
