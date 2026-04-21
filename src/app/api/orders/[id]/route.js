import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { deductStockForOrder } from '@/lib/stock-deduction';
import { logActivity } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PUT(req, { params }) {
  try {
    const { user, response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'CASHIER', 'KITCHEN']);
    if (response) return response;

    const resolvedParams = await params;
    const id = Number(resolvedParams.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const body = await req.json();
    const { 
      items, 
      payment_method, 
      payment_method_id, 
      money_received, 
      note, 
      customer_name, 
      platform_id, 
      discount, 
      discount_type, 
      discount_rate, 
      status, 
      tax_rate,
      tax_amount,
      service_rate,
      service_amount,
      platform_actual_net,
      platform_adjustments
    } = body;

    const ipAddress = req.headers.get('x-forwarded-for') || req.ip;

    const oldOrder = await prisma.order.findUnique({
      where: { id },
      include: { orderItems: true }
    });

    if (!oldOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      const platId = platform_id ? Number(platform_id) : null;
      const menuIds = items ? items.map(i => i.menu_id) : [];
      
      const dbMenus = items ? await tx.menu.findMany({
        where: { id: { in: menuIds } },
        include: { prices: platId ? { where: { platform_id: platId } } : false },
      }) : [];

      const menuMap = new Map(dbMenus.map(m => [m.id, m]));

      if (items) {
        for (const item of items) {
          const menu = menuMap.get(item.menu_id);
          if (!menu) throw new Error(`Menu item ${item.menu_id} not found`);
          const explicitPrice = item.price;
          let finalPrice = menu.price;
          if (explicitPrice !== undefined && explicitPrice !== null) {
            finalPrice = explicitPrice;
          } else if (platId && menu.prices && menu.prices.length > 0) {
            finalPrice = menu.prices[0].price;
          }
          item.calculatedPrice = finalPrice;
          item.calculatedCost = menu.cost || 0;
          subtotal += finalPrice * item.qty;
        }
      } else {
        subtotal = oldOrder.total;
      }

      const finalDiscountType = discount_type || oldOrder.discount_type || "FIXED";
      const finalDiscountRate = discount_rate !== undefined ? Number(discount_rate) : Number(oldOrder.discount_rate);
      let appliedDiscount = 0;

      if (finalDiscountType === "PERCENT") {
        appliedDiscount = Math.round(subtotal * (finalDiscountRate / 100));
      } else {
        appliedDiscount = finalDiscountRate || Number(discount) || 0;
      }

      let netSubtotal = subtotal - appliedDiscount;
      if (netSubtotal < 0) netSubtotal = 0;

      let commission = 0;
      if (platId) {
        const platform = await tx.platform.findUnique({ where: { id: platId } });
        if (platform && platform.commission_rate > 0) {
          commission = Math.round(netSubtotal * (platform.commission_rate / 100));
        }
      }

      const net_revenue = netSubtotal - commission;
      const received = money_received !== undefined ? money_received : oldOrder.money_received;
      const change_amount = received ? received - netSubtotal : 0;

      if (items) {
        await tx.orderItem.deleteMany({ where: { order_id: id } });
      }

      const pmId = parseInt(payment_method_id);
      const finalPmId = isNaN(pmId) ? (oldOrder.payment_method_id) : pmId;

      return await tx.order.update({
        where: { id },
        data: {
          total: subtotal,
          discount: appliedDiscount,
          discount_type: finalDiscountType,
          discount_rate: finalDiscountRate,
          commission,
          net_revenue,
          platform_id: platId !== null ? platId : oldOrder.platform_id,
          payment_method: payment_method || oldOrder.payment_method,
          payment_method_id: finalPmId,
          money_received: received,
          tax_rate: tax_rate !== undefined ? Number(tax_rate) : oldOrder.tax_rate,
          tax_amount: tax_amount !== undefined ? Number(tax_amount) : oldOrder.tax_amount,
          service_rate: service_rate !== undefined ? Number(service_rate) : oldOrder.service_rate,
          service_amount: service_amount !== undefined ? Number(service_amount) : oldOrder.service_amount,
          change_amount,
          status: status || oldOrder.status,
          note: note !== undefined ? note : oldOrder.note,
          customer_name: customer_name !== undefined ? customer_name : oldOrder.customer_name,
          processed_by_user_id: user.id,
          platform_actual_net: platform_actual_net !== undefined ? Number(platform_actual_net) : undefined,
          platform_adjustments: platform_adjustments || undefined,
          ...(items && {
            orderItems: {
              create: items.map((item) => ({
                menu_id: item.menu_id,
                qty: item.qty,
                price: item.calculatedPrice,
                cost: item.calculatedCost,
              })),
            },
          })
        },
        include: {
          orderItems: { include: { menu: true } },
          platform: true,
        },
      });
    }, { timeout: 15000 });

    // Log the change
    await logActivity({
      userId: user.id,
      action: 'UPDATE',
      entity: 'ORDER',
      entityId: id,
      ipAddress,
      details: {
        before: oldOrder,
        after: updated
      }
    });

    // Trigger dashboard sync
    try {
      const { syncDailySummary } = await import('@/lib/aggregation');
      await syncDailySummary(updated.date);
    } catch (e) {
      console.warn("Update API: Failed to sync dashboard", e);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update order:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { user, response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'CASHIER']);
    if (response) return response;

    const resolvedParams = await params;
    const id = Number(resolvedParams.id);
    const { pin } = await req.json().catch(() => ({}));

    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true, status: true, order_number: true }
    });

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.status !== 'CANCELLED') {
      return NextResponse.json({ error: 'Only cancelled orders can be deleted permanently' }, { status: 400 });
    }

    // Security PIN check for Cashiers
    if (user.role !== 'MANAGER' && user.role !== 'OWNER') {
      if (!pin) return NextResponse.json({ error: 'PIN is required to delete orders' }, { status: 403 });
      
      const approvers = await prisma.user.findMany({
        where: { status: 'ACTIVE', role: { in: ['MANAGER', 'OWNER', 'ADMIN'] } }
      });

      const bcrypt = await import('bcryptjs');
      let isValidPin = false;
      for (const approver of approvers) {
        if (approver.pin) {
          const isMatch = approver.pin.startsWith('$2') 
            ? await bcrypt.compare(pin, approver.pin)
            : approver.pin === pin;
          if (isMatch) {
            isValidPin = true;
            break;
          }
        }
      }

      if (!isValidPin) return NextResponse.json({ error: 'Invalid PIN' }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.stockMovement.deleteMany({ where: { order_id: id } });
      await tx.order.delete({ where: { id } });
    });

    await logActivity({
      userId: user.id,
      action: 'HARD_DELETE',
      entity: 'ORDER',
      entityId: id,
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
      details: { order_number: order.order_number }
    });

    return NextResponse.json({ success: true, message: 'Order deleted permanently' });
  } catch (error) {
    console.error('Failed to delete order:', error);
    return NextResponse.json({ error: 'Failed to delete order', detail: error.message }, { status: 500 });
  }
}

