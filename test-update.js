const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testUpdate() {
  const id = 7; // Es Teller Creamy from previous check
  try {
    const data = {
        name: "Es Teller Creamy Update",
        price: 13000,
        cost: 13000,
        categoryId: 13,
        is_active: true
    };
    
    const updated = await prisma.$transaction(async (tx) => {
      await tx.menuPrice.deleteMany({ where: { menu_id: id } });
      return await tx.menu.update({
        where: { id },
        data: {
          ...data,
          prices: {
            create: [
              { platform_id: 3, price: 15000 },
              { platform_id: 4, price: 16000 }
            ]
          }
        },
        include: {
          category: true,
          prices: true
        }
      });
    });
    console.log("UPDATE SUCCESS:", updated.id);
  } catch (e) {
    console.error("UPDATE ERROR REPLICATED:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

testUpdate();
