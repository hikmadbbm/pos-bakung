const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const logs = await prisma.consignmentDailyLog.findMany({
    orderBy: { date: 'desc' },
    take: 10,
    include: { consignment: true }
  });
  console.log('--- CONSIGNMENT LOGS ---');
  logs.forEach(l => {
    console.log(`ID: ${l.id} | Date: ${l.date.toISOString()} | Partner: ${l.consignment?.partnerName} | Expected: ${l.expectedIncome} | Status: ${l.status}`);
  });

  const now = new Date();
  const todayStart = new Date(now.setHours(0,0,0,0));
  const todayEnd = new Date(now.setHours(23,59,59,999));

  const stats = await prisma.consignmentDailyLog.aggregate({
    where: { date: { gte: todayStart, lte: todayEnd } },
    _sum: { expectedIncome: true, actualReceived: true }
  });
  console.log('--- TODAY STATS (Aggregation Query) ---');
  console.log(`Range: ${todayStart.toISOString()} - ${todayEnd.toISOString()}`);
  console.log(JSON.stringify(stats, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
