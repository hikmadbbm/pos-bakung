import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getPromoSuggestion } from '@/lib/gemini';
import { checkRateLimit } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { user, response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    // Rate Limit Check
    if (!checkRateLimit(user.id)) {
      return NextResponse.json({ 
        error: 'Batas harian saran AI tercapai. Gunakan kalkulator manual atau coba lagi nanti.' 
      }, { status: 429 });
    }

    const { 
      items, 
      business_goal, 
      target_margin,
      competitor_price,
      market_moment,
      inventory_status 
    } = await req.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items selected' }, { status: 400 });
    }

    try {
      const suggestion = await getPromoSuggestion(items, business_goal, target_margin, {
        competitorPrice: competitor_price,
        marketMoment: market_moment,
        inventoryStatus: inventory_status
      });
      return NextResponse.json(suggestion);
    } catch (aiError) {
      // Diagnostic logging
      try {
        const fs = require('fs');
        const path = require('path');
        const logPath = path.join(process.cwd(), 'tmp_ai_error.log');
        fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] AI Error: ${aiError.message}\nStack: ${aiError.stack}\n`);
      } catch (logErr) {}

      console.error("AI Suggestion Failed, using fallback:", aiError);
      const totalHpp = items.reduce((acc, it) => acc + (it.cost || 0), 0);
      let multiplier = 1.3;
      let reasoning_fallback = "Kalkulasi berbasis target margin standar.";

      if (business_goal === 'LOSS_LEADER') {
        multiplier = 1.05; // 5% margin
        reasoning_fallback = "Fokus pada cuci gudang & penetrasi pasar dengan margin minimal.";
      } else if (business_goal === 'VOLUME_BOOSTER') {
        multiplier = 1.35; // 35% margin
        reasoning_fallback = "Keseimbangan antara volume penjualan dan profitabilitas.";
      } else if (business_goal === 'PROFIT_MAXIMIZER') {
        multiplier = 1.65; // 65% margin
        reasoning_fallback = "Mengoptimalkan keuntungan per unit dengan nilai premium.";
      }

      const fallbackPrice = Math.ceil((totalHpp * multiplier) / 500) * 500;
      const profit = fallbackPrice - totalHpp;

      const firstItemName = items[0]?.name || "MENU";
      return NextResponse.json({
        promo_name: `SMART ${firstItemName.toUpperCase()} BUNDLE (AUTO)`,
        hook: `Optimasi cerdas untuk paket ${business_goal.toLowerCase()} Anda.`,
        suggested_price: fallbackPrice,
        estimated_profit: profit,
        strategy: business_goal,
        reasoning: `${reasoning_fallback} (Mesin AI sedang dalam pemeliharaan, kalkulasi dialihkan ke model lokal)`,
        is_fallback: true
      });
    }
  } catch (error) {
    console.error('Failed to process promo suggestion:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
