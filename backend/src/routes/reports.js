import express from "express";

function parseRange(query) {
  const from = query.from ? new Date(query.from) : null;
  const to = query.to ? new Date(query.to) : null;
  return { from, to };
}

export default function reportsRouter({ prisma }) {
  const router = express.Router();

  router.get("/sales", async (req, res) => {
    const { from, to } = parseRange(req.query);
    try {
      const where = {};
      if (from || to) where.date = {};
      if (from) where.date.gte = from;
      if (to) where.date.lte = to;
      const orders = await prisma.order.findMany({
        where: {
          ...where,
          status: "COMPLETED"
        },
        include: { orderItems: true },
        orderBy: { date: "desc" }
      });
      const revenue = orders.reduce(
        (sum, o) =>
          sum +
          o.orderItems.reduce((s, it) => s + Number(it.price) * it.qty, 0),
        0
      );
      res.json({ total_orders: orders.length, revenue });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  router.get("/profit", async (req, res) => {
    const { from, to } = parseRange(req.query);
    try {
      const whereOrder = {};
      if (from || to) whereOrder.date = {};
      if (from) whereOrder.date.gte = from;
      if (to) whereOrder.date.lte = to;
      const orderItems = await prisma.orderItem.findMany({
        where: { 
          order: {
            ...whereOrder,
            status: "COMPLETED"
          } 
        }
      });
      const revenue = orderItems.reduce(
        (sum, it) => sum + Number(it.price) * it.qty,
        0
      );
      const cogs = orderItems.reduce(
        (sum, it) => sum + Number(it.cost) * it.qty,
        0
      );
      const whereExp = {};
      if (from || to) whereExp.date = {};
      if (from) whereExp.date.gte = from;
      if (to) whereExp.date.lte = to;
      const expenses = await prisma.expense.findMany({ where: whereExp });
      const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
      const grossProfit = revenue - cogs;
      const netProfit = grossProfit - totalExpenses;
      res.json({ revenue, cogs, grossProfit, netProfit });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  router.get("/menu-performance", async (req, res) => {
    const { from, to } = parseRange(req.query);
    try {
      const whereOrder = {};
      if (from || to) whereOrder.date = {};
      if (from) whereOrder.date.gte = from;
      if (to) whereOrder.date.lte = to;
      const items = await prisma.orderItem.findMany({
        where: { 
          order: {
            ...whereOrder,
            status: "COMPLETED"
          } 
        }
      });
      const perf = new Map();
      for (const it of items) {
        const key = it.menu_id;
        const p = perf.get(key) || { qty: 0, revenue: 0, profit: 0 };
        p.qty += it.qty;
        p.revenue += Number(it.price) * it.qty;
        p.profit += (Number(it.price) - Number(it.cost)) * it.qty;
        perf.set(key, p);
      }
      // fetch menu names
      const menuIds = Array.from(perf.keys());
      const menus = await prisma.menu.findMany({
        where: { id: { in: menuIds } }
      });
      const nameById = new Map(menus.map((m) => [m.id, m.name]));
      const list = Array.from(perf.entries()).map(([menu_id, p]) => ({
        menu_id,
        name: nameById.get(menu_id) || `#${menu_id}`,
        qty: p.qty,
        revenue: p.revenue,
        profit: p.profit
      }));
      list.sort((a, b) => b.profit - a.profit);
      res.json(list);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  return router;
}
