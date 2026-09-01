import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Alur "hubungkan Google Calendar" terpisah total dari login (ops-sso cuma
// balikin {name,email}, tidak ada token Calendar sama sekali) -- ini OAuth
// Google langsung, khusus minta izin scope calendar.events. Client ID/Secret
// beda dari yang dipakai login (GOOGLE_CALENDAR_CLIENT_ID, bukan
// GOOGLE_CLIENT_ID), dibuat di project Google Cloud yang sama dengan ops-sso.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.employeeId) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL("/calendar?error=calendar_push_not_configured", baseUrl));
  }

  const state = randomBytes(24).toString("base64url");

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", `${baseUrl}/api/calendar-auth/callback`);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/calendar.events");
  authUrl.searchParams.set("access_type", "offline");
  // Paksa layar consent muncul lagi tiap kali, supaya Google selalu balikin
  // refresh_token baru (default-nya cuma dikasih sekali waktu izin PERTAMA).
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("login_hint", session.user.email ?? "");
  authUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(authUrl);
  res.cookies.set("gcal_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300,
    path: "/"
  });
  return res;
}
