import express from "express";

export default function platformsRouter({ prisma }) {
  const router = express.Router();

  // GET /api/platforms
  router.get("/", async (req, res) => {
    try {
      const platforms = await prisma.platform.findMany({
        orderBy: { id: "asc" }
      });
      res.json(platforms);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch platforms" });
    }
  });

  // POST /api/platforms
  router.post("/", async (req, res) => {
    const { name, type, commission_rate } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    try {
      const platform = await prisma.platform.create({
        data: {
          name,
          type: type || "OFFLINE",
          commission_rate: commission_rate ? parseFloat(commission_rate) : 0
        }
      });
      res.json(platform);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to create platform" });
    }
  });

  // PUT /api/platforms/:id
  router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { name, type, commission_rate } = req.body;
    try {
      const platform = await prisma.platform.update({
        where: { id: parseInt(id) },
        data: {
          name,
          type,
          commission_rate: commission_rate !== undefined ? parseFloat(commission_rate) : undefined
        }
      });
      res.json(platform);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to update platform" });
    }
  });

  // DELETE /api/platforms/:id
  router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    try {
      // Check if used by orders? Maybe just let it fail if foreign key constraint exists or cascade?
      // Schema says NO cascade on Orders, but Cascade on MenuPrice.
      // So if orders exist, this will fail (good).
      await prisma.platform.delete({ where: { id: parseInt(id) } });
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to delete platform (might be in use)" });
    }
  });

  return router;
}
