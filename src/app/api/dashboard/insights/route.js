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

export async function GET() {
  try {
    // 1. Check in-memory cache first (60s TTL)
    const CACHE_KEY = 'dashboard_insights';
    const cached = getCache(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached);
    }

    const today = startOfToday();

    // 2. Fetch DailySummary
    let summaryRecord = await prisma.dailySummary.findUnique({
      where: { date: today }
    });

    // 3. If summary is missing or stale (older than 1 minute), sync it
    const isStale = !summaryRecord || (Date.now() - new Date(summaryRecord.updated_at).getTime() > 60000);
    
    if (isStale) {
      summaryRecord = await syncDailySummary(today);
    }

    // 4. Fetch FixedCosts for real-time overhead calculation
    // (Fixed costs are small and change rarely, so direct fetch is okay)
    const fixedCosts = await prisma.fixedCost.findMany({
      where: { is_active: true }
    });

    const dailyOverhead = getDailyOverhead(fixedCosts);
    const revenue = summaryRecord.revenue;
    const cogs = summaryRecord.cogs;
    const dailyExpenses = summaryRecord.expenses;
    const totalExpenses = Math.round(dailyExpenses + dailyOverhead);
    const netProfit = revenue - cogs - totalExpenses;
    const topMenus = summaryRecord.top_menus_json || [];

    // 5. Build insights
    const insights = [];
    if (summaryRecord.total_orders === 0) {
      insights.push({
        type: 'info',
        title: 'No sales yet',
        message: 'Create your first order today to unlock profit insights.',
      });
    } else if (netProfit >= 0) {
      insights.push({
        type: 'positive',
        title: 'Profitable day',
        message: `Net profit is positive with ${summaryRecord.total_orders} completed orders today.`,
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

    const responseData = {
      summary: {
        revenue,
        cogs,
        expenses: totalExpenses,
        netProfit,
        dailyOverhead: Math.round(dailyOverhead),
        topMenus,
      },
      insights,
    };

    // 6. Set cache for 30 seconds
    setCache(CACHE_KEY, responseData, 30);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Failed to fetch dashboard insights:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard insights' }, { status: 500 });
  }
}

