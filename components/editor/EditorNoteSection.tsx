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
    marginBottom: "12px",
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "600px",
        marginBottom: "40px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h1 style={{ margin: 0 }}>Flashcards</h1>

        <button
          type="button"
          onClick={onSave}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "none",
            background: "#16a34a",
            color: "white",
            cursor: "pointer",
          }}
        >
          Save
        </button>
      </div>

      <input
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Enter note title (e.g. Photosynthesis)"
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "8px",
          border: "1px solid #ccc",
          marginBottom: "10px",
          fontSize: "14px",
        }}
      />

      <button
        type="button"
        onClick={onDeleteAllFlashcards}
        style={{
          marginBottom: "10px",
          padding: "8px 12px",
          background: "red",
          color: "white",
          border: "none",
          borderRadius: "6px",
        }}
      >
        Delete All Flashcards
      </button>

      <ReactQuill value={notes} onChange={onNotesChange} style={quillStyle} />
    </div>
  );
}
