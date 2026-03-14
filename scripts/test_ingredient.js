const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const ing = await prisma.ingredient.create({
      data: {
        category: "Test",
        item_name: "Test Ingredient",
        brand: "Test Brand",
        volume: 100,
        unit: "gr",
        price: 1000,
        cost_per_unit: 10,
        purchase_location: "Test Location",
        price_history: {
          create: { price: 1000 }
        }
      }
    });
    console.log('Success:', ing);
  } catch (e) {
    console.error('Error detail:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
