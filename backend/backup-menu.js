
import { PrismaClient } from "@prisma/client";
import fs from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting backup...");

  try {
    const categories = await prisma.menuCategory.findMany();
    const platforms = await prisma.platform.findMany();
    const menus = await prisma.menu.findMany();
    const menuPrices = await prisma.menuPrice.findMany();

    const backupData = {
      categories,
      platforms,
      menus,
      menuPrices,
      backupDate: new Date().toISOString()
    };

    const filePath = path.join(process.cwd(), "menu-backup.json");
    await fs.writeFile(filePath, JSON.stringify(backupData, null, 2));

    console.log(`Backup completed successfully!`);
    console.log(`Categories: ${categories.length}`);
    console.log(`Platforms: ${platforms.length}`);
    console.log(`Menus: ${menus.length}`);
    console.log(`Menu Prices: ${menuPrices.length}`);
    console.log(`File saved at: ${filePath}`);

  } catch (error) {
    console.error("Backup failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
