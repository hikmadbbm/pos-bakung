const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orderId = 414;
  const targetNet = 20926;
  
  const adjustments = [
    { label: "Koreksi Selisih Harga Grab", type: "FIXED", value: -500 }, // Add 500
    { label: "Koreksi Kelebihan Komisi (23% -> 20%)", type: "FIXED", value: -1625 }, // Add back 1625
    { label: "Marketing Success Fee", type: "FIXED", value: 10440 }, // Deduct
    { label: "Advertisement Fee (Iklan)", type: "FIXED", value: 15034 } // Deduct
  ];

  await prisma.order.update({
    where: { id: orderId },
    data: {
      platform_actual_net: targetNet,
      platform_adjustments: adjustments
    }
  });

  await prisma.platform.updateMany({
    where: { name: { contains: 'Grab', mode: 'insensitive' } },
    data: { commission_rate: 20 }
  });

  console.log("Grab Order synchronized to 20,926 and commission rate updated to 20%");
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
