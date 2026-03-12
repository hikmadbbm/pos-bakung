import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/analytics/price-recommendation
 * 
 * Recommends a selling price for each platform so that after the platform
 * deducts its commission, the seller nets AT LEAST the same profit margin
 * they would get from an offline / dine-in sale.
 *
 * Formula: platform_price = basePrice / (1 - commissionRate)
 *
 * Example:
 *   basePrice = 25,000  (offline)
 *   cost      = 10,000  (HPP)
 *   offline profit = 15,000
 *
 *   GoFood 20% commission:
 *     platform_price = 25,000 / (1 - 0.20) = 31,250  → rounded to 31,500
 *     seller nets    = 31,500 × 0.80 = 25,200  ✓ covers offline profit
 */
export async function POST(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    const body = await req.json();
    const { basePrice, cost } = body;

    if (!basePrice || basePrice <= 0) {
      return NextResponse.json({ error: 'basePrice is required and must be > 0' }, { status: 400 });
    }
    if (cost === undefined || cost < 0) {
      return NextResponse.json({ error: 'cost is required and must be >= 0' }, { status: 400 });
    }

    // Fetch actual platforms from the database so IDs are correct
    const platforms = await prisma.platform.findMany({
      select: { id: true, name: true, commission_rate: true, type: true },
      orderBy: { id: 'asc' },
    });

    const baseProfit = basePrice - cost;
    const baseMarginRate = basePrice > 0 ? baseProfit / basePrice : 0;

    const recommendations = {};
    const breakdown = [];

    for (const platform of platforms) {
      const commissionRate = (platform.commission_rate ?? 0) / 100; // stored as percentage

      let recommendedPrice;

      if (platform.type === 'OFFLINE' || commissionRate === 0) {
        // No markup needed for offline/in-house platforms
        recommendedPrice = basePrice;
      } else {
        // Markup so that net-after-commission >= basePrice
        // platform_price × (1 - commissionRate) = basePrice
        // ∴ platform_price = basePrice / (1 - commissionRate)
        const rawPrice = basePrice / (1 - commissionRate);

        // Round UP to nearest 500 so price never undershoots
        recommendedPrice = Math.ceil(rawPrice / 500) * 500;
      }

      recommendations[platform.id] = recommendedPrice;

      const netAfterCommission = Math.round(recommendedPrice * (1 - commissionRate));
      const netProfit = netAfterCommission - cost;

      breakdown.push({
        platform: platform.name,
        platformId: platform.id,
        commissionRate: `${platform.commission_rate ?? 0}%`,
        recommendedPrice,
        netAfterCommission,
        netProfit,
        profitMargin: `${Math.round((netProfit / recommendedPrice) * 100)}%`,
      });
    }

    return NextResponse.json({
      recommendations,
      analysis: {
        basePrice,
        cost,
        baseProfit,
        baseMarginRate: `${Math.round(baseMarginRate * 100)}%`,
        note: 'Prices adjusted so net revenue after commission ≥ offline base price.',
        perPlatform: breakdown,
      },
    });
  } catch (error) {
    console.error('Price recommendation error:', error);
    return NextResponse.json({ error: 'Failed to generate price recommendations' }, { status: 500 });
  }
}
