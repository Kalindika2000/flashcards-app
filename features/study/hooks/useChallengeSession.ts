"use client";

import { useCallback, useState } from "react";
import type { PanInfo } from "framer-motion";

export function useChallengeSession(challengesLength: number) {
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [showChallengeAnswer, setShowChallengeAnswer] = useState(false);

  const resetChallengeSession = useCallback(() => {
    setChallengeIndex(0);
    setShowChallengeAnswer(false);
  }, []);

  const revealAnswer = useCallback(() => {
    setShowChallengeAnswer(true);
  }, []);

  const goPrevChallenge = useCallback(() => {
    setChallengeIndex((prev) => {
      if (prev <= 0) return prev;
      setShowChallengeAnswer(false);
      return prev - 1;
    });
  }, []);

  const goNextChallenge = useCallback(() => {
    setChallengeIndex((prev) => {
      if (prev >= challengesLength - 1) return prev;
      setShowChallengeAnswer(false);
      return prev + 1;
    });
  }, [challengesLength]);

  const handleSwipeEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const threshold = 60;

      if (info.offset.y < -threshold && challengeIndex < challengesLength - 1) {
        goNextChallenge();
      }

      if (info.offset.y > threshold && challengeIndex > 0) {
        goPrevChallenge();
      }
    },
    [challengeIndex, challengesLength, goNextChallenge, goPrevChallenge],
  );

  return {
    challengeIndex,
    showChallengeAnswer,
    setChallengeIndex,
    setShowChallengeAnswer,
    revealAnswer,
    goPrevChallenge,
    goNextChallenge,
    resetChallengeSession,
    handleSwipeEnd,
  };
}
