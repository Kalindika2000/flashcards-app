"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { createNote, getNoteById, updateNote } from "@/lib/repositories/notesRepository";

type UseEditorNoteParams = {
  noteId: string | null;
  deckId: string | null;
  router: { push: (href: string) => void };
};

export function useEditorNote({ noteId, deckId, router }: UseEditorNoteParams) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [noteVersion, setNoteVersion] = useState<number>(1);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryVersion, setSummaryVersion] = useState<number | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [originalNotes, setOriginalNotes] = useState("");
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  useEffect(() => {
    if (!noteId || !user) return;

    const fetchNote = async () => {
      const note = await getNoteById(noteId, user.uid);
      if (!note) return;

      setTitle(note.title || "");
      setNotes(note.content || "");
      setOriginalNotes(note.content || "");
      setNoteVersion(note.version ?? 1);
      setSummary(note.summary ?? null);
      setSummaryVersion(note.summaryVersion ?? null);
      setIsDirty(false);
    };

    void fetchNote();
  }, [noteId, user]);

  const saveNewNote = useCallback(async () => {
    if (!user) throw new Error("Not authenticated");
    const created = await createNote({
      title,
      content: notes,
      deckId: deckId ?? "",
      userId: user.uid,
    });
    setNoteVersion(created.version ?? 1);
    setSummary(created.summary ?? null);
    setSummaryVersion(created.summaryVersion ?? null);
    return created.id;
  }, [deckId, notes, title, user]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      setErrorMessage("Please enter a title");
      return;
    }

    const plainText = notes.replace(/<[^>]*>/g, "").trim();

    if (!plainText) {
      setErrorMessage("Please enter content");
      return;
    }

    let currentNoteId = noteId;

    if (!currentNoteId) {
      currentNoteId = await saveNewNote();
      setIsDirty(false);
      router.push(`/deck/${deckId}`);
      return;
    }

    const originalPlain = originalNotes.replace(/<[^>]*>/g, "").trim();
    const currentPlain = notes.replace(/<[^>]*>/g, "").trim();

    if (originalPlain === currentPlain) {
      await updateNote(currentNoteId, { title, content: notes });

      setIsDirty(false);
      router.push(`/deck/${deckId}`);
      return;
    }

    setShowUpdateModal(true);
  }, [deckId, noteId, notes, originalNotes, router, saveNewNote, title]);

  const handleSaveOnly = useCallback(async () => {
    if (!noteId || !user) return;

    const existing = await getNoteById(noteId, user.uid);
    const nextVersion = (existing?.version ?? 1) + 1;
    await updateNote(noteId, { title, content: notes, version: nextVersion });
    setNoteVersion(nextVersion);

    setOriginalNotes(notes);
    setShowUpdateModal(false);
    setIsDirty(false);
  }, [noteId, notes, title, user]);

  const handleGoToStudy = useCallback(async () => {
    if (!noteId || !user) return;

    const existing = await getNoteById(noteId, user.uid);
    const nextVersion = (existing?.version ?? 1) + 1;
    await updateNote(noteId, { title, content: notes, version: nextVersion });
    setNoteVersion(nextVersion);

    setShowUpdateModal(false);
    setIsDirty(false);

    router.push(`/study?deckId=${deckId}&noteId=${noteId}`);
  }, [deckId, noteId, notes, title, router, user]);

  const onTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle);

      const isTitleChanged = newTitle.trim() !== title.trim();
      const normalize = (text: string) => text.replace(/<[^>]*>/g, "").trim();
      const isContentChanged = normalize(notes) !== normalize(originalNotes);

      setIsDirty(isTitleChanged || isContentChanged);
    },
    [notes, originalNotes, title],
  );

  const onNotesChange = useCallback(
    (value: string) => {
      setNotes(value);
      const normalize = (text: string) => text.replace(/<[^>]*>/g, "").trim();
      setIsDirty(normalize(value) !== normalize(originalNotes));
    },
    [originalNotes],
  );

  const saveSummaryForCurrentVersion = useCallback(
    async (summaryText: string) => {
      if (!noteId || !user) return;
      console.log("saveSummaryForCurrentVersion triggered");
      const currentVersion = noteVersion ?? 1;
      await updateNote(noteId, {
        summary: summaryText,
        summaryVersion: currentVersion,
      });
      setSummary(summaryText);
      setSummaryVersion(currentVersion);
    },
    [noteId, noteVersion, user],
  );

  return {
    title,
    setTitle,
    notes,
    setNotes,
    noteVersion,
    summary,
    summaryVersion,
    isDirty,
    setIsDirty,
    showLeaveModal,
    setShowLeaveModal,
    errorMessage,
    setErrorMessage,
    originalNotes,
    setOriginalNotes,
    showUpdateModal,
    setShowUpdateModal,
    handleSave,
    handleSaveOnly,
    handleGoToStudy,
    saveSummaryForCurrentVersion,
    onTitleChange,
    onNotesChange,
  };
}
