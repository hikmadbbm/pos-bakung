import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const ping = await prisma.$queryRaw`SELECT 1 as ok`;
    const users = await prisma.user.count();
    return NextResponse.json({
      database: 'ok',
      ping: ping?.[0]?.ok === 1 ? 'ok' : 'unknown',
      users_count: users,
      env: !!process.env.DATABASE_URL ? 'configured' : 'missing',
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({ database: 'error', error: 'DB connection failed' }, { status: 500 });
  }
}
