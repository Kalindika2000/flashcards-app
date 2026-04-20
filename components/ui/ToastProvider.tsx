"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type ToastVariant = "error" | "info" | "success";

type ToastContextValue = {
  showToast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{
    message: string;
    variant: ToastVariant;
  } | null>(null);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      setToast({ message, variant });
    },
    [],
  );

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(id);
  }, [toast]);

  const bg =
    toast?.variant === "error"
      ? "#fef2f2"
      : toast?.variant === "success"
        ? "#f0fdf4"
        : "#eff6ff";
  const border =
    toast?.variant === "error"
      ? "#fecaca"
      : toast?.variant === "success"
        ? "#bbf7d0"
        : "#bfdbfe";
  const color =
    toast?.variant === "error"
      ? "#991b1b"
      : toast?.variant === "success"
        ? "#166534"
        : "#1e40af";

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div
          role="alert"
          style={{
            position: "fixed",
            bottom: "calc(88px + env(safe-area-inset-bottom, 0px))",
            left: "50%",
            transform: "translateX(-50%)",
            maxWidth: "min(420px, calc(100vw - 32px))",
            zIndex: 100001,
            padding: "12px 16px",
            borderRadius: "10px",
            background: bg,
            border: `1px solid ${border}`,
            color,
            fontSize: "14px",
            fontFamily: "system-ui, sans-serif",
            lineHeight: 1.45,
            boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
          }}
        >
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
