import express from "express";

export default function expensesRouter({ prisma }) {
  const router = express.Router();

  // GET /api/expenses
  router.get("/", async (req, res) => {
    try {
      const expenses = await prisma.expense.findMany({
        orderBy: { date: "desc" }
      });
      res.json(expenses);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  // POST /api/expenses
  router.post("/", async (req, res) => {
    const { item, category, amount } = req.body;
    if (!item || !category || amount === undefined) {
      return res.status(400).json({ error: "Item, category, amount required" });
    }
    // Validate category
    const validCategories = ["RAW_MATERIAL", "OPERATIONAL", "PACKAGING", "OTHERS"];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: "Invalid category" });
    }

    try {
      const expense = await prisma.expense.create({
        data: {
          item,
          category,
          amount: parseInt(amount)
        }
      });
      res.json(expense);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to create expense" });
    }
  });

  return router;
}
