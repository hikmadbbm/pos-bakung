import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const categories = await prisma.menuCategory.findMany({
      orderBy: { id: 'asc' },
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, color } = body;

    const newCategory = await prisma.menuCategory.create({
      data: { name, color },
    });

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error('Failed to create category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
