const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    },
  },
});

describe('Orders persistence', () => {
  test('creates order with items via Prisma transaction', async () => {
    const menu = await prisma.menu.create({
      data: { name: 'Item A', price: 10000, cost: 5000 },
    });
    const created = await prisma.$transaction(async (tx) => {
      return tx.order.create({
        data: {
          total: 20000,
          discount: 0,
          commission: 0,
          net_revenue: 20000,
          payment_method: 'CASH',
          money_received: 25000,
          change_amount: 5000,
          note: 'Test order',
          customer_name: 'Tester',
          orderItems: {
            create: [{ menu_id: menu.id, qty: 2, price: 10000, cost: 5000 }],
          },
        },
        include: { orderItems: true },
      });
    });
    const row = await prisma.order.findUnique({ where: { id: created.id } });
    expect(row).not.toBeNull();
  });
});
