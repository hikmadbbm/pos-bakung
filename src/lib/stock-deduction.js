import { prisma } from './prisma';

/**
 * Recursively aggregates all ingredient requirements for a given recipe.
 * Uses a Map to store aggregated totals by ingredientId.
 */
async function aggregateRecipeIngredients(recipeId, multiplier, tx, aggregateMap) {
  const recipe = await tx.recipe.findUnique({
    where: { id: Number(recipeId) },
    include: { items: true }
  });

  if (!recipe) return;

  const yieldMultiplier = multiplier / (recipe.base_quantity || 1);

  for (const item of recipe.items) {
    const requiredQty = (item.quantity || 0) * yieldMultiplier;

    if (item.item_type === 'INGREDIENT' && item.ingredient_id) {
      const id = Number(item.ingredient_id);
      if (isNaN(id)) continue;
      const current = aggregateMap.get(id) || 0;
      aggregateMap.set(id, current + requiredQty);
    } else if (item.item_type === 'COMPONENT' && item.component_recipe_id) {
      await aggregateRecipeIngredients(item.component_recipe_id, requiredQty, tx, aggregateMap);
    }
  }
}

/**
 * Deducts stock for a given order within a provided transaction.
 * @param {number} orderId 
 * @param {object} tx - Prisma transaction client
 */
export async function deductStockForOrder(orderId, tx) {
  // 1. Fetch order items with their menus and recipes
  const order = await tx.order.findUnique({
    where: { id: Number(orderId) },
    include: {
      orderItems: {
        include: {
          menu: {
            include: { recipe: true }
          }
        }
      }
    }
  });

  if (!order) throw new Error(`Order ${orderId} not found`);

  // 2. Aggregate all ingredients across all items
  const ingredientRequirements = new Map(); // ingredientId -> totalQty
  for (const item of order.orderItems) {
    if (item.menu?.recipe) {
      await aggregateRecipeIngredients(item.menu.recipe.id, item.qty, tx, ingredientRequirements);
    }
  }

  // 3. Process each ingredient requirement
  for (const [ingredientId, requiredQty] of ingredientRequirements.entries()) {
    const ingredient = await tx.ingredient.findUnique({
      where: { id: ingredientId }
    });

    if (!ingredient) {
      throw new Error(`Critical Error: Ingredient ID ${ingredientId} linked in recipe but not found in database.`);
    }

    // 4. Validate Stock
    if (ingredient.stock < requiredQty) {
      throw new Error(`Insufficient Stock: "${ingredient.item_name}" (Required: ${requiredQty.toFixed(2)}${ingredient.unit}, Current: ${ingredient.stock.toFixed(2)}${ingredient.unit})`);
    }

    // 5. Update Stock and Record Movement
    await tx.ingredient.update({
      where: { id: ingredientId },
      data: {
        stock: { decrement: requiredQty }
      }
    });

    await tx.stockMovement.create({
      data: {
        ingredient_id: ingredientId,
        movement_type: 'OUT',
        quantity: requiredQty,
        unit: ingredient.unit,
        reference_type: 'ORDER'
      }
    });
  }
}
