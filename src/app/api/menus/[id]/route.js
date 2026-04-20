import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { logActivity } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PUT(req, { params }) {
  try {
    const { user, response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'KITCHEN']);
    if (response) return response;

    const { id: idStr } = await params;
    const id = Number(idStr);
    const body = await req.json();

    const { name, price, cost, categoryId, productType, is_active, prices, consignment } = body;

    const ipAddress = req.headers.get('x-forwarded-for') || req.ip;

    // Get old data for audit log
    const oldData = await prisma.menu.findUnique({
      where: { id },
      include: { prices: true, consignment: true }
    });

    await prisma.$transaction(async (tx) => {
      // 1. Update Menu item
      await tx.menu.update({
        where: { id },
        data: {
          name,
          price: Math.round(Number(price) || 0),
          cost: Math.round(Number(cost) || 0),
          categoryId: categoryId ? Number(categoryId) : null,
          productType: productType || 'OWN_PRODUCT',
          is_active: is_active === undefined ? true : !!is_active,
        }
      });

      // 2. Update Prices
      if (prices) {
        await tx.menuPrice.deleteMany({ where: { menu_id: id } });
        const priceData = Object.entries(prices)
          .filter(([_, pval]) => pval !== "" && pval !== null)
          .map(([pid, pval]) => ({
            menu_id: id,
            platform_id: Number(pid),
            price: Math.round(Number(pval))
          }));
        
        if (priceData.length > 0) {
          await tx.menuPrice.createMany({ data: priceData });
        }
      }

      // 3. Update Consignment
      if (productType === 'CONSIGNMENT' && consignment) {
        await tx.consignment.upsert({
          where: { productId: id },
          create: {
            productId: id,
            partnerName: consignment.partnerName || 'Unknown',
            modelType: consignment.modelType || 'FIXED_DAILY',
            fixedDailyFee: Math.round(Number(consignment.fixedDailyFee) || 0),
            revenueSharePercent: parseFloat(consignment.revenueSharePercent) || 0,
            startDate: new Date(consignment.startDate || new Date()),
            isActive: true
          },
          update: {
            partnerName: consignment.partnerName,
            modelType: consignment.modelType,
            fixedDailyFee: Math.round(Number(consignment.fixedDailyFee) || 0),
            revenueSharePercent: parseFloat(consignment.revenueSharePercent) || 0,
            isActive: true
          }
        });
      } else {
        await tx.consignment.deleteMany({ where: { productId: id } });
      }
    });

    // Log Activity
    await logActivity({
      userId: user.id,
      action: 'UPDATE',
      entity: 'MENU',
      entityId: id,
      ipAddress,
      details: {
        before: oldData,
        after: body
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('FATAL PUT ERROR:', error);
    return NextResponse.json({ error: 'Update failed', details: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { user, response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;
    
    const { id: idStr } = await params;
    const id = Number(idStr);

    const ipAddress = req.headers.get('x-forwarded-for') || req.ip;
    const oldData = await prisma.menu.findUnique({ where: { id } });
    
    await prisma.menu.delete({ where: { id } });

    await logActivity({
      userId: user.id,
      action: 'DELETE',
      entity: 'MENU',
      entityId: id,
      ipAddress,
      details: { deleted: oldData }
    });
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
