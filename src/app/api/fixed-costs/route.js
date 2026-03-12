import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const fixedCosts = await prisma.fixedCost.findMany({
      orderBy: { id: 'asc' },
    });
    return NextResponse.json(fixedCosts);
  } catch (error) {
    console.error('Failed to fetch fixed costs:', error);
    return NextResponse.json({ error: 'Failed to fetch fixed costs' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, amount, frequency, is_active } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
    }
    if (!frequency || typeof frequency !== 'string') {
      return NextResponse.json({ error: 'frequency is required' }, { status: 400 });
    }

    const created = await prisma.fixedCost.create({
      data: {
        name,
        amount: Math.round(amt),
        frequency,
        is_active: is_active === undefined ? true : Boolean(is_active),
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Failed to create fixed cost:', error);
    return NextResponse.json({ error: 'Failed to create fixed cost' }, { status: 500 });
  }
}

