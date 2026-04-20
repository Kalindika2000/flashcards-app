import type { McqQuestionType } from "@/features/study/utils/getQuestionType";
import { formatDateCanonical, parseAnswerDate } from "@/features/study/utils/mcqDateDistractors";

/**
 * Normalize a single MCQ option for consistent display (percentages, dates, plain numbers).
 * Definition/general text is left as-is. On failure, returns the original string.
 */
export function normalizeOptionFormat(answer: string, questionType: string): string {
  const raw = answer.trim();
  if (!raw) return answer;

  const qt = questionType as McqQuestionType;

  if (qt === "percentage") {
    const m = raw.match(/-?\d+(?:\.\d+)?%/);
    return m ? m[0]! : raw;
  }

  if (qt === "date") {
    const p = parseAnswerDate(raw);
    if (p) {
      return formatDateCanonical(p.day, p.month, p.year);
    }
    return raw;
  }

  if (qt === "definition" || qt === "general") {
    if (/^\s*-?\d+(?:\.\d+)?\s*$/.test(raw)) {
      return raw.trim();
    }
    return raw;
  }

  return raw;
}
