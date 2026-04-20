import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import jwt from 'jsonwebtoken';
import { verifyAuth } from '@/lib/auth';
import { deductStockForOrder } from '@/lib/stock-deduction';
import { evaluatePromotions } from '@/lib/promo-engine';
import { logActivity } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
// Note: JWT_SECRET validation is handled by auth.js module initialization

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
  const startTime = Date.now();
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'CASHIER', 'KITCHEN']);
    if (response) return response;
    
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const range = searchParams.get('range'); // 'all', 'today', etc.
    const sort = searchParams.get('sort') || 'desc';

    const skip = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { order_number: { contains: search, mode: 'insensitive' } },
        { customer_name: { contains: search, mode: 'insensitive' } },
        { note: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Default to "Today" if no range or dates provided, unless range is "all"
    if (range !== 'all') {
      const timezoneOffset = 7; // WIB (UTC+7)
      
      if (startDate || endDate) {
        where.date = {};
        if (startDate) {
          // Parse as UTC YYYY-MM-DD 00:00:00
          const start = new Date(`${startDate}T00:00:00.000Z`);
          // Adjust to Jakarta Start: 00:00 WIB is 17:00 UTC previous day
          start.setUTCHours(start.getUTCHours() - timezoneOffset);
          where.date.gte = start;
        }
        if (endDate) {
          // Parse as UTC YYYY-MM-DD 23:59:59
          const end = new Date(`${endDate}T23:59:59.999Z`);
          // Adjust to Jakarta End: 23:59 WIB is 16:59 UTC same day
          end.setUTCHours(end.getUTCHours() - timezoneOffset);
          where.date.lte = end;
        }
      } else {
        // Enforce TODAY as default based on GMT+7
        const nowInJakarta = new Date(Date.now() + (timezoneOffset * 60 * 60 * 1000));
        
        const todayStart = new Date(nowInJakarta);
        todayStart.setUTCHours(0, 0, 0, 0);
        todayStart.setTime(todayStart.getTime() - (timezoneOffset * 60 * 60 * 1000));
        
        const todayEnd = new Date(todayStart);
        todayEnd.setTime(todayEnd.getTime() + (24 * 60 * 60 * 1000) - 1);

        where.date = {
          gte: todayStart,
          lte: todayEnd,
        };
      }
    }

    const [orders, total, paidStats, unpaidStats, cancelledStats] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { date: sort === 'asc' ? 'asc' : 'desc' },
        take: limit,
        skip: skip,
        include: {
          orderItems: { include: { menu: { select: { name: true } } } },
          platform: { select: { name: true } },
          paymentMethod: { select: { name: true, type: true } },
          user: { select: { id: true, name: true } },
        },
      }),
      prisma.order.count({ where }),
      prisma.order.aggregate({
        where: { ...where, status: { in: ['PAID', 'PROCESSING', 'COMPLETED'] } },
        _sum: { total: true, discount: true, net_revenue: true }
      }),
      prisma.order.aggregate({
        where: { ...where, status: 'UNPAID' },
        _sum: { total: true, discount: true }
      }),
      prisma.order.aggregate({
        where: { ...where, status: 'CANCELLED' },
        _sum: { total: true }
      })
    ]);

    const duration = Date.now() - startTime;
    console.log(`GET /api/orders took ${duration}ms (page ${page}, limit ${limit})`);

    return NextResponse.json({
      orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      stats: {
        total_gross: (paidStats._sum.total || 0) + (unpaidStats._sum.total || 0),
        total_net: paidStats._sum.net_revenue || 0,
        total_paid: (paidStats._sum.total || 0) - (paidStats._sum.discount || 0),
        total_unpaid: (unpaidStats._sum.total || 0) - (unpaidStats._sum.discount || 0),
        total_cancelled: cancelledStats._sum.total || 0
      }
    });
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

    // Check store status
    const config = await prisma.storeConfig.findFirst();
    if (config && !config.is_open) {
      return NextResponse.json({ error: 'Store is currently CLOSED. Transactions are blocked.' }, { status: 403 });
    }

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
      created_by_user_id,
      status,
      tax_rate,
      tax_amount,
      service_rate,
      service_amount,
      table_number,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Order items cannot be empty' }, { status: 400 });
    }

    const finalCreatorId = created_by_user_id ? Number(created_by_user_id) : creatorId;
    const platId = platform_id ? Number(platform_id) : null;

    const pmId = parseInt(payment_method_id);
    const finalPmId = isNaN(pmId) ? null : pmId;

    // Server-side validation for PAY_LATER requiring customer_name
    if (finalPmId) {
      const pm = await prisma.paymentMethod.findUnique({ where: { id: finalPmId } });
      if (pm?.type === 'PAY_LATER' && (!customer_name || !customer_name.trim())) {
        return NextResponse.json({ error: 'Customer name is MANDATORY for Kasbon (Pay Later) transactions.' }, { status: 400 });
      }
    }

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
          note: item.note || null,
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

      // --- ARCHITECTURAL PRICING FLOW (Section 12) ---
      // 1. Base Price (subtotal already calculated)
      
      // 2. Channel Cost (Static Cost Layer)
      let commAmt = 0;
      let additionalFee = 0;
      const platformRec = platId ? await tx.platform.findUnique({ where: { id: platId } }) : null;
      if (platformRec) {
        commAmt = Math.round(subtotal * (platformRec.commission_rate / 100));
        additionalFee = platformRec.additional_fee || 0;
      }
      const totalChannelCost = commAmt + additionalFee;

      // 3. Promotion Engine (Dynamic Logic)
      const orderContext = {
        items: itemsToCreate.map(i => ({ 
          ...i, 
          categoryId: menuMap.get(i.menu_id).categoryId 
        })),
        subtotal,
        platform_id: platId,
        payment_method,
        order_type: null,
      };
      
      const promoResult = await evaluatePromotions(orderContext);
      const totalPromoDiscount = promoResult.totalDiscount || 0;
      const finalTotalDiscount = appliedDiscount + totalPromoDiscount;

      // 4. Final Price
      const finalPrice = Math.max(0, subtotal - finalTotalDiscount);

      // 5. Net Revenue Calculation
      const net_revenue = finalPrice - totalChannelCost;
      
      const receivedNum = Number(money_received) || 0;
      const change_amount = receivedNum ? receivedNum - finalPrice : 0;

      // Optional: Channel Campaign Integration
      const campaignId = body.campaign_id ? Number(body.campaign_id) : null;
      const campaignDiscount = body.campaign_discount ? Number(body.campaign_discount) : 0;

      // 3. Create the order
      const newOrder = await tx.order.create({
        data: {
          order_number: null,
          total: subtotal,
          discount: finalTotalDiscount,
          discount_type: finalDiscountType,
          discount_rate: finalDiscountRate,
          commission: totalChannelCost, // Storing total static channel cost here
          net_revenue,
          platform_id: platId,
          campaign_id: campaignId,
          campaign_discount: campaignDiscount,
          payment_method,
          payment_method_id: finalPmId,
          money_received: receivedNum,
          tax_rate: Number(tax_rate) || 0,
          tax_amount: Number(tax_amount) || 0,
          service_rate: Number(service_rate) || 0,
          service_amount: Number(service_amount) || 0,
          table_number: table_number || null,
          change_amount,
          status: status || 'PAID',
          note: note || null,
          customer_name: customer_name || null,
          created_by_user_id: finalCreatorId,
          processed_by_user_id: finalCreatorId,
          orderItems: {
            create: itemsToCreate,
          },
          orderPromotions: {
            create: promoResult.appliedPromos.map(p => ({
              promotionId: p.id,
              amount: p.amount
            }))
          }
        },
        include: {
          orderItems: { include: { menu: true } },
          platform: true,
          orderPromotions: true,
          campaign: true
        },
      });

      // 4. Generate order number from DB ID (atomic — no race condition possible)
      //    Format: TRX-MMDD-XXXXX (ID zero-padded to 5 digits for future scale)
      const orderDate = newOrder.date;
      const mm = String(orderDate.getMonth() + 1).padStart(2, '0');
      const dd = String(orderDate.getDate()).padStart(2, '0');
      const seqNum = String(newOrder.id).padStart(5, '0');
      const orderNumber = `TRX-${mm}${dd}-${seqNum}`;

      // 5. Update with the generated order number
      const finalOrder = await tx.order.update({
        where: { id: newOrder.id },
        data: { order_number: orderNumber },
        include: {
          orderItems: { include: { menu: true } },
          platform: true,
        },
      });

      // 6. Auto-Stock Deduction for immediate PAID/COMPLETED orders
      if (finalOrder.status === 'PAID' || finalOrder.status === 'COMPLETED') {
        await deductStockForOrder(finalOrder.id, tx, finalOrder);
      }

      return finalOrder;
    }, {
      timeout: 20000 // Increase timeout to 20s to handle recursion
    });

    const ipAddress = req.headers.get('x-forwarded-for') || req.ip;
    await logActivity({
      userId: user.id,
      action: 'CREATE',
      entity: 'ORDER',
      entityId: created.id,
      ipAddress,
      details: created
    });

    logger.info('Order created', { id: created.id, total: created.total });
    
    // Dashboard sync is handled lazily by the dashboard insights service (60s stale check)
    // No need to block order creation for a full day's aggregation.

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const message = error?.message || 'Failed to create order';
    // Only return 400 for legitimate data-missing errors (Menu, Ingredient not in DB)
    // Avoid returning 400 for server-level errors like "Transaction not found"
    const isClientError = message.toLowerCase().includes('not found') && !message.toLowerCase().includes('transaction');
    const statusCode = isClientError ? 400 : 500;
    return NextResponse.json({ error: message, detail: error?.message }, { status: statusCode });
  }
}
