"use client";

import { useAuth } from "@/components/auth/AuthProvider";

export function UserBar() {
  const { user, signOut } = useAuth();

  if (!user) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        zIndex: 100000,
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px 12px",
        fontSize: "12px",
        fontFamily: "system-ui, sans-serif",
        background: "rgba(255,255,255,0.95)",
        borderBottomLeftRadius: "8px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      }}
    >
      <span
        style={{
          maxWidth: "140px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          color: "#444",
        }}
        title={user.email ?? undefined}
      >
        {user.email ?? user.uid.slice(0, 8)}
      </span>
      <button
        type="button"
        onClick={() => void signOut()}
        style={{
          padding: "4px 10px",
          fontSize: "12px",
          borderRadius: "6px",
          border: "1px solid #ccc",
          background: "#fff",
          cursor: "pointer",
        }}
      >
        Sign out
      </button>
    </div>
  );
}
