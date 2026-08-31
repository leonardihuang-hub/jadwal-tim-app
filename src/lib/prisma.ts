import { PrismaClient } from "@prisma/client";

// Next.js dev server hot-reloads modules, yang bisa bikin PrismaClient baru
// dibuat berkali-kali dan kehabisan koneksi. Simpan instance di globalThis
// supaya dipakai ulang di antara reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
