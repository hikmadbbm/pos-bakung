import express from "express";
import { analyzeBusinessData } from "../services/ai-analyst.js";

export default function dashboardRouter({ prisma }) {
  const router = express.Router();

  // Helper to get daily stats
  async function getDailyStats(date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const orders = await prisma.order.findMany({
      where: { date: { gte: startOfDay, lt: endOfDay }, status: "COMPLETED" },
      include: { orderItems: { include: { menu: true } } }
    });

    const expenses = await prisma.expense.findMany({
      where: { date: { gte: startOfDay, lt: endOfDay } }
    });

    const fixedCosts = await prisma.fixedCost.findMany({ where: { is_active: true } });
    
    // Calculate metrics
    let revenue = 0;
    let cogs = 0;
    const menuCounts = {};

    for (const order of orders) {
      revenue += order.net_revenue || order.total;
      for (const item of order.orderItems) {
        cogs += item.cost * item.qty;
        if (!menuCounts[item.menu_id]) {
          menuCounts[item.menu_id] = { 
            id: item.menu_id, 
            name: item.menu.name, 
            qty: 0,
            profit: 0 
          };
        }
        menuCounts[item.menu_id].qty += item.qty;
        // Estimate profit: (Selling Price - Cost) * Qty
        // Note: item.price is the price at that time.
        menuCounts[item.menu_id].profit += (item.price - item.cost) * item.qty;
      }
    }

    const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    let dailyOverhead = 0;
    fixedCosts.forEach(fc => {
      if (fc.frequency === 'DAILY') dailyOverhead += fc.amount;
      else if (fc.frequency === 'WEEKLY') dailyOverhead += fc.amount / 7;
      else if (fc.frequency === 'MONTHLY') dailyOverhead += fc.amount / 30;
    });

    const netProfit = revenue - cogs - totalExpenses - dailyOverhead;
    const topMenus = Object.values(menuCounts).sort((a, b) => b.qty - a.qty).slice(0, 5);

    return {
      revenue,
      cogs,
      expenses: totalExpenses, // Return just operational expenses here? 
      // Frontend expects 'expenses' to be Op. Expenses.
      // Let's check frontend usage: 
      // <div className="text-2xl font-bold">{formatIDR(data.expenses)}</div>
      // <p>Fixed Costs + Daily Exp</p>
      // So previously I returned totalExpenses + dailyOverhead. 
      // But now I need to return dailyOverhead separately too.
      // Let's keep 'expenses' as the sum for the main card, but also return breakdown.
      
      expenses: totalExpenses + dailyOverhead, 
      dailyOverhead,
      netProfit,
      topMenus
    };
  }

  // GET /api/dashboard/insights
  router.get("/insights", async (req, res) => {
    try {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const todayStats = await getDailyStats(today);
      const yesterdayStats = await getDailyStats(yesterday);

      const insights = analyzeBusinessData(todayStats, yesterdayStats, todayStats.topMenus);
      
      res.json({
        summary: todayStats,
        insights
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to generate insights" });
    }
  });

  // GET /api/dashboard/summary
  // Returns today's metrics (Original endpoint kept for compatibility)
  router.get("/summary", async (req, res) => {
    try {
      const stats = await getDailyStats(new Date());
      res.json(stats);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch dashboard summary" });
    }
  });

  return router;
}
