import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const { user, response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'CASHIER']);
    if (response) return response;

    const searchParams = req.nextUrl.searchParams;
    let userId = searchParams.get('userId');

    // If Cashier, force them to only see their own history
    if (user.role === 'CASHIER') {
      userId = user.id.toString();
    }
    const where = {};
    if (userId) {
      const uid = Number(userId);
      if (!Number.isFinite(uid)) {
        return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
      }
      where.user_id = uid;
    }

    // Filter by date if provided
    const dateParam = searchParams.get('date');
    if (dateParam) {
      const dayStart = new Date(dateParam);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dateParam);
      dayEnd.setHours(23, 59, 59, 999);
      where.start_time = { gte: dayStart, lte: dayEnd };
      where.status = 'CLOSED';
    }

    const shifts = await prisma.userShift.findMany({
      where,
      orderBy: { start_time: 'desc' },
      take: 100,
      include: { user: { select: { name: true, username: true } } }
    });
    return NextResponse.json(shifts);
  } catch (error) {
    console.error('Failed to fetch shift history:', error);
    return NextResponse.json({ error: 'Failed to fetch shift history' }, { status: 500 });
  }
}

