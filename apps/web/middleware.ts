import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout"];

function getExpectedToken() {
  const secret = process.env.BASIC_AUTH_SECRET;
  if (!secret) return null;
  return btoa(`${secret}:zenkai-session`);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC_PATHS.some((path) => pathname.startsWith(path)) ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const expected = getExpectedToken();
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "auth_not_configured" },
      { status: 503 }
    );
  }

  const cookie = req.cookies.get("zenkai-auth");
  if (cookie?.value === expected) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
