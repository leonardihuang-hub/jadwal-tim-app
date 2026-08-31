"use client";

import { useEffect, useState } from "react";
import { useEmployees } from "@/components/EmployeeProvider";
import { BellIcon } from "@/components/icons";
import type { SwapRequest } from "@/types/schedule";

// Notifikasi pasif buat orang yang diajak tukar jadwal -- bukan langkah
// konfirmasi/approval (itu tetap wewenang supervisor), cuma pemberitahuan
// supaya dia tahu jadwalnya kemungkinan berubah.
export default function IncomingSwapNotice() {
  const employees = useEmployees();
  const nameOf = (id: string) => employees.find((e) => e.id === id)?.name ?? id;
  const [requests, setRequests] = useState<SwapRequest[]>([]);

  useEffect(() => {
    fetch("/api/swap-requests?incoming=1")
      .then((res) => res.json())
      .then((data) => setRequests(data.requests ?? []));
  }, []);

  if (requests.length === 0) return null;

  return (
    <div className="space-y-2">
      {requests.map((r) => (
        <div key={r.id} className="card flex items-start gap-3 border-l-4 border-l-warning p-4">
          <BellIcon className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p className="text-sm text-ink">
            <span className="font-medium">{nameOf(r.requesterId)}</span> mengajukan{" "}
            {r.kind === "shift" ? "tukar shift" : "tukar ganti hari"} denganmu pada{" "}
            <span className="font-medium">{r.date}</span> &mdash; menunggu keputusan supervisor.
          </p>
        </div>
      ))}
    </div>
  );
}
