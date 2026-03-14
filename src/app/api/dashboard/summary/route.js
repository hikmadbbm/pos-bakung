import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseDateRange } from '../../reports/utils';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req) {
  const startTime = Date.now();
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'CASHIER']);
    if (response) return response;

    const { start, end } = parseDateRange(req.nextUrl.searchParams);
    
    // Aggregated query for dashboard summary
    const [stats, topMenus, latestOrders] = await Promise.all([
      prisma.order.aggregate({
        where: { 
          status: 'COMPLETED',
          date: { gte: start, lte: end }
        },
        _sum: {
          total: true,
          net_revenue: true
        },
        _count: {
          id: true
        }
      }),
      prisma.orderItem.groupBy({
        by: ['menu_id'],
        where: {
          order: {
            status: 'COMPLETED',
            date: { gte: start, lte: end }
          }
        },
        _sum: {
          qty: true
        },
        orderBy: {
          _sum: {
            qty: 'desc'
          }
        },
        take: 3
      }),
      prisma.order.findMany({
        where: { 
          status: 'COMPLETED',
          date: { gte: start, lte: end }
        },
        orderBy: { date: 'desc' },
        take: 5,
        include: {
          platform: { select: { name: true } }
        }
      })
    ]);

    // Fetch menu names for top menus
    const menuIds = topMenus.map(m => m.menu_id);
    const menus = await prisma.menu.findMany({
      where: { id: { in: menuIds } },
      select: { id: true, name: true }
    });
    
    const menuMap = new Map(menus.map(m => [m.id, m.name]));
    const popularMenus = topMenus.map(m => ({
      name: menuMap.get(m.menu_id) || 'Unknown',
      qty: m._sum.qty
    }));

    const duration = Date.now() - startTime;
    console.log(` Dashboard Summary API took ${duration}ms`);

    return NextResponse.json({
      total_sales: stats._sum.total || 0,
      net_revenue: stats._sum.net_revenue || 0,
      total_orders: stats._count.id || 0,
      popular_menus: popularMenus,
      recent_orders: latestOrders,
      processing_time_ms: duration
    });

  } catch (error) {
    console.error('Failed to fetch dashboard summary:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard summary' }, { status: 500 });
  }
}
