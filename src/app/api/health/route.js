import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    let neonStatus = 'unknown';
    let prismaStatus = 'unknown';
    let users = 0;

    const neonPing = await sql`SELECT 1 as ok`;
    neonStatus = neonPing?.[0]?.ok === 1 ? 'ok' : 'unknown';

    const ping = await prisma.$queryRaw`SELECT 1 as ok`;
    prismaStatus = ping?.[0]?.ok === 1 ? 'ok' : 'unknown';
    users = await prisma.user.count();

    return NextResponse.json({
      database: 'ok',
      ping: prismaStatus,
      neon: neonStatus,
      users_count: users,
      env: !!process.env.DATABASE_URL ? 'configured' : 'missing',
    });
  } catch (error) {
    return NextResponse.json(
      { database: 'error', error: 'DB connection failed', detail: error?.message || 'unknown' },
      { status: 500 }
    );
  }
}
