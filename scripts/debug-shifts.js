
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkShifts() {
  try {
    const openShifts = await prisma.userShift.findMany({
      where: { status: 'OPEN' },
      include: {
        user: {
          select: { username: true, name: true }
        }
      }
    });
    console.log('--- OPEN SHIFTS ---');
    console.log(JSON.stringify(openShifts, null, 2));
    console.log('-------------------');
    
    // Also check total shifts to see if some are closed
    const totalCount = await prisma.userShift.count();
    console.log('Total shifts in DB:', totalCount);
    
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkShifts();
