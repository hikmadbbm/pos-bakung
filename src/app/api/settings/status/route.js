import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'CASHIER']);
    if (response) return response;

    const config = await prisma.storeConfig.findFirst();
    
    // Calculate current dynamic status
    const { getStoreStatus } = await import('@/lib/store-status');
    const status = await getStoreStatus();

    return NextResponse.json({
      is_open: config.is_open,
      business_hours: config.business_hours,
      special_closures: config.special_closures,
      current: status
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    const body = await req.json();
    const { is_open, business_hours, special_closures } = body;

    const config = await prisma.storeConfig.findFirst();
    if (!config) throw new Error('Config not found');

    const updated = await prisma.storeConfig.update({
      where: { id: config.id },
      data: {
        is_open: is_open !== undefined ? is_open : config.is_open,
        business_hours: business_hours || config.business_hours,
        special_closures: special_closures || config.special_closures
      }
    });

    // If manual status changed, we might want to trigger a sync for today
    if (is_open !== undefined) {
      try {
        const { syncDailySummary } = await import('@/lib/aggregation');
        await syncDailySummary(new Date());
      } catch (e) {
        console.warn("Failed to sync on status change", e);
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
