import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import jwt from 'jsonwebtoken';
import { verifyAuth } from '@/lib/auth';

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

export async function GET(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'CASHIER', 'KITCHEN']);
    if (response) return response;
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
    const { user, response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'CASHIER']);
    if (response) return response;

    const creatorId = user.id;
    const body = await req.json();
    const {
      items,
      payment_method,
      money_received,
      note,
      customer_name,
      platform_id,
      discount,
      discount_type,
      discount_rate,
      created_by_user_id,
      status,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Order items cannot be empty' }, { status: 400 });
    }

    const finalCreatorId = created_by_user_id ? Number(created_by_user_id) : creatorId;
    const platId = platform_id ? Number(platform_id) : null;

    const created = await prisma.$transaction(async (tx) => {
      // 1. Fetch all required menus at once to avoid multiple round-trips
      const menuIds = items.map(i => i.menu_id);
      const dbMenus = await tx.menu.findMany({
        where: { id: { in: menuIds } },
        include: {
          prices: platId ? { where: { platform_id: platId } } : false,
        },
      });

      const menuMap = new Map(dbMenus.map(m => [m.id, m]));
      let subtotal = 0;
      let totalCost = 0;

      // 2. Map and validate items
      const itemsToCreate = items.map(item => {
        const menu = menuMap.get(item.menu_id);
        if (!menu) {
          throw new Error(`Menu item ${item.menu_id} not found`);
        }

        const explicitPrice = item.price;
        let finalPrice = menu.price;
        
        if (explicitPrice !== undefined && explicitPrice !== null) {
          finalPrice = explicitPrice;
        } else if (platId && menu.prices.length > 0) {
          finalPrice = menu.prices[0].price;
        }

        subtotal += finalPrice * item.qty;
        totalCost += menu.cost * item.qty;

        return {
          menu_id: item.menu_id,
          qty: item.qty,
          price: finalPrice,
          cost: menu.cost,
        };
      });

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
      if (platId) {
        const platform = await tx.platform.findUnique({ where: { id: platId } });
        if (platform && platform.commission_rate > 0) {
          commission = Math.round(netSubtotal * (platform.commission_rate / 100));
        }
      }

      const net_revenue = netSubtotal - commission;
      const receivedNum = Number(money_received) || 0;
      const change_amount = receivedNum ? receivedNum - netSubtotal : 0;

      // 3. Calculate Daily Sequence Number
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const dailyCount = await tx.order.count({
        where: {
          date: {
            gte: today,
            lt: tomorrow
          }
        }
      });

      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const nextNum = String(dailyCount + 1).padStart(3, '0');
      const orderNumber = `TRX-${mm}${dd}-${nextNum}`;

      // 4. Create the order
      const newOrder = await tx.order.create({
        data: {
          order_number: orderNumber,
          total: subtotal,
          discount: appliedDiscount,
          discount_type: finalDiscountType,
          discount_rate: finalDiscountRate,
          commission,
          net_revenue,
          platform_id: platId,
          payment_method,
          money_received: receivedNum,
          change_amount,
          status: status || 'COMPLETED',
          note: note || null,
          customer_name: customer_name || null,
          created_by_user_id: finalCreatorId,
          processed_by_user_id: finalCreatorId,
          orderItems: {
            create: itemsToCreate,
          },
        },
        include: {
          orderItems: { include: { menu: true } },
          platform: true,
        },
      });

      return newOrder;
    }, {
      timeout: 15000 // Increase timeout to 15s to handle potentially slow cold starts
    });

    logger.info('Order created', { id: created.id, total: created.total });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Failed to create order:', error);
    const message = error?.message?.includes('not found') ? error.message : (error?.message || 'Failed to create order');
    const status = message.includes('not found') ? 400 : 500;
    return NextResponse.json({ error: message, detail: error?.message }, { status });
  }
}
