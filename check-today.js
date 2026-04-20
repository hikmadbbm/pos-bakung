const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const now = new Date();
  console.log('Current Server Time:', now.toISOString());
  
  // Try WIB Start (UTC+7)
  const timezoneOffset = 7;
  const nowInJakarta = new Date(Date.now() + (timezoneOffset * 60 * 60 * 1000));
  const todayStart = new Date(nowInJakarta);
  todayStart.setUTCHours(0, 0, 0, 0);
  todayStart.setTime(todayStart.getTime() - (timezoneOffset * 60 * 60 * 1000));
  
  const todayEnd = new Date(todayStart);
  todayEnd.setTime(todayEnd.getTime() + (24 * 60 * 60 * 1000) - 1);

  console.log('Searching for orders between:', todayStart.toISOString(), 'and', todayEnd.toISOString());

  const orders = await prisma.order.findMany({
    where: {
      date: { gte: todayStart, lte: todayEnd }
    },
    select: { id: true, order_number: true, date: true, status: true, total: true }
  });

  console.log('Orders found for today:', orders.length);
  orders.forEach(o => {
    console.log(`- ${o.order_number}: ${o.status} | ${o.total} | ${o.date.toISOString()}`);
  });

  // Check DailySummary
  const summaryDate = new Date(todayStart);
  summaryDate.setUTCHours(0,0,0,0);
  const summary = await prisma.dailySummary.findUnique({
    where: { date: summaryDate }
  });
  console.log('DailySummary record:', summary ? 'Found' : 'NOT FOUND');
  if (summary) {
    console.log('- Revenue:', summary.revenue);
    console.log('- Net Revenue:', summary.net_revenue);
    console.log('- Total Orders:', summary.total_orders);
  }

  process.exit(0);
}

check();
