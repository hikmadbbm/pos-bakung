const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Find current open shift
  const shift = await prisma.userShift.findFirst({
    where: { status: 'OPEN' },
    orderBy: { id: 'desc' }
  });

  if (!shift) {
    console.log('No open shift found');
    process.exit(1);
  }

  console.log('Open Shift:', shift.id, 'Start:', shift.start_time.toISOString());

  const orders = await prisma.order.findMany({
    where: {
      date: { gte: shift.start_time },
      status: { in: ['PAID', 'PROCESSING', 'COMPLETED'] }
    },
    include: {
      platform: true,
      paymentMethod: true
    }
  });

  console.log('Orders found since shift start:', orders.length);
  let grossTotal = 0;
  let netTotal = 0;
  
  orders.forEach(o => {
    const gross = (o.total || 0) - (o.discount || 0);
    const comm = (o.platform_id !== 1) ? (o.commission || 0) : 0;
    const net = gross - comm;
    
    grossTotal += gross;
    netTotal += net;
    
    console.log(`- ${o.order_number}: ${o.status} | Gross: ${gross} | Net: ${net} | PM: ${o.payment_method} | User: ${o.created_by_user_id}`);
  });

  console.log('SUMS:');
  console.log('Gross Total:', grossTotal);
  console.log('Net Total:', netTotal);

  process.exit(0);
}

check();
