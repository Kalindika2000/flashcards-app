/** POST — body: { answer: string }. Returns { formatted: string }. */

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requireOpenAiKey } from "@/lib/api/parseNotesBody";
import { rateLimitGenerate } from "@/lib/api/rateLimit";
import { parseFormattedMcqResponse } from "@/features/study/utils/mcqFormatParse";
import { simplifyAnswer } from "@/features/study/utils/simplifyAnswer";

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
  const answer = typeof o.answer === "string" ? o.answer : "";
  if (!answer.trim()) {
    return NextResponse.json({ error: "answer is required", formatted: "" }, { status: 400 });
  }

  const fallback = simplifyAnswer(answer).trim() || answer.trim();

  const prompt = `Rewrite the following answer into a short multiple-choice option.

Rules:
* Max 5–7 words
* No full sentences
* Keep key facts (numbers, %, dates)
* Remove filler words
* Return ONLY the phrase

Answer:
${JSON.stringify(answer)}`;

  try {
    const aiRes = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const text = aiRes.choices[0]?.message?.content?.trim() ?? "";
    const formatted = parseFormattedMcqResponse(text, fallback);

    return NextResponse.json({ formatted });
  } catch (e) {
    console.error("POST /api/format-mcq-answer:", e);
    return NextResponse.json({ formatted: fallback });
  }
}
