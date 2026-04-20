const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const expenses = await prisma.expense.findMany({
    orderBy: { amount: 'desc' },
    take: 10
  });
  console.log('Top 10 Expenses:');
  console.log(JSON.stringify(expenses, null, 2));

  const total = await prisma.expense.aggregate({
    _sum: { amount: true }
  });
  console.log('\nTotal Expenses:', total._sum.amount);
}

main().catch(console.error).finally(() => prisma.$disconnect());
