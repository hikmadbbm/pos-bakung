# Monorepo to Standard Structure Migration

This repository previously contained multiple independent Next.js projects in a single Git repository (a “monorepo-like” layout), but without any real workspace tooling (no `workspaces`, `pnpm-workspace.yaml`, Turborepo, Nx, etc.). The extra projects increased maintenance cost and created version/config drift.

## What “Monorepo-like” Meant Here

The repository contained:

- A primary Next.js + Prisma POS app at the repository root (`src/`, `prisma/`, `package.json`)
- Additional unrelated Next.js apps:
  - `--template/` (Create Next App template project)
  - `my-prisma-postgres-app/` (Prisma Postgres starter example)
- Multiple nested `package.json` and `package-lock.json` files with conflicting dependency versions (e.g. Next/React major versions differed per folder)
- Legacy scripts/docs referencing an older backend/frontend split that no longer exists

## Target “Standard” Structure

The repo is now a single, standard Next.js application:

- `package.json` at the repository root (single dependency graph)
- `src/` for application code
- `prisma/` for schema and migrations
- `public/` for static assets
- Root configs (`next.config.mjs`, `tailwind.config.js`, `jest.config.js`, etc.)

## Changes Implemented

- Removed unused nested projects to eliminate duplicated configs and dependency drift:
  - `--template/`
  - `my-prisma-postgres-app/`
- Removed legacy/monorepo artifact script:
  - `scripts/prebuild.js` (referenced a non-existent `backend/` directory)
- Removed unused screenshot script:
  - `scripts/capture-screens.mjs` (required `puppeteer` but it was not a dependency)
- Cleaned root ignore rules:
  - Removed backend-specific ignore entries from `.gitignore`
- Updated documentation to match the current single-app architecture:
  - `LOGIN_TROUBLESHOOTING.md` now references Next.js API routes instead of a removed backend
- Added a standard test entry point:
  - Added `npm test` (`jest`) in `package.json`

## Verification Checklist

- `npm run lint`
- `npm test`
- `npm run build`
