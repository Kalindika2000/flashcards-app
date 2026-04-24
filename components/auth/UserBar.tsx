"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

export function UserBar() {
  const { user, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const handleClick = () => setShowUserMenu(false);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

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
        justifyContent: "flex-end",
        padding: "8px 12px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ position: "relative" }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowUserMenu((prev) => !prev);
          }}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "none",
            backgroundColor: "#e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          {user.email?.charAt(0).toUpperCase() || "U"}
        </button>

        {showUserMenu ? (
          <div
            role="menu"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              top: 44,
              right: 0,
              background: "white",
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 12,
              minWidth: 200,
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "#666",
                marginBottom: 8,
                wordBreak: "break-all",
              }}
            >
              {user.email ?? user.uid}
            </div>

            <button
              type="button"
              onClick={() => void signOut()}
              style={{
                width: "100%",
                padding: "8px 0",
                background: "none",
                border: "none",
                color: "red",
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
