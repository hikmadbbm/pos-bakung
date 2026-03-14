import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);

    const menus = await prisma.menu.findMany({
      include: {
        orderItems: {
          where: {
            order: {
              date: { gte: sevenDaysAgo, lt: today },
              status: 'COMPLETED'
            }
          }
        }
      }
    });

    const forecast = menus.map(m => {
      const totalQty = m.orderItems.reduce((acc, curr) => acc + curr.qty, 0);
      const avgDailySales = totalQty / 7;
      const predictedTomorrow = Math.ceil(avgDailySales * 1.1) || 5; // Default to 5 if no sales
      
      return {
        id: m.id,
        name: m.name,
        avgDailySales: Math.round(avgDailySales * 10) / 10,
        predictedTomorrow,
        recommendedPrep: Math.ceil(predictedTomorrow * 1.1),
        predictedNext7Days: Math.ceil(predictedTomorrow * 7)
      };
    });

    return NextResponse.json(forecast);
  } catch (error) {
    console.error('Failed to fetch demand forecast:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
