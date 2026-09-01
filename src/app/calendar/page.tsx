import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEmployeeCalendarToken, getEmployeeCalendarPushStatus } from "@/lib/employees";
import CalendarLinkCard from "@/components/CalendarLinkCard";
import CalendarPushCard from "@/components/CalendarPushCard";
import { CalendarIcon } from "@/components/icons";

export default async function CalendarSettingsPage({
  searchParams
}: {
  searchParams: { error?: string };
}) {
  const session = await getServerSession(authOptions);
  const employeeId = session?.user?.employeeId;

  if (!employeeId) {
    return <p className="card p-4 text-sm text-ink/60">Sesi tidak ditemukan, coba login ulang.</p>;
  }

  const [token, pushStatus] = await Promise.all([
    getEmployeeCalendarToken(employeeId),
    getEmployeeCalendarPushStatus(employeeId)
  ]);
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const icsUrl = `${baseUrl}/api/calendar/${token}`;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-1">Kamu</p>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-ink">
          <CalendarIcon className="h-5 w-5 text-accent" />
          Kalender saya
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          Subscribe jadwal kamu langsung ke Google Calendar pribadi, biar lebih ke-notice tiap hari.
        </p>
      </div>
      <CalendarPushCard
        connected={pushStatus.connected}
        connectedAt={pushStatus.connectedAt ? pushStatus.connectedAt.toISOString() : null}
        configured={Boolean(process.env.GOOGLE_CALENDAR_CLIENT_ID)}
        error={searchParams.error ?? null}
      />
      <CalendarLinkCard url={icsUrl} />
    </div>
  );
}
