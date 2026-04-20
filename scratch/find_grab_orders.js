const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    where: {
      date: {
        gte: new Date('2026-04-20T00:00:00Z'),
        lte: new Date('2026-04-20T23:59:59Z'),
      },
      platform: {
        name: { contains: 'Grab', mode: 'insensitive' }
      }
    },
    include: {
      orderItems: { include: { menu: true } },
      platform: true
    }
  });

  console.log(JSON.stringify(orders, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
