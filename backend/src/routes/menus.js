import express from "express";

export default function menusRouter({ prisma }) {
  const router = express.Router();

  // GET /api/menus
  router.get("/", async (req, res) => {
    try {
      const menus = await prisma.menu.findMany({
        orderBy: { name: "asc" },
        include: { 
          category: true,
          prices: true 
        }
      });
      // Transform prices array to object map for easier frontend usage
      const result = menus.map(m => {
        const pricesMap = {};
        m.prices.forEach(p => {
          pricesMap[p.platform_id] = p.price;
        });
        return {
          ...m,
          prices: pricesMap, // { 1: 15000, 2: 18000 }
          profit: m.price - m.cost // Base profit
        };
      });
      res.json(result);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch menus" });
    }
  });

  // POST /api/menus
  router.post("/", async (req, res) => {
    const { name, price, cost, categoryId, prices } = req.body; 
    // prices: { platform_id: price, ... } or array? Let's assume array of objects or object.
    // Let's assume frontend sends: prices: { "1": 15000, "2": 18000 }
    
    if (!name || price === undefined || cost === undefined) {
      return res.status(400).json({ error: "Name, price, cost required" });
    }
    try {
      const menu = await prisma.menu.create({
        data: {
          name,
          price: parseInt(price),
          cost: parseInt(cost),
          categoryId: categoryId ? parseInt(categoryId) : null,
        },
        include: { category: true }
      });

      // Create prices
      if (prices && typeof prices === 'object') {
        const priceCreates = Object.entries(prices).map(([pid, p]) => ({
          menu_id: menu.id,
          platform_id: parseInt(pid),
          price: parseInt(p)
        }));
        if (priceCreates.length > 0) {
          await prisma.menuPrice.createMany({ data: priceCreates });
        }
      }

      res.json(menu);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to create menu" });
    }
  });

  // PUT /api/menus/:id
  router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { name, price, cost, categoryId, prices } = req.body;
    try {
      const menu = await prisma.menu.update({
        where: { id: parseInt(id) },
        data: {
          name,
          price: price !== undefined ? parseInt(price) : undefined,
          cost: cost !== undefined ? parseInt(cost) : undefined,
          categoryId: categoryId !== undefined ? (categoryId ? parseInt(categoryId) : null) : undefined
        },
        include: { category: true }
      });

      // Update prices
      if (prices && typeof prices === 'object') {
        // Upsert logic manually or delete all and recreate?
        // Upsert is safer.
        for (const [pid, p] of Object.entries(prices)) {
           const platformId = parseInt(pid);
           const priceVal = parseInt(p);
           
           // Check if exists
           const existing = await prisma.menuPrice.findUnique({
             where: {
               menu_id_platform_id: {
                 menu_id: menu.id,
                 platform_id: platformId
               }
             }
           });

           if (existing) {
             await prisma.menuPrice.update({
               where: { id: existing.id },
               data: { price: priceVal }
             });
           } else {
             await prisma.menuPrice.create({
               data: {
                 menu_id: menu.id,
                 platform_id: platformId,
                 price: priceVal
               }
             });
           }
        }
      }

      res.json(menu);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to update menu" });
    }
  });

  // DELETE /api/menus/:id
  router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await prisma.menu.delete({ where: { id: parseInt(id) } });
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to delete menu" });
    }
  });

  return router;
}
