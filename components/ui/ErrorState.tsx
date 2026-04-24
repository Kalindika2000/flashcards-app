"use client";

type ErrorStateProps = {
  message?: string | null;
};

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <div
      style={{
        padding: "16px",
        border: "1px solid #fecaca",
        backgroundColor: "#fef2f2",
        color: "#991b1b",
        borderRadius: "8px",
        marginTop: "16px",
      }}
    >
      {message?.trim() || "Something went wrong. Please try again."}
    </div>
  );
}
