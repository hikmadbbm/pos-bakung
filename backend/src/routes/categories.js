import express from "express";

export default function categoriesRouter({ prisma }) {
  const router = express.Router();

  // GET /api/categories
  router.get("/", async (req, res) => {
    try {
      const categories = await prisma.menuCategory.findMany({
        orderBy: { name: "asc" }
      });
      res.json(categories);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // POST /api/categories
  router.post("/", async (req, res) => {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    try {
      const category = await prisma.menuCategory.create({
        data: { name, color: color || "#cccccc" }
      });
      res.json(category);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  // PUT /api/categories/:id
  router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { name, color } = req.body;
    try {
      const category = await prisma.menuCategory.update({
        where: { id: parseInt(id) },
        data: { name, color }
      });
      res.json(category);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to update category" });
    }
  });

  // DELETE /api/categories/:id
  router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    try {
      // Optional: Check if used by menus, maybe set them to null or block delete
      await prisma.menuCategory.delete({ where: { id: parseInt(id) } });
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  return router;
}
