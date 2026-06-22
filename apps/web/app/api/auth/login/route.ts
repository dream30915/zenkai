import { NextRequest, NextResponse } from "next/server";

function getAuthConfig() {
  const password = process.env.BASIC_AUTH_PASSWORD;
  const secret = process.env.BASIC_AUTH_SECRET;

  if (!password || !secret) return null;

  return {
    password,
    token: btoa(`${secret}:zenkai-session`),
  };
}

export async function POST(req: NextRequest) {
  const auth = getAuthConfig();
  if (!auth) {
    return NextResponse.json(
      { ok: false, error: "auth_not_configured" },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  if (body?.password !== auth.password) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("zenkai-auth", auth.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}
