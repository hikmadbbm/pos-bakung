import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    // Fetch menus with their linked recipes
    const menus = await prisma.menu.findMany({
      include: {
        recipe: true
      },
      where: {
        status: 'AVAILABLE'
      }
    });

    const suggestions = [];

    // Analyze individual items
    const highMarginItems = menus
      .filter(m => m.recipe && m.price > 0)
      .map(m => {
        const hpp = m.recipe.total_hpp || 0;
        const profit = m.price - hpp;
        const margin = (profit / m.price);
        return { ...m, hpp, margin, profit };
      })
      .sort((a, b) => b.margin - a.margin);

    // Suggest Bundles
    // 1. High Margin + Low Margin (Cross-selling)
    if (highMarginItems.length >= 2) {
      const top = highMarginItems[0];
      const bottom = highMarginItems[highMarginItems.length - 1];
      
      suggestions.push({
        type: 'COMBO_SAVER',
        items: [top.name, bottom.name],
        reason: 'Bundle a high-margin item with a popular item to increase average order value.',
        recommended_price: Math.ceil((top.price + bottom.price) * 0.9 / 1000) * 1000,
        est_margin: Math.round(((top.profit + bottom.profit - ((top.price + bottom.price) * 0.1)) / ((top.price + bottom.price) * 0.9)) * 100)
      });
    }

    // 2. High Margin Pair (Profit Booster)
    if (highMarginItems.length >= 2) {
      const p1 = highMarginItems[0];
      const p2 = highMarginItems[1];

      suggestions.push({
        type: 'PROFIT_BOOSTER',
        items: [p1.name, p2.name],
        reason: 'Pairing two high-margin items at a slight discount to maximize profit per transaction.',
        recommended_price: Math.ceil((p1.price + p2.price) * 0.95 / 1000) * 1000,
        est_margin: Math.round(((p1.profit + p2.profit - ((p1.price + p2.price) * 0.05)) / ((p1.price + p2.price) * 0.95)) * 100)
      });
    }

    return NextResponse.json({
      high_margin_analysis: highMarginItems.slice(0, 5).map(m => ({ name: m.name, margin: Math.round(m.margin * 100) + '%' })),
      suggestions
    });
  } catch (error) {
    console.error('Bundling analysis failed:', error);
    return NextResponse.json({ error: 'Failed to analyze bundling' }, { status: 500 });
  }
}
