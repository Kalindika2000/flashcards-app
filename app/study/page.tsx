/*This is the page where notes anf relted flashcards are displayed for study. Navigationis via Decks-Notes */
"use client";

import ModeSelection from "@/components/ModeSelection";
import TopSwitch from "@/components/TopSwitch";
import { Suspense } from "react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { generateChallengeClips } from "@/lib/challengeGeneratorUtil";
import BottomNav from "@/components/BottomNav";
import type { Challenge } from "@/lib/challengeGeneratorUtil";
/*import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";*/

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  addDoc,
} from "firebase/firestore";

type FlashcardType = {
  id?: string;
  question: string;
  answer: string;
  noteId?: string;
  known?: boolean;
};

//export default function StudyPage() {
  function StudyPage() {
  const [isNotesOpen, setIsNotesOpen] = useState(true);
  const [mode, setMode] = useState<"flashcards" | "challenge" | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const noteId = searchParams.get("noteId");
const [sessionCards, setSessionCards] = useState<number[]>([]);
  const [flashcards, setFlashcards] = useState<FlashcardType[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
const [challengeIndex, setChallengeIndex] = useState(0);
const [showChallengeAnswer, setShowChallengeAnswer] = useState(false);
  const [note, setNote] = useState<{
  title: string;
  content: string;
} | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  //const [knownCards, setKnownCards] = useState<number[]>([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
const [restartMode, setRestartMode] = useState<"all" | "difficult">("all");
const [loading, setLoading] = useState(false);
const [loadingMessage, setLoadingMessage] = useState("");

const activeCards =
  sessionCards.length > 0
    ? sessionCards
    : flashcards.map((_, i) => i);
    const knownCount = flashcards.filter((c) => c.known).length;
const someKnown = knownCount > 0;
const allMastered = knownCount === flashcards.length;
const actualIndex = activeCards[currentIndex] ?? currentIndex;

  // ✅ LOAD ONLY CARDS FOR THIS NOTE
 /* const loadFlashcards = async () => {
    if (!noteId) return;

    const q = query(
      collection(db, "flashcards"),
      where("noteId", "==", noteId)
    );

    const snapshot = await getDocs(q);

    const cards = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as FlashcardType),
    }));

    setFlashcards(cards);
  };*/

  const loadFlashcards = async () => {
  if (!noteId) return;

  //setLoading(true);
  //setLoadingMessage("Loading your flashcards...");

  const q = query(
    collection(db, "flashcards"),
    where("noteId", "==", noteId)
  );

  const snapshot = await getDocs(q);

  const cards: FlashcardType[] = snapshot.docs.map((doc) => {
  const data = doc.data() as any;

  return {
    id: doc.id,
    question: data.question,
    answer: data.answer,
    noteId: data.noteId,
    known: data.known ?? false,
  };
});

  setFlashcards(cards);
/*setKnownCards(
  cards
    .map((card, index) => (card.known ? index : -1))
    .filter((i) => i !== -1)
);*/
  setLoading(false);
};
const handleGenerateChallenges = async () => {
  if (!note?.content) return;

  setLoading(true);
  setLoadingMessage("Creating challenge clips...");

  try {
    const result = await generateChallengeClips(note.content);

    setLoadingMessage("Preparing your challenge session...");

    setChallenges(result);
    setChallengeIndex(0);
    setShowChallengeAnswer(false);

    setLoading(false);
  } catch (err) {
    setLoading(false);
    console.error(err);
    alert("Failed to generate challenges");
  }
};

const handleGenerateFlashcards = async () => {
  if (!note?.content || !noteId) return;

  const plainText = note.content.replace(/<[^>]*>/g, "").trim();
  if (!plainText) return;
  setLoading(true);
setLoadingMessage("Generating flashcards...");

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ notes: note.content }),
    });

    if (!res.ok) throw new Error("API failed");

    const data = await res.json();

    if (!data.flashcards || data.flashcards.length === 0) {
      alert("No flashcards returned");
      return;
    }
    setLoadingMessage("Saving your flashcards...");   
    for (const card of data.flashcards) {
      await addDoc(collection(db, "flashcards"), {
        question: card.question,
        answer: card.answer,
        noteId: noteId,
        createdAt: new Date(),
        known: false,
      });
    }

    await loadFlashcards();
    //setLoading(false);
    setMode("flashcards");

  } catch (err) {
  setLoading(false);
  console.error(err);
  alert("Failed to generate flashcards");
}
};
const handleSwipeEnd = (event: any, info: any) => {
  console.log("DRAG OFFSET:", info.offset.y);

  const threshold =60;

  if (info.offset.y < -threshold) {
    if (challengeIndex < challenges.length - 1) {
      setChallengeIndex((prev) => prev + 1);
      setShowChallengeAnswer(false);
    }
  }

  if (info.offset.y > threshold) {
    if (challengeIndex > 0) {
      setChallengeIndex((prev) => prev - 1);
      setShowChallengeAnswer(false);
    }
  }
};
 /* useEffect(() => {
  if (!noteId) return;

  loadFlashcards();

  const fetchNote = async () => {
    const docRef = doc(db, "notes", noteId);
    const snapshot = await getDocs(
      query(collection(db, "notes"), where("__name__", "==", noteId))
    );

    if (!snapshot.empty) {
      setNote(snapshot.docs[0].data() as any);
    }
  };

  fetchNote();
}, [noteId]);*/
useEffect(() => {
  if (!noteId) return;

  const fetchNote = async () => {
    const docRef = doc(db, "notes", noteId);
    const snapshot = await getDocs(
      query(collection(db, "notes"), where("__name__", "==", noteId))
    );

    if (!snapshot.empty) {
      setNote(snapshot.docs[0].data() as any);
    }
  };

  fetchNote();
}, [noteId]);

const handleFlashcards = async () => {
  setSessionCards([]); // ensures clean session
  setMode("flashcards");

  await loadFlashcards();
};
const resetMode = () => {
  setMode(null);
  setSessionCards([]); // ✅ CRITICAL FIX
  setCurrentIndex(0);
  setFlipped(false);
  setIsSessionComplete(false);
};
const handleChallenge = async () => {
  if (challenges.length === 0) {
    await handleGenerateChallenges();
  }

  setMode("challenge");
};
  const goNext = () => {
    if (currentIndex >= activeCards.length - 1) {
      setIsSessionComplete(true);
      return;
    }

    setFlipped(false);

    if (flashcards[actualIndex]?.known) {
  setStreak(0);
}

    setCurrentIndex((prev) => prev + 1);
  };

  const goPrev = () => {
    setFlipped(false);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  

    /*
  const restart = async () => {
    for (const card of flashcards) {
      if (!card.id) continue;

      await updateDoc(doc(db, "flashcards", card.id), {
        known: false,
      });
    }

  
    setKnownCards([]);
    setCurrentIndex(0);
    setFlipped(false);
    setStreak(0);
    setIsSessionComplete(false);
  };*/


const restart = async () => {
  if (!noteId) return;

  setLoading(true);
  setLoadingMessage("Refreshing your cards...");

  // 🔁 ALWAYS FETCH FRESH DATA FROM DB
 /* const q = query(
    collection(db, "flashcards"),
    where("noteId", "==", noteId)
  );

  const snapshot = await getDocs(q);

  //const freshCards = snapshot.docs.map((doc) => {
    const freshCards: FlashcardType[] = snapshot.docs.map((doc) => {
  const data = doc.data() as any;

  return {
    id: doc.id,
    question: data.question,
    answer: data.answer,
    noteId: data.noteId,
    known: data.known ?? false,
  };
});*/
const freshCards = flashcards;

  // ✅ update local state with fresh DB data
  setFlashcards(freshCards);

  let newCards: number[];

  if (restartMode === "all") {
    // RESET DB FLAGS
   
    newCards = freshCards.map((_, i) => i);

    //setKnownCards([]);
  } else {
    // ✅ FILTER USING DB VALUE (NOT local state)
    newCards = freshCards
      .map((card, i) => (card.known ? -1 : i))
      .filter((i) => i !== -1);
  }

  setSessionCards(newCards);
  setCurrentIndex(0);
  setFlipped(false);
  setStreak(0);
  setIsSessionComplete(false);

  setLoading(false);
};


 /* const restart = async () => {
  const newCards =
    restartMode === "all"
      ? flashcards.map((_, i) => i)
      : flashcards
          .map((_, i) => i)
          .filter((i) => !knownCards.includes(i));

          const newCards =
  restartMode === "all"
    ? flashcards.map((_, i) => i)
    : flashcards
        .map((card, i) => (card.known ? -1 : i))
        .filter((i) => i !== -1);

  setSessionCards(newCards);

  if (restartMode === "all") {
    for (const card of flashcards) {
      if (!card.id) continue;

      await updateDoc(doc(db, "flashcards", card.id), {
        known: false,
      });
    }

    setKnownCards([]);
  }

  setCurrentIndex(0);
  setFlipped(false);
  setStreak(0);
  setIsSessionComplete(false);
};*/

  //const currentCard = flashcards[currentIndex];
const currentCard = flashcards[actualIndex];

  return (
    <div
  className="app-container"
  style={{
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
}}
>
      {/* <h1>Study</h1> */}

      {/* HEADER */}

<div className="header">
  <div className="header-top">
    <div className="menu" onClick={() => router.back()}>
      ←
    </div>

    <div className="header-text">
      <div className="title">Study</div>
      <div className="subtitle">Review your cards</div>
    </div>

    <div style={{ width: "24px" }} />
  </div>
</div>
<div style={{ padding: "20px", paddingBottom: "80px" }}>
      {note && (
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
    onClick={() => setIsNotesOpen((prev) => !prev)}
    style={{
      cursor: "pointer",
      fontWeight: "600",
    }}
  >
    {isNotesOpen ? "▼ Notes" : "▶ Notes"}
  </div>

  <button
    onClick={() => {
  const deckId = searchParams.get("deckId") || "";
  router.push(`/editor?noteId=${noteId}&deckId=${deckId}`);
}}
    style={{
      padding: "4px 10px",
      fontSize: "12px",
      borderRadius: "6px",
      border: "1px solid #ccc",
      background: "white",
      cursor: "pointer",
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
        <div style={{ fontSize: "18px", fontWeight: "bold" }}>
          {note.title}
        </div>

        <div
  className="note-content"
  style={{
    fontSize: "14px",
    color: "#555",
    marginTop: "6px",
    lineHeight: "1.6",
  }}
  dangerouslySetInnerHTML={{ __html: note.content }}
/>
      </div>
    )}
  </div>
)}
<div
  style={{
    marginTop: "20px",
    marginBottom: "20px", // ✅ adds space below
    fontWeight: "600",
    cursor: "default",
  }}
>
  Choose how you want to study
</div>

{loading && (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(255,255,255,0.8)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 99999,
    }}
  >
    <div className="spinner"></div>
    <p style={{ marginTop: "12px", color: "#333", fontWeight: "500" }}>
      {loadingMessage}
    </p>
  </div>
)}
{mode === null && (
  <div
    style={{
  background: "#ffffff",
  borderRadius: "16px",
  padding: "24px",
  boxShadow: "0 12px 32px rgba(0,0,0,0.08)",
  border: "1px solid #e5e7eb",
  marginTop: "10px",
}}
  >
    <ModeSelection
      onSelectFlashcards={handleFlashcards}
      onSelectChallenge={handleChallenge}
    />
  </div>
)}

      {flashcards.length === 0 && mode === "flashcards" && (
  <div style={{ marginTop: "20px", textAlign: "center" }}>
    <p>No cards found.</p>

    <button
      onClick={handleGenerateFlashcards}
      style={{
        marginTop: "10px",
        padding: "10px 16px",
        borderRadius: "8px",
        border: "none",
        background: "#2563eb",
        color: "white",
        cursor: "pointer",
      }}
    >
      Generate Flashcards
    </button>
  </div>
)}
      {mode === "challenge" && challenges.length > 0 && (
         <>
    <button onClick={resetMode}>
      ← Back to modes
    </button>

  <motion.div
  key={challengeIndex}
  style={{
    maxWidth: "500px",
    width: "100%",
    marginTop: "20px",
    border: "2px solid #16a34a",
    borderRadius: "12px",
    padding: "20px",
    touchAction: "none",
  }}
  drag="y"
  dragElastic={0.2}
  dragMomentum={true}
  dragConstraints={{ top: 0, bottom: 0 }}
  onDragEnd={handleSwipeEnd}
  initial={{ y: 300, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  exit={{ y: -300, opacity: 0 }}
  transition={{ type: "spring", stiffness: 300, damping: 30 }}
>
    <h3>Challenge Mode</h3>

    <div style={{ textAlign: "center" }}>
      <h2>{challenges[challengeIndex]?.hook}</h2>

      <p>{challenges[challengeIndex]?.context}</p>

      <p style={{ fontWeight: "bold", marginTop: "10px" }}>
        {challenges[challengeIndex]?.question}
      </p>

      {!showChallengeAnswer ? (
        <button
          onClick={() => setShowChallengeAnswer(true)}
          style={{ marginTop: "15px" }}
        >
          Reveal Answer
        </button>
      ) : (
        <>
          <p style={{ marginTop: "15px", fontWeight: "bold" }}>
            Answer: {challenges[challengeIndex]?.answer}
          </p>
          <p>{challenges[challengeIndex]?.explanation}</p>
        </>
      )}

      <div style={{ marginTop: "20px" }}>
        <button
          onClick={() => {
            if (challengeIndex > 0) {
              setChallengeIndex(challengeIndex - 1);
              setShowChallengeAnswer(false);
            }
          }}
          style={{ marginRight: "10px" }}
        >
          ⬅ Prev
        </button>

        <button
          onClick={() => {
            if (challengeIndex < challenges.length - 1) {
              setChallengeIndex(challengeIndex + 1);
              setShowChallengeAnswer(false);
            }
          }}
        >
          Next ➡
        </button>
                  </div>
    </div>
  </motion.div>
</>
)}
      {mode === "flashcards" && flashcards.length > 0 && !isSessionComplete && (
        <>
          {/* CARD */}
          <button onClick={resetMode}>
          ← Back to modes
        </button>
         <div
  onClick={() => setFlipped(!flipped)}
  style={{
    width: "100%",
    maxWidth: "500px",
    height: "200px",
    background: "#e5e5e5",
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    textAlign: "center",
    cursor: "pointer",
    marginTop: "40px",
    position: "relative",
  }}
>
  {currentCard?.known && (
    <div
      style={{
        position: "absolute",
        top: "10px",
        right: "10px",
        fontSize: "12px",
        background: "#22c55e",
        color: "white",
        padding: "4px 8px",
        borderRadius: "6px",
      }}
    >
      Known
    </div>
  )}
            <div style={{ fontSize: "18px", fontWeight: "600" }}>
              {flipped ? currentCard?.answer : currentCard?.question}
            </div>
          </div>

          {/* STATS */}
          <p style={{ marginTop: "20px" }}>
            🔥 {streak} | 🏆 {bestStreak}
          </p>

          <p>
            Card {currentIndex + 1} / {activeCards.length}
          </p>

          {/* ACTION */}
          {flipped && (
  <div style={{ marginTop: "20px" }}>
    <button
      onClick={async (e) => {
        e.stopPropagation();

        const card = flashcards[actualIndex];
        if (!card?.id) return;

        const newKnownState = !card.known;

        await updateDoc(doc(db, "flashcards", card.id), {
          known: newKnownState,
        });

        // ✅ update local flashcards state (critical)
        setFlashcards((prev) =>
          prev.map((c, i) =>
            i === actualIndex ? { ...c, known: newKnownState } : c
          )
        );

        // ✅ keep knownCards in sync (for now)
        /*setKnownCards((prev) =>
          newKnownState
            ? prev.includes(actualIndex)
              ? prev
              : [...prev, actualIndex]
            : prev.filter((i) => i !== actualIndex)
        );*/

        // ✅ streak logic
        if (newKnownState) {
          setStreak((prev) => {
            const newStreak = prev + 1;
            setBestStreak((best) =>
              newStreak > best ? newStreak : best
            );
            return newStreak;
          });
        } else {
          setStreak(0);
        }
      }}
      style={{
        padding: "10px 16px",
        borderRadius: "8px",
        border: "none",
        background: currentCard?.known ? "#ef4444" : "#22c55e",
        color: "white",
        cursor: "pointer",
      }}
    >
      {currentCard?.known ? "❌ Mark as difficult" : "✅ I know this"}
    </button>
  </div>
)}

          {/* NAV */}
          <div style={{ marginTop: "30px", display: "flex", gap: "10px" }}>
            <button onClick={goPrev}>Prev</button>
            <button onClick={goNext}>
              {currentIndex === activeCards.length - 1 ? "Finish" : "Next"}
            </button>
          </div>
        </>
      )}

      {/* COMPLETE */}
      {mode === "flashcards" && isSessionComplete && flashcards.length > 0 && (
  <div style={{ marginTop: "40px", textAlign: "center" }}>
    <button onClick={resetMode} style={{ marginBottom: "20px" }}>
  ← Back to modes
</button>
    <h2>🎉 Session Complete!</h2>

{allMastered ? (
  <p>You’ve mastered all flashcards.</p>
) : (
  <p>You’ve reviewed all cards.</p>
)}
    {!allMastered && someKnown && (
      <div style={{ marginTop: "20px" }}>
        <label>
          <input
            type="radio"
            value="all"
            checked={restartMode === "all"}
            onChange={() => setRestartMode("all")}
          />
          All cards
        </label>

        <label style={{ marginLeft: "12px" }}>
          <input
            type="radio"
            value="difficult"
            checked={restartMode === "difficult"}
            onChange={() => setRestartMode("difficult")}
          />
          Difficult cards only
        </label>
      </div>
    )}

    <button
      onClick={restart}
      style={{
        marginTop: "20px",
        padding: "10px 20px",
        borderRadius: "10px",
        border: "none",
        background: "#2563eb",
        color: "white",
        cursor: "pointer",
      }}
    >
      Restart
    </button>
  </div>
)}
    <style jsx>{`
  .spinner {
    margin: 0 auto;
    width: 30px;
    height: 30px;
    border: 4px solid #ddd;
    border-top: 4px solid #2563eb;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .note-content :global(p) {
    margin-bottom: 10px;
  }

  .note-content :global(ul) {
    padding-left: 20px;
    margin-bottom: 10px;
  }

  .note-content :global(li) {
    margin-bottom: 6px;
  }

  .note-content :global(h1),
  .note-content :global(h2),
  .note-content :global(h3) {
    font-weight: bold;
    margin-top: 10px;
    margin-bottom: 6px;
  }

  .note-content :global(strong) {
    font-weight: 600;
  }
`}</style>
</div>
<BottomNav
  onAdd={() => {
    const deckId = searchParams.get("deckId") || "";
    router.push(`/editor?deckId=${deckId}`);
  }}
/>
</div>
//</main>
);
}
export default function StudyPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StudyPage />
    </Suspense>
  );
}