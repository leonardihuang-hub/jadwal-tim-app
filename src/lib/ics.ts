import type { DaySchedule, Employee } from "@/types/schedule";
import { eventsForEmployee } from "./scheduleEvents";

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
