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
    if (body.amount !== undefined) {
      const amt = Number(body.amount);
      if (!Number.isFinite(amt) || amt <= 0) {
        return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
      }
      data.amount = Math.round(amt);
    }
    if (body.frequency !== undefined) {
      if (!body.frequency || typeof body.frequency !== 'string') {
        return NextResponse.json({ error: 'frequency must be string' }, { status: 400 });
      }
      data.frequency = body.frequency;
    }
    if (body.is_active !== undefined) {
      data.is_active = Boolean(body.is_active);
    }

    const updated = await prisma.fixedCost.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update fixed cost:', error);
    return NextResponse.json({ error: 'Failed to update fixed cost' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const resolvedParams = await params;
    const id = Number(resolvedParams.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    await prisma.fixedCost.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to delete fixed cost:', error);
    return NextResponse.json({ error: 'Failed to delete fixed cost' }, { status: 500 });
  }
}

