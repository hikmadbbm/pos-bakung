import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, verifyPermission } from '@/lib/auth';
import { flushCache } from '@/lib/cache';
import { logActivity } from '@/lib/audit';
import { syncDailySummary } from '@/lib/aggregation';

export async function GET(req) {
  try {
    const { response } = await verifyPermission(req, 'finance:view');
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');

    const logs = await prisma.consignmentDailyLog.findMany({
      where: {
        ...(startDate && endDate ? { date: { gte: new Date(startDate), lte: new Date(endDate) } } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        consignment: { include: { menu: true } }
      },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Finance settlement error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Bulk update / Single update
export async function POST(req) {
  try {
    const { user, response } = await verifyPermission(req, 'finance:confirm');
    if (response) return response;

    const body = await req.json();
    const { ids, action, data } = body; // action: 'RECEIVE', 'CREATE_MANUAL'

    if (action === 'RECEIVE' || action === 'NO_SALES') {
        const targetStatus = action === 'RECEIVE' ? 'RECEIVED' : 'NO_SALES';
        
        const updatePromises = ids.map(async (id) => {
          const log = await prisma.consignmentDailyLog.findUnique({ where: { id } });
          if (log) {
            const isNoSales = action === 'NO_SALES';
            return prisma.consignmentDailyLog.update({
              where: { id },
              data: {
                status: targetStatus,
                expectedIncome: isNoSales ? 0 : log.expectedIncome,
                calculatedIncome: isNoSales ? 0 : log.calculatedIncome,
                actualReceived: action === 'RECEIVE' ? log.expectedIncome : 0,
                receivedAt: new Date(),
                notes: (log.notes || '') + ` | Marked as ${targetStatus} by ${user.username}`
              }
            });
          }
       });
       
       await Promise.all(updatePromises);

        // Audit Logging
        await logActivity({
          userId: user.id,
          action: 'UPDATE',
          entity: 'CONSIGNMENT_LOG',
          entityId: ids.length === 1 ? ids[0] : 'BULK',
          details: { action: targetStatus, ids }
        });
    } else if (action === 'CREATE_MANUAL') {
      const { consignmentId, date, expectedIncome, notes } = data;
      
      // Check for existing
      const existing = await prisma.consignmentDailyLog.findUnique({
        where: { consignmentId_date: { consignmentId, date: new Date(date) } }
      });

      if (existing) {
        return NextResponse.json({ error: 'Log already exists for this date and partner' }, { status: 400 });
      }

        await prisma.consignmentDailyLog.create({
          data: {
            consignmentId,
            date: new Date(date),
            expectedIncome,
            calculatedIncome: expectedIncome,
            status: 'PENDING',
            notes: notes || `Manually created by ${user.username}`
          }
        });

        // Audit Logging
        await logActivity({
          userId: user.id,
          action: 'CREATE',
          entity: 'CONSIGNMENT_LOG',
          entityId: consignmentId,
          details: { action: 'MANUAL_ENTRY', date, expectedIncome }
        });
    }

    // Clear dashboard cache and force a sync for relevant dates after financial changes
    flushCache();
    
    // Sync current date to update Consignment Income in dashboard summary
    try {
      await syncDailySummary(new Date());
    } catch (e) {
      console.warn("Failed to sync summary after consignment update:", e.message);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Finance confirm error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
