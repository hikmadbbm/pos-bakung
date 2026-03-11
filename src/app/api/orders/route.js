import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');

    const where = {};
    if (status) where.status = status;

    const orders = await prisma.order.findMany({
      where,
      orderBy: { date: 'desc' },
      take: limit,
      include: {
        orderItems: { include: { menu: true } },
        platform: true,
        createdByUser: { select: { id: true, name: true, role: true } },
        processedByUser: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      items,
      payment_method,
      money_received,
      note,
      customer_name,
      platform_id,
      discount,
      created_by_user_id,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Order items cannot be empty' }, { status: 400 });
    }

    let subtotal = 0;
    let totalCost = 0;

    const created = await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const menu = await tx.menu.findUnique({
          where: { id: item.menu_id },
          include: {
            prices: platform_id ? { where: { platform_id } } : false,
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
        totalCost += menu.cost * item.qty;
      }

      const appliedDiscount = discount || 0;
      let netSubtotal = subtotal - appliedDiscount;
      if (netSubtotal < 0) netSubtotal = 0;

      let commission = 0;
      if (platform_id) {
        const platform = await tx.platform.findUnique({ where: { id: platform_id } });
        if (platform && platform.commission_rate > 0) {
          commission = Math.round(netSubtotal * (platform.commission_rate / 100));
        }
      }

      const net_revenue = netSubtotal - commission;
      const change_amount = money_received ? money_received - netSubtotal : 0;

      const newOrder = await tx.order.create({
        data: {
          total: subtotal,
          discount: appliedDiscount,
          commission,
          net_revenue,
          platform_id: platform_id || null,
          payment_method,
          money_received: money_received || 0,
          change_amount,
          note,
          customer_name,
          created_by_user_id,
          processed_by_user_id: created_by_user_id,
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

    logger.info('Order created', { id: created.id, subtotal });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Failed to create order:', error);
    const message = error?.message?.includes('not found') ? error.message : 'Failed to create order';
    const status = message.includes('not found') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
