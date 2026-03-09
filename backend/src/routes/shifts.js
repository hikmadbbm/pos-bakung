
import express from "express";

export default function shiftsRouter({ prisma }) {
  const router = express.Router();

  // POST /api/shifts/start
  router.post("/start", async (req, res) => {
    const { user_id, starting_cash } = req.body;
    if (!user_id || starting_cash === undefined) {
      return res.status(400).json({ error: "User ID and starting cash required" });
    }

    try {
      // Check if user already has an open shift
      const existing = await prisma.userShift.findFirst({
        where: { user_id, status: "OPEN" }
      });
      if (existing) {
        return res.status(400).json({ error: "User already has an open shift" });
      }

      const shift = await prisma.userShift.create({
        data: {
          user_id,
          starting_cash,
          status: "OPEN",
          start_time: new Date()
        }
      });
      res.json(shift);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to start shift" });
    }
  });

  // POST /api/shifts/end
  router.post("/end", async (req, res) => {
    const { user_id, ending_cash, total_sales, expected_cash, discrepancy, note, cash_breakdown } = req.body;
    if (!user_id || ending_cash === undefined) {
      return res.status(400).json({ error: "User ID and ending cash required" });
    }

    try {
      const shift = await prisma.userShift.findFirst({
        where: { user_id, status: "OPEN" }
      });
      if (!shift) {
        return res.status(404).json({ error: "No open shift found for this user" });
      }

      const closedShift = await prisma.userShift.update({
        where: { id: shift.id },
        data: {
          ending_cash,
          total_sales: total_sales || 0,
          expected_cash: expected_cash || 0,
          discrepancy: discrepancy || 0,
          note: note || null,
          cash_breakdown: cash_breakdown || null,
          status: "CLOSED",
          end_time: new Date()
        }
      });
      res.json(closedShift);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to end shift" });
    }
  });

  // GET /api/shifts/current/:userId
  router.get("/current/:userId", async (req, res) => {
    try {
      const shift = await prisma.userShift.findFirst({
        where: { 
          user_id: parseInt(req.params.userId),
          status: "OPEN"
        }
      });
      res.json(shift || null);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch current shift" });
    }
  });

  // GET /api/shifts/summary/:userId
  router.get("/summary/:userId", async (req, res) => {
    try {
      const shift = await prisma.userShift.findFirst({
        where: { 
          user_id: parseInt(req.params.userId),
          status: "OPEN"
        }
      });
      
      if (!shift) {
        return res.status(404).json({ error: "No open shift found" });
      }

      // Calculate Cash Sales since shift start
      // Note: This assumes orders are not linked to user_id yet, so we take all cash orders
      // Ideally we should filter by processed_by_user_id if available, but for now date filter
      const cashOrders = await prisma.order.findMany({
        where: {
          date: { gte: shift.start_time },
          payment_method: "CASH",
          status: "COMPLETED"
        }
      });

      const totalCashSales = cashOrders.reduce((sum, order) => {
        // Cash In = Money Received - Change
        // But simplified: Cash In = Order Total (if fully paid)
        // Let's use logic: Net Cash Added = Total (Gross) - Change? 
        // No, typically Cash In Drawer = Money Received - Change.
        // If exact change, Money Received = Total.
        // So Cash In = Total.
        return sum + order.total; 
      }, 0);

      const expectedCash = shift.starting_cash + totalCashSales;

      res.json({
        shift,
        summary: {
          startingCash: shift.starting_cash,
          totalCashSales,
          expectedCash
        }
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch shift summary" });
    }
  });

  // GET /api/shifts/history
  router.get("/history", async (req, res) => {
    const { userId, from, to } = req.query;
    const where = {};
    if (userId) where.user_id = parseInt(userId);
    if (from || to) {
      where.start_time = {};
      if (from) where.start_time.gte = new Date(from);
      if (to) where.start_time.lte = new Date(to);
    }

    try {
      const shifts = await prisma.userShift.findMany({
        where,
        orderBy: { start_time: "desc" },
        include: { user: { select: { name: true } } }
      });
      res.json(shifts);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch shift history" });
    }
  });

  return router;
}
