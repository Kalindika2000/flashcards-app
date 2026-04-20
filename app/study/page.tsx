/*This is the page where notes anf relted flashcards are displayed for study. Navigationis via Decks-Notes */
"use client";

import { Suspense } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import Mascot from "@/components/Mascot";
import StudyPageHeader from "@/components/study/StudyPageHeader";
import StudyNotePanel from "@/components/study/StudyNotePanel";
import StudyModeHeader from "@/components/study/StudyModeHeader";
import StudyLoadingOverlay from "@/components/study/StudyLoadingOverlay";
import StudyFlashcardsEmpty from "@/components/study/StudyFlashcardsEmpty";
import StudyModeSelectionCard from "@/components/study/StudyModeSelectionCard";
import StudyChallengeSession from "@/components/study/StudyChallengeSession";
import StudyFlashcardSession from "@/components/study/StudyFlashcardSession";
import StudySessionComplete from "@/components/study/StudySessionComplete";
import StudyConfetti from "@/components/study/StudyConfetti";
import { markFlashcardResult } from "@/lib/repositories/flashcardsRepository";
import { useStudyChallengeSession } from "@/features/study/hooks/useStudyChallengeSession";
import { useFlashcardSession } from "@/features/study/hooks/useFlashcardSession";
import { useStudyData } from "@/features/study/hooks/useStudyData";
import { generateChallengeQuestions } from "@/features/study/utils/generateChallengeQuestions";
import type { ChallengeAnswerResult, ChallengeQuestion } from "@/features/study/types/challengeQuestion";
import type { Flashcard } from "@/features/study/types/flashcard";
import { updateFlashcardStats } from "@/lib/services/updateFlashcardStats";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import { saveChallengeSession } from "@/lib/repositories/challengeSessionsRepository";
import { DEFAULT_CHALLENGE_SESSION_MODE } from "@/features/challengeSessions/constants";

function StudyPage() {
  const [isNotesOpen, setIsNotesOpen] = useState(true);
  const [mode, setMode] = useState<"flashcards" | "challenge" | null>(null);
  const [challengeQuestions, setChallengeQuestions] = useState<ChallengeQuestion[]>(
    [],
  );
  const [isChallengeGenerating, setIsChallengeGenerating] = useState(false);
  const [focusWeakCards, setFocusWeakCards] = useState(false);
  const [challengeSessionResults, setChallengeSessionResults] = useState<
    Record<string, ChallengeAnswerResult>
  >({});
  const [isReviewChallengeSession, setIsReviewChallengeSession] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const noteId = searchParams.get("noteId");
  const deckId = searchParams.get("deckId") || undefined;
  const { user } = useAuth();

  const onPersistFlashcardMark = useCallback(
    async (flashcardId: string, isKnown: boolean) => {
      await markFlashcardResult({ flashcardId, isKnown });
      if (user?.uid) {
        void updateFlashcardStats({
          userId: user.uid,
          flashcardId,
          isCorrect: isKnown,
          mode: "study",
        });
      }
    },
    [user?.uid],
  );

  const {
    flashcards,
    setFlashcards,
    currentIndex,
    flipped,
    setFlipped,
    streak,
    bestStreak,
    showConfetti,
    showFeedback,
    isSessionComplete,
    setIsSessionComplete,
    restartMode,
    setRestartMode,
    mascotMood,
    mistakeCount,
    activeCards,
    currentCard,
    someKnown,
    allMastered,
    resetMode,
    goNext,
    goPrev,
    restart,
    handleMarkCard,
  } = useFlashcardSession({
    onPersistMark: onPersistFlashcardMark,
  });
const {
  note,
  loading,
  loadingMessage,
  loadFlashcards,
  handleGenerateFlashcards,
  setStudyLoadingOverlay,
} = useStudyData({
  noteId,
  deckId,
  setFlashcards,
  onFlashcardsGenerated: () => {
    setIsSessionComplete(false);
    setMode("flashcards");
  },
});
  const challengeQuiz = useStudyChallengeSession(challengeQuestions.length);
  const { resetChallengeSession, handleAnswer: challengeHandleAnswer } =
    challengeQuiz;

  const handleChallengeAnswer = useCallback(
    (result: ChallengeAnswerResult) => {
      const q =
        challengeQuestions[challengeQuiz.currentQuestionIndex];
      if (q?.flashcardId) {
        setChallengeSessionResults((prev) => ({
          ...prev,
          [q.flashcardId]: result,
        }));
      }
      if (user?.uid && q?.flashcardId) {
        if (process.env.NODE_ENV === "development") {
          console.log("📊 Challenge stats update", {
            flashcardId: q.flashcardId,
            isCorrect: result === "correct",
            mode: "challenge",
          });
        }
        void updateFlashcardStats({
          userId: user.uid,
          flashcardId: q.flashcardId,
          isCorrect: result === "correct",
          mode: "challenge",
        });
      }
      challengeHandleAnswer(result);
    },
    [
      challengeHandleAnswer,
      challengeQuiz.currentQuestionIndex,
      challengeQuestions,
      user?.uid,
    ],
  );

  const challengeWeakFlashcardIds = useMemo(() => {
    if (!challengeQuiz.isComplete || challengeQuestions.length === 0) {
      return [];
    }
    const ids = challengeQuestions
      .filter((q) => challengeSessionResults[q.flashcardId] === "incorrect")
      .map((q) => q.flashcardId)
      .filter((id): id is string => Boolean(id?.trim()));
    return Array.from(new Set(ids));
  }, [
    challengeQuiz.isComplete,
    challengeQuestions,
    challengeSessionResults,
  ]);
  const challengeSessionSavedRef = useRef(false);

  useEffect(() => {
    resetChallengeSession();
  }, [resetChallengeSession, challengeQuestions.length]);

  useEffect(() => {
    if (challengeQuestions.length === 0) {
      challengeSessionSavedRef.current = false;
    }
  }, [challengeQuestions.length]);

  useEffect(() => {
    if (
      mode !== "challenge" ||
      !challengeQuiz.isComplete ||
      challengeQuestions.length === 0 ||
      !user?.uid
    ) {
      return;
    }
    if (challengeSessionSavedRef.current) return;
    if (!noteId?.trim()) return;
    challengeSessionSavedRef.current = true;

    void saveChallengeSession({
      userId: user.uid,
      noteId: noteId.trim(),
      mode: DEFAULT_CHALLENGE_SESSION_MODE,
      score: challengeQuiz.score,
      correctCount: challengeQuiz.correctCount,
      totalQuestions: challengeQuestions.length,
    })
      .then(() => {
        if (process.env.NODE_ENV === "development") {
          console.log("[challenge_sessions] saved");
        }
      })
      .catch((err) => {
        console.warn("[challenge_sessions] save failed", err);
      });
  }, [
    mode,
    challengeQuiz.isComplete,
    challengeQuiz.score,
    challengeQuiz.correctCount,
    challengeQuestions.length,
    noteId,
    user?.uid,
  ]);

const isOutdated =
  flashcards.length > 0 &&
  note?.version !== undefined &&
  flashcards.some(
    (card) => (card.noteVersion ?? 1) !== (note.version ?? 1),
  );

const handleFlashcards = async () => {
  resetMode();
  setMode("flashcards");

  await loadFlashcards();
};
const handleResetMode = () => {
  setMode(null);
  setChallengeQuestions([]);
  setIsChallengeGenerating(false);
  setChallengeSessionResults({});
  setIsReviewChallengeSession(false);
  resetMode();
};

type PrepareChallengeFromCardsOptions = {
  /** When true, always pass focusWeakCards to generation (overrides mode toggle). */
  forceFocusWeakCards?: boolean;
  /** Marks the session as started from “Review weak cards” (summary copy + UI). */
  fromReview?: boolean;
};

const MIN_REVIEW_SESSION_CARDS = 3;

const prepareChallengeFromCards = useCallback(
  async (cards: Flashcard[], opts?: PrepareChallengeFromCardsOptions) => {
    setChallengeQuestions([]);
    setChallengeSessionResults({});
    challengeSessionSavedRef.current = false;
    setMode("challenge");
    setIsReviewChallengeSession(opts?.fromReview === true);

    const focusForGeneration =
      opts?.forceFocusWeakCards === true ? true : focusWeakCards;

    const mapped = await generateChallengeQuestions(cards, user?.uid, {
      focusWeakCards: focusForGeneration,
    });
    if (mapped.length === 0) {
      showToast(
        "Flashcards are missing IDs. Regenerate flashcards from the editor and try again.",
        "error",
      );
      setMode(null);
      setIsReviewChallengeSession(false);
      return false;
    }
    setChallengeQuestions(mapped);
    return true;
  },
  [user?.uid, focusWeakCards, showToast],
);

const handleReviewWeakCards = useCallback(async () => {
  const weakIdSet = new Set(
    challengeWeakFlashcardIds.map((id) => id.trim()).filter(Boolean),
  );
  const weakCards = flashcards.filter((c) => {
    const id = c.id?.trim();
    if (!id) return false;
    return weakIdSet.has(id);
  });
  if (weakCards.length === 0) {
    showToast("No missed cards to review.", "info");
    return;
  }

  let finalCards = [...weakCards];
  if (finalCards.length < MIN_REVIEW_SESSION_CARDS) {
    const need = MIN_REVIEW_SESSION_CARDS - finalCards.length;
    const used = new Set<string>();
    for (const c of finalCards) {
      const id = c.id?.trim();
      if (id) used.add(id);
    }
    // Top up from the rest of the deck (not in this session’s weak set) so short misses still get a viable session.
    const extras = flashcards.filter((c) => {
      const id = c.id?.trim();
      if (!id || used.has(id) || weakIdSet.has(id)) return false;
      return true;
    });
    finalCards = [...finalCards, ...extras.slice(0, need)];
  }

  setStudyLoadingOverlay(true, "Preparing challenge...");
  setIsChallengeGenerating(true);
  try {
    await prepareChallengeFromCards(finalCards, {
      forceFocusWeakCards: true,
      fromReview: true,
    });
  } catch {
    showToast("Could not prepare challenge. Try again.", "error");
    setMode(null);
    setChallengeQuestions([]);
    setIsReviewChallengeSession(false);
  } finally {
    setStudyLoadingOverlay(false);
    setIsChallengeGenerating(false);
  }
}, [
  challengeWeakFlashcardIds,
  flashcards,
  prepareChallengeFromCards,
  showToast,
  setStudyLoadingOverlay,
]);

const handleChallenge = async () => {
  if (!noteId) return;

  setIsSessionComplete(false);
  setStudyLoadingOverlay(true, "Loading flashcards...");

  try {
    let cards = await loadFlashcards({ skipLoadingOverlay: true });

    if (!cards?.length) {
      if (!note?.content?.trim()) {
        showToast("Load your note first, then try Challenge mode again.", "error");
        return;
      }
      await handleGenerateFlashcards({ skipSwitchToFlashcardMode: true });
      setStudyLoadingOverlay(true, "Loading flashcards...");
      cards = await loadFlashcards({ skipLoadingOverlay: true });
    }

    if (!cards?.length) {
      showToast(
        "No flashcards yet. Add more note content and generate flashcards first.",
        "info",
      );
      return;
    }

    setStudyLoadingOverlay(true, "Preparing challenge...");
    setIsChallengeGenerating(true);
    try {
      await prepareChallengeFromCards(cards);
    } catch {
      showToast("Could not prepare challenge. Try again.", "error");
      setMode(null);
      setChallengeQuestions([]);
    }
  } catch {
    showToast("Could not prepare challenge. Try again.", "error");
    setMode(null);
    setChallengeQuestions([]);
  } finally {
    setStudyLoadingOverlay(false);
    setIsChallengeGenerating(false);
  }
};
  return (
    <div
  className="app-container"
  style={{
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
}}
>
      {/* HEADER */}

<StudyPageHeader onBack={() => router.back()} />
<div
  style={{
    padding: "20px",
   // paddingBottom: "80px",
   paddingBottom: "calc(80px + env(safe-area-inset-bottom))",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box", // ✅ THIS FIXES MOBILE SHIFT
  }}
>
      {note && (
        <StudyNotePanel
          note={note}
          isNotesOpen={isNotesOpen}
          onToggleNotes={() => setIsNotesOpen((prev) => !prev)}
          onEdit={() => {
            const deckId = searchParams.get("deckId") || "";
            router.push(`/editor?noteId=${noteId}&deckId=${deckId}`);
          }}
        />
      )}


<StudyModeHeader
        mode={mode}
        challengeActive={
          mode === "challenge" &&
          (isChallengeGenerating || challengeQuestions.length > 0)
        }
        onResetMode={handleResetMode}
      />
      {loading && <StudyLoadingOverlay loadingMessage={loadingMessage} />}
{mode === null && (
  <StudyModeSelectionCard
    onSelectFlashcards={handleFlashcards}
    onSelectChallenge={handleChallenge}
    focusWeakCards={focusWeakCards}
    onFocusWeakCardsChange={setFocusWeakCards}
  />
)}

      {(flashcards.length === 0 || isOutdated) && mode === "flashcards" && (
        <StudyFlashcardsEmpty
          isOutdated={isOutdated}
          onGenerate={handleGenerateFlashcards}
        />
      )}
      {mode === "challenge" &&
        !isChallengeGenerating &&
        challengeQuestions.length > 0 && (
        <StudyChallengeSession
          questions={challengeQuestions}
          currentQuestionIndex={challengeQuiz.currentQuestionIndex}
          answerRevealed={challengeQuiz.answerRevealed}
          score={challengeQuiz.score}
          correctCount={challengeQuiz.correctCount}
          streak={challengeQuiz.streak}
          isComplete={challengeQuiz.isComplete}
          focusWeakCards={focusWeakCards || isReviewChallengeSession}
          isReviewSession={isReviewChallengeSession}
          weakFlashcardIds={challengeWeakFlashcardIds}
          onReviewWeakCards={handleReviewWeakCards}
          onRevealAnswer={challengeQuiz.revealAnswer}
          onAnswer={handleChallengeAnswer}
          onRestartChallenge={handleChallenge}
          onBackToModes={handleResetMode}
        />
      )}

        {mode === "flashcards" && flashcards.length > 0 && !isSessionComplete && !isOutdated && (
        <>
          <StudyFlashcardSession
            currentCard={currentCard}
            flipped={flipped}
            onToggleFlip={() => setFlipped(!flipped)}
            showFeedback={showFeedback}
            onMarkCard={handleMarkCard}
            currentIndex={currentIndex}
            activeCardsLength={activeCards.length}
            streak={streak}
            bestStreak={bestStreak}
            onPrev={goPrev}
            onNext={goNext}
          />
        </>
      )}

      {mode === "flashcards" && isSessionComplete && flashcards.length > 0 && (
        <StudySessionComplete
          allMastered={allMastered}
          someKnown={someKnown}
          restartMode={restartMode}
          onRestartModeChange={setRestartMode}
          onBackToModes={handleResetMode}
          onRestart={restart}
        />
      )}
    <style jsx>{`
  .spinner {
    margin: 0 auto;
    width: 30px;
    height: 30px;
    border: 4px solid #ddd;
    border-top: 4px solid #2563eb;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
@keyframes fadeOut {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -60%);
  }
}
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .note-content :global(p) {
    margin-bottom: 10px;
  }

  .note-content :global(ul) {
    padding-left: 20px;
    margin-bottom: 10px;
  }

  .note-content :global(li) {
    margin-bottom: 6px;
  }

  .note-content :global(h1),
  .note-content :global(h2),
  .note-content :global(h3) {
    font-weight: bold;
    margin-top: 10px;
    margin-bottom: 6px;
  }

  .note-content :global(strong) {
    font-weight: 600;
  }
`}</style>
</div>
{showConfetti && <StudyConfetti />}


<Mascot
  mood={mascotMood}
  tired={mistakeCount >= 3}
/>
<BottomNav
  onAdd={() => {
    const deckId = searchParams.get("deckId") || "";
    router.push(`/editor?deckId=${deckId}`);
  }}
/>
</div>
);
}
export default function StudyPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StudyPage />
    </Suspense>
  );
}