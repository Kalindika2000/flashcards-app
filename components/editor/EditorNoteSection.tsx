"use client";

import dynamic from "next/dynamic";
import { useState, type CSSProperties } from "react";
import ReactMarkdown from "react-markdown";
import { htmlToPlainText } from "@/lib/api/htmlToPlainText";
import { fetchNoteSummary } from "@/lib/services/noteSummaryService";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingRow } from "@/components/ui/LoadingRow";
import { buttons, spacing, typography } from "@/styles/ui";

const ReactQuill = dynamic(() => import("./ReactQuillEditor"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        minHeight: "200px",
        marginBottom: "12px",
        borderRadius: "8px",
        border: "1px solid #e5e5e5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#666",
        fontSize: "14px",
      }}
    >
      Loading editor…
    </div>
  ),
});

type EditorNoteSectionProps = {
  title: string;
  notes: string;
  noteVersion: number;
  savedSummary: string | null;
  savedSummaryVersion: number | null;
  onSaveSummaryForCurrentVersion: (summaryText: string) => Promise<void>;
  onTitleChange: (title: string) => void;
  onNotesChange: (html: string) => void;
  onSave: () => void;
  onDeleteAllFlashcards: () => void;
};

export function EditorNoteSection({
  title,
  notes,
  noteVersion,
  savedSummary,
  savedSummaryVersion,
  onSaveSummaryForCurrentVersion,
  onTitleChange,
  onNotesChange,
  onSave,
  onDeleteAllFlashcards,
}: EditorNoteSectionProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const quillStyle: CSSProperties = {
    width: "100%",
    marginBottom: 0,
  };

  return (
    <div
      style={{
        padding: spacing.sm,
        width: "100%",
        maxWidth: "600px",
        marginBottom: "40px",
        boxSizing: "border-box",
      }}
    >
      <h1
        style={{
          margin: 0,
          ...typography.title,
          marginBottom: spacing.xs,
        }}
      >
        {`Edit Note — ${(title || "").trim() || "Untitled"}`}
      </h1>

      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: spacing.sm,
          justifyContent: "flex-start",
        }}
      >
        <button type="button" onClick={onSave} style={{ ...buttons.primary }}>
          Save
        </button>

        <button
          type="button"
          disabled={isSummarizing}
          onClick={async () => {
            const noteContent = notes;
            if (!noteContent || !htmlToPlainText(noteContent).trim()) return;

            setError(null);
            setIsSummarizing(true);

            try {
              if (
                savedSummary &&
                savedSummaryVersion !== null &&
                savedSummaryVersion === noteVersion
              ) {
                console.log("Using cached summary");
                setSummary(savedSummary);
                return;
              }

              console.log("Generating new summary");
              const result = await fetchNoteSummary(noteContent);
              setSummary(result);
              console.log("Attempting to save summary", {
                summary: result,
                noteVersion,
              });
              await onSaveSummaryForCurrentVersion(result);
            } catch (err) {
              console.error("Summarization failed", err);
              setError("Failed to summarize notes");
            } finally {
              setIsSummarizing(false);
            }
          }}
          style={{ ...buttons.secondary }}
        >
          Summarize Notes
        </button>
      </div>

      {error ? <ErrorState message={error} /> : null}

      <div style={{ marginBottom: spacing.md }}>
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Enter note title (e.g. Photosynthesis)"
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            fontSize: "14px",
            boxSizing: "border-box",
          }}
        />
      </div>

      <div style={{ marginBottom: spacing.lg }}>
        <ReactQuill value={notes} onChange={onNotesChange} style={quillStyle} className="editor-note-rich" />
      </div>

      {(isSummarizing || summary) && (
        <div style={{ marginTop: spacing.lg }}>
          <div
            onClick={() => setIsSummaryOpen((prev) => !prev)}
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <span style={{ fontWeight: "600" }}>🧠 Summary</span>
            <span>{isSummaryOpen ? "▲" : "▼"}</span>
          </div>

          {isSummaryOpen && (
            <div
              style={{
                background: "#ffffff",
                padding: "16px",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                lineHeight: "1.6",
                fontSize: "15px",
              }}
            >
              {isSummarizing ? (
                <LoadingRow text="Summarizing notes..." />
              ) : (
                <ReactMarkdown
                  components={{
                    li: ({ node, ...props }) => (
                      <li
                        style={{ marginBottom: "10px", lineHeight: "1.6" }}
                        {...props}
                      />
                    ),
                    p: ({ node, ...props }) => (
                      <p style={{ marginBottom: "8px" }} {...props} />
                    ),
                  }}
                >
                  {summary ?? ""}
                </ReactMarkdown>
              )}
            </div>
          )}
        </div>
      )}

      <div
        style={{
          marginTop: spacing.lg,
          borderTop: "1px solid #eee",
          paddingTop: spacing.sm,
        }}
      >
        <button
          type="button"
          onClick={onDeleteAllFlashcards}
          style={{
            ...buttons.destructive,
          }}
        >
          Delete All Flashcards
        </button>
      </div>
    </div>
  );
}

