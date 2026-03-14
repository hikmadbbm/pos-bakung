require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function auditMarch12() {
  try {
    const dateStr = '2026-03-12';
    const start = new Date(dateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    console.log(`--- AUDIT FOR ${dateStr} ---`);
    console.log(`Range: ${start.toISOString()} to ${end.toISOString()}`);

    const orders = await prisma.order.findMany({
      where: { 
        date: { gte: start, lt: end }
      },
      orderBy: { date: 'asc' }
    });

    console.log(`Total Orders Found: ${orders.length}`);
    let sum = 0;
    orders.forEach(o => {
      console.log(`  [${o.order_number}] Status: ${o.status}, Total: ${o.total}, Discount: ${o.discount}, Net: ${o.total - o.discount}, CreatedAt: ${o.date.toISOString()}`);
      if (o.status === 'COMPLETED') {
        sum += (o.total - o.discount);
      }
    });

    console.log(`\nAggregated Revenue (COMPLETED only): ${sum}`);

    const summary = await prisma.dailySummary.findUnique({
      where: { date: start }
    });

    if (summary) {
      console.log(`DailySummary Record:`);
      console.log(`  Revenue: ${summary.revenue}`);
      console.log(`  Total Orders: ${summary.total_orders}`);
    } else {
      console.log('DailySummary Record: ❌ MISSING');
    }

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

auditMarch12();
