import type { DaySchedule, PublicEmployee } from "@/types/schedule";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday
} from "date-fns";

// days: seluruh DaySchedule dalam rentang bulan yang mau ditampilkan, sudah
// diambil lewat GET /api/schedule?start=...&end=...
export default function MonthCalendar({
  monthDate,
  days,
  employees
}: {
  monthDate: Date;
  days: DaySchedule[];
  employees: PublicEmployee[];
}) {
  function nameOf(id?: string) {
    if (!id) return null;
    return employees.find((e) => e.id === id)?.name ?? id;
  }

  const byDate = new Map(days.map((d) => [d.date, d]));
  const gridStart = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
  const cells = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-line text-center text-xs font-medium text-ink/40">
        {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
          <span key={d} className="py-2">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          const iso = format(date, "yyyy-MM-dd");
          const day = byDate.get(iso);
          const inMonth = isSameMonth(date, monthDate);
          const today = isToday(date);
          return (
            <div
              key={iso}
              className={`min-h-[76px] border-b border-line/70 p-1.5 ${
                (i + 1) % 7 !== 0 ? "border-r" : ""
              } ${today ? "ring-2 ring-inset ring-accent bg-accent/5" : day?.isHoliday ? "bg-danger/10" : "bg-surface"} ${
                inMonth ? "" : "opacity-35"
              }`}
            >
              <div className="flex items-center gap-1">
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                    today ? "bg-accent font-medium text-white" : day?.isHoliday ? "text-danger" : "text-ink/50"
                  }`}
                >
                  {format(date, "d")}
                </span>
                {today && (
                  <span className="text-[8px] font-semibold uppercase tracking-wide text-accent">Hari ini</span>
                )}
              </div>
              <div className="mt-1 space-y-0.5">
                {day?.isHoliday
                  ? day.overtimeEmployeeIds.map((id) => (
                      <p key={id} className="truncate text-[10px] font-medium text-danger">
                        {nameOf(id)} <span className="font-normal text-danger/70">(OT)</span>
                      </p>
                    ))
                  : (
                    <>
                      {nameOf(day?.shiftPagiPolisi) && (
                        <p className="truncate text-[10px] font-medium text-blue-400">
                          {nameOf(day?.shiftPagiPolisi)} <span className="font-normal text-blue-400/60">(polisi)</span>
                        </p>
                      )}
                      {nameOf(day?.shiftMiddle) && (
                        <p className="truncate text-[10px] font-medium text-violet-400">
                          {nameOf(day?.shiftMiddle)} <span className="font-normal text-violet-400/60">(middle)</span>
                        </p>
                      )}
                      {nameOf(day?.piketMinggu) && (
                        <p className="truncate text-[10px] font-medium text-teal-400">
                          {nameOf(day?.piketMinggu)} <span className="font-normal text-teal-400/60">(piket)</span>
                        </p>
                      )}
                    </>
                  )}
                {day?.cutiEmployeeIds.map((id) => (
                  <p key={id} className="truncate text-[10px] font-medium text-warning">
                    {nameOf(id)} <span className="font-normal text-warning/70">(cuti)</span>
                  </p>
                ))}
                {day?.gantiHariEmployeeIds.map((id) => (
                  <p key={id} className="truncate text-[10px] font-medium text-pink-400">
                    {nameOf(id)} <span className="font-normal text-pink-400/60">(GH)</span>
                  </p>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
