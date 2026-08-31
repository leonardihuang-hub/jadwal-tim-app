"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { useEmployees } from "@/components/EmployeeProvider";

const todayIso = format(new Date(), "yyyy-MM-dd");

type RequestType = "cuti" | "ganti_hari" | "tukar_jadwal";

export default function RequestForm() {
  const { data: session } = useSession();
  const employees = useEmployees();
  const otherEmployees = employees.filter((e) => e.isActive && e.id !== session?.user?.employeeId);

  const [requestType, setRequestType] = useState<RequestType>("cuti");
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [targetId, setTargetId] = useState("");
  const [swapKind, setSwapKind] = useState<"shift" | "ganti_hari">("shift");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // otherEmployees kosong dulu sebelum useEmployees() selesai fetch --
  // begitu datanya masuk, pilih orang pertama secara default.
  useEffect(() => {
    if (!targetId && otherEmployees.length > 0) {
      setTargetId(otherEmployees[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherEmployees.length]);

  const isSwap = requestType === "tukar_jadwal";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = isSwap
        ? await fetch("/api/swap-requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetId, date, kind: swapKind })
          })
        : await fetch("/api/leave-requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: requestType, date, reason })
          });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(typeof data.error === "string" ? data.error : "Gagal mengirim, coba lagi.");
        setStatus("error");
        return;
      }
      setStatus("sent");
      setDate("");
      setReason("");
    } catch {
      setErrorMessage("Gagal mengirim, coba lagi.");
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="field-label">Jenis pengajuan</label>
        <select
          value={requestType}
          onChange={(e) => setRequestType(e.target.value as RequestType)}
          className="field-input"
        >
          <option value="cuti">Cuti</option>
          <option value="ganti_hari">Ganti hari</option>
          <option value="tukar_jadwal">Tukar jadwal</option>
        </select>
      </div>

      {isSwap ? (
        <>
          <div>
            <label className="field-label">Tukar dengan</label>
            <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="field-input">
              {otherEmployees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Jenis tukar</label>
            <select
              value={swapKind}
              onChange={(e) => setSwapKind(e.target.value as "shift" | "ganti_hari")}
              className="field-input"
            >
              <option value="shift">Tukar shift (pagi/middle)</option>
              <option value="ganti_hari">Tukar ganti hari</option>
            </select>
          </div>
          <div>
            <label className="field-label">Tanggal</label>
            <input
              type="date"
              required
              min={todayIso}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="field-input"
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="field-label">Tanggal</label>
            <input
              type="date"
              required
              min={todayIso}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">Alasan</label>
            <textarea
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="field-input"
              rows={3}
            />
          </div>
        </>
      )}

      <button
        type="submit"
        disabled={status === "sending" || (isSwap && !targetId)}
        className="btn-primary w-full sm:w-auto"
      >
        {status === "sending" ? "Mengirim..." : "Kirim pengajuan"}
      </button>
      {status === "sent" && <p className="text-sm text-accent">Pengajuan terkirim, menunggu approval.</p>}
      {status === "error" && <p className="text-sm text-danger">{errorMessage}</p>}
    </form>
  );
}
