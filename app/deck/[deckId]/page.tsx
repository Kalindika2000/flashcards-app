/*This is the Notes screen where the notes related to a chosen deck are displayed in tile format. Navigation is Home-click a Deck tile  */


"use client";
console.log("NEW VERSION OF DECK PAGE");
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { ProgressCircle } from "@/components/ProgressCircle";
import BottomNav from "@/components/BottomNav";

type Note = {
  id: string;
  title: string;
  content: string;
  deckId: string;

  totalCards?: number;
  knownCards?: number;
};

export default function DeckNotesPage() {
    
  const router = useRouter();
  const params = useParams();
  const deckId = params.deckId as string;

  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    const fetchNotes = async () => {
      const q = query(
        collection(db, "notes"),
        where("deckId", "==", deckId)
      );

      const snapshot = await getDocs(q);

const data = await Promise.all(
  snapshot.docs.map(async (doc) => {
    const noteId = doc.id;

    const flashSnapshot = await getDocs(
      query(collection(db, "flashcards"), where("noteId", "==", noteId))
    );

    const totalCards = flashSnapshot.docs.length;

    const knownCards = flashSnapshot.docs.filter(
      (card) => card.data().known === true
    ).length;

    return {
      id: noteId,
      ...(doc.data() as Omit<Note, "id">),
      totalCards,
      knownCards,
    };
  })
);

setNotes(data);
    };

    if (deckId) fetchNotes();
  }, [deckId]);

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
            //console.log("Navigating with deckId:", deckId);
            router.push(`/editor?deckId=${deckId}`)
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