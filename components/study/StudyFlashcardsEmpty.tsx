"use client";

type StudyFlashcardsEmptyProps = {
  isOutdated: boolean;
  onGenerate: () => void;
};

export default function StudyFlashcardsEmpty({
  isOutdated,
  onGenerate,
}: StudyFlashcardsEmptyProps) {
  return (
    <div style={{ marginTop: "20px", textAlign: "center" }}>
      <p>
        {isOutdated
          ? "⚠️ Flashcards are outdated. Please regenerate them."
          : "No cards found."}
      </p>

      <button
        onClick={onGenerate}
        style={{
          marginTop: "10px",
          padding: "10px 16px",
          borderRadius: "8px",
          border: "none",
          background: "#2563eb",
          color: "white",
          cursor: "pointer",
        }}
      >
        Generate Flashcards
      </button>
    </div>
  );
}
