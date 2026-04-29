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
  isWeakFromStats,
  selectFlashcardsForChallengeSession,
  stripConfidence,
  type FlashcardWithConfidence,
} from "@/features/study/utils/challengeFlashcardSelection";
import { buildDifficultyByFlashcardId } from "@/features/study/utils/mcqDifficulty";
import { prefetchDefinitionMisconceptionsForChallenge } from "@/features/study/utils/prefetchDefinitionMisconceptions";
import { getUserFlashcardStat } from "@/lib/repositories/userFlashcardStatsRepository";

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

  let selectedWithStats: FlashcardWithConfidence[];
  if (options?.focusWeakCards === true && userId?.trim()) {
    const statsByFlashcardId = new Map<
      string,
      { correctCount: number; incorrectCount: number } | undefined
    >();
    await Promise.all(
      flashcardsWithStats.map(async (card) => {
        const flashcardId = card.id?.trim();
        if (!flashcardId) return;
        const stat = await getUserFlashcardStat(
          userId.trim(),
          flashcardId,
          "ChallengeMode|WeakCards|user_flashcard_stats|generateQuestions",
        );
        if (!stat) {
          statsByFlashcardId.set(flashcardId, undefined);
          return;
        }
        statsByFlashcardId.set(flashcardId, {
          correctCount: stat.correctCount,
          incorrectCount: stat.incorrectCount,
        });
      }),
    );
    const picked = flashcardsWithStats.filter((card) => {
      const flashcardId = card.id?.trim();
      if (!flashcardId) return true;
      return isWeakFromStats(statsByFlashcardId.get(flashcardId));
    });
    console.log("Weak selection output:", picked);
    console.log("Returned from weak selection");
    if (picked.length > 0) {
      selectedWithStats = picked;
      console.log("Using weak-only mode. Cards:", picked.length);
    } else {
      console.warn("No weak cards found — returning empty set");
      selectedWithStats = [];
    }
  } else {
    selectedWithStats = selectFlashcardsForChallengeSession(
      flashcardsWithStats,
      flashcards,
      options,
    );
  }
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

  const result = await Promise.all(
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
  console.log("generateChallengeQuestions returning:", result);
  return result;
}
