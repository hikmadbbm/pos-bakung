import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { neon } from '@neondatabase/serverless';
import { parseDateRange } from '../reports/utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const range = searchParams.get('range') || 'today';
    
    const { start, end } = parseDateRange(searchParams);
    
    const [orders, totalOrdersCount] = await Promise.all([
      prisma.order.findMany({
        where: { 
          status: { in: ['PAID', 'PROCESSING', 'COMPLETED'] },
          date: { gte: start, lte: end }
        },
        orderBy: { date: 'desc' },
        take: 5
      }),
      prisma.order.count({
        where: { 
          status: { in: ['PAID', 'PROCESSING', 'COMPLETED'] },
          date: { gte: start, lte: end }
        }
      })
    ]);

    const aggregate = await prisma.order.aggregate({
      where: { 
        status: { in: ['PAID', 'PROCESSING', 'COMPLETED'] },
        date: { gte: start, lte: end }
      },
      _sum: {
        total: true,
        net_revenue: true
      }
    });

    return NextResponse.json({
      revenue: aggregate._sum.total || 0,
      net_revenue: aggregate._sum.net_revenue || 0,
      orders: totalOrdersCount,
      recentOrders: orders
    });
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
