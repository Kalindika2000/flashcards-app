import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { notes } = await req.json();

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

    const aiData = await aiRes.json();

    const text = aiData?.choices?.[0]?.message?.content;

if (!text) {
  return NextResponse.json({ challenges: [] });
}

// 🔍 DEBUG: see raw AI output
console.log("AI RAW:", text);

// ✅ Extract JSON safely (even if extra text exists)
const jsonMatch = text.match(/\{[\s\S]*\}/);

if (!jsonMatch) {
  console.error("No JSON found in AI response");
  return NextResponse.json({ challenges: [] });
}

let parsed;

try {
  parsed = JSON.parse(jsonMatch[0]);
} catch (e) {
  console.error("JSON parse failed:", jsonMatch[0]);
  return NextResponse.json({ challenges: [] });
}

    return NextResponse.json(parsed);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ challenges: [] });
  }
}