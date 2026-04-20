import type { Flashcard } from "@/features/study/types/flashcard";
import type { UserFlashcardStatDoc } from "@/features/study/types/userFlashcardStat";
import { getUserFlashcardStat } from "@/lib/repositories/userFlashcardStatsRepository";

/** Distractor closeness for Challenge MCQ generation. */
export type McqDifficulty = "easy" | "medium" | "hard";

/** Confidence in [0, 1] from historical performance (no stat → 0.5). */
export function confidenceFromUserFlashcardStat(
  stat: UserFlashcardStatDoc | null,
): number {
  if (!stat) return 0.5;
  const c = stat.correctCount ?? 0;
  const w = stat.incorrectCount ?? 0;
  const t = c + w;
  if (t < 1e-6) return 0.5;
  return Math.min(1, Math.max(0, c / t));
}

/**
 * High confidence → harder distractors (tight); low → easier (wide).
 */
export function getDifficultyFromConfidence(confidence: number): McqDifficulty {
  const x = Math.min(1, Math.max(0, confidence));
  if (x <= 0.35) return "easy";
  if (x >= 0.75) return "hard";
  return "medium";
}

/**
 * Per-flashcard difficulty for Challenge MCQ (medium when unsigned or no id).
 */
export async function buildDifficultyByFlashcardId(
  flashcards: Flashcard[],
  userId: string | null | undefined,
): Promise<Record<string, McqDifficulty>> {
  const out: Record<string, McqDifficulty> = {};
  const uid = userId?.trim();
  const withIds = flashcards.filter(
    (c): c is Flashcard & { id: string } => Boolean(c.id?.trim()),
  );

  await Promise.all(
    withIds.map(async (c) => {
      const id = c.id;
      if (!uid) {
        out[id] = "medium";
        return;
      }
      const stat = await getUserFlashcardStat(uid, id);
      const conf = confidenceFromUserFlashcardStat(stat);
      out[id] = getDifficultyFromConfidence(conf);
    }),
  );

  return out;
}
