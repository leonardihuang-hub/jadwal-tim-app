import { NextResponse } from "next/server";
import { format, addDays, subDays } from "date-fns";
import { getEmployeeByCalendarToken } from "@/lib/employees";
import { fetchScheduleRange } from "@/lib/googleSheets";
import { buildIcsFeed } from "@/lib/ics";

// Endpoint publik (TANPA cek sesi login) -- ini yang diakses langsung oleh
// Google Calendar tiap kali refresh feed, bukan lewat browser yang login.
// Keamanannya ada di token acak itu sendiri (lihat getEmployeeCalendarToken),
// bukan di cookie session.
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const employee = await getEmployeeByCalendarToken(params.token);
  if (!employee) {
    return NextResponse.json({ error: "Link kalender tidak valid." }, { status: 404 });
  }

  const today = new Date();
  const startDate = format(subDays(today, 14), "yyyy-MM-dd");
  const endDate = format(addDays(today, 90), "yyyy-MM-dd");

  let days: Awaited<ReturnType<typeof fetchScheduleRange>> = [];
  try {
    days = await fetchScheduleRange(startDate, endDate);
  } catch {
    // Sheet lagi tidak bisa diakses -- balas kalender kosong daripada error,
    // supaya Google Calendar tidak nge-drop subscription-nya.
    days = [];
  }

  const ics = buildIcsFeed(employee, days);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="jadwal-${employee.id}.ics"`,
      "Cache-Control": "no-cache"
    }
  });
}
