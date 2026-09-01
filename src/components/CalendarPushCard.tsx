"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ERROR_MESSAGES: Record<string, string> = {
  calendar_push_not_configured: "Push otomatis belum dikonfigurasi di server -- hubungi admin.",
  state_mismatch: "Sesi kadaluarsa, coba lagi.",
  google_exchange_failed: "Gagal terhubung ke Google, coba lagi.",
  no_refresh_token: "Google tidak kasih izin akses -- coba lagi, pastikan klik \"Allow\" di semua langkah.",
  google_access_denied: "Kamu membatalkan pemberian izin."
};

export default function CalendarPushCard({
  connected,
  connectedAt,
  configured,
  error
}: {
  connected: boolean;
  connectedAt: string | null;
  configured: boolean;
  error: string | null;
}) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);

  async function disconnect() {
    setDisconnecting(true);
    try {
      await fetch("/api/calendar-auth/disconnect", { method: "POST" });
      router.refresh();
    } finally {
      setDisconnecting(false);
    }
  }

  const errorMessage = error ? (ERROR_MESSAGES[error] ?? "Gagal menghubungkan, coba lagi.") : null;

  return (
    <div className="card space-y-4 p-5">
      <div>
        <h2 className="text-sm font-semibold text-ink">Push otomatis ke Google Calendar</h2>
        <p className="mt-1 text-sm text-ink/60">
          Begitu jadwal kamu di-assign atau disetujui, langsung muncul di Google Calendar kamu detik itu juga --
          tidak perlu nunggu refresh feed.
        </p>
      </div>

      {errorMessage && <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{errorMessage}</p>}

      {!configured ? (
        <p className="text-sm text-ink/40">Fitur ini belum aktif -- hubungi admin.</p>
      ) : connected ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="badge-approved">
            Terhubung{connectedAt ? ` sejak ${new Date(connectedAt).toLocaleDateString("id-ID")}` : ""}
          </span>
          <button onClick={disconnect} disabled={disconnecting} className="btn-secondary">
            {disconnecting ? "..." : "Putuskan koneksi"}
          </button>
        </div>
      ) : (
        <a href="/api/calendar-auth/start" className="btn-primary inline-block">
          Hubungkan Google Calendar saya
        </a>
      )}
    </div>
  );
}
