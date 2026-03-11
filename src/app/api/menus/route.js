import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const withCategory = searchParams.get('category') === 'true';

    const menus = await prisma.menu.findMany({
      include: {
        category: withCategory,
        prices: {
          include: {
            platform: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    });
    return NextResponse.json(menus);
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
    if (typeof price !== 'number' || typeof cost !== 'number') {
      return NextResponse.json({ error: 'price and cost must be numbers' }, { status: 400 });
    }
    if (prices && !Array.isArray(prices)) {
      return NextResponse.json({ error: 'prices must be array' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.menu.create({
        data: {
          name,
          price,
          cost,
          categoryId: categoryId || null,
          prices: {
            create:
              prices?.map((p) => ({
                platform_id: p.platform_id,
                price: p.price,
              })) || [],
          },
        },
        include: {
          category: true,
          prices: { include: { platform: true } },
        },
      });
      return created;
    });

    logger.info('Menu created', { id: result.id, name: result.name });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Failed to create menu:', error);
    return NextResponse.json({ error: 'Failed to create menu' }, { status: 500 });
  }
}
