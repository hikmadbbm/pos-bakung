import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/app.js';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

const app = createApp(prisma, JWT_SECRET);

export default app;
