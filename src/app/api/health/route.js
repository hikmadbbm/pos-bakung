import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const neonUrl =
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.DATABASE_URL_UNPOOLED ||
      '';
    const sql = neon(`${neonUrl}`);
    let neonStatus = 'unknown';
    let neonError = null;
    let neonUsers = null;
    let prismaStatus = 'unknown';
    let prismaError = null;
    let users = 0;

    try {
      const neonPing = await sql`SELECT 1 as ok`;
      neonStatus = neonPing?.[0]?.ok === 1 ? 'ok' : 'unknown';
      const userCount = await sql`SELECT COUNT(*)::int as count FROM "user"`;
      neonUsers = userCount?.[0]?.count ?? null;
    } catch (e) {
      neonError = e?.message || String(e);
    }

    try {
      const ping = await prisma.$queryRaw`SELECT 1 as ok`;
      prismaStatus = ping?.[0]?.ok === 1 ? 'ok' : 'unknown';
      users = await prisma.user.count();
    } catch (e) {
      prismaError = e?.message || String(e);
    }

    return NextResponse.json({
      database: neonStatus === 'ok' || prismaStatus === 'ok' ? 'ok' : 'error',
      ping: prismaStatus,
      neon: neonStatus,
      users_count: users,
      users_count_neon: neonUsers,
      env: !!process.env.DATABASE_URL ? 'configured' : 'missing',
      neon_error: neonError,
      prisma_error: prismaError,
      url_used: neonUrl ? 'present' : 'missing',
    });
  } catch (error) {
    return NextResponse.json(
      { database: 'error', error: 'DB connection failed', detail: error?.message || 'unknown' },
      { status: 500 }
    );
  }
}
