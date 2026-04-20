# 🚀 PROMOTION ENGINE & UI BUILDER DOCUMENTATION

## 📌 Overview
This document defines the full system design for a **Rule-Based Promotion Engine** integrated with POS and Online Platforms (Grab, GoFood, etc).

---

# 🧠 1. CORE CONCEPT
Each promotion is structured as:

```
Promotion = Conditions + Actions + Constraints + Priority
```

---

# 🗂️ 2. DATA STRUCTURE

## 2.1 Promotion
```
Promotion {
  id
  name
  description
  type
  status

  startDate
  endDate
  daysActive
  timeStart
  timeEnd

  priority
  stackable

  source

  maxUsagePerDay
  maxUsagePerCustomer
}
```

## 2.2 Conditions
```
PromotionCondition {
  promotionId
  minTransactionAmount
  minItemQuantity
  productIds[]
  categoryIds[]
  paymentMethods[]
  customerType
  orderType
  platform
}
```

## 2.3 Actions
```
PromotionAction {
  promotionId
  actionType
  value
  maxDiscount
  freeProductId
  bundleItems[]
}
```

## 2.4 Constraints
```
PromotionConstraint {
  promotionId
  cannotCombineWith[]
  onlyApplyOnce
  maxDiscountPerTransaction
  excludeProducts[]
}
```

---

# 🔥 3. PROMO TYPES

## 3.1 Product Promo
- Discount per item

## 3.2 Cart Promo
- Minimum purchase discount

## 3.3 Bundling (Enhanced)

### Types:
- Fixed Bundle (A+B+C = price)
- Dynamic Bundle (choose items)
- Buy X Get Y

### Improvements:
- Auto-detect bundle in cart
- Allow mix & match
- Support multiple bundle tiers

Example:
```
Buy 2 Coffee → Free 1
Buy 3 → Discount 20%
```

---

# ⚙️ 4. PROMO ENGINE FLOW

```
1. Load active promos
2. Filter by time/platform
3. Validate conditions
4. Rank by priority
5. Apply:
   - stackable → combine
   - non-stackable → best value
6. Return result
```

---

# 🧠 5. CORE FUNCTIONS (PSEUDO CODE)

## 5.1 Validate Condition
```
function validateCondition(promo, cart) {
  check minTransaction
  check product match
  check payment
  return true/false
}
```

## 5.2 Apply Promo
```
function applyPromo(promo, cart) {
  switch(actionType) {
    case 'PERCENT_DISCOUNT'
    case 'FIXED_DISCOUNT'
    case 'BUNDLE'
  }
}
```

## 5.3 Best Promo Selector
```
function getBestPromo(promos, cart) {
  simulate all
  pick highest discount
}
```

---

# 🎨 6. UI/UX STRUCTURE

## 6.1 Main Layout

```
Left Panel | Canvas | Right Panel
```

## 6.2 Left Panel
- Conditions
- Actions
- Logic blocks

## 6.3 Canvas

```
IF
  Conditions
THEN
  Actions
```

## 6.4 Right Panel
- Schedule
- Platform
- Priority
- Limits

---

# 🧪 7. SIMULATION PANEL

```
Cart Preview
Applied Promo
Discount Breakdown
Final Price
```

---

# 🐞 8. DEBUG MODE

```
Promo A → Not applied (reason)
Promo B → Applied
```

---

# 📱 9. MOBILE UI

- Tab based:
  - Conditions
  - Actions
  - Settings

---

# 🤖 10. AI INTEGRATION (GEMINI READY)

## Features:
- Smart bundling suggestion
- Promo optimization
- Profit analysis

## Example:
```
Suggest bundle for slow-moving items
```

---

# 🔗 11. INTEGRATION FLOW

```
Cart → Promo Engine → Final Price → Payment
```

---

# ⚠️ 12. EDGE CASES

- Promo conflict
- Over discount
- Stock issues
- Expired promo

---

# 🚀 13. PERFORMANCE

- Cache promos
- Precompute rules
- Minimize DB calls

---

# 🔗 11. INTEGRATION FLOW

```
Cart → Promo Engine → Final Price → Payment
```

---

# 🧠 12. SALES CHANNEL vs PROMOTION (IMPORTANT ARCHITECTURE)

## Separation Principle

System must strictly separate:

### A. Sales Channel (Static Cost Layer)
```
SalesChannel {
  id
  name
  type (OFFLINE | ONLINE)
  commissionPercent
  additionalFee
}
```

Purpose:
- Represent platform cost (Grab, GoFood, Shopee)
- Always applied
- Not tied to promo logic

---

### B. Promotion Engine (Dynamic Logic)

Handled entirely by Promotion module:
- Discount
- Voucher
- Bundling
- Campaign

---

### C. Channel Campaign (Optional Advanced Layer)

```
ChannelCampaign {
  id
  channelId
  name
  type (PLATFORM_PROMO | ADS | VOUCHER)
  costType (PERCENT | FIXED)
  value
  costBearer (MERCHANT | PLATFORM | SHARED)
}
```

Purpose:
- Track external campaign cost
- Separate marketing cost vs discount logic

---

## Final Pricing Flow

```
Base Price
   ↓
Channel Cost (commission)
   ↓
Promotion Engine (discount/bundle)
   ↓
Final Price
   ↓
Net Revenue Calculation
```

---

## Why This Matters

- Accurate profit calculation
- Clean data separation
- AI-ready analytics
- Support multi-platform sync

---

# ⚠️ 13. EDGE CASES

- Promo conflict
- Over discount
- Stock issues
- Expired promo

---

# 🚀 14. PERFORMANCE

- Cache promos
- Precompute rules
- Minimize DB calls

---

# 📌 FINAL GOAL

Build a scalable Promotion Engine that:
- Works for POS & Online
- Supports complex rules
- AI-ready
- Easy to maintain

