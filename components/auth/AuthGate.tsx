"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

const PUBLIC_PREFIXES = ["/login"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user && !isPublicPath(pathname)) {
      router.replace("/login");
      return;
    }

    if (user && pathname === "/login") {
      router.replace("/");
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          color: "#555",
        }}
      >
        Loading…
      </div>
    );
  }

  if (!user && !isPublicPath(pathname)) {
    return null;
  }

  return <>{children}</>;
}
