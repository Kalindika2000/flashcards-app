"use client";

/**
 * Renders the active challenge step from props supplied by the study page.
 * Do not fetch flashcards here — `ChallengeQuestion` already includes payload.
 */
import type {
  ChallengeAnswerResult,
  ChallengeQuestion,
} from "@/features/study/types/challengeQuestion";
import RevealCard from "@/components/study/RevealCard";
import MultipleChoiceCard from "@/components/study/MultipleChoiceCard";

type QuestionRendererProps = {
  question: ChallengeQuestion | undefined;
  revealed: boolean;
  onReveal: () => void;
  onAnswer: (result: ChallengeAnswerResult) => void;
};

export function QuestionRenderer({
  question,
  revealed,
  onReveal,
  onAnswer,
}: QuestionRendererProps) {
  if (!question) {
    return null;
  }

  switch (question.type) {
    case "multiple_choice":
      return (
        <MultipleChoiceCard
          question={{
            flashcardId: question.flashcardId,
            question: question.question,
            options: question.options,
            answer: question.answer,
            correctOptionIndex: question.correctOptionIndex,
          }}
          onAnswer={onAnswer}
        />
      );
    case "reveal":
      return (
        <RevealCard
          questionText={question.question}
          answerText={question.answer}
          revealed={revealed}
          onReveal={onReveal}
          onAnswer={onAnswer}
        />
      );
    default:
      return null;
  }
}
