import type { DaySchedule, Employee } from "@/types/schedule";

// Ubah jadwal jadi feed .ics (format standar RFC 5545) supaya bisa
// disubscribe langsung di Google Calendar pribadi tiap karyawan -- lihat
// halaman /calendar dan endpoint /api/calendar/[token].

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function dateTimeStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function dayStamp(iso: string): string {
  return iso.replace(/-/g, "");
}

// DTEND kalender "all day" bersifat eksklusif -- harus 1 hari setelah DTSTART.
function nextDayStamp(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return dayStamp(d.toISOString().slice(0, 10));
}

type CalendarEvent = { key: string; summary: string };

// Logika "role apa yang dipegang orang ini hari itu" sengaja disamakan
// dengan tampilan WeekCalendar/MonthCalendar (Polisi/Middle di hari biasa,
// Piket di hari Minggu, Libur/OT di tanggal merah) supaya konsisten dengan
// yang dilihat di dashboard.
function eventsForEmployee(day: DaySchedule, employeeId: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
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

export function buildIcsFeed(employee: Pick<Employee, "id" | "name">, days: DaySchedule[]): string {
  const stamp = dateTimeStamp(new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Jadwal Tim//ID",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:Jadwal Kerja - ${escapeText(employee.name)}`,
    "X-WR-TIMEZONE:Asia/Jakarta",
    // Hint ke Google Calendar biar tidak nunggu terlalu lama sebelum refresh
    // feed -- meski pada praktiknya Google tetap bisa membatasi sendiri.
    "REFRESH-INTERVAL;VALUE=DURATION:PT12H",
    "X-PUBLISHED-TTL:PT12H"
  ];

  for (const day of days) {
    if (!day.date) continue;
    for (const event of eventsForEmployee(day, employee.id)) {
      lines.push(
        "BEGIN:VEVENT",
        // UID stabil (tanggal + jenis role) supaya refresh berikutnya
        // meng-update event yang sama, bukan bikin duplikat.
        `UID:${employee.id}-${day.date}-${event.key}@jadwal-tim-app`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${dayStamp(day.date)}`,
        `DTEND;VALUE=DATE:${nextDayStamp(day.date)}`,
        `SUMMARY:${escapeText(event.summary)}`,
        "END:VEVENT"
      );
    }
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
