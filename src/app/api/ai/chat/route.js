import { NextResponse } from "next/server";
import { getChatResponse } from "../../../../lib/gemini";

export async function POST(req) {
  try {
    const { message, history, context } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "No message provided" }, { status: 400 });
    }

    const response = await getChatResponse(message, history, context);
    return NextResponse.json({ response });
  } catch (error) {
    console.error("AI Chat API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
