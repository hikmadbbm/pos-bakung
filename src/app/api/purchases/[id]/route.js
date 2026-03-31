import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { recalculateAffectedRecipes } from '@/lib/hpp';

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    const purchaseId = Number(id);

    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({
        where: { id: purchaseId },
        include: { ingredient: true }
      });

      if (!purchase) throw new Error('Purchase record not found');

      const ingredientId = purchase.ingredient_id;
      const totalBaseUnits = purchase.quantity * purchase.volume;

      // 1. Revert Stock
      await tx.ingredient.update({
        where: { id: ingredientId },
        data: {
          stock: { decrement: totalBaseUnits },
          updated_at: new Date()
        }
      });

      // 2. Delete Movements & History
      await tx.stockMovement.deleteMany({
        where: { reference_id: purchaseId, reference_type: 'PURCHASE' }
      });

      await tx.ingredientPriceHistory.deleteMany({
        where: { reference_purchase_id: purchaseId }
      });

      // 3. Delete Purchase
      await tx.purchase.delete({ where: { id: purchaseId } });

      // 4. Revert to previous price
      const prevPurchase = await tx.purchase.findFirst({
        where: { ingredient_id: ingredientId },
        orderBy: { purchase_date: 'desc' }
      });

      if (prevPurchase) {
        const cpu = prevPurchase.unit_price / prevPurchase.volume;
        await tx.ingredient.update({
          where: { id: ingredientId },
          data: { price: prevPurchase.unit_price, cost_per_unit: cpu }
        });
      }

      return { ingredientId };
    });

    await recalculateAffectedRecipes(Number(result.ingredientId), prisma);

    return NextResponse.json({ message: 'Purchase cancelled' });
  } catch (error) {
    console.error('Failed to cancel purchase:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    const body = await req.json();
    const { quantity, unit_price, volume, purchase_date, supplier, notes } = body;
    const purchaseId = Number(id);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Get old data
      const oldPurchase = await tx.purchase.findUnique({
        where: { id: purchaseId },
        include: { ingredient: true }
      });

      if (!oldPurchase) throw new Error('Purchase not found');

      const ingredientId = oldPurchase.ingredient_id;
      const oldImpact = oldPurchase.quantity * oldPurchase.volume;
      const newImpact = Number(quantity) * Number(volume);

      // 2. Update Ingredient Stock & Price
      const cpu = Number(unit_price) / Number(volume);
      
      await tx.ingredient.update({
        where: { id: ingredientId },
        data: {
          stock: { increment: newImpact - oldImpact }, // Net change
          price: Number(unit_price),
          cost_per_unit: cpu,
          updated_at: new Date()
        }
      });

      // 3. Update Purchase Record
      const updatedPurchase = await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          quantity: Number(quantity),
          unit_price: Number(unit_price),
          volume: Number(volume),
          total_price: Number(quantity) * Number(unit_price),
          purchase_date: purchase_date ? new Date(purchase_date) : oldPurchase.purchase_date,
          supplier,
          notes
        }
      });

      // 4. Update Stock Movement
      await tx.stockMovement.updateMany({
        where: { reference_id: purchaseId, reference_type: 'PURCHASE' },
        data: {
           quantity: newImpact,
           unit: oldPurchase.ingredient.unit
        }
      });

      // 5. Update Price History
      await tx.ingredientPriceHistory.updateMany({
        where: { reference_purchase_id: purchaseId },
        data: {
          price: Number(unit_price),
          date: purchase_date ? new Date(purchase_date) : oldPurchase.purchase_date
        }
      });

      return { ingredientId, updatedPurchase };
    });

    await recalculateAffectedRecipes(Number(result.ingredientId), prisma);

    return NextResponse.json(result.updatedPurchase);
  } catch (error) {
    console.error('Failed to update purchase:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
