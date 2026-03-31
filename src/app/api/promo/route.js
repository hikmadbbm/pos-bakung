import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function POST(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    const { name, price, cost } = await req.json();

    // Find or create 'Promotions' category
    let category = await prisma.menuCategory.findFirst({
      where: { name: 'Promotions' }
    });

    if (!category) {
      category = await prisma.menuCategory.create({
        data: { name: 'Promotions', color: '#10b981' } // Emerald color
      });
    }

    // Create bundle as a new Menu item
    const newMenu = await prisma.menu.create({
      data: {
        name,
        price: Number(price),
        cost: Number(cost),
        categoryId: category.id,
        is_active: true
      }
    });

    return NextResponse.json(newMenu);
  } catch (error) {
    console.error('Failed to create bundle:', error);
    return NextResponse.json({ error: 'Failed to save bundle' }, { status: 500 });
  }
}
