import type { FlashcardStatsMode } from "@/features/study/types/userFlashcardStat";
import {
  getUserFlashcardStat,
  saveUserFlashcardStat,
} from "@/lib/repositories/userFlashcardStatsRepository";

export { getUserFlashcardStat } from "@/lib/repositories/userFlashcardStatsRepository";
export { saveUserFlashcardStat } from "@/lib/repositories/userFlashcardStatsRepository";

type UpdateFlashcardStatsInput = {
  userId: string;
  flashcardId: string;
  isCorrect: boolean;
  mode: FlashcardStatsMode;
  /** Passed through to Firestore read/write tracing (e.g. "FlashcardMode|markCard"). */
  debugContext?: string;
};

/**
 * Updates weighted correct/incorrect counts and streak for a flashcard.
 * Challenge answers count half vs study. Errors are logged; does not throw.
 */
export async function updateFlashcardStats(
  input: UpdateFlashcardStatsInput,
): Promise<void> {
  const userId = input.userId?.trim();
  const flashcardId = input.flashcardId?.trim();
  if (!userId || !flashcardId) return;

  try {
    const weight = input.mode === "study" ? 1 : 0.5;
    const ctx =
      input.debugContext ??
      `user_flashcard_stats|updateFlashcardStats|mode:${input.mode}`;

    const existing = await getUserFlashcardStat(userId, flashcardId, ctx);

    let correctCount = existing?.correctCount ?? 0;
    let incorrectCount = existing?.incorrectCount ?? 0;
    let streak = existing?.streak ?? 0;

    if (input.isCorrect) {
      correctCount += weight;
      streak += 1;
    } else {
      incorrectCount += weight;
      streak = 0;
    }

    await saveUserFlashcardStat(
      {
        userId,
        flashcardId,
        correctCount,
        incorrectCount,
        streak,
        lastResult: input.isCorrect ? "correct" : "incorrect",
      },
      ctx,
    );
  } catch (e) {
    console.warn("[updateFlashcardStats] failed", e);
  }
}
