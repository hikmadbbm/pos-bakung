require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnose() {
  const dateStr = '2026-03-12';
  const start = new Date(dateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  console.log(`--- DIAGNOSTIC for ${dateStr} (UTC: ${start.toISOString()} - ${end.toISOString()}) ---`);

  const orders = await prisma.order.findMany({
    where: { date: { gte: start, lt: end }, status: 'COMPLETED' },
    include: { orderItems: true }
  });

  const grossTotal = orders.reduce((acc, o) => acc + (o.total - o.discount), 0);
  const netTotal = orders.reduce((acc, o) => acc + o.net_revenue, 0);
  const cogs = orders.reduce((acc, o) => acc + o.orderItems.reduce((s, it) => s + (it.cost * it.qty), 0), 0);
  
  const expenses = await prisma.expense.findMany({
    where: { date: { gte: start, lt: end } }
  });
  const expTotal = expenses.reduce((acc, e) => acc + e.amount, 0);

  const fixedCosts = await prisma.fixedCost.findMany({ where: { is_active: true } });
  const overhead = fixedCosts.reduce((acc, fc) => {
    if (fc.frequency === 'DAILY') return acc + fc.amount;
    if (fc.frequency === 'WEEKLY') return acc + fc.amount / 7;
    if (fc.frequency === 'MONTHLY') return acc + fc.amount / 30;
    return acc;
  }, 0);

  console.log(`Gross Revenue: ${grossTotal}`);
  console.log(`Net Revenue: ${netTotal}`);
  console.log(`COGS: ${cogs}`);
  console.log(`Direct Expenses: ${expTotal}`);
  console.log(`Fixed Overhead: ${overhead}`);
  console.log(`Total Cost: ${cogs + expTotal + overhead}`);
  console.log(`Pure Income: ${netTotal - cogs - expTotal - overhead}`);
  console.log(`Orders Count: ${orders.length}`);

  const summary = await prisma.dailySummary.findUnique({ where: { date: start } });
  console.log(`DailySummary Record exists: ${!!summary}`);
  if (summary) {
     console.log(`Summary Rev: ${summary.revenue}`);
  }
}

diagnose().then(() => prisma.$disconnect());
