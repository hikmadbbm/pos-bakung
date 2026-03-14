const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const data = {
      category: "Bahan Utama",
      item_name: "Teh",
      brand: "Chatramue Original",
      volume: 400,
      unit: "gr",
      price: 58000,
      purchase_location: "Shopee",
      purchase_link: "https://shopee.co.id/Chatramue-Thai-Tea-Thailand-400-Gram-Chatramue-Brand-i.171",
      notes: ""
    };
    
    const vol = parseFloat(data.volume);
    const prc = parseInt(data.price);
    const cpu = vol > 0 ? prc / vol : 0;

    const ing = await prisma.ingredient.create({
      data: {
        category: data.category,
        item_name: data.item_name,
        brand: data.brand || 'Local',
        volume: vol,
        unit: data.unit,
        price: prc,
        cost_per_unit: cpu,
        purchase_location: data.purchase_location,
        purchase_link: data.purchase_link,
        notes: data.notes,
        price_history: {
          create: { price: prc }
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
