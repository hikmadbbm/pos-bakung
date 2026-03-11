const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

(async () => {
  const passwordHash = await bcrypt.hash('owner', 10);
  const user = await prisma.user.upsert({
    where: { username: 'owner' },
    update: {
      name: 'Owner',
      password: passwordHash,
      role: 'OWNER',
      status: 'ACTIVE',
    },
    create: {
      name: 'Owner',
      username: 'owner',
      password: passwordHash,
      role: 'OWNER',
      status: 'ACTIVE',
    },
    select: { id: true, name: true, username: true, role: true, status: true },
  });
  console.log(JSON.stringify(user));
  await prisma.$disconnect();
  process.exit(0);
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
