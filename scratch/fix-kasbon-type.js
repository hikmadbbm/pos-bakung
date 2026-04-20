const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.paymentMethod.updateMany({
    where: {
      name: { contains: 'KASBON' }
    },
    data: {
      type: 'PAY_LATER'
    }
  });
  console.log(`Updated ${result.count} payment methods to PAY_LATER`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
