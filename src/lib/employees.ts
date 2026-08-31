import { prisma } from "./prisma";
import type { Employee } from "@/types/schedule";

// Master data karyawan -- dulunya array statis di constants.ts, sekarang di
// database (tabel Employee) supaya bisa dikelola dari halaman /team (khusus
// supervisor) tanpa perlu edit kode / redeploy.
//
// Fungsi-fungsi lain yang butuh data karyawan (validators.ts, googleSheets.ts,
// dsb) sengaja TIDAK query database sendiri-sendiri per pemanggilan -- caller
// di lapisan atas (API route) memanggil getEmployees() SEKALI, lalu oper
// hasilnya sebagai parameter. Ini menghindari N+1 query dan bikin fungsi
// turunannya tetap sinkron & mudah dites.

export async function getEmployees(): Promise<Employee[]> {
  return prisma.employee.findMany({ orderBy: { name: "asc" } });
}

export async function getEmployeeByEmail(email: string): Promise<Employee | null> {
  return prisma.employee.findFirst({
    where: { email: { equals: email.toLowerCase() } }
  });
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  return prisma.employee.findUnique({ where: { id } });
}

export async function createEmployee(data: {
  id: string;
  name: string;
  email: string;
  isSupervisor: boolean;
}): Promise<Employee> {
  return prisma.employee.create({
    data: {
      id: data.id,
      name: data.name,
      email: data.email.toLowerCase(),
      isSupervisor: data.isSupervisor,
      isActive: true
    }
  });
}

export async function updateEmployee(
  id: string,
  data: Partial<Pick<Employee, "name" | "email" | "isActive" | "isSupervisor">>
): Promise<Employee> {
  return prisma.employee.update({
    where: { id },
    data: data.email ? { ...data, email: data.email.toLowerCase() } : data
  });
}
