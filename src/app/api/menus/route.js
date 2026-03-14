import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req) {
  const startTime = Date.now();
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'KITCHEN', 'CASHIER']);
    if (response) return response;

    const searchParams = req.nextUrl.searchParams;
    const all = searchParams.get('all') === 'true';

    const where = {};
    if (!all) {
      where.is_active = true;
    }

    const menus = await prisma.menu.findMany({
      where,
      select: {
        id: true,
        name: true,
        price: true,
        cost: true,
        categoryId: true,
        is_active: true,
        category: {
          select: { id: true, name: true, color: true }
        },
        prices: {
          select: { platform_id: true, price: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    
    const normalized = menus.map((m) => {
      const prices = {};
      for (const p of m.prices || []) {
        prices[p.platform_id] = p.price;
      }
      return {
        ...m,
        prices,
        profit: (m.price || 0) - (m.cost || 0),
      };
    });

    const duration = Date.now() - startTime;
    console.log(`GET /api/menus took ${duration}ms`);

    return NextResponse.json(normalized, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
      }
    });
  } catch (error) {
    console.error('Failed to fetch menus:', error);
    return NextResponse.json({ error: 'Failed to fetch menus' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, price, cost, categoryId, prices } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    const p0 = Number(price);
    const c0 = Number(cost);
    if (!Number.isFinite(p0) || !Number.isFinite(c0)) {
      return NextResponse.json({ error: 'price and cost must be numbers' }, { status: 400 });
    }

    let priceRows = [];
    if (prices) {
      if (Array.isArray(prices)) {
        priceRows = prices;
      } else if (typeof prices === 'object') {
        priceRows = Object.entries(prices).map(([platform_id, v]) => ({
          platform_id: Number(platform_id),
          price: Number(v),
        }));
      } else {
        return NextResponse.json({ error: 'prices must be object or array' }, { status: 400 });
      }
      priceRows = priceRows
        .filter((r) => Number.isFinite(Number(r.platform_id)) && Number.isFinite(Number(r.price)))
        .map((r) => ({ platform_id: Number(r.platform_id), price: Math.round(Number(r.price)) }));
    }

    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.menu.create({
        data: {
          name,
          price: Math.round(p0),
          cost: Math.round(c0),
          categoryId: categoryId ? Number(categoryId) : null,
          prices: {
            create:
              priceRows?.map((p) => ({
                platform_id: p.platform_id,
                price: p.price,
              })) || [],
          },
        },
        include: {
          category: true,
          prices: { select: { platform_id: true, price: true } },
        },
      });
      return created;
    });

    logger.info('Menu created', { id: result.id, name: result.name });
    const normalizedPrices = {};
    for (const p of result.prices || []) {
      normalizedPrices[p.platform_id] = p.price;
    }
    return NextResponse.json(
      { ...result, prices: normalizedPrices, profit: (result.price || 0) - (result.cost || 0) },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create menu:', error);
    return NextResponse.json({ error: 'Failed to create menu' }, { status: 500 });
  }
}
