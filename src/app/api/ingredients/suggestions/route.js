import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'CASHIER']);
    if (response) return response;

    // Fetch unique categories and item names
    // Note: Prisma does not have a direct "SELECT DISTINCT" for multiple columns in one go easily while keeping them separate
    // We can do two queries or one raw query. Two queries are cleaner with Prisma.
    
    const [categoriesResult, namesResult] = await Promise.all([
      prisma.ingredient.findMany({
        select: { category: true },
        distinct: ['category'],
      }),
      prisma.ingredient.findMany({
        select: { item_name: true },
        distinct: ['item_name'],
      })
    ]);

    const categories = categoriesResult.map(c => c.category).sort();
    const itemNames = namesResult.map(n => n.item_name).sort();

    return NextResponse.json({
      categories,
      itemNames
    });
  } catch (error) {
    console.error('Failed to fetch ingredient suggestions:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
