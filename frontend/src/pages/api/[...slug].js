import { createApp } from '../../../../backend/src/app';
import { PrismaClient } from '@prisma/client';

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

function sanitizeDatabaseUrl(rawUrl) {
  if (!rawUrl) return null;
  try {
    const u = new URL(rawUrl);
    return {
      protocol: u.protocol,
      host: u.hostname,
      port: u.port,
      database: u.pathname?.replace(/^\//, "") || "",
      search: u.search || "",
    };
  } catch {
    return { raw: "unparseable" };
  }
}

// Use global to cache PrismaClient in development (standard practice for Next.js)
let prisma;
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

// Create Express app
const app = createApp(prisma, JWT_SECRET);

let prismaReadyPromise;
async function ensurePrismaReady() {
  if (prismaReadyPromise) return prismaReadyPromise;
  prismaReadyPromise = (async () => {
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
        return true;
      } catch (err) {
        const retryable = isRetryablePrismaError(err);
        if (!retryable || attempt === maxAttempts) throw err;
        const backoff = Math.min(5000, baseDelayMs * 2 ** (attempt - 1));
        const jitter = Math.floor(Math.random() * 150);
        await sleep(backoff + jitter);
      }
    }
    return true;
  })();
  return prismaReadyPromise;
}

export default async function handler(req, res) {
  // Debug log
  console.log(`[API Proxy] Incoming Request: ${req.method} ${req.url}`);

  const slugPath = req.query && req.query.slug
    ? (Array.isArray(req.query.slug) ? req.query.slug.join('/') : req.query.slug)
    : null;

  // Manually handle CORS Preflight (OPTIONS)
  // This ensures that even if Express fails to handle it, we respond correctly.
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (slugPath !== "health") {
    try {
      await ensurePrismaReady();
    } catch (error) {
      console.error("[API Proxy] Prisma init error:", error, {
        database: sanitizeDatabaseUrl(process.env.DATABASE_URL),
        direct: sanitizeDatabaseUrl(process.env.DIRECT_URL),
      });
      if (!res.headersSent) {
        res.status(503).json({
          error: "Database unavailable",
          code: error?.code || error?.name || "PRISMA_INIT_ERROR",
          message: process.env.NODE_ENV === "production" ? "Temporary database connectivity issue" : (error?.message || "Unknown error"),
        });
      }
      return;
    }
  }

  // Ensure the URL passed to Express matches what Express expects.
  // We reconstruct the URL using the 'slug' parameter provided by Next.js
  // to guarantee it matches the '/api/...' pattern expected by the backend app.
  if (req.query && req.query.slug) {
    const queryString = req.url.split('?')[1];
    req.url = `/api/${slugPath}${queryString ? '?' + queryString : ''}`;
    console.log(`[API Proxy] Rewrote URL to: ${req.url}`);
  } else if (!req.url.startsWith('/api')) {
      // Fallback if slug is missing
      req.url = '/api' + req.url;
      console.log(`[API Proxy] Rewrote URL (fallback) to: ${req.url}`);
  }

  // Important for Express in Serverless environment:
  // Sometimes Express doesn't handle the response correctly if it's called as a function.
  // We wrap it in a try-catch to be safe.
  try {
    app(req, res, (err) => {
      if (err) {
        console.error("[API Proxy] Express error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Internal Server Error", details: err.message });
        }
        return;
      }
      
      // If next() is called, it means no route matched in Express
      if (!res.headersSent) {
        console.warn(`[API Proxy] 404 Not Found (Express passed): ${req.method} ${req.url}`);
        // Instead of just 404, let's see if we can provide more info
        res.status(404).json({ 
          error: `Route not found: ${req.method} ${req.url}`,
          available_methods: ["POST", "GET", "PUT", "DELETE"] // Just a hint
        });
      }
    });
  } catch (error) {
    console.error("[API Proxy] Critical crash:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "API Gateway Error", message: error.message });
    }
  }
}

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};
