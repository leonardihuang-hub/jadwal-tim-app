"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { PublicEmployee } from "@/types/schedule";

const EmployeeContext = createContext<PublicEmployee[]>([]);

// Master data karyawan sekarang di database (lihat lib/employees.ts), bukan
// lagi array statis yang bisa langsung di-import di komponen client. Provider
// ini fetch sekali dari GET /api/employees (endpoint publik, tanpa email)
// dan sediakan lewat useEmployees() -- dipakai di semua komponen yang cuma
// perlu resolve id -> nama (dropdown, riwayat, dsb).
export default function EmployeeProvider({ children }: { children: React.ReactNode }) {
  const [employees, setEmployees] = useState<PublicEmployee[]>([]);

  useEffect(() => {
    fetch("/api/employees")
      .then((res) => res.json())
      .then((data) => setEmployees(data.employees ?? []))
      .catch(() => setEmployees([]));
  }, []);

  return <EmployeeContext.Provider value={employees}>{children}</EmployeeContext.Provider>;
}

export function useEmployees(): PublicEmployee[] {
  return useContext(EmployeeContext);
}
