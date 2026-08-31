"use client";

import { useEffect, useState } from "react";
import { useEmployees } from "@/components/EmployeeProvider";
import type { LeaveRequest, RequestStatus, SwapRequest } from "@/types/schedule";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

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
  typeLabel: string;
  personLabel: string;
  date: string;
  status: RequestStatus;
  createdAt: string;
  decidedAt?: string;
  approverName?: string;
  reason?: string;
};

export default function ApprovalQueue() {
  const employees = useEmployees();
  const nameOf = (id: string) => employees.find((e) => e.id === id)?.name ?? id;
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);

  function load() {
    fetch("/api/leave-requests")
      .then((res) => res.json())
      .then((data) => setLeaveRequests(data.requests ?? []));
    fetch("/api/swap-requests")
      .then((res) => res.json())
      .then((data) => setSwapRequests(data.requests ?? []));
  }

  useEffect(load, []);

  async function decideLeave(requestId: string, decision: "approved" | "rejected") {
    await fetch("/api/approvals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, requestKind: "leave", decision })
    });
    load();
  }

  async function decideSwap(requestId: string, decision: "approved" | "rejected") {
    await fetch("/api/approvals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, requestKind: "swap", decision })
    });
    load();
  }

  const pendingLeave = leaveRequests.filter((r) => r.status === "pending");
  const pendingSwap = swapRequests.filter((r) => r.status === "pending");

  const history: HistoryItem[] = [
    ...leaveRequests
      .filter((r) => r.status !== "pending")
      .map((r) => ({
        id: `leave-${r.id}`,
        typeLabel: r.type === "cuti" ? "Cuti" : "Ganti hari",
        personLabel: nameOf(r.employeeId),
        date: r.date,
        status: r.status,
        createdAt: r.createdAt,
        decidedAt: r.decidedAt,
        approverName: r.approverId ? nameOf(r.approverId) : undefined,
        reason: r.reason
      })),
    ...swapRequests
      .filter((r) => r.status !== "pending")
      .map((r) => ({
        id: `swap-${r.id}`,
        typeLabel: r.kind === "shift" ? "Tukar shift" : "Tukar ganti hari",
        personLabel: `${nameOf(r.requesterId)} ↔ ${nameOf(r.targetId)}`,
        date: r.date,
        status: r.status,
        createdAt: r.createdAt,
        decidedAt: r.decidedAt,
        approverName: r.approverId ? nameOf(r.approverId) : undefined
      }))
  ].sort((a, b) => (b.decidedAt ?? b.createdAt).localeCompare(a.decidedAt ?? a.createdAt));

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-full border border-line bg-surface p-1">
        <button onClick={() => setTab("pending")} className={tab === "pending" ? "pill-toggle-active" : "pill-toggle"}>
          Menunggu
        </button>
        <button onClick={() => setTab("history")} className={tab === "history" ? "pill-toggle-active" : "pill-toggle"}>
          Riwayat
        </button>
      </div>

      {tab === "pending" && (
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-ink">Cuti / ganti hari</h2>
            {pendingLeave.length === 0 ? (
              <p className="card p-4 text-sm text-ink/50">Tidak ada pengajuan yang menunggu approval.</p>
            ) : (
              <div className="card divide-y divide-line overflow-hidden">
                {pendingLeave.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-ink">{nameOf(r.employeeId)}</p>
                      <p className="text-xs text-ink/50">
                        {r.type === "cuti" ? "Cuti" : "Ganti hari"} &middot; {r.date}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button onClick={() => decideLeave(r.id, "approved")} className="btn-primary">
                        Approve
                      </button>
                      <button onClick={() => decideLeave(r.id, "rejected")} className="btn-danger">
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-ink">Tukar jadwal</h2>
            {pendingSwap.length === 0 ? (
              <p className="card p-4 text-sm text-ink/50">Tidak ada pengajuan yang menunggu approval.</p>
            ) : (
              <div className="card divide-y divide-line overflow-hidden">
                {pendingSwap.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {nameOf(r.requesterId)} &harr; {nameOf(r.targetId)}
                      </p>
                      <p className="text-xs text-ink/50">
                        {r.kind === "shift" ? "Tukar shift" : "Tukar ganti hari"} &middot; {r.date}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button onClick={() => decideSwap(r.id, "approved")} className="btn-primary">
                        Approve
                      </button>
                      <button onClick={() => decideSwap(r.id, "rejected")} className="btn-danger">
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "history" && (
        <section className="space-y-3">
          {history.length === 0 ? (
            <p className="card p-4 text-sm text-ink/50">Belum ada riwayat keputusan.</p>
          ) : (
            <div className="card divide-y divide-line overflow-hidden">
              {history.map((item) => (
                <div key={item.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-ink">{item.personLabel}</p>
                      <p className="text-xs text-ink/50">
                        {item.typeLabel} &middot; {item.date}
                        {item.reason ? ` — "${item.reason}"` : ""}
                      </p>
                    </div>
                    <span className={STATUS_BADGE[item.status]}>{STATUS_LABEL[item.status]}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-ink/40">
                    <span>Diajukan: {formatDateTime(item.createdAt)}</span>
                    {item.decidedAt && (
                      <span>
                        Diputuskan: {formatDateTime(item.decidedAt)}
                        {item.approverName ? ` oleh ${item.approverName}` : ""}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
