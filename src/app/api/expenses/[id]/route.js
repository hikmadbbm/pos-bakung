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

    if (body.item !== undefined) {
      if (!body.item || typeof body.item !== 'string') {
        return NextResponse.json({ error: 'item must be a non-empty string' }, { status: 400 });
      }
      data.item = body.item;
    }
    if (body.category !== undefined) {
      data.category = body.category || "OTHERS";
    }
    if (body.amount !== undefined) {
      const amt = Number(body.amount);
      if (!Number.isFinite(amt) || amt <= 0) {
        return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
      }
      data.amount = Math.round(amt);
    }
    if (body.description !== undefined) {
      data.description = body.description || null;
    }
    if (body.date !== undefined) {
      data.date = new Date(body.date);
    }
    if (body.funding_source !== undefined) {
      data.funding_source = body.funding_source;
    }
    if (body.is_cash !== undefined) {
      data.is_cash = body.is_cash;
    }

    const updated = await prisma.expense.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update expense:', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const resolvedParams = await params;
    const id = Number(resolvedParams.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    await prisma.expense.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to delete expense:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
