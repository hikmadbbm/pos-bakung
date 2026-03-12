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
      where: { status: 'COMPLETED', date: { gte: start, lte: end } },
      select: { id: true, total: true, discount: true },
    });

    const total_orders = orders.length;
    const revenue = orders.reduce((acc, o) => acc + Math.max(0, (o.total || 0) - (o.discount || 0)), 0);

    return NextResponse.json({ total_orders, revenue });
  } catch (error) {
    console.error('Failed to fetch sales report:', error);
    return NextResponse.json({ error: 'Failed to fetch sales report' }, { status: 500 });
  }
}

