/** Normalizes thrown values into a user-facing string. */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) {
    return err.message.trim();
  }
  return fallback;
}
