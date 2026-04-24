import { NextResponse } from "next/server";
import OpenAI from "openai";
import { htmlToPlainText } from "@/lib/api/htmlToPlainText";
import { MAX_NOTES_LENGTH, requireOpenAiKey } from "@/lib/api/parseNotesBody";
import { rateLimitGenerate } from "@/lib/api/rateLimit";
import { buildNoteSummaryPrompt } from "@/lib/prompts/noteSummaryPrompt";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const raw = typeof o.noteContent === "string" ? o.noteContent : "";
  const trimmedRaw = raw.trim();
  if (!trimmedRaw) {
    return NextResponse.json({ error: "noteContent is required" }, { status: 400 });
  }
  if (trimmedRaw.length > MAX_NOTES_LENGTH) {
    return NextResponse.json(
      { error: `noteContent must be at most ${MAX_NOTES_LENGTH} characters` },
      { status: 413 },
    );
  }

  const plain = htmlToPlainText(trimmedRaw);
  if (!plain.trim()) {
    return NextResponse.json({ error: "No readable text in notes" }, { status: 400 });
  }

  const prompt = buildNoteSummaryPrompt(plain);

  try {
    const aiRes = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    });

    const summary = aiRes.choices[0]?.message?.content?.trim();
    if (!summary) {
      return NextResponse.json({ error: "Empty model response" }, { status: 502 });
    }

    return NextResponse.json({ summary });
  } catch (e) {
    console.error("POST /api/summarize-notes:", e);
    return NextResponse.json({ error: "Failed to summarize notes" }, { status: 500 });
  }
}
