import type { Flashcard } from "@/features/study/types/flashcard";
import { shuffle } from "@/features/study/utils/generateMultipleChoiceOptions";
import { getUserFlashcardStat } from "@/lib/repositories/userFlashcardStatsRepository";

export type FlashcardWithConfidence = Flashcard & {
  confidence: number;
  /** `lastSeenAt` from stats as epoch ms, or `null` if never recorded. */
  lastSeenAt: number | null;
};

/** Session length cap for Challenge question generation. */
export const CHALLENGE_SESSION_SIZE = 10;

/** Weighted slots vs random slots (~70% / ~30%) for variety. */
const PRIORITY_SLOT_COUNT = 7;
const RANDOM_SLOT_COUNT = 3;

export function computeConfidence(
  correctCount: number,
  incorrectCount: number,
): number {
  const total = correctCount + incorrectCount;
  return total === 0 ? 0.5 : correctCount / total;
}

/** Normalize Firestore Timestamp / Date / number to epoch ms, or `null`. */
export function lastSeenAtToMilliseconds(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (raw instanceof Date) return raw.getTime();
  if (typeof raw === "object") {
    const o = raw as { toMillis?: () => number; seconds?: number; nanoseconds?: number };
    if (typeof o.toMillis === "function") {
      const ms = o.toMillis();
      return Number.isFinite(ms) ? ms : null;
    }
    if (typeof o.seconds === "number") {
      const ns = typeof o.nanoseconds === "number" ? o.nanoseconds : 0;
      return o.seconds * 1000 + Math.floor(ns / 1e6);
    }
  }
  return null;
}

/**
 * Down-weights very recently studied cards; never-seen gets full weight.
 */
export function getRecencyFactor(lastSeenAt: number | null): number {
  const now = Date.now();

  if (lastSeenAt == null) {
    return 1.0;
  }

  const minutesSinceSeen = (now - lastSeenAt) / (1000 * 60);

  if (minutesSinceSeen < 5) {
    return 0.2;
  }
  if (minutesSinceSeen < 30) {
    return 0.5;
  }
  if (minutesSinceSeen < 120) {
    return 0.8;
  }
  return 1.0;
}

/**
 * Loads per-card stats and attaches `confidence` and `lastSeenAt` (ms or null).
 */
export async function attachStats(
  flashcards: Flashcard[],
  userId: string | null | undefined,
): Promise<FlashcardWithConfidence[]> {
  const uid = userId?.trim();

  return Promise.all(
    flashcards.map(async (card) => {
      const id = card.id?.trim();
      if (!id || !uid) {
        return {
          ...card,
          confidence: computeConfidence(0, 0),
          lastSeenAt: null,
        };
      }
      const stat = await getUserFlashcardStat(uid, id);
      if (!stat) {
        return {
          ...card,
          confidence: computeConfidence(0, 0),
          lastSeenAt: null,
        };
      }
      const lastSeenAtMs = lastSeenAtToMilliseconds(stat.lastSeenAt);
      return {
        ...card,
        confidence: computeConfidence(stat.correctCount, stat.incorrectCount),
        lastSeenAt: lastSeenAtMs,
      };
    }),
  );
}

/**
 * Lower confidence and less recent exposure → higher expected score (stochastic).
 */
export function weightedShuffle(
  cards: FlashcardWithConfidence[],
): FlashcardWithConfidence[] {
  return cards
    .map((card) => {
      const confidenceWeight = 1 - card.confidence;
      const recencyWeight = getRecencyFactor(card.lastSeenAt);
      const combinedWeight = Math.max(0.05, confidenceWeight * recencyWeight);
      return {
        card,
        score: Math.random() * combinedWeight,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => item.card);
}

function dedupeKey(card: Flashcard): string {
  const id = card.id?.trim();
  if (id) return `id:${id}`;
  return `na:${card.question?.trim() ?? ""}\0${card.answer?.trim() ?? ""}`;
}

/**
 * First occurrence of each flashcard id in list order (skips entries without `id`).
 */
export function dedupeByFlashcardId(
  cards: FlashcardWithConfidence[],
): FlashcardWithConfidence[] {
  const seen = new Set<string>();
  const result: FlashcardWithConfidence[] = [];
  for (const card of cards) {
    const id = card.id?.trim();
    if (!id) continue;
    if (!seen.has(id)) {
      seen.add(id);
      result.push(card);
    }
  }
  return result;
}

/**
 * Session dedupe: id-first pass (per {@link dedupeByFlashcardId}), then append unique
 * cards without id (or missed) in original `combined` order using {@link dedupeKey}.
 */
function dedupeCombinedSessionOrder(
  combined: FlashcardWithConfidence[],
): FlashcardWithConfidence[] {
  const idDeduped = dedupeByFlashcardId(combined);
  const seen = new Set(idDeduped.map((c) => dedupeKey(c)));
  const out = [...idDeduped];
  for (const c of combined) {
    const k = dedupeKey(c);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
}

function fillToCap(
  deduped: FlashcardWithConfidence[],
  seen: Set<string>,
  cap: number,
  weightedPool: FlashcardWithConfidence[],
  allCards: FlashcardWithConfidence[],
): FlashcardWithConfidence[] {
  const out = [...deduped];
  while (out.length < cap) {
    let added = false;
    for (const card of weightedPool) {
      if (out.length >= cap) break;
      const k = dedupeKey(card);
      if (seen.has(k)) continue;
      out.push(card);
      seen.add(k);
      added = true;
    }
    if (out.length >= cap) break;
    for (const card of shuffle([...allCards])) {
      if (out.length >= cap) break;
      const k = dedupeKey(card);
      if (seen.has(k)) continue;
      out.push(card);
      seen.add(k);
      added = true;
    }
    if (!added) break;
  }
  return out.slice(0, cap);
}

/**
 * Up to {@link CHALLENGE_SESSION_SIZE} cards: mostly weakness-weighted, plus random variety.
 * With `focusWeakCards` and `cap < n`, uses ~85% weighted (weak/recency) and ~15% random slots.
 * If every card already has confidence > 0.8, weak-focus is skipped and the default 70/30 mix
 * applies so sessions stay varied when there is little separation in the deck.
 */
export function selectFlashcardsForChallengeSession(
  flashcardsWithStats: FlashcardWithConfidence[],
  originalOrder: Flashcard[],
  options?: { focusWeakCards?: boolean },
): FlashcardWithConfidence[] {
  const n = originalOrder.length;
  if (n === 0) return [];

  const cap = Math.min(CHALLENGE_SESSION_SIZE, n);
  const prioritized = weightedShuffle([...flashcardsWithStats]);

  if (cap === n) {
    const deduped = dedupeCombinedSessionOrder(prioritized);
    const seen = new Set(deduped.map((c) => dedupeKey(c)));
    return fillToCap(deduped, seen, cap, prioritized, flashcardsWithStats);
  }

  const allHighConfidence = flashcardsWithStats.every((c) => c.confidence > 0.8);
  const useWeakFocusLayout =
    options?.focusWeakCards === true && cap < n && !allHighConfidence;

  let priorityTake: number;
  let randomTarget: number;
  if (useWeakFocusLayout) {
    priorityTake = Math.floor(cap * 0.85);
    randomTarget = cap - priorityTake;
  } else {
    priorityTake = Math.min(PRIORITY_SLOT_COUNT, cap);
    randomTarget = Math.min(RANDOM_SLOT_COUNT, cap - priorityTake);
  }

  const priorityPick = prioritized.slice(0, priorityTake);

  const chosenKeys = new Set(priorityPick.map(dedupeKey));
  const randomPick: FlashcardWithConfidence[] = [];

  if (randomTarget > 0) {
    const pool = shuffle([...flashcardsWithStats]);
    for (const c of pool) {
      if (randomPick.length >= randomTarget) break;
      const k = dedupeKey(c);
      if (chosenKeys.has(k)) continue;
      randomPick.push(c);
      chosenKeys.add(k);
    }
  }

  const combined = [...priorityPick, ...randomPick];
  const deduped = dedupeCombinedSessionOrder(combined);
  const seen = new Set(deduped.map((c) => dedupeKey(c)));

  return fillToCap(deduped, seen, cap, prioritized, flashcardsWithStats);
}

export function stripConfidence(card: FlashcardWithConfidence): Flashcard {
  const { confidence: _c, lastSeenAt: _l, ...rest } = card;
  return rest;
}
