import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { logStatsUsage } from "@/lib/debugStatsUsage";

const WEAKNESS_THRESHOLD = 1;

const COLLECTION = "user_card_stats";

export function userCardStatDocId(userId: string, cardId: string): string {
  return `${userId.trim()}_${cardId.trim()}`;
}

export type UserCardStatDoc = {
  userId: string;
  cardId: string;
  incorrectCount: number;
  hintCount: number;
  correctCount: number;
  lastSeen: unknown;
};

export type WeakCardEntry = {
  cardId: string;
  weaknessScore: number;
  incorrectCount: number;
  hintCount: number;
  correctCount: number;
};

export async function updateCardStats({
  userId,
  cardId,
  isCorrect,
  usedHint,
  debugContext = "user_card_stats|updateCardStats",
}: {
  userId: string;
  cardId: string;
  isCorrect: boolean;
  usedHint: boolean;
  /** Feature tag for logs, e.g. "ChallengeMode|Challenge|answer". */
  debugContext?: string;
}): Promise<void> {
  try {
    const uid = userId.trim();
    const cid = cardId.trim();
    if (!uid || !cid) return;

    const ref = doc(db, COLLECTION, userCardStatDocId(uid, cid));
    const snap = await getDoc(ref);
    const prev = snap.exists() ? (snap.data() as Record<string, unknown>) : null;

    logStatsUsage("READ", COLLECTION, debugContext, {
      op: "getDoc",
      docId: userCardStatDocId(uid, cid),
      exists: snap.exists(),
      prev: prev
        ? {
            incorrectCount: prev.incorrectCount,
            correctCount: prev.correctCount,
            hintCount: prev.hintCount,
          }
        : null,
    });

    const incorrectCount =
      (typeof prev?.incorrectCount === "number" ? prev.incorrectCount : 0) +
      (isCorrect ? 0 : 1);
    const correctCount =
      (typeof prev?.correctCount === "number" ? prev.correctCount : 0) +
      (isCorrect ? 1 : 0);
    const hintCount =
      (typeof prev?.hintCount === "number" ? prev.hintCount : 0) + (usedHint ? 1 : 0);
    const previousStreak =
      typeof prev?.streak === "number" ? prev.streak : 0;
    const lastResult = isCorrect ? "correct" : "incorrect";
    const streak = lastResult === "correct" ? previousStreak + 1 : 0;

    const writePayload = {
      userId: uid,
      cardId: cid,
      incorrectCount,
      correctCount,
      hintCount,
      lastResult,
      streak,
      lastSeen: "[serverTimestamp]",
    };
    console.log("[user_card_stats WRITE]", {
      cardId: cid,
      lastResult,
      streak,
    });
    logStatsUsage("WRITE", COLLECTION, debugContext, {
      op: "setDoc(merge)",
      userId: uid,
      cardId: cid,
      data: writePayload,
    });

    await setDoc(
      ref,
      {
        userId: uid,
        cardId: cid,
        incorrectCount,
        correctCount,
        hintCount,
        lastResult,
        streak,
        lastSeen: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (err) {
    console.error("[user_card_stats] updateCardStats failed", err);
  }
}

export async function getWeakCards(
  userId: string,
  debugContext = "user_card_stats|getWeakCards",
): Promise<WeakCardEntry[]> {
  try {
    const uid = userId.trim();
    if (!uid) return [];

    const q = query(collection(db, COLLECTION), where("userId", "==", uid));
    const snap = await getDocs(q);

    const rows: WeakCardEntry[] = [];
    const docIdPrefix = `${uid}_`;
    snap.forEach((docSnap) => {
      const d = docSnap.data() as Record<string, unknown>;
      let cardId =
        typeof d.cardId === "string" ? d.cardId.trim() : "";
      if (!cardId && docSnap.id.startsWith(docIdPrefix)) {
        cardId = docSnap.id.slice(docIdPrefix.length).trim();
      }
      if (!cardId) return;
      const incorrectCount =
        typeof d.incorrectCount === "number" ? d.incorrectCount : 0;
      const hintCount = typeof d.hintCount === "number" ? d.hintCount : 0;
      const correctCount = typeof d.correctCount === "number" ? d.correctCount : 0;

      // --- NEW STATE-BASED WEAKNESS CALCULATION ---
      const lastResult =
        typeof d.lastResult === "string" ? d.lastResult : null;

      const streak =
        typeof d.streak === "number" ? d.streak : 0;

      // time decay (hours since last seen -> scaled to days)
      let timeDecay = 0;
      if (d.lastSeen) {
        const lastSeenDate =
          typeof (d.lastSeen as { toDate?: () => Date }).toDate === "function"
            ? (d.lastSeen as { toDate: () => Date }).toDate()
            : new Date(d.lastSeen as string | number | Date);

        const hoursSince =
          (Date.now() - lastSeenDate.getTime()) / (1000 * 60 * 60);

        timeDecay = hoursSince / 24;
      }

      const weaknessScore =
        (lastResult === "incorrect" ? 3 : 0) +
        incorrectCount * 1 +
        hintCount * 1.5 -
        streak * 2 +
        timeDecay;

      // --- DEBUG LOG ---
      console.log("Weakness calc:", {
        cardId,
        lastResult,
        incorrectCount,
        hintCount,
        streak,
        timeDecay: Number(timeDecay.toFixed(2)),
        weaknessScore: Number(weaknessScore.toFixed(2)),
      });
      rows.push({
        cardId,
        weaknessScore,
        incorrectCount,
        hintCount,
        correctCount,
      });
    });

    rows.sort((a, b) => b.weaknessScore - a.weaknessScore);

    console.log("WeakCards RAW:", rows);

    const filtered = rows.filter(
      (row) => row.weaknessScore >= WEAKNESS_THRESHOLD,
    );
    console.log("Filtered weak cards:", filtered);

    let result: WeakCardEntry[];
    if (filtered.length === 0) {
      console.log(
        "No cards passed threshold, returning top weakest cards instead",
      );
      result = rows.slice(0, Math.min(3, rows.length));
    } else {
      result = filtered;
    }

    logStatsUsage("READ", COLLECTION, debugContext, {
      op: "getDocs+query(userId==)",
      userId: uid,
      docCount: snap.size,
      results: result,
    });

    return result;
  } catch (err) {
    console.error("[user_card_stats] getWeakCards failed", err);
    return [];
  }
}
