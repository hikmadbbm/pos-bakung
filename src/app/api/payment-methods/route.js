import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const methods = await prisma.paymentMethod.findMany({
      orderBy: { display_order: 'asc' },
    });
    return NextResponse.json(methods);
  } catch (error) {
    console.error('Failed to fetch payment methods:', error);
    return NextResponse.json({ error: 'Failed to fetch payment methods' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, type, account_number, account_name, description, imageUrl, is_active, display_order } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const method = await prisma.paymentMethod.create({
      data: {
        name,
        type: type || 'CASH',
        account_number: account_number || null,
        account_name: account_name || null,
        description: description || null,
        imageUrl: imageUrl || null,
        is_active: is_active ?? true,
        display_order: Number(display_order) || 0,
      },
    });

    return NextResponse.json(method, { status: 201 });
  } catch (error) {
    console.error('Failed to create payment method:', error);
    return NextResponse.json({ error: 'Failed to create payment method' }, { status: 500 });
  }
}
