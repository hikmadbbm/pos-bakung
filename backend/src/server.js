import dotenv from "dotenv";
import { PrismaClient } from '@prisma/client';
import { createApp } from "./app.js";

dotenv.config();

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryablePrismaError(err) {
  const code = err?.code;
  if (code && ["P1001", "P1002", "P1003", "P1017"].includes(code)) return true;
  const name = err?.name;
  if (name === "PrismaClientInitializationError") return true;
  const msg = String(err?.message || "");
  return (
    msg.includes("Can't reach database server") ||
    msg.includes("Timed out") ||
    msg.includes("timeout") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("EAI_AGAIN")
  );
}

async function connectWithRetry(prisma) {
  if (!process.env.DATABASE_URL) {
    const err = new Error("DATABASE_URL is not set");
    err.code = "MISSING_DATABASE_URL";
    throw err;
  }

  const maxAttempts = Number(process.env.PRISMA_CONNECT_MAX_ATTEMPTS || 6);
  const baseDelayMs = Number(process.env.PRISMA_CONNECT_BASE_DELAY_MS || 250);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await prisma.$connect();
      return;
    } catch (err) {
      const retryable = isRetryablePrismaError(err);
      if (!retryable || attempt === maxAttempts) throw err;
      const backoff = Math.min(5000, baseDelayMs * 2 ** (attempt - 1));
      const jitter = Math.floor(Math.random() * 150);
      await sleep(backoff + jitter);
    }
  }
}

const prisma = new PrismaClient();
const app = createApp(prisma, JWT_SECRET);

(async () => {
  try {
    await connectWithRetry(prisma);
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Backend running on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to initialize database connection:", err);
    process.exit(1);
  }
})();
