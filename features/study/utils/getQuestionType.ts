export type McqQuestionType = "date" | "percentage" | "definition" | "general";

/**
 * Classifies a flashcard question for type-aware multiple-choice distractors.
 */
export function getQuestionType(question: string): McqQuestionType {
  const q = question.trim().toLowerCase();
  if (!q) return "general";

  if (q.includes("when")) {
    return "date";
  }

  if (q.includes("percentage") || q.includes("%") || /\brate\b/.test(q)) {
    return "percentage";
  }

  if (q.includes("what is") || q.includes("define")) {
    return "definition";
  }

  return "general";
}
