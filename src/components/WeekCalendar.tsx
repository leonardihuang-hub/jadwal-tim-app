import type { DaySchedule, PublicEmployee } from "@/types/schedule";
import { format, isToday } from "date-fns";

export default function WeekCalendar({ days, employees }: { days: DaySchedule[]; employees: PublicEmployee[] }) {
  function nameOf(id?: string) {
    if (!id) return null;
    return employees.find((e) => e.id === id)?.name ?? id;
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {days.map((day) => {
        const date = new Date(day.date);
        const dow = date.getDay();
        const isSunday = dow === 0;
        const today = isToday(date);
        return (
          <div
            key={day.date}
            className={`card p-3 ${
              today ? "border-accent bg-accent/5" : day.isHoliday ? "bg-danger/10" : isSunday ? "bg-line/20" : ""
            }`}
          >
            <div className="mb-2 flex items-center justify-between gap-1">
              <p className="eyebrow">{format(date, "EEE, d MMM")}</p>
              {today && <span className="badge-today">Hari ini</span>}
            </div>
            <div className="space-y-1">
              {day.isHoliday ? (
                day.overtimeEmployeeIds.length ? (
                  day.overtimeEmployeeIds.map((id) => (
                    <p key={id} className="text-xs font-medium text-danger">
                      {nameOf(id)} &middot; OT
                    </p>
                  ))
                ) : (
                  <p className="text-xs text-ink/40">Belum diisi</p>
                )
              ) : isSunday ? (
                day.piketMinggu ? (
                  <p className="text-xs font-medium text-teal-400">{nameOf(day.piketMinggu)} &middot; Piket</p>
                ) : (
                  <p className="text-xs text-ink/40">Belum diisi</p>
                )
              ) : (
                <>
                  {nameOf(day.shiftPagiPolisi) && (
                    <p className="text-xs font-medium text-blue-400">{nameOf(day.shiftPagiPolisi)} &middot; Polisi</p>
                  )}
                  {nameOf(day.shiftMiddle) && (
                    <p className="text-xs font-medium text-violet-400">{nameOf(day.shiftMiddle)} &middot; Middle</p>
                  )}
                </>
              )}
              {day.cutiEmployeeIds.map((id) => (
                <p key={id} className="text-xs font-medium text-warning">
                  {nameOf(id)} &middot; Cuti
                </p>
              ))}
              {day.gantiHariEmployeeIds.map((id) => (
                <p key={id} className="text-xs font-medium text-pink-400">
                  {nameOf(id)} &middot; GH
                </p>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
