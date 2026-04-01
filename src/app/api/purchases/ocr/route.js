import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { verifyAuth } from '@/lib/auth';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    const { response: authRes } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (authRes) return authRes;

    const { image } = await req.json(); // Base64 image
    if (!image) {
      return NextResponse.json({ error: 'No image data provided' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    });

    const prompt = `
      Extract items from this receipt image for a POS purchase entry.
      Analyze the text carefully to identify the business name and items.
      
      Return a JSON object with this structure:
      {
        "supplier": "Business name or Unknown",
        "date": "YYYY-MM-DD",
        "items": [
          {
            "name": "Item Name",
            "quantity": 1.0,
            "unit": "unit type",
            "unit_price": 5000,
            "total_price": 50000
          }
        ],
        "total_bill": 100000
      }
      
      Rules:
      - Clean prices (no Rp, dots, or symbols)
      - If quantity/unit is unclear, try to infer from line context.
    `;

    // Safe parsing of base64 and mime type
    let base64Data = image;
    let mimeType = "image/jpeg";
    
    if (image.includes(';base64,')) {
       const parts = image.split(';base64,');
       mimeType = parts[0].split(':')[1];
       base64Data = parts[1];
    }
    
    console.log(`OCR: Processing ${mimeType} (${Math.round(base64Data.length/1024)}KB)`);

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();
    
    try {
      // Remove any markdown code block indicators if present
      const cleanJson = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      const data = JSON.parse(cleanJson);
      return NextResponse.json(data);
    } catch (e) {
      console.error("OCR Parse Error:", e.message);
      console.log("Raw Response:", text);
      return NextResponse.json({ error: "Failed to parse receipt data", raw: text }, { status: 500 });
    }
  } catch (error) {
    console.error('OCR Controller Error:', error);
    // Log the full error to the server console so user can see it
    if (error.response) {
      console.error('Gemini API Error details:', error.response);
    }
    return NextResponse.json({ 
      error: 'Failed to process receipt', 
      details: error.message 
    }, { status: 500 });
  }
}
