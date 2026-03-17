const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orderNumber = 'TRX-0315-001';
  const order = await prisma.order.findUnique({
    where: { order_number: orderNumber },
    include: {
      paymentMethod: true,
      platform: true
    }
  });

  console.log('--- Order Details ---');
  console.log(JSON.stringify(order, null, 2));

  const paymentMethods = await prisma.paymentMethod.findMany();
  console.log('\n--- Payment Methods ---');
  console.log(JSON.stringify(paymentMethods, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
