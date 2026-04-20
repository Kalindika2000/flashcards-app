import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { SaveChallengeSessionInput } from "@/features/challengeSessions/types/challengeSession";

const COLLECTION = "challenge_sessions";

/**
 * Inserts one completed challenge session (call once at end of run only).
 * Does not touch flashcards or stats.
 */
export async function saveChallengeSession(
  input: SaveChallengeSessionInput,
): Promise<void> {
  const uid = input.userId?.trim();
  if (!uid) {
    console.warn("saveChallengeSession: missing userId, skipping");
    return;
  }

  const noteId = input.noteId?.trim();
  if (!noteId) {
    console.warn("saveChallengeSession: missing noteId, skipping");
    return;
  }

  await addDoc(collection(db, COLLECTION), {
    userId: uid,
    noteId,
    mode: input.mode,
    score: input.score,
    correctCount: input.correctCount,
    totalQuestions: input.totalQuestions,
    createdAt: serverTimestamp(),
  });
}
