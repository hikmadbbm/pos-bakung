import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { dayKey } from '../utils';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function sumDetails(details, key) {
  if (!details || typeof details !== 'object') return 0;
  return Object.values(details).reduce((acc, v) => acc + (Number(v?.[key]) || 0), 0);
}

export async function POST(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    const body = await req.json();
    const { date, details, notes, submitted_by } = body;

    const d = dayKey(date);
    if (!d) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }
    if (!details || typeof details !== 'object') {
      return NextResponse.json({ error: 'details is required' }, { status: 400 });
    }

    const total_system = Math.round(sumDetails(details, 'system'));
    const total_actual = Math.round(sumDetails(details, 'actual'));
    const discrepancy = total_actual - total_system;

    const saved = await prisma.cashierReconciliation.upsert({
      where: { date: d },
      update: {
        details,
        notes: notes || null,
        submitted_by: submitted_by || null,
        total_system,
        total_actual,
        discrepancy,
        status: 'SUBMITTED',
      },
      create: {
        date: d,
        opening_cash: 0,
        closing_cash: 0,
        total_system,
        total_actual,
        discrepancy,
        notes: notes || null,
        submitted_by: submitted_by || null,
        status: 'SUBMITTED',
        details,
      },
    });

    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    console.error('Failed to submit reconciliation:', error);
    return NextResponse.json({ error: 'Failed to submit reconciliation' }, { status: 500 });
  }
}

