import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(req, { params }) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    const resolvedParams = await params;
    const id = Number(resolvedParams.id);

    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        ingredients: {
          include: { ingredient: true }
        },
        menu: true
      }
    });

    if (!recipe) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });

    return NextResponse.json(recipe);
  } catch (error) {
    console.error('Failed to fetch recipe:', error);
    return NextResponse.json({ error: 'Failed to fetch recipe' }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    const resolvedParams = await params;
    const id = Number(resolvedParams.id);
    const body = await req.json();
    const { 
      name, 
      menu_id, 
      base_quantity, 
      ingredients, 
      monthly_fixed_cost,
      monthly_production_volume
    } = body;

    // Logic similar to POST for calculation
    const dbIngredientIds = ingredients
      .filter(i => i.source === 'DATABASE' && i.ingredient_id)
      .map(i => i.ingredient_id);
    
    const dbIngredients = await prisma.ingredient.findMany({
      where: { id: { in: dbIngredientIds } }
    });
    const dbIngredMap = new Map(dbIngredients.map(i => [i.id, i]));

    let totalVariableCost = 0;
    const ingredientsToSync = ingredients.map(i => {
      let costPerUnit = 0;
      if (i.source === 'DATABASE' && i.ingredient_id) {
        const dbIng = dbIngredMap.get(i.ingredient_id);
        costPerUnit = dbIng ? dbIng.cost_per_unit : 0;
      } else {
        costPerUnit = Number(i.manual_cost) || 0;
      }
      
      const itemTotal = (Number(i.quantity) || 0) * costPerUnit;
      totalVariableCost += itemTotal;

      return {
        ingredient_id: i.source === 'DATABASE' ? i.ingredient_id : null,
        manual_name: i.source === 'MANUAL' ? i.manual_name : null,
        manual_unit: i.source === 'MANUAL' ? i.manual_unit : null,
        manual_cost: i.source === 'MANUAL' ? Number(i.manual_cost) : null,
        quantity: Number(i.quantity) || 0,
        source: i.source || 'DATABASE'
      };
    });

    let fixedCostPerUnit = 0;
    if (monthly_fixed_cost && monthly_production_volume > 0) {
      fixedCostPerUnit = Math.round(Number(monthly_fixed_cost) / Number(monthly_production_volume));
    }

    const totalHpp = Math.round(totalVariableCost + fixedCostPerUnit);

    const updated = await prisma.$transaction(async (tx) => {
      // Delete old ingredients first
      await tx.recipeIngredient.deleteMany({ where: { recipe_id: id } });

      const recipe = await tx.recipe.update({
        where: { id },
        data: {
          name,
          menu_id: menu_id ? Number(menu_id) : null,
          base_quantity: Number(base_quantity) || 1,
          monthly_fixed_cost: Number(monthly_fixed_cost) || 0,
          monthly_production_volume: Number(monthly_production_volume) || 0,
          total_variable_cost: Math.round(totalVariableCost),
          fixed_cost_allocation: fixedCostPerUnit,
          total_hpp: totalHpp,
          ingredients: {
            create: ingredientsToSync
          }
        },
        include: {
          ingredients: {
            include: { ingredient: true }
          }
        }
      });

      if (menu_id) {
        await tx.menu.update({
          where: { id: Number(menu_id) },
          data: { cost: totalHpp }
        });
      }

      return recipe;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update recipe:', error);
    return NextResponse.json({ error: 'Failed to update recipe' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    const resolvedParams = await params;
    const id = Number(resolvedParams.id);

    await prisma.recipe.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete recipe:', error);
    return NextResponse.json({ error: 'Failed to delete recipe' }, { status: 500 });
  }
}
