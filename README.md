# Bakung POS & Business Management System

A premium, high-density Point of Sale and Business Intelligence platform designed for modern F&B establishments. This system synchronizes front-of-house operations with back-office financial tracking, inventory management, and recipe-level cost analysis.

---

## 🚀 Overview

The **Bakung POS** is more than just a cash register. It is a comprehensive business management suite that empowers owners and managers with real-time data to optimize operations, reduce waste, and maximize profitability.

### Key Capabilities:
*   **Dynamic POS**: Fast, touch-optimized interface for high-volume transactions.
*   **Inventory Intelligence**: Real-time stock tracking with automated ingredient deduction.
*   **Recipe & HPP Analytics**: Precise "Harga Pokok Penjualan" (COGS) calculation down to every gram/ml.
*   **Financial Integrity**: Multi-layered reconciliation (System vs. Actual) to prevent leakage.
*   **Omni-channel Ready**: Seamlessly manage Direct, GrabFood, GoFood, and ShopeeFood sales in one place.

---

## 🛠️ Core Modules

### 1. Point of Sale (POS)
The heart of the operation. Designed for speed and reliability.
*   **Smart Cart**: Intelligent item grouping and multi-platform price adjustment.
*   **Shift Protocol**: Mandatory shift initialization with drawer fund verification to ensure financial accountability.
*   **Payment Hub**: Supports Cash, QRIS (with dynamic QR generation), and Online Platform integrations.
*   **Pending Orders**: Ability to save "on-hold" transactions for later settlement.

### 2. Transaction Logs & History
A transparent archive of every business event.
*   **Real-time Filters**: Drill down by date, platform, or order status.
*   **Sales Stats**: Instant Gross Sales and Net Revenue visualization for the selected period.
*   **Audit Trail**: Detailed view of every item, discount, and payment method used.

### 3. Inventory & Purchase Management
Track your resources from procurement to consumption.
*   **Ingredient Ledger**: Manage raw materials with unit conversion (e.g., buying in sacks, using in grams).
*   **Purchase Tracking**: Log new stock arrivals with automated price history updates.
*   **Stock Movement**: Detailed logs of every "In," "Out," and "Adjustment" event.

### 4. Recipe Builder & HPP Calculator
The "Brain" of your profitability strategy.
*   **Recipe Engineering**: Link menu items to specific ingredients or sub-components.
*   **Dynamic COGS**: Automatic HPP updates when ingredient prices change.
*   **Fixed Cost Allocation**: Distribute monthly overheads (rent, electricity) across your production volume for true profit analysis.

### 5. Cashier Reconciliation (Shift Report)
Ensuring the numbers always add up.
*   **End-of-Day Closing**: Comparative analysis between System Expected Cash and Actual Cash in Drawer.
*   **Variance Tracking**: Automatic detection of discrepancies with mandatory note requirements for audits.
*   **Platform Split**: Detailed breakdown of sales source (Direct vs. Third-party delivery).

### 6. Kitchen Display System (KDS)
Streamlining back-of-house communications.
*   **Live Order Stream**: Real-time delivery of orders from POS to Kitchen.
*   **Status Management**: Track items from "Preparing" to "Ready" to "Served."

---

## 📊 Business Terminology

*   **Gross Sales**: The total value of all items sold before any deductions.
*   **Net Revenue**: Total sales minus discounts and platform commissions.
*   **HPP (Harga Pokok Penjualan)**: The direct cost of producing a menu item (COGS).
*   **Starting Cash**: The initial money placed in the drawer at the start of a shift.
*   **Discrepancy**: The difference between what the system says should be in the drawer and what is actually there.

---

## 💻 Technology Stack

*   **Frontend**: Next.js 14+, Tailwind CSS, Lucide Icons.
*   **Backend**: Node.js Runtime (API Routes).
*   **Database**: PostgreSQL with Prisma ORM.
*   **Auth**: Role-based access control (OWNER, MANAGER, CASHIER, KITCHEN).

---

## 🚦 Getting Started

### Prerequisites
*   Node.js (v18+)
*   PostgreSQL Instance

### Local Installation
1.  Clone the repository.
2.  Install dependencies: `npm install`.
3.  Configure `.env` with your `DATABASE_URL` and `JWT_SECRET`.
4.  Run Prisma migrations: `npx prisma migrate dev`.
5.  Start the development server: `npm run dev`.

---

© 2026 HikmadBBM / Bakung POS. All Rights Reserved.
