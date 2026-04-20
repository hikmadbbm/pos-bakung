import { prisma } from './prisma';

/**
 * Main function to evaluate and apply the best promotions for a given order/cart.
 */
export async function evaluatePromotions(orderData) {
  const { items, platform_id, payment_method, customer_type, order_type, subtotal } = orderData;
  
  // 1. Fetch active promotions with their components
  const activePromos = await prisma.promotion.findMany({
    where: {
      status: 'ACTIVE',
      AND: [
        {
          OR: [
            { startDate: null },
            { startDate: { lte: new Date() } }
          ]
        },
        {
          OR: [
            { endDate: null },
            { endDate: { gte: new Date() } }
          ]
        }
      ]
    },
    include: {
      conditions: true,
      actions: true,
      constraints: true
    },
    orderBy: { priority: 'desc' }
  });


  // 2. Filter by time/day
  const now = new Date();
  const dayOfWeek = (now.getDay() === 0 ? 7 : now.getDay()); // 1-7 (Mon-Sun)
  const timeStr = now.toTimeString().slice(0, 5); // "HH:MM"

  const filteredPromos = activePromos.filter(promo => {
    // Days check
    if (promo.daysActive) {
      const activeDays = promo.daysActive.split(',').map(d => d.trim());
      if (!activeDays.includes(dayOfWeek.toString())) return false;
    }
    
    // Time check
    if (promo.timeStart && timeStr < promo.timeStart) return false;
    if (promo.timeEnd && timeStr > promo.timeEnd) return false;
    
    return true;
  });

  const eligiblePromos = [];

  // 3. Validate Conditions
  for (const promo of filteredPromos) {
    if (validateConditions(promo, orderData)) {
      const discountAmount = calculateDiscount(promo, orderData);
      if (discountAmount > 0) {
        eligiblePromos.push({
          ...promo,
          appliedAmount: discountAmount
        });
      }
    }
  }

  if (eligiblePromos.length === 0) return { totalDiscount: 0, appliedPromos: [] };

  // 4. Ranking & Selection Logic
  const stackable = eligiblePromos.filter(p => p.stackable);
  const nonStackable = eligiblePromos.filter(p => !p.stackable);

  let appliedPromos = [];
  
  // Logic: Combined stackables + the best non-stackable
  appliedPromos = [...stackable];

  if (nonStackable.length > 0) {
    const bestNonStackable = nonStackable.reduce((prev, current) => 
      (prev.appliedAmount > current.appliedAmount) ? prev : current
    );
    
    // Handle "cannotCombineWith" constraints
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

  return {
    totalDiscount,
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

  // Min Transaction
  if (conditions.minTransactionAmount && subtotal < conditions.minTransactionAmount) return false;

  // Item Quantities
  const totalQty = items.reduce((sum, i) => sum + (i.qty || 0), 0);
  if (conditions.minItemQuantity && totalQty < conditions.minItemQuantity) return false;

  // Specific Products
  if (conditions.productIds && conditions.productIds.length > 0) {
    const hasRequiredProduct = items.some(i => conditions.productIds.includes(i.menu_id));
    if (!hasRequiredProduct) return false;
  }

  // Categories
  if (conditions.categoryIds && conditions.categoryIds.length > 0) {
    const itemCategoryIds = items.map(i => i.categoryId);
    const hasRequiredCategory = itemCategoryIds.some(cid => conditions.categoryIds.includes(cid));
    if (!hasRequiredCategory) return false;
  }

  // Payment Methods
  if (conditions.paymentMethods && conditions.paymentMethods.length > 0) {
    if (!conditions.paymentMethods.includes(payment_method)) return false;
  }

  // Order Type & Platform
  if (conditions.orderType && order_type !== conditions.orderType) return false;
  if (conditions.platform && String(platform_id) !== String(conditions.platform)) return false;

  return true;
}

function calculateDiscount(promo, orderData) {
  const { items, subtotal } = orderData;
  const action = promo.actions[0];
  if (!action) return 0;

  let discount = 0;

  switch (action.actionType) {
    case 'PERCENT_DISCOUNT':
      discount = Math.round(subtotal * (action.value / 100));
      if (action.maxDiscount && discount > action.maxDiscount) {
        discount = action.maxDiscount;
      }
      break;
    
    case 'FIXED_DISCOUNT':
      discount = action.value;
      break;
    
    case 'FREE_ITEM':
      const freeItem = items.find(i => i.menu_id === action.freeProductId);
      if (freeItem) {
        discount = freeItem.price;
      }
      break;

    case 'FLAT_PRICE':
      discount = subtotal - action.value;
      break;

    case 'BUY_X_GET_Y':
      // Example: Buy 2 (X) get 1 (Y) free
      // Conditions must specify the triggering products/categories
      const conditions = promo.conditions[0];
      const triggerProductIds = conditions?.productIds || [];
      const triggerCategoryIds = conditions?.categoryIds || [];
      const X = action.triggerQty || conditions?.minItemQuantity || 1;
      const Y = action.freeQty || 1;
      
      const eligibleItems = items.filter(i => 
        triggerProductIds.includes(i.menu_id) || 
        triggerCategoryIds.includes(i.categoryId)
      );
      
      const totalEligibleQty = eligibleItems.reduce((sum, i) => sum + (i.qty || 0), 0);
      
      if (totalEligibleQty >= X) {
        // How many free items can they get? (Floor(Total/X) * Y)
        const timesApplied = Math.floor(totalEligibleQty / X);
        const freeUnits = timesApplied * Y;
        
        // Find the free product in the cart
        const freeProduct = items.find(i => i.menu_id === action.freeProductId);
        if (freeProduct) {
          // Discount is Price * min(freeUnits, freeProduct.qty)
          discount = freeProduct.price * Math.min(freeUnits, freeProduct.qty);
        }
      }
      break;
  }

  return Math.max(0, discount);
}
