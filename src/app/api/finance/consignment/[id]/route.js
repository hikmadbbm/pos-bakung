import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, verifyPermission } from '@/lib/auth';
import { logActivity } from '@/lib/audit';
import { flushCache } from '@/lib/cache';
import { syncDailySummary } from '@/lib/aggregation';

export async function DELETE(req, { params }) {
  try {
    const { user, response } = await verifyPermission(req, 'finance:confirm');
    if (response) return response;

    const { id } = params;

    await prisma.consignmentDailyLog.delete({
      where: { id }
    });

    await logActivity({
      userId: user.id,
      action: 'DELETE',
      entity: 'CONSIGNMENT_LOG',
      entityId: id,
      details: { reason: 'System adjustment' }
    });

    flushCache();
    
    // Sync current date to update Consignment Income in dashboard summary
    try {
      await syncDailySummary(new Date());
    } catch (e) {
      console.warn("Failed to sync summary after consignment deletion:", e.message);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Finance settlement delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
