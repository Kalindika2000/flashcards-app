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
    </div>
  </div>
);
}