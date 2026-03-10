import { createApp } from '../../../../backend/src/app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

const app = createApp(prisma, JWT_SECRET);

export default function handler(req, res) {
  // Debug log
  console.log(`[API Proxy] Incoming Request: ${req.method} ${req.url}`);

  // Manually handle CORS Preflight (OPTIONS)
  // This ensures that even if Express fails to handle it, we respond correctly.
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust this in production if needed
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Ensure the URL passed to Express matches what Express expects.
  // We reconstruct the URL using the 'slug' parameter provided by Next.js
  // to guarantee it matches the '/api/...' pattern expected by the backend app.
  if (req.query && req.query.slug) {
    const slugPath = Array.isArray(req.query.slug) ? req.query.slug.join('/') : req.query.slug;
    const queryString = req.url.split('?')[1];
    req.url = `/api/${slugPath}${queryString ? '?' + queryString : ''}`;
    console.log(`[API Proxy] Rewrote URL to: ${req.url}`);
  } else if (!req.url.startsWith('/api')) {
      // Fallback if slug is missing
      req.url = '/api' + req.url;
      console.log(`[API Proxy] Rewrote URL (fallback) to: ${req.url}`);
  }

  // Forward to Express app
  // Express app is a request listener: (req, res, next) => void
  app(req, res, (err) => {
    if (err) {
      console.error("[API Proxy] Express error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal Server Error" });
      }
      return;
    }
    // If next() is called, it means no route matched
    if (!res.headersSent) {
      console.warn(`[API Proxy] 404 Not Found (Express passed): ${req.method} ${req.url}`);
      res.status(404).json({ error: `Route not found: ${req.method} ${req.url}` });
    }
  });
}

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};
