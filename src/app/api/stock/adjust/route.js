import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { recalculateHppForIngredient } from '@/lib/hpp';

export async function POST(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    const { ingredient_id, quantity, notes } = await req.json();

    if (!ingredient_id || quantity === undefined) {
      return NextResponse.json({ error: 'Ingredient ID and quantity are required' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const ingredient = await tx.ingredient.findUnique({
        where: { id: Number(ingredient_id) }
      });

      if (!ingredient) throw new Error('Ingredient not found');

      const adjustment = await tx.stockMovement.create({
        data: {
          ingredient_id: Number(ingredient_id),
          movement_type: 'ADJUSTMENT',
          quantity: Number(quantity),
          unit: ingredient.unit,
          notes: notes || 'Quick adjustment from Stock page',
        }
      });

      const updatedIngredient = await tx.ingredient.update({
        where: { id: Number(ingredient_id) },
        data: {
          stock: { increment: Number(quantity) }
        }
      });

      return updatedIngredient;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Stock adjustment error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
