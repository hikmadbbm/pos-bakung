import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'CASHIER']);
    if (response) return response;

    const ingredients = await prisma.ingredient.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(ingredients);
  } catch (error) {
    console.error('Failed to fetch ingredients:', error);
    return NextResponse.json({ error: 'Failed to fetch ingredients' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    const body = await req.json();
    const { name, unit, cost_per_unit } = body;

    if (!name || !unit) {
      return NextResponse.json({ error: 'Name and unit are required' }, { status: 400 });
    }

    const ingredient = await prisma.ingredient.create({
      data: {
        name,
        unit,
        cost_per_unit: Number(cost_per_unit) || 0,
      },
    });

    return NextResponse.json(ingredient, { status: 201 });
  } catch (error) {
    console.error('Failed to create ingredient:', error);
    return NextResponse.json({ error: 'Failed to create ingredient' }, { status: 500 });
  }
}
