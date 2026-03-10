import dotenv from "dotenv";
import { PrismaClient } from '@prisma/client';
import { createApp } from "./app.js";

dotenv.config();

const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

const app = createApp(prisma, JWT_SECRET);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on http://0.0.0.0:${PORT}`);
});
