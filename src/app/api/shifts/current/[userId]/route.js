import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req, { params }) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'CASHIER']);
    if (response) return response;
    const resolvedParams = await params;
    const userId = Number(resolvedParams.userId);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
    }

    // First, check if the specific user has an open shift
    let shift = await prisma.userShift.findFirst({
      where: { user_id: userId, status: 'OPEN' },
      include: { user: { select: { name: true, username: true } } },
      orderBy: { id: 'desc' },
    });

    // If not, check if ANY user has an open shift
    if (!shift) {
      shift = await prisma.userShift.findFirst({
        where: { status: 'OPEN' },
        include: { user: { select: { name: true, username: true } } },
        orderBy: { id: 'desc' },
      });
    }

    return NextResponse.json(shift);
  } catch (error) {
    console.error('Failed to fetch current shift:', error);
    return NextResponse.json({ error: 'Failed to fetch current shift' }, { status: 500 });
  }
}

