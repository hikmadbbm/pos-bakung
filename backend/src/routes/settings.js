import express from "express";

export default function settingsRouter({ prisma }) {
  const router = express.Router();

  // GET /api/settings/config
  router.get("/config", async (req, res) => {
    try {
      let config = await prisma.storeConfig.findFirst();
      if (!config) {
        config = await prisma.storeConfig.create({
          data: {
            store_name: "BAKMIE YOU-TJE",
            address: "Jl. Bakung No. 123, Jakarta",
            phone: "0812-3456-7890",
            receipt_footer: "Thank you for visiting!\nPlease come again.",
            tax_rate: 0,
            service_charge: 0
          }
        });
      }
      res.json(config);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // PUT /api/settings/config
  router.put("/config", async (req, res) => {
    try {
      let config = await prisma.storeConfig.findFirst();
      if (!config) {
        // Should exist from GET or init, but handle just in case
        config = await prisma.storeConfig.create({ data: req.body });
      } else {
        config = await prisma.storeConfig.update({
          where: { id: config.id },
          data: req.body
        });
      }
      res.json(config);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // POST /api/settings/verify-pin
  router.post("/verify-pin", async (req, res) => {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ error: "PIN required" });

    try {
      // Find ANY user with this PIN (or specific user if we had user context)
      // For now, check if any user has this PIN (Simple Authorization)
      const user = await prisma.user.findFirst({
        where: { pin: pin }
      });

      if (user) {
        res.json({ valid: true, user: { name: user.name, role: user.role } });
      } else {
        res.status(401).json({ error: "Invalid PIN" });
      }
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // PUT /api/settings/user-pin
  // Update PIN for a specific user (Requires current PIN or Admin rights - simplifying for now)
  router.put("/user-pin", async (req, res) => {
    const { userId, pin, currentPin } = req.body;
    
    // In a real app, verify currentPin or check session user
    // For this local POS, we'll allow updating if we provide userId
    
    try {
      await prisma.user.update({
        where: { id: parseInt(userId) },
        data: { pin: pin }
      });
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to update PIN" });
    }
  });

  return router;
}
