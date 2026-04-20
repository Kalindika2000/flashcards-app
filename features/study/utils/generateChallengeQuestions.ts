import type { Flashcard } from "@/features/study/types/flashcard";
import type {
  ChallengeQuestion,
  MultipleChoiceChallengeQuestion,
} from "@/features/study/types/challengeQuestion";
import { formatAnswerForMCQ } from "@/features/study/utils/formatAnswerForMCQ";
import { getQuestionType } from "@/features/study/utils/getQuestionType";
import { mapFlashcardsToChallengeQuestions } from "@/features/study/utils/mapFlashcardsToChallengeQuestions";
import { normalizeOptionFormat } from "@/features/study/utils/normalizeOptionFormat";
import {
  attachStats,
  selectFlashcardsForChallengeSession,
  stripConfidence,
} from "@/features/study/utils/challengeFlashcardSelection";
import { buildDifficultyByFlashcardId } from "@/features/study/utils/mcqDifficulty";
import { prefetchDefinitionMisconceptionsForChallenge } from "@/features/study/utils/prefetchDefinitionMisconceptions";

export type ChallengeOptions = {
  focusWeakCards?: boolean;
};

/**
 * Which option is the correct answer (raw strings, before MCQ formatting).
 * `q.answer` should match one option; when normalization differed, fall back to
 * comparing normalized forms so the formatted correct label always matches an option.
 */
function findCorrectOptionIndex(q: MultipleChoiceChallengeQuestion): number {
  const direct = q.options.findIndex((o) => o.trim() === q.answer.trim());
  if (direct >= 0) return direct;

  const qType = getQuestionType(q.question ?? "");
  const normalizedAns = normalizeOptionFormat(q.answer.trim(), qType).trim();
  return q.options.findIndex(
    (o) => normalizeOptionFormat(o.trim(), qType).trim() === normalizedAns,
  );
}

/**
 * Builds challenge questions (distractors + normalization) then pre-formats
 * all multiple-choice option labels for display. Call once before Challenge Mode UI.
 */
export async function generateChallengeQuestions(
  flashcards: Flashcard[],
  userId?: string | null,
  options?: ChallengeOptions,
): Promise<ChallengeQuestion[]> {
  const flashcardsWithStats = await attachStats(flashcards, userId);
  const selectedWithStats = selectFlashcardsForChallengeSession(
    flashcardsWithStats,
    flashcards,
    options,
  );
  const selectedFlashcards = selectedWithStats.map(stripConfidence);

  const difficultyByFlashcardId = await buildDifficultyByFlashcardId(
    selectedFlashcards,
    userId,
  );

  const misconceptionsByFlashcardId =
    await prefetchDefinitionMisconceptionsForChallenge(
      selectedFlashcards,
      difficultyByFlashcardId,
    );

  const base = await mapFlashcardsToChallengeQuestions(selectedFlashcards, {
    misconceptionsByFlashcardId,
    difficultyByFlashcardId,
  });

  return Promise.all(
    base.map(async (q) => {
      const difficulty = difficultyByFlashcardId[q.flashcardId] ?? "medium";

      if (q.type !== "multiple_choice") {
        return { ...q, difficulty };
      }

      const formattedOptions = await Promise.all(
        q.options.map((opt) => formatAnswerForMCQ(opt, q.flashcardId)),
      );

      let correctIndex = findCorrectOptionIndex(q);
      if (correctIndex < 0) {
        const answerFormatted = await formatAnswerForMCQ(q.answer, q.flashcardId);
        correctIndex = formattedOptions.findIndex(
          (o) => o.trim() === answerFormatted.trim(),
        );
      }

      const formattedAnswer =
        correctIndex >= 0
          ? formattedOptions[correctIndex]!
          : await formatAnswerForMCQ(q.answer, q.flashcardId);

      return {
        ...q,
        difficulty,
        options: formattedOptions,
        answer: formattedAnswer,
        correctOptionIndex: correctIndex >= 0 ? correctIndex : undefined,
      };
    }),
  );
}
