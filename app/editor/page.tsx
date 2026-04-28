/* This is where new notes can be uploaded and flashcards generated. Navigation is via the add button on the Notes screen. */
"use client";

import { Suspense, useState, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { EditorChallengePreview } from "@/components/editor/EditorChallengePreview";
import { EditorModals } from "@/components/editor/EditorModals";
import { EditorNoteSection } from "@/components/editor/EditorNoteSection";
import type { Challenge } from "@/features/generation/types/challenge";
import { useDeleteNoteFlashcards } from "@/features/editor/hooks/useDeleteNoteFlashcards";
import { useEditorNote } from "@/features/editor/hooks/useEditorNote";
import { useChallengeSession } from "@/features/study/hooks/useChallengeSession";
import { extractTextFromPDF } from "@/lib/utils/extractTextFromPDF";
import { inferPdfStructure } from "@/lib/utils/inferPdfStructure";

function EditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckId = searchParams.get("deckId");
  const noteId = searchParams.get("noteId");

  const [challenges] = useState<Challenge[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  const noteEditor = useEditorNote({
    noteId,
    deckId,
    router,
  });

  const { deleteAllFlashcards } = useDeleteNoteFlashcards(noteId);

  const challengeSession = useChallengeSession(challenges.length);
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    try {
      const text = await extractTextFromPDF(file);
      noteEditor.onNotesChange(inferPdfStructure(text));
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message.trim()
          : "Failed to extract text from PDF.";
      console.error("PDF extraction failed:", error);
      noteEditor.setErrorMessage(message);
    } finally {
      e.target.value = "";
    }
  };

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
      <div
        style={{
          width: "100%",
          maxWidth: "600px",
          marginBottom: "12px",
        }}
      >
        <label
          style={{
            display: "inline-block",
            padding: "10px 16px",
            background: "#4f46e5",
            color: "white",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
            marginBottom: "10px",
          }}
          title="Upload a PDF file (max 5MB, up to 50 pages)"
        >
          Upload PDF
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />
        </label>
        <div style={{ fontSize: "12px", opacity: 0.7, marginBottom: "12px" }}>
          Upload lecture slides or notes as a PDF. Max 5MB, 50 pages.
        </div>
        {fileName ? (
          <div style={{ fontSize: "12px", marginBottom: "8px" }}>
            Selected: {fileName}
          </div>
        ) : null}
      </div>

      <EditorNoteSection
        title={noteEditor.title}
        notes={noteEditor.notes}
        noteVersion={noteEditor.noteVersion}
        savedSummary={noteEditor.summary}
        savedSummaryVersion={noteEditor.summaryVersion}
        onSaveSummaryForCurrentVersion={noteEditor.saveSummaryForCurrentVersion}
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
