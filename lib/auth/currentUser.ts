/**
 * Sync auth uid set by AuthProvider (client-only). Used by repositories and services.
 */
let _uid: string | null = null;

/** @internal — only AuthProvider should call this */
export function setAuthUserId(uid: string | null): void {
  _uid = uid;
}

export function getCurrentUserId(): string {
  if (!_uid) {
    throw new Error("Not authenticated");
  }
  return _uid;
}

export function tryGetCurrentUserId(): string | null {
  return _uid;
}
