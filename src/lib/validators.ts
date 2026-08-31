import type { DaySchedule, Employee } from "@/types/schedule";
import { BUSINESS_RULES } from "./constants";

export interface ValidationIssue {
  level: "error" | "warning";
  message: string;
}

// Validasi aturan bisnis yang sudah dikonfirmasi tim. Panggil ini sebelum
// simpan assignment supervisor, supaya kesalahan input ketahuan sebelum
// masuk ke Sheet -- bukan sesudah.
//
// `employees` dioper sebagai parameter (bukan di-query sendiri di sini)
// supaya fungsi ini tetap sinkron & mudah dites -- caller (API route) yang
// bertugas ambil master data karyawan sekali lewat getEmployees().
export function validateDaySchedule(day: DaySchedule, employees: Employee[]): ValidationIssue[] {
  const nameOf = (id: string): string => employees.find((e) => e.id === id)?.name ?? id;
  const issues: ValidationIssue[] = [];
  const dow = new Date(day.date).getDay(); // 0 = Minggu
  const isSunday = dow === 0;

  if (!day.isHoliday) {
    if (!day.shiftMiddle) {
      issues.push({ level: "error", message: "Shift middle belum diisi." });
    }
    if (!day.shiftPagiPolisi) {
      issues.push({ level: "error", message: "Shift pagi / polisi belum diisi." });
    }
    if (
      day.shiftMiddle &&
      day.shiftPagiPolisi &&
      day.shiftMiddle === day.shiftPagiPolisi
    ) {
      issues.push({
        level: "error",
        message: "Orang yang sama tidak bisa jadi shift middle dan polisi di hari yang sama."
      });
    }
  }

  if (BUSINESS_RULES.piketMingguSelaluMiddle && isSunday && !day.piketMinggu) {
    issues.push({ level: "warning", message: "Hari Minggu belum ada piket." });
  }

  if (day.isHoliday) {
    if (day.overtimeEmployeeIds.length !== BUSINESS_RULES.overtimeJumlahOrang) {
      issues.push({
        level: "error",
        message: `Tanggal merah harus punya ${BUSINESS_RULES.overtimeJumlahOrang} orang overtime, saat ini ${day.overtimeEmployeeIds.length}.`
      });
    }
  }

  const cutiBentrokShift = [day.shiftMiddle, day.shiftPagiPolisi].filter(
    (id) => id && day.cutiEmployeeIds.includes(id)
  );
  if (cutiBentrokShift.length > 0) {
    issues.push({
      level: "error",
      message: "Ada orang yang diassign shift padahal dia sedang cuti di tanggal itu."
    });
  }

  // Catatan "Off Middle" / "Off Monitoring" dari sheet: orang di daftar ini
  // sengaja tidak boleh diassign ke role terkait minggu itu (lihat
  // types/schedule.ts).
  if (day.shiftMiddle && day.offMiddleEmployeeIds.includes(day.shiftMiddle)) {
    issues.push({
      level: "error",
      message: `${nameOf(day.shiftMiddle)} sedang di daftar "Off Middle", tidak boleh diassign shift middle minggu ini.`
    });
  }
  if (day.shiftPagiPolisi && day.offMonitoringEmployeeIds.includes(day.shiftPagiPolisi)) {
    issues.push({
      level: "error",
      message: `${nameOf(day.shiftPagiPolisi)} sedang di daftar "Off Monitoring", tidak boleh diassign shift polisi minggu ini.`
    });
  }

  return issues;
}
