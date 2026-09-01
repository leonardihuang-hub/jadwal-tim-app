"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useEmployees } from "@/components/EmployeeProvider";

type Mode = "sso" | "google" | "dev";

const ERROR_MESSAGES: Record<string, string> = {
  sso_not_configured: "Login SSO belum dikonfigurasi di server -- hubungi admin.",
  sso_state_mismatch: "Sesi login kadaluarsa atau tidak valid, coba masuk lagi.",
  sso_domain_not_allowed: "Akun Google itu bukan email @esb.co.id -- gunakan email kantor kamu.",
  sso_google_exchange_failed: "Gagal terhubung ke Google lewat SSO, coba lagi.",
  sso_internal_error: "Terjadi kesalahan di server SSO, coba lagi."
};

function errorMessage(code: string | null): string | null {
  if (!code) return null;
  return ERROR_MESSAGES[code] ?? "Login gagal, coba lagi.";
}

export default function LoginForm({ mode }: { mode: Mode }) {
  const employees = useEmployees();
  const activeEmployees = employees.filter((e) => e.isActive);
  const [employeeId, setEmployeeId] = useState("");
  const searchParams = useSearchParams();
  const ssoCode = searchParams.get("ssoCode");
  const ssoSigningIn = Boolean(ssoCode);

  useEffect(() => {
    if (!employeeId && activeEmployees.length > 0) {
      setEmployeeId(activeEmployees[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEmployees.length]);

  // Begitu balik dari ops-sso (?ssoCode=... di URL), langsung picu sign-in
  // next-auth provider "ops-sso" -- authorize()-nya (lib/auth.ts) yang
  // menukar code ini jadi {name,email} lewat POST /exchange ke ops-sso.
  useEffect(() => {
    if (ssoCode) {
      signIn("ops-sso", { code: ssoCode, callbackUrl: "/" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ssoCode]);

  const error = errorMessage(searchParams.get("error"));

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

        {error && <p className="mt-4 rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>}

        {ssoSigningIn ? (
          <p className="mt-6 text-sm text-ink/60">Menyelesaikan login...</p>
        ) : (
          <>
            {mode === "sso" && (
              <a href="/api/auth/sso/login" className="btn-primary mt-6 block w-full">
                Masuk dengan email @esb.co.id
              </a>
            )}

            {mode === "google" && (
              <button onClick={() => signIn("google", { callbackUrl: "/" })} className="btn-primary mt-6 w-full">
                Masuk dengan Google
              </button>
            )}

            {mode === "dev" && (
              <div className="mt-6 space-y-3 rounded-xl border border-dashed border-line bg-paper p-4 text-left">
                <p className="text-xs text-ink/60">
                  Mode dev aktif -- <code className="text-ink/80">OPS_SSO_CLIENT_ID</code> belum diisi
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
          </>
        )}
      </div>
    </div>
  );
}
