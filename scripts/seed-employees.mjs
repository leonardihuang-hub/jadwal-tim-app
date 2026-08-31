// Script sekali-jalan: pindahkan data karyawan yang selama ini hardcode di
// src/lib/constants.ts ke database. Jalankan sekali lewat:
//   node scripts/seed-employees.mjs
// Aman dijalankan berkali-kali (upsert per id).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EMPLOYEES = [
  { id: "maureen", name: "Maureen", email: "maureen@namaperusahaan.com", isActive: true, isSupervisor: false },
  { id: "tiffani", name: "Tiffani", email: "tiffani@namaperusahaan.com", isActive: true, isSupervisor: false },
  { id: "diana", name: "Diana", email: "diana@namaperusahaan.com", isActive: true, isSupervisor: true },
  { id: "roro", name: "Roro", email: "roro@namaperusahaan.com", isActive: true, isSupervisor: false },
  { id: "santi", name: "Santi", email: "santi@namaperusahaan.com", isActive: true, isSupervisor: false },
  { id: "libna", name: "Libna", email: "libna@namaperusahaan.com", isActive: true, isSupervisor: false },
  { id: "maura", name: "Maura", email: "maura@namaperusahaan.com", isActive: true, isSupervisor: false },
  { id: "didi", name: "Didi", email: "didi@namaperusahaan.com", isActive: true, isSupervisor: false },
  { id: "leonardi", name: "Leonardi", email: "leonardi@namaperusahaan.com", isActive: true, isSupervisor: true },
  { id: "zacky", name: "Zacky", email: "zacky@namaperusahaan.com", isActive: true, isSupervisor: false },
  { id: "keysha", name: "Keysha", email: "keysha@namaperusahaan.com", isActive: true, isSupervisor: false }
];

async function main() {
  for (const e of EMPLOYEES) {
    await prisma.employee.upsert({
      where: { id: e.id },
      create: e,
      update: {}
    });
  }
  console.log(`Selesai: ${EMPLOYEES.length} karyawan di-seed.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
