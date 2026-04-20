const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const expenses = await prisma.expense.findMany({
    where: {
      date: { gte: new Date('2026-04-20T00:00:00Z') }
    },
    orderBy: { date: 'desc' }
  });
  console.log(JSON.stringify(expenses, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
