import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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

    const newMenu = await prisma.menu.create({
      data: {
        name,
        price,
        cost,
        categoryId: categoryId || null,
        prices: {
          create: prices?.map((p) => ({
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

    return NextResponse.json(newMenu, { status: 201 });
  } catch (error) {
    console.error('Failed to create menu:', error);
    return NextResponse.json({ error: 'Failed to create menu' }, { status: 500 });
  }
}
