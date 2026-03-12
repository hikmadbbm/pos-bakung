
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  console.log("Starting verification...");
  try {
    // 1. Check if we can create a menu
    const menu = await prisma.menu.create({
      data: { name: 'Test Item ' + Date.now(), price: 10000, cost: 5000 },
    });
    console.log("Menu created:", menu.id);

    // 2. Test Fixed Discount
    const orderFixed = await prisma.order.create({
      data: {
        total: 10000,
        discount: 2000,
        discount_type: 'FIXED',
        discount_rate: 2000,
        net_revenue: 8000,
        payment_method: 'CASH',
        money_received: 10000,
        change_amount: 2000,
        orderItems: {
          create: [{ menu_id: menu.id, qty: 1, price: 10000, cost: 5000 }],
        },
      },
    });
    console.log("Fixed discount order created:", orderFixed.id);

    // 3. Test Percentage Discount
    const orderPercent = await prisma.order.create({
      data: {
        total: 10000,
        discount: 1000,
        discount_type: 'PERCENT',
        discount_rate: 10,
        net_revenue: 9000,
        payment_method: 'CASH',
        money_received: 10000,
        change_amount: 1000,
        orderItems: {
          create: [{ menu_id: menu.id, qty: 1, price: 10000, cost: 5000 }],
        },
      },
    });
    console.log("Percentage discount order created:", orderPercent.id);

    console.log("Verification successful!");
  } catch (error) {
    console.error("Verification failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
