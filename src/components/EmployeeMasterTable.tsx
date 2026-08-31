"use client";

import { useEffect, useState } from "react";
import type { Employee } from "@/types/schedule";

type RowDraft = { name: string; email: string; isSupervisor: boolean };
type RowStatus = { saving: boolean; error?: string; savedAt?: number };

function toDraft(e: Employee): RowDraft {
  return { name: e.name, email: e.email, isSupervisor: e.isSupervisor };
}

// Halaman kelola master data karyawan (khusus supervisor) -- ganti tempat
// yang sebelumnya harus edit src/lib/constants.ts + minta bantuan Claude Code
// tiap kali ada karyawan baru atau email berubah.
export default function EmployeeMasterTable() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [rowStatus, setRowStatus] = useState<Record<string, RowStatus>>({});

  const [newRow, setNewRow] = useState({ id: "", name: "", email: "", isSupervisor: false });
  const [addStatus, setAddStatus] = useState<{ saving: boolean; error?: string }>({ saving: false });

  function load() {
    setLoading(true);
    fetch("/api/admin/employees")
      .then((res) => res.json())
      .then((data) => {
        const list: Employee[] = data.employees ?? [];
        setEmployees(list);
        setDrafts(Object.fromEntries(list.map((e) => [e.id, toDraft(e)])));
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function updateDraft(id: string, patch: Partial<RowDraft>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function saveRow(id: string) {
    const draft = drafts[id];
    if (!draft) return;
    setRowStatus((prev) => ({ ...prev, [id]: { saving: true } }));
    try {
      const res = await fetch(`/api/admin/employees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
      const data = await res.json();
      if (!res.ok) {
        const message = typeof data.error === "string" ? data.error : "Gagal menyimpan.";
        setRowStatus((prev) => ({ ...prev, [id]: { saving: false, error: message } }));
        return;
      }
      setEmployees((prev) => prev.map((e) => (e.id === id ? data.employee : e)));
      setRowStatus((prev) => ({ ...prev, [id]: { saving: false, savedAt: Date.now() } }));
    } catch {
      setRowStatus((prev) => ({ ...prev, [id]: { saving: false, error: "Gagal menyimpan, coba lagi." } }));
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    setRowStatus((prev) => ({ ...prev, [id]: { saving: true } }));
    try {
      const res = await fetch(`/api/admin/employees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive })
      });
      const data = await res.json();
      if (!res.ok) {
        const message = typeof data.error === "string" ? data.error : "Gagal menyimpan.";
        setRowStatus((prev) => ({ ...prev, [id]: { saving: false, error: message } }));
        return;
      }
      setEmployees((prev) => prev.map((e) => (e.id === id ? data.employee : e)));
      setRowStatus((prev) => ({ ...prev, [id]: { saving: false, savedAt: Date.now() } }));
    } catch {
      setRowStatus((prev) => ({ ...prev, [id]: { saving: false, error: "Gagal menyimpan, coba lagi." } }));
    }
  }

  async function addEmployee(e: React.FormEvent) {
    e.preventDefault();
    setAddStatus({ saving: true });
    try {
      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRow)
      });
      const data = await res.json();
      if (!res.ok) {
        const message = typeof data.error === "string" ? data.error : "Gagal menambah karyawan.";
        setAddStatus({ saving: false, error: message });
        return;
      }
      setEmployees((prev) => [...prev, data.employee]);
      setDrafts((prev) => ({ ...prev, [data.employee.id]: toDraft(data.employee) }));
      setNewRow({ id: "", name: "", email: "", isSupervisor: false });
      setAddStatus({ saving: false });
    } catch {
      setAddStatus({ saving: false, error: "Gagal menambah karyawan, coba lagi." });
    }
  }

  if (loading) {
    return (
      <div className="card space-y-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-line/30" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-paper text-left text-xs font-semibold uppercase tracking-wide text-ink/40">
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Email (@esb.co.id)</th>
                <th className="px-4 py-3">Supervisor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {employees.map((emp) => {
                const draft = drafts[emp.id] ?? toDraft(emp);
                const status = rowStatus[emp.id];
                return (
                  <tr key={emp.id} className={!emp.isActive ? "opacity-50" : ""}>
                    <td className="px-4 py-2">
                      <input
                        className="field-input"
                        value={draft.name}
                        onChange={(e) => updateDraft(emp.id, { name: e.target.value })}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="email"
                        className="field-input"
                        value={draft.email}
                        onChange={(e) => updateDraft(emp.id, { email: e.target.value })}
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={draft.isSupervisor}
                        onChange={(e) => updateDraft(emp.id, { isSupervisor: e.target.checked })}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => toggleActive(emp.id, !emp.isActive)}
                        className={emp.isActive ? "badge-approved" : "badge-rejected"}
                      >
                        {emp.isActive ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => saveRow(emp.id)} disabled={status?.saving} className="btn-secondary">
                        {status?.saving ? "..." : "Simpan"}
                      </button>
                    </td>
                    <td className="max-w-[220px] px-4 py-3">
                      {status?.error && <p className="text-xs text-danger">{status.error}</p>}
                      {status?.savedAt && !status.error && <span className="badge-approved">Tersimpan</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card space-y-4 p-5">
        <h2 className="text-sm font-semibold text-ink">Tambah karyawan baru</h2>
        <form onSubmit={addEmployee} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="field-label">Slug (id)</label>
            <input
              required
              placeholder="misal: budi"
              className="field-input"
              value={newRow.id}
              onChange={(e) => setNewRow((prev) => ({ ...prev, id: e.target.value.toLowerCase() }))}
            />
          </div>
          <div>
            <label className="field-label">Nama</label>
            <input
              required
              className="field-input"
              value={newRow.name}
              onChange={(e) => setNewRow((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="field-label">Email</label>
            <input
              required
              type="email"
              placeholder="nama@esb.co.id"
              className="field-input"
              value={newRow.email}
              onChange={(e) => setNewRow((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div className="flex items-end gap-3">
            <label className="flex items-center gap-2 text-sm text-ink/70">
              <input
                type="checkbox"
                checked={newRow.isSupervisor}
                onChange={(e) => setNewRow((prev) => ({ ...prev, isSupervisor: e.target.checked }))}
                className="h-4 w-4"
              />
              Supervisor
            </label>
            <button type="submit" disabled={addStatus.saving} className="btn-primary">
              {addStatus.saving ? "Menambah..." : "Tambah"}
            </button>
          </div>
        </form>
        {addStatus.error && <p className="text-sm text-danger">{addStatus.error}</p>}
      </div>
    </div>
  );
}
