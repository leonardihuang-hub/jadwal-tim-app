"use client";

import { SessionProvider } from "next-auth/react";
import EmployeeProvider from "./EmployeeProvider";
import type { PublicEmployee } from "@/types/schedule";

export default function Providers({
  children,
  initialEmployees
}: {
  children: React.ReactNode;
  initialEmployees: PublicEmployee[];
}) {
  return (
    <SessionProvider>
      <EmployeeProvider initialEmployees={initialEmployees}>{children}</EmployeeProvider>
    </SessionProvider>
  );
}
