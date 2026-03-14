require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Recomputes aggregates from raw transaction data.
 * @param {Date} targetDate 
 */
async function syncDailySummary(targetDate, tx = prisma) {
  const startOfDay = new Date(targetDate);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

  // 1. Fetch orders
  const orders = await tx.order.findMany({
    where: { 
      status: 'COMPLETED',
      date: { gte: startOfDay, lt: endOfDay }
    },
    include: {
      orderItems: { include: { menu: true } }
    }
  });

  // 2. Fetch expenses
  const expenses = await tx.expense.findMany({
    where: { date: { gte: startOfDay, lt: endOfDay } }
  });

  // 3. Aggregate
  const revenue = orders.reduce((acc, o) => acc + Math.max(0, (o.total || 0) - (o.discount || 0)), 0);
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
      prev.profit += ((it.price || 0) - (it.cost || 0)) * qty;
      menuAgg.set(key, prev);
    }
  }
  const topMenus = Array.from(menuAgg.values())
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 10);

  // 5. Update DailySummary table
  return await tx.dailySummary.upsert({
    where: { date: startOfDay },
    create: {
      date: startOfDay,
      revenue,
      cogs,
      expenses: totalExpenses,
      total_orders: orders.length,
      top_menus_json: topMenus
    },
    update: {
      revenue,
      cogs,
      expenses: totalExpenses,
      total_orders: orders.length,
      top_menus_json: topMenus,
      updated_at: new Date()
    }
  });
}

async function backfill() {
  try {
    console.log('Starting backfill of DailySummary...');
    
    // Find all unique dates in the Order table
    const orders = await prisma.order.findMany({
      select: { date: true },
      where: { status: 'COMPLETED' }
    });

    const uniqueDates = new Set();
    orders.forEach(o => {
      const d = new Date(o.date);
      d.setUTCHours(0, 0, 0, 0);
      uniqueDates.add(d.getTime());
    });

    console.log(`Found ${uniqueDates.size} unique days with transactions.`);

    for (const timestamp of uniqueDates) {
      const date = new Date(timestamp);
      console.log(`Syncing ${date.toISOString().split('T')[0]}...`);
      await syncDailySummary(date);
    }

    console.log('Backfill complete!');
  } catch (error) {
    console.error('Backfill failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

backfill();
