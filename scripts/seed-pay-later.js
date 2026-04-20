const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addPayLater() {
  await prisma.paymentMethod.create({
    data: {
      name: "KASBON (PAY LATER)",
      type: "PAY_LATER",
      description: "Hutang/Kasbon Pelanggan",
      is_active: true,
      display_order: 99
    }
  });
  console.log("Kasbon added");
  process.exit(0);
}
addPayLater();
