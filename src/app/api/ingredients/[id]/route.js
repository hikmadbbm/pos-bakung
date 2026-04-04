import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(req, { params }) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    const resolvedParams = await params;
    const id = Number(resolvedParams.id);

    const ingredient = await prisma.ingredient.findUnique({
      where: { id },
      include: {
        price_history: {
          orderBy: { date: 'asc' }
        }
      }
    });

    if (!ingredient) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(ingredient);
  } catch (error) {
    console.error('Failed to fetch ingredient:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// Helper to recalculate HPP for a single recipe
async function refreshRecipeHpp(recipeId, tx) {
  const recipe = await tx.recipe.findUnique({
    where: { id: recipeId },
    include: { items: { include: { ingredient: true, component_recipe: true } } }
  });
  if (!recipe) return;

  let variableCost = 0;
  for (const item of recipe.items) {
    if (item.item_type === 'INGREDIENT' && item.ingredient) {
      variableCost += (item.ingredient.cost_per_unit || 0) * (item.quantity || 0);
    } else if (item.item_type === 'COMPONENT' && item.component_recipe) {
      const costPerPortion = (item.component_recipe.total_hpp || 0) / (item.component_recipe.base_quantity || 1);
      variableCost += costPerPortion * (item.quantity || 0);
    }
  }

  const newTotalHpp = Math.round(variableCost + recipe.fixed_cost_allocation);
  const oldHpp = recipe.total_hpp;
  
  if (oldHpp !== newTotalHpp) {
    await tx.recipe.update({
      where: { id: recipeId },
      data: { 
        total_variable_cost: Math.round(variableCost),
        total_hpp: newTotalHpp,
        cost_change_alert: oldHpp > 0 ? ((newTotalHpp - oldHpp) / oldHpp) * 100 : 0
      }
    });

    // If this was a component recipe, we must update recipes that use it
    if (recipe.type === 'COMPONENT') {
      const usages = await tx.recipeItem.findMany({
        where: { component_recipe_id: recipeId },
        select: { recipe_id: true }
      });
      for (const usage of usages) {
        await refreshRecipeHpp(usage.recipe_id, tx);
      }
    }

    // Update menu if linked
    if (recipe.menu_id) {
      await tx.menu.update({
        where: { id: recipe.menu_id },
        data: { cost: newTotalHpp }
      });
    }
  }
}

export async function PUT(req, { params }) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    const resolvedParams = await params;
    const id = Number(resolvedParams.id);
    const body = await req.json();
    let { 
      category, item_name, brand, volume, unit, price, 
      purchase_location, purchase_link, notes 
    } = body;

    // Normalization
    if (category) category = category.trim();
    if (item_name) item_name = item_name.trim();

    const oldIngredient = await prisma.ingredient.findUnique({ where: { id } });
    const vol = parseFloat(volume);
    const prc = parseInt(price);
    const newCost = vol > 0 ? prc / vol : 0;

    const updated = await prisma.$transaction(async (tx) => {
      const ing = await tx.ingredient.update({
        where: { id },
        data: {
          category, item_name, brand, volume: vol, unit, price: prc,
          cost_per_unit: newCost, purchase_location, purchase_link, notes,
        },
      });

      if (oldIngredient && oldIngredient.price !== prc) {
        await tx.ingredientPriceHistory.create({ data: { ingredient_id: id, price: prc } });
      }

      if (oldIngredient && oldIngredient.cost_per_unit !== newCost) {
        // Trigger recursive refresh for all recipes using this ingredient
        const affectedRecipes = await tx.recipeItem.findMany({
          where: { ingredient_id: id },
          select: { recipe_id: true }
        });
        
        for (const affected of affectedRecipes) {
          await refreshRecipeHpp(affected.recipe_id, tx);
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

    await prisma.ingredient.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete ingredient:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
