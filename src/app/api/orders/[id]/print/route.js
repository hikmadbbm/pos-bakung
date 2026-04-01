import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const orderId = Number(id);
    
    if (!Number.isFinite(orderId)) {
      return NextResponse.json({ error: 'Invalid order id' }, { status: 400 });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        print_count: {
          increment: 1
        }
      },
      include: {
        orderItems: { include: { menu: true } },
        platform: true,
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to increment print count:', error);
    return NextResponse.json({ error: 'Failed to increment print count' }, { status: 500 });
  }
}
