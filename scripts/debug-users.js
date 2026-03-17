
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany();
    console.log('--- ALL USERS ---');
    users.forEach(u => {
      console.log(`ID: ${u.id} | UN: ${u.username} | Role: ${u.role} | Name: ${u.name}`);
    });
    console.log('-----------------');
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
