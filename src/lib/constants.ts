// Data karyawan (nama, email, isSupervisor, isActive) dulunya di sini,
// sekarang di database -- lihat src/lib/employees.ts dan halaman /team
// (Master Data Karyawan, khusus supervisor) untuk kelola tanpa edit kode.

export const SHIFT_HOURS = {
  pagi: { start: "08:30", end: "17:30" },
  middle: { start: "11:00", end: "20:00" }
};

// Aturan bisnis yang sudah dikonfirmasi -- dipakai untuk validasi di
// lib/validators.ts. Ubah di sini kalau aturan tim berubah.
export const BUSINESS_RULES = {
  // Polisi selalu shift pagi, dan tugasnya monitoring chat WA client.
  polisiSelaluShiftPagi: true,
  // Piket Minggu selalu shift middle.
  piketMingguSelaluMiddle: true,
  // Overtime di tanggal merah selalu 2 orang, shift middle.
  overtimeJumlahOrang: 2,
  overtimeSelaluMiddle: true
};
