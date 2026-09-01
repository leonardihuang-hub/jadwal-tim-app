import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";
import Providers from "@/components/Providers";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="min-h-screen bg-paper font-sans text-ink antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
