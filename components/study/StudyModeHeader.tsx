"use client";

type StudyModeHeaderProps = {
  mode: "flashcards" | "challenge" | null;
  challengeActive: boolean;
  onResetMode: () => void;
};

export default function StudyModeHeader({
  mode,
  challengeActive,
  onResetMode,
}: StudyModeHeaderProps) {
  if (mode === null) {
    return (
      <div
        style={{
          marginTop: "20px",
          marginBottom: "20px",
          fontWeight: "600",
        }}
      >
        Choose how you want to study
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: "20px",
        marginBottom: "20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <button
        onClick={onResetMode}
        style={{
          background: "none",
          border: "none",
          color: "#2563eb",
          fontWeight: "600",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        ← Back to study modes
      </button>

      {mode === "challenge" && challengeActive && (
        <div
          style={{
            fontSize: "14px",
            fontWeight: "600",
            color: "#6b7280",
          }}
        >
          Challenge Mode
        </div>
      )}
    </div>
  );
}
