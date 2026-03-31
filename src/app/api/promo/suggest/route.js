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

    const { items, business_goal, target_margin } = await req.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items selected' }, { status: 400 });
    }

    try {
      const suggestion = await getPromoSuggestion(items, business_goal, target_margin);
      return NextResponse.json(suggestion);
    } catch (aiError) {
      console.error("AI Suggestion Failed, using fallback:", aiError);
      
      // Fallback Logic: (HPP * 1.3) rounded to nearest 500
      const totalHpp = items.reduce((acc, it) => acc + (it.cost || 0), 0);
      const fallbackPrice = Math.ceil((totalHpp * 1.3) / 500) * 500;
      const profit = fallbackPrice - totalHpp;

      return NextResponse.json({
        promo_name: "Paket Hemat (Manual)",
        hook: "Makin hemat, makin nikmat!",
        suggested_price: fallbackPrice,
        estimated_profit: profit,
        strategy: "FALLBACK",
        is_fallback: true
      });
    }
  } catch (error) {
    console.error('Failed to process promo suggestion:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
