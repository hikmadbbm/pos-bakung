require("dotenv").config({ override: true });

const { PrismaClient } = require("./lib/generated/prisma-client");

const prisma = new PrismaClient();

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const u = new URL(databaseUrl);
  console.log("DB host:", u.host);
  console.log("DB database:", u.pathname.replace(/^\//, ""));

  const tables = await prisma.$queryRaw`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `;
  const tableNames = Array.isArray(tables) ? tables.map((t) => t.tablename) : [];
  console.log("public tables:", tableNames.length ? tableNames.join(", ") : "(none)");

  const userCount = await prisma.user.count();
  console.log("OK user.count =", userCount);
}

main()
  .catch((e) => {
    console.error("FAIL", e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
