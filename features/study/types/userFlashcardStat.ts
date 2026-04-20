/**
 * Firestore collection: `user_flashcard_stats`
 *
 * Document ID: `{userId}_{flashcardId}` (composite, one row per user per card).
 *
 * Fields:
 * - userId, flashcardId
 * - correctCount, incorrectCount, streak
 * - lastResult: "correct" | "incorrect"
 * - lastSeenAt: server timestamp
 */
export type UserFlashcardStatDoc = {
  userId: string;
  flashcardId: string;
  correctCount: number;
  incorrectCount: number;
  streak: number;
  lastResult: "correct" | "incorrect";
  /** Firestore `Timestamp`; may be absent on legacy reads. */
  lastSeenAt?: unknown;
};

/** Payload for create/update via {@link saveUserFlashcardStat}. */
export type SaveUserFlashcardStatInput = {
  userId: string;
  flashcardId: string;
  correctCount: number;
  incorrectCount: number;
  streak: number;
  lastResult: "correct" | "incorrect";
  /** Omit to use `serverTimestamp()` on write. */
  lastSeenAt?: unknown;
};

export type FlashcardStatsMode = "study" | "challenge";
