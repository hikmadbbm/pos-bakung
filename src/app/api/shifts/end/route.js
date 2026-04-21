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
    const id = body.id ? Number(body.id) : null;
    const user_id = Number(body.user_id);
    const ending_cash = Number(body.ending_cash);

    if (!Number.isFinite(user_id)) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }
    if (!Number.isFinite(ending_cash) || ending_cash < 0) {
      return NextResponse.json({ error: 'ending_cash must be a non-negative number' }, { status: 400 });
    }

    let shift = null;
    if (id) {
      shift = await prisma.userShift.findFirst({ where: { id, status: 'OPEN' } });
    }

    if (!shift) {
      // Fallback search by user
      shift = await prisma.userShift.findFirst({
        where: { user_id, status: 'OPEN' },
        orderBy: { id: 'desc' },
      });
    }

    if (!shift) {
      // Final fallback: any open shift (matches summary inclusive logic)
      shift = await prisma.userShift.findFirst({
        where: { status: 'OPEN' },
        orderBy: { id: 'desc' },
      });
    }

    if (!shift) {
      console.error(`[Shift-End] No open shift found for user ${user_id} or ID ${id}`);
      return NextResponse.json({ error: 'No open shift found' }, { status: 404 });
    }

    const total_sales =
      body.total_sales === undefined || body.total_sales === null ? null : Number(body.total_sales);
    const expected_cash =
      body.expected_cash === undefined || body.expected_cash === null ? null : Number(body.expected_cash);
    const discrepancy =
      body.discrepancy === undefined || body.discrepancy === null ? null : Number(body.discrepancy);

    const { reconciliation_data } = body;
    const d = new Date();
    d.setUTCHours(0,0,0,0); // Standard date key (day at midnight UTC)

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Mark all kitchen orders as finished for this shift
      await tx.order.updateMany({
        where: {
          status: { in: ['PAID', 'PROCESSING'] },
        },
        data: { status: 'COMPLETED' }
      });

      // 2. Perform Cashier Reconciliation Roll-up
      if (reconciliation_data && Array.isArray(reconciliation_data.methodBreakdown)) {
        const existingRecon = await tx.cashierReconciliation.findUnique({
          where: { date: d }
        });

        const newDetails = (existingRecon?.details && typeof existingRecon.details === 'object') 
          ? { ...existingRecon.details } 
          : {};

        // Merge shift data into daily recon
        reconciliation_data.methodBreakdown.forEach(m => {
          const prev = newDetails[m.name] || { system: 0, actual: 0 };
          newDetails[m.name] = {
            system: (prev.system || 0) + (m.system || 0),
            actual: (prev.actual || 0) + (m.actual || 0)
          };
        });

        const total_system = Object.values(newDetails).reduce((acc, v) => acc + (v.system || 0), 0);
        const total_actual = Object.values(newDetails).reduce((acc, v) => acc + (v.actual || 0), 0);

        await tx.cashierReconciliation.upsert({
          where: { date: d },
          update: {
            details: newDetails,
            total_system: Math.round(total_system),
            total_actual: Math.round(total_actual),
            discrepancy: Math.round(total_actual - total_system),
            updated_at: new Date(),
            submitted_by: 'Auto-Shift-System'
          },
          create: {
            date: d,
            details: newDetails,
            total_system: Math.round(total_system),
            total_actual: Math.round(total_actual),
            discrepancy: Math.round(total_actual - total_system),
            submitted_by: 'Auto-Shift-System',
            status: 'SUBMITTED'
          }
        });
      }

      // 3. Close the shift
      return await tx.userShift.update({
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
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to end shift:', error);
    return NextResponse.json({ error: 'Failed to end shift' }, { status: 500 });
  }
}

