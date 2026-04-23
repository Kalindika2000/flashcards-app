/**
 * Trace Firestore usage for stats collections (`user_card_stats`, `user_flashcard_stats`).
 * Enable by watching the browser / server console during study flows.
 */
export function logStatsUsage(
  type: "READ" | "WRITE",
  collection: string,
  context: string,
  payload?: unknown,
): void {
  console.log(`[${type}][${context}] ${collection}`, payload ?? "");
}
