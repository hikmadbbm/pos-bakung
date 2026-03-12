import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function sumOrderDue(orders) {
  return orders.reduce((acc, o) => {
    const total = Number(o.total || 0);
    const discount = Number(o.discount || 0);
    const due = Math.max(0, total - discount);
    return acc + due;
  }, 0);
}

export async function GET(req, { params }) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'CASHIER']);
    if (response) return response;
    const resolvedParams = await params;
    const userId = Number(resolvedParams.userId);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
    }

    const shift = await prisma.userShift.findFirst({
      where: { user_id: userId, status: 'OPEN' },
      orderBy: { id: 'desc' },
    });
    if (!shift) {
      return NextResponse.json({ error: 'No open shift' }, { status: 404 });
    }

    const orders = await prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        date: { gte: shift.start_time },
        OR: [{ created_by_user_id: userId }, { processed_by_user_id: userId }],
      },
      select: { 
        id: true, 
        total: true, 
        discount: true, 
        payment_method_id: true,
        paymentMethod: {
          select: { name: true, type: true }
        }
      },
    });

    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { is_active: true }
    });

    // Initialize with all active methods
    const methodTotals = paymentMethods.map(pm => ({
      id: pm.id,
      name: pm.name,
      type: pm.type,
      systemAmount: 0,
      count: 0
    }));

    // Add virtual Platform payment if used
    orders.forEach(o => {
      const pmId = o.payment_method_id;
      let target = methodTotals.find(m => m.id === pmId);
      
      if (!target && !pmId) {
        // Fallback for legacy or null PM
        target = methodTotals.find(m => m.type === 'CASH');
      }

      if (target) {
        const amount = Math.max(0, Number(o.total || 0) - Number(o.discount || 0));
        target.systemAmount += amount;
        target.count += 1;
      }
    });

    const totalCashSales = methodTotals
      .filter(m => m.type === 'CASH')
      .reduce((acc, m) => acc + m.systemAmount, 0);

    const totalSales = methodTotals.reduce((acc, m) => acc + m.systemAmount, 0);
    const expectedCash = Number(shift.starting_cash || 0) + totalCashSales;

    return NextResponse.json({
      summary: {
        shiftId: shift.id,
        startTime: shift.start_time,
        startingCash: shift.starting_cash,
        totalCashSales,
        totalSales,
        expectedCash,
        methodTotals
      },
    });
  } catch (error) {
    console.error('Failed to fetch shift summary:', error);
    return NextResponse.json({ error: 'Failed to fetch shift summary' }, { status: 500 });
  }
}

