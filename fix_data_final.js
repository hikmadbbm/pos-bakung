const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Starting final data correction...");

  try {
    const pms = await prisma.paymentMethod.findMany();
    console.log(`Found ${pms.length} payment methods.`);

    const ordersToFix = await prisma.order.findMany({
      where: {
        payment_method_id: null,
      }
    });

    console.log(`Found ${ordersToFix.length} orders with missing payment_method_id.`);

    let fixCount = 0;
    for (const order of ordersToFix) {
      if (!order.payment_method) continue;
      
      const matchingPM = pms.find(pm => pm.name.toLowerCase() === order.payment_method.toLowerCase());
      
      if (matchingPM) {
        await prisma.order.update({
          where: { id: order.id },
          data: { payment_method_id: matchingPM.id }
        });
        fixCount++;
        console.log(`Fixed Order ${order.order_number}: mapped "${order.payment_method}" to PM ID ${matchingPM.id}`);
      }
    }

    console.log(`Successfully fixed ${fixCount} orders.`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
