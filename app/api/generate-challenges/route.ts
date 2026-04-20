/** POST — body: { notes: string }. Rate-limited; optional Firebase ID token can be added later. */

import { NextResponse } from "next/server";
import {
  parseNotesBody,
  requireOpenAiKey,
} from "@/lib/api/parseNotesBody";
import { rateLimitGenerate } from "@/lib/api/rateLimit";

function isChallengeRecord(x: unknown): x is {
  hook: string;
  context: string;
  question: string;
  answer: string;
  explanation: string;
} {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.hook === "string" &&
    typeof o.context === "string" &&
    typeof o.question === "string" &&
    typeof o.answer === "string" &&
    typeof o.explanation === "string"
  );
}

function normalizeChallenges(parsed: unknown): unknown[] {
  if (!parsed || typeof parsed !== "object") return [];
  const challenges = (parsed as { challenges?: unknown }).challenges;
  if (!Array.isArray(challenges)) return [];
  return challenges.filter(isChallengeRecord);
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

  const prompt = `Generate 3 short challenge clips from these notes:

${notes}

Return JSON in this format:
{
  "challenges": [
    {
      "hook": "...",
      "context": "...",
      "question": "...",
      "answer": "...",
      "explanation": "..."
    }
  ]
}`;

  try {
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => "");
      console.error("OpenAI HTTP error:", aiRes.status, errText.slice(0, 500));
      return NextResponse.json(
        { error: "Upstream AI request failed", challenges: [] },
        { status: 502 },
      );
    }

    const aiData = (await aiRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const text = aiData?.choices?.[0]?.message?.content;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ challenges: [] });
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON object found in challenge AI response");
      return NextResponse.json({ challenges: [] });
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("Challenge AI response JSON parse failed");
      return NextResponse.json({ challenges: [] });
    }

    const challenges = normalizeChallenges(parsedJson);

    return NextResponse.json({ challenges });
  } catch (error) {
    console.error("POST /api/generate-challenges:", error);
    return NextResponse.json(
      { error: "Failed to generate challenges", challenges: [] },
      { status: 500 },
    );
  }
}
