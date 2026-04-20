const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const timezoneOffset = 7;
  const start = new Date();
  start.setHours(0 - timezoneOffset, 0, 0, 0); // Start of day in UTC for Jakarta
  const end = new Date(start);
  end.setHours(end.getHours() + 24);

  console.log(`Searching for orders between ${start.toISOString()} and ${end.toISOString()}`);

  const orders = await prisma.order.findMany({
    where: { 
      date: { gte: start, lt: end },
      status: { notIn: ['CANCELLED', 'VOID'] }
    },
    include: { paymentMethod: true }
  });
  console.log(JSON.stringify(orders, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
