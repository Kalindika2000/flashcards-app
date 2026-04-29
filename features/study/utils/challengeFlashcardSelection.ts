import type { Flashcard } from "@/features/study/types/flashcard";
import { shuffle } from "@/features/study/utils/generateMultipleChoiceOptions";
import { getUserFlashcardStat } from "@/lib/repositories/userFlashcardStatsRepository";
import type { WeakCardEntry } from "@/lib/userCardStats";

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

function difficultyWeight(level: Flashcard["difficulty"]): number {
  const difficultyWeightMap: Record<"easy" | "medium" | "hard", number> = {
    easy: 1,
    medium: 2,
    hard: 3,
  };
  if (level === "easy" || level === "medium" || level === "hard") {
    return difficultyWeightMap[level];
  }
  return 2;
}

export function computeConfidence(
  correctCount: number,
  incorrectCount: number,
): number {
  const total = correctCount + incorrectCount;
  return total === 0 ? 0.5 : correctCount / total;
}

export function isWeakFromStats(stat?: {
  correctCount?: number;
  incorrectCount?: number;
}): boolean {
  if (!stat) return true;

  const correct = stat.correctCount ?? 0;
  const incorrect = stat.incorrectCount ?? 0;
  const total = correct + incorrect;

  if (total === 0) return true;

  const confidence = correct / total;
  return confidence < 0.7;
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

/** Recency bucket score: recent cards are deprioritized, unseen cards get max. */
export function getRecencyScore(lastSeenAt: number | null): number {
  const now = Date.now();
  let recencyScore = 3; // Missing/never-seen -> high priority.
  if (lastSeenAt != null) {
    const diffMs = now - new Date(lastSeenAt).getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays < 0.5) recencyScore = 0;
    else if (diffDays < 1) recencyScore = 1;
    else if (diffDays < 3) recencyScore = 2;
    else recencyScore = 3;
  }
  return recencyScore;
}

function getDecayMultiplier(lastReviewedAt?: string): number {
  if (!lastReviewedAt) return 1;
  const last = new Date(lastReviewedAt).getTime();
  if (!Number.isFinite(last)) return 1;
  const now = Date.now();
  const diffDays = (now - last) / (1000 * 60 * 60 * 24);
  return Math.pow(0.9, diffDays);
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
      const stat = await getUserFlashcardStat(
        uid,
        id,
        "ChallengeMode|attachStats|user_flashcard_stats",
      );
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

export function weightedShuffle(
  cards: FlashcardWithConfidence[],
): FlashcardWithConfidence[] {
  const ranked = cards
    .map((card) => {
      const weaknessScoreRaw = (card as { weaknessScore?: unknown }).weaknessScore;
      const weaknessScore =
        typeof weaknessScoreRaw === "number" && Number.isFinite(weaknessScoreRaw)
          ? weaknessScoreRaw
          : (1 - card.confidence) * 3;
      const reviewedAt =
        card.lastReviewedAt ??
        (card.lastSeenAt != null ? new Date(card.lastSeenAt).toISOString() : undefined);
      const decayMultiplier = getDecayMultiplier(reviewedAt);
      const adjustedWeakness = weaknessScore * decayMultiplier;
      const recencyScore = getRecencyScore(card.lastSeenAt);
      const difficultyWeightValue = difficultyWeight(card.difficulty);
      const priorityScore =
        adjustedWeakness * 0.6 + difficultyWeightValue * 0.25 + recencyScore * 0.15;
      return { card, priorityScore };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);

  // Optional variety: shuffle a high-priority window, then keep remaining order.
  const topWindowSize = Math.min(ranked.length, CHALLENGE_SESSION_SIZE * 2);
  const topWindow = shuffle(ranked.slice(0, topWindowSize).map((x) => x.card));
  const rest = ranked.slice(topWindowSize).map((x) => x.card);
  return [...topWindow, ...rest];
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

/**
 * Resolves weak stats rows to in-deck flashcards (weakness order preserved, ids deduped).
 */
function buildWeakOrderedInDeck<T extends Flashcard>(
  allCards: T[],
  weakSorted: WeakCardEntry[],
): T[] {
  const weakOrderedRaw = weakSorted
    .map((stat) => {
      const statId = stat.cardId.trim();
      if (!statId) return null;

      let match = allCards.find((c) => c.id?.trim() === statId);
      if (match) return match;

      const lower = statId.toLowerCase();
      match = allCards.find(
        (c) => (c.id?.trim() ?? "").toLowerCase() === lower,
      );
      if (match) return match;

      console.warn("Could not resolve weak card:", statId);
      return null;
    })
    .filter((c): c is T => c != null);

  const seenCanon = new Set<string>();
  const weakOrderedInDeck: T[] = [];
  for (const card of weakOrderedRaw) {
    const canon = card.id?.trim();
    if (!canon || seenCanon.has(canon)) continue;
    seenCanon.add(canon);
    weakOrderedInDeck.push(card);
  }
  console.log(
    "weakOrderedInDeck length:",
    weakOrderedInDeck.length,
  );

  console.log(
    "allCards length:",
    allCards.length,
  );

  console.log(
    "weakOrderedInDeck IDs:",
    weakOrderedInDeck.map((c) => c.id),
  );

  console.log(
    "allCards IDs:",
    allCards.map((c) => c.id),
  );
  console.log("Weak ordering executed in selection util");
  return weakOrderedInDeck;
}

export { buildWeakOrderedInDeck };

/**
 * Picks up to `cap` cards using persistent weak stats: ~70% from cards whose ids appear
 * in `weakSorted` (highest weakness first), the rest from others; fills shortfalls from
 * the non-weak pool; final order is shuffled. Returns `null` when there is no applicable
 * weak signal for this deck (caller should fall back to default selection).
 */
export function pickFlashcardsWithPersistentWeakPreference<T extends Flashcard>(
  allCards: T[],
  weakSorted: WeakCardEntry[],
  cap: number,
): T[] | null {
  if (allCards.length === 0 || cap <= 0) {
    return [];
  }
  if (!weakSorted.length) {
    return null;
  }

  const n = allCards.length;
  const effectiveCap = Math.min(cap, n);

  const weakOrderedInDeck = buildWeakOrderedInDeck(allCards, weakSorted);

  weakSorted.forEach((stat) => {
    const match = allCards.find((c) => c.id === stat.cardId);
    console.log("Resolving:", stat.cardId, "→", match);
  });

  console.log("weakOrderedInDeck:", weakOrderedInDeck);

  /** Stat id + flashcard id so normal pool excludes all matched weak cards. */
  const weakIdSet = new Set<string>();
  for (const w of weakSorted) {
    const sid = w.cardId.trim();
    if (sid) weakIdSet.add(sid);
  }
  for (const card of weakOrderedInDeck) {
    const cid = card.id?.trim();
    if (cid) weakIdSet.add(cid);
  }

  console.log(
    "[WeakCards] weak card IDs (stats):",
    weakSorted.map((c) => c.cardId.trim()).filter(Boolean),
  );
  console.log(
    "[WeakCards] all flashcard IDs:",
    allCards.map((c) => c.id?.trim() ?? ""),
  );
  console.log("[WeakCards] matched weak flashcards:", weakOrderedInDeck);

  if (weakSorted.length > 0 && weakOrderedInDeck.length === 0) {
    console.warn("Weak cards exist but none could be resolved");
  }

  const weakFlashcards = shuffle([...weakOrderedInDeck]);
  weakFlashcards.sort(
    (a, b) => difficultyWeight(b.difficulty) - difficultyWeight(a.difficulty),
  );
  const normalFlashcards = shuffle(
    allCards.filter((c) => {
      const id = c.id?.trim();
      return !id || !weakIdSet.has(id);
    }),
  );

  const weakCount = Math.ceil(effectiveCap * 0.7);
  const normalCount = effectiveCap - weakCount;

  const fromWeak = weakFlashcards.slice(0, weakCount);
  const shortfall = weakCount - fromWeak.length;
  const fromNormal = normalFlashcards.slice(0, normalCount + shortfall);

  let selected = [...fromWeak, ...fromNormal];
  const seenKeys = new Set(selected.map((c) => dedupeKey(c)));

  for (const c of shuffle([...allCards])) {
    if (selected.length >= effectiveCap) break;
    const k = dedupeKey(c);
    if (seenKeys.has(k)) continue;
    selected.push(c);
    seenKeys.add(k);
  }

  if (selected.length > effectiveCap) {
    selected = selected.slice(0, effectiveCap);
  }

  return shuffle(selected);
}

/** Maps a weak-prioritized card list back to indices into the original `cards` array. */
export function orderFlashcardIndicesByWeakStats(
  cards: Flashcard[],
  weakSorted: WeakCardEntry[],
): number[] | null {
  const picked = pickFlashcardsWithPersistentWeakPreference(
    cards,
    weakSorted,
    cards.length,
  );
  if (!picked) {
    return null;
  }
  const used = new Set<number>();
  const indices: number[] = [];
  for (const p of picked) {
    const idx = cards.findIndex((c, i) => !used.has(i) && c === p);
    if (idx >= 0) {
      used.add(idx);
      indices.push(idx);
    }
  }
  for (let i = 0; i < cards.length; i++) {
    if (!used.has(i)) {
      indices.push(i);
    }
  }
  return indices;
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
 * Persistent weak focus (toggle) is handled in {@link generateChallengeQuestions} via
 * {@link pickFlashcardsWithPersistentWeakPreference}; this path stays the default mix.
 */
export function selectFlashcardsForChallengeSession(
  flashcardsWithStats: FlashcardWithConfidence[],
  originalOrder: Flashcard[],
  _options?: { focusWeakCards?: boolean },
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

  const priorityTake = Math.min(PRIORITY_SLOT_COUNT, cap);
  const randomTarget = Math.min(RANDOM_SLOT_COUNT, cap - priorityTake);

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
