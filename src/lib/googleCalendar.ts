import { createHash } from "crypto";

// Panggil Google Calendar API v3 langsung lewat fetch (REST biasa) --
// sengaja tidak pakai package `googleapis` (berat, dan yang kita butuh cuma
// 3 endpoint sederhana: refresh token, insert/update event, delete event).

export async function getCalendarAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });
  if (!res.ok) {
    throw new Error(`Gagal refresh access token Google Calendar: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

// ID event custom -- Calendar API cuma izinkan karakter [a-v0-9] (base32hex),
// jadi id "leonardi-2026-08-27-polisi" (ada tanda hubung) tidak valid. Hash
// hex (0-9a-f) selalu valid karena semua karakternya ada di rentang a-v0-9.
export function calendarEventId(employeeId: string, date: string, roleKey: string): string {
  return createHash("sha1").update(`${employeeId}:${date}:${roleKey}`).digest("hex");
}

// DTEND kalender "all day" bersifat eksklusif -- harus 1 hari setelah tanggal mulai.
function nextDayIso(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Upsert: coba PATCH (update) dulu -- kalau event belum ada (404), baru
// INSERT baru dengan id yang sama. Idempoten, aman dipanggil berkali-kali.
export async function upsertCalendarEvent(
  accessToken: string,
  eventId: string,
  summary: string,
  date: string
): Promise<void> {
  const body = {
    id: eventId,
    summary,
    start: { date },
    end: { date: nextDayIso(date) }
  };

  const patchRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }
  );
  if (patchRes.ok) return;
  if (patchRes.status !== 404) {
    throw new Error(`Gagal update event kalender ${eventId}: ${patchRes.status} ${await patchRes.text()}`);
  }

  const insertRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!insertRes.ok) {
    throw new Error(`Gagal bikin event kalender ${eventId}: ${insertRes.status} ${await insertRes.text()}`);
  }
}

export async function deleteCalendarEvent(accessToken: string, eventId: string): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  // 404/410 = event sudah tidak ada (dihapus manual, atau memang belum
  // pernah dibuat) -- itu tetap dianggap sukses, bukan error.
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`Gagal hapus event kalender ${eventId}: ${res.status} ${await res.text()}`);
  }
}
