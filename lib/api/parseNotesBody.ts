import { NextResponse } from "next/server";

/** Roughly ~30k tokens of text; prevents abuse and runaway API costs. */
export const MAX_NOTES_LENGTH = 120_000;

export type NotesBodyOk = { ok: true; notes: string };
export type NotesBodyErr = { ok: false; response: NextResponse };

export function parseNotesBody(body: unknown): NotesBodyOk | NotesBodyErr {
  if (body === null || typeof body !== "object") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }

  const notes = (body as { notes?: unknown }).notes;
  if (typeof notes !== "string") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Field \"notes\" must be a string" },
        { status: 400 },
      ),
    };
  }

  const trimmed = notes.trim();
  if (trimmed.length === 0) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "notes cannot be empty" },
        { status: 400 },
      ),
    };
  }

  if (trimmed.length > MAX_NOTES_LENGTH) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `notes must be at most ${MAX_NOTES_LENGTH} characters` },
        { status: 413 },
      ),
    };
  }

  return { ok: true, notes: trimmed };
}

export function requireOpenAiKey(): NextResponse | null {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json(
      { error: "Server is not configured for AI generation" },
      { status: 503 },
    );
  }
  return null;
}
