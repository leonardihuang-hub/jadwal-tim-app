import { randomUUID } from "crypto";
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
//
// SENGAJA select field secara eksplisit (bukan ambil semua kolom) supaya
// calendarToken -- dipakai di link feed kalender pribadi (/api/calendar/
// [token]) -- tidak pernah ikut nyasar ke response API lain (mis. /team).

const EMPLOYEE_SELECT = {
  id: true,
  name: true,
  email: true,
  isActive: true,
  isSupervisor: true
} as const;

export async function getEmployees(): Promise<Employee[]> {
  return prisma.employee.findMany({ orderBy: { name: "asc" }, select: EMPLOYEE_SELECT });
}

export async function getEmployeeByEmail(email: string): Promise<Employee | null> {
  return prisma.employee.findFirst({
    where: { email: { equals: email.toLowerCase() } },
    select: EMPLOYEE_SELECT
  });
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  return prisma.employee.findUnique({ where: { id }, select: EMPLOYEE_SELECT });
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
      isActive: true,
      calendarToken: randomUUID()
    },
    select: EMPLOYEE_SELECT
  });
}

export async function updateEmployee(
  id: string,
  data: Partial<Pick<Employee, "name" | "email" | "isActive" | "isSupervisor">>
): Promise<Employee> {
  return prisma.employee.update({
    where: { id },
    data: data.email ? { ...data, email: data.email.toLowerCase() } : data,
    select: EMPLOYEE_SELECT
  });
}

// Dipakai halaman /calendar (self-service, semua karyawan login) untuk
// ambil/bikin token feed kalender pribadi mereka sendiri. Lazy: karyawan
// lama yang belum pernah buka halaman itu akan dapat token baru begitu
// pertama kali diakses.
export async function getEmployeeCalendarToken(employeeId: string): Promise<string> {
  const existing = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { calendarToken: true }
  });
  if (!existing) {
    throw new Error(`Karyawan ${employeeId} tidak ditemukan.`);
  }
  if (existing.calendarToken) {
    return existing.calendarToken;
  }
  const token = randomUUID();
  await prisma.employee.update({ where: { id: employeeId }, data: { calendarToken: token } });
  return token;
}

// Dipakai endpoint publik /api/calendar/[token] -- token di URL itu sendiri
// yang jadi "password", jadi endpoint ini sengaja tidak cek sesi login sama
// sekali (Google Calendar butuh akses tanpa cookie/login).
export async function getEmployeeByCalendarToken(token: string): Promise<Employee | null> {
  return prisma.employee.findUnique({ where: { calendarToken: token }, select: EMPLOYEE_SELECT });
}
