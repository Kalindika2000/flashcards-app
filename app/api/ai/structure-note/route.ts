import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { MAX_NOTES_LENGTH, requireOpenAiKey } from "@/lib/api/parseNotesBody";
import { rateLimitGenerate } from "@/lib/api/rateLimit";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateStructuredNotes(text: string): Promise<string> {
  const completion = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content:
          "You are an expert educator.\n\nConvert the input into clean, structured Markdown notes.\n\nSTRICT REQUIREMENTS:\n\n* You MUST reorganize content into logical sections\n* You MUST create headings using ## and ###\n* You MUST convert examples and lists into bullet points using -\n* You MUST group related ideas together\n* You MUST break content into short sections\n\nFORMAT RULES:\n\n* Use Markdown headings (##, ###)\n* Use bullet points (-)\n* Add spacing between sections\n* Output must be easy to scan\n\nDO NOT:\n\n* Do NOT return plain paragraphs\n* Do NOT keep original structure if messy\n* Do NOT add new information\n\nOutput MUST be valid Markdown.",
      },
      {
        role: "user",
        content: `Transform the following into structured study notes:\n\n${text}`,
      },
    ],
    temperature: 0.3,
  });

  const structured = completion.choices[0]?.message?.content?.trim();
  if (!structured) {
    throw new Error("Empty model response");
  }
  return structured;
}

export async function POST(req: NextRequest) {
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

  const text =
    body && typeof body === "object" && typeof (body as { text?: unknown }).text === "string"
      ? (body as { text: string }).text.trim()
      : "";

  if (!text) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  if (text.length > MAX_NOTES_LENGTH) {
    return NextResponse.json(
      { error: `text must be at most ${MAX_NOTES_LENGTH} characters` },
      { status: 413 },
    );
  }

  try {
    const structured = await generateStructuredNotes(text);
    return NextResponse.json({ result: structured });
  } catch (error) {
    console.error("POST /api/ai/structure-note:", error);
    return NextResponse.json(
      { error: "Failed to structure note content" },
      { status: 500 },
    );
  }
}
