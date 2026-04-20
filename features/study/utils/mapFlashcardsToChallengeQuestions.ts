import type { Flashcard } from "@/features/study/types/flashcard";
import type { ChallengeQuestion } from "@/features/study/types/challengeQuestion";
import { getQuestionType } from "@/features/study/utils/getQuestionType";
import {
  generateMultipleChoiceOptions,
  type MultipleChoiceGenerationContext,
} from "@/features/study/utils/generateMultipleChoiceOptions";
import { normalizeOptionFormat } from "@/features/study/utils/normalizeOptionFormat";

export type MapChallengeQuestionsOptions = MultipleChoiceGenerationContext;

export async function mapFlashcardsToChallengeQuestions(
  cards: Flashcard[],
  mapContext?: MapChallengeQuestionsOptions,
): Promise<ChallengeQuestion[]> {
  const withIds = cards.filter(
    (c): c is Flashcard & { id: string } => Boolean(c.id?.trim()),
  );

  const forceReveal = cards.length < 4;

  return Promise.all(
    withIds.map(async (c) => {
      if (forceReveal) {
        return {
          flashcardId: c.id,
          question: c.question,
          answer: c.answer,
          type: "reveal" as const,
        };
      }

      const options = await generateMultipleChoiceOptions(c, cards, mapContext);
      if (options) {
        const qType = getQuestionType(c.question ?? "");
        const normalizedAnswer = normalizeOptionFormat(c.answer?.trim() ?? "", qType);
        const answer =
          normalizedAnswer.trim().length > 0 ? normalizedAnswer : c.answer;
        return {
          flashcardId: c.id,
          question: c.question,
          answer,
          type: "multiple_choice" as const,
          options,
        };
      }

      return {
        flashcardId: c.id,
        question: c.question,
        answer: c.answer,
        type: "reveal" as const,
      };
    }),
  );
}
