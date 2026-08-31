"use client";

import { useEffect, useState } from "react";
import { addDays, addMonths, addWeeks, endOfMonth, format, isSameMonth, startOfMonth, startOfWeek, subMonths, subWeeks } from "date-fns";
import type { DaySchedule } from "@/types/schedule";
import { useEmployees } from "@/components/EmployeeProvider";
import WeekCalendar from "./WeekCalendar";
import MonthCalendar from "./MonthCalendar";
import ShiftSummary from "./ShiftSummary";

const LEGEND = [
  { label: "Polisi", colorClass: "bg-blue-400" },
  { label: "Middle", colorClass: "bg-violet-400" },
  { label: "Piket", colorClass: "bg-teal-400" },
  { label: "GH", colorClass: "bg-pink-400" },
  { label: "Cuti", colorClass: "bg-warning" },
  { label: "Libur/OT", colorClass: "bg-danger" }
];

export default function ScheduleView() {
  const employees = useEmployees();
  const [view, setView] = useState<"week" | "month">("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [days, setDays] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const rangeStart = view === "week" ? startOfWeek(anchor, { weekStartsOn: 1 }) : startOfMonth(anchor);
  const rangeEnd = view === "week" ? addDays(rangeStart, 6) : endOfMonth(anchor);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/schedule?start=${format(rangeStart, "yyyy-MM-dd")}&end=${format(rangeEnd, "yyyy-MM-dd")}`)
      .then((res) => res.json())
      .then((data) => setDays(data.days ?? []))
      .catch(() => setDays([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, rangeStart.getTime(), rangeEnd.getTime()]);

  function goPrev() {
    setAnchor((prev) => (view === "week" ? subWeeks(prev, 1) : subMonths(prev, 1)));
  }
  function goNext() {
    setAnchor((prev) => (view === "week" ? addWeeks(prev, 1) : addMonths(prev, 1)));
  }
  function goToday() {
    setAnchor(new Date());
  }

  const isCurrentPeriod =
    view === "week"
      ? startOfWeek(new Date(), { weekStartsOn: 1 }).getTime() === rangeStart.getTime()
      : isSameMonth(anchor, new Date());

  const periodLabel =
    view === "week" ? `${format(rangeStart, "d MMM")} - ${format(rangeEnd, "d MMM yyyy")}` : format(anchor, "MMMM yyyy");

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-line bg-surface p-1">
          <button onClick={() => setView("week")} className={view === "week" ? "pill-toggle-active" : "pill-toggle"}>
            Minggu
          </button>
          <button onClick={() => setView("month")} className={view === "month" ? "pill-toggle-active" : "pill-toggle"}>
            Bulan
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={goPrev} aria-label="Sebelumnya" className="icon-btn">
            &#8592;
          </button>
          <span className="min-w-[9.5rem] text-center text-sm font-medium text-ink">{periodLabel}</span>
          <button onClick={goNext} aria-label="Berikutnya" className="icon-btn">
            &#8594;
          </button>
          {!isCurrentPeriod && (
            <button onClick={goToday} className="btn-ghost">
              Hari ini
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {LEGEND.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5 text-xs text-ink/60">
            <span className={`h-2 w-2 rounded-full ${item.colorClass}`} />
            {item.label}
          </span>
        ))}
      </div>

      {loading && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="card h-24 animate-pulse bg-line/30" />
          ))}
        </div>
      )}
      {!loading && view === "week" && <WeekCalendar days={days} employees={employees} />}
      {!loading && view === "month" && (
        <div className="space-y-4">
          <MonthCalendar monthDate={anchor} days={days} employees={employees} />
          <ShiftSummary days={days} employees={employees} />
        </div>
      )}
    </div>
  );
}
