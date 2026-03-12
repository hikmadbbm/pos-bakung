/**
 * Unit conversion utility for kitchen measurements.
 */

const CONVERSIONS = {
  // Weight: base is grams
  kg: 1000,
  g: 1,
  gram: 1,
  kilogram: 1000,
  gr: 1,
  
  // Volume: base is ml
  l: 1000,
  ml: 1,
  liter: 1000,
  milliliter: 1,
  
  // Count: base is pcs
  pcs: 1,
  pc: 1,
  pack: 1, // Default assumption, though pack size varies. Better handled by manual input if complex.
};

/**
 * Standardizes units and converts quantities.
 * @param {number} qty - Input quantity
 * @param {string} fromUnit - Original unit
 * @param {string} toUnit - Target unit
 * @returns {number} Converted quantity
 */
export function convertQuantity(qty, fromUnit, toUnit) {
  const from = fromUnit?.toLowerCase();
  const to = toUnit?.toLowerCase();

  if (from === to) return qty;

  const fromFactor = CONVERSIONS[from];
  const toFactor = CONVERSIONS[to];

  // If we don't know the conversion factors, we can't convert accurately.
  // We return the original qty to avoid zeroing out costs in unknown cases.
  if (!fromFactor || !toFactor) return qty;

  // Conversion logic: base_quantity = qty * fromFactor
  // target_quantity = base_quantity / toFactor
  return (qty * fromFactor) / toFactor;
}

/**
 * Calculates cost per unit after unit normalization.
 * Example: Price is per kg, but we use 100g.
 * price_per_unit = 50000 (per kg)
 * purchase_unit = "kg"
 * usage_unit = "g"
 * usage_qty = 100
 * result = (50000 / 1000) * 100 = 5000
 */
export function calculateIngredientCost(purchasePrice, purchaseUnit, usageQty, usageUnit) {
  const pUnit = purchaseUnit?.toLowerCase();
  const uUnit = usageUnit?.toLowerCase();

  if (pUnit === uUnit) return purchasePrice * usageQty;

  const pFactor = CONVERSIONS[pUnit];
  const uFactor = CONVERSIONS[uUnit];

  if (!pFactor || !uFactor) return purchasePrice * usageQty;

  // Normalization: cost per 1 base unit
  const costPerBase = purchasePrice / pFactor;
  // Total cost = cost per 1 base unit * (usage in base units)
  return costPerBase * (usageQty * uFactor);
}
