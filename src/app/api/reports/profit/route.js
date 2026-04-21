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
        where: { status: { in: ['PAID', 'PROCESSING', 'COMPLETED'] }, date: { gte: start, lte: end } },
        include: { orderItems: { include: { menu: true } } },
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

    const revenue = orders.reduce((acc, o) => {
      // Prioritize platform settlement if available
      return acc + (o.platform_actual_net || o.net_revenue || (o.total - (o.discount || 0) - (o.commission || 0)));
    }, 0);

    const cogs = orders.reduce((acc, o) => {
      // Exclude consignment costs from our own COGS
      const itemsCogs = (o.orderItems || []).reduce((s, it) => {
        if (it.menu?.productType === 'CONSIGNMENT') return s;
        return s + (it.cost || 0) * (it.qty || 0);
      }, 0);
      return acc + itemsCogs;
    }, 0);

    const grossProfit = revenue - cogs;

    const dailyOverhead = getDailyOverhead(fixedCosts);
    const days = daysBetweenInclusive(start, end);
    const overheadTotal = dailyOverhead * days;
    const itemsExpenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    const totalDeductions = itemsExpenses + overheadTotal;

    const netProfit = Math.round(grossProfit - totalDeductions);

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

