/*This is the Notes screen where the notes related to a chosen deck are displayed in tile format. Navigation is Home-click a Deck tile  */


"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProgressCircle } from "@/components/ProgressCircle";
import BottomNav from "@/components/BottomNav";
import type { Note } from "@/features/notes/types/note";
import { getNotesByDeck } from "@/lib/repositories/notesRepository";
import { getFlashcardsByNote } from "@/lib/repositories/flashcardsRepository";
import { useAuth } from "@/components/auth/AuthProvider";

export default function DeckNotesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const deckId = params.deckId as string;

  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchNotes = async () => {
      const userId = user.uid;
      const notes = await getNotesByDeck(deckId, userId);

      const data = await Promise.all(
        notes.map(async (note) => {
          const flashcards = await getFlashcardsByNote(note.id, userId);
          const totalCards = flashcards.length;
          const knownCards = flashcards.filter((card) => card.known === true).length;

          return {
            ...note,
            totalCards,
            knownCards,
          };
        })
      );

      setNotes(data);
    };

    if (deckId) void fetchNotes();
  }, [deckId, authLoading, user]);

 return (
  <div className="app-container">
    {/* HEADER */}
    <div className="header">
      <div className="header-top">
        <div className="menu" onClick={() => router.back()}>
          ←
        </div>

        <div className="header-text">
          <div className="title">Notes</div>
          <div className="subtitle">Select a note</div>
        </div>

        <div
          className="fab"
          onClick={() => {
            router.push(`/editor?deckId=${deckId}`);
          }}
        >
          +
        </div>
      </div>
    </div>

    {/* GRID */}
    <div style={{ paddingTop: 10 }}>
      <div className="deck-grid">
        {notes.map((note, index) => {
  const percent =
    !note.totalCards || note.totalCards === 0
      ? 0
      : Math.round(((note.knownCards || 0) / note.totalCards) * 100);

  return (
  <div
  key={note.id}
  className="deck-card"
style={{ position: "relative" }}
    onClick={() =>
    router.push(`/study?noteId=${note.id}&deckId=${deckId}`)
}
  >
    <img
  src={`https://picsum.photos/400/300?random=${index + 1}`}
  className="deck-image"
  style={{ position: "relative", zIndex: 1 }}
/>
    <div
  style={{
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10
  }}
>
  <ProgressCircle percent={percent} />
</div>
    <div className="absolute top-2 right-2">
  
</div>
                <div className="deck-content">
               <div className="deck-title">{note.title}</div>
              <div className="deck-subject">
                {note.content.slice(0, 40)}...
              </div>
            </div>
          </div>
          );
})}
      </div>
    </div>

    {/* EMPTY STATE */}
    {notes.length === 0 && (
      <div style={{ textAlign: "center", marginTop: "40px" }}>
        <p>No notes yet</p>
      </div>
    )}

<BottomNav
  onAdd={() => {
    router.push(`/editor?deckId=${deckId}`);
  }}
/>
   </div>
);
}