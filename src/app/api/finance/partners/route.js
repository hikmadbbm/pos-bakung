import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(req) {
  try {
    const { response } = await verifyAuth(req);
    if (response) return response;

    const partners = await prisma.consignment.findMany({
      where: { isActive: true },
      include: { menu: { select: { name: true } } },
      orderBy: { partnerName: 'asc' }
    });

    return NextResponse.json(partners);
  } catch (error) {
    console.error('Finance partners list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
