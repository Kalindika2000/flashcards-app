"use client";

type StudySessionCompleteProps = {
  allMastered: boolean;
  someKnown: boolean;
  restartMode: "all" | "difficult";
  onRestartModeChange: (mode: "all" | "difficult") => void;
  onBackToModes: () => void;
  onRestart: () => void;
};

export default function StudySessionComplete({
  allMastered,
  someKnown,
  restartMode,
  onRestartModeChange,
  onBackToModes,
  onRestart,
}: StudySessionCompleteProps) {
  return (
    <div style={{ marginTop: "40px", textAlign: "center" }}>
      <button onClick={onBackToModes} style={{ marginBottom: "20px" }}>
        ← Back to study modes
      </button>
      <h2>🎉 Session Complete!</h2>

      {allMastered ? (
        <p>You’ve mastered all flashcards.</p>
      ) : (
        <p>You’ve reviewed all cards.</p>
      )}

      {!allMastered && someKnown && (
        <div style={{ marginTop: "20px" }}>
          <label>
            <input
              type="radio"
              value="all"
              checked={restartMode === "all"}
              onChange={() => onRestartModeChange("all")}
            />
            All cards
          </label>
          <label style={{ marginLeft: "12px" }}>
            <input
              type="radio"
              value="difficult"
              checked={restartMode === "difficult"}
              onChange={() => onRestartModeChange("difficult")}
            />
            Difficult cards only
          </label>
        </div>
      )}

      <button
        onClick={onRestart}
        style={{
          marginTop: "20px",
          padding: "10px 20px",
          borderRadius: "10px",
          border: "none",
          background: "#2563eb",
          color: "white",
          cursor: "pointer",
        }}
      >
        Restart
      </button>
    </div>
  );
}
