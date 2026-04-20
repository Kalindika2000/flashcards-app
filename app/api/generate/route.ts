import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  parseNotesBody,
  requireOpenAiKey,
} from "@/lib/api/parseNotesBody";
import { rateLimitGenerate } from "@/lib/api/rateLimit";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/** POST — body: { notes: string }. Rate-limited; optional Firebase ID token can be added later. */

function normalizeFlashcards(raw: unknown): Array<{ question: string; answer: string }> {
  if (!Array.isArray(raw)) return [];
  const out: Array<{ question: string; answer: string }> = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const q = (item as { question?: unknown }).question;
    const a = (item as { answer?: unknown }).answer;
    if (typeof q !== "string" || typeof a !== "string") continue;
    const question = q.trim();
    const answer = a.trim();
    if (!question || !answer) continue;
    out.push({ question, answer });
  }
  return out;
}

export async function POST(req: Request) {
  const limited = rateLimitGenerate(req);
  if (limited) return limited;

  const missingKey = requireOpenAiKey();
  if (missingKey) return missingKey;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseNotesBody(body);
  if (!parsed.ok) return parsed.response;

  const { notes } = parsed;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You must return ONLY valid JSON. Format exactly like this: [{\"question\": \"...\", \"answer\": \"...\"}]. No extra text.",
        },
        {
          role: "user",
          content: notes,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content;

    let rawParsed: unknown;
    try {
      rawParsed = JSON.parse(text || "[]");
    } catch {
      console.error("Flashcard AI response JSON parse failed");
      return NextResponse.json(
        { error: "Invalid AI response format" },
        { status: 502 },
      );
    }

    const flashcards = normalizeFlashcards(rawParsed);

    return NextResponse.json({ flashcards });
  } catch (error) {
    console.error("POST /api/generate:", error);
    return NextResponse.json(
      { error: "Failed to generate flashcards" },
      { status: 500 },
    );
  }
}
