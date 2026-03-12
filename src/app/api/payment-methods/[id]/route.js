import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PUT(req, { params }) {
  try {
    const resolvedParams = await params;
    const id = Number(resolvedParams.id);
    const body = await req.json();
    const { name, type, account_number, account_name, description, imageUrl, is_active, display_order } = body;

    const updated = await prisma.paymentMethod.update({
      where: { id },
      data: {
        name,
        type,
        account_number,
        account_name,
        description,
        imageUrl,
        is_active,
        display_order: Number(display_order) || 0,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update payment method:', error);
    return NextResponse.json({ error: 'Failed to update payment method' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const resolvedParams = await params;
    const id = Number(resolvedParams.id);

    // Instead of blocking, we update orders to disconnect this payment method
    // This allows deletion while preserving order history (payment_method_id becomes null)
    await prisma.order.updateMany({
      where: { payment_method_id: id },
      data: { payment_method_id: null }
    });

    await prisma.paymentMethod.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete payment method:', error);
    return NextResponse.json({ error: 'Failed to delete payment method' }, { status: 500 });
  }
}
