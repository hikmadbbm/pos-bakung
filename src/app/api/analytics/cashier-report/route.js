import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { dayKey, dayRangeUtc } from '../utils';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'CASHIER']);
    if (response) return response;

    const dateStr = req.nextUrl.searchParams.get('date') || new Date().toISOString().slice(0, 10);
    const range = dayRangeUtc(dateStr);
    if (!range) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }

    const [orders, reconciliation] = await Promise.all([
      prisma.order.findMany({
        where: { status: 'COMPLETED', date: { gte: range.start, lte: range.end } },
        select: { id: true, total: true, discount: true, payment_method: true },
      }),
      prisma.cashierReconciliation.findUnique({
        where: { date: dayKey(dateStr) },
      }),
    ]);

    const paymentMethods = {};
    for (const o of orders) {
      const method = o.payment_method || 'UNKNOWN';
      const due = Math.max(0, (o.total || 0) - (o.discount || 0));
      const prev = paymentMethods[method] || { count: 0, amount: 0 };
      prev.count += 1;
      prev.amount += due;
      paymentMethods[method] = prev;
    }

    const totalOrders = orders.length;
    const grossSales = orders.reduce((acc, o) => acc + (o.total || 0), 0);
    const netSales = orders.reduce((acc, o) => acc + Math.max(0, (o.total || 0) - (o.discount || 0)), 0);
    // Rough commission representation if not queried directly
    const totalCommission = grossSales - netSales; 

    return NextResponse.json({
      date: dateStr,
      paymentMethods,
      reconciliation: reconciliation || null,
      summary: {
        totalOrders,
        grossSales,
        netSales,
        totalCommission,
      },
      cashInDrawer: paymentMethods['CASH']?.amount || 0,
    });
  } catch (error) {
    console.error('Failed to fetch cashier report:', error);
    return NextResponse.json({ error: 'Failed to fetch cashier report' }, { status: 500 });
  }
}

