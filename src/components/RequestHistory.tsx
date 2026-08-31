"use client";

import { useEffect, useState } from "react";
import { useEmployees } from "@/components/EmployeeProvider";
import { ClockIcon } from "@/components/icons";
import type { LeaveRequest, RequestStatus, SwapRequest } from "@/types/schedule";

const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak"
};

const STATUS_BADGE: Record<RequestStatus, string> = {
  pending: "badge-pending",
  approved: "badge-approved",
  rejected: "badge-rejected"
};

type HistoryItem = {
  id: string;
  label: string;
  // Untuk item tukar jadwal, nama pasangan tukar di-resolve saat render
  // (bukan disimpan langsung di label) supaya tetap update begitu daftar
  // karyawan dari useEmployees() selesai dimuat.
  targetId?: string;
  date: string;
  status: RequestStatus;
  createdAt: string;
};

export default function RequestHistory() {
  const employees = useEmployees();
  const nameOf = (id: string) => employees.find((e) => e.id === id)?.name ?? id;
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    Promise.all([
      fetch("/api/leave-requests?mine=1").then((res) => res.json()),
      fetch("/api/swap-requests?mine=1").then((res) => res.json())
    ])
      .then(([leaveData, swapData]) => {
        const leaveItems: HistoryItem[] = (leaveData.requests ?? []).map((r: LeaveRequest) => ({
          id: `leave-${r.id}`,
          label: r.type === "cuti" ? "Cuti" : "Ganti hari",
          date: r.date,
          status: r.status,
          createdAt: r.createdAt
        }));
        const swapItems: HistoryItem[] = (swapData.requests ?? []).map((r: SwapRequest) => ({
          id: `swap-${r.id}`,
          label: r.kind === "shift" ? "Tukar shift" : "Tukar ganti hari",
          targetId: r.targetId,
          date: r.date,
          status: r.status,
          createdAt: r.createdAt
        }));
        setItems(
          [...leaveItems, ...swapItems].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        );
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <ClockIcon className="h-4 w-4 text-accent" />
          Riwayat pengajuan
        </h2>
        <button onClick={load} className="btn-ghost">
          Muat ulang
        </button>
      </div>

      {loading && <p className="text-sm text-ink/50">Memuat...</p>}
      {!loading && items.length === 0 && (
        <p className="card p-4 text-sm text-ink/50">Belum ada pengajuan.</p>
      )}
      {!loading && items.length > 0 && (
        <div className="card divide-y divide-line overflow-hidden">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-ink">
                  {item.label}
                  {item.targetId ? ` dgn ${nameOf(item.targetId)}` : ""}
                </p>
                <p className="text-xs text-ink/50">{item.date}</p>
              </div>
              <span className={STATUS_BADGE[item.status]}>{STATUS_LABEL[item.status]}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
