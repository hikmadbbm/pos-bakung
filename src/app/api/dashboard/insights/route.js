import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCache, setCache } from '@/lib/cache';
import { syncDailySummary } from '@/lib/aggregation';

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

import { parseDateRange, daysBetweenInclusive } from '../../reports/utils';

export async function GET(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const { start, end } = parseDateRange(searchParams);
    const rangeKey = `${start.toISOString()}_${end.toISOString()}`;
    const CACHE_KEY = `dashboard_insights_${rangeKey}`;
    
    // 1. Check in-memory cache first (60s TTL)
    const cached = getCache(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached);
    }

    // 2. Fetch DailySummaries for the range
    const summaries = await prisma.dailySummary.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: { date: 'asc' }
    });

    // 3. If any summaries are missing (especially for today), sync them
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (today >= start && today <= end) {
      const todaySummary = summaries.find(s => s.date.getTime() === today.getTime());
      const isStale = !todaySummary || (Date.now() - new Date(todaySummary.updated_at).getTime() > 60000);
      if (isStale) {
        await syncDailySummary(today);
        // Re-fetch summaries
        const freshSummaries = await prisma.dailySummary.findMany({
          where: { date: { gte: start, lte: end } },
          orderBy: { date: 'asc' }
        });
        summaries.splice(0, summaries.length, ...freshSummaries);
      }
    }

    // 4. Aggregate summaries
    const grossRevenue = summaries.reduce((acc, s) => acc + (s.revenue || 0), 0);
    const netRevenue = summaries.reduce((acc, s) => acc + (s.net_revenue || 0), 0);
    const cogs = summaries.reduce((acc, s) => acc + (s.cogs || 0), 0);
    const dailyExpenses = summaries.reduce((acc, s) => acc + (s.expenses || 0), 0);
    const totalOrders = summaries.reduce((acc, s) => acc + (s.total_orders || 0), 0);

    // Aggregate top menus
    const menuMap = new Map();
    summaries.forEach(s => {
      const menus = s.top_menus_json || [];
      menus.forEach(m => {
        const prev = menuMap.get(m.id) || { ...m, qty: 0, profit: 0 };
        prev.qty += m.qty;
        prev.profit += m.profit;
        menuMap.set(m.id, prev);
      });
    });
    const topMenus = Array.from(menuMap.values()).sort((a,b) => b.profit - a.profit).slice(0, 10);

    // 5. Fetch FixedCosts for real-time overhead calculation
    const fixedCosts = await prisma.fixedCost.findMany({
      where: { is_active: true }
    });

    const dailyOverhead = getDailyOverhead(fixedCosts);
    const days = daysBetweenInclusive(start, end);
    const totalOverhead = dailyOverhead * days;
    const totalExpenses = Math.round(dailyExpenses + totalOverhead);
    const netProfit = netRevenue - cogs - totalExpenses;

    // 6. Build insights
    const insights = [];
    if (totalOrders === 0) {
      insights.push({
        type: 'info',
        title: 'No sales yet',
        message: 'No completed orders found for this period.',
      });
    } else if (netProfit >= 0) {
      insights.push({
        type: 'positive',
        title: 'Profitable period',
        message: `Net profit is positive with ${totalOrders} completed orders.`,
      });
    } else {
      insights.push({
        type: 'warning',
        title: 'Loss-making period',
        message: 'Net profit is negative for this period. Consider reviewing costs.',
      });
    }
    
    if (totalOverhead > 0) {
      insights.push({
        type: 'neutral',
        title: 'Fixed overhead applied',
        message: `Total overhead allocation for this period is ${Math.round(totalOverhead)}.`,
      });
    }
    
    if (topMenus.length > 0) {
      insights.push({
        type: 'action',
        title: 'Promote best seller',
        message: `Top item: ${topMenus[0].name}. Consider upsell or bundle.`,
      });
    }

    const responseData = {
      summary: {
        grossRevenue,
        netRevenue,
        revenue: netRevenue, // Maintain compatibility
        cogs,
        expenses: totalExpenses,
        netProfit,
        dailyOverhead: Math.round(totalOverhead),
        topMenus,
      },
      insights,
    };

    // 7. Set cache for 30 seconds
    setCache(CACHE_KEY, responseData, 30);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Failed to fetch dashboard insights:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard insights' }, { status: 500 });
  }
}

