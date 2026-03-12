import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(req, { params }) {
  try {
    const { user, response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'CASHIER', 'KITCHEN']);
    if (response) return response;

    const resolvedParams = await params;
    const id = Number(resolvedParams.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const body = await req.json();
    const { status, pin } = body;
    if (!status || typeof status !== 'string') {
      return NextResponse.json({ error: 'status is required' }, { status: 400 });
    }

    // PIN check logic:
    // OWNER/MANAGER never need PIN if authenticated via token
    // KITCHEN never needs PIN for production updates
    // CASHIER might need PIN if the specific status change is sensitive (e.g. COMPLETED -> PROCESSING)
    // For now, let's simplify: only require PIN if user is CASHIER and not provided.
    // Actually, let's just allow KITCHEN to skip PIN since they are locked to the kitchen view.
    if (user.role !== 'KITCHEN' && user.role !== 'MANAGER' && user.role !== 'OWNER') {
       if (!pin) {
         return NextResponse.json({ error: 'PIN is required for this action' }, { status: 403 });
       }
       const approver = await prisma.user.findFirst({
         where: { pin, status: 'ACTIVE', role: { in: ['MANAGER', 'OWNER'] } },
         select: { id: true },
       });
       if (!approver) {
         return NextResponse.json({ error: 'Invalid PIN' }, { status: 403 });
       }
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status },
      include: { orderItems: { include: { menu: true } }, platform: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update order status:', error);
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
  }
}

