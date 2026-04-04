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
        orderItems: {
          where: {
            order: {
              status: { in: ['PAID', 'PROCESSING', 'COMPLETED'] },
              date: { gte: start, lte: end }
            }
          }
        }
      }
    });

    // Provide mocked intel based on existing menus
    const metrics = menus.map(m => {
      const total_qty = m.orderItems.reduce((acc, curr) => acc + curr.qty, 0);
      const total_revenue = m.orderItems.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);
      const total_cost = m.orderItems.reduce((acc, curr) => acc + (curr.cost * curr.qty), 0);
      const net_profit = total_revenue - total_cost;
      
      return {
        id: m.id,
        name: m.name,
        category: m.category?.name || "Uncategorized",
        total_qty,
        total_revenue,
        hpp: total_cost,
        net_profit,
        allocatedOverhead: 5000, 
        profitAfterOverhead: net_profit - 5000,
        status: net_profit > 100000 ? "STAR MENU" : (net_profit > 50000 ? "PROFITABLE MENU" : "UNDERPERFORMING MENU")
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
        avgProfit: metrics.reduce((acc, curr) => acc + curr.net_profit, 0) / (metrics.length || 1),
        avgQty: metrics.reduce((acc, curr) => acc + curr.total_qty, 0) / (metrics.length || 1)
      }
    });
  } catch (error) {
    console.error('Failed to fetch menu intelligence:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
