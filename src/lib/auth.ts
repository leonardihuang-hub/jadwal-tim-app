import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { getEmployeeByEmail, getEmployeeById } from "./employees";

// Kalau OAuth client Google belum diisi di .env, kita belum bisa login lewat
// Google sungguhan. Provider "dev-login" di bawah cuma aktif dalam kondisi
// itu, supaya kamu tetap bisa login (pilih salah satu nama tim) dan tes alur
// assign/approval/request secara lokal. Begitu GOOGLE_CLIENT_ID terisi,
// provider ini otomatis tidak lagi didaftarkan -- login production tetap
// wajib lewat Google SSO.
const isDevLoginMode = !process.env.GOOGLE_CLIENT_ID;

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? ""
    }),
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
    // Dev-login sudah memfilter employee valid di authorize() di atas, jadi
    // dilewatkan saja di sini.
    async signIn({ user, account }) {
      if (account?.provider === "dev-login") return true;
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
