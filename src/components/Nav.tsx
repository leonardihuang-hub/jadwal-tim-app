"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/requests", label: "Pengajuan saya" },
  { href: "/calendar", label: "Kalender saya" },
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
  const [pendingCount, setPendingCount] = useState(0);

  // Badge jumlah pengajuan menunggu di menu "Approval" -- reuse endpoint
  // yang sama dipakai ApprovalQueue, cuma dihitung status "pending"-nya.
  // Refresh tiap 30 detik + tiap kali tab ini balik aktif, supaya tidak
  // perlu reload manual habis approve/reject.
  useEffect(() => {
    if (!isSupervisor) return;

    let cancelled = false;
    function loadPendingCount() {
      Promise.all([
        fetch("/api/leave-requests").then((res) => res.json()),
        fetch("/api/swap-requests").then((res) => res.json())
      ]).then(([leave, swap]) => {
        if (cancelled) return;
        const pending = [...(leave.requests ?? []), ...(swap.requests ?? [])].filter(
          (r: { status: string }) => r.status === "pending"
        ).length;
        setPendingCount(pending);
      });
    }

    function onVisible() {
      if (document.visibilityState === "visible") loadPendingCount();
    }

    loadPendingCount();
    const interval = setInterval(loadPendingCount, 30_000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isSupervisor]);

  return (
    // Bar horizontal di HP (default), jadi sidebar kiri mulai breakpoint md
    // (md:sticky + md:h-screen supaya nempel & ikut scroll halaman).
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b border-line bg-slate-950/95 px-4 backdrop-blur sm:px-6 md:h-screen md:w-56 md:flex-col md:items-stretch md:gap-6 md:self-start md:border-b-0 md:border-r md:px-4 md:py-6">
      <Brand />

      <nav className="flex flex-1 items-center gap-1 overflow-x-auto md:flex-col md:items-stretch md:gap-1 md:overflow-visible">
        {LINKS.filter((link) => !link.supervisorOnly || isSupervisor).map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors md:rounded-lg ${
                active ? "bg-accent text-white" : "text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              {link.label}
              {link.href === "/approvals" && pendingCount > 0 && (
                <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-danger px-1 text-xs font-semibold text-white">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {session?.user && (
        <div className="hidden shrink-0 items-center gap-3 md:mt-auto md:flex md:flex-col md:items-stretch md:gap-2">
          <span className="text-sm text-white/60">{session.user.name}</span>
          <button
            onClick={() => signOut()}
            className="rounded-lg border-none bg-transparent px-2.5 py-2 text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white md:text-left"
          >
            Keluar
          </button>
        </div>
      )}
    </header>
  );
}
