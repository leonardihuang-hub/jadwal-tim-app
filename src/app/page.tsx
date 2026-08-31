import { format } from "date-fns";
import TodayOverview from "@/components/TodayOverview";
import ScheduleView from "@/components/ScheduleView";
import IncomingSwapNotice from "@/components/IncomingSwapNotice";
import { CalendarIcon } from "@/components/icons";
import { fetchScheduleRange } from "@/lib/googleSheets";
import { getEmployees } from "@/lib/employees";

export default async function DashboardPage() {
  const todayIso = format(new Date(), "yyyy-MM-dd");
  const employees = await getEmployees();

  // TODO: begitu kredensial Sheets API tersambung, ini akan menarik data
  // asli. Sebelum itu, fetchScheduleRange akan melempar error -- ditangkap
  // di bawah supaya halaman tetap render sementara setup belum lengkap.
  let today;
  try {
    const days = await fetchScheduleRange(todayIso, todayIso);
    today = days[0];
  } catch {
    today = undefined;
  }

  return (
    <div className="space-y-10">
      <IncomingSwapNotice />

      <section>
        <p className="eyebrow mb-1">{format(new Date(), "EEEE")}</p>
        <h1 className="mb-5 text-2xl font-semibold text-ink">{format(new Date(), "d MMMM yyyy")}</h1>
        {today ? (
          <TodayOverview day={today} employees={employees} />
        ) : (
          <p className="card p-4 text-sm text-ink/60">
            Belum tersambung ke Google Sheet. Lengkapi kredensial di .env, lihat README.md.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-ink">
          <CalendarIcon className="h-4 w-4 text-accent" />
          Kalender
        </h2>
        <ScheduleView />
      </section>
    </div>
  );
}
