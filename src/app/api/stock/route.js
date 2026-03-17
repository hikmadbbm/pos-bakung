import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'CASHIER']);
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const lowStock = searchParams.get('low_stock') === 'true';
    const search = searchParams.get('search');

    const where = {};
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { item_name: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } }
      ];
    }

    let ingredients = await prisma.ingredient.findMany({
      where,
      orderBy: { item_name: 'asc' },
    });

    if (lowStock) {
      ingredients = ingredients.filter(i => i.stock < i.minimum_stock);
    }

    return NextResponse.json(ingredients);
  } catch (error) {
    console.error('Failed to fetch stock overview:', error);
    return NextResponse.json({ error: 'Failed to fetch stock overview' }, { status: 500 });
  }
}
