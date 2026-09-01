import type { DaySchedule } from "@/types/schedule";

export type ScheduleEvent = { key: string; summary: string };

// Logika "role apa yang dipegang orang ini hari itu" -- dipakai bareng oleh
// lib/ics.ts (feed subscribe) dan lib/googleCalendarSync.ts (push otomatis)
// supaya kedua jalur kalender itu selalu konsisten, tidak ada yang drift.
// Sengaja disamakan juga dengan tampilan WeekCalendar/MonthCalendar
// (Polisi/Middle di hari biasa, Piket di hari Minggu, Libur/OT di tanggal
// merah).
export function eventsForEmployee(day: DaySchedule, employeeId: string): ScheduleEvent[] {
  const events: ScheduleEvent[] = [];
  const dayOfWeek = new Date(`${day.date}T00:00:00Z`).getUTCDay();

  if (day.isHoliday) {
    if (day.overtimeEmployeeIds.includes(employeeId)) {
      events.push({
        key: "ot",
        summary: `Libur/OT${day.holidayName ? ` (${day.holidayName})` : ""}`
      });
    }
  } else if (dayOfWeek === 0) {
    if (day.piketMinggu === employeeId) {
      events.push({ key: "piket", summary: "Piket Minggu" });
    }
  } else {
    if (day.shiftPagiPolisi === employeeId) {
      events.push({ key: "polisi", summary: "Polisi (Shift Pagi)" });
    }
    if (day.shiftMiddle === employeeId) {
      events.push({ key: "middle", summary: "Shift Middle" });
    }
  }

  if (day.cutiEmployeeIds.includes(employeeId)) {
    events.push({ key: "cuti", summary: "Cuti" });
  }
  if (day.gantiHariEmployeeIds.includes(employeeId)) {
    events.push({ key: "gh", summary: "Ganti Hari (GH)" });
  }

  return events;
}
