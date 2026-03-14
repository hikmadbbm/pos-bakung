require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnose() {
  try {
    const dates = ['2026-03-03', '2026-03-04', '2026-03-05', '2026-03-08', '2026-03-10', '2026-03-11', '2026-03-12'];
    
    console.log('--- DATA CONSISTENCY DIAGNOSIS ---');
    
    for (const dateStr of dates) {
      const start = new Date(dateStr);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      // Raw Order Data
      const orders = await prisma.order.findMany({
        where: { date: { gte: start, lt: end }, status: 'COMPLETED' }
      });
      const rawTotal = orders.reduce((sum, o) => sum + o.total, 0);
      const rawCount = orders.length;

      // Daily Summary Data
      const summary = await prisma.dailySummary.findUnique({
        where: { date: start }
      });

      console.log(`[${dateStr}]`);
      console.log(`  Raw Orders:  Count=${rawCount}, Total=${rawTotal}`);
      if (summary) {
        console.log(`  DailySummary: Count=${summary.total_orders}, Total=${summary.revenue}`);
        const match = rawTotal === summary.revenue && rawCount === summary.total_orders;
        console.log(`  Match: ${match ? '✅ YES' : '❌ NO'}`);
      } else {
        console.log('  DailySummary: ❌ MISSING');
      }
    }

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
