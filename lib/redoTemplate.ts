"use client";

// Hands a "redo" prefill payload from the document history to the target form
// via sessionStorage, so navigating to the form can pre-populate its lines.

const KEY = "nbc_redo";

export function stashRedo(kind: string, payload: unknown) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ kind, payload }));
  } catch {
    // sessionStorage unavailable — ignore
  }
}

/** Read and consume the redo payload for a given form kind (one-shot). */
export function takeRedo<T = unknown>(kind: string): T | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { kind: string; payload: T };
    if (parsed.kind !== kind) return null;
    sessionStorage.removeItem(KEY);
    return parsed.payload;
  } catch {
    return null;
  }
}
