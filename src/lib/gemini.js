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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const contextStr = `
- Periode: ${context.range || 'Hari Ini'}
- Revenue: Rp${context.grossRevenue || 0}
- Orders: ${context.totalOrders || 0}
- Active Shift: ${context.activeShift ? context.activeShift.user : 'None'}
- Low Stock: ${context.lowStockItems?.length || 0} items
      `.trim();

      const prompt = `Context: ${contextStr}\nHistory: ${history.slice(-3).map(h=>h.text).join('|')}\nUser: ${userMessage}\nAnswer as business coach (Bahasa Indonesia, max 2 sentences).`;
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
  if (msg.includes("untung") || msg.includes("cuan") || msg.includes("profit") || msg.includes("revenue") || msg.includes("pendapatan") || msg.includes("uang")) {
    const profit = context.netProfit || 0;
    const rev = context.grossRevenue || 0;
    const cogs = context.cogs || 0;
    if (rev === 0) return "📉 **Status Keuangan**: Belum ada transaksi masuk untuk hari ini. Cobalah tawarkan menu bundling untuk menarik pelanggan pertama!";
    return `💰 **Laporan Finansial**: \n- Omzet: **Rp${rev.toLocaleString()}**\n- Modal Bahan (HPP): Rp${cogs.toLocaleString()}\n- Estimasi Laba Bersih: **Rp${profit.toLocaleString()}**.\nStatus: ${profit > 0 ? 'Positif (Profit)' : 'Kurang Sehat (Loss)'}.`;
  }

  // C. STOCK & INGREDIENTS
  if (msg.includes("stok") || msg.includes("habis") || msg.includes("kurang") || msg.includes("bahan") || msg.includes("bumbu") || msg.includes("kritis")) {
    const lowCount = context.lowStockItems?.length || 0;
    if (lowCount === 0) return "✅ **Kondisi Inventaris**: Luar biasa! Semua bahan baku di gudang 'Vault' dalam kondisi aman dan siap untuk pesanan besar.";
    const list = context.lowStockItems.map(i => i.item_name).join(', ');
    return `⚠️ **Alert Bahan Baku**: Kita punya **${lowCount} bahan kritis** yang sudah di bawah batas minimum: **${list}**. Harap segera hubungi supplier!`;
  }

  // D. BEST SELLERS & MENU PERFORMANCE
  if (msg.includes("laris") || msg.includes("laku") || msg.includes("favorit") || msg.includes("menu") || msg.includes("makanan") || msg.includes("enak")) {
    if (!context.topMenus || context.topMenus.length === 0) return "🍽️ **Analisis Menu**: Data belum cukup untuk menentukan favorit. Mari tunggu beberapa pesanan lagi!";
    const top = context.topMenus[0];
    const top3 = context.topMenus.slice(0, 3).map(m => m.name).join(', ');
    return `🍜 **Juara Hari Ini**: Menu **${top.name}** adalah yang paling laris (${top.qty} unit terjual). \nTop 3 saat ini: ${top3}.`;
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

  // Default Summary Response (If no keyword matches)
  return `📋 **Ringkasan Bisnis [Offline Mode]**:
- Omzet: Rp${(context.grossRevenue || 0).toLocaleString()}
- Pesanan: ${context.totalOrders || 0} (Status: AKTIF)
- Petugas: ${context.activeShift ? context.activeShift.user : 'Belum Ada'}
- Alerts: ${context.lowStockItems?.length || 0} bahan kritis.

Anda bisa tanya spesifik soal stok, profit, atau siapa yang jaga shift!`;
}
