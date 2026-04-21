import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'CASHIER']);
    if (response) return response;
    
    const { searchParams } = new URL(req.url);
    const userIdStr = searchParams.get('userId');
    const userId = userIdStr ? Number(userIdStr) : NaN;
    
    console.log(`[shifts-api] Checking shift for userId: ${userIdStr}`);

    // If userId not provided, try to find ANY open shift
    let shift;
    if (userIdStr && !isNaN(userId)) {
      shift = await prisma.userShift.findFirst({
        where: { user_id: userId, status: 'OPEN' },
        include: { user: { select: { name: true, username: true } } },
        orderBy: { id: 'desc' },
      });
    }

    if (!shift) {
      shift = await prisma.userShift.findFirst({
        where: { status: 'OPEN' },
        include: { user: { select: { name: true, username: true } } },
        orderBy: { id: 'desc' },
      });
    }

    return NextResponse.json(shift || null);
  } catch (error) {
    console.error('[shifts-api] Fatal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
