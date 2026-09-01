import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

// Titik masuk login "beneran" (bukan dev-login) -- lihat README-OPS-SSO.md
// §10a. Kita sendiri TIDAK PERNAH bicara ke Google: browser diarahkan ke
// ops-sso, yang mengurus seluruh pertukaran OAuth dengan Google, lalu
// mengarahkan balik ke /api/auth/sso/callback di bawah.
export async function GET(req: Request) {
  const baseUrl = process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
  const clientId = process.env.OPS_SSO_CLIENT_ID;
  const ssoBaseUrl = process.env.OPS_SSO_BASE_URL;

  if (!clientId || !ssoBaseUrl) {
    return NextResponse.redirect(new URL("/login?error=sso_not_configured", baseUrl));
  }

  // state acak untuk cegah CSRF di roundtrip ini (§9.7) -- disimpan di
  // cookie httpOnly, dicocokkan lagi waktu /callback.
  const state = randomBytes(24).toString("base64url");

  const loginUrl = new URL(`${ssoBaseUrl}/login`);
  loginUrl.searchParams.set("client_id", clientId);
  loginUrl.searchParams.set("redirect_uri", `${baseUrl}/api/auth/sso/callback`);
  loginUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(loginUrl);
  res.cookies.set("ops_sso_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300,
    path: "/"
  });
  return res;
}
