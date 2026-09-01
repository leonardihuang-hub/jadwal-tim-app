// Model data inti. Ini adalah bentuk internal di aplikasi -- terpisah dari
// bentuk "wide table" di Google Sheet. lib/googleSheets.ts yang bertugas
// menerjemahkan antara dua bentuk ini (lihat catatan di file tersebut).

export type RequestStatus = "pending" | "approved" | "rejected";

export type LeaveType = "cuti" | "ganti_hari";

export interface Employee {
  id: string; // slug, contoh: "zacky"
  name: string; // nama tampilan, contoh: "Zacky"
  email: string; // email Google Workspace (@esb.co.id), dipakai untuk cocokkan sesi login
  isActive: boolean;
  isSupervisor: boolean;
}

// Bentuk Employee tanpa email -- dipakai di GET /api/employees (endpoint
// publik) dan di komponen client yang cuma perlu resolve id -> nama, supaya
// email (data lebih sensitif) tidak ikut terekspos ke mana-mana.
export type PublicEmployee = Omit<Employee, "email">;

// Satu baris = satu hari. Ini merepresentasikan satu baris di Google Sheet.
export interface DaySchedule {
  date: string; // format ISO "2026-08-17"
  isHoliday: boolean;
  holidayName?: string;
  shiftPagiPolisi?: string; // employee id -- shift pagi, role polisi (WA client)
  shiftMiddle?: string; // employee id
  piketMinggu?: string; // employee id, hanya terisi kalau hari Minggu
  overtimeEmployeeIds: string[]; // biasanya 2 orang, hanya di tanggal merah
  cutiEmployeeIds: string[];
  gantiHariEmployeeIds: string[];
  // Catatan dari sheet: orang di daftar ini SEDANG TIDAK BOLEH di-assign ke
  // role terkait minggu ini (misalnya baru saja kena giliran, atau ada
  // alasan lain) -- ditegakkan di lib/validators.ts.
  offMiddleEmployeeIds: string[];
  offMonitoringEmployeeIds: string[];
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: LeaveType;
  date: string; // ISO date pengajuan cuti / ganti hari
  reason: string;
  status: RequestStatus;
  approverId?: string;
  createdAt: string;
  decidedAt?: string;
}

export interface SwapRequest {
  id: string;
  requesterId: string;
  targetId: string;
  date: string;
  // "shift" = tukar shift pagi/middle di hari itu, "ganti_hari" = tukar ganti hari
  kind: "shift" | "ganti_hari";
  status: RequestStatus;
  approverId?: string;
  createdAt: string;
  decidedAt?: string;
}
