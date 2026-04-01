const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Starting WAC baseline initialization...");
  
  const ingredients = await prisma.ingredient.findMany();
  
  for (const ing of ingredients) {
    if (ing.cost_per_unit === 0 || !ing.cost_per_unit) {
      const vol = Number(ing.volume) || 1;
      const cpu = Number(ing.price) / vol;
      
      console.log(`Setting CPU for ${ing.item_name}: ${cpu}`);
      
      await prisma.ingredient.update({
        where: { id: ing.id },
        data: { cost_per_unit: cpu }
      });
      
      // Update price history too if empty
      const history = await prisma.ingredientPriceHistory.findFirst({
         where: { ingredient_id: ing.id }
      });
      
      if (!history) {
         await prisma.ingredientPriceHistory.create({
            data: {
               ingredient_id: ing.id,
               price: ing.price,
               cost_per_unit: cpu,
               vendor_name: "INITIAL_SYNC",
               change_percentage: 0
            }
         });
      }
    }
  }
  
  console.log("Sync complete.");
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
