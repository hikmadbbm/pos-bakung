import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { deductStockForOrder, restoreStockForCancelledOrder } from '@/lib/stock-deduction';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(req, { params }) {
  try {
    const { user, response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'CASHIER', 'KITCHEN']);
    if (response) return response;

    const resolvedParams = await params;
    const idStr = resolvedParams?.id;
    const id = Number(idStr);
    if (!idStr || !Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const body = await req.json();
    const { status, pin, reason } = body;
    if (!status || typeof status !== 'string') {
      return NextResponse.json({ error: 'status is required' }, { status: 400 });
    }

    // PIN check for critical actions
    if (status === 'PAID' && user.role === 'CASHIER') {
      if (user.role !== 'MANAGER' && user.role !== 'OWNER') {
        if (!pin) {
          return NextResponse.json({ error: 'PIN is required for this action' }, { status: 403 });
        }
        const approvers = await prisma.user.findMany({
          where: { status: 'ACTIVE', role: { in: ['MANAGER', 'OWNER', 'ADMIN'] } },
          select: { id: true, name: true, pin: true },
        });

        let isValidPin = false;
        const bcrypt = await import('bcryptjs');
        for (const approver of approvers) {
          if (approver.pin) {
            // Check if it's a legacy plain text PIN or a bcrypt hash
            const isMatch = approver.pin.startsWith('$2') 
              ? await bcrypt.compare(pin, approver.pin)
              : approver.pin === pin;
              
            if (isMatch) {
              isValidPin = true;
              break;
            }
          }
        }

        if (!isValidPin) {
          return NextResponse.json({ error: 'Invalid PIN' }, { status: 403 });
        }
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const oldOrder = await tx.order.findUnique({
        where: { id },
        select: { status: true, order_number: true }
      });

      if (!oldOrder) throw new Error('Order not found');

      // Build update data
      const updateData = { status };

      if (status === 'CANCELLED') {
        updateData.cancel_reason = reason || 'NO_REASON_PROVIDED';
        updateData.cancelled_at = new Date();
      }

      // Record who processed the payment when confirming a PENDING order
      if ((status === 'PAID' || status === 'COMPLETED') && oldOrder.status === 'PENDING') {
        updateData.processed_by_user_id = user.id;
      }

      const updatedOrder = await tx.order.update({
        where: { id },
        data: updateData,
        include: {
          orderItems: {
            include: {
              menu: {
                include: { recipe: true }
              }
            }
          },
          platform: true
        },
      });

      // Audit Log for Cancellation
      if (status === 'CANCELLED') {
        await tx.userActivityLog.create({
          data: {
            user_id: user.id,
            action: 'VOID_ORDER',
            entity: 'ORDER',
            entity_id: String(id),
            details: { 
              order_number: oldOrder.order_number, 
              reason: reason || 'N/A' 
            },
            ip_address: req.headers.get('x-forwarded-for') || 'local'
          }
        });
      }

      // Trigger stock deduction/restoration based on status transition
      const wasAlreadyPaidOrCompleted = oldOrder.status === 'PAID' || oldOrder.status === 'COMPLETED';
      const isNowPayable = status === 'PAID' || status === 'COMPLETED';

      if (status === 'CANCELLED' && wasAlreadyPaidOrCompleted) {
         // RESTORE stock if cancelled after being paid
         await restoreStockForCancelledOrder(id, tx, updatedOrder);
      } else if (isNowPayable && !wasAlreadyPaidOrCompleted) {
         // DEDUCT stock if newly paid
         await deductStockForOrder(id, tx, updatedOrder);
      }

      return updatedOrder;
    }, {
      maxWait: 15000,
      timeout: 20000
    });

    // Trigger dashboard sync for this order's date
    try {
      const { syncDailySummary } = await import('@/lib/aggregation');
      await syncDailySummary(updated.date || new Date());
    } catch (e) {
      console.warn("Status API: Failed to sync dashboard", e);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update order status:', error);
    const message = error.message.includes('Insufficient Stock')
      ? error.message
      : 'Failed to update order status';
    return NextResponse.json(
      {
        error: message,
        detail: error.message,
      },
      { status: error.message.includes('Insufficient') ? 400 : 500 }
    );
  }
}
