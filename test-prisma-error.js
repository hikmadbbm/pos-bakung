const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const menus = await prisma.menu.findMany({
      include: {
        category: true,
        prices: true
      }
    });
    console.log("SUCCESS:", menus.length);
    if (menus.length > 0) {
        console.log("Sample Prices:", menus[0].prices);
    }
  } catch (e) {
    console.error("PRISMA ERROR:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
