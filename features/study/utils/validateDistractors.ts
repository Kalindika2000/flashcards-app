import type { McqQuestionType } from "@/features/study/utils/getQuestionType";
import { parseAnswerDate } from "@/features/study/utils/mcqDateDistractors";

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

function meaningfulTokens(s: string): string[] {
  const m = s.toLowerCase().match(/\b[a-z][a-z'-]{2,}\b/g);
  return (m ?? []).filter((w) => !STOP_WORDS.has(w));
}

function keywordOverlapMeetsThreshold(correct: string, distractor: string): boolean {
  const cTok = meaningfulTokens(correct);
  const dTok = meaningfulTokens(distractor);
  if (cTok.length === 0 && dTok.length === 0) {
    return correct.trim().length > 0 && distractor.trim().length > 0;
  }
  const cSet = new Set(cTok);
  let overlap = 0;
  for (const w of dTok) {
    if (cSet.has(w)) overlap += 1;
  }
  const need = cTok.length >= 4 ? 2 : 1;
  return overlap >= need;
}

function similarStructureDefinition(correct: string, distractor: string): boolean {
  const wcA = correct.split(/\s+/).filter(Boolean).length;
  const wcB = distractor.split(/\s+/).filter(Boolean).length;
  if (wcB === 0) return false;
  const maxGap = Math.max(6, Math.ceil(wcA * 0.55));
  if (Math.abs(wcA - wcB) > maxGap) return false;

  const lenRatio = distractor.length / Math.max(correct.length, 1);
  if (lenRatio < 0.22 || lenRatio > 4.5) return false;

  return true;
}

function validateDefinitionLike(distractor: string, correct: string): boolean {
  if (!similarStructureDefinition(correct, distractor)) return false;
  return keywordOverlapMeetsThreshold(correct, distractor);
}

/**
 * Validates AI-generated distractors for MCQ (definition path and optional type checks).
 */
export function validateDistractors(
  distractors: string[],
  correctAnswer: string,
  questionType: string,
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
  }

  const qt = questionType as McqQuestionType;

  if (qt === "percentage") {
    return distractors.every((d) => /%/.test(d));
  }

  if (qt === "date") {
    return distractors.every((d) => parseAnswerDate(d.trim()) !== null);
  }

  if (qt === "definition" || qt === "general") {
    return distractors.every((d) => validateDefinitionLike(d, correct));
  }

  return true;
}
