import type { Flashcard } from "@/features/study/types/flashcard";
import type { McqQuestionType } from "@/features/study/utils/getQuestionType";
import { getQuestionType } from "@/features/study/utils/getQuestionType";
import { normalizeOptionFormat } from "@/features/study/utils/normalizeOptionFormat";
import {
  generateDateDistractorStrings,
  parseAnswerDate,
} from "@/features/study/utils/mcqDateDistractors";
import { generateDefinitionDistractors } from "@/features/study/utils/generateDefinitionDistractors";
import { generateAIDistractors } from "@/lib/services/aiDistractorsService";
import type { McqDifficulty } from "@/features/study/utils/mcqDifficulty";

/** Optional Step-1 misconceptions from batch prefetch (Challenge / definition path). */
export type MultipleChoiceGenerationContext = {
  misconceptionsByFlashcardId?: Record<string, string[]>;
  /** Per flashcard; defaults to `"medium"` when missing. */
  difficultyByFlashcardId?: Record<string, McqDifficulty>;
};

export type AnswerType = "percentage" | "number" | "short_text" | "long_text";

/** Fisher–Yates shuffle; returns a new array. */
export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]!;
    a[i] = a[j]!;
    a[j] = t;
  }
  return a;
}

function isSameFlashcard(a: Flashcard, b: Flashcard): boolean {
  if (a.id && b.id) return a.id === b.id;
  return a === b;
}

export function getAnswerType(answer: string): AnswerType {
  const t = answer.trim();
  if (!t) return "short_text";

  if (/%/.test(t)) {
    return "percentage";
  }

  if (/^\s*-?\d+(?:\.\d+)?\s*$/.test(t)) {
    return "number";
  }

  if (t.length > 120 || t.split(/\s+/).filter(Boolean).length > 35) {
    return "long_text";
  }

  return "short_text";
}

function formatPercentLike(correctRaw: string, value: number): string | null {
  if (Number.isNaN(value) || value < 0) return null;
  const decMatch = correctRaw.match(/-?\d+\.(\d+)/);
  const dec = decMatch ? Math.min(decMatch[1]!.length + 1, 4) : 1;
  let s = value.toFixed(dec);
  s = s.replace(/\.?0+$/, "");
  if (s === "-0") s = "0";
  return `${s}%`;
}

/** 1–2 decimal places, no negative %; for close-value distractors. */
function formatPercentClose(value: number): string | null {
  if (Number.isNaN(value) || value < 0) return null;
  let s = value.toFixed(2);
  s = s.replace(/\.?0+$/, "");
  if (s === "-0") s = "0";
  return `${s}%`;
}

function formatPlainNumberLike(correctRaw: string, value: number): string | null {
  if (Number.isNaN(value)) return null;
  if (/^\s*-?\d+\.\d+\s*$/.test(correctRaw.trim())) {
    const dec = correctRaw.trim().split(".")[1]?.length ?? 2;
    return value.toFixed(dec);
  }
  return String(Math.round(value));
}

/** Plausible wrong numeric / percentage strings (excluding the exact correct string). */
function generateProgrammaticNumericDistractors(
  correct: string,
  kind: "percentage" | "number",
  difficulty: McqDifficulty = "medium",
): string[] {
  const trimmed = correct.trim();
  const out = new Set<string>();

  if (kind === "percentage") {
    const m = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*%?\s*$/);
    if (!m) return [];
    const v = parseFloat(m[1]!);
    if (Number.isNaN(v)) return [];

    if (difficulty === "easy") {
      const candidates = [
        v * 0.5,
        v * 1.5,
        v * 0.65,
        v * 1.35,
        v + Math.max(3, v * 0.35),
        v - Math.min(v * 0.3, v * 0.9),
      ];
      for (const nv of candidates) {
        if (nv < 0) continue;
        const s = formatPercentClose(nv) ?? formatPercentLike(trimmed, nv);
        if (s && s !== trimmed) out.add(s);
      }
      return [...out];
    }

    if (difficulty === "hard") {
      for (const d of [0.25, -0.25, 0.5, -0.5, 0.75, -0.75, 1, -1]) {
        const nv = v + d;
        if (nv < 0) continue;
        const s = formatPercentClose(nv) ?? formatPercentLike(trimmed, nv);
        if (s && s !== trimmed) out.add(s);
      }
      return [...out];
    }

    const offsets = [-1, -0.75, -0.5, -0.25, 0.25, 0.5, 0.75, 1, 1.25];
    for (const d of offsets) {
      const nv = v + d;
      if (nv < 0) continue;
      const s = formatPercentClose(nv) ?? formatPercentLike(trimmed, nv);
      if (s && s !== trimmed) out.add(s);
    }
    return [...out];
  }

  const m = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*$/);
  if (!m) return [];
  const v = parseFloat(m[1]!);
  if (Number.isNaN(v)) return [];

  if (difficulty === "easy") {
    for (const mult of [0.5, 1.5, 2, 10, 0.25]) {
      const s = formatPlainNumberLike(trimmed, v * mult);
      if (s && s !== trimmed) out.add(s);
    }
    const spread = Math.max(5, Math.abs(v) * 0.35);
    for (const d of [spread, -spread, spread * 1.5]) {
      const s = formatPlainNumberLike(trimmed, v + d);
      if (s && s !== trimmed) out.add(s);
    }
    return [...out];
  }

  if (difficulty === "hard") {
    for (const d of [0.25, -0.25, 0.5, -0.5, 0.75, -0.75, 1, -1]) {
      const s = formatPlainNumberLike(trimmed, v + d);
      if (s && s !== trimmed) out.add(s);
    }
    return [...out];
  }

  const offsets = [-5, -3, -2, -1, 1, 2, 3, 5];
  for (const d of offsets) {
    const s = formatPlainNumberLike(trimmed, v + d);
    if (s && s !== trimmed) out.add(s);
  }
  for (const mult of [0.25, 0.5, 2, 10]) {
    const s = formatPlainNumberLike(trimmed, v * mult);
    if (s && s !== trimmed) out.add(s);
  }
  return [...out];
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const k = v.trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

function tokenizeWords(s: string): string[] {
  const m = s.toLowerCase().match(/\b[\w'%]+\b/g);
  return m ?? [];
}

/** Higher score = closer match to the correct answer. */
function distractorSimilarityScore(correct: string, candidate: string): number {
  const a = new Set(tokenizeWords(correct));
  const b = tokenizeWords(candidate);
  let shared = 0;
  for (const w of b) {
    if (a.has(w)) shared += 1;
  }
  const lenDiff = Math.abs(correct.length - candidate.length);
  const wcA = correct.split(/\s+/).filter(Boolean).length;
  const wcB = candidate.split(/\s+/).filter(Boolean).length;
  const wcDiff = Math.abs(wcA - wcB);
  return shared * 20 - lenDiff - wcDiff * 5;
}

function isPlausibleDistractorShape(
  correct: string,
  candidate: string,
  correctType: AnswerType,
): boolean {
  const c = correct.trim();
  const d = candidate.trim();
  if (!d) return false;

  const cHasPct = /%/.test(c);
  const dHasPct = /%/.test(d);
  if (cHasPct !== dHasPct) return false;

  const cHasNum = /\d/.test(c);
  const dHasNum = /\d/.test(d);
  if (cHasNum !== dHasNum) return false;

  const cWords = c.split(/\s+/).filter(Boolean).length;
  const dWords = d.split(/\s+/).filter(Boolean).length;

  if (correctType === "long_text") {
    if (dWords < Math.max(3, cWords - 25)) return false;
    if (dWords > cWords + 40) return false;
  } else {
    if (cWords <= 12 && dWords > cWords + 12) return false;
    if (dWords <= 12 && cWords > dWords + 12) return false;
  }

  const ratio = d.length / Math.max(c.length, 1);
  if (ratio < 0.3 || ratio > 3.5) return false;

  return true;
}

function pickThreeSimilarDistractors(
  pool: string[],
  correct: string,
  correctType: AnswerType,
  difficulty: McqDifficulty = "medium",
): string[] | null {
  const c = correct.trim();
  const sorted = uniqueStrings(pool)
    .filter((p) => p !== c)
    .filter((p) => isPlausibleDistractorShape(c, p, correctType))
    .sort((a, b) => distractorSimilarityScore(c, b) - distractorSimilarityScore(c, a));

  const n = sorted.length;
  if (n < 3) return null;

  if (difficulty === "hard") {
    return sorted.slice(-3);
  }
  if (difficulty === "easy") {
    return sorted.slice(0, 3);
  }
  const start = Math.max(0, Math.floor((n - 3) / 2));
  return sorted.slice(start, start + 3);
}

/** Random pick (legacy path when similarity ranking has too few). */
function pickThreeDistractors(pool: string[], correct: string): string[] | null {
  const c = correct.trim();
  const filtered = uniqueStrings(pool).filter((p) => p !== c);
  if (filtered.length < 3) return null;
  return shuffle(filtered).slice(0, 3);
}

function buildRuleBasedPool(
  correct: string,
  correctType: AnswerType,
  currentFlashcard: Flashcard,
  allFlashcards: Flashcard[],
  difficulty: McqDifficulty = "medium",
): string[] {
  const pool: string[] = [];

  if (correctType === "percentage" || correctType === "number") {
    pool.push(
      ...generateProgrammaticNumericDistractors(
        correct,
        correctType === "percentage" ? "percentage" : "number",
        difficulty,
      ),
    );
  }

  for (const f of allFlashcards) {
    if (isSameFlashcard(f, currentFlashcard)) continue;
    const ans = f.answer?.trim() ?? "";
    if (!ans || ans === correct) continue;
    if (getAnswerType(ans) !== correctType) continue;
    pool.push(ans);
  }

  return uniqueStrings(pool).filter((p) => p !== correct.trim());
}

/** First percentage-like token in the answer (supports long prose). */
function extractPrimaryPercentage(answer: string): { raw: string; value: number } | null {
  const m = answer.match(/(-?\d+(?:\.\d+)?)\s*%/);
  if (!m) return null;
  const value = parseFloat(m[1]!);
  if (Number.isNaN(value)) return null;
  return { raw: m[0]!.trim(), value };
}

/**
 * Percentage in prose: distractor spread scales with difficulty.
 */
function buildPercentageTypeOptions(
  correct: string,
  difficulty: McqDifficulty = "medium",
): string[] | null {
  const ex = extractPrimaryPercentage(correct);
  if (!ex) return null;

  const base = correct.trim();
  const v = ex.value;

  const tryVal = (nv: number): string | null => formatPercentClose(nv);

  let pool: string[] = [];

  if (difficulty === "easy") {
    const wide = [
      tryVal(v * 0.55),
      tryVal(v * 1.45),
      tryVal(v * 0.72),
      tryVal(v + Math.max(4, v * 0.4)),
      tryVal(Math.max(0, v - Math.max(2, v * 0.35))),
    ].filter((s): s is string => Boolean(s && s !== base));
    pool = uniqueStrings(wide);
  } else if (difficulty === "hard") {
    for (const d of [0.25, -0.25, 0.5, -0.5, 0.75, -0.75, 1, -1]) {
      const t = tryVal(v + d);
      if (t && t !== base) pool.push(t);
    }
    pool = uniqueStrings(pool).filter((s) => s !== base);
  } else {
    const primary = [
      tryVal(v - 0.5),
      tryVal(v + 0.5),
      tryVal(v + 0.25),
    ].filter((s): s is string => Boolean(s && s !== base));

    pool = uniqueStrings(primary);

    if (pool.length < 3) {
      const alt = tryVal(v - 0.25);
      if (alt && alt !== base) pool.push(alt);
      pool = uniqueStrings(pool).filter((s) => s !== base);
    }

    if (pool.length < 3) {
      for (const d of [0.1, -0.1, 0.15, -0.15, 0.75, -0.75]) {
        if (pool.length >= 3) break;
        const t = tryVal(v + d);
        if (t && t !== base) pool.push(t);
      }
      pool = uniqueStrings(pool).filter((s) => s !== base);
    }
  }

  if (pool.length < 3) return null;
  return [base, ...pool.slice(0, 3)];
}

async function buildDefinitionTypeOptions(
  currentFlashcard: Flashcard,
  correct: string,
  context?: MultipleChoiceGenerationContext,
  difficulty: McqDifficulty = "medium",
): Promise<string[] | null> {
  const question = currentFlashcard.question?.trim() ?? "";
  const id = currentFlashcard.id?.trim();
  const precomputed =
    id && context?.misconceptionsByFlashcardId?.[id] !== undefined
      ? context.misconceptionsByFlashcardId[id]
      : undefined;

  const distractors = await generateDefinitionDistractors(
    question,
    correct,
    precomputed,
    difficulty,
  );
  if (distractors.length === 3) {
    return [correct.trim(), ...distractors];
  }
  return null;
}

async function buildGeneralTypeOptions(
  currentFlashcard: Flashcard,
  allFlashcards: Flashcard[],
  correct: string,
  difficulty: McqDifficulty = "medium",
): Promise<string[] | null> {
  const correctType = getAnswerType(correct);
  const rulePool = buildRuleBasedPool(
    correct,
    correctType,
    currentFlashcard,
    allFlashcards,
    difficulty,
  );

  if (rulePool.length >= 3) {
    const three = pickThreeSimilarDistractors(
      rulePool,
      correct,
      correctType,
      difficulty,
    );
    if (three) return [correct, ...three];
  }

  let aiClean: string[] = [];
  try {
    aiClean = uniqueStrings(
      await generateAIDistractors(
        currentFlashcard.question?.trim() ?? "",
        correct,
      ),
    ).filter((s) => s !== correct.trim());
  } catch {
    aiClean = [];
  }

  const merged = uniqueStrings([...rulePool, ...aiClean]).filter(
    (s) => s !== correct.trim(),
  );

  if (merged.length < 3) return null;

  const three =
    pickThreeSimilarDistractors(merged, correct, correctType, difficulty) ??
    pickThreeDistractors(merged, correct);
  if (!three) return null;
  return [correct, ...three];
}

function finalizeNormalizedMcqOptions(
  raw: string[],
  qType: McqQuestionType,
): string[] | null {
  if (raw.length !== 4) return null;
  const mapped = raw.map((opt) => {
    const n = normalizeOptionFormat(opt, qType);
    const t = n.trim();
    return t || opt.trim();
  });
  if (mapped.some((x) => !x.trim())) return null;
  if (new Set(mapped).size !== mapped.length) return null;
  return shuffle(mapped);
}

async function generateMultipleChoiceOptionsInner(
  currentFlashcard: Flashcard,
  allFlashcards: Flashcard[],
  qType: McqQuestionType,
  context?: MultipleChoiceGenerationContext,
): Promise<string[] | null> {
  const correct = currentFlashcard.answer?.trim() ?? "";
  if (!correct) return null;

  const fid = currentFlashcard.id?.trim() ?? "";
  const rawDiff = fid ? context?.difficultyByFlashcardId?.[fid] : undefined;
  const difficulty: McqDifficulty =
    rawDiff === "easy" || rawDiff === "medium" || rawDiff === "hard"
      ? rawDiff
      : "medium";

  if (qType === "date") {
    const parsed = parseAnswerDate(correct);
    if (parsed) {
      const three = generateDateDistractorStrings(parsed, correct, difficulty);
      if (three && three.length >= 3) {
        return [correct, ...three];
      }
    }
  }

  if (qType === "percentage") {
    const pct = buildPercentageTypeOptions(correct, difficulty);
    if (pct) return pct;
  }

  if (qType === "definition") {
    const def = await buildDefinitionTypeOptions(
      currentFlashcard,
      correct,
      context,
      difficulty,
    );
    if (def) return def;
  }

  return buildGeneralTypeOptions(
    currentFlashcard,
    allFlashcards,
    correct,
    difficulty,
  );
}

/**
 * Question-type-aware distractors (date / percentage / definition / general).
 * Options are normalized for uniform formatting, deduped, then shuffled.
 * Returns exactly four options or null.
 */
export async function generateMultipleChoiceOptions(
  currentFlashcard: Flashcard,
  allFlashcards: Flashcard[],
  context?: MultipleChoiceGenerationContext,
): Promise<string[] | null> {
  const correct = currentFlashcard.answer?.trim() ?? "";
  if (!correct) return null;

  const qType = getQuestionType(currentFlashcard.question ?? "");

  for (let attempt = 0; attempt < 3; attempt++) {
    const raw = await generateMultipleChoiceOptionsInner(
      currentFlashcard,
      allFlashcards,
      qType,
      context,
    );
    if (!raw) return null;
    const finalized = finalizeNormalizedMcqOptions(raw, qType);
    if (finalized) return finalized;
  }

  return null;
}
