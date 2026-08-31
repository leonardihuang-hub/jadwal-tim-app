import { NextResponse } from "next/server";
import { getEmployees } from "@/lib/employees";

// Endpoint publik (tanpa cek sesi login) -- dipakai di banyak komponen buat
// resolve id -> nama (dropdown assign, riwayat, dsb), termasuk LoginForm di
// halaman /login SEBELUM ada sesi login (mode dev-login butuh daftar nama
// buat dropdown pilih akun).
//
// SENGAJA tidak ikut kirim field email -- itu data yang lebih sensitif dan
// cuma dibutuhkan di halaman /team (lihat api/admin/employees), bukan di
// tempat lain yang cuma perlu nama.
export async function GET() {
  const employees = await getEmployees();
  return NextResponse.json({
    employees: employees.map((e) => ({
      id: e.id,
      name: e.name,
      isActive: e.isActive,
      isSupervisor: e.isSupervisor
    }))
  });
}
