"use client";

import { useState } from "react";

export default function CalendarLinkCard({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API ditolak/tidak tersedia -- user masih bisa select manual dari field di bawah.
    }
  }

  return (
    <div className="card space-y-4 p-5">
      <div>
        <h2 className="text-sm font-semibold text-ink">Alternatif: subscribe lewat link</h2>
        <p className="mt-1 text-xs text-ink/60">
          Tidak perlu kasih izin akses tulis ke Google Calendar, tapi jadwal cuma diperbarui beberapa jam sekali
          (bukan langsung detik itu juga seperti push otomatis di atas).
        </p>
      </div>
      <div>
        <label className="field-label">Link kalender kamu</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            readOnly
            value={url}
            onFocus={(e) => e.target.select()}
            className="field-input flex-1"
          />
          <button onClick={copy} className="btn-secondary shrink-0">
            {copied ? "Tersalin!" : "Salin link"}
          </button>
        </div>
      </div>
      <div className="space-y-2 text-sm text-ink/70">
        <p className="font-medium text-ink">Cara subscribe di Google Calendar:</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Buka Google Calendar lewat browser di komputer (bukan aplikasi HP).</li>
          <li>Di panel kiri, klik tanda + di sebelah "Kalender lain" &rarr; pilih "Dari URL".</li>
          <li>Tempel link di atas, lalu klik "Tambahkan kalender".</li>
          <li>Jadwal kamu (Polisi, Middle, Piket, GH, Cuti, Libur/OT) akan otomatis muncul, dan diperbarui sendiri beberapa jam sekali.</li>
        </ol>
        <p className="text-xs text-ink/40">
          Link ini bersifat pribadi -- jangan dibagikan ke orang lain, karena siapa saja yang punya link ini bisa lihat jadwal kamu.
        </p>
      </div>
    </div>
  );
}
