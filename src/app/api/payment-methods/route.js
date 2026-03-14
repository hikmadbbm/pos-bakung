import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const startTime = Date.now();
  try {
    const methods = await prisma.paymentMethod.findMany({
      orderBy: { display_order: 'asc' },
    });
    
    const duration = Date.now() - startTime;
    console.log(`GET /api/payment-methods took ${duration}ms`);

    return NextResponse.json(methods, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      }
    });
  } catch (error) {
    console.error('Failed to fetch payment methods:', error);
    return NextResponse.json({ error: 'Failed to fetch payment methods' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, type, account_number, account_name, description, imageUrl, qris_data, is_active, display_order } = body;

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
        qris_data: qris_data || null,
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
