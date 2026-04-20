/** POST — body: { misconceptions: string[], correctAnswer: string, useRetryPrompt?: boolean }. Returns { content: string }. */

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requireOpenAiKey } from "@/lib/api/parseNotesBody";
import { rateLimitGenerate } from "@/lib/api/rateLimit";

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
  const correctAnswer = typeof o.correctAnswer === "string" ? o.correctAnswer : "";
  const useRetryPrompt = o.useRetryPrompt === true;
  const rawList = o.misconceptions;

  if (!correctAnswer.trim()) {
    return NextResponse.json(
      { error: "correctAnswer is required", content: "" },
      { status: 400 },
    );
  }

  if (!Array.isArray(rawList) || rawList.length < 3) {
    return NextResponse.json(
      { error: "misconceptions must be an array with at least 3 strings", content: "" },
      { status: 400 },
    );
  }

  const misconceptions = rawList
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean);

  if (misconceptions.length < 3) {
    return NextResponse.json(
      { error: "misconceptions must contain at least 3 non-empty strings", content: "" },
      { status: 400 },
    );
  }

  const retryBlock = useRetryPrompt
    ? `

CRITICAL (retry): The three options must be maximally distinct in meaning and opening; do not pick three that share the same template or nearly identical phrasing.`
    : "";

  const prompt = `From the following list of candidate misconceptions, select the best 3 distractors for a multiple choice question.

Rules:

* Must be clearly incorrect but plausible
* Must be distinct from each other (no overlap in meaning)
* Must relate to the same concept as the correct answer
* Avoid very similar phrasing between options
* Each must be a complete, clear statement
* Keep answers concise and readable
* Return exactly three items, each copied or lightly edited from the candidate list only if needed for clarity${retryBlock}

Candidates: ${JSON.stringify(misconceptions)}

Correct answer: ${JSON.stringify(correctAnswer)}

Return ONLY a JSON array of 3 strings.`;

  try {
    const aiRes = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.35,
    });

    const content = aiRes.choices[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ content });
  } catch (e) {
    console.error("POST /api/select-definition-distractors:", e);
    return NextResponse.json({ content: "" }, { status: 500 });
  }
}
