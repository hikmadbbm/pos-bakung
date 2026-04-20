import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req) {
  const startTime = Date.now();
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'CASHIER']);
    if (response) return response;
    const platforms = await prisma.platform.findMany({
      orderBy: { id: 'asc' },
    });
    
    const duration = Date.now() - startTime;
    console.log(`GET /api/platforms took ${duration}ms`);

    return NextResponse.json(platforms, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      }
    });
  } catch (error) {
    console.error('Failed to fetch platforms:', error);
    return NextResponse.json({ error: 'Failed to fetch platforms' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;
    const body = await req.json();
    const { name, type, commission_rate, additional_fee } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const commission = commission_rate === undefined || commission_rate === null ? 0 : Number(commission_rate);
    if (!Number.isFinite(commission) || commission < 0) {
      return NextResponse.json({ error: 'commission_rate must be a non-negative number' }, { status: 400 });
    }

    const created = await prisma.platform.create({
      data: {
        name,
        type: type || 'OFFLINE',
        commission_rate: commission,
        additional_fee: Number(additional_fee) || 0,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Failed to create platform:', error);
    return NextResponse.json({ error: 'Failed to create platform' }, { status: 500 });
  }
}

