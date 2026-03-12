import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function PUT(req, { params }) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    const resolvedParams = await params;
    const id = Number(resolvedParams.id);
    const body = await req.json();
    const { name, unit, cost_per_unit } = body;

    const oldIngredient = await prisma.ingredient.findUnique({ where: { id } });
    const newCost = Number(cost_per_unit) || 0;

    const updated = await prisma.$transaction(async (tx) => {
      const ing = await tx.ingredient.update({
        where: { id },
        data: {
          name,
          unit,
          cost_per_unit: newCost,
        },
      });

      // Price Monitoring: Check and flag recipes if cost impact > 5%
      if (oldIngredient && oldIngredient.cost_per_unit !== newCost) {
        const recipes = await tx.recipe.findMany({
          where: { ingredients: { some: { ingredient_id: id } } },
          include: { ingredients: true }
        });

        for (const recipe of recipes) {
          let oldVariableCost = recipe.total_variable_cost;
          let newVariableCost = 0;
          
          for (const ri of recipe.ingredients) {
            let cost = 0;
            if (ri.ingredient_id === id) {
              cost = newCost;
            } else if (ri.source === 'DATABASE' && ri.ingredient_id) {
                // We'd ideally need the latest cost of other ingredients here too
                // but for simplicity we'll just focus on the diff of this one ingredient
                // or use the existing subtotal logic.
                const otherIng = await tx.ingredient.findUnique({ where: { id: ri.ingredient_id } });
                cost = otherIng?.cost_per_unit || 0;
            } else {
              cost = ri.manual_cost || 0;
            }
            newVariableCost += (ri.quantity || 0) * cost;
          }

          const hppImpact = oldVariableCost > 0 ? ((newVariableCost - oldVariableCost) / oldVariableCost) * 100 : 0;
          
          await tx.recipe.update({
            where: { id: recipe.id },
            data: { 
              cost_change_alert: hppImpact,
              // Optionally update the actual HPP too so it stays in sync
              total_variable_cost: Math.round(newVariableCost),
              total_hpp: Math.round(newVariableCost + recipe.fixed_cost_allocation)
            }
          });
        }
      }

      return ing;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update ingredient:', error);
    return NextResponse.json({ error: 'Failed to update ingredient' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    const resolvedParams = await params;
    const id = Number(resolvedParams.id);

    await prisma.ingredient.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete ingredient:', error);
    return NextResponse.json({ error: 'Failed to delete ingredient' }, { status: 500 });
  }
}
