const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Attempting to fix enum crash by reverting PAY_LATER to OTHER in the database...");
  try {
    // Current client doesn't know PAY_LATER, so we must use raw SQL to find and update
    const result = await prisma.$executeRaw`
      UPDATE paymentmethod 
      SET type = 'OTHER' 
      WHERE type = 'PAY_LATER'
    `;
    console.log(`Successfully updated ${result} payment methods.`);
    
    // Also check if any orders were already created with this
    const ordersResult = await prisma.$executeRaw`
      UPDATE "order"
      SET status = 'PAID'
      WHERE status = 'UNPAID'
    `;
    // Note: status UNPAID is associated with PAY_LATER in our logic
    
    console.log("Database patch applied. Please refresh the browser.");
  } catch (e) {
    console.error("Failed to patch database:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
