/** POST — body: { items: { flashcardId, question, answer }[] }. Returns { content: string }. */

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requireOpenAiKey } from "@/lib/api/parseNotesBody";
import { rateLimitGenerate } from "@/lib/api/rateLimit";
import {
  misconceptionDifficultyRulesForPrompt,
  parseMcqDifficulty,
} from "@/features/study/utils/misconceptionPromptHints";

const MAX_BATCH = 5;

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function buildPrompt(
  items: {
    flashcardId: string;
    question: string;
    answer: string;
    difficulty?: string;
  }[],
): string {
  const blocks = items
    .map((it, i) => {
      const diff = parseMcqDifficulty(it.difficulty) ?? "medium";
      const diffRules = misconceptionDifficultyRulesForPrompt(diff).trim();
      return `Item ${i + 1}:\nflashcardId: ${JSON.stringify(it.flashcardId)}\nquestion: ${JSON.stringify(it.question)}\ncorrectAnswer: ${JSON.stringify(it.answer)}\n${diffRules}`;
    })
    .join("\n\n");

  return `Given the following questions and correct answers, generate 6 to 8 misconceptions for EACH item.

Rules:

* Each misconception must be a complete, standalone statement
* Each must relate to the same concept as its correct answer
* Each must represent a different misunderstanding
* Avoid repeating sentence structure
* Keep each between 5–12 words
* Do NOT include the correct answer

${blocks}

Return ONLY a JSON object in this format (use the exact flashcardId strings as keys):

{
  "flashcardId1": ["...", "..."],
  "flashcardId2": ["...", "..."]
}`;
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
  const rawItems = o.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return NextResponse.json(
      { error: "items must be a non-empty array", content: "" },
      { status: 400 },
    );
  }

  if (rawItems.length > MAX_BATCH) {
    return NextResponse.json(
      { error: `At most ${MAX_BATCH} items per batch`, content: "" },
      { status: 400 },
    );
  }

  const items: {
    flashcardId: string;
    question: string;
    answer: string;
    difficulty?: string;
  }[] = [];
  for (const row of rawItems) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const flashcardId = typeof r.flashcardId === "string" ? r.flashcardId : "";
    const question = typeof r.question === "string" ? r.question : "";
    const answer = typeof r.answer === "string" ? r.answer : "";
    const difficulty =
      typeof r.difficulty === "string" ? r.difficulty : undefined;
    if (!flashcardId.trim() || !question.trim() || !answer.trim()) {
      return NextResponse.json(
        { error: "Each item needs flashcardId, question, and answer", content: "" },
        { status: 400 },
      );
    }
    items.push({
      flashcardId: flashcardId.trim(),
      question,
      answer,
      difficulty,
    });
  }

  if (items.length === 0) {
    return NextResponse.json({ error: "No valid items", content: "" }, { status: 400 });
  }

  const prompt = buildPrompt(items);

  try {
    const aiRes = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.65,
    });

    const content = aiRes.choices[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ content });
  } catch (e) {
    console.error("POST /api/generate-misconceptions-batch:", e);
    return NextResponse.json({ content: "" }, { status: 500 });
  }
}
