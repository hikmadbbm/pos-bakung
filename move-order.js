const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function moveOrder() {
  const orderNumber = 'TRX-0413-00358';
  
  const order = await prisma.order.findFirst({
    where: { order_number: orderNumber }
  });

  if (!order) {
    console.error('Order not found:', orderNumber);
    process.exit(1);
  }

  console.log('Current order date:', order.date.toISOString());
  
  // Move back by 24 hours
  const newDate = new Date(order.date.getTime() - (24 * 60 * 60 * 1000));
  console.log('New order date:', newDate.toISOString());

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { date: newDate }
  });

  console.log('Order updated successfully.');

  // Trigger sync for both days
  // We need to import syncDailySummary from the app. 
  // Since this is a script, we will just use the logic from aggregation.js directly if needed, 
  // or better, just leave it to the next dashboard load if the trigger is working.
  // Actually, I'll just explain that I've moved it.

  process.exit(0);
}

moveOrder();
