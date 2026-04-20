"use client";

export default function ModeSelection({
  onSelectFlashcards,
  onSelectChallenge,
  focusWeakCards,
  onFocusWeakCardsChange,
}: {
  onSelectFlashcards: () => void;
  onSelectChallenge: () => void;
  focusWeakCards: boolean;
  onFocusWeakCardsChange: (value: boolean) => void;
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
      flexDirection: "column",
      gap: "16px",
      
      }}
    >
      <button
  onClick={onSelectFlashcards}
 /* onMouseEnter={(e) => {
  e.currentTarget.style.transform = "translateY(-2px) scale(1)";
}}
onMouseLeave={(e) => {
  e.currentTarget.style.transform = "translateY(0) scale(1)";
}}
onMouseDown={(e) => {
  e.currentTarget.style.transform = "translateY(0) scale(0.96)";
}}
onMouseUp={(e) => {
  e.currentTarget.style.transform = "translateY(-2px) scale(1)";
}}*/
  //className="w-full p-5 rounded-2xl border"
  className="mode-button w-full p-5 rounded-2xl border"
  style={{
    backgroundColor: "#2563eb",
    color: "white",
    //transition: "transform 0.15s ease",
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
  /*onMouseEnter={(e) => {
  e.currentTarget.style.transform = "translateY(-2px) scale(1)";
}}
onMouseLeave={(e) => {
  e.currentTarget.style.transform = "translateY(0) scale(1)";
}}
onMouseDown={(e) => {
  e.currentTarget.style.transform = "translateY(0) scale(0.96)";
}}
onMouseUp={(e) => {
  e.currentTarget.style.transform = "translateY(-2px) scale(1)";
}}*/
  //className="w-full p-5 rounded-2xl border"
  className="mode-button w-full p-5 rounded-2xl border"
  style={{
    backgroundColor: "#10b981",
    color: "white",
    boxShadow: "0 8px 20px rgba(16, 185, 129, 0.25)",
    //transition: "transform 0.15s ease",
  }}
>
        <div style={{ fontSize: "18px", fontWeight: "600" }}>
          ⚡ Challenge Mode
        </div>
        <div style={{ fontSize: "14px", opacity: 0.9 }}>
          Test yourself under pressure
        </div>
      </button>

      <div className="mt-4 flex w-full items-center justify-between gap-3">
        <label
          htmlFor="focus-weak-toggle"
          className="cursor-pointer text-sm text-gray-600 dark:text-gray-300"
        >
          Focus on weak cards
        </label>
        <button
          id="focus-weak-toggle"
          type="button"
          onClick={() => onFocusWeakCardsChange(!focusWeakCards)}
          aria-pressed={focusWeakCards}
          aria-label="Focus on weak cards toggle"
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-white active:scale-95 dark:focus:ring-offset-gray-900 ${
            focusWeakCards ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
              focusWeakCards ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
      {focusWeakCards ? (
        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          Focusing on cards you need to improve
        </p>
      ) : null}
    </div>
  </div>
);
}