"use client";

import ModeSelection from "@/components/ModeSelection";

type StudyModeSelectionCardProps = {
  onSelectFlashcards: () => void;
  onSelectChallenge: () => void;
  focusWeakCards: boolean;
  onFocusWeakCardsChange: (value: boolean) => void;
};

export default function StudyModeSelectionCard({
  onSelectFlashcards,
  onSelectChallenge,
  focusWeakCards,
  onFocusWeakCardsChange,
}: StudyModeSelectionCardProps) {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "16px",
        padding: "24px",
        boxShadow: "0 12px 32px rgba(0,0,0,0.08)",
        border: "1px solid #e5e7eb",
        marginTop: "10px",
      }}
    >
      <ModeSelection
        onSelectFlashcards={onSelectFlashcards}
        onSelectChallenge={onSelectChallenge}
        focusWeakCards={focusWeakCards}
        onFocusWeakCardsChange={onFocusWeakCardsChange}
      />
    </div>
  );
}
