import express from "express";

export default function ordersRouter({ prisma }) {
  const router = express.Router();

  // GET /api/orders/pending
  router.get("/pending", async (req, res) => {
    try {
      const orders = await prisma.order.findMany({
        where: { status: "PENDING" },
        include: {
          orderItems: {
            include: { menu: true }
          },
          platform: true
        },
        orderBy: { date: "desc" }
      });
      res.json(orders);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch pending orders" });
    }
  });

  // GET /api/orders
  router.get("/", async (req, res) => {
    try {
      const orders = await prisma.order.findMany({
        include: {
          platform: true,
          orderItems: {
            include: { menu: true }
          }
        },
        orderBy: { date: "desc" }
      });
      res.json(orders);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // POST /api/orders
  router.post("/", async (req, res) => {
    // items: [{ menu_id, qty }], platform_id (optional, default to 1/Dine In if exists?)
    const { items, platform_id, payment_method, money_received, note, discount, customer_name, status } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No items provided" });
    }
    
    // Default status to COMPLETED if not provided
    const orderStatus = status || "COMPLETED";

    // Require platform_id? Or default?
    // Let's require it to be safe, but fallback if not provided to first platform.
    let targetPlatformId = platform_id;
    if (!targetPlatformId) {
      const first = await prisma.platform.findFirst();
      if (first) targetPlatformId = first.id;
      else return res.status(400).json({ error: "No platforms available" });
    }

    try {
      // 0. Fetch Platform Info
      const platform = await prisma.platform.findUnique({ where: { id: parseInt(targetPlatformId) } });
      if (!platform) return res.status(400).json({ error: "Platform not found" });

      // 1. Fetch current menu prices/costs AND platform-specific prices
      const menuIds = items.map(i => i.menu_id);
      const menus = await prisma.menu.findMany({
        where: { id: { in: menuIds } },
        include: {
          prices: {
            where: { platform_id: parseInt(targetPlatformId) }
          }
        }
      });

      // Map for quick lookup
      const menuMap = {};
      menus.forEach(m => { menuMap[m.id] = m; });

      // 2. Build order items data
      let subtotal = 0;
      const orderItemsData = [];

      for (const item of items) {
        const menu = menuMap[item.menu_id];
        if (!menu) {
          throw new Error(`Menu item ${item.menu_id} not found`);
        }
        
        // Determine Price: Platform Price > Base Price
        let finalPrice = menu.price;
        if (menu.prices && menu.prices.length > 0) {
          finalPrice = menu.prices[0].price;
        }

        const qty = parseInt(item.qty);
        const lineTotal = finalPrice * qty;
        subtotal += lineTotal;

        orderItemsData.push({
          menu_id: menu.id,
          qty,
          price: finalPrice, // Snapshot
          cost: menu.cost    // Snapshot
        });
      }

      // 3. Calculate Commission & Net Revenue
      const commission = Math.round(subtotal * (platform.commission_rate / 100));
      const net_revenue = subtotal - commission;
      const finalDiscount = discount ? parseInt(discount) : 0;
      const totalAmount = subtotal - finalDiscount; // Wait, total usually means gross sales. 
      // Schema has 'total' (Gross Sales). Let's keep total as subtotal for now to match current logic or update?
      // Current logic: total = subtotal.
      // net_revenue = subtotal - commission.
      // Where does discount go? 
      // If we discount, usually it reduces Gross Sales OR it's a separate expense.
      // Let's assume discount reduces the amount user pays.
      // change = money_received - (total - discount)
      
      const received = money_received ? parseInt(money_received) : 0;
      const change = Math.max(0, received - (subtotal - finalDiscount));

      // 4. Generate Order Number: TRX-XXXX (Sequential)
      // Find the absolute last order to determine the next sequence number
      const lastOrder = await prisma.order.findFirst({
        orderBy: { id: 'desc' }
      });

      // If we want TRX-0001 based on ID or count?
      // Using ID is safest for uniqueness but might skip if rows deleted.
      // Let's use ID + 1 or count + 1? 
      // User wants TRX-XXX. Let's assume it just increments forever.
      
      let nextId = 1;
      if (lastOrder) {
        nextId = lastOrder.id + 1;
      }
      
      // Format: TRX-0001, TRX-0002, ...
      const order_number = `TRX-${String(nextId).padStart(4, '0')}`;

      // 5. Create Order
      const order = await prisma.order.create({
        data: {
          order_number,
          total: subtotal,
          commission,
          net_revenue,
          platform_id: parseInt(targetPlatformId),
          payment_method: payment_method || "CASH",
          money_received: received,
          change_amount: change,
          note: note || null,
          customer_name: customer_name || null,
          discount: finalDiscount,
          status: orderStatus,
          orderItems: {
            create: orderItemsData
          }
        },
        include: {
          orderItems: true,
          platform: true
        }
      });

      res.json(order);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message || "Failed to create order" });
    }
  });

  // PUT /api/orders/:id
  router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { items, platform_id, payment_method, money_received, note, discount, customer_name, status } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No items provided" });
    }
    
    // Default status to COMPLETED if not provided (assume finalizing)
    const orderStatus = status || "COMPLETED";

    // Require platform_id? Or default?
    // Let's require it to be safe, but fallback if not provided to first platform.
    let targetPlatformId = platform_id;
    if (!targetPlatformId) {
      const first = await prisma.platform.findFirst();
      if (first) targetPlatformId = first.id;
      else return res.status(400).json({ error: "No platforms available" });
    }

    try {
      // 0. Fetch Platform Info
      const platform = await prisma.platform.findUnique({ where: { id: parseInt(targetPlatformId) } });
      if (!platform) return res.status(400).json({ error: "Platform not found" });

      // 1. Fetch current menu prices/costs AND platform-specific prices
      const menuIds = items.map(i => i.menu_id);
      const menus = await prisma.menu.findMany({
        where: { id: { in: menuIds } },
        include: {
          prices: {
            where: { platform_id: parseInt(targetPlatformId) }
          }
        }
      });

      // Map for quick lookup
      const menuMap = {};
      menus.forEach(m => { menuMap[m.id] = m; });

      // 2. Build order items data
      let subtotal = 0;
      const orderItemsData = [];

      for (const item of items) {
        const menu = menuMap[item.menu_id];
        if (!menu) {
          throw new Error(`Menu item ${item.menu_id} not found`);
        }
        
        // Determine Price: Platform Price > Base Price
        let finalPrice = menu.price;
        if (menu.prices && menu.prices.length > 0) {
          finalPrice = menu.prices[0].price;
        }

        const qty = parseInt(item.qty);
        const lineTotal = finalPrice * qty;
        subtotal += lineTotal;

        orderItemsData.push({
          menu_id: menu.id,
          qty,
          price: finalPrice, // Snapshot
          cost: menu.cost    // Snapshot
        });
      }

      // 3. Calculate Commission & Net Revenue
      const commission = Math.round(subtotal * (platform.commission_rate / 100));
      const net_revenue = subtotal - commission;
      const finalDiscount = discount ? parseInt(discount) : 0;
      const totalAmount = subtotal - finalDiscount; // Wait, total usually means gross sales. 
      // Schema has 'total' (Gross Sales). Let's keep total as subtotal for now to match current logic or update?
      // Current logic: total = subtotal.
      // net_revenue = subtotal - commission.
      // Where does discount go? 
      // If we discount, usually it reduces Gross Sales OR it's a separate expense.
      // Let's assume discount reduces the amount user pays.
      // change = money_received - (total - discount)
      
      const received = money_received ? parseInt(money_received) : 0;
      const change = Math.max(0, received - (subtotal - finalDiscount));

      // 4. Update Order
      const updatedOrder = await prisma.$transaction([
        prisma.orderItem.deleteMany({ where: { order_id: parseInt(id) } }),
        prisma.order.update({
          where: { id: parseInt(id) },
          data: {
            total: subtotal,
            commission,
            net_revenue,
            platform_id: parseInt(targetPlatformId),
            payment_method: payment_method || "CASH",
            money_received: received,
            change_amount: change,
            note: note || null,
            customer_name: customer_name || null,
            discount: finalDiscount,
            status: orderStatus,
            orderItems: {
              create: orderItemsData
            }
          },
          include: {
            orderItems: true,
            platform: true
          }
        })
      ]);

      // The transaction returns an array, the second element is the update result
      res.json(updatedOrder[1]);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message || "Failed to update order" });
    }
  });

  // PATCH /api/orders/:id/status
  router.patch("/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status, pin } = req.body; // Status: "COMPLETED", "CANCELLED", etc.

    if (!status || !pin) {
      return res.status(400).json({ error: "Status and PIN required" });
    }

    try {
      console.log(`[Order Update] Attempting to update order ${id} status to ${status} with PIN: ${pin}`);
      
      // 1. Verify PIN
      const user = await prisma.user.findFirst({
        where: { pin: String(pin) } // Ensure string comparison
      });

      if (!user) {
        console.log(`[Order Update] Invalid PIN: ${pin}`);
        return res.status(401).json({ error: "Invalid PIN" });
      }

      console.log(`[Order Update] Authorized by user: ${user.username} (${user.role})`);

      // 2. Update Status
      const updatedOrder = await prisma.order.update({
        where: { id: parseInt(id) },
        data: { 
          status,
          // Track who modified it?
          processed_by_user_id: user.id 
        }
      });

      // 3. Log Activity
      await prisma.userActivityLog.create({
        data: {
          user_id: user.id,
          action_type: "ORDER_UPDATE",
          description: `Order #${updatedOrder.order_number} status changed to ${status}`
        }
      });

      res.json(updatedOrder);
    } catch (e) {
      console.error("[Order Update Error]", e);
      if (e.code === 'P2025') { // Prisma Record Not Found
        return res.status(404).json({ error: "Order not found" });
      }
      res.status(500).json({ error: "Failed to update order status: " + e.message });
    }
  });

  return router;
}
