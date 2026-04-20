/*This is the current Home page. It displaysall the Decks*/ 
"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ProgressCircle } from "@/components/ProgressCircle";
import BottomNav from "@/components/BottomNav";
import type { Deck } from "@/features/decks/types/deck";
import { createDeck, getDecksByUser } from "@/lib/repositories/decksRepository";
import { getNotesByDeck } from "@/lib/repositories/notesRepository";
import { getFlashcardsByNote } from "@/lib/repositories/flashcardsRepository";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/components/ui/ToastProvider";

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [decks, setDecks] = useState<Deck[]>([]);
const [showForm, setShowForm] = useState(false);
const [title, setTitle] = useState("");
const [subject, setSubject] = useState("");



useEffect(() => {
  if (authLoading || !user) return;

  const fetchDecks = async () => {
    const userId = user.uid;
    const decks = await getDecksByUser(userId);

    const decksData = await Promise.all(
      decks.map(async (deck, index) => {
        const notes = await getNotesByDeck(deck.id, userId);
        const noteIds = notes.map((n) => n.id);

        let totalCards = 0;
        let knownCards = 0;

        for (const noteId of noteIds) {
          const flashcards = await getFlashcardsByNote(noteId, userId);
          totalCards += flashcards.length;
          knownCards += flashcards.filter((card) => card.known === true).length;
        }

        return {
          id: deck.id,
          title: deck.title,
          subject: deck.subject,
          image: `https://picsum.photos/400/300?random=${index + 1}`,
          totalCards,
          knownCards,
        };
      })
    );

    setDecks(decksData);
  };

  void fetchDecks();
}, [authLoading, user]);
    
  return (
    <div className="app-container">
      {/* Header */}
     <div className="header">
 <div className="header-top">
  <div className="menu">☰</div>

  <div className="header-text">
    <div className="title">My Decks</div>
    <div className="subtitle">Organise your study</div>
  </div>

  <div className="fab" onClick={() => setShowForm(true)}>
  +
</div>
</div>

  <div className="search-wrapper">
  <div className="search-wrapper">
  <input className="search-bar" placeholder="Search decks..." />
</div>
</div>
</div>
{showForm && (
  <div className="sheet-overlay" onClick={() => setShowForm(false)}>
    <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-title">Add New Deck</div>

<div className="sheet-content">
  <input
    className="input-field"
    placeholder="Deck title"
    value={title}
    onChange={(e) => setTitle(e.target.value)}
  />

  <input
    className="input-field"
    placeholder="Subject"
    value={subject}
    onChange={(e) => setSubject(e.target.value)}
  />

  <button
    className="create-btn"
    onClick={async () => {
      if (!title || !subject) {
        showToast("Please fill in all fields.", "error");
        return;
      }
      if (!user) {
        showToast("You must be signed in.", "error");
        return;
      }

      const newDeck = {
        title,
        subject,
        image: "https://picsum.photos/400/300",
      };
      const userId = user.uid;
      const createdDeck = await createDeck({ ...newDeck, userId });
      setDecks([...decks, createdDeck]);

      setTitle("");
      setSubject("");
      setShowForm(false);
    }}
  >
    Create Deck
  </button>
</div>
    </div>
  </div>

)}
      {/* Grid */}
<div style={{ paddingTop: 10 }}>
  <div className="deck-grid">
  {decks.map((deck) => {
  const percent =
  !deck.totalCards || deck.totalCards === 0
    ? 0
    : Math.round(((deck.knownCards || 0) / deck.totalCards) * 100);

  return (
    <div
  key={deck.id}
  className="deck-card"
  style={{ position: "relative" }}
  onClick={() => {
    router.push(`/deck/${deck.id}`);
  }}
>
      <img src={deck.image} className="deck-image" />
<div
  style={{
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
  }}
>
  <ProgressCircle percent={percent} />
</div>
      <div className="deck-content">
        <div className="deck-title">{deck.title}</div>
        <div className="deck-subject">{deck.subject}</div>
      </div>
    </div>
  
    );
})}
</div>
</div>

<BottomNav onAdd={() => setShowForm(true)} />

</div>
);
}