import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req, { params }) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'CASHIER']);
    if (response) return response;

    const resolvedParams = await params;
    const id = Number(resolvedParams?.id);
    if (!id || !Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid shift id' }, { status: 400 });
    }

    const [shift, storeConfig] = await Promise.all([
      prisma.userShift.findUnique({
        where: { id },
        include: { user: { select: { name: true, username: true } } }
      }),
      prisma.storeConfig.findFirst()
    ]);

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    // Orders processed during this shift by this user
    const orders = await prisma.order.findMany({
      where: {
        processed_by_user_id: shift.user_id,
        date: {
          gte: shift.start_time,
          lte: shift.end_time || new Date()
        },
        status: { in: ['PAID', 'PROCESSING', 'COMPLETED'] }
      },
      select: {
          id: true,
          total: true,
          discount: true,
          status: true
      }
    });

    const totalSales = orders.reduce((acc, o) => acc + Math.max(0, (o.total || 0) - (o.discount || 0)), 0);
    const totalBillCount = orders.length;
    const avgTicketSize = totalBillCount > 0 ? Math.round(totalSales / totalBillCount) : 0;
    
    // For now, we assume void items are orders with a status like 'VOID' or 'CANCELLED' 
    // although they aren't explicitly used yet. We'll search for them just in case.
    const voidOrders = await prisma.order.findMany({
        where: {
            processed_by_user_id: shift.user_id,
            date: {
              gte: shift.start_time,
              lte: shift.end_time || new Date()
            },
            status: { in: ['VOID', 'CANCELLED', 'REFUNDED'] }
        },
        select: { total: true }
    });
    const totalVoidAmount = voidOrders.reduce((acc, o) => acc + (o.total || 0), 0);

    return NextResponse.json({
      store_name: storeConfig?.store_name || "POS BAKUNG",
      shift_id: shift.id,
      operator_name: shift.user?.name || shift.user?.username || "Staff",
      opening_time: shift.start_time,
      closing_time: shift.end_time || new Date(),
      reconciliation: shift.reconciliation_data || {},
      summary: {
        total_sales: totalSales,
        total_bill_count: totalBillCount,
        starting_cash: Number(shift.starting_cash || 0),
        expected_cash: Number(shift.expected_cash || 0),
        avg_ticket_size: avgTicketSize,
        total_void_amount: totalVoidAmount,
        discrepancy: shift.discrepancy || 0,
        justification: shift.note || ""
      }
    });
  } catch (error) {
    console.error('Failed to generate shift report data:', error);
    return NextResponse.json({ error: 'Failed to generate shift report' }, { status: 500 });
  }
}
