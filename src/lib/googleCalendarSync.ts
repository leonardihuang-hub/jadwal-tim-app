import type { DaySchedule } from "@/types/schedule";
import { eventsForEmployee } from "./scheduleEvents";
import { calendarEventId, deleteCalendarEvent, getCalendarAccessToken, upsertCalendarEvent } from "./googleCalendar";
import { getEmployeesWithCalendarPush } from "./employees";

// Push perubahan jadwal satu hari ke Google Calendar tiap karyawan yang
// sudah hubungkan akunnya (lihat halaman /calendar). Best-effort: dipanggil
// SETELAH writeDaySchedule ke Sheet sukses, dan kalau ada yang gagal di sini
// (token expired, API Google lagi down, dst) itu di-log tapi TIDAK bikin
// request penyimpanan jadwal gagal -- Sheet tetap sumber kebenaran utama.
export async function syncDayToCalendars(oldDay: DaySchedule, newDay: DaySchedule): Promise<void> {
  const connected = await getEmployeesWithCalendarPush();
  if (connected.length === 0) return;

  for (const emp of connected) {
    const oldEvents = eventsForEmployee(oldDay, emp.id);
    const newEvents = eventsForEmployee(newDay, emp.id);
    const newKeys = new Set(newEvents.map((e) => e.key));
    const removedKeys = oldEvents.map((e) => e.key).filter((key) => !newKeys.has(key));

    if (newEvents.length === 0 && removedKeys.length === 0) continue;

    let accessToken: string;
    try {
      accessToken = await getCalendarAccessToken(emp.googleCalendarRefreshToken);
    } catch (err) {
      console.error(`Gagal refresh token Google Calendar untuk ${emp.id}:`, err);
      continue;
    }

    for (const key of removedKeys) {
      await deleteCalendarEvent(accessToken, calendarEventId(emp.id, newDay.date, key)).catch((err) =>
        console.error(`Gagal hapus event kalender ${emp.id}/${newDay.date}/${key}:`, err)
      );
    }
    for (const event of newEvents) {
      await upsertCalendarEvent(accessToken, calendarEventId(emp.id, newDay.date, event.key), event.summary, newDay.date).catch(
        (err) => console.error(`Gagal push event kalender ${emp.id}/${newDay.date}/${event.key}:`, err)
      );
    }
  }
}
