import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'CASHIER']);
    if (response) return response;

    const promo = await prisma.promotion.findUnique({
      where: { id: parseInt(id) },
      include: {
        conditions: true,
        actions: true,
        constraints: true
      }
    });

    if (!promo) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }

    return NextResponse.json(promo);
  } catch (error) {
    console.error('Failed to fetch promotion:', error);
    return NextResponse.json({ error: 'Failed to fetch promotion' }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    const body = await req.json();
    const {
      name,
      description,
      type,
      status,
      startDate,
      endDate,
      daysActive,
      timeStart,
      timeEnd,
      priority,
      stackable,
      source,
      maxUsagePerDay,
      maxUsagePerCustomer,
      conditions,
      actions,
      constraints
    } = body;

    const promoId = parseInt(id);

    const result = await prisma.$transaction(async (tx) => {
      // Delete existing nested records
      await tx.promotionCondition.deleteMany({ where: { promotionId: promoId } });
      await tx.promotionAction.deleteMany({ where: { promotionId: promoId } });
      await tx.promotionConstraint.deleteMany({ where: { promotionId: promoId } });

      // Update promo and recreate nested records
      return await tx.promotion.update({
        where: { id: promoId },
        data: {
          name,
          description,
          type,
          status,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          daysActive,
          timeStart,
          timeEnd,
          priority,
          stackable,
          source,
          maxUsagePerDay,
          maxUsagePerCustomer,
          conditions: {
            create: conditions || []
          },
          actions: {
            create: actions || []
          },
          constraints: {
            create: constraints || []
          }
        },
        include: {
          conditions: true,
          actions: true,
          constraints: true
        }
      });
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to update promotion:', error);
    return NextResponse.json({ error: 'Failed to update promotion' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    await prisma.promotion.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ message: 'Promotion deleted successfully' });
  } catch (error) {
    console.error('Failed to delete promotion:', error);
    return NextResponse.json({ error: 'Failed to delete promotion' }, { status: 500 });
  }
}
