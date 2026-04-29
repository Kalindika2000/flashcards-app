"use client";

type StudyModeHeaderProps = {
  mode: "flashcards" | "challenge" | null;
  challengeActive: boolean;
  onResetMode: () => void;
  focusWeakCards?: boolean;
  onFocusWeakCardsChange?: (value: boolean) => void;
};

export default function StudyModeHeader({
  mode,
  challengeActive,
  onResetMode,
  focusWeakCards = false,
  onFocusWeakCardsChange,
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

  const showWeakToggle =
    onFocusWeakCardsChange != null &&
    (mode === "flashcards" || (mode === "challenge" && challengeActive));

  return (
    <div
      style={{
        marginTop: "20px",
        marginBottom: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
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

      {showWeakToggle ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            maxWidth: "420px",
          }}
        >
          <label
            htmlFor="study-header-focus-weak-toggle"
            style={{
              cursor: "pointer",
              fontSize: "14px",
              color: "#4b5563",
              fontWeight: 500,
            }}
          >
            Focus on weak cards
          </label>
          <button
            id="study-header-focus-weak-toggle"
            type="button"
            onClick={() => onFocusWeakCardsChange(!focusWeakCards)}
            aria-pressed={focusWeakCards}
            aria-label="Focus on weak cards toggle"
            style={{
              position: "relative",
              display: "inline-flex",
              height: "24px",
              width: "44px",
              flexShrink: 0,
              alignItems: "center",
              borderRadius: "9999px",
              border: "none",
              cursor: "pointer",
              backgroundColor: focusWeakCards ? "#22c55e" : "#d1d5db",
              transition: "background-color 0.2s",
            }}
          >
            <span
              style={{
                display: "inline-block",
                height: "16px",
                width: "16px",
                borderRadius: "9999px",
                backgroundColor: "#fff",
                transform: focusWeakCards ? "translateX(20px)" : "translateX(4px)",
                transition: "transform 0.2s",
              }}
            />
          </button>
        </div>
      ) : null}
    </div>
  );
}
