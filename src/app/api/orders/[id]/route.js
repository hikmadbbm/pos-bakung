import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function getUserIdFromAuth(req) {
  const auth = req.headers.get('authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  try {
    const payload = jwt.verify(match[1], JWT_SECRET);
    const id = Number(payload?.id);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

export async function PUT(req, { params }) {
  try {
    const resolvedParams = await params;
    const id = Number(resolvedParams.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const body = await req.json();
    const { items, payment_method, money_received, note, customer_name, platform_id, discount, discount_type, discount_rate, status, created_by_user_id } =
      body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Order items cannot be empty' }, { status: 400 });
    }

    let subtotal = 0;

    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id }, select: { id: true, order_number: true } });
      if (!order) {
        return null;
      }

      for (const item of items) {
        const menu = await tx.menu.findUnique({
          where: { id: item.menu_id },
          include: {
            prices: platform_id ? { where: { platform_id: Number(platform_id) } } : false,
          },
        });

        if (!menu) {
          throw new Error(`Menu item ${item.menu_id} not found`);
        }

        const explicitPrice = item.price;
        let finalPrice = menu.price;

        if (explicitPrice !== undefined && explicitPrice !== null) {
          finalPrice = explicitPrice;
        } else if (platform_id && menu.prices.length > 0) {
          finalPrice = menu.prices[0].price;
        }

        item.calculatedPrice = finalPrice;
        item.calculatedCost = menu.cost;
        subtotal += finalPrice * item.qty;
      }

      const finalDiscountType = discount_type || "FIXED";
      const finalDiscountRate = Number(discount_rate) || 0;
      let appliedDiscount = 0;

      if (finalDiscountType === "PERCENT") {
        appliedDiscount = Math.round(subtotal * (finalDiscountRate / 100));
      } else {
        appliedDiscount = finalDiscountRate || Number(discount) || 0;
      }

      let netSubtotal = subtotal - appliedDiscount;
      if (netSubtotal < 0) netSubtotal = 0;

      let commission = 0;
      const platId = platform_id ? Number(platform_id) : null;
      if (platId) {
        const platform = await tx.platform.findUnique({ where: { id: platId } });
        if (platform && platform.commission_rate > 0) {
          commission = Math.round(netSubtotal * (platform.commission_rate / 100));
        }
      }

      const net_revenue = netSubtotal - commission;
      const received = money_received || 0;
      const change_amount = received ? received - netSubtotal : 0;

      const creatorId = created_by_user_id ? Number(created_by_user_id) : getUserIdFromAuth(req);

      await tx.orderItem.deleteMany({ where: { order_id: id } });

      const newOrder = await tx.order.update({
        where: { id },
        data: {
          total: subtotal,
          discount: appliedDiscount,
          discount_type: finalDiscountType,
          discount_rate: finalDiscountRate,
          commission,
          net_revenue,
          platform_id: platId,
          payment_method,
          money_received: received,
          change_amount,
          status: status || 'PENDING',
          note: note || null,
          customer_name: customer_name || null,
          created_by_user_id: creatorId,
          processed_by_user_id: creatorId,
          orderItems: {
            create: items.map((item) => ({
              menu_id: item.menu_id,
              qty: item.qty,
              price: item.calculatedPrice,
              cost: item.calculatedCost,
            })),
          },
        },
        include: {
          orderItems: { include: { menu: true } },
          platform: true,
        },
      });

      return newOrder;
    });

    if (!updated) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update order:', error);
    const message = error?.message?.includes('not found') ? error.message : 'Failed to update order';
    const statusCode = message.includes('not found') ? 400 : 500;
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}

