/** POST — body: { question: string, correctAnswer: string }. Returns { distractors: string[] }. */

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requireOpenAiKey } from "@/lib/api/parseNotesBody";
import { rateLimitGenerate } from "@/lib/api/rateLimit";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function parseStringArrayFromText(text: string): string[] {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
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

  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const question = typeof o.question === "string" ? o.question : "";
  const correctAnswer = typeof o.correctAnswer === "string" ? o.correctAnswer : "";
  const questionKind = o.questionKind === "definition" ? "definition" : undefined;
  if (!question.trim() || !correctAnswer.trim()) {
    return NextResponse.json(
      { error: "question and correctAnswer are required", distractors: [] },
      { status: 400 },
    );
  }

  const definitionHint =
    questionKind === "definition"
      ? `
Each wrong answer must be a short phrase or term (at most ~12 words), same general style as a definition or glossary entry. Plausible but clearly incorrect.`
      : "";

  const prompt = `Generate 3 plausible but incorrect answers for the following question.
Match the format and length of the correct answer.
Return ONLY a JSON array of strings.
${definitionHint}

Question: ${question}
Correct answer (do not repeat or paraphrase as correct): ${correctAnswer}`;

  try {
    const aiRes = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const text = aiRes.choices[0]?.message?.content?.trim();
    if (!text) {
      return NextResponse.json({ distractors: [] });
    }

    const arr = parseStringArrayFromText(text);
    const distractors = arr
      .filter((s) => s !== correctAnswer.trim())
      .slice(0, 3);

    return NextResponse.json({ distractors });
  } catch (e) {
    console.error("POST /api/generate-distractors:", e);
    return NextResponse.json(
      { error: "Failed to generate distractors", distractors: [] },
      { status: 500 },
    );
  }
}
