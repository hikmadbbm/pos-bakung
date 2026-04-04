import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCache, setCache } from '@/lib/cache';
import { syncDailySummary } from '@/lib/aggregation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function startOfToday() {
  const d = new Date();
  // Ensure we use the local morning hours for 'Today' label
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

    // 5. Fetch FixedCosts and Low Stock Alerts
    const [fixedCosts, lowStockItems] = await Promise.all([
      prisma.fixedCost.findMany({ where: { is_active: true } }),
      prisma.ingredient.findMany({
        where: {
          minimum_stock: { gt: 0 },
          stock: { lte: prisma.ingredient.fields.minimum_stock }
        },
        select: { item_name: true, stock: true, unit: true, minimum_stock: true },
        take: 5
      }).catch(() => []) // Fallback for prisma version issues with field comparison
    ]);

    // Fallback if field comparison fails (some prisma versions don't support it in 'where')
    let finalLowStock = lowStockItems;
    if (lowStockItems.length === 0) {
       const allWithMin = await prisma.ingredient.findMany({
         where: { minimum_stock: { gt: 0 } },
         select: { item_name: true, stock: true, unit: true, minimum_stock: true }
       });
       finalLowStock = allWithMin.filter(i => i.stock <= i.minimum_stock).slice(0, 5);
    }

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
    
    if (finalLowStock.length > 0) {
      insights.push({
        type: 'negative',
        title: 'Low Stock Alert',
        message: `${finalLowStock.length} items are below minimum levels. Check inventory.`,
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

    // 6. Fetch Payment methods and recently active shift
    const [payments, shift, categories] = await Promise.all([
      prisma.order.groupBy({
        by: ['payment_method'],
        where: { date: { gte: start, lte: end }, status: 'COMPLETED' },
        _count: { id: true },
        _sum: { total: true }
      }),
      prisma.userShift.findFirst({
        where: { status: 'OPEN' },
        include: { user: { select: { name: true } } },
        orderBy: { start_time: 'desc' }
      }),
      prisma.menuCategory.findMany({
        include: { _count: { select: { menus: true } } }
      })
    ]);

    const responseData = {
      summary: {
        grossRevenue,
        netRevenue,
        revenue: netRevenue,
        cogs,
        expenses: totalExpenses,
        netProfit,
        dailyOverhead: Math.round(totalOverhead),
        topMenus,
        lowStockItems: finalLowStock,
        totalOrders,
        paymentDistribution: payments,
        activeShift: shift ? { user: shift.user.name, started: shift.start_time } : null,
        categoriesCount: categories.length,
        systemStatus: "Neural Sync Complete"
      },
      insights,
    };

    // 7. Set in-process cache (fallback for same-instance hits)
    setCache(CACHE_KEY, responseData, 30);

    const res = NextResponse.json(responseData);
    // Add HTTP-level caching so Vercel Edge/CDN can serve repeated requests without
    // hitting the database — this is effective even in serverless where in-memory
    // caches are per-instance and frequently cold-started.
    res.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=10');
    return res;
  } catch (error) {
    console.error('Failed to fetch dashboard insights:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard insights' }, { status: 500 });
  }
}

