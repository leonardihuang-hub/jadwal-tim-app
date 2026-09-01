import { Suspense } from "react";
import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  const mode = process.env.OPS_SSO_CLIENT_ID ? "sso" : process.env.GOOGLE_CLIENT_ID ? "google" : "dev";
  return (
    // Suspense wajib di sini -- LoginForm baca useSearchParams() (untuk
    // ?ssoCode / ?error dari /auth/sso/callback).
    <Suspense>
      <LoginForm mode={mode} />
    </Suspense>
  );
}
