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
        status: { in: ['PAID', 'PROCESSING', 'COMPLETED', 'UNPAID'] },
        date: { gte: shift.start_time },
      },
      select: { 
        id: true, 
        total: true, 
        discount: true, 
        payment_method_id: true,
        platform_id: true,
        commission: true,
        platform_actual_net: true,
        platform_adjustments: true,
        payment_method: true,
        customer_name: true,
        date: true,
        status: true,
        paymentMethod: {
          select: { name: true, type: true }
        },
        platform: {
          select: { name: true, commission_rate: true }
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

    console.log(`[ShiftSummary] User: ${userId}, Shift Start: ${shift.start_time.toISOString()}, Orders Found: ${orders.length}`);
    
    orders.forEach(o => {
      let target;
      const orderAmount = Math.max(0, Number(o.total || 0) - Number(o.discount || 0));
      let finalAmount = orderAmount;
      
      if (o.platform_id && o.platform_id !== 1) {
        if (o.platform_actual_net !== null && o.platform_actual_net !== undefined) {
          finalAmount = Number(o.platform_actual_net);
        } else {
          const commission = Number(o.commission || 0);
          finalAmount = Math.max(0, orderAmount - commission);
        }
      }

      const pmId = o.payment_method_id ? Number(o.payment_method_id) : null;
      if (pmId) {
        target = methodTotals.find(m => Number(m.id) === pmId);
      }
      
      if (!target && o.payment_method) {
        target = methodTotals.find(m => m.name.toLowerCase() === o.payment_method.toLowerCase());
      }

      if (!target && o.platform_id && o.platform_id !== 1) {
        const platformName = o.platform?.name || 'Platform';
        target = methodTotals.find(m => m.name === platformName);
        
        if (!target) {
          target = {
            id: `plat-${o.platform_id}`,
            name: platformName,
            type: 'E_WALLET',
            systemAmount: 0,
            count: 0
          };
          methodTotals.push(target);
        }
      } 
      
      if (!target) {
        target = methodTotals.find(m => m.type === 'CASH');
      }

      if (target) {
        // ALWAYS count the amount towards System Amount for visibility in the summary table
        // This ensures "Total Sales" matches what's actually sold including receivables
        target.systemAmount += finalAmount;
        target.count += 1;
        console.log(`[ShiftSummary] Order ${o.id} (${o.status}): ${finalAmount} -> ${target.name}`);
      }
    });

    const totalCashSales = methodTotals
      .filter(m => m.type === 'CASH')
      // Only count PAID cash as "Expected in drawer"
      // Note: we fetch PAID/COMPLETED/PROCESSING/UNPAID. 
      // If a CASH order is UNPAID (rare), it shouldn't be in expectedCash.
      .reduce((acc, m) => {
        const paidCashForMethod = orders
          .filter(o => o.status !== 'UNPAID' && (o.payment_method_id === m.id || (!o.payment_method_id && m.type === 'CASH')))
          .reduce((s, o) => s + (Math.max(0, (o.total || 0) - (o.discount || 0))), 0);
        return acc + paidCashForMethod;
      }, 0);

    const totalSales = methodTotals.reduce((acc, m) => acc + m.systemAmount, 0);
    
    // Pending Kasbon - specifically sum the UNPAID ones for the dedicated section
    const pendingKasbonTotal = orders
      .filter(o => o.status === 'UNPAID')
      .reduce((acc, o) => acc + (Math.max(0, (o.total || 0) - (o.discount || 0))), 0);

    const shiftExpenses = await prisma.expense.findMany({
      where: {
        OR: [
          { shift_id: shift.id },
          { date: { gte: shift.start_time } }
        ],
        is_cash: true
      }
    });
    
    const totalCashExpenses = shiftExpenses.reduce((acc, exp) => acc + exp.amount, 0);
    console.log(`[ShiftSummary] Cash Expenses: ${totalCashExpenses}`);

    // User clarified: Expected Cash = Start + Cash Sales - Cash Expenses 
    const expectedCash = Number(shift.starting_cash || 0) + totalCashSales - totalCashExpenses;

    const paylaterOrders = orders.filter(o => o.status === 'UNPAID' && o.paymentMethod?.type === 'PAY_LATER');

    return NextResponse.json({
      summary: {
        shiftId: shift.id,
        startTime: shift.start_time,
        startingCash: shift.starting_cash,
        totalCashSales,
        totalSales,
        totalCashExpenses,
        expectedCash,
        methodTotals,
        paylaterOrders: paylaterOrders.map(o => ({
          id: o.id,
          total: o.total,
          discount: o.discount,
          payment_method_id: o.payment_method_id,
          payment_method: o.payment_method,
          customer_name: o.customer_name,
          date: o.date
        })),
        availablePaymentMethods: paymentMethods.map(pm => ({
          id: pm.id,
          name: pm.name,
          type: pm.type
        }))
      },
    });
  } catch (error) {
    console.error('Failed to fetch shift summary:', error);
    return NextResponse.json({ error: 'Failed to fetch shift summary' }, { status: 500 });
  }
}

