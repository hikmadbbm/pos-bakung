import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { verifyAuth } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req) {
  const startTime = Date.now();
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'CASHIER', 'KITCHEN']);
    if (response) return response;
    const categories = await prisma.menuCategory.findMany({
      orderBy: { id: 'asc' },
    });
    
    const duration = Date.now() - startTime;
    console.log(`GET /api/categories took ${duration}ms`);

    return NextResponse.json(categories, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      }
    });
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;
    const body = await req.json();
    const { name, color } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (color && typeof color !== 'string') {
      return NextResponse.json({ error: 'color must be string' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.menuCategory.create({
        data: { name, color: color || '#000000' },
      });
      return created;
    });

    logger.info('Category created', { id: result.id, name: result.name });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Failed to create category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
