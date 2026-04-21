import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { parseDateRange } from '../../reports/utils';

export async function GET(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    const { start, end } = parseDateRange(req.nextUrl.searchParams);

    const menus = await prisma.menu.findMany({
      include: {
        category: true,
        prices: true,
        orderItems: {
          where: {
            order: {
              status: { in: ['PAID', 'PROCESSING', 'COMPLETED'] },
              date: { gte: start, lte: end }
            }
          },
          include: {
            order: {
              include: {
                platform: true,
                orderPromotions: {
                  include: { promotion: true }
                },
                orderItems: true
              }
            }
          }
        }
      }
    });

    // 1. Calculate basic metrics
    let metrics = menus.map(m => {
      const isConsignment = m.productType === 'CONSIGNMENT';
      const total_qty = m.orderItems.reduce((acc, curr) => acc + curr.qty, 0);
      
      // Calculate revenue and profit with platform context
      let total_revenue = 0;
      let total_cost = 0;
      let net_profit = 0;

      m.orderItems.forEach(it => {
        const order = it.order;
        if (!order) return;

        // Platform Price context
        const orderPlatId = Number(order.platform_id);
        const platCommissionRate = order.platform?.commission_rate || 0;
        
        // Find platform specific price if available, otherwise use saved price
        const platPrice = m.prices?.find(p => Number(p.platform_id) === orderPlatId)?.price || it.price;
        
        // Find promo attribution
        let itemPromoDisc = 0;
        if (order.orderPromotions) {
          order.orderPromotions.forEach(op => {
            const pIds = op.promotion?.conditions?.[0]?.productIds || [];
            if (pIds.includes(m.id)) {
              const totElig = order.orderItems.filter(oi => pIds.includes(oi.menu_id)).reduce((s, x) => s + x.qty, 0);
              if (totElig > 0) itemPromoDisc += (op.amount / totElig) * it.qty;
            }
          });
        }

        const itemRevenue = (platPrice * it.qty) - itemPromoDisc;
        const itemCost = it.cost * it.qty;
        
        total_revenue += itemRevenue;
        total_cost += itemCost;

        if (!isConsignment) {
          // Commission attributable to this item
          const itemCommission = itemRevenue * (platCommissionRate / 100);
          net_profit += (itemRevenue - itemCost - itemCommission);
        }
      });
      
      if (isConsignment) net_profit = 0; // Consignment never counts as profit or loss here

      return {
        id: m.id,
        name: m.name,
        category: m.category?.name || "Uncategorized",
        total_qty,
        total_revenue,
        hpp: total_cost,
        net_profit
      };
    });

    // 2. Calculate thresholds
    const avgProfit = metrics.reduce((acc, curr) => acc + curr.net_profit, 0) / (metrics.length || 1);
    const avgQty = metrics.reduce((acc, curr) => acc + curr.total_qty, 0) / (metrics.length || 1);

    // 3. Categorize items
    metrics = metrics.map(m => {
      let status = "PROFITABLE MENU";
      
      if (m.total_qty >= avgQty && m.net_profit >= avgProfit) {
        status = "STAR MENU";
      } else if (m.total_qty >= avgQty && m.net_profit < avgProfit) {
        status = "LOW MARGIN MENU";
      } else if (m.total_qty < avgQty && m.net_profit < avgProfit) {
        status = "UNDERPERFORMING MENU";
      }
      
      return {
        ...m,
        status,
        allocatedOverhead: 5000, 
        profitAfterOverhead: m.net_profit - 5000
      };
    });

    const sortedByProfit = [...metrics].sort((a, b) => b.net_profit - a.net_profit);

    return NextResponse.json({
      data: metrics,
      insights: {
        topProfitable: sortedByProfit.slice(0, 5),
        lowMargin: metrics.filter(m => m.status === "LOW MARGIN MENU"),
        lowSelling: metrics.filter(m => m.status === "UNDERPERFORMING MENU")
      },
      thresholds: {
        avgProfit,
        avgQty
      }
    });
  } catch (error) {
    console.error('Failed to fetch menu intelligence:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
