/*This where new notes can be uploadedand flashcards generated. navigation is via the add button on the Notes screen */
"use client";

import { useState, useEffect } from "react";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import type { Challenge } from "../../lib/challengeGeneratorUtil";
import "react-quill/dist/quill.snow.css";
//import { useSearchParams } from "next/navigation";
import { useSearchParams, useRouter } from "next/navigation";
import { db } from "../../lib/firebase";
import { collection, addDoc, serverTimestamp, getDocs, deleteDoc, doc, updateDoc, increment, query, where } from "firebase/firestore";
import BottomNav from "@/components/BottomNav";
import { generateChallengeClips } from "@/lib/challengeGeneratorUtil";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });


type Deck = {
  id: string;
  title: string;
  subject: string;
  image: string;
};
type FlashcardType = {
  id?: string;
  question: string;
  answer: string;
  noteId: string;
  deckId: string;
  known?: boolean;
};

function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
const deckId = searchParams.get("deckId");
const noteId = searchParams.get("noteId");
console.log("Deck ID in study screen:", deckId);
  const [notes, setNotes] = useState("");
 // const [challenges, setChallenges] = useState([]);
 
const [challenges, setChallenges] = useState<Challenge[]>([]);

  const [title, setTitle] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [originalNotes, setOriginalNotes] = useState("");
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  
  useEffect(() => {
  if (!noteId) return;

  const fetchNote = async () => {
    const snapshot = await getDocs(
      query(collection(db, "notes"), where("__name__", "==", noteId))
    );

    if (!snapshot.empty) {
      const data = snapshot.docs[0].data() as any;

      setTitle(data.title || "");
      setNotes(data.content || "");
      setOriginalNotes(data.content || "");
      setIsDirty(false);
    }
  };

  fetchNote();
}, [noteId]);
<BottomNav
  showAdd={false}
  onHome={() => {
  if (isDirty) {
    setShowLeaveModal(true);
    return;
  }

  router.push("/");
}}
/>

  //const [lastGeneratedNotes, setLastGeneratedNotes] = useState("");
  const [flashcards, setFlashcards] = useState<FlashcardType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const loadFlashcards = async (noteId: string) => {
  const q = query(
    collection(db, "flashcards"),
    where("noteId", "==", noteId)
  );

  const querySnapshot = await getDocs(q);

  
 
  const cards = querySnapshot.docs.map((doc) => {
    return {
      id: doc.id,
      ...(doc.data() as Omit<FlashcardType, "id">),
    };
  });

 
  setFlashcards(cards);
};
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [flipped, setFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<number[]>([]);
  const [restartMode, setRestartMode] = useState<"all" | "difficult">("all");
  const remainingCards = flashcards.filter(
    (_, index) => !knownCards.includes(index)
  );
  
  const allMastered = knownCards.length === flashcards.length;
  const someKnown = knownCards.length > 0;
  const [visitedCards, setVisitedCards] = useState<number[]>([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [sessionCards, setSessionCards] = useState<number[]>(() => []);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  
 

const saveNote = async () => {
  const docRef = await addDoc(collection(db, "notes"), {
    title: title,
    content: notes,
    deckId: deckId,
    createdAt: serverTimestamp(),
    totalCards: 0,
    knownCards: 0,
  });

  return docRef.id;
};

const handleSave = async () => {
  if (!title.trim()) {
    setErrorMessage("Please enter a title");
    return;
  }

  const plainText = notes.replace(/<[^>]*>/g, "").trim();

if (!plainText) {
  setErrorMessage("Please enter content");
  return;
}

  /*let currentNoteId = noteId;

  if (!currentNoteId) {
    currentNoteId = await saveNote();
  } else {
    await updateDoc(doc(db, "notes", currentNoteId), {
      title: title,
      content: notes,
    });
  }

  setIsDirty(false);
  router.push(`/deck/${deckId}`);*/
  let currentNoteId = noteId;

// 🆕 CREATE MODE
if (!currentNoteId) {
  currentNoteId = await saveNote();
  setIsDirty(false);
  router.push(`/deck/${deckId}`);
  return;
}

// ✏️ EDIT MODE

// compare plain text
const originalPlain = originalNotes.replace(/<[^>]*>/g, "").trim();
const currentPlain = notes.replace(/<[^>]*>/g, "").trim();

// if content unchanged → normal save
if (originalPlain === currentPlain) {
  await updateDoc(doc(db, "notes", currentNoteId), {
    title: title,
    content: notes,
  });

  setIsDirty(false);
  router.push(`/deck/${deckId}`);
  return;
}

// 🔴 content changed → show modal
setShowUpdateModal(true);
};


  //SAVE FLASHCARDS
const saveFlashcards = async (cards: FlashcardType[], noteId: string) => {
  try {
    for (const card of cards) {

      // 1. create flashcard
      await addDoc(collection(db, "flashcards"), {
        question: card.question,
        answer: card.answer,
        noteId: noteId,
        deckId: deckId,
        createdAt: serverTimestamp(),
        known: false,
      });

      // 2. update note totals
      await updateDoc(doc(db, "notes", noteId), {
        totalCards: increment(1),
      });

      // 3. update deck totals
      await updateDoc(doc(db, "decks", deckId!), {
        totalCards: increment(1),
      });
    }

  } catch (error) {
    console.error("Error saving flashcards:", error);
  }
};

const deleteAllFlashcards = async () => {
  const snapshot = await getDocs(collection(db, "flashcards"));

  for (const document of snapshot.docs) {
    await deleteDoc(doc(db, "flashcards", document.id));
  }

  
  setFlashcards([]);
  setCurrentIndex(0);
};
const deleteFlashcardsForNote = async (noteId: string) => {
  const q = query(
    collection(db, "flashcards"),
    where("noteId", "==", noteId)
  );

  const snapshot = await getDocs(q);

  let totalDeleted = 0;
  let knownDeleted = 0;

  for (const document of snapshot.docs) {
    const data = document.data();

    if (data.known) {
      knownDeleted++;
    }

    totalDeleted++;

    await deleteDoc(doc(db, "flashcards", document.id));
  }

  return { totalDeleted, knownDeleted };
};

const handleSaveOnly = async () => {
  if (!noteId) return;

  await updateDoc(doc(db, "notes", noteId), {
    title: title,
    content: notes,
  });

  setOriginalNotes(notes);
  setShowUpdateModal(false);
  setIsDirty(false);
};

const handleGoToStudy = async () => {
  if (!noteId) return;

  await updateDoc(doc(db, "notes", noteId), {
    title: title,
    content: notes,
  });

  setShowUpdateModal(false);
  setIsDirty(false);

  router.push(`/study?deckId=${deckId}&noteId=${noteId}`);
};
  
 const goNext = () => {
  if (activeCards.length === 0) return;

  setFlipped(false);

  if (!knownCards.includes(actualIndex)) {
    setStreak(0);
  }

  // ✅ if already at last card → complete session
  if (currentIndex >= activeCards.length - 1) {
    setIsSessionComplete(true);
    return;
  }

  setCurrentIndex((prev) => prev + 1);
};


 const goPrev = () => {
  if (activeCards.length === 0) return;

  setFlipped(false);

  if (!knownCards.includes(actualIndex)) {
    setStreak(0);
  }

  setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
};

useEffect(() => {
  if (flashcards.length > 0) {
    setVisitedCards([0]);
  }
}, [flashcards]);


const activeCards =
  sessionCards.length > 0
    ? sessionCards
    : flashcards.map((_, i) => i);

const actualIndex = activeCards[currentIndex] ?? currentIndex;


const visitedActiveCount = activeCards.filter((i) =>
  visitedCards.includes(i)
).length;

const sessionComplete =
  activeCards.length > 0 &&
  currentIndex === activeCards.length - 1;
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
      {/* INPUT SECTION */}
      <div
  style={{
    width: "100%",
    maxWidth: "600px",
    marginBottom: "40px",
  }}
>
       
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
  <h1 style={{ margin: 0 }}>Flashcards</h1>

  <button
    
      onClick={handleSave}
      
  //disabled={!title.trim() || !notes.trim()}
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
  onChange={(e) => {
  const newTitle = e.target.value;
  setTitle(newTitle);

  const isTitleChanged = newTitle.trim() !== (title || "").trim();
  const normalize = (text: string) =>
    text.replace(/<[^>]*>/g, "").trim();

  const isContentChanged =
    normalize(notes) !== normalize(originalNotes);

  setIsDirty(isTitleChanged || isContentChanged);
}}
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
  onClick={deleteAllFlashcards}
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

        <ReactQuill
  value={notes}
 onChange={(value) => {
  setNotes(value);

  const normalize = (text: string) =>
    text.replace(/<[^>]*>/g, "").trim();

  setIsDirty(
    normalize(value) !== normalize(originalNotes)
  );
}}
  style={{
    width: "100%",
    marginBottom: "12px",
  }}
/>

        
        
      </div>

      {/* FLASHCARD SECTION */}
{challenges.length > 0 && (
  <div style={{ maxWidth: "600px", width: "100%", marginBottom: "20px" }}>
    <h3>Challenge Clips</h3>

    {challenges.map((c, index) => (
      
      
      <div
        key={index}
        style={{
          border: "1px solid #ccc",
          padding: "10px",
          marginBottom: "10px",
          borderRadius: "8px",
        }}
      >
        <p><strong>{c.hook}</strong></p>
        <p>{c.context}</p>
        <p>{c.question}</p>
        <p><strong>Answer:</strong> {c.answer}</p>
        <p>{c.explanation}</p>
      </div>
    ))}
  </div>
)}
{challenges.length > 0 && (
  <div
    style={{
      maxWidth: "600px",
      width: "100%",
      marginBottom: "20px",
      border: "2px solid #16a34a",
      borderRadius: "12px",
      padding: "20px",
    }}
  >
    <h3>Swipe Mode</h3>

    <div style={{ textAlign: "center" }}>
      <h2>{challenges[currentIndex]?.hook}</h2>

      <p>{challenges[currentIndex]?.context}</p>

      <p style={{ fontWeight: "bold", marginTop: "10px" }}>
        {challenges[currentIndex]?.question}
      </p>

      {!showAnswer ? (
        <button
          onClick={() => setShowAnswer(true)}
          style={{ marginTop: "15px" }}
        >
          Reveal Answer
        </button>
      ) : (
        <>
          <p style={{ marginTop: "15px", fontWeight: "bold" }}>
            Answer: {challenges[currentIndex]?.answer}
          </p>
          <p>{challenges[currentIndex]?.explanation}</p>
        </>
      )}

      <div style={{ marginTop: "20px" }}>
        <button
          onClick={() => {
            if (currentIndex > 0) {
              setCurrentIndex(currentIndex - 1);
              setShowAnswer(false);
            }
          }}
          style={{ marginRight: "10px" }}
        >
          ⬅ Prev
        </button>

        <button
          onClick={() => {
            if (currentIndex < challenges.length - 1) {
              setCurrentIndex(currentIndex + 1);
              setShowAnswer(false);
            }
          }}
        >
          Next ➡
        </button>
      </div>
    </div>
  </div>
)}
      {flashcards.length > 0 && !isSessionComplete && !allMastered && (
        <div
          style={{
            flex: 1,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start", // ✅ vertical center
            alignItems: "center",
            gap: "20px",
            marginTop: "20px",
          }}
        >
          {/* CARD */}
          <div
            style={{
              width: "100%",
              maxWidth: "500px",
              height: "200px",
              perspective: "1000px",
              position: "relative",
              zIndex: 1, // 👈 card layer
            }}
          >
            <div
             
              style={{
                width: "100%",
                height: "100%",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  transformStyle: "preserve-3d",
                  transition: "transform 0.5s ease",
                  transform: flipped
                    ? "rotateY(180deg)"
                    : "rotateY(0deg)",
                }}
              >
                {/* FRONT */}
                <div
                     onClick={(e) => {
                      const target = e.target as HTMLElement;

                      if (target.closest("button")) return;

                      setFlipped(true);
                    }}
                     style={{
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                      background: "#e5e5e5",
                      borderRadius: "16px",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "24px",
                      textAlign: "center",
                      backfaceVisibility: "hidden",
                      overflow: "auto",
                      cursor: "pointer",
              }}
                >
                  <div style={{ fontSize: "20px", fontWeight: "600" }}>
                    {flashcards[actualIndex]?.question}
                  </div>
                </div>

                {/* BACK */}
                <div
                  onClick={(e) => {
                    const target = e.target as HTMLElement;

                    if (target.closest("button")) return;

                    setFlipped(false);
                  }}
                  style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    background: "#e5e5e5",
                    borderRadius: "16px",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "24px",
                    textAlign: "center",
                    transform: "rotateY(180deg)",
                    backfaceVisibility: "hidden",
                    overflow: "auto",
                    cursor: "pointer",
                  }}
                >
              
                  <div style={{ fontSize: "18px", lineHeight: "1.5" }}>
                    {flashcards[actualIndex]?.answer}
                  </div>
                </div>
              </div>
            </div>
          </div>
         <p
  style={{
    fontSize: "16px",
    fontWeight: "600",
    marginTop: "60px", // 👈 pushes it DOWN
  }}
>
  🔥 Streak: {streak} | 🏆 Best: {bestStreak}
</p>
          <p style={{ fontSize: "14px", color: "#666", textAlign: "center" }}>
            Card {currentIndex + 1} of {activeCards.length}
          </p>
          <div style={{ width: "100%", maxWidth: "500px" }}>
  <div
    style={{
      height: "6px",
      background: "#ddd",
      borderRadius: "6px",
      overflow: "hidden",
    }}
  >
    <div
      style={{
        width: `${
          activeCards.length === 0
            ? 0
            : ((currentIndex + 1) / activeCards.length) * 100
        }%`,
        background: "#2563eb",
        height: "100%",
      }}
    />
  </div>
</div>
          {/* ACTION BUTTONS */}
          {flipped && (
            <div style={{ display: "flex", gap: "12px",marginTop: "80px", position: "relative",
              zIndex: 2,}}>
              <button
                disabled={knownCards.includes(actualIndex)}
                onClick={async (e) => {
                  e.stopPropagation();

                  const card = flashcards[actualIndex];

                  if (!card.id) return; // safety check

                  // ✅ Update Firebase
                  const prevKnown = card.known || false;
                const newKnown = true;

                // 1. update card
                await updateDoc(doc(db, "flashcards", card.id), {
                known: newKnown,
                });

// 2. update aggregates ONLY if changed
if (prevKnown !== newKnown) {
  await updateDoc(doc(db, "notes", card.noteId), {
    knownCards: increment(1),
  });

  await updateDoc(doc(db, "decks", card.deckId), {
    knownCards: increment(1),
  });
}

                  // ✅ Update local state (for UI)
                  setKnownCards((prev) =>
                    prev.includes(actualIndex) ? prev : [...prev, actualIndex]
                    );
                    setStreak((prev) => {
                    const newStreak = prev + 1;

                    setBestStreak((best) =>
                      newStreak > best ? newStreak : best
                    );

                    return newStreak;
                  });
                }}
                style={{
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "none",
                  background: knownCards.includes(actualIndex) ? "#9ca3af" : "#22c55e",
                  color: "white",
                  cursor: knownCards.includes(actualIndex) ? "not-allowed" : "pointer",
                  opacity: knownCards.includes(actualIndex) ? 0.7 : 1,
                }}
              >
                ✅ {knownCards.includes(actualIndex) ? "✔ Known" : "I know this"}
              </button>

                </div>
          )}

          {/* NAVIGATION */}
          <div style={{ display: "flex", gap: "12px", marginTop: "50px" }}>
  <button
    onClick={goPrev}
    disabled={
      currentIndex === 0 ||
      !flashcards
        .slice(0, currentIndex)
        .some((_, i) => !knownCards.includes(i))
    }
  >
    Prev
    </button>

  <button
  onClick={goNext}
>
  {currentIndex >= activeCards.length - 1 ? "Finish" : "Next"}
</button>
</div>
        </div>
      )}

      {/* MASTERED STATE */}
{(isSessionComplete || allMastered) && flashcards.length > 0 && (
  <div style={{ textAlign: "center", marginTop: "40px" }}>
    
    <h2>🎉 Session Complete!</h2>

    {allMastered ? (
      <p>You’ve mastered all flashcards.</p>
    ) : (
      <p>You’ve reviewed all cards.</p>
    )}

    {/* SHOW TOGGLE ONLY IF SOME KNOWN BUT NOT ALL */}
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
    onClick={async () => {
  const newCards =
    restartMode === "all"
      ? flashcards.map((_, i) => i)
      : flashcards
          .map((_, i) => i)
          .filter((i) => !knownCards.includes(i));

  setSessionCards(newCards);

  if (restartMode === "all") {
  // ✅ Reset Firebase flags
  for (const card of flashcards) {
  if (!card.id) continue;

  const wasKnown = card.known;

  await updateDoc(doc(db, "flashcards", card.id), {
    known: false,
  });

  // decrement aggregates if needed
  if (wasKnown) {
    await updateDoc(doc(db, "notes", card.noteId), {
      knownCards: increment(-1),
    });

    await updateDoc(doc(db, "decks", card.deckId), {
      knownCards: increment(-1),
    });
  }
}

  // ✅ Reset local state
  setKnownCards([]);
}

  setCurrentIndex(0);

  if (newCards.length > 0) {
    setVisitedCards([newCards[0]]);
  } else {
    setVisitedCards([]);
  }

  setFlipped(false);
  setStreak(0);
  setIsSessionComplete(false);
}}
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

      {/* SPINNER */}
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
      `}</style>

<BottomNav
  showAdd={false}
  onHome={() => {
  if (isDirty) {
    setShowLeaveModal(true);
    return;
  }

  router.push("/");
}}
/>

{showLeaveModal && (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 99999,
    }}
  >
    <div
      style={{
        background: "white",
        padding: "20px",
        borderRadius: "12px",
        width: "300px",
        textAlign: "center",
      }}
    >
      <h3 style={{ marginBottom: "10px" }}>
        Unsaved changes
      </h3>

      <p style={{ marginBottom: "20px", fontSize: "14px" }}>
        You have unsaved changes. Are you sure you want to leave?
      </p>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button
          onClick={() => setShowLeaveModal(false)}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            background: "white",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>

        <button
          onClick={() => {
            setShowLeaveModal(false);
            router.push("/");
          }}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "none",
            background: "#dc2626",
            color: "white",
            cursor: "pointer",
          }}
        >
          Leave
        </button>
      </div>
    </div>
  </div>
)}
{errorMessage && (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 99999,
    }}
  >
    <div
      style={{
        background: "white",
        padding: "20px",
        borderRadius: "12px",
        width: "300px",
        textAlign: "center",
      }}
    >
      <h3 style={{ marginBottom: "10px" }}>
        Validation Error
      </h3>

      <p style={{ marginBottom: "20px", fontSize: "14px" }}>
        {errorMessage}
      </p>

      <button
        onClick={() => setErrorMessage("")}
        style={{
          padding: "8px 16px",
          borderRadius: "8px",
          border: "none",
          background: "#2563eb",
          color: "white",
          cursor: "pointer",
        }}
      >
        OK
      </button>
    </div>
  </div>
)}

{showUpdateModal && (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 99999,
    }}
  >
    <div
      style={{
        background: "white",
        padding: "20px",
        borderRadius: "12px",
        width: "320px",
        textAlign: "center",
      }}
    >
      <h3 style={{ marginBottom: "10px" }}>
        Flashcards may be outdated
      </h3>

      <p style={{ marginBottom: "20px", fontSize: "14px" }}>
        You’ve changed your notes. Your flashcards may no longer match.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <button
          onClick={handleSaveOnly}
          style={{
            padding: "10px",
            borderRadius: "8px",
            border: "none",
            background: "#16a34a",
            color: "white",
            cursor: "pointer",
          }}
        >
          Save Only
        </button>

        <button
          onClick={handleGoToStudy}
          style={{
            padding: "10px",
            borderRadius: "8px",
            border: "none",
            background: "#2563eb",
            color: "white",
            cursor: "pointer",
          }}
        >
          Save & Go to Study
        </button>

        <button
          onClick={() => setShowUpdateModal(false)}
          style={{
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            background: "white",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
</main>  );
}
export default function HomeWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Home />
    </Suspense>
  );
}