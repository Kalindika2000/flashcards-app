"use client";

export default function ModeSelection({
  onSelectFlashcards,
  onSelectChallenge,
}: {
  onSelectFlashcards: () => void;
  onSelectChallenge: () => void;
}) {
  return (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      textAlign: "center",
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: "420px",
        display: "flex",
        justifyContent: "center",
        gap: "16px",
      }}
    >
      <button
        onClick={onSelectFlashcards}
        className="w-full p-5 rounded-2xl border transition"
        style={{
          backgroundColor: "#2563eb",
          color: "white",
        }}
      >
        <div style={{ fontSize: "18px", fontWeight: "600" }}>
          📚 Flashcards
        </div>
        <div style={{ fontSize: "14px", opacity: 0.9 }}>
          Review key ideas with swipe
        </div>
      </button>

      <button
        onClick={onSelectChallenge}
        className="w-full p-5 rounded-2xl border transition"
        style={{
          backgroundColor: "#10b981",
          color: "white",
          boxShadow: "0 8px 20px rgba(16, 185, 129, 0.25)",
        }}
      >
        <div style={{ fontSize: "18px", fontWeight: "600" }}>
          ⚡ Challenge Mode
        </div>
        <div style={{ fontSize: "14px", opacity: 0.9 }}>
          Test yourself under pressure
        </div>
      </button>
    </div>
  </div>
);
}