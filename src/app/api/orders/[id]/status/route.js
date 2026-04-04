import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { deductStockForOrder } from '@/lib/stock-deduction';

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
    if (status === 'CANCELLED' || (status === 'PAID' && user.role === 'CASHIER')) {
      if (user.role !== 'MANAGER' && user.role !== 'OWNER') {
        if (!pin) {
          return NextResponse.json({ error: 'PIN is required for this action' }, { status: 403 });
        }
        const approver = await prisma.user.findFirst({
          where: { pin, status: 'ACTIVE', role: { in: ['MANAGER', 'OWNER'] } },
          select: { id: true, name: true },
        });
        if (!approver) {
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
            action_type: 'VOID_ORDER',
            description: `Order ${oldOrder.order_number} cancelled. Reason: ${reason || 'N/A'}`,
            ip_address: req.headers.get('x-forwarded-for') || 'local'
          }
        });
      }

      // Trigger stock deduction when transitioning INTO a paid state.
      const wasAlreadyPaidOrCompleted = oldOrder.status === 'PAID' || oldOrder.status === 'COMPLETED';
      const isNowPayable = status === 'PAID' || status === 'COMPLETED';

      if (isNowPayable && !wasAlreadyPaidOrCompleted) {
        await deductStockForOrder(id, tx, updatedOrder);
      }

      return updatedOrder;
    }, {
      maxWait: 15000,
      timeout: 20000
    });

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
