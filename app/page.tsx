/*This is the current Home page. It displaysall the Decks*/ 
"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { ProgressCircle } from "@/components/ProgressCircle";
import BottomNav from "@/components/BottomNav";
type Deck = {
  id: string;
  title: string;
  subject: string;
  image: string;

  totalCards?: number;
  knownCards?: number;
};
export default function Home() {
  const router = useRouter();

  const [decks, setDecks] = useState<Deck[]>([
 /* {
    id: "1",
    title: "Chemistry Exam Prep",
    subject: "Chemistry",
    image: "https://picsum.photos/400/300?random=1",
  },
  {
    id: "2",
    title: "Math Formulas",
    subject: "Math",
    image: "https://picsum.photos/400/300?random=2"
  },*/
]);
const [showForm, setShowForm] = useState(false);
useEffect(() => {
  console.log("showForm changed:", showForm);
}, [showForm]);
const [title, setTitle] = useState("");
const [subject, setSubject] = useState("");



useEffect(() => {
  const fetchDecks = async () => {
    const deckSnapshot = await getDocs(collection(db, "decks"));

    const decksData = await Promise.all(
      deckSnapshot.docs.map(async (deckDoc, index) => {
        const deckId = deckDoc.id;

        const notesSnapshot = await getDocs(
          query(collection(db, "notes"), where("deckId", "==", deckId))
        );

        const noteIds = notesSnapshot.docs.map((n) => n.id);

        let totalCards = 0;
        let knownCards = 0;

        for (const noteId of noteIds) {
          const flashSnapshot = await getDocs(
            query(collection(db, "flashcards"), where("noteId", "==", noteId))
          );

          totalCards += flashSnapshot.docs.length;

          knownCards += flashSnapshot.docs.filter(
            (doc) => doc.data().known === true
          ).length;
        }

        return {
          id: deckId,
          title: deckDoc.data().title,
          subject: deckDoc.data().subject,
          image: `https://picsum.photos/400/300?random=${index + 1}`,
          totalCards,
          knownCards,
        };
      })
    );

    setDecks(decksData);
  };

  fetchDecks();
}, []);
    
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
        alert("Please fill in all fields");
        return;
      }

      const newDeck = {
        title,
        subject,
        image: "https://picsum.photos/400/300",
      };

      const docRef = await addDoc(collection(db, "decks"), newDeck);

      setDecks([...decks, { id: docRef.id, ...newDeck }]);

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