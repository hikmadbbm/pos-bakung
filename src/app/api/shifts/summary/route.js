import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function sumOrderDue(orders) {
  return orders.reduce((acc, o) => {
    const total = Number(o.total || 0);
    const discount = Number(o.discount || 0);
    return acc + Math.max(0, total - discount);
  }, 0);
}

export async function GET(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'CASHIER']);
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const userId = Number(searchParams.get('id'));
    
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: 'Valid ID is required' }, { status: 400 });
    }

    let shift = await prisma.userShift.findFirst({
      where: { user_id: userId, status: 'OPEN' },
      orderBy: { id: 'desc' },
    });

    if (!shift) {
      shift = await prisma.userShift.findFirst({
        where: { status: 'OPEN' },
        orderBy: { id: 'desc' },
      });
    }

    if (!shift) {
      return NextResponse.json({ error: 'No open shift found' }, { status: 404 });
    }

    const shiftOwnerId = shift.user_id;
    const startTime = shift.start_time;

    // Fetch all related data including dynamic payment methods
    const [orders, expenses, cancellations, paymentMethods, paylaterOrders] = await Promise.all([
      prisma.order.findMany({
        where: {
          date: { gte: startTime },
          status: { in: ['PAID', 'PROCESSING', 'COMPLETED'] },
        },
      }),
      prisma.expense.findMany({
        where: {
          date: { gte: startTime },
        },
      }),
      prisma.order.findMany({
        where: {
          date: { gte: startTime },
          status: 'CANCELLED',
        },
      }),
      prisma.paymentMethod.findMany(),
      prisma.order.findMany({
        where: {
          date: { gte: startTime },
          status: 'UNPAID',
        },
      })
    ]);

    // Grouping by Payment Method dynamically
    const matchedOrderIds = new Set();
    const methodBreakdown = paymentMethods.map(pm => {
      const matchedOrders = orders.filter(o => 
        o.payment_method_id === pm.id || 
        o.payment_method?.toUpperCase() === pm.name.toUpperCase()
      );
      matchedOrders.forEach(o => matchedOrderIds.add(o.id));
      return {
        id: pm.id.toString(),
        name: pm.name,
        type: pm.type,
        systemAmount: sumOrderDue(matchedOrders),
        count: matchedOrders.length
      };
    });

    // Make sure we include manual CASH orders that might lack a method ID
    const fallbackCashOrders = orders.filter(o => 
      o.payment_method === 'CASH' && !o.payment_method_id && !matchedOrderIds.has(o.id)
    );
    if (fallbackCashOrders.length > 0) {
      fallbackCashOrders.forEach(o => matchedOrderIds.add(o.id));
      const existingCash = methodBreakdown.find(m => m.type === 'CASH');
      if (existingCash) {
        existingCash.systemAmount += sumOrderDue(fallbackCashOrders);
        existingCash.count += fallbackCashOrders.length;
      } else {
        methodBreakdown.push({
          id: 'CASH-FALLBACK',
          name: 'CASH',
          type: 'CASH',
          systemAmount: sumOrderDue(fallbackCashOrders),
          count: fallbackCashOrders.length
        });
      }
    }

    // Capture any remaining unmatched orders (usually platforms like Shopee, Grab)
    const unmatchedOrders = orders.filter(o => !matchedOrderIds.has(o.id));
    const unmatchedGroups = {};
    unmatchedOrders.forEach(o => {
      const pmName = o.payment_method || 'OTHER';
      if (!unmatchedGroups[pmName]) unmatchedGroups[pmName] = [];
      unmatchedGroups[pmName].push(o);
    });

    Object.entries(unmatchedGroups).forEach(([name, groupOrders]) => {
      methodBreakdown.push({
        id: `PLATFORM-${name.toUpperCase()}`,
        name: name.toUpperCase(),
        type: 'PLATFORM',
        systemAmount: sumOrderDue(groupOrders),
        count: groupOrders.length
      });
    });

    const totalCashExpenses = expenses
      .filter(e => e.is_cash !== false)
      .reduce((acc, e) => acc + Number(e.amount || 0), 0);

    const totalSales = sumOrderDue(orders);
    
    // Find expected cash safely
    const actualCashMethod = methodBreakdown.find(m => m.type === 'CASH') || { systemAmount: 0 };
    const expectedCash = Number(shift.starting_cash || 0) + actualCashMethod.systemAmount - totalCashExpenses;

    return NextResponse.json({
      summary: {
        id: shift.id,
        startingCash: Number(shift.starting_cash || 0),
        totalSales: totalSales,
        totalExpenses: expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0),
        cashExpenses: totalCashExpenses,
        expectedCash: expectedCash,
        methodTotals: methodBreakdown,
        orderCount: orders.length,
        cancelCount: cancellations.length,
        paylaterOrders: paylaterOrders,
        availablePaymentMethods: paymentMethods
      },
    });
  } catch (error) {
    console.error('Failed to fetch shift summary:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
