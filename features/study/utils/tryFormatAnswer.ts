import { simplifyAnswer } from "@/features/study/utils/simplifyAnswer";

/**
 * Fast rule-based MCQ label shortening. Returns null if the answer still looks
 * long or messy so callers can fall back to AI.
 */
export function tryFormatAnswer(answer: string): string | null {
  const trimmed = answer.trim();
  if (!trimmed) return null;

  const simplified = simplifyAnswer(trimmed).trim();
  if (!simplified) return null;

  const words = simplified.split(/\s+/).filter(Boolean);
  if (words.length >= 8) return null;

  const origWords = trimmed.split(/\s+/).filter(Boolean);
  if (simplified === trimmed && origWords.length > 8) {
    return null;
  }

  if (/[.!?]\s+\S/.test(simplified)) {
    return null;
  }

  return simplified;
}
