import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseDateRange } from '../utils';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    const { start, end } = parseDateRange(req.nextUrl.searchParams);
    const orders = await prisma.order.findMany({
      where: { status: { in: ['PAID', 'PROCESSING', 'COMPLETED'] }, date: { gte: start, lte: end } },
      include: { orderItems: { include: { menu: true } } },
    });

    const agg = new Map();
    for (const o of orders) {
      for (const it of o.orderItems || []) {
        const key = it.menu_id;
        const prev = agg.get(key) || {
          menu_id: key,
          name: it.menu?.name || `Menu ${key}`,
          qty: 0,
          revenue: 0,
          profit: 0,
        };
        const qty = it.qty || 0;
        prev.qty += qty;
        prev.revenue += (it.price || 0) * qty;
        prev.profit += ((it.price || 0) - (it.cost || 0)) * qty;
        agg.set(key, prev);
      }
    }

    const rows = Array.from(agg.values()).sort((a, b) => b.profit - a.profit);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Failed to fetch menu performance report:', error);
    return NextResponse.json({ error: 'Failed to fetch menu performance report' }, { status: 500 });
  }
}

