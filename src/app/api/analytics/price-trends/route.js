import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    const ingredients = await prisma.ingredient.findMany({
      include: {
        price_history: {
          orderBy: { date: 'asc' }
        }
      }
    });

    const trends = ingredients.map(ing => {
      const history = ing.price_history;
      if (history.length < 2) {
        return {
          id: ing.id,
          name: ing.item_name,
          trend: 'STABLE',
          change: 0,
          prediction: ing.price,
          confidence: 'LOW'
        };
      }

      const latest = history[history.length - 1].price;
      const previous = history[history.length - 2].price;
      const change = ((latest - previous) / previous) * 100;

      let trend = 'STABLE';
      if (change > 2) trend = 'UP';
      else if (change < -2) trend = 'DOWN';

      // Simple prediction: linear extrapolation
      const prediction = Math.round(latest * (1 + change / 100));

      return {
        id: ing.id,
        name: ing.item_name,
        trend,
        change: Math.round(change * 10) / 10,
        prediction,
        confidence: history.length > 3 ? 'HIGH' : 'MEDIUM'
      };
    });

    return NextResponse.json(trends);
  } catch (error) {
    console.error('Price trend analysis failed:', error);
    return NextResponse.json({ error: 'Failed to analyze trends' }, { status: 500 });
  }
}
