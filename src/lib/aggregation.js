import { prisma } from './prisma';

/**
 * Syncs the DailySummary for a specific date.
 * Recomputes aggregates from raw transaction data.
 * @param {Date} targetDate 
 */
export async function syncDailySummary(targetDate = new Date()) {
  const timezoneOffset = 7; // WIB (UTC+7)
  const d = new Date(targetDate.getTime() + (timezoneOffset * 60 * 60 * 1000));
  const dateStr = d.toISOString().split('T')[0];
  const startOfDay = new Date(dateStr + 'T00:00:00.000Z');
  
  const queryStart = new Date(startOfDay.getTime() - (timezoneOffset * 60 * 60 * 1000));
  const queryEnd = new Date(queryStart.getTime() + (24 * 60 * 60 * 1000));

  const summaryDate = startOfDay;

  const [ordersRaw, expenses, activeConsignments] = await Promise.all([
    prisma.order.findMany({
      where: { 
        // Exclude UNPAID from revenue metrics as requested
        status: { in: ['PAID', 'PROCESSING', 'COMPLETED'] },
        date: { gte: queryStart, lt: queryEnd }
      },
      include: {
        orderItems: { include: { menu: true } }
      }
    }),
    prisma.expense.findMany({
      where: { date: { gte: queryStart, lt: queryEnd } }
    }),
    prisma.consignment.findMany({
      where: {
        isActive: true,
        startDate: { lte: queryEnd },
        OR: [
          { endDate: null },
          { endDate: { gte: queryStart } }
        ]
      },
      include: { menu: true }
    })
  ]);

  // Check if store was open on this specific day
  const { wasStoreOpenOnDay } = await import('./store-status');
  const isStoreOpen = await wasStoreOpenOnDay(summaryDate);

  // If store is closed, enforce 0 revenue as requested
  const orders = isStoreOpen ? ordersRaw : [];

  // Gross Revenue: Sales after discount
  const revenue = orders.reduce((acc, o) => acc + Math.max(0, (o.total || 0) - (o.discount || 0)), 0);
  
  // Net Revenue: Revenue after platform commission (prioritize manual reconciliation)
  const net_revenue = orders.reduce((acc, o) => acc + (o.platform_actual_net || o.net_revenue || 0), 0);
  
  // COGS: Only for OWN_PRODUCTS
  const cogs = orders.reduce((acc, o) => {
    return acc + (o.orderItems || []).reduce((s, it) => {
      if (it.menu?.productType === 'CONSIGNMENT') return s;
      return s + (it.cost || 0) * (it.qty || 0);
    }, 0);
  }, 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);

  // Generate breakdown for the summary
  const consignmentBreakdown = activeConsignments.map(con => {
    let income = 0;
    if (con.modelType === 'FIXED_DAILY') {
      income = isStoreOpen ? (con.fixedDailyFee || 0) : 0;
    } else if (con.modelType === 'REVENUE_SHARE') {
      const sales = orders.reduce((s, o) => {
        const item = o.orderItems.find(it => it.menu_id === con.productId);
        return s + (item ? (item.price * item.qty) : 0);
      }, 0);
      income = Math.round(sales * (con.revenueSharePercent / 100));
    }
    return {
      consignmentId: con.id,
      partnerName: con.partnerName,
      productId: con.productId,
      productName: con.menu?.name,
      income
    };
  });
  
  const consignmentIncome = consignmentBreakdown.reduce((acc, b) => acc + b.income, 0);

  // Consignment Logs aggregation
  const existingLogs = await prisma.consignmentDailyLog.findMany({
    where: { date: startOfDay }
  });

  await Promise.all(activeConsignments.map(async (con) => {
    const breakdown = consignmentBreakdown.find(b => b.consignmentId === con.id);
    const income = breakdown?.income || 0;
    const existing = existingLogs.find(l => l.consignmentId === con.id);
    const targetStatus = (!isStoreOpen && income === 0) ? 'NO_SALES' : 'PENDING';

    if (existing) {
      if (existing.status === 'RECEIVED' || existing.status === 'NO_SALES') return;
      return prisma.consignmentDailyLog.update({
        where: { id: existing.id },
        data: {
          calculatedIncome: income,
          expectedIncome: income,
          status: targetStatus,
          notes: `Updated on ${new Date().toISOString()}${!isStoreOpen ? ' | Closed' : ''}`
        }
      });
    } else {
      return prisma.consignmentDailyLog.create({
        data: {
          consignmentId: con.id,
          date: startOfDay,
          calculatedIncome: income,
          expectedIncome: income,
          status: targetStatus,
          notes: `Created on ${new Date().toISOString()}${!isStoreOpen ? ' | Closed' : ''}`
        }
      });
    }
  }));

  // Top Menus
  const menuAgg = new Map();
  for (const o of orders) {
    for (const it of o.orderItems || []) {
      const key = it.menu_id;
      const prev = menuAgg.get(key) || { id: key, name: it.menu?.name || `Menu ${key}`, qty: 0, profit: 0, type: it.menu?.productType };
      const qty = it.qty || 0;
      prev.qty += qty;
      
      if (it.menu?.productType !== 'CONSIGNMENT') {
        const itemRevenue = (it.price || 0) * qty;
        const actualCommission = (o.platform_actual_net !== null && o.platform_actual_net !== undefined && o.platform_actual_net > 0)
          ? Math.max(0, (o.total - (o.discount || 0)) - o.platform_actual_net)
          : (o.commission || 0);
          
        const totalNetForRatio = (o.total - (o.discount || 0));
        const commissionFrac = totalNetForRatio > 0 ? actualCommission / totalNetForRatio : 0;
        const itemProfit = (itemRevenue - (it.cost || 0) * qty) - (itemRevenue * commissionFrac);
        prev.profit += itemProfit;
      }
      menuAgg.set(key, prev);
    }
  }
  const topMenus = Array.from(menuAgg.values()).sort((a, b) => b.profit - a.profit).slice(0, 30);

  // Final Summary Upsert
  return await prisma.dailySummary.upsert({
    where: { date: summaryDate },
    create: {
      date: summaryDate,
      revenue,
      net_revenue,
      cogs,
      expenses: totalExpenses,
      total_orders: orders.length,
      top_menus_json: topMenus,
      consignment_summary: { totalIncome: consignmentIncome, breakdown: consignmentBreakdown }
    },
    update: {
      revenue,
      net_revenue,
      cogs,
      expenses: totalExpenses,
      total_orders: orders.length,
      top_menus_json: topMenus,
      consignment_summary: { totalIncome: consignmentIncome, breakdown: consignmentBreakdown },
      updated_at: new Date()
    }
  });
}
