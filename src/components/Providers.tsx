"use client";

import { SessionProvider } from "next-auth/react";
import EmployeeProvider from "./EmployeeProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <EmployeeProvider>{children}</EmployeeProvider>
    </SessionProvider>
  );
}
