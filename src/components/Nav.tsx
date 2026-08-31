"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/requests", label: "Pengajuan saya" },
  { href: "/assign", label: "Assign jadwal", supervisorOnly: true },
  { href: "/approvals", label: "Approval", supervisorOnly: true },
  { href: "/team", label: "Master Karyawan", supervisorOnly: true }
];

function Brand() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold text-white">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm text-white">JT</span>
      <span className="hidden sm:inline">Jadwal tim</span>
    </Link>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (pathname === "/login") {
    return (
      <header className="bg-slate-950">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4 sm:px-6">
          <Brand />
        </div>
      </header>
    );
  }

  const isSupervisor = session?.user?.isSupervisor;

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Brand />

        <nav className="flex items-center gap-1 overflow-x-auto">
          {LINKS.filter((link) => !link.supervisorOnly || isSupervisor).map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${
                  active ? "bg-accent text-white" : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {session?.user && (
          <div className="hidden shrink-0 items-center gap-3 md:flex">
            <span className="text-sm text-white/60">{session.user.name}</span>
            <button
              onClick={() => signOut()}
              className="rounded-lg border-none bg-transparent px-2.5 py-2 text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              Keluar
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
