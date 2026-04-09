"use client";

export default function TopSwitch({
  mode,
  setMode,
}: {
  mode: "flashcards" | "challenge";
  setMode: (mode: "flashcards" | "challenge") => void;
}) {
  return (
    <div className="flex justify-center mb-4">
      <div className="flex bg-gray-200 rounded-full p-1">
        <button
          onClick={() => setMode("flashcards")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
            mode === "flashcards"
              ? "bg-white shadow"
              : "text-gray-600"
          }`}
        >
          Flashcards
        </button>

        <button
          onClick={() => setMode("challenge")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
            mode === "challenge"
              ? "bg-white shadow"
              : "text-gray-600"
          }`}
        >
          Challenge
        </button>
      </div>
    </div>
  );
}