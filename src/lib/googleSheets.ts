import type { DaySchedule, Employee } from "@/types/schedule";
import { getEmployees } from "./employees";

// ---------------------------------------------------------------------------
// CATATAN ARSITEKTUR (baca ini sebelum ubah file ini)
//
// Google Sheet kamu (tab "Calendar PS") berbentuk "wide table": satu baris
// per tanggal, dan role (Middle, Polisi, Cuti, GH, Piket Minggu, Piket OT,
// dst) masing-masing jadi kolom sendiri. Bentuk ini enak dibaca manusia
// tapi menyulitkan validasi & query di kode. Karena itu, lib ini punya dua
// arah:
//
//   sheetRowToDaySchedule()  -> ubah 1 baris sheet jadi DaySchedule (dipakai app)
//   dayScheduleToSheetRow()  -> ubah balik DaySchedule jadi 1 baris sheet (dipakai saat app menulis)
//
// Dengan begini, backend & database internal tetap pakai model yang rapi
// (types/schedule.ts), tapi orang yang buka Sheet langsung masih lihat
// format yang sama seperti sekarang.
//
// PENTING: sesuaikan SHEET_COLUMNS di bawah kalau urutan kolom di sheet
// kamu berubah dari yang terkonfirmasi (Agustus 2026).
//
// TRANSPORT: baca/tulis ke Sheet lewat Apps Script Web App (bukan Sheets API
// + Service Account) -- lihat README bagian "Sinkron Google Sheet" untuk cara
// deploy script-nya di sisi Google. Web App itu jadi jembatan HTTP sederhana;
// semua logika mapping kolom tetap di file ini.
// ---------------------------------------------------------------------------

const SHEET_COLUMNS = {
  year: "A", // "2026" -- dipakai bareng month+dayOfMonth buat susun tanggal ISO
  date: "B", // kolom Date asli Google Sheets -- SENGAJA TIDAK DIPAKAI, lihat catatan di isoFromParts()
  month: "C", // "August"
  dayName: "D", // "Friday" -- informational saja, tidak dipakai di kode
  dayOfMonth: "E", // "07"
  holidayName: "F",
  shiftMiddle: "G",
  shiftPolisi: "H", // header sheet: "Monitoring / Polisi"
  offMiddle: "I", // orang yang TIDAK BOLEH di-assign jadi Middle minggu ini
  offMonitoring: "J", // orang yang TIDAK BOLEH di-assign jadi Polisi/Monitoring minggu ini
  cuti: "K",
  gantiHari: "L",
  // Kolom M ("Piket Sabtu") sengaja tidak dipetakan -- belum didukung app ini.
  piketMinggu: "N",
  piketOt1: "O",
  piketOt2: "P"
} as const;

// Urutan kolom A..P -- dipakai untuk baca/tulis range sekaligus (bukan
// satu-satu per kolom). Termasuk kolom yang tidak kita petakan (B, D, dan M
// "Piket Sabtu" di antara L dan N) supaya waktu nulis balik, nilai lama di
// kolom itu tidak ikut ke-kosongkan (lihat writeDaySchedule).
const COLUMN_ORDER = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"
] as const;

// Baris 2 di sheet = 1 Januari 2025, dan berlanjut berurutan 1 baris per
// hari (terkonfirmasi lewat sampling data Agustus 2026 -> baris ~585).
// Dipakai untuk hitung langsung baris mana yang perlu dibaca/ditulis,
// supaya tidak perlu baca ribuan baris tiap kali (lebih cepat & lebih
// jarang timeout di sisi Apps Script).
const SHEET_EPOCH_DATE = "2025-01-01";
const SHEET_EPOCH_ROW = 2;

function rowNumberForDate(iso: string): number {
  const epoch = new Date(`${SHEET_EPOCH_DATE}T00:00:00Z`).getTime();
  const target = new Date(`${iso}T00:00:00Z`).getTime();
  const days = Math.round((target - epoch) / 86400000);
  return SHEET_EPOCH_ROW + days;
}

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
];

// Kalau APPS_SCRIPT_URL / APPS_SCRIPT_TOKEN belum diisi di .env, lib ini
// jatuh ke "mock mode": data jadwal digenerate secara deterministik di
// memori, supaya dashboard/assign/approvals tetap bisa dites end-to-end
// secara lokal sebelum Apps Script asli tersambung. Begitu env var di bawah
// terisi, mock mode otomatis mati dan semua baca/tulis pakai Sheet asli.
function isMockMode(): boolean {
  return !process.env.APPS_SCRIPT_URL || !process.env.APPS_SCRIPT_TOKEN;
}

const mockSchedule = new Map<string, DaySchedule>();

function buildMockDay(date: string, employees: Employee[]): DaySchedule {
  const active = employees.filter((e) => e.isActive);
  const dow = new Date(date).getDay(); // 0 = Minggu
  const dayIndex = Math.floor(new Date(date).getTime() / 86400000);
  const pick = (offset: number) => active[(dayIndex + offset) % active.length]?.id;

  if (dow === 0) {
    return {
      date,
      isHoliday: false,
      shiftMiddle: undefined,
      shiftPagiPolisi: undefined,
      piketMinggu: pick(0),
      overtimeEmployeeIds: [],
      cutiEmployeeIds: [],
      gantiHariEmployeeIds: [],
      offMiddleEmployeeIds: [],
      offMonitoringEmployeeIds: []
    };
  }

  return {
    date,
    isHoliday: false,
    shiftPagiPolisi: pick(0),
    shiftMiddle: pick(1),
    piketMinggu: undefined,
    overtimeEmployeeIds: [],
    cutiEmployeeIds: [],
    gantiHariEmployeeIds: [],
    offMiddleEmployeeIds: [],
    offMonitoringEmployeeIds: []
  };
}

function getMockDay(date: string, employees: Employee[]): DaySchedule {
  if (!mockSchedule.has(date)) {
    mockSchedule.set(date, buildMockDay(date, employees));
  }
  return mockSchedule.get(date)!;
}

// --- Transport ke Apps Script Web App ---------------------------------

// Sel di sheet kadang berupa angka murni (mis. tahun ditulis 2026, bukan
// "2026"), bukan cuma teks -- setelah lewat JSON, itu jadi tipe number, bukan
// string. Normalisasi semua nilai ke string di titik masuknya (di sini),
// supaya seluruh kode di bawah tidak perlu mikirin tipe data asli tiap sel.
function toCellString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

// Apps Script Web App kadang sesekali balas HTML aneh (bukan JSON) kalau
// lagi ada beberapa request bersamaan -- bukan error yang konsisten, cuma
// gangguan sesaat di sisi Google. Coba ulang beberapa kali dengan jeda kecil
// sebelum benar-benar dianggap gagal.
async function callAppsScript(url: string, options?: RequestInit): Promise<any> {
  const attempts = 3;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, options);
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        throw new Error(`Respons Apps Script bukan JSON: ${text.slice(0, 200)}`);
      }
    } catch (err) {
      lastError = err;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }
  }
  throw lastError;
}

async function readRange(range: string): Promise<string[][]> {
  const url = new URL(process.env.APPS_SCRIPT_URL!);
  url.searchParams.set("token", process.env.APPS_SCRIPT_TOKEN!);
  url.searchParams.set("range", range);

  const data = await callAppsScript(url.toString());
  if (data.error) {
    throw new Error(`Apps Script error (read ${range}): ${data.error}`);
  }
  const values = (data.values as unknown[][]) ?? [];
  return values.map((row) => row.map(toCellString));
}

// Tulis sel satu-satu berdasarkan {kolom: nilai} di satu baris -- BUKAN
// tulis satu blok range sekaligus. Ini sengaja: kalau kita baca dulu satu
// baris penuh (termasuk kolom Date yang ber-tipe Date asli) lalu tulis
// balik lewat setValues(), sel Date itu berubah jadi teks ISO mentah dan
// kehilangan format aslinya. Dengan tulis per-sel, kolom yang tidak kita
// sebut (Date, Day, Piket Sabtu, dst) tidak pernah disentuh sama sekali.
async function writeCells(sheetName: string, row: number, cells: Record<string, string>): Promise<void> {
  const data = await callAppsScript(process.env.APPS_SCRIPT_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: process.env.APPS_SCRIPT_TOKEN, sheet: sheetName, row, cells })
  });
  if (data.error) {
    throw new Error(`Apps Script error (write row ${row}): ${data.error}`);
  }
}

function nameToEmployeeId(name: string | undefined, employees: Employee[]): string | undefined {
  if (!name) return undefined;
  const found = employees.find(
    (e) => e.name.toLowerCase() === name.trim().toLowerCase()
  );
  return found?.id;
}

function employeeIdToName(id: string | undefined, employees: Employee[]): string {
  if (!id) return "";
  return employees.find((e) => e.id === id)?.name ?? "";
}

// Sheet kadang isi banyak nama dipisah koma di satu sel (misalnya kolom
// Cuti berisi "Santi, Maura"). Fungsi ini pecah itu jadi array id.
function parseNameList(raw: string | undefined, employees: Employee[]): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((n) => nameToEmployeeId(n, employees))
    .filter((id): id is string => Boolean(id));
}

// Kolom "Date" asli (B) adalah cell ber-tipe Date beneran di Google Sheets.
// Apps Script/JSON serialize itu jadi ISO datetime dalam UTC, tapi karena
// sheet-nya pakai timezone Jakarta (UTC+7), nilai yang keluar suka "mundur
// satu hari" (mis. 6 Agustus lokal keluar jadi "...T17:00:00.000Z" tanggal
// 5). Daripada urus konversi timezone yang rawan salah, kita susun ulang
// tanggal ISO dari 3 kolom teks biasa yang jelas: tahun (A), nama bulan (C),
// dan tanggal-dalam-bulan (E) -- lihat SHEET_COLUMNS.
function isoFromParts(year: string, monthName: string, dayOfMonth: string): string {
  const monthIndex = MONTH_NAMES.indexOf(monthName.trim().toLowerCase());
  const y = year.trim();
  const d = dayOfMonth.trim();
  if (monthIndex === -1 || !y || !d) return "";
  const mm = String(monthIndex + 1).padStart(2, "0");
  const dd = d.padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

export function sheetRowToDaySchedule(row: Record<string, string>, employees: Employee[]): DaySchedule {
  return {
    date: isoFromParts(
      row[SHEET_COLUMNS.year] ?? "",
      row[SHEET_COLUMNS.month] ?? "",
      row[SHEET_COLUMNS.dayOfMonth] ?? ""
    ),
    isHoliday: Boolean(row[SHEET_COLUMNS.holidayName]),
    holidayName: row[SHEET_COLUMNS.holidayName] || undefined,
    shiftMiddle: nameToEmployeeId(row[SHEET_COLUMNS.shiftMiddle], employees),
    shiftPagiPolisi: nameToEmployeeId(row[SHEET_COLUMNS.shiftPolisi], employees),
    piketMinggu: nameToEmployeeId(row[SHEET_COLUMNS.piketMinggu], employees),
    overtimeEmployeeIds: [
      nameToEmployeeId(row[SHEET_COLUMNS.piketOt1], employees),
      nameToEmployeeId(row[SHEET_COLUMNS.piketOt2], employees)
    ].filter((id): id is string => Boolean(id)),
    cutiEmployeeIds: parseNameList(row[SHEET_COLUMNS.cuti], employees),
    gantiHariEmployeeIds: parseNameList(row[SHEET_COLUMNS.gantiHari], employees),
    offMiddleEmployeeIds: parseNameList(row[SHEET_COLUMNS.offMiddle], employees),
    offMonitoringEmployeeIds: parseNameList(row[SHEET_COLUMNS.offMonitoring], employees)
  };
}

// Off Middle/Off Monitoring sengaja TIDAK ditulis balik ke sheet -- itu
// catatan manual yang diatur langsung di sheet, bukan sesuatu yang diisi
// lewat AssignGrid. Kolom "Date" (B), "Day" (D), dan "Piket Sabtu" (M) juga
// sengaja tidak disebut di sini -- writeDaySchedule menulis per-sel, jadi
// kolom yang tidak disebut otomatis tidak pernah disentuh.
export function dayScheduleToSheetRow(day: DaySchedule, employees: Employee[]): Record<string, string> {
  const nameOf = (id: string | undefined) => employeeIdToName(id, employees);
  return {
    [SHEET_COLUMNS.holidayName]: day.holidayName ?? "",
    [SHEET_COLUMNS.shiftMiddle]: nameOf(day.shiftMiddle),
    [SHEET_COLUMNS.shiftPolisi]: nameOf(day.shiftPagiPolisi),
    [SHEET_COLUMNS.piketMinggu]: nameOf(day.piketMinggu),
    [SHEET_COLUMNS.piketOt1]: nameOf(day.overtimeEmployeeIds[0]),
    [SHEET_COLUMNS.piketOt2]: nameOf(day.overtimeEmployeeIds[1]),
    [SHEET_COLUMNS.cuti]: day.cutiEmployeeIds.map((id) => nameOf(id)).join(", "),
    [SHEET_COLUMNS.gantiHari]: day.gantiHariEmployeeIds.map((id) => nameOf(id)).join(", ")
  };
}

export async function fetchScheduleRange(
  startDate: string,
  endDate: string
): Promise<DaySchedule[]> {
  const employees = await getEmployees();

  if (isMockMode()) {
    const days: DaySchedule[] = [];
    for (let t = new Date(startDate).getTime(); t <= new Date(endDate).getTime(); t += 86400000) {
      const iso = new Date(t).toISOString().slice(0, 10);
      days.push(getMockDay(iso, employees));
    }
    return days;
  }

  const tab = process.env.GOOGLE_SHEET_TAB_NAME ?? "Calendar PS";

  // Baca cuma baris yang relevan buat rentang ini (+ sedikit buffer jaga-jaga)
  // -- bukan seluruh sheet -- supaya Apps Script cepat & tidak gampang timeout.
  const rowStart = Math.max(SHEET_EPOCH_ROW, rowNumberForDate(startDate) - 2);
  const rowEnd = rowNumberForDate(endDate) + 2;
  const rows = await readRange(`${tab}!A${rowStart}:P${rowEnd}`);

  return rows
    .map((cols) => {
      const record: Record<string, string> = {};
      COLUMN_ORDER.forEach((colLetter, idx) => {
        record[colLetter] = cols[idx] ?? "";
      });
      return sheetRowToDaySchedule(record, employees);
    })
    .filter((d) => d.date && d.date >= startDate && d.date <= endDate);
}

export async function writeDaySchedule(day: DaySchedule): Promise<void> {
  if (isMockMode()) {
    mockSchedule.set(day.date, day);
    return;
  }

  const tab = process.env.GOOGLE_SHEET_TAB_NAME ?? "Calendar PS";

  // Hitung baris perkiraan dari tanggalnya, lalu cek jendela kecil di
  // sekitarnya (bukan scan ribuan baris) -- lebih cepat, tapi tetap aman
  // kalau ada pergeseran baris tak terduga di sheet.
  const estimatedRow = rowNumberForDate(day.date);
  const windowStart = Math.max(SHEET_EPOCH_ROW, estimatedRow - 5);
  const windowEnd = estimatedRow + 5;
  const dateParts = await readRange(`${tab}!A${windowStart}:E${windowEnd}`);
  const rowOffset = dateParts.findIndex(
    (r) => isoFromParts(r[0] ?? "", r[2] ?? "", r[4] ?? "") === day.date
  );
  if (rowOffset === -1) {
    throw new Error(
      `Tidak ketemu baris untuk tanggal ${day.date} di tab "${tab}" -- pastikan tanggalnya sudah ada di sheet.`
    );
  }
  const rowNumber = windowStart + rowOffset;

  const employees = await getEmployees();
  await writeCells(tab, rowNumber, dayScheduleToSheetRow(day, employees));
}
