const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const username = 'hikmaddr';
    const users = await prisma.$queryRawUnsafe(
      `SELECT * FROM "User" WHERE "username" = $1 LIMIT 1`,
      username
    );
    console.log('User found:', users[0] ? users[0].name : 'NOT FOUND');
    
    if (users[0]) {
        const otp = '123456';
        const expiry = new Date();
        await prisma.$executeRawUnsafe(
          `UPDATE "User" SET "otp" = $1, "otp_expiry" = $2 WHERE "id" = $3`,
          otp,
          expiry,
          users[0].id
        );
        console.log('Update successful');
    }
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
