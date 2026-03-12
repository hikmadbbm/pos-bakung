import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function getDailyOverhead(fixedCosts) {
  return fixedCosts.reduce((acc, fc) => {
    if (!fc.is_active) return acc;
    if (fc.frequency === 'DAILY') return acc + fc.amount;
    if (fc.frequency === 'WEEKLY') return acc + fc.amount / 7;
    if (fc.frequency === 'MONTHLY') return acc + fc.amount / 30;
    return acc;
  }, 0);
}

export async function GET() {
  try {
    const since = startOfToday();

    const [orders, expenses, fixedCosts] = await Promise.all([
      prisma.order.findMany({
        where: { status: 'COMPLETED', date: { gte: since } },
        include: {
          orderItems: { include: { menu: true } },
        },
        orderBy: { date: 'desc' },
        take: 500,
      }),
      prisma.expense.findMany({
        where: { date: { gte: since } },
        orderBy: { date: 'desc' },
        take: 500,
      }),
      prisma.fixedCost.findMany({
        where: { is_active: true },
        orderBy: { id: 'asc' },
      }),
    ]);

    const revenue = orders.reduce((acc, o) => acc + Math.max(0, (o.total || 0) - (o.discount || 0)), 0);
    const cogs = orders.reduce((acc, o) => {
      const itemsCogs = (o.orderItems || []).reduce((s, it) => s + (it.cost || 0) * (it.qty || 0), 0);
      return acc + itemsCogs;
    }, 0);

    const dailyOverhead = getDailyOverhead(fixedCosts);
    const dailyExpenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    const totalExpenses = Math.round(dailyExpenses + dailyOverhead);
    const netProfit = revenue - cogs - totalExpenses;

    const menuAgg = new Map();
    for (const o of orders) {
      for (const it of o.orderItems || []) {
        const key = it.menu_id;
        const prev = menuAgg.get(key) || { id: key, name: it.menu?.name || `Menu ${key}`, qty: 0, profit: 0 };
        const qty = it.qty || 0;
        const profit = ((it.price || 0) - (it.cost || 0)) * qty;
        prev.qty += qty;
        prev.profit += profit;
        menuAgg.set(key, prev);
      }
    }
    const topMenus = Array.from(menuAgg.values())
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);

    const insights = [];
    if (orders.length === 0) {
      insights.push({
        type: 'info',
        title: 'No sales yet',
        message: 'Create your first order today to unlock profit insights.',
      });
    } else if (netProfit >= 0) {
      insights.push({
        type: 'positive',
        title: 'Profitable day',
        message: `Net profit is positive with ${orders.length} completed orders today.`,
      });
    } else {
      insights.push({
        type: 'warning',
        title: 'Below break-even',
        message: 'Net profit is negative. Consider pushing higher-margin items or reducing waste.',
      });
    }
    if (dailyOverhead > 0) {
      insights.push({
        type: 'neutral',
        title: 'Fixed overhead applied',
        message: `Daily overhead allocation is ${Math.round(dailyOverhead)} today.`,
      });
    }
    if (topMenus.length > 0) {
      insights.push({
        type: 'action',
        title: 'Promote best seller',
        message: `Top item: ${topMenus[0].name}. Consider upsell or bundle.`,
      });
    }

    return NextResponse.json({
      summary: {
        revenue,
        cogs,
        expenses: totalExpenses,
        netProfit,
        dailyOverhead: Math.round(dailyOverhead),
        topMenus,
      },
      insights,
    });
  } catch (error) {
    console.error('Failed to fetch dashboard insights:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard insights' }, { status: 500 });
  }
}

