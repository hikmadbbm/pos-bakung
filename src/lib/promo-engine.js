import { prisma } from './prisma';

/**
 * Main function to evaluate and apply the best promotions for a given order/cart.
 */
export async function evaluatePromotions(orderData) {
  const { items, platform_id, payment_method, customer_type, order_type, subtotal } = orderData;
  
  const activePromos = await prisma.promotion.findMany({
    where: {
      status: 'ACTIVE',
      AND: [
        { OR: [{ startDate: null }, { startDate: { lte: new Date() } }] },
        { OR: [{ endDate: null }, { endDate: { gte: new Date() } }] }
      ]
    },
    include: { conditions: true, actions: true, constraints: true },
    orderBy: { priority: 'desc' }
  });

  const now = new Date();
  const dayOfWeek = (now.getDay() === 0 ? 7 : now.getDay());
  const timeStr = now.toTimeString().slice(0, 5);

  const filteredPromos = activePromos.filter(promo => {
    if (promo.daysActive) {
      const activeDays = promo.daysActive.split(',').map(d => d.trim());
      if (!activeDays.includes(dayOfWeek.toString())) return false;
    }
    if (promo.timeStart && timeStr < promo.timeStart) return false;
    if (promo.timeEnd && timeStr > promo.timeEnd) return false;
    return true;
  });

  const eligiblePromos = [];

  for (const promo of filteredPromos) {
    if (validateConditions(promo, orderData)) {
      const res = calculateDiscount(promo, orderData);
      if (res.total > 0) {
        eligiblePromos.push({
          ...promo,
          appliedAmount: res.total,
          itemDiscounts: res.itemDiscounts
        });
      }
    }
  }

  if (eligiblePromos.length === 0) return { totalDiscount: 0, appliedPromos: [] };

  const stackable = eligiblePromos.filter(p => p.stackable);
  const nonStackable = eligiblePromos.filter(p => !p.stackable);

  let appliedPromos = [...stackable];

  if (nonStackable.length > 0) {
    const bestNonStackable = nonStackable.reduce((prev, current) => 
      (prev.appliedAmount > current.appliedAmount) ? prev : current
    );
    
    const filteredStackable = appliedPromos.filter(p => {
      const constraints = p.constraints[0];
      if (constraints?.cannotCombineWith?.includes(bestNonStackable.id)) return false;
      const nsConstraints = bestNonStackable.constraints[0];
      if (nsConstraints?.cannotCombineWith?.includes(p.id)) return false;
      return true;
    });

    appliedPromos = [...filteredStackable, bestNonStackable];
  }

  const totalDiscount = appliedPromos.reduce((sum, p) => sum + p.appliedAmount, 0);

  // Aggregate item discounts across all applied promos
  const itemDiscounts = {};
  appliedPromos.forEach(p => {
    if (p.itemDiscounts) {
      Object.entries(p.itemDiscounts).forEach(([itemId, amt]) => {
        itemDiscounts[itemId] = (itemDiscounts[itemId] || 0) + amt;
      });
    }
  });

  return {
    totalDiscount,
    itemDiscounts,
    appliedPromos: appliedPromos.map(p => ({
      id: p.id,
      name: p.name,
      amount: p.appliedAmount
    }))
  };
}

function validateConditions(promo, orderData) {
  const { items, subtotal, payment_method, order_type, platform_id } = orderData;
  const conditions = promo.conditions[0];
  if (!conditions) return true;

  if (conditions.minTransactionAmount && subtotal < conditions.minTransactionAmount) return false;

  const totalQty = items.reduce((sum, i) => sum + (i.qty || 0), 0);
  if (conditions.minItemQuantity && totalQty < conditions.minItemQuantity) return false;

  if (conditions.productIds && conditions.productIds.length > 0) {
    const hasRequiredProduct = items.some(i => conditions.productIds.includes(i.menu_id));
    if (!hasRequiredProduct) return false;
  }

  if (conditions.categoryIds && conditions.categoryIds.length > 0) {
    const itemCategoryIds = items.map(i => i.categoryId);
    const hasRequiredCategory = itemCategoryIds.some(cid => conditions.categoryIds.includes(cid));
    if (!hasRequiredCategory) return false;
  }

  if (conditions.paymentMethods && conditions.paymentMethods.length > 0) {
    if (!conditions.paymentMethods.includes(payment_method)) return false;
  }

  if (conditions.orderType && order_type !== conditions.orderType) return false;
  if (conditions.platform && String(platform_id) !== String(conditions.platform)) return false;

  return true;
}

function calculateDiscount(promo, orderData) {
  const { items, subtotal } = orderData;
  const action = promo.actions[0];
  if (!action) return { total: 0, itemDiscounts: {} };

  let total = 0;
  let itemDiscounts = {};

  switch (action.actionType) {
    case 'PERCENT_DISCOUNT': {
      total = Math.round(subtotal * (action.value / 100));
      if (action.maxDiscount && total > action.maxDiscount) {
        total = action.maxDiscount;
      }
      // Distribute proportionally across all items (simplification)
      items.forEach(item => {
        const itemSubtotal = item.price * (item.qty || 1);
        itemDiscounts[item.cartItemId || item.id] = Math.round(itemSubtotal * (total / subtotal));
      });
      break;
    }
    
    case 'FIXED_DISCOUNT': {
      const fixedConditions = promo.conditions[0];
      const targets = (fixedConditions?.productIds?.length || fixedConditions?.categoryIds?.length)
        ? items.filter(i => fixedConditions.productIds?.includes(i.menu_id) || fixedConditions.categoryIds?.includes(i.categoryId))
        : items;

      if (promo.type === 'ITEM' || fixedConditions?.productIds?.length || fixedConditions?.categoryIds?.length) {
        targets.forEach(item => {
          const discountPerUnit = action.value;
          const totalItemDiscount = discountPerUnit * (item.qty || 1);
          itemDiscounts[item.cartItemId || item.id] = totalItemDiscount;
          total += totalItemDiscount;
        });
      } else {
        total = action.value;
        // Distribute fixed cart discount across items
        items.forEach(item => {
          const itemSubtotal = item.price * (item.qty || 1);
          itemDiscounts[item.cartItemId || item.id] = Math.round(itemSubtotal * (total / subtotal));
        });
      }
      break;
    }
    
    case 'FREE_ITEM': {
      const freeItem = items.find(i => i.menu_id === action.freeProductId);
      if (freeItem) {
        total = freeItem.price;
        itemDiscounts[freeItem.cartItemId || freeItem.id] = freeItem.price;
      }
      break;
    }

    case 'FLAT_PRICE': {
      total = subtotal - action.value;
      items.forEach(item => {
        const itemSubtotal = item.price * (item.qty || 1);
        itemDiscounts[item.cartItemId || item.id] = Math.round(itemSubtotal * (total / subtotal));
      });
      break;
    }

    case 'BUY_X_GET_Y': {
      const buyXConditions = promo.conditions[0];
      const triggerProductIds = buyXConditions?.productIds || [];
      const triggerCategoryIds = buyXConditions?.categoryIds || [];
      const X = action.triggerQty || buyXConditions?.minItemQuantity || 1;
      const Y = action.freeQty || 1;
      
      const eligibleItems = items.filter(i => 
        triggerProductIds.includes(i.menu_id) || 
        triggerCategoryIds.includes(i.categoryId)
      );
      
      const totalEligibleQty = eligibleItems.reduce((sum, i) => sum + (i.qty || 0), 0);
      
      if (totalEligibleQty >= X) {
        const timesApplied = Math.floor(totalEligibleQty / X);
        const freeUnits = timesApplied * Y;
        const freeProduct = items.find(i => i.menu_id === action.freeProductId);
        if (freeProduct) {
          const actualFree = Math.min(freeUnits, freeProduct.qty);
          total = freeProduct.price * actualFree;
          itemDiscounts[freeProduct.cartItemId || freeProduct.id] = total;
        }
      }
      break;
    }
  }

  return { total, itemDiscounts };
}
