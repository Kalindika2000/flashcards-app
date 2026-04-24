"use client";

import { useMemo } from "react";
import DOMPurify from "isomorphic-dompurify";
import { buttons } from "@/styles/ui";

type StudyNotePanelProps = {
  note: {
    title: string;
    content: string;
  };
  isNotesOpen: boolean;
  onToggleNotes: () => void;
  onEdit: () => void;
};

export default function StudyNotePanel({
  note,
  isNotesOpen,
  onToggleNotes,
  onEdit,
}: StudyNotePanelProps) {
  const safeHtml = useMemo(
    () =>
      DOMPurify.sanitize(note.content, {
        USE_PROFILES: { html: true },
      }),
    [note.content],
  );

  return (
    <div style={{ width: "100%", maxWidth: "900px", marginTop: "10px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <div
          onClick={onToggleNotes}
          style={{
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          {isNotesOpen ? "▼ Notes" : "▶ Notes"}
        </div>

        <button
          type="button"
          onClick={onEdit}
          style={{
            ...buttons.secondary,
          }}
        >
          ✏️ Edit
        </button>
      </div>

      {isNotesOpen && (
        <div
          style={{
            marginBottom: "20px",
            padding: "16px",
            background: "#f9fafb",
            borderRadius: "12px",
            maxHeight: "30vh",
            overflowY: "auto",
            scrollBehavior: "smooth",
          }}
        >
          <div style={{ fontSize: "18px", fontWeight: "bold" }}>{note.title}</div>

          <div
            className="note-content"
            style={{
              fontSize: "14px",
              color: "#555",
              marginTop: "6px",
              lineHeight: "1.6",
            }}
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        </div>
      )}
    </div>
  );
}
