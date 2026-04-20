const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.platform.updateMany({
    where: { 
      name: { contains: 'Shopee', mode: 'insensitive' } 
    },
    data: { 
      commission_rate: 21 
    }
  });
  console.log('Successfully updated Shopee commission to 21%:', result);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
