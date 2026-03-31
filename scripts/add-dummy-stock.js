const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addDummyStock() {
  try {
    const ingredients = await prisma.ingredient.findMany();
    console.log(`Found ${ingredients.length} ingredients.`);

    for (const ingredient of ingredients) {
      const dummyQty = 5000 + Math.floor(Math.random() * 5000); // Massive testing buffer (5000 to 10000)
      
      // Update stock
      await prisma.ingredient.update({
        where: { id: ingredient.id },
        data: { stock: { increment: dummyQty } }
      });

      // Log movement to prevent future errors
      await prisma.stockMovement.create({
        data: {
          ingredient_id: ingredient.id,
          movement_type: 'ADJUSTMENT',
          quantity: dummyQty,
          unit: ingredient.unit,
          reference_type: 'ADJUSTMENT'
          // note: 'Initial dummy stock load' -> Removed to be safe with schema 
        }
      });

      console.log(`- Added ${dummyQty} ${ingredient.unit} to ${ingredient.item_name}`);
    }

    console.log('Dummy stock load complete.');
  } catch (error) {
    console.error('Error adding dummy stock:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addDummyStock();
