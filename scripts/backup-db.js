const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }
  const backupPath = path.join(backupDir, `db-backup-${timestamp}.json`);

  console.log(`Starting database backup to: ${backupPath}`);

  try {
    const backupData = {
      users: await prisma.user.findMany(),
      activityLogs: await prisma.userActivityLog.findMany(),
      shifts: await prisma.userShift.findMany(),
      storeConfig: await prisma.storeConfig.findMany(),
      menuCategories: await prisma.menuCategory.findMany(),
      menus: await prisma.menu.findMany(),
      platforms: await prisma.platform.findMany(),
      menuPrices: await prisma.menuPrice.findMany(),
      paymentMethods: await prisma.paymentMethod.findMany(),
      orders: await prisma.order.findMany(),
      orderItems: await prisma.orderItem.findMany(),
      expenses: await prisma.expense.findMany(),
      fixedCosts: await prisma.fixedCost.findMany(),
      reconciliations: await prisma.cashierReconciliation.findMany(),
    };

    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    console.log('✅ Backup successful!');
  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
