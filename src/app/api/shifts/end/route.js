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
    const ending_cash = Number(body.ending_cash);

    if (!Number.isFinite(user_id)) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }
    if (!Number.isFinite(ending_cash) || ending_cash < 0) {
      return NextResponse.json({ error: 'ending_cash must be a non-negative number' }, { status: 400 });
    }

    const shift = await prisma.userShift.findFirst({
      where: { user_id, status: 'OPEN' },
      orderBy: { id: 'desc' },
    });
    if (!shift) {
      return NextResponse.json({ error: 'No open shift found' }, { status: 404 });
    }

    const total_sales =
      body.total_sales === undefined || body.total_sales === null ? null : Number(body.total_sales);
    const expected_cash =
      body.expected_cash === undefined || body.expected_cash === null ? null : Number(body.expected_cash);
    const discrepancy =
      body.discrepancy === undefined || body.discrepancy === null ? null : Number(body.discrepancy);

    const updated = await prisma.userShift.update({
      where: { id: shift.id },
      data: {
        end_time: new Date(),
        ending_cash: Math.round(ending_cash),
        total_sales: total_sales !== null && Number.isFinite(total_sales) ? Math.round(total_sales) : shift.total_sales,
        expected_cash: expected_cash !== null && Number.isFinite(expected_cash) ? Math.round(expected_cash) : shift.expected_cash,
        discrepancy: discrepancy !== null && Number.isFinite(discrepancy) ? Math.round(discrepancy) : shift.discrepancy,
        note: body.note || null,
        cash_breakdown: body.cash_breakdown || null,
        reconciliation_data: body.reconciliation_data || null,
        status: 'CLOSED',
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to end shift:', error);
    return NextResponse.json({ error: 'Failed to end shift' }, { status: 500 });
  }
}

