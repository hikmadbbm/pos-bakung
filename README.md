# POS Bakung

Next.js (App Router) POS application with Prisma (PostgreSQL/Neon).

## Structure

- `src/` application code (pages, API routes, components, libs)
- `prisma/` Prisma schema + migrations
- `public/` static assets

## Requirements

- Node.js (recommended: LTS)
- A PostgreSQL database (e.g. Neon)

## Setup

1. Install dependencies:

```bash
npm ci
```

2. Configure environment:

- Copy `.env.example` to `.env.local`
- Fill `DATABASE_URL`. `DIRECT_URL` is optional (not required by the schema).

3. Generate Prisma client:

```bash
npm run prisma:generate
```

4. Start development server:

```bash
npm run dev
```

## Common Commands

- `npm run dev` start Next.js dev server
- `npm run build` generate Prisma client + build
- `npm run start` run production server
- `npm run lint` run ESLint
- `npm test` run Jest tests
- `npm run prisma:studio` open Prisma Studio
 - `npx prisma db push` (optional) apply schema to the database outside of Vercel builds

## Deploy (Vercel)
- Set `DATABASE_URL` in Project → Settings → Environment Variables (Production and Preview).
- The build no longer runs `prisma db push`. Run migrations separately (locally or via CI/CD) if needed.
- Recommended: upgrade Next.js to the latest 14.2.x release to address RSC security advisories.
