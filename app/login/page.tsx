"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Enter email and password.");
      return;
    }
    setPending(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err) {
      const code = err && typeof err === "object" && "code" in err ? String((err as { code?: string }).code) : "";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
        setError("Invalid email or password.");
      } else if (code === "auth/email-already-in-use") {
        setError("That email is already registered. Try signing in.");
      } else if (code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else if (code === "auth/invalid-email") {
        setError("Invalid email address.");
      } else {
        setError("Could not complete request. Try again.");
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "system-ui, sans-serif",
        background: "#f8fafc",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "380px",
          padding: "28px",
          borderRadius: "12px",
          background: "#fff",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ margin: "0 0 8px", fontSize: "22px" }}>
          {mode === "signin" ? "Sign in" : "Create account"}
        </h1>
        <p style={{ margin: "0 0 20px", fontSize: "14px", color: "#64748b" }}>
          Flashcards app — use the email/password provider in Firebase Console
          (Authentication → Sign-in method).
        </p>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <label style={{ display: "block", fontSize: "13px", marginBottom: "6px" }}>
            Email
          </label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              marginBottom: "14px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              fontSize: "15px",
              boxSizing: "border-box",
            }}
          />

          <label style={{ display: "block", fontSize: "13px", marginBottom: "6px" }}>
            Password
          </label>
          <input
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              marginBottom: "16px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              fontSize: "15px",
              boxSizing: "border-box",
            }}
          />

          {error && (
            <p style={{ color: "#b91c1c", fontSize: "13px", margin: "0 0 12px" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "none",
              background: pending ? "#94a3b8" : "#2563eb",
              color: "#fff",
              fontSize: "15px",
              fontWeight: 600,
              cursor: pending ? "not-allowed" : "pointer",
            }}
          >
            {pending ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p style={{ marginTop: "18px", fontSize: "14px", textAlign: "center" }}>
          {mode === "signin" ? (
            <>
              No account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#2563eb",
                  cursor: "pointer",
                  textDecoration: "underline",
                  padding: 0,
                  font: "inherit",
                }}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#2563eb",
                  cursor: "pointer",
                  textDecoration: "underline",
                  padding: 0,
                  font: "inherit",
                }}
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
