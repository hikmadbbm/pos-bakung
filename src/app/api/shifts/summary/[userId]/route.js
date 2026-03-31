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
        status: { in: ['PAID', 'PROCESSING', 'COMPLETED'] },
        date: { gte: shift.start_time },
        OR: [{ created_by_user_id: userId }, { processed_by_user_id: userId }],
      },
      select: { 
        id: true, 
        total: true, 
        discount: true, 
        payment_method_id: true,
        platform_id: true,
        commission: true,
        payment_method: true,
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

    // Grouping logic
    orders.forEach(o => {
      let target;
      
      if (o.payment_method_id) {
        target = methodTotals.find(m => m.id === o.payment_method_id);
      }
      
      // Fallback: If not found by ID, try matching by name (from the order's payment_method string)
      if (!target && o.payment_method) {
        target = methodTotals.find(m => m.name.toLowerCase() === o.payment_method.toLowerCase());
      }

      if (!target && o.platform_id && o.platform_id !== 1) { // 1 is usually "Offline"
        // Try to find a virtual PM for this platform or create one in methodTotals
        const platformName = o.platform?.name || 'Platform';
        target = methodTotals.find(m => m.name === platformName);
        
        if (!target) {
          target = {
            id: `plat-${o.platform_id}`,
            name: platformName,
            type: 'E_WALLET', // Platforms are usually digital
            systemAmount: 0,
            count: 0
          };
          methodTotals.push(target);
        }
      } 
      
      if (!target) {
        // Fallback for Cash
        target = methodTotals.find(m => m.type === 'CASH');
      }

      if (target) {
        let amount = Math.max(0, Number(o.total || 0) - Number(o.discount || 0));
        
        // If it's a platform and NOT Offline, subtract the commission to show real revenue
        if (o.platform_id && o.platform_id !== 1) {
          const commission = Number(o.commission || 0);
          amount = Math.max(0, amount - commission);
        }

        target.systemAmount += amount;
        target.count += 1;
      }
    });

    const totalCashSales = methodTotals
      .filter(m => m.type === 'CASH')
      .reduce((acc, m) => acc + m.systemAmount, 0);

    const totalSales = methodTotals.reduce((acc, m) => acc + m.systemAmount, 0);
    // User clarified: Expected Cash = Start + Cash Sales (e.g., 60k + 178k = 238k)
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

