
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding default owner...");

  const username = "owner";
  const password = "password123";

  try {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      console.log("Owner user already exists.");
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name: "Owner",
        username,
        email: "owner@bakung.com",
        password: hash,
        role: "OWNER",
        status: "ACTIVE"
      }
    });

    console.log(`Owner created: ${user.username} / ${password}`);
  } catch (e) {
    console.error("Seeding failed:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
