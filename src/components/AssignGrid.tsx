"use client";

import { useEffect, useState } from "react";
import { addDays, addWeeks, format, startOfWeek, subWeeks } from "date-fns";
import { useEmployees } from "@/components/EmployeeProvider";
import MultiSelect from "@/components/MultiSelect";
import type { DaySchedule } from "@/types/schedule";
import type { ValidationIssue } from "@/lib/validators";

function emptyDay(date: string): DaySchedule {
  return {
    date,
    isHoliday: false,
    overtimeEmployeeIds: [],
    cutiEmployeeIds: [],
    gantiHariEmployeeIds: [],
    offMiddleEmployeeIds: [],
    offMonitoringEmployeeIds: []
  };
}

type RowStatus = { saving: boolean; issues: ValidationIssue[]; savedAt?: number };

export default function AssignGrid() {
  const employees = useEmployees();
  const activeEmployees = employees.filter((e) => e.isActive);
  const nameOf = (id: string): string => employees.find((e) => e.id === id)?.name ?? id;
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const dates = Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), "yyyy-MM-dd"));

  const [days, setDays] = useState<Record<string, DaySchedule>>({});
  const [loading, setLoading] = useState(true);
  const [rowStatus, setRowStatus] = useState<Record<string, RowStatus>>({});

  useEffect(() => {
    setLoading(true);
    setRowStatus({});
    fetch(`/api/schedule?start=${dates[0]}&end=${dates[dates.length - 1]}`)
      .then((res) => res.json())
      .then((data) => {
        const byDate = new Map<string, DaySchedule>((data.days ?? []).map((d: DaySchedule) => [d.date, d]));
        setDays(Object.fromEntries(dates.map((date) => [date, byDate.get(date) ?? emptyDay(date)])));
      })
      .catch(() => setDays(Object.fromEntries(dates.map((date) => [date, emptyDay(date)]))))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart.getTime()]);

  function updateDay(date: string, patch: Partial<DaySchedule>) {
    setDays((prev) => ({ ...prev, [date]: { ...prev[date], ...patch } }));
  }

  async function saveDay(date: string) {
    const day = days[date];
    if (!day) return;
    setRowStatus((prev) => ({ ...prev, [date]: { saving: true, issues: [] } }));

    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(day)
      });
      const data = await res.json();
      if (!res.ok) {
        setRowStatus((prev) => ({ ...prev, [date]: { saving: false, issues: data.issues ?? [] } }));
        return;
      }
      setRowStatus((prev) => ({
        ...prev,
        [date]: { saving: false, issues: data.issues ?? [], savedAt: Date.now() }
      }));
    } catch {
      setRowStatus((prev) => ({
        ...prev,
        [date]: { saving: false, issues: [{ level: "error", message: "Gagal menyimpan, coba lagi." }] }
      }));
    }
  }

  async function saveAll() {
    for (const date of dates) {
      await saveDay(date);
    }
  }

  const isCurrentWeek = startOfWeek(new Date(), { weekStartsOn: 1 }).getTime() === weekStart.getTime();
  const rangeLabel = `${format(weekStart, "d MMM")} - ${format(addDays(weekStart, 6), "d MMM yyyy")}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart((d) => subWeeks(d, 1))}
            aria-label="Minggu sebelumnya"
            className="icon-btn"
          >
            &#8592;
          </button>
          <span className="min-w-[11rem] text-center text-sm font-medium text-ink">{rangeLabel}</span>
          <button onClick={() => setWeekStart((d) => addWeeks(d, 1))} aria-label="Minggu berikutnya" className="icon-btn">
            &#8594;
          </button>
        </div>
        {!isCurrentWeek && (
          <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="btn-ghost">
            Minggu ini
          </button>
        )}
      </div>

      {loading ? (
        <div className="card space-y-3 p-4">
          {dates.map((date) => (
            <div key={date} className="h-10 animate-pulse rounded-lg bg-line/30" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-paper text-left text-xs font-semibold uppercase tracking-wide text-ink/40">
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">Pagi / polisi</th>
                    <th className="px-4 py-3">Middle</th>
                    <th className="px-4 py-3">Cuti</th>
                    <th className="px-4 py-3">GH</th>
                    <th className="px-4 py-3">OT</th>
                    <th className="px-4 py-3"></th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {dates.map((date) => {
                    const day = days[date] ?? emptyDay(date);
                    const status = rowStatus[date];
                    const hasError = status?.issues.some((i) => i.level === "error");
                    return (
                      <tr key={date} className="align-top hover:bg-line/40">
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-ink">
                          {format(new Date(date), "EEE, d MMM")}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            className="field-input"
                            value={day.shiftPagiPolisi ?? ""}
                            onChange={(e) => updateDay(date, { shiftPagiPolisi: e.target.value || undefined })}
                          >
                            <option value="">Pilih orang</option>
                            {activeEmployees.map((e) => (
                              <option key={e.id} value={e.id}>
                                {e.name}
                              </option>
                            ))}
                          </select>
                          {day.offMonitoringEmployeeIds.length > 0 && (
                            <p className="mt-1 text-xs text-warning">
                              Off: {day.offMonitoringEmployeeIds.map(nameOf).join(", ")}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            className="field-input"
                            value={day.shiftMiddle ?? ""}
                            onChange={(e) => updateDay(date, { shiftMiddle: e.target.value || undefined })}
                          >
                            <option value="">Pilih orang</option>
                            {activeEmployees.map((e) => (
                              <option key={e.id} value={e.id}>
                                {e.name}
                              </option>
                            ))}
                          </select>
                          {day.offMiddleEmployeeIds.length > 0 && (
                            <p className="mt-1 text-xs text-warning">
                              Off: {day.offMiddleEmployeeIds.map(nameOf).join(", ")}
                            </p>
                          )}
                        </td>
                        <td className="w-44 px-4 py-3">
                          <MultiSelect
                            options={activeEmployees}
                            selected={day.cutiEmployeeIds}
                            onChange={(ids) => updateDay(date, { cutiEmployeeIds: ids })}
                          />
                        </td>
                        <td className="w-44 px-4 py-3">
                          <MultiSelect
                            options={activeEmployees}
                            selected={day.gantiHariEmployeeIds}
                            onChange={(ids) => updateDay(date, { gantiHariEmployeeIds: ids })}
                          />
                        </td>
                        <td className="w-44 px-4 py-3">
                          <MultiSelect
                            options={activeEmployees}
                            selected={day.overtimeEmployeeIds}
                            onChange={(ids) => updateDay(date, { overtimeEmployeeIds: ids })}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => saveDay(date)} disabled={status?.saving} className="btn-secondary">
                            {status?.saving ? "..." : "Simpan"}
                          </button>
                        </td>
                        <td className="max-w-[200px] px-4 py-3">
                          {status?.issues.map((issue, i) => (
                            <p
                              key={i}
                              className={`text-xs ${issue.level === "error" ? "text-danger" : "text-warning"}`}
                            >
                              {issue.message}
                            </p>
                          ))}
                          {status?.savedAt && !hasError && <span className="badge-approved">Tersimpan</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <button onClick={saveAll} className="btn-primary">
            Simpan semua
          </button>
        </div>
      )}
    </div>
  );
}
