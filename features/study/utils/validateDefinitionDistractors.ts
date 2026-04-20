const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "are",
  "but",
  "not",
  "you",
  "all",
  "can",
  "her",
  "was",
  "one",
  "our",
  "out",
  "day",
  "get",
  "has",
  "him",
  "his",
  "how",
  "its",
  "may",
  "new",
  "now",
  "old",
  "see",
  "two",
  "who",
  "way",
  "use",
  "any",
]);

function wordTokens(s: string): string[] {
  return (s.toLowerCase().match(/\b\w+\b/g) ?? []).filter(Boolean);
}

function meaningfulTokens(s: string): string[] {
  const m = s.toLowerCase().match(/\b[a-z][a-z'-]{2,}\b/g);
  return (m ?? []).filter((w) => !STOP_WORDS.has(w));
}

/** Shared keyword overlap: at least 1–2 meaningful tokens vs correct (stricter when correct is long). */
function hasConceptOverlap(correct: string, distractor: string): boolean {
  const cTok = meaningfulTokens(correct);
  const dTok = meaningfulTokens(distractor);
  if (cTok.length === 0) return distractor.trim().length >= 4;
  const cSet = new Set(cTok);
  let overlap = 0;
  for (const w of dTok) {
    if (cSet.has(w)) overlap += 1;
  }
  const need = cTok.length >= 4 ? 2 : 1;
  return overlap >= need;
}

function lcsLength(a: string[], b: string[]): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array.from({ length: n + 1 }, () => 0),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i]![j]! = dp[i - 1]![j - 1]! + 1;
      } else {
        dp[i]![j]! = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
      }
    }
  }
  return dp[m]![n]!;
}

/**
 * True if `d` is almost the same word sequence as `ref` (tiny edits only).
 * Thresholds: stricter when comparing two distractors than when comparing to the correct answer,
 * so a single meaningful flip (e.g. must → may) still passes vs the correct answer.
 */
function isTrivialParaphrase(ref: string, d: string, threshold: number): boolean {
  const a = wordTokens(ref);
  const b = wordTokens(d);
  if (a.length === 0 || b.length === 0) return false;
  const lcs = lcsLength(a, b);
  const sim = (2 * lcs) / (a.length + b.length);
  return sim >= threshold;
}

/**
 * Strict validation for definition-style MCQ distractors (AI or fallback).
 */
export function validateDefinitionDistractors(
  distractors: string[],
  correctAnswer: string,
): boolean {
  if (distractors.length !== 3) return false;

  const correct = correctAnswer.trim();
  if (!correct) return false;

  const correctNorm = correct.toLowerCase();
  const seen = new Set<string>();

  for (const d of distractors) {
    const t = d.trim();
    if (!t) return false;
    if (t.toLowerCase() === correctNorm) return false;
    const key = t.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);

    const words = t.split(/\s+/).filter(Boolean);
    if (words.length < 4) return false;

    if (!hasConceptOverlap(correct, t)) return false;
    if (isTrivialParaphrase(correct, t, 0.91)) return false;
  }

  const w0 = distractors[0]!.trim().split(/\s+/).filter(Boolean);
  const w1 = distractors[1]!.trim().split(/\s+/).filter(Boolean);
  const w2 = distractors[2]!.trim().split(/\s+/).filter(Boolean);
  if (w0.length >= 3 && w1.length >= 3 && w2.length >= 3) {
    const p0 = w0.slice(0, 3).join(" ").toLowerCase();
    const p1 = w1.slice(0, 3).join(" ").toLowerCase();
    const p2 = w2.slice(0, 3).join(" ").toLowerCase();
    if (p0 === p1 && p1 === p2) return false;
  }

  for (let i = 0; i < 3; i++) {
    for (let j = i + 1; j < 3; j++) {
      const a = distractors[i]!.trim();
      const b = distractors[j]!.trim();
      if (isTrivialParaphrase(a, b, 0.93)) return false;
    }
  }

  return true;
}
