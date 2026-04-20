"use client";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { AuthGate } from "@/components/auth/AuthGate";
import { UserBar } from "@/components/auth/UserBar";
import { ToastProvider } from "@/components/ui/ToastProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <AuthGate>
          <UserBar />
          {children}
        </AuthGate>
      </ToastProvider>
    </AuthProvider>
  );
}
