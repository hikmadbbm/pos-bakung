import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      where: { status: 'PENDING' },
      orderBy: { date: 'desc' },
      take: 50,
      include: {
        orderItems: { include: { menu: { include: { category: true } } } },
        platform: true,
      },
    });
    return NextResponse.json(orders);
  } catch (error) {
    console.error('Failed to fetch pending orders:', error);
    return NextResponse.json({ error: 'Failed to fetch pending orders' }, { status: 500 });
  }
}

