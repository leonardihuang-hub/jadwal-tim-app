import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { getEmployeeByEmail, getEmployeeById } from "./employees";

// Login production yang sebenarnya lewat ops-sso (broker Google Sign-In
// terpusat kantor -- lihat README-OPS-SSO.md) supaya app ini tidak perlu
// bikin OAuth Client sendiri per aplikasi. Kalau OPS_SSO_CLIENT_ID belum
// diisi (dan GOOGLE_CLIENT_ID langsung juga belum), kita jatuh ke provider
// "dev-login" di bawah supaya tetap bisa login (pilih salah satu nama tim)
// dan tes alur assign/approval/request secara lokal.
const isDevLoginMode = !process.env.OPS_SSO_CLIENT_ID && !process.env.GOOGLE_CLIENT_ID;

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? ""
    }),
    ...(process.env.OPS_SSO_CLIENT_ID
      ? [
          CredentialsProvider({
            id: "ops-sso",
            name: "SSO ESB",
            // "code" di sini adalah kode sekali-pakai dari ops-sso (lihat
            // /api/auth/sso/callback), BUKAN kode OAuth Google langsung --
            // app ini tidak pernah bicara ke Google sama sekali.
            credentials: { code: { label: "code", type: "text" } },
            async authorize(credentials) {
              const code = credentials?.code;
              if (!code) return null;

              const res = await fetch(`${process.env.OPS_SSO_BASE_URL}/exchange`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  code,
                  client_id: process.env.OPS_SSO_CLIENT_ID,
                  client_secret: process.env.OPS_SSO_CLIENT_SECRET
                })
              });
              if (!res.ok) return null;

              const { name, email } = (await res.json()) as { name?: string; email?: string };
              if (!email) return null;

              // ops-sso sudah menegakkan domain esb.co.id di sisi mereka,
              // tapi dicek ulang di sini juga (defense in depth) sebelum
              // dicocokkan ke master data karyawan kita sendiri.
              const allowedDomain = process.env.ALLOWED_GOOGLE_DOMAIN;
              if (allowedDomain && !email.toLowerCase().endsWith(`@${allowedDomain.toLowerCase()}`)) {
                return null;
              }

              const employee = await getEmployeeByEmail(email);
              if (!employee || !employee.isActive) return null;
              return { id: employee.id, name: name ?? employee.name, email: employee.email };
            }
          })
        ]
      : []),
    ...(isDevLoginMode
      ? [
          CredentialsProvider({
            id: "dev-login",
            name: "Dev login",
            credentials: {
              employeeId: { label: "Nama", type: "text" }
            },
            async authorize(credentials) {
              const employee = credentials?.employeeId ? await getEmployeeById(credentials.employeeId) : null;
              if (!employee || !employee.isActive) return null;
              return { id: employee.id, name: employee.name, email: employee.email };
            }
          })
        ]
      : [])
  ],
  callbacks: {
    // Tolak login kalau email bukan dari domain Workspace tim (esb.co.id),
    // atau kalau orangnya tidak ada / sudah nonaktif di master data karyawan.
    // dev-login dan ops-sso sudah memfilter employee valid di authorize()
    // masing-masing di atas, jadi dilewatkan saja di sini.
    async signIn({ user, account }) {
      if (account?.provider === "dev-login" || account?.provider === "ops-sso") return true;
      const allowedDomain = process.env.ALLOWED_GOOGLE_DOMAIN;
      const email = user.email ?? "";
      if (allowedDomain && !email.toLowerCase().endsWith(`@${allowedDomain.toLowerCase()}`)) {
        return false;
      }
      const employee = await getEmployeeByEmail(email);
      return Boolean(employee && employee.isActive);
    },
    // jwt() menyimpan employeeId/isSupervisor ke dalam token itu sendiri
    // (bukan cuma object session di request), supaya middleware.ts (yang
    // baca token lewat next-auth/jwt getToken(), bukan getServerSession())
    // juga bisa cek isSupervisor tanpa query ulang.
    async jwt({ token, user }) {
      const email = user?.email ?? token.email ?? "";
      const employee = await getEmployeeByEmail(email);
      if (employee) {
        token.employeeId = employee.id;
        token.isSupervisor = employee.isSupervisor;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.employeeId = token.employeeId;
        session.user.isSupervisor = token.isSupervisor;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login"
  }
};
