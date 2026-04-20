import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PUT(req, { params }) {
  try {
    const resolvedParams = await params;
    const id = Number(resolvedParams.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const body = await req.json();
    const data = {};

    if (body.name !== undefined) {
      if (!body.name || typeof body.name !== 'string') {
        return NextResponse.json({ error: 'name must be a non-empty string' }, { status: 400 });
      }
      data.name = body.name;
    }
    if (body.type !== undefined) {
      data.type = body.type;
    }
    if (body.commission_rate !== undefined) {
      const commission = Number(body.commission_rate);
      if (!Number.isFinite(commission) || commission < 0) {
        return NextResponse.json({ error: 'commission_rate must be a non-negative number' }, { status: 400 });
      }
      data.commission_rate = commission;
    }
    if (body.additional_fee !== undefined) {
      data.additional_fee = Number(body.additional_fee) || 0;
    }

    const updated = await prisma.platform.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update platform:', error);
    return NextResponse.json({ error: 'Failed to update platform' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const resolvedParams = await params;
    const id = Number(resolvedParams.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    await prisma.platform.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to delete platform:', error);
    return NextResponse.json({ error: 'Failed to delete platform' }, { status: 500 });
  }
}

