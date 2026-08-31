import type { DefaultSession } from "next-auth";

// Augmentasi tipe next-auth supaya field internal kita (employeeId,
// isSupervisor) dikenali TypeScript di session/token, tanpa perlu
// @ts-expect-error tersebar di setiap file yang membacanya.
declare module "next-auth" {
  interface Session {
    user: {
      employeeId?: string;
      isSupervisor?: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    employeeId?: string;
    isSupervisor?: boolean;
  }
}
