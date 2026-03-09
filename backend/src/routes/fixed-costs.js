import express from "express";

export default function fixedCostsRouter({ prisma }) {
  const router = express.Router();

  // GET /api/fixed-costs
  router.get("/", async (req, res) => {
    try {
      const fixedCosts = await prisma.fixedCost.findMany({
        orderBy: { created_at: "desc" }
      });
      res.json(fixedCosts);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch fixed costs" });
    }
  });

  // POST /api/fixed-costs
  router.post("/", async (req, res) => {
    const { name, amount, frequency } = req.body;
    if (!name || amount === undefined || !frequency) {
      return res.status(400).json({ error: "Name, amount, and frequency are required" });
    }

    try {
      const fixedCost = await prisma.fixedCost.create({
        data: {
          name,
          amount: parseInt(amount),
          frequency: frequency.toUpperCase()
        }
      });
      res.json(fixedCost);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to create fixed cost" });
    }
  });

  // PUT /api/fixed-costs/:id
  router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { name, amount, frequency } = req.body;
    try {
      const fixedCost = await prisma.fixedCost.update({
        where: { id: parseInt(id) },
        data: {
          name,
          amount: amount !== undefined ? parseInt(amount) : undefined,
          frequency: frequency ? frequency.toUpperCase() : undefined
        }
      });
      res.json(fixedCost);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to update fixed cost" });
    }
  });

  // DELETE /api/fixed-costs/:id
  router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await prisma.fixedCost.delete({ where: { id: parseInt(id) } });
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to delete fixed cost" });
    }
  });

  return router;
}
