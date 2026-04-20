import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'CASHIER']);
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');

    const timezoneOffset = 7; // WIB (UTC+7)
    let queryStart, queryEnd, reportDateStr;

    if (fromStr || toStr) {
      // Range Mode
      const start = fromStr ? new Date(fromStr + 'T00:00:00.000Z') : new Date('2020-01-01T00:00:00.000Z');
      const end = toStr ? new Date(toStr + 'T00:00:00.000Z') : new Date();
      
      // Adjusted for timezone
      queryStart = new Date(start.getTime() - (timezoneOffset * 60 * 60 * 1000));
      queryEnd = new Date(end.getTime() + (24 * 60 * 60 * 1000) - (timezoneOffset * 60 * 60 * 1000));
      reportDateStr = (fromStr && toStr && fromStr !== toStr) ? `${fromStr} to ${toStr}` : (fromStr || toStr);
    } else {
      // Default Today Mode
      const nowInJakarta = new Date(Date.now() + (timezoneOffset * 60 * 60 * 1000));
      const todayStr = nowInJakarta.toISOString().split('T')[0];
      reportDateStr = todayStr;
      
      const startOfDay = new Date(todayStr + 'T00:00:00.000Z');
      queryStart = new Date(startOfDay.getTime() - (timezoneOffset * 60 * 60 * 1000));
      queryEnd = new Date(queryStart.getTime() + (24 * 60 * 60 * 1000));
    }

    // 1. Fetch orders for today
    const orders = await prisma.order.findMany({
      where: {
        date: { gte: queryStart, lt: queryEnd },
        status: { in: ['PAID', 'PROCESSING', 'COMPLETED'] }
      },
      include: {
        orderItems: { include: { menu: true } },
        paymentMethod: true
      }
    });

    // 2. Fetch expenses for today
    const expenses = await prisma.expense.findMany({
      where: { date: { gte: queryStart, lt: queryEnd } }
    });

    // 3. Fetch shifts for today
    const shifts = await prisma.userShift.findMany({
      where: { start_time: { gte: queryStart, lt: queryEnd } },
      include: { user: { select: { name: true } } }
    });

    // 4. Calculate Sales and Profit
    let grossSales = 0;
    let totalDiscount = 0;
    let totalCogs = 0;
    let netRevenue = 0;
    let totalCommission = 0;

    const paymentBreakdown = {};

    orders.forEach(o => {
      grossSales += o.total || 0;
      totalDiscount += o.discount || 0;
      totalCommission += o.commission || 0;
      netRevenue += (o.platform_actual_net ?? o.net_revenue ?? 0);

      const pmName = o.paymentMethod?.name || o.payment_method || 'CASH';
      if (!paymentBreakdown[pmName]) paymentBreakdown[pmName] = 0;
      paymentBreakdown[pmName] += Math.max(0, (o.total || 0) - (o.discount || 0));

      o.orderItems.forEach(it => {
        if (it.menu?.productType !== 'CONSIGNMENT') {
           totalCogs += (it.cost || 0) * (it.qty || 0);
        }
      });
    });

    const netSales = grossSales - totalDiscount;
    const totalExpenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    const grossProfit = netRevenue - totalCogs;
    const netProfit = grossProfit - totalExpenses;

    // 5. Top Menus
    const menuAgg = new Map();
    orders.forEach(o => {
      o.orderItems.forEach(it => {
        const key = it.menu_id;
        const prev = menuAgg.get(key) || { name: it.menu?.name || `Menu ${key}`, qty: 0 };
        prev.qty += it.qty;
        menuAgg.set(key, prev);
      });
    });
    const topMenus = Array.from(menuAgg.values()).sort((a, b) => b.qty - a.qty).slice(0, 5);

    return NextResponse.json({
      date: reportDateStr,
      summary: {
        gross_sales: grossSales,
        discounts: totalDiscount,
        net_sales: netSales,
        commission: totalCommission,
        net_revenue: netRevenue,
        cogs: totalCogs,
        gross_profit: grossProfit,
        expenses: totalExpenses,
        net_profit: netProfit,
        total_orders: orders.length
      },
      payment_breakdown: Object.entries(paymentBreakdown).map(([name, amount]) => ({ name, amount })),
      top_menus: topMenus,
      shift_count: shifts.length,
      shifts: shifts.map(s => ({
          operator: s.user?.name || "Staff",
          started: s.start_time,
          ended: s.end_time,
          starting_cash: s.starting_cash,
          expected_cash: s.expected_cash,
          actual_cash: s.ending_cash,
          discrepancy: s.discrepancy
      }))
    });
  } catch (error) {
    console.error('Failed to generate End-of-Day report:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
