import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Menerima balikan dari ops-sso (?code&state, atau ?error kalau login
// gagal/domain ditolak -- lihat README-OPS-SSO.md §4). Tugas di sini cuma
// verifikasi `state` (cegah CSRF), lalu oper `code` ke halaman /login supaya
// LoginForm (client component) yang memicu next-auth signIn("ops-sso", ...)
// -- pertukaran code -> {name,email} yang sesungguhnya terjadi di
// authorize() provider "ops-sso" (lib/auth.ts), bukan di sini.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const baseUrl = process.env.NEXTAUTH_URL ?? url.origin;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const expectedState = cookies().get("ops_sso_state")?.value;

  function fail(reason: string) {
    const res = NextResponse.redirect(new URL(`/login?error=${reason}`, baseUrl));
    res.cookies.delete("ops_sso_state");
    return res;
  }

  if (error) return fail(`sso_${error}`);
  if (!code || !state || !expectedState || state !== expectedState) {
    return fail("sso_state_mismatch");
  }

  const res = NextResponse.redirect(new URL(`/login?ssoCode=${encodeURIComponent(code)}`, baseUrl));
  res.cookies.delete("ops_sso_state");
  return res;
}
