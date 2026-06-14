/**
 * Auth Middleware — cookie-based session
 * เปลี่ยนจาก Basic Auth (popup บน iOS ใช้งานยาก) เป็น login page + cookie
 */
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout", "/api/checkout", "/api/stripe/webhook", "/checkout"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ปล่อยผ่าน public paths + static assets
  if (
    PUBLIC_PATHS.some(p => pathname.startsWith(p)) ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // ตรวจ session cookie
  const pass = process.env.BASIC_AUTH_PASSWORD || "kaizen123";
  const expected = btoa(pass + ":zenkai-session");
  const cookie = req.cookies.get("zenkai-auth");

  if (cookie?.value === expected) {
    return NextResponse.next();
  }

  // redirect ไปหน้า login
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
