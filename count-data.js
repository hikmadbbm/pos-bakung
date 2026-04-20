const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const userCount = await prisma.user.count();
    const menuCount = await prisma.menu.count();
    const orderCount = await prisma.order.count();
    const platformCount = await prisma.platform.count();
    const categoryCount = await prisma.category.count();

    console.log({
      users: userCount,
      menus: menuCount,
      orders: orderCount,
      platforms: platformCount,
      categories: categoryCount
    });
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
