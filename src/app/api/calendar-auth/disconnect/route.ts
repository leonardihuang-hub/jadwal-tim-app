import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { clearEmployeeCalendarPushToken } from "@/lib/employees";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.employeeId) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }
  await clearEmployeeCalendarPushToken(session.user.employeeId);
  return NextResponse.json({ ok: true });
}
