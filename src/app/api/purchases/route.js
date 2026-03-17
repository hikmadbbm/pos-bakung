import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { recalculateAffectedRecipes } from '@/lib/hpp';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const ingredientId = searchParams.get('ingredient_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    const where = {};
    if (ingredientId) where.ingredient_id = Number(ingredientId);

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        include: { ingredient: true },
        orderBy: { purchase_date: 'desc' },
        take: limit,
        skip: skip,
      }),
      prisma.purchase.count({ where }),
    ]);

    return NextResponse.json({
      data: purchases,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to fetch purchases:', error);
    return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    const body = await req.json();
    const { 
      ingredient_id, 
      new_ingredient_name,
      category,
      unit, 
      volume, // Units per quantity (multiplier)
      unit_price, 
      quantity,
      supplier, 
      notes, 
      purchase_date,
      brand // Optional for new items
    } = body;

    const purchaseVolume = Number(volume) || 1.0;

    if ((!ingredient_id && !new_ingredient_name) || !quantity || !unit_price) {
      return NextResponse.json({ error: 'Ingredient ID or Name, Quantity, and Unit Price are required' }, { status: 400 });
    }

    let finalIngredientId = ingredient_id;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Handle New Ingredient Creation if necessary
      if (!finalIngredientId && new_ingredient_name) {
        const newIngredient = await tx.ingredient.create({
          data: {
            item_name: new_ingredient_name,
            category: category || 'Uncategorized',
            unit: unit || 'pcs',
            brand: brand || '-',
            volume: 1, // Default for manual entry if not specified
            price: Number(unit_price),
            cost_per_unit: Number(unit_price) / purchaseVolume, // Base cost
            stock: 0, 
          }
        });
        finalIngredientId = newIngredient.id;
      }

      // 2. Fetch ingredient to get base volume for reference
      const ingredient = await tx.ingredient.findUnique({
        where: { id: Number(finalIngredientId) }
      });

      if (!ingredient) throw new Error('Ingredient not found');

      // 3. Create Purchase Record
      const purchase = await tx.purchase.create({
        data: {
          ingredient_id: Number(finalIngredientId),
          quantity: Number(quantity),
          unit: unit || ingredient.unit,
          volume: purchaseVolume,
          unit_price: Number(unit_price),
          total_price: Number(quantity) * Number(unit_price),
          supplier,
          notes,
          purchase_date: purchase_date ? new Date(purchase_date) : new Date(),
        }
      });

      // 4. Update Ingredient: Price, Stock, and CPU
      // cost_per_unit here is unit_price / volume (multiplier)
      const cpu = Number(unit_price) / purchaseVolume;

      await tx.ingredient.update({
        where: { id: Number(finalIngredientId) },
        data: {
          price: Number(unit_price),
          cost_per_unit: cpu,
          stock: { increment: Number(quantity) * purchaseVolume }, // Add total base units
          updated_at: new Date()
        }
      });

      // 5. Record Price History
      await tx.ingredientPriceHistory.create({
        data: {
          ingredient_id: Number(finalIngredientId),
          price: Number(unit_price),
          reference_purchase_id: purchase.id,
          date: purchase_date ? new Date(purchase_date) : new Date(),
        }
      });

      // 6. Record Stock Movement
      await tx.stockMovement.create({
        data: {
          ingredient_id: Number(finalIngredientId),
          movement_type: 'IN',
          quantity: Number(quantity) * purchaseVolume, // Log base units added
          unit: ingredient.unit,
          reference_id: purchase.id,
          reference_type: 'PURCHASE',
        }
      });

      return { purchase, ingredientId: finalIngredientId };
    });

    // 7. Recalculate HPP for all affected recipes (Async trigger)
    await recalculateAffectedRecipes(Number(result.ingredientId), prisma);

    return NextResponse.json(result.purchase, { status: 201 });
  } catch (error) {
    console.error('Failed to record purchase:', error);
    return NextResponse.json({ 
      error: 'Failed to record purchase', 
      details: error.message 
    }, { status: 500 });
  }
}
