import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(req) {
  try {
    const { response } = await verifyAuth(req);
    if (response) return response;

    const summary = await prisma.consignmentDailyLog.aggregate({
      where: {
        status: { in: ['PENDING', 'RECEIVED'] }
      },
      _sum: {
        expectedIncome: true,
        actualReceived: true,
      }
    });

    const expected = summary._sum.expectedIncome || 0;
    const received = summary._sum.actualReceived || 0;
    const outstanding = expected - received;

    return NextResponse.json({
      expected,
      received,
      outstanding
    });
  } catch (error) {
    console.error('Finance summary error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
