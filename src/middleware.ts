import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SUPERVISOR_ONLY_PATHS = ["/assign", "/approvals", "/team"];

// Semua halaman lewat middleware ini wajib login. /assign, /approvals, dan
// /team khusus supervisor/manager -- karyawan biasa yang mencoba akses
// langsung diarahkan balik ke dashboard (bukan ke /login, karena mereka
// sudah login, cuma tidak punya hak akses).
export default async function middleware(req: NextRequest) {
  const token = await getToken({ req });

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isRestricted = SUPERVISOR_ONLY_PATHS.some((p) => req.nextUrl.pathname.startsWith(p));
  if (isRestricted && !token.isSupervisor) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/requests/:path*", "/calendar/:path*", "/assign/:path*", "/approvals/:path*", "/team/:path*"]
};
