import { NextResponse } from "next/server";
import { getVisionResponse } from "../../../../lib/gemini";

export async function POST(req) {
  try {
    const { image, mimeType } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const adjustments = await getVisionResponse(image, mimeType);
    return NextResponse.json({ adjustments });
  } catch (error) {
    console.error("AI Vision API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
