import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { setEmployeeCalendarPushToken } from "@/lib/employees";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const baseUrl = process.env.NEXTAUTH_URL ?? url.origin;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  function fail(reason: string) {
    const res = NextResponse.redirect(new URL(`/calendar?error=${reason}`, baseUrl));
    res.cookies.delete("gcal_oauth_state");
    return res;
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.employeeId) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  if (error) return fail(`google_${error}`);

  const expectedState = cookies().get("gcal_oauth_state")?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    return fail("state_mismatch");
  }

  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return fail("calendar_push_not_configured");
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: `${baseUrl}/api/calendar-auth/callback`
    })
  });

  if (!tokenRes.ok) {
    console.error("Gagal tukar code Google Calendar:", await tokenRes.text());
    return fail("google_exchange_failed");
  }

  const tokenData = (await tokenRes.json()) as { refresh_token?: string };
  if (!tokenData.refresh_token) {
    // Google tidak balikin refresh_token kalau user sudah pernah kasih izin
    // sebelumnya dan `prompt=consent` gagal memaksanya muncul lagi (jarang,
    // tapi bisa terjadi). Minta user coba lagi.
    return fail("no_refresh_token");
  }

  await setEmployeeCalendarPushToken(session.user.employeeId, tokenData.refresh_token);

  const res = NextResponse.redirect(new URL("/calendar?connected=1", baseUrl));
  res.cookies.delete("gcal_oauth_state");
  return res;
}
