
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    const paymentMethods = await prisma.paymentMethod.findMany();
    console.log("Payment Methods:", JSON.stringify(paymentMethods, null, 2));

    const platforms = await prisma.platform.findMany();
    console.log("Platforms:", JSON.stringify(platforms, null, 2));

    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { id: 'desc' },
      include: { platform: true, paymentMethod: true }
    });
    console.log("Recent Orders:", JSON.stringify(recentOrders, null, 2));

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
