
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function remediate() {
  try {
    console.log('--- STARTING REMEDIATION ---');

    // 1. Find the "stuck" shift for User ID 8
    const stuckShift = await prisma.userShift.findFirst({
      where: { user_id: 8, status: 'OPEN' }
    });

    if (stuckShift) {
      console.log(`Closing stuck shift ID: ${stuckShift.id} for User ID: 8`);
      await prisma.userShift.update({
        where: { id: stuckShift.id },
        data: {
          status: 'CLOSED',
          end_time: new Date(),
          note: 'Automatically closed during remediation of duplicate user account.'
        }
      });
      console.log('Stuck shift closed.');
    } else {
      console.log('No stuck shift found for User ID 8.');
    }

    // 2. Identify the users
    const userToKeep = await prisma.user.findUnique({ where: { id: 5 } }); // hikmadd
    const userToDelete = await prisma.user.findUnique({ where: { id: 8 } }); // Hikmad Dr...

    if (userToKeep && userToDelete) {
      console.log(`Merging/Deleting duplicate user: ${userToDelete.name} (ID: 8)`);
      console.log(`Keeping primary user: ${userToKeep.username} (ID: 5)`);

      // Ideally we would migrate related records, but for a simple fix:
      // Check if ID 8 has other records
      const shiftCount = await prisma.userShift.count({ where: { user_id: 8 } });
      const logCount = await prisma.userActivityLog.count({ where: { user_id: 8 } });
      
      console.log(`User ID 8 has ${shiftCount} shifts and ${logCount} activity logs.`);

      // If we want to be safe, we just set ID 8 to INACTIVE instead of deleting
      await prisma.user.update({
        where: { id: 8 },
        data: { status: 'INACTIVE', username: `deleted_${userToDelete.username}_${Date.now()}` }
      });
      console.log('User ID 8 deactivated and renamed to avoid collisions.');
    }

    console.log('--- REMEDIATION COMPLETE ---');
  } catch (err) {
    console.error('Remediation failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

remediate();
