"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getNoteById } from "@/lib/repositories/notesRepository";
import { getFlashcardsByNote } from "@/lib/repositories/flashcardsRepository";
import { generateAndSaveFlashcards } from "@/lib/services/flashcardGenerationService";
import { useToast } from "@/components/ui/ToastProvider";
import { getErrorMessage } from "@/lib/utils/errorMessage";
import type { Flashcard } from "@/features/study/types/flashcard";

type StudyNote = {
  title: string;
  content: string;
  version?: number;
};

type UseStudyDataParams = {
  noteId: string | null;
  deckId?: string;
  setFlashcards: (cards: Flashcard[]) => void;
  onFlashcardsGenerated: () => void;
};

export function useStudyData({
  noteId,
  deckId,
  setFlashcards,
  onFlashcardsGenerated,
}: UseStudyDataParams) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [note, setNote] = useState<StudyNote | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  const loadFlashcards = useCallback(
    async (options?: { skipLoadingOverlay?: boolean }) => {
      if (!noteId || !user) return undefined;

      const showOverlay = !options?.skipLoadingOverlay;
      if (showOverlay) {
        setLoading(true);
        setLoadingMessage("Loading flashcards...");
      }

      try {
        const cards = await getFlashcardsByNote(noteId, user.uid);
        setFlashcards(cards);
        return cards;
      } finally {
        if (showOverlay) {
          setLoading(false);
        }
      }
    },
    [noteId, setFlashcards, user],
  );

  const handleGenerateFlashcards = useCallback(
    async (options?: { skipSwitchToFlashcardMode?: boolean }) => {
      if (!note?.content || !noteId) return;

      const plainText = note.content.replace(/<[^>]*>/g, "").trim();
      if (!plainText) return;
      setLoading(true);
      setLoadingMessage("Generating flashcards...");

      try {
        const generatedCards = await generateAndSaveFlashcards({
          noteId,
          notes: note.content,
          noteVersion: note?.version ?? 1,
          deckId,
        });

        if (generatedCards.length === 0) {
          showToast(
            "No flashcards were generated. Try adding more note content or editing your notes.",
            "info",
          );
          setLoading(false);
          return;
        }

        setLoadingMessage("Saving your flashcards...");
        await loadFlashcards({ skipLoadingOverlay: true });
        if (!options?.skipSwitchToFlashcardMode) {
          setLoading(false);
          onFlashcardsGenerated();
        }
      } catch (err) {
        setLoading(false);
        console.error(err);
        showToast(getErrorMessage(err, "Failed to generate flashcards"), "error");
      }
    },
    [deckId, loadFlashcards, note?.content, note?.version, noteId, onFlashcardsGenerated, showToast],
  );

  useEffect(() => {
    if (!noteId || !user) return;

    const fetchNote = async () => {
      const noteData = await getNoteById(noteId, user.uid);
      if (!noteData) return;
      setNote({
        title: noteData.title,
        content: noteData.content,
        version: noteData.version,
      });
    };

    void fetchNote();
  }, [noteId, user]);

  const setStudyLoadingOverlay = useCallback(
    (active: boolean, message?: string) => {
      setLoading(active);
      if (message !== undefined) {
        setLoadingMessage(message);
      }
    },
    [],
  );

  return {
    note,
    loading,
    loadingMessage,
    loadFlashcards,
    handleGenerateFlashcards,
    setStudyLoadingOverlay,
  };
}
