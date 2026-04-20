/* This is where new notes can be uploaded and flashcards generated. Navigation is via the add button on the Notes screen. */
"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { EditorChallengePreview } from "@/components/editor/EditorChallengePreview";
import { EditorModals } from "@/components/editor/EditorModals";
import { EditorNoteSection } from "@/components/editor/EditorNoteSection";
import type { Challenge } from "@/features/generation/types/challenge";
import { useDeleteNoteFlashcards } from "@/features/editor/hooks/useDeleteNoteFlashcards";
import { useEditorNote } from "@/features/editor/hooks/useEditorNote";
import { useChallengeSession } from "@/features/study/hooks/useChallengeSession";

function EditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckId = searchParams.get("deckId");
  const noteId = searchParams.get("noteId");

  const [challenges] = useState<Challenge[]>([]);

  const noteEditor = useEditorNote({
    noteId,
    deckId,
    router,
  });

  const { deleteAllFlashcards } = useDeleteNoteFlashcards(noteId);

  const challengeSession = useChallengeSession(challenges.length);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: "sans-serif",
        padding: "20px",
        paddingBottom: "80px",
      }}
    >
      <EditorNoteSection
        title={noteEditor.title}
        notes={noteEditor.notes}
        onTitleChange={noteEditor.onTitleChange}
        onNotesChange={noteEditor.onNotesChange}
        onSave={() => void noteEditor.handleSave()}
        onDeleteAllFlashcards={() => void deleteAllFlashcards()}
      />

      <EditorChallengePreview
        challenges={challenges}
        challengeIndex={challengeSession.challengeIndex}
        showChallengeAnswer={challengeSession.showChallengeAnswer}
        onRevealAnswer={challengeSession.revealAnswer}
        onPrevChallenge={challengeSession.goPrevChallenge}
        onNextChallenge={challengeSession.goNextChallenge}
      />

      <BottomNav
        showAdd={false}
        onHome={() => {
          if (noteEditor.isDirty) {
            noteEditor.setShowLeaveModal(true);
            return;
          }

          router.push("/");
        }}
      />

      <EditorModals
        showLeaveModal={noteEditor.showLeaveModal}
        onDismissLeave={() => noteEditor.setShowLeaveModal(false)}
        onConfirmLeave={() => {
          noteEditor.setShowLeaveModal(false);
          router.push("/");
        }}
        errorMessage={noteEditor.errorMessage}
        onDismissError={() => noteEditor.setErrorMessage("")}
        showUpdateModal={noteEditor.showUpdateModal}
        onSaveOnly={() => void noteEditor.handleSaveOnly()}
        onSaveAndStudy={() => void noteEditor.handleGoToStudy()}
        onDismissUpdate={() => noteEditor.setShowUpdateModal(false)}
      />
    </main>
  );
}

export default function EditorPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditorPage />
    </Suspense>
  );
}
