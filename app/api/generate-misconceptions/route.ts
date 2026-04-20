/** POST — body: { question: string, correctAnswer: string }. Returns { content: string }. */

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requireOpenAiKey } from "@/lib/api/parseNotesBody";
import { rateLimitGenerate } from "@/lib/api/rateLimit";
import {
  misconceptionDifficultyRulesForPrompt,
  parseMcqDifficulty,
} from "@/features/study/utils/misconceptionPromptHints";

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
  const question = typeof o.question === "string" ? o.question : "";
  const correctAnswer = typeof o.correctAnswer === "string" ? o.correctAnswer : "";
  const difficulty = parseMcqDifficulty(o.difficulty);

  if (!question.trim() || !correctAnswer.trim()) {
    return NextResponse.json(
      { error: "question and correctAnswer are required", content: "" },
      { status: 400 },
    );
  }

  const prompt = `Given the following question and correct answer, list 6 to 8 common misconceptions or misunderstandings about this concept.

Rules:

* Each misconception must be a complete, standalone statement
* Each must relate to the same concept as the correct answer
* Each must represent a different misunderstanding (not small rewordings)
* Avoid repeating sentence structure
* Keep each between 5–12 words
* Do NOT include the correct answer
* Do NOT return fragments or bullet points
${misconceptionDifficultyRulesForPrompt(difficulty)}

Return ONLY a JSON array of strings.

Question: ${JSON.stringify(question)}

Correct answer: ${JSON.stringify(correctAnswer)}`;

  try {
    const aiRes = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.65,
    });

    const content = aiRes.choices[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ content });
  } catch (e) {
    console.error("POST /api/generate-misconceptions:", e);
    return NextResponse.json({ content: "" }, { status: 500 });
  }
}
