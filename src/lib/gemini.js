import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function getPromoSuggestion(items, businessGoal, targetMargin = 30) {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        maxOutputTokens: 150,
        temperature: 0.7,
      }
    });

    const prompt = `You are a F&B Pricing Expert for a noodle shop named "Bakmie You-Tje". 
Calculate the best bundle price for the following items based on their COGS (HPP), ensuring a minimum 25% margin.
Current Target Margin: ${targetMargin}%
Business Goal: ${businessGoal} (choose one from: LOSS_LEADER, PROFIT_MAXIMIZER, VOLUME_BOOSTER)

Items:
${items.map(it => `- ${it.name} (Price: Rp${it.price}, HPP: Rp${it.cost})`).join('\n')}

Rules:
1. Use psychological pricing: Suggest prices ending in .900 or .500 (e.g., Rp24.900, Rp29.500).
2. Strategy Context:
   - LOSS_LEADER: Aggressive discount to attract new customers.
   - PROFIT_MAXIMIZER: High margin, premium appeal.
   - VOLUME_BOOSTER: Balanced price to move units fast.
3. Generate:
   - A catchy "Promo Name" (Indonesian).
   - A 1-sentence marketing hook (Indonesian).
   - Suggested Price (Rp).
   - Estimated Profit (Rp).
   - Strategy (choose one: LOSS_LEADER, PROFIT_MAXIMIZER, VOLUME_BOOSTER).

Return ONLY a JSON object with this format:
{
  "promo_name": "...",
  "hook": "...",
  "suggested_price": 24900,
  "estimated_profit": 5000,
  "strategy": "..."
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonStr = text.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}
export async function getChatResponse(userMessage, history = [], context = {}) {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
      }
    });

    const contextStr = `
- Gross Revenue: Rp${context.grossRevenue || 0}
- Net Revenue: Rp${context.netRevenue || 0}
- Pure Profit: Rp${context.netProfit || 0}
- Low Stock: ${context.lowStockItems?.map(i => i.item_name).join(', ') || 'None'}
- Top Selling: ${context.topMenus?.map(m => m.name).join(', ') || 'None'}
    `.trim();

    const historyStr = history.map(msg => 
      `${msg.role === 'user' ? 'Pertanyaan' : 'Jawaban'}: ${msg.text}`
    ).join('\n');

    const prompt = `Anda adalah "Gemini Business Assistant" untuk "Bakmie You-Tje".
Gunakan data berikut untuk menjawab:
${contextStr}

Riwayat chat sebelumnya:
${historyStr}

Pertanyaan sekarang: ${userMessage}

Instruksi:
1. Jawab dalam Bahasa Indonesia yang profesional dan ringkas.
2. Berikan saran praktis jika data terlihat kurang baik (masih 0).
3. Jika ditanya data spesifik, gunakan data di atas.
4. Jangan berikan jawaban teknis, berilah jawaban bisnis.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    const errorMsg = error.message.toLowerCase();
    console.error("Gemini API Error Detail:", error.message);

    // Filter pesan error agar lebih premium & profesional
    if (errorMsg.includes("api key not valid") || errorMsg.includes("expired")) {
      return "Sistem Autentikasi AI memerlukan pembaruan akses. Mohon hubungi administrator sistem untuk sinkronisasi ulang.";
    }
    
    if (errorMsg.includes("quota exceeded") || errorMsg.includes("429")) {
      return "Sesi konsultasi strategis hari ini telah mencapai batas kapasitas maksimum. Analis AI kami sedang beristirahat untuk memproses data global—Mohon hubungi kembali dalam beberapa saat atau esok hari.";
    }

    if (errorMsg.includes("404") || errorMsg.includes("not found")) {
      return "Protokol Intelligence sedang dalam masa pemeliharaan sistem rutin. Layanan akan segera kembali tersedia.";
    }
    
    return "Maaf, sistem analis kami sedang mengalami gangguan sinkronisasi data sementara. Kami sedang memulihkan koneksi untuk memberikan masukan bisnis terbaik bagi Anda.";
  }
}


