"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useEmployees } from "@/components/EmployeeProvider";

export default function LoginForm({ isDevLoginMode }: { isDevLoginMode: boolean }) {
  const employees = useEmployees();
  const activeEmployees = employees.filter((e) => e.isActive);
  const [employeeId, setEmployeeId] = useState("");

  useEffect(() => {
    if (!employeeId && activeEmployees.length > 0) {
      setEmployeeId(activeEmployees[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEmployees.length]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="card w-full max-w-sm p-8 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-lg font-semibold text-white">
          JT
        </span>
        <h1 className="text-lg font-semibold text-ink">Masuk ke jadwal tim</h1>
        <p className="mt-1 text-sm text-ink/60">
          Dashboard jadwal shift, cuti, dan tukar jadwal tim kamu.
        </p>

        {!isDevLoginMode && (
          <button onClick={() => signIn("google", { callbackUrl: "/" })} className="btn-primary mt-6 w-full">
            Masuk dengan Google
          </button>
        )}

        {isDevLoginMode && (
          <div className="mt-6 space-y-3 rounded-xl border border-dashed border-line bg-paper p-4 text-left">
            <p className="text-xs text-ink/60">
              Mode dev aktif -- <code className="text-ink/80">GOOGLE_CLIENT_ID</code> belum diisi
              di <code className="text-ink/80">.env</code>. Pilih nama untuk login sementara.
            </p>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="field-input"
            >
              {activeEmployees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                  {e.isSupervisor ? " (supervisor)" : ""}
                </option>
              ))}
            </select>
            <button
              onClick={() => signIn("dev-login", { employeeId, callbackUrl: "/" })}
              className="btn-primary w-full"
            >
              Masuk (dev)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
