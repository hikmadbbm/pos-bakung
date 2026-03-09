import dotenv from "dotenv";
import { PrismaClient } from '@prisma/client';
import { Pool, neon } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { createApp } from "./app.js";

dotenv.config();

const client = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaNeon(client);
const prisma = new PrismaClient({ adapter });
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

const app = createApp(prisma, JWT_SECRET);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on http://0.0.0.0:${PORT}`);
});
