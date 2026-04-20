const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orderId = 418;
  const targetNet = 15080;
  
  const adjustments = [
    { label: "Koreksi Selisih Harga Shopee", type: "FIXED", value: 2000 }, // Deduct 2000 (33k -> 31k)
    { label: "Koreksi Kelebihan Komisi (60%)", type: "FIXED", value: -13230 }, // Add back 13230 (19.8k -> 6.57k)
    { label: "Subsidi Merchant (Voucher & Ongkir)", type: "FIXED", value: 9350 } // Deduct 9350
  ];

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      platform_actual_net: targetNet,
      platform_adjustments: adjustments
    }
  });

  console.log("Order synchronized successfully:", updated.order_number);
  console.log("Final Actual Net:", updated.platform_actual_net);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
