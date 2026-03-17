import { prisma } from './prisma';

/**
 * Calculates total variable cost for a set of recipe items.
 * Handles both INGREDIENT and COMPONENT types recursively.
 */
export async function calculateItemsVariableCost(items, tx = prisma) {
  let totalVariable = 0;
  
  for (const item of items) {
    if (item.item_type === 'INGREDIENT' && item.ingredient_id) {
      const ing = await tx.ingredient.findUnique({ where: { id: Number(item.ingredient_id) } });
      if (ing) {
        totalVariable += (ing.cost_per_unit || 0) * (Number(item.quantity) || 0);
      }
    } else if (item.item_type === 'COMPONENT' && item.component_recipe_id) {
      const comp = await tx.recipe.findUnique({ where: { id: Number(item.component_recipe_id) } });
      if (comp) {
        const costPerPortion = (comp.total_hpp || 0) / (comp.base_quantity || 1);
        totalVariable += costPerPortion * (Number(item.quantity) || 0);
      }
    }
  }
  return Math.round(totalVariable);
}

/**
 * Recalculates and updates the HPP for a specific recipe.
 * Also updates the linked menu's cost.
 */
export async function updateRecipeHpp(recipeId, tx = prisma) {
  const recipe = await tx.recipe.findUnique({
    where: { id: Number(recipeId) },
    include: { items: true }
  });

  if (!recipe) return null;

  const totalVariableCost = await calculateItemsVariableCost(recipe.items, tx);
  
  let fixedCostPerUnit = 0;
  if (recipe.monthly_fixed_cost && recipe.monthly_production_volume > 0) {
    fixedCostPerUnit = Math.round(Number(recipe.monthly_fixed_cost) / Number(recipe.monthly_production_volume));
  }

  const totalHpp = Math.round(totalVariableCost + fixedCostPerUnit);

  const updated = await tx.recipe.update({
    where: { id: recipe.id },
    data: {
      total_variable_cost: totalVariableCost,
      fixed_cost_allocation: fixedCostPerUnit,
      total_hpp: totalHpp,
      updated_at: new Date()
    }
  });

  // Update linked menu
  if (recipe.menu_id) {
    await tx.menu.update({
      where: { id: recipe.menu_id },
      data: { cost: totalHpp }
    });
  }

  // If this recipe is used as a component in OTHER recipes, we must update them too
  const parentRecipeItems = await tx.recipeItem.findMany({
    where: { component_recipe_id: recipe.id },
    select: { recipe_id: true }
  });

  // Extract unique recipe IDs
  const parentRecipeIds = [...new Set(parentRecipeItems.map(i => i.recipe_id))];
  
  for (const parentId of parentRecipeIds) {
    await updateRecipeHpp(parentId, tx);
  }

  return updated;
}

/**
 * Finds all recipes that use a particular ingredient and triggers HPP recalculation.
 */
export async function recalculateAffectedRecipes(ingredientId, tx = prisma) {
  const recipeItems = await tx.recipeItem.findMany({
    where: { ingredient_id: Number(ingredientId) },
    select: { recipe_id: true }
  });

  const recipeIds = [...new Set(recipeItems.map(i => i.recipe_id))];
  
  for (const id of recipeIds) {
    await updateRecipeHpp(id, tx);
  }
}
