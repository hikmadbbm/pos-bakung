import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { daysBetweenInclusive, getDailyOverhead, parseDateRange } from '../utils';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    const { start, end } = parseDateRange(req.nextUrl.searchParams);
    const [orders, expenses, fixedCosts] = await Promise.all([
      prisma.order.findMany({
        where: { status: 'COMPLETED', date: { gte: start, lte: end } },
        include: { orderItems: true },
      }),
      prisma.expense.findMany({
        where: { date: { gte: start, lte: end } },
        select: { amount: true },
      }),
      prisma.fixedCost.findMany({
        where: { is_active: true },
        select: { amount: true, frequency: true, is_active: true },
      }),
    ]);

    const revenue = orders.reduce((acc, o) => acc + Math.max(0, (o.total || 0) - (o.discount || 0)), 0);
    const cogs = orders.reduce((acc, o) => {
      const itemsCogs = (o.orderItems || []).reduce((s, it) => s + (it.cost || 0) * (it.qty || 0), 0);
      return acc + itemsCogs;
    }, 0);

    const grossProfit = revenue - cogs;

    const dailyOverhead = getDailyOverhead(fixedCosts);
    const days = daysBetweenInclusive(start, end);
    const overheadTotal = dailyOverhead * days;
    const expensesTotal = expenses.reduce((acc, e) => acc + (e.amount || 0), 0) + overheadTotal;

    const netProfit = Math.round(grossProfit - expensesTotal);

    return NextResponse.json({
      revenue,
      cogs,
      grossProfit,
      netProfit,
    });
  } catch (error) {
    console.error('Failed to fetch profit report:', error);
    return NextResponse.json({ error: 'Failed to fetch profit report' }, { status: 500 });
  }
}

