const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({ 
    take: 10, 
    orderBy: { date: 'desc' },
    select: {
        id: true,
        order_number: true,
        date: true,
        total: true,
        status: true,
        customer_name: true
    }
  });
  console.log(JSON.stringify(orders, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
