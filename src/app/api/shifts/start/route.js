import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'CASHIER']);
    if (response) return response;
    const body = await req.json();
    const user_id = Number(body.user_id);
    const starting_cash = body.starting_cash === undefined ? 0 : Number(body.starting_cash);

    if (!Number.isFinite(user_id)) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }
    if (!Number.isFinite(starting_cash) || starting_cash < 0) {
      return NextResponse.json({ error: 'starting_cash must be a non-negative number' }, { status: 400 });
    }

    const existing = await prisma.userShift.findFirst({
      where: { status: 'OPEN', user_id },
      orderBy: { id: 'desc' },
    });
    if (existing) {
      return NextResponse.json({ error: 'Shift already open' }, { status: 400 });
    }

    const shift = await prisma.userShift.create({
      data: {
        user_id,
        starting_cash: Math.round(starting_cash),
        status: 'OPEN',
      },
    });
    return NextResponse.json(shift, { status: 201 });
  } catch (error) {
    console.error('Failed to start shift:', error);
    return NextResponse.json({ error: 'Failed to start shift' }, { status: 500 });
  }
}

