
import { PrismaClient } from "@prisma/client";
import fs from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting restore...");
  const filePath = path.join(process.cwd(), "menu-backup.json");

  try {
    const data = JSON.parse(await fs.readFile(filePath, "utf-8"));
    const { categories, platforms, menus, menuPrices } = data;

    console.log(`Found backup data from: ${data.backupDate}`);

    // Transaction to ensure data integrity
    await prisma.$transaction(async (tx) => {
      // 1. Restore Categories
      console.log("Restoring Categories...");
      for (const cat of categories) {
        await tx.menuCategory.upsert({
          where: { id: cat.id },
          update: {
            name: cat.name,
            color: cat.color
          },
          create: {
            id: cat.id,
            name: cat.name,
            color: cat.color
          }
        });
      }

      // 2. Restore Platforms
      console.log("Restoring Platforms...");
      for (const p of platforms) {
        await tx.platform.upsert({
          where: { id: p.id },
          update: {
            name: p.name,
            type: p.type,
            commission_rate: p.commission_rate
          },
          create: {
            id: p.id,
            name: p.name,
            type: p.type,
            commission_rate: p.commission_rate,
            created_at: p.created_at
          }
        });
      }

      // 3. Restore Menus
      console.log("Restoring Menus...");
      for (const m of menus) {
        await tx.menu.upsert({
          where: { id: m.id },
          update: {
            name: m.name,
            price: m.price,
            cost: m.cost,
            categoryId: m.categoryId
          },
          create: {
            id: m.id,
            name: m.name,
            price: m.price,
            cost: m.cost,
            categoryId: m.categoryId,
            created_at: m.created_at
          }
        });
      }

      // 4. Restore Menu Prices
      console.log("Restoring Menu Prices...");
      for (const mp of menuPrices) {
        await tx.menuPrice.upsert({
          where: { id: mp.id },
          update: {
            menu_id: mp.menu_id,
            platform_id: mp.platform_id,
            price: mp.price
          },
          create: {
            id: mp.id,
            menu_id: mp.menu_id,
            platform_id: mp.platform_id,
            price: mp.price
          }
        });
      }
    });

    console.log("Restore completed successfully!");

  } catch (error) {
    console.error("Restore failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
