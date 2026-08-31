import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchScheduleRange, writeDaySchedule } from "@/lib/googleSheets";
import { validateDaySchedule } from "@/lib/validators";
import { getEmployees } from "@/lib/employees";
import type { DaySchedule } from "@/types/schedule";

// GET /api/schedule?start=2026-08-01&end=2026-08-31
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  if (!start || !end) {
    return NextResponse.json(
      { error: "Parameter start dan end wajib diisi, format YYYY-MM-DD." },
      { status: 400 }
    );
  }

  try {
    const days = await fetchScheduleRange(start, end);
    return NextResponse.json({ days });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Gagal mengambil data dari Google Sheet." },
      { status: 500 }
    );
  }
}

// POST /api/schedule -- simpan assignment satu hari. Khusus supervisor/manager
// (dipakai AssignGrid). Validasi aturan bisnis dulu lewat validateDaySchedule();
// kalau ada error, tolak simpan dan kembalikan issues-nya tanpa menyentuh Sheet.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSupervisor) {
    return NextResponse.json(
      { error: "Hanya supervisor/manager yang bisa mengubah jadwal." },
      { status: 403 }
    );
  }

  const day = (await req.json()) as DaySchedule;
  const employees = await getEmployees();
  const issues = validateDaySchedule(day, employees);
  if (issues.some((i) => i.level === "error")) {
    return NextResponse.json({ issues }, { status: 400 });
  }

  try {
    await writeDaySchedule(day);
    return NextResponse.json({ ok: true, issues });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Gagal menyimpan ke Google Sheet." },
      { status: 500 }
    );
  }
}
