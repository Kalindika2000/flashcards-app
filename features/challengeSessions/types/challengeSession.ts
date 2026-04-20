/**
 * Firestore collection: `challenge_sessions`
 *
 * Document id: auto-generated.
 * Fields:
 * - userId: string (must match request.auth.uid)
 * - noteId: string (note the session was played from)
 * - mode: string (e.g. "standard", "speed_run", "streak")
 * - score: number
 * - correctCount: number
 * - totalQuestions: number
 * - createdAt: Firestore Timestamp (server)
 */
export type ChallengeSessionDoc = {
  userId: string;
  noteId: string;
  mode: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  createdAt: unknown;
};

export type SaveChallengeSessionInput = {
  userId: string;
  noteId: string;
  mode: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
};
