import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  SaveUserFlashcardStatInput,
  UserFlashcardStatDoc,
} from "@/features/study/types/userFlashcardStat";

const COLLECTION = "user_flashcard_stats";

/** Composite document ID: one stat row per user per flashcard. */
export function userFlashcardStatDocId(
  userId: string,
  flashcardId: string,
): string {
  return `${userId.trim()}_${flashcardId.trim()}`;
}

function parseLastResult(
  v: unknown,
): "correct" | "incorrect" | null {
  if (v === "correct" || v === "incorrect") return v;
  return null;
}

/**
 * Fetch a single stat document. Returns null if missing or invalid ids.
 */
export async function getUserFlashcardStat(
  userId: string,
  flashcardId: string,
): Promise<UserFlashcardStatDoc | null> {
  const uid = userId.trim();
  const fid = flashcardId.trim();
  if (!uid || !fid) return null;

  const ref = doc(db, COLLECTION, userFlashcardStatDocId(uid, fid));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const d = snap.data() as Record<string, unknown>;
  const lastResult = parseLastResult(d.lastResult);

  return {
    userId: typeof d.userId === "string" ? d.userId : uid,
    flashcardId: typeof d.flashcardId === "string" ? d.flashcardId : fid,
    correctCount: typeof d.correctCount === "number" ? d.correctCount : 0,
    incorrectCount: typeof d.incorrectCount === "number" ? d.incorrectCount : 0,
    streak: typeof d.streak === "number" ? d.streak : 0,
    lastResult: lastResult ?? "incorrect",
    lastSeenAt: d.lastSeenAt,
  };
}

/**
 * Create or update a stat document (merge). Uses server time for `lastSeenAt` when omitted.
 */
export async function saveUserFlashcardStat(
  stat: SaveUserFlashcardStatInput,
): Promise<void> {
  const uid = stat.userId?.trim();
  const fid = stat.flashcardId?.trim();
  if (!uid || !fid) {
    console.warn("saveUserFlashcardStat: missing userId or flashcardId");
    return;
  }

  const ref = doc(db, COLLECTION, userFlashcardStatDocId(uid, fid));
  await setDoc(
    ref,
    {
      userId: uid,
      flashcardId: fid,
      correctCount: stat.correctCount,
      incorrectCount: stat.incorrectCount,
      streak: stat.streak,
      lastResult: stat.lastResult,
      lastSeenAt: stat.lastSeenAt ?? serverTimestamp(),
    },
    { merge: true },
  );
}
