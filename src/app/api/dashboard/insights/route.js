import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCache, setCache } from '@/lib/cache';
import { syncDailySummary } from '@/lib/aggregation';
import { formatIDR } from '@/lib/format';

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

    // 3. Sync missing or stale summaries in the range
    const now = Date.now();
    const SIXTY_SECONDS = 60000;
    const ONE_HOUR = 3600000;
    
    const datesToSync = [];
    let current = new Date(start);
    const endBound = new Date(end);
    
    // Normalize today for comparison
    const todayStr = new Date().toISOString().split('T')[0];
    
    while (current <= endBound) {
      const d = new Date(current);
      d.setUTCHours(0,0,0,0);
      const dStr = d.toISOString().split('T')[0];
      
      const existing = summaries.find(s => {
        const sDate = new Date(s.date);
        sDate.setUTCHours(0,0,0,0);
        return sDate.toISOString().split('T')[0] === dStr;
      });
      
      const isToday = dStr === todayStr;
      const staleThreshold = isToday ? SIXTY_SECONDS : ONE_HOUR;
      
      const isStale = !existing || (now - new Date(existing.updated_at).getTime() > staleThreshold);
      
      if (isStale) {
        datesToSync.push(new Date(d));
      }
      
      current.setUTCDate(current.getUTCDate() + 1);
    }

    if (datesToSync.length > 0) {
      // Safety: Limit syncs to a reasonable amount (e.g. 31 days)
      const syncLimit = 31;
      const limitedDates = datesToSync.sort((a,b) => b - a).slice(0, syncLimit);
      
      console.log(`Syncing ${limitedDates.length} dates sequentially for dashboard...`);
      
      // RUN SEQUENTIALLY to avoid "Timed out fetching a new connection from the connection pool"
      for (const date of limitedDates) {
        try {
          await syncDailySummary(date);
        } catch (err) {
          console.error(`Failed to sync ${date}:`, err);
        }
      }
      
      // Re-fetch summaries if we did syncs
      const freshSummaries = await prisma.dailySummary.findMany({
        where: { date: { gte: start, lte: end } },
        orderBy: { date: 'asc' }
      });
      summaries.splice(0, summaries.length, ...freshSummaries);
    }

    // 4. Aggregate summaries
    const grossRevenue = summaries.reduce((acc, s) => acc + (s.revenue || 0), 0);
    const netRevenue = summaries.reduce((acc, s) => acc + (s.net_revenue || 0), 0);
    const cogs = summaries.reduce((acc, s) => acc + (s.cogs || 0), 0);
    const dailyExpenses = summaries.reduce((acc, s) => acc + (s.expenses || 0), 0);
    const totalOrders = summaries.reduce((acc, s) => acc + (s.total_orders || 0), 0);
    
    // SAFE AGGREGATION for consignment
    let consignmentIncome = 0;
    try {
      consignmentIncome = summaries.reduce((acc, s) => acc + (Number(s.consignment_summary?.totalIncome) || 0), 0);
    } catch (e) {
      console.warn("Consignment aggregation failed, using 0", e.message);
    }

    // Aggregate top menus from summaries
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
    const topMenus = Array.from(menuMap.values()).sort((a,b) => b.profit - a.profit).slice(0, 30);

    // 5. Fetch Additional Data in Parallel
    const [fixedCosts, lowStockItems, globalConsignmentRaw] = await Promise.all([
      prisma.fixedCost.findMany({ where: { is_active: true } }),
      prisma.ingredient.findMany({
        where: {
          minimum_stock: { gt: 0 },
          stock: { lte: prisma.ingredient.fields.minimum_stock }
        },
        select: { item_name: true, stock: true, unit: true, minimum_stock: true },
        take: 5
      }).catch(() => []),
      // Cache the cumulative consignment stats (Outstanding) for a very short duration (10s) 
      // to ensure immediate feedback after financial actions
      getCache('glb_consignment_sum') 
        ? Promise.resolve(getCache('glb_consignment_sum'))
        : prisma.consignmentDailyLog.aggregate({
            where: { status: { in: ['PENDING', 'RECEIVED'] } },
            _sum: { expectedIncome: true, actualReceived: true }
          }).then(res => {
            setCache('glb_consignment_sum', res, 10);
            return res;
          })
    ]);

    const consignmentOutstanding = Math.max(0, (globalConsignmentRaw?._sum?.expectedIncome || 0) - (globalConsignmentRaw?._sum?.actualReceived || 0));

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
    
    // Profit Calculation Logic Updated:
    // Net Profit = (Own Product Profit) + (Consignment Income) - (Expenses)
    // Own Product Profit is (netRevenue - cogs) where netRevenue and cogs exclude consignment if set in syncDailySummary
    let grossProfit = netRevenue - cogs;
    let netProfit = grossProfit + consignmentIncome - totalExpenses;
    
    // Feature request: if there are no transactions all day, don't show minus profit
    if (totalOrders === 0 && netRevenue === 0) {
      netProfit = 0;
      grossProfit = 0;
    }

    // 6. Build insights
    const insights = [];
    if (totalOrders === 0 && netRevenue === 0 && consignmentIncome === 0) {
      insights.push({
        type: 'info',
        title: 'No activity yet',
        message: 'No orders or consignment income found for this period.',
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
    
    if (consignmentIncome > 0) {
      insights.push({
        type: 'positive',
        title: 'Consignment Income',
        message: `You earned ${formatIDR(consignmentIncome)} from consignment partners in this period.`,
      });
    }

    if (topMenus.length > 0) {
      insights.push({
        type: 'action',
        title: 'Promote best seller',
        message: `Top item: ${topMenus[0].name}. Consider upsell or bundle.`,
      });
    }

    // 6. Fetch Payment methods, shift, categories and expense breakdown
    const [payments, shift, categories, expenseBreakdown] = await Promise.all([
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
      }),
      prisma.expense.groupBy({
        by: ['category'],
        where: { date: { gte: start, lte: end } },
        _sum: { amount: true }
      })
    ]);

    const responseData = {
      summary: {
        grossRevenue,
        netRevenue,
        revenue: netRevenue,
        cogs,
        expenses: totalExpenses,
        grossProfit,
        netProfit,
        consignmentIncome,
        consignmentOutstanding,
        dailyOverhead: Math.round(totalOverhead),
        topMenus,
        lowStockItems: finalLowStock,
        totalOrders,
        paymentDistribution: payments,
        activeShift: shift ? { 
          user: shift.user.name, 
          started: shift.start_time,
          starting_cash: shift.starting_cash
        } : null,
        categoriesCount: categories.length,
        expenseBreakdown: expenseBreakdown.map(eb => ({
          category: eb.category,
          amount: eb._sum.amount || 0
        })),
        range: { from: start, to: end },
        days,
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

