import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;
    const menus = await prisma.menu.findMany({
      include: {
        orderItems: true
      }
    });

    // Simple forecast mock
    const forecast = menus.map(m => {
      const avgDailySales = Math.floor(Math.random() * 20) + 5; 
      const predictedTomorrow = Math.floor(avgDailySales * 1.1); 
      return {
        id: m.id,
        name: m.name,
        avgDailySales,
        predictedTomorrow,
        recommendedPrep: Math.ceil(predictedTomorrow * 1.1),
        predictedNext7Days: predictedTomorrow * 7
      };
    });

    return NextResponse.json(forecast);
  } catch (error) {
    console.error('Failed to fetch demand forecast:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
