"use client";

import { useCallback, useState } from "react";

export type MultipleChoiceQuestion = {
  flashcardId: string;
  question: string;
  /** Pre-formatted display strings (generated before render). */
  options: string[];
  answer: string;
  /** When set (Challenge mode), used for green/red — avoids string mismatch after formatting. */
  correctOptionIndex?: number;
};

type MultipleChoiceCardProps = {
  question: MultipleChoiceQuestion;
  onAnswer: (result: "correct" | "incorrect") => void;
};

function sameAnswer(a: string, b: string): boolean {
  return a.trim() === b.trim();
}

/** Buttons may only contain phrasing content — use spans so flex layout isn’t broken by the parser. */
export default function MultipleChoiceCard({
  question,
  onAnswer,
}: MultipleChoiceCardProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  const handleSelect = useCallback(
    (option: string, optionIndex: number) => {
      if (isAnswered) return;
      setSelectedOption(option);
      setIsAnswered(true);
      const correct =
        question.correctOptionIndex !== undefined
          ? optionIndex === question.correctOptionIndex
          : sameAnswer(option, question.answer);
      onAnswer(correct ? "correct" : "incorrect");
    },
    [isAnswered, onAnswer, question.answer, question.correctOptionIndex],
  );

  return (
    <div className="w-full max-w-xl mx-auto px-4">
      <p className="text-lg font-semibold mb-6 text-left text-gray-900 whitespace-normal leading-relaxed">
        {question.question}
      </p>

      <div className="flex flex-col gap-3 w-full">
        {question.options.map((option, index) => {
          const isCorrectOption =
            question.correctOptionIndex !== undefined
              ? index === question.correctOptionIndex
              : sameAnswer(option, question.answer);
          const isPicked =
            selectedOption !== null && sameAnswer(selectedOption, option);

          let buttonClass =
            "flex items-start gap-3 w-full rounded-xl p-4 shadow-sm border text-left " +
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 ";

          let badgeClass =
            "inline-flex w-6 h-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ";

          let textClass =
            "block flex-1 min-w-0 text-sm leading-relaxed whitespace-normal text-left ";

          if (!isAnswered) {
            buttonClass +=
              "bg-white border-gray-200 cursor-pointer hover:bg-gray-50 " +
              "transition-transform duration-100 active:scale-95";
            badgeClass += "bg-gray-100 text-gray-700";
            textClass += "text-gray-800";
          } else {
            buttonClass +=
              "transition-all duration-300 cursor-default pointer-events-none outline-none ";

            if (isCorrectOption) {
              buttonClass +=
                "bg-green-500 text-white border-green-500 shadow-md border mcq-correct-pulse-once";
              badgeClass += "bg-white/25 text-white";
              textClass += "text-white";
            } else if (isPicked && !isCorrectOption) {
              buttonClass += "bg-red-400 text-white border-red-400 shadow-md border";
              badgeClass += "bg-white/25 text-white";
              textClass += "text-white";
            } else {
              buttonClass += "bg-white border-gray-200 opacity-70";
              badgeClass += "bg-gray-100 text-gray-600";
              textClass += "text-gray-800";
            }
          }

          return (
            <button
              key={`${question.flashcardId}-opt-${index}`}
              type="button"
              tabIndex={isAnswered ? -1 : 0}
              aria-disabled={isAnswered}
              onClick={() => handleSelect(option, index)}
              className={buttonClass}
            >
              <span className={badgeClass} aria-hidden>
                {index + 1}
              </span>
              <span className={textClass}>{option}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
