"use client";

export default function ModeSelection({
  onSelectFlashcards,
  onSelectChallenge,
}: {
  onSelectFlashcards: () => void;
  onSelectChallenge: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 text-center">
      <h1 className="text-2xl font-bold mb-6">
        Choose how you want to study
      </h1>

      <div className="w-full max-w-md space-y-4">
        <button
          onClick={onSelectFlashcards}
          className="w-full p-5 rounded-2xl shadow-md border bg-white active:scale-95 transition"
        >
          <div className="text-lg font-semibold">📚 Flashcards</div>
          <div className="text-sm text-gray-500">
            Review key ideas with swipe
          </div>
        </button>

        <button
          onClick={onSelectChallenge}
          className="w-full p-5 rounded-2xl shadow-md border bg-white active:scale-95 transition"
        >
          <div className="text-lg font-semibold">⚡ Challenge Mode</div>
          <div className="text-sm text-gray-500">
            Test yourself under pressure
          </div>
        </button>
      </div>
    </div>
  );
}