import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'ADMIN']);
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.userActivityLog.findMany({
        orderBy: { created_at: 'desc' },
        take: limit,
        skip,
        include: {
          user: {
            select: {
              name: true,
              role: true,
              username: true
            }
          }
        }
      }),
      prisma.userActivityLog.count()
    ]);

    return NextResponse.json({
      data: logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Audit Log API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
