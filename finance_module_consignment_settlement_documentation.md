# 💰 FINANCE MODULE — CONSIGNMENT SETTLEMENT SYSTEM

## 📌 Overview
This module is designed to handle **financial tracking for consignment products (produk titipan)**, specifically focusing on:

- Tracking expected income (accrual)
- Tracking actual received cash (cash basis)
- Monitoring outstanding payments

This module ensures accurate **cashflow visibility** and prevents misleading profit reporting.

---

# 🎯 OBJECTIVE

Build a dedicated **Finance / Settlement module** that:

- Separates *expected income* vs *actual cash received*
- Allows manual confirmation of payments
- Tracks unpaid (outstanding) consignment income
- Integrates with dashboard and reporting

---

# 🧩 MODULE STRUCTURE

```
Finance
├── Consignment Settlement
├── Payment Tracking
├── Outstanding Summary
```

---

# 🗂️ DATABASE STRUCTURE

## ConsignmentDailyLog (Enhanced)

```
ConsignmentDailyLog {
  id
  consignmentId

  date

  expectedIncome
  actualReceived

  status (PENDING | RECEIVED)

  receivedAt
  notes

  createdAt
}
```

---

# ⚙️ CORE LOGIC

## 1. Daily Auto Generation

System must automatically generate daily record:

```
expectedIncome = fixedDailyFee
status = PENDING
```

Even if there are no sales.

---

## 2. Payment Confirmation

When user clicks "Mark as Received":

```
actualReceived = expectedIncome
status = RECEIVED
receivedAt = current timestamp
```

---

## 3. Partial Payment (Optional Future)

```
actualReceived < expectedIncome
status = PARTIAL
```

---

# 📊 DASHBOARD INTEGRATION

## Display 3 Key Metrics:

### 1. Expected Income
```
Total expected consignment income
```

### 2. Received Cash
```
Total confirmed payments
```

### 3. Outstanding
```
Expected - Received
```

---

# 🖥️ UI / UX DESIGN

## 1. Main Page — Consignment Settlement

```
Date        Product      Status     Amount     Action
-----------------------------------------------------
14 Apr      Es Teller    PENDING    50.000     [Mark as Received]
13 Apr      Es Teller    RECEIVED   50.000     ✓
```

---

## 2. Summary Panel (Top Section)

```
Total Expected     : Rp 150.000
Total Received     : Rp 100.000
Outstanding        : Rp 50.000
```

---

## 3. Actions

- Mark as Received
- Bulk Confirm Payments
- Add Notes

---

## 4. Status Indicators

```
PENDING   → Red
RECEIVED  → Green
PARTIAL   → Yellow (optional)
```

---

# 🔄 USER FLOW

```
1. System generates daily expected income
2. User opens Finance module
3. Sees pending payments
4. Confirms payment when received
5. Dashboard updates automatically
```

---

# 🛡️ FAILSAFE LOGIC

- Missing consignment config → ignore safely
- No payment → remain PENDING
- Expired contract → stop generating new records

---

# ⚠️ EDGE CASES

- No sales but still expected income
- Multiple consignment products
- Late payments (multi-day outstanding)
- Bulk payment for multiple days

---

# 🚀 PERFORMANCE CONSIDERATION

- Generate daily logs once per day
- Avoid recalculation on every request
- Cache summary data if needed

---

# 🔮 FUTURE EXTENSIONS

- Payment reminder system
- AI analysis (late payment behavior)
- Multi-partner tracking
- Integration with full accounting module

---

# 🎯 FINAL GOAL

- Clear separation between income and cashflow
- Accurate financial reporting
- Scalable finance module for future features
