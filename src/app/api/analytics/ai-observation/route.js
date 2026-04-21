import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { user, response: authResponse } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (authResponse) return authResponse;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Check if observation already exists for today
    const existingLog = await prisma.userActivityLog.findFirst({
      where: {
        action: 'AI_OBSERVATION_GENERATED',
        created_at: { gte: today }
      },
      orderBy: { created_at: 'desc' }
    });

    if (existingLog && existingLog.details?.observation) {
      return NextResponse.json({ 
        observation: existingLog.details.observation,
        isCached: true 
      });
    }

    let body = {};
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }
    const { data = [], thresholds = {} } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        observation: "Koneksi Gemini API belum terdeteksi. Silakan hubungi admin untuk aktivasi AI Intelligence." 
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const context = `
      Data Analitik Menu:
      ${(data || []).map(m => `- ${m.name}: Qty=${m.total_qty}, Profit=Rp${m.net_profit}, Status=${m.status}`).join('\n')}
      
      Ambang Batas (Thresholds):
      Rata-rata Laba: Rp${thresholds?.avgProfit || 0}
      Rata-rata Qty: ${thresholds?.avgQty || 0}
    `;

    const prompt = `
      Anda adalah "Tje Strategic Assistant", penasihat bisnis pribadi untuk restoran "Bakmie You-Tje". 
      Analisa data performa menu yang diberikan berikut ini:
      
      ${context}
      
      Tulislah hasil analisa Anda dalam format narasi yang mengalir seperti membaca sebuah e-book atau kolom opini bisnis di koran berkualitas.
      
      Aturan Penulisan:
      1. JANGAN gunakan tanda bintang (**), tanda pagar (#), atau format BOLD lainnya.
      2. JANGAN gunakan daftar poin (bullet points).
      3. TULIS DALAM SATU PARAGRAF SAJA (MAKSIMAL 4-5 KALIMAT).
      4. Gunakan bahasa Indonesia yang formal namun hangat dan intuitif.
      5. Fokuslah pada memberikan saran strategis mengenai efisiensi biaya, pengelolaan menu yang kurang laku, dan strategi peningkatan omzet.
      
      Hasil akhir harus berupa teks polos yang bersih, elegan, dan nyaman dibaca secara mengalir dalam satu paragraf tunggal.
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // 3. Save to log
    await prisma.userActivityLog.create({
      data: {
        user_id: user.id,
        action: 'AI_OBSERVATION_GENERATED',
        entity: 'ANALYTICS',
        details: { observation: text }
      }
    });

    return NextResponse.json({ observation: text });
  } catch (error) {
    console.error('AI Observation Error:', error);
    return NextResponse.json({ observation: "Gagal memuat observasi AI." }, { status: 500 });
  }
}
