import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseDateRange } from '../../reports/utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const { start, end } = parseDateRange(searchParams);

    // Fetch all completed orders in the range
    const orders = await prisma.order.findMany({
      where: { 
        date: { gte: start, lte: end },
        status: { in: ['PAID', 'COMPLETED'] }
      },
      select: { date: true, total: true }
    });

    // Initialize 24 hours
    const hourlyData = Array.from({ length: 24 }).map((_, i) => ({
      hour: `${String(i).padStart(2, '0')}:00`,
      orders: 0,
      revenue: 0,
    }));

    // Local timezone offset for Jakarta (UTC+7)
    const timezoneOffset = 7 * 60 * 60 * 1000;

    orders.forEach(order => {
      // Get hour in local time
      const localTime = new Date(order.date.getTime() + timezoneOffset);
      const h = localTime.getUTCHours();
      hourlyData[h].orders += 1;
      hourlyData[h].revenue += order.total;
    });

    // Filter out hours that typically have no operations to keep the chart clean
    // Or just keep from 06:00 to 23:00 based on typical business hours.
    // For completeness, we return from 06:00 to 23:00
    const filteredHours = hourlyData.slice(6, 24);

    return NextResponse.json(filteredHours);
  } catch (error) {
    console.error('Failed to fetch peak hours:', error);
    return NextResponse.json({ error: 'Failed to fetch peak hours' }, { status: 500 });
  }
}
