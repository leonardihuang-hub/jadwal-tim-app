"use client";

import { createContext, useContext } from "react";
import type { PublicEmployee } from "@/types/schedule";

const EmployeeContext = createContext<PublicEmployee[]>([]);

// Master data karyawan sekarang di database (lihat lib/employees.ts), bukan
// lagi array statis yang bisa langsung di-import di komponen client.
// `initialEmployees` diambil sekali di server (root layout.tsx) dan dioper
// ke sini -- provider ini TIDAK fetch ulang di client, supaya tiap halaman
// tidak melakukan request /api/employees ganda (server sudah query data yang
// sama persis). Dipakai lewat useEmployees() di semua komponen yang cuma
// perlu resolve id -> nama (dropdown, riwayat, dsb).
export default function EmployeeProvider({
  children,
  initialEmployees
}: {
  children: React.ReactNode;
  initialEmployees: PublicEmployee[];
}) {
  return <EmployeeContext.Provider value={initialEmployees}>{children}</EmployeeContext.Provider>;
}

export function useEmployees(): PublicEmployee[] {
  return useContext(EmployeeContext);
}
