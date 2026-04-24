"use client";

import { EmptyState } from "@/components/ui/EmptyState";

type StudyFlashcardsEmptyProps = {
  isOutdated: boolean;
  onGenerate: () => void;
};

export default function StudyFlashcardsEmpty({
  isOutdated,
  onGenerate,
}: StudyFlashcardsEmptyProps) {
  return (
    <div style={{ marginTop: "20px" }}>
      <EmptyState
        title={
          isOutdated
            ? "Flashcards are outdated"
            : "No flashcards yet"
        }
        description={
          isOutdated
            ? "Regenerate flashcards from your notes"
            : "Generate flashcards from your notes"
        }
      />

      <div style={{ textAlign: "center" }}>
        <button
          type="button"
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
    </div>
  );
}
