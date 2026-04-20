const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log('Tables:', tables.map(t => t.table_name).join(', '));
  } catch (err) {
    console.error('Failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
