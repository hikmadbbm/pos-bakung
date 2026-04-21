/**
 * Bakmie You-Tje Intelligence System
 * Dual-Mode: Gemini (Cloud) & Neural Local Analyst (Offline)
 */
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * High-performance promo suggestion (Requires Gemini)
 */
export async function getPromoSuggestion(items, businessGoal, ...args) {
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) return { promo_name: "Promo Hemat Bakmie", hook: "Diskon hari ini!", suggested_price: 0 };
  
  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" }, { apiVersion: "v1beta" });
    const prompt = `Suggest a bundle for: ${items.map(i => i.name).join(', ')}. Goal: ${businessGoal}. Format: JSON`;
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  } catch (e) {
    return { promo_name: "Manual Bundle (Offline)", hook: "Paket hemat pilihan kami", suggested_price: 0 };
  }
}

/**
 * Dual-Mode Chatbot: Trained with deep local context for offline mode
 */
export async function getChatResponse(userMessage, history = [], context = {}) {
  const msg = userMessage.toLowerCase();
  const apiKey = process.env.GEMINI_API_KEY || "";

  // 1. ATTEMPT GEMINI CLOUD (IF KEY AVAILABLE & NETWORK OK)
  if (apiKey && apiKey.startsWith("AIza")) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" }, { apiVersion: "v1beta" });
      
      const prompt = `
        You are "Tje Strategic Assistant", a dedicated personal advisor for the Bakmie You-Tje brand.
        
        Business Context:
        - Reporting Period: ${context.range || 'Hari Ini'}
        - Gross Revenue: Rp${context.grossRevenue || 0}
        - Total Orders: ${context.totalOrders || 0}
        - HPP (COGS): Rp${context.cogs || 0}
        - Top Products: ${context.topMenus?.map(m => `${m.name} (${m.qty})`).join(', ') || 'No data'}
        - Active Staff: ${context.activeShift ? context.activeShift.user : 'None'}
        - Inventory Alerts: ${context.lowStockItems?.length || 0} items critical.
        
        System Rules:
        - Use professional yet encouraging Bahasa Indonesia.
        - NEVER use bold text (**), asterisks, or markdown lists.
        - Focus on providing strategic advice based on NET profit (Revenue - COGS).
        - If inventory is low, suggest immediate action in a natural sentence.
        - Write in clean, well-spaced paragraphs like a personal advisor.
        - Keep response under 4 sentences.
        
        User Message: "${userMessage}"
        History: ${history.slice(-3).map(h=>`${h.role}: ${h.text}`).join(' | ')}
        
        Answer naturally:
      `;
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      console.warn("Gemini Cloud Failed, Switching to Neural Local Analyst...", err.message);
    }
  }

  // 2. NEURAL LOCAL ANALYST (TRAINED OFFLINE MODE)
  // Comprehensive rule-based knowledge base
  
  // A. SHIFT & EMPLOYEES
  if (msg.includes("shift") || msg.includes("siapa") || msg.includes("jaga") || msg.includes("karyawan") || msg.includes("petugas") || msg.includes("kasir")) {
    if (context.activeShift) {
      return `🤵 **Petugas Aktif**: Saat ini shift dipimpin oleh **${context.activeShift.user}**. Beliau mulai bertugas pada ${new Date(context.activeShift.started).toLocaleTimeString()}. Jangan lupa ingatkan beliau untuk rekon kas saat tutup!`;
    }
    return "😴 **Data Shift**: Sistem saat ini tidak mendeteksi adanya shift aktif (CLOSE). Silakan minta petugas untuk memulai shift terlebih dahulu di menu 'Shift'.";
  }

  // B. FINANCIAL & REVENUE
  if (msg.includes("untung") || msg.includes("cuan") || msg.includes("profit") || msg.includes("revenue") || msg.includes("pendapatan") || msg.includes("uang") || msg.includes("omzet") || msg.includes("setoran")) {
    const profit = context.netProfit || 0;
    const rev = context.grossRevenue || 0;
    const cogs = context.cogs || 0;
    if (rev === 0) return "Status Keuangan: Belum ada transaksi masuk untuk hari ini. Cobalah tawarkan menu bundling untuk menarik pelanggan pertama!";
    return `Laporan Finansial: \n- Omzet: Rp${rev.toLocaleString()}\n- Modal Bahan (HPP): Rp${cogs.toLocaleString()}\n- Estimasi Laba Bersih: Rp${profit.toLocaleString()}.\n\nStatus bisnis Anda saat ini berada dalam kondisi ${profit > 0 ? 'positif' : 'perlu perhatian'}.`;
  }

  // C. STOCK & INGREDIENTS
  if (msg.includes("stok") || msg.includes("habis") || msg.includes("kurang") || msg.includes("bahan") || msg.includes("bumbu") || msg.includes("kritis") || msg.includes("gudang")) {
    const lowCount = context.lowStockItems?.length || 0;
    if (lowCount === 0) return "Kondisi Inventaris: Luar biasa! Semua bahan baku di gudang dalam kondisi aman dan siap untuk pesanan besar.";
    const list = context.lowStockItems.map(i => i.item_name).join(', ');
    return `Alert Bahan Baku: Kita punya ${lowCount} bahan kritis yang sudah di bawah batas minimum: ${list}. Harap segera lakukan pengadaan stok.`;
  }

  // D. BEST SELLERS & MENU PERFORMANCE
  if (msg.includes("laris") || msg.includes("laku") || msg.includes("favorit") || msg.includes("menu") || msg.includes("makanan") || msg.includes("enak") || msg.includes("jual")) {
    if (!context.topMenus || context.topMenus.length === 0) return "Analisis Menu: Data belum cukup untuk menentukan favorit. Mari tunggu beberapa pesanan lagi!";
    const top = context.topMenus[0];
    const top3 = context.topMenus.slice(0, 3).map(m => m.name).join(', ');
    return `Juara Hari Ini: Menu ${top.name} adalah yang paling laris (${top.qty} unit terjual). \n\nTop 3 saat ini adalah: ${top3}.`;
  }

  // E. PAYMENTS & TRANSACTIONS
  if (msg.includes("bayar") || msg.includes("cash") || msg.includes("qris") || msg.includes("transaksi") || msg.includes("metode")) {
    if (!context.paymentDistribution || context.paymentDistribution.length === 0) return "💳 **Metode Bayar**: Belum ada data pembayaran masuk.";
    const dist = context.paymentDistribution.map(p => `${p.payment_method}: ${p._count.id}x`).join('\n');
    return `💳 **Distribusi Pembayaran**: \n${dist}\nPastikan jumlah cash di laci sesuai dengan catatan ini ya!`;
  }

  // F. CLOSING & RECONCILIATION
  if (msg.includes("tutup") || msg.includes("selesai") || msg.includes("pulang") || msg.includes("akhir") || msg.includes("rekon")) {
    return "🔚 **Instruksi Tutup Toko**: \n1. Pastikan semua order sudah status 'COMPLETED'.\n2. Cek total cash di laci.\n3. Masuk ke halaman 'Shift' untuk input Closing Balance.\n4. Cetak laporan shift terakhir untuk Owner.";
  }

  // G. SYSTEM & APP INFO
  if (msg.includes("pos") || msg.includes("bakung") || msg.includes("aplikasi") || msg.includes("versi") || msg.includes("sapa")) {
    return "🤖 **Sistem POS Bakung**: Saya adalah asisten offline Anda (v1.0-Local). Saya dirancang untuk memantau data 'Bakmie You-Tje' secara instan tanpa perlu internet.";
  }

  // H. HELP & SALUTATIONS
  if (msg.includes("bantu") || msg.includes("halo") || msg.includes("hai") || msg.includes("test") || msg.includes("pagi") || msg.includes("siang") || msg.includes("malam")) {
    return "👋 **Halo, Juragan Bakmie!** Saya siap membantu memantau bisnis Anda offline. Tanyakan hal berikut:\n- *'Siapa yang jaga shift?'*\n- *'Berapa untung hari ini?'*\n- *'Daftar bahan yang habis'*\n- *'Menu apa yang paling laku?'*\n\nAda yang bisa saya carikan datanya?";
  }

  // I. PROBLEM & ERROR (SELF-HELP)
  if (msg.includes("error") || msg.includes("mati") || msg.includes("rusak") || msg.includes("masalah") || msg.includes("sulit")) {
    return "🛠️ **Diagnosa Masalah**: \n1. Jika data 0: Cek koneksi database atau pastikan shift sudah dibuka. \n2. Jika AI mati: Saya otomatis aktif dalam mode 'Local Analyst' untuk menjamin operasional tidak terhenti.";
  }

  return `Berikut adalah ringkasan bisnis Anda saat ini:
- Omzet: Rp${(context.grossRevenue || 0).toLocaleString()}
- Pesanan: ${context.totalOrders || 0}
- Petugas Shift: ${context.activeShift ? context.activeShift.user : 'Belum Ada'}
- Alerts: ${context.lowStockItems?.length || 0} bahan kritis.

Tanyakan hal spesifik soal stok, profit, atau siapa yang jaga shift agar saya bisa membantu lebih detail.`;
}

/**
 * VISION: OCR & Adjustment Extraction
 * Extracts labels and values from delivery app screenshots
 */
export async function getVisionResponse(base64Data, mimeType = "image/jpeg") {
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" }, { apiVersion: "v1beta" });

    const prompt = `
      Analyze this income report screenshot from a delivery app (GrabFood, GoFood, or ShopeeFood).
      Extract any fees, commissions, or adjustments listed.
      Return ONLY a JSON array of objects with "label" and "value" (positive numeric value for deductions/fees).
      Example Output: [{"label": "Komisi Platform", "value": 4000}, {"label": "Biaya Small Order", "value": 2000}]
      If no fees found, return empty array [].
      Do not include any other text, just the JSON array.
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      }
    ]);

    const text = result.response.text();
    // Clean potential markdown code blocks
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Gemini Vision Error:", error);
    throw new Error("Failed to process image: " + error.message);
  }
}
