const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const timezoneOffset = 7;
  const nowInJakarta = new Date(Date.now() + (timezoneOffset * 60 * 60 * 1000));
  const start = new Date(nowInJakarta.toISOString().split('T')[0] + 'T00:00:00.000Z');
  const end = new Date(nowInJakarta.toISOString().split('T')[0] + 'T23:59:59.999Z');

  console.log('Range used by Dashboard:', { start: start.toISOString(), end: end.toISOString() });

  const orders = await prisma.order.findMany({
    where: {
      status: { in: ['PAID', 'PROCESSING', 'COMPLETED'] },
      date: { gte: start, lte: end }
    },
    select: { id: true, date: true, status: true, total: true }
  });

  console.log('Orders found in database for this range:', orders.length);
  orders.forEach(o => console.log(`- ID: ${o.id}, Date: ${o.date.toISOString()}, Status: ${o.status}`));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
