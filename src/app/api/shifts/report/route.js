import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'CASHIER']);
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const shiftIdStr = searchParams.get('shiftId');
    const shiftId = shiftIdStr ? Number(shiftIdStr) : NaN;

    if (isNaN(shiftId)) {
      return NextResponse.json({ error: 'Invalid shiftId' }, { status: 400 });
    }

    // 1. Fetch Shift with related User
    const shift = await prisma.userShift.findUnique({
      where: { id: shiftId },
      include: { 
        user: { 
          select: { name: true, username: true } 
        } 
      }
    });

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    // 2. Fetch Store Config for Name
    const storeConfig = await prisma.storeConfig.findFirst({ orderBy: { id: 'asc' } });
    const storeName = storeConfig?.store_name || "Bakmie You-Tje";

    const startTime = shift.start_time;
    const endTime = shift.end_time || new Date();

    // 3. Fetch Orders, Expenses, and Voids
    const [orders, expenses, cancelledOrders] = await Promise.all([
      prisma.order.findMany({
        where: {
          date: { gte: startTime, lte: endTime },
          status: { in: ['PAID', 'PROCESSING', 'COMPLETED', 'SETTLED'] }
        }
      }),
      prisma.expense.findMany({
        where: {
          date: { gte: startTime, lte: endTime },
          is_cash: true
        }
      }),
      prisma.order.findMany({
        where: {
          date: { gte: startTime, lte: endTime },
          status: 'CANCELLED'
        }
      })
    ]);

    // 4. Calculate Summaries
    const totalTransactions = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const totalDiscounts = orders.reduce((sum, o) => sum + Number(o.discount || 0), 0);
    const netRevenue = totalRevenue - totalDiscounts;
    
    const totalVoidAmount = cancelledOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const totalCashExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    
    const avgTicketSize = totalTransactions > 0 ? netRevenue / totalTransactions : 0;

    // 5. Build Reconciliation Method Breakdown
    // If reconciliation_data exists in shift, use it. Otherwise compute live.
    let methodBreakdown = [];
    if (shift.reconciliation_data && typeof shift.reconciliation_data === 'object' && shift.reconciliation_data.methodBreakdown) {
      methodBreakdown = shift.reconciliation_data.methodBreakdown;
    } else {
      // Emergency Live Calculation (if not yet closed or missing data)
      const paymentGroups = {};
      orders.forEach(o => {
        const method = (o.payment_method || 'CASH').toUpperCase();
        if (!paymentGroups[method]) paymentGroups[method] = 0;
        paymentGroups[method] += Number(o.total || 0) - Number(o.discount || 0);
      });

      methodBreakdown = Object.entries(paymentGroups).map(([name, amount]) => ({
        name,
        system: amount,
        actual: amount, // Assume perfect for preview if not yet closed
        discrepancy: 0
      }));
    }

    // 6. Final Response Assembly matching ShiftReportModal expectations
    return NextResponse.json({
      store_name: storeName,
      shift_id: shift.id,
      operator_name: shift.user?.name || shift.user?.username || "Operator",
      opening_time: shift.start_time,
      closing_time: shift.end_time || null,
      summary: {
        starting_cash: Number(shift.starting_cash || 0),
        total_bill_count: totalTransactions,
        avg_ticket_size: Math.round(avgTicketSize),
        total_void_amount: totalVoidAmount,
        total_cash_expenses: totalCashExpenses,
        expenses: expenses.map(e => ({ item: e.description || e.category || "Expense", amount: Number(e.amount) })),
        justification: shift.note || "Session normal"
      },
      reconciliation: {
        methodBreakdown: methodBreakdown
      }
    });

  } catch (error) {
    console.error('[shift-report-api] Fatal error:', error);
    return NextResponse.json({ error: 'Failed to generate report', details: error.message }, { status: 500 });
  }
}
