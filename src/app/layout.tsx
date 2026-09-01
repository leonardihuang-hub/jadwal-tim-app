import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";
import Providers from "@/components/Providers";
import { getEmployees } from "@/lib/employees";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Jadwal tim",
  description: "Dashboard jadwal shift, cuti, ganti hari, dan overtime"
};

// Seluruh app ini dashboard live (jadwal/karyawan/pengajuan berubah tiap
// saat lewat database) -- tidak ada halaman yang boleh di-cache statis saat
// build. Tanpa ini, halaman yang tidak eksplisit pakai fitur dinamis
// (cookies/searchParams/getServerSession) bisa "macet" nampilin data hasil
// query waktu build (lihat kasus /api/employees yang kosong terus setelah
// deploy pertama, sebelum database sempat di-seed).
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Diambil sekali di server dan dioper sebagai initial value ke
  // EmployeeProvider -- tanpa ini, tiap halaman fetch /api/employees lagi
  // dari client walau server-nya baru saja query data yang sama persis.
  const employees = await getEmployees();
  const publicEmployees = employees.map((e) => ({
    id: e.id,
    name: e.name,
    isActive: e.isActive,
    isSupervisor: e.isSupervisor
  }));

  return (
    <html lang="id" className={inter.variable}>
      <body className="min-h-screen bg-paper font-sans text-ink antialiased">
        <Providers initialEmployees={publicEmployees}>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
