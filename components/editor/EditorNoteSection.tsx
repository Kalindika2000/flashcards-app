"use client";

import dynamic from "next/dynamic";
import type { CSSProperties } from "react";

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
  onTitleChange: (title: string) => void;
  onNotesChange: (html: string) => void;
  onSave: () => void;
  onDeleteAllFlashcards: () => void;
};

export function EditorNoteSection({
  title,
  notes,
  onTitleChange,
  onNotesChange,
  onSave,
  onDeleteAllFlashcards,
}: EditorNoteSectionProps) {
  const quillStyle: CSSProperties = {
    width: "100%",
    marginBottom: 0,
  };

  return (
    <div
      style={{
        padding: "16px",
        width: "100%",
        maxWidth: "600px",
        marginBottom: "40px",
        boxSizing: "border-box",
      }}
    >
      <h1 style={{ margin: 0, marginBottom: "8px" }}>
        {`Edit Note — ${(title || "").trim() || "Untitled"}`}
      </h1>

      <div style={{ marginBottom: "16px" }}>
        <button
          type="button"
          onClick={onSave}
          style={{
            backgroundColor: "#16a34a",
            color: "white",
            padding: "12px 18px",
            borderRadius: "10px",
            border: "none",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          Save
        </button>
      </div>

      <div style={{ marginBottom: "24px" }}>
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

      <div style={{ marginBottom: "32px" }}>
        <ReactQuill value={notes} onChange={onNotesChange} style={quillStyle} />
      </div>

      <div
        style={{
          marginTop: "32px",
          borderTop: "1px solid #eee",
          paddingTop: "16px",
        }}
      >
        <button
          type="button"
          onClick={onDeleteAllFlashcards}
          style={{
            padding: "8px 12px",
            background: "red",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Delete All Flashcards
        </button>
      </div>
    </div>
  );
}
