import { NextResponse } from "next/server";
import OpenAI from "openai";
console.log("🔥 THIS IS THE API FILE BEING USED");
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { notes } = await req.json();

    console.log("NOTES RECEIVED IN API:", notes);

    if (!notes) {
      return NextResponse.json(
        { error: "No notes provided" },
        { status: 400 }
      );
    }

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

    const text = completion.choices[0].message.content;

    console.log("RAW AI RESPONSE:", text);

    let flashcards = [];

    try {
      flashcards = JSON.parse(text || "[]");
    } catch (e) {
      console.error("PARSE FAILED:", text);
      return NextResponse.json(
        { error: "Invalid AI response format" },
        { status: 500 }
      );
    }

    return NextResponse.json({ flashcards });
  } catch (error) {
    console.error("API ERROR:", error);
    return NextResponse.json(
      { error: "Failed to generate flashcards" },
      { status: 500 }
    );
  }
}