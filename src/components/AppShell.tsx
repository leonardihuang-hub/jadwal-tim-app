"use client";

import { usePathname } from "next/navigation";
import Nav from "@/components/Nav";

// Bungkus terpisah dari Nav supaya arah layout (baris vs kolom) bisa beda
// per halaman: /login tetap bar penuh di atas, halaman lain jadi sidebar
// kiri (mulai breakpoint md) + konten di kanan.
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return (
      <div className="flex min-h-screen flex-col">
        <Nav />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Nav />
      <main className="flex-1 px-4 py-8 sm:px-6 md:px-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
