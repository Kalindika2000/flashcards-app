import type { McqDifficulty } from "@/features/study/utils/mcqDifficulty";

export type ChallengeQuestionType = "reveal" | "multiple_choice";

type ChallengeQuestionBase = {
  flashcardId: string;
  question: string;
  answer: string;
  /** Tier from user performance stats; attached when questions are generated. */
  difficulty?: McqDifficulty;
};

/** Reveal: user taps to reveal, then self-grades. */
export type RevealChallengeQuestion = ChallengeQuestionBase & {
  type: "reveal";
};

/** Multiple choice: four options including the correct answer. */
export type MultipleChoiceChallengeQuestion = ChallengeQuestionBase & {
  type: "multiple_choice";
  options: string[];
  /** Set when questions are prepared for Challenge mode — authoritative for UI feedback. */
  correctOptionIndex?: number;
};

export type ChallengeQuestion =
  | RevealChallengeQuestion
  | MultipleChoiceChallengeQuestion;

export type ChallengeAnswerResult = "correct" | "incorrect";
