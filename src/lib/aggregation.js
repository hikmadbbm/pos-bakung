import { prisma } from './prisma';

/**
 * Syncs the DailySummary for a specific date.
 * Recomputes aggregates from raw transaction data.
 * @param {Date} targetDate 
 */
export async function syncDailySummary(targetDate = new Date()) {
  // Use UTC Midnight for the summary record date to ensure consistency across shifts
  const startOfDay = new Date(targetDate);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

  const summaryDate = new Date(startOfDay); // This is UTC 00:00:00

  // 1. Fetch orders
  const orders = await prisma.order.findMany({
    where: { 
      status: 'COMPLETED',
      date: { gte: startOfDay, lt: endOfDay }
    },
    include: {
      orderItems: { include: { menu: true } }
    }
  });

  // 2. Fetch expenses
  const expenses = await prisma.expense.findMany({
    where: { date: { gte: startOfDay, lt: endOfDay } }
  });

  // 3. Aggregate
  // Gross Revenue: Sales after discount
  const revenue = orders.reduce((acc, o) => acc + Math.max(0, (o.total || 0) - (o.discount || 0)), 0);
  
  // Net Revenue: Revenue after platform commission
  const net_revenue = orders.reduce((acc, o) => acc + (o.net_revenue || 0), 0);
  
  const cogs = orders.reduce((acc, o) => {
    return acc + (o.orderItems || []).reduce((s, it) => s + (it.cost || 0) * (it.qty || 0), 0);
  }, 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);

  // 4. Top Menus JSON
  const menuAgg = new Map();
  for (const o of orders) {
    for (const it of o.orderItems || []) {
      const key = it.menu_id;
      const prev = menuAgg.get(key) || { id: key, name: it.menu?.name || `Menu ${key}`, qty: 0, profit: 0 };
      const qty = it.qty || 0;
      prev.qty += qty;
      const itemRevenue = (it.price || 0) * qty;
      // Approximate item profit: (Revenue - Cost) - (pro-rated commission if any)
      const commissionFrac = o.total > 0 ? (o.commission || 0) / o.total : 0;
      const itemCommission = itemRevenue * commissionFrac;
      prev.profit += (itemRevenue - (it.cost || 0) * qty) - itemCommission;
      menuAgg.set(key, prev);
    }
  }
  const topMenus = Array.from(menuAgg.values())
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 10);

  // 5. Update DailySummary table
  return await prisma.dailySummary.upsert({
    where: { date: summaryDate },
    create: {
      date: summaryDate,
      revenue,
      net_revenue,
      cogs,
      expenses: totalExpenses,
      total_orders: orders.length,
      top_menus_json: topMenus
    },
    update: {
      revenue,
      net_revenue,
      cogs,
      expenses: totalExpenses,
      total_orders: orders.length,
      top_menus_json: topMenus,
      updated_at: new Date()
    }
  });
}
