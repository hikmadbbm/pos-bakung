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

    const [orders, reconciliation, shifts] = await Promise.all([
      prisma.order.findMany({
        where: { status: 'COMPLETED', date: { gte: range.start, lte: range.end } },
        select: { 
          id: true, 
          total: true, 
          discount: true, 
          payment_method_id: true,
          platform_id: true,
          commission: true,
          payment_method: true,
          paymentMethod: { select: { name: true, type: true } },
          platform: { select: { name: true } }
        },
      }),
      prisma.cashierReconciliation.findUnique({
        where: { date: dayKey(dateStr) },
      }),
      prisma.userShift.findMany({
        where: { 
          status: 'CLOSED',
          end_time: { gte: range.start, lte: range.end }
        },
        include: {
          user: { select: { username: true, name: true } }
        },
        orderBy: { end_time: 'desc' }
      })
    ]);

    const paymentMethods = {};
    const platforms = {};

    for (const o of orders) {
      const method = o.paymentMethod?.name || o.payment_method || 'CASH';
      const platformName = o.platform?.name || 'OFFLINE';
      const net = Math.max(0, (o.total || 0) - (o.discount || 0));
      const commission = Number(o.commission || 0);
      const revenue = Math.max(0, net - commission);
      
      // Payment Methods Aggregation
      const prevMethod = paymentMethods[method] || { count: 0, amount: 0, revenue: 0 };
      prevMethod.count += 1;
      prevMethod.amount += net;
      prevMethod.revenue += revenue;
      paymentMethods[method] = prevMethod;

      // Platforms Aggregation
      const prevPlatform = platforms[platformName] || { count: 0, amount: 0, revenue: 0 };
      prevPlatform.count += 1;
      prevPlatform.amount += net;
      prevPlatform.revenue += revenue;
      platforms[platformName] = prevPlatform;
    }

    const totalOrders = orders.length;
    const grossSales = orders.reduce((acc, o) => acc + (o.total || 0), 0);
    const netSales = orders.reduce((acc, o) => acc + Math.max(0, (o.total || 0) - (o.discount || 0)), 0);
    const finalRevenue = Object.values(paymentMethods).reduce((acc, m) => acc + m.revenue, 0);

    return NextResponse.json({
      date: dateStr,
      paymentMethods,
      platforms,
      shifts,
      reconciliation: reconciliation || null,
      summary: {
        totalOrders,
        grossSales,
        netSales,
        finalRevenue,
      },
      cashInDrawer: paymentMethods['CASH']?.amount || 0,
    });
  } catch (error) {
    console.error('Failed to fetch cashier report:', error);
    return NextResponse.json({ error: 'Failed to fetch cashier report' }, { status: 500 });
  }
}

