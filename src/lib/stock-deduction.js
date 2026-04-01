import { prisma } from './prisma';


/**
 * Deducts stock for a given order within a provided transaction.
 * Optimized for maximum speed to avoid transaction timeouts on serverless platforms.
 */
export async function deductStockForOrder(orderId, tx, providedOrder = null) {
  // 1. Fetch order structure only if not provided
  let order = providedOrder;
  if (!order) {
    order = await tx.order.findUnique({
      where: { id: Number(orderId) },
      include: {
        orderItems: {
          include: {
            menu: { select: { recipe: { select: { id: true } } } }
          }
        }
      }
    });
  }

  if (!order) throw new Error(`Order ${orderId} not found`);

  // 2. Aggregate all ingredients across all items using optimized batching
  const orderItems = order.orderItems || [];
  const rootRecipeContexts = orderItems
    .filter(item => item.menu?.recipe?.id)
    .map(item => ({ id: item.menu.recipe.id, multiplier: item.qty }));

  if (rootRecipeContexts.length === 0) return;

  // Group by recipe to feed into batch processor
  const recipeGroups = new Map();
  for (const ctx of rootRecipeContexts) {
    recipeGroups.set(ctx.id, (recipeGroups.get(ctx.id) || 0) + ctx.multiplier);
  }

  const flattenedRootIds = Array.from(recipeGroups.entries()).map(([id, mult]) => ({ id, multiplier: mult }));
  
  // BFS Fetch
  const ingredientRequirements = await getRecipeTreeBatch(flattenedRootIds, tx);

  if (ingredientRequirements.size === 0) return;

  // 3. Process each ingredient requirement
  // SORT IDs to prevent deadlocks
  const sortedIngredientIds = Array.from(ingredientRequirements.keys()).sort((a, b) => a - b);
  
  // Bulk fetch ingredient current states
  const ingredients = await tx.ingredient.findMany({
    where: { id: { in: sortedIngredientIds } }
  });
  const ingredientMap = new Map(ingredients.map(i => [i.id, i]));

  // 4. Update Stock and Record Movement in PARALLEL batches
  const updatePromises = sortedIngredientIds.map(async (id) => {
    const requiredQty = ingredientRequirements.get(id);
    if (!requiredQty || requiredQty <= 0) return;
    
    const ingredient = ingredientMap.get(id);
    if (!ingredient) {
      throw new Error(`Critical Error: Ingredient ID ${id} linked in recipe but not found in database.`);
    }

    // Proactive Stock Validation
    if ((ingredient.stock || 0) < requiredQty) {
      throw new Error(`Insufficient Stock: "${ingredient.item_name}" (Required: ${requiredQty.toFixed(2)}${ingredient.unit}, Current: ${ingredient.stock.toFixed(2)}${ingredient.unit})`);
    }

    // Return pair of operations: Update + Movement
    return [
      tx.ingredient.update({
        where: { id },
        data: { stock: { decrement: requiredQty } }
      }),
      tx.stockMovement.create({
        data: {
          ingredient_id: id,
          movement_type: 'OUT',
          quantity: requiredQty,
          unit: ingredient.unit,
          reference_type: 'ORDER',
          order_id: Number(orderId)
        }
      })
    ];
  });

  // Resolve all update logic and then execute all DB operations in parallel
  const resolvedWaiters = await Promise.all(updatePromises);
  const dbOps = resolvedWaiters.flat().filter(Boolean);
  
  if (dbOps.length > 0) {
    await Promise.all(dbOps);
  }
}

/**
 * BFS Batch Recipe Resolver
 */
async function getRecipeTreeBatch(rootContexts, tx) {
  const aggregatedRequirements = new Map();
  let queue = [...rootContexts];
  let depth = 0;

  while (queue.length > 0 && depth < 12) {
    const ids = Array.from(new Set(queue.map(q => q.id)));
    const recipes = await tx.recipe.findMany({
      where: { id: { in: ids } },
      include: { items: true }
    });

    const rMap = new Map(recipes.map(r => [r.id, r]));
    const nextQueue = [];

    for (const context of queue) {
      const recipe = rMap.get(context.id);
      if (!recipe) continue;

      const yieldMult = context.multiplier / (recipe.base_quantity || 1);

      for (const item of recipe.items) {
        const itemQty = (item.quantity || 0) * yieldMult;
        if (item.item_type === 'INGREDIENT' && item.ingredient_id) {
          const id = Number(item.ingredient_id);
          aggregatedRequirements.set(id, (aggregatedRequirements.get(id) || 0) + itemQty);
        } else if (item.item_type === 'COMPONENT' && item.component_recipe_id) {
          nextQueue.push({ id: item.component_recipe_id, multiplier: itemQty });
        }
      }
    }
    queue = nextQueue;
    depth++;
  }
  return aggregatedRequirements;
}
