import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '60');
    const rows = await prisma.cashierReconciliation.findMany({
      orderBy: { date: 'desc' },
      take: Number.isFinite(limit) ? limit : 60,
    });
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Failed to fetch reconciliation history:', error);
    return NextResponse.json({ error: 'Failed to fetch reconciliation history' }, { status: 500 });
  }
}

