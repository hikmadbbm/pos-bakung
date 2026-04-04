// Diagnose Gemini access problem
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("Checking API Key: ", apiKey ? "PRESENT (Length: " + apiKey.length + ")" : "MISSING");
  
  if (!apiKey) return;
  
  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    console.log("Trying models/gemini-1.5-flash...");
    const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });
    const result = await model.generateContent("Hello?");
    console.log("Success with Flash: ", result.response.text());
  } catch (e) {
    console.log("Flash FAILED: ", e.message);
    
    try {
      console.log("Falling back to gemini-pro...");
      const proModel = genAI.getGenerativeModel({ model: "gemini-pro" });
      const proResult = await proModel.generateContent("Hello?");
      console.log("Success with Pro: ", proResult.response.text());
    } catch (pe) {
      console.log("Pro FAILED: ", pe.message);
    }
  }
}

test();
