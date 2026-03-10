-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'MANAGER', 'CASHIER', 'KITCHEN', 'STAFF');

-- CreateEnum
CREATE TYPE "PlatformType" AS ENUM ('OFFLINE', 'DELIVERY');

-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CASHIER',
    "pin" TEXT,
    "phone_number" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "profile_photo" TEXT,
    "employee_id" TEXT,
    "notes" TEXT,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_activity_log" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "action_type" TEXT NOT NULL,
    "description" TEXT,
    "ip_address" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_shift" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_time" TIMESTAMP(3),
    "starting_cash" INTEGER NOT NULL DEFAULT 0,
    "ending_cash" INTEGER,
    "expected_cash" INTEGER DEFAULT 0,
    "discrepancy" INTEGER DEFAULT 0,
    "note" TEXT,
    "cash_breakdown" JSONB,
    "total_sales" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "user_shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storeconfig" (
    "id" SERIAL NOT NULL,
    "store_name" TEXT NOT NULL DEFAULT 'BAKMIE YOU-TJE',
    "address" TEXT DEFAULT 'Jl. Bakung No. 123, Jakarta',
    "phone" TEXT DEFAULT '0812-3456-7890',
    "receipt_footer" TEXT DEFAULT 'Thank you for visiting!
Please come again.',
    "tax_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "service_charge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storeconfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "cost" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "categoryId" INTEGER,

    CONSTRAINT "menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menucategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,

    CONSTRAINT "menucategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PlatformType" NOT NULL DEFAULT 'OFFLINE',
    "commission_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menuprice" (
    "id" SERIAL NOT NULL,
    "menu_id" INTEGER NOT NULL,
    "platform_id" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,

    CONSTRAINT "menuprice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order" (
    "id" SERIAL NOT NULL,
    "order_number" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total" INTEGER NOT NULL,
    "commission" INTEGER NOT NULL DEFAULT 0,
    "net_revenue" INTEGER NOT NULL DEFAULT 0,
    "platform_id" INTEGER,
    "payment_method" TEXT NOT NULL DEFAULT 'CASH',
    "money_received" INTEGER NOT NULL DEFAULT 0,
    "change_amount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "note" TEXT,
    "customer_name" TEXT,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "created_by_user_id" INTEGER,
    "processed_by_user_id" INTEGER,

    CONSTRAINT "order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orderitem" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "menu_id" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "cost" INTEGER NOT NULL,

    CONSTRAINT "orderitem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "item" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT,

    CONSTRAINT "expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixedcost" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "frequency" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "fixedcost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cashierreconciliation" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "opening_cash" INTEGER NOT NULL DEFAULT 0,
    "closing_cash" INTEGER NOT NULL DEFAULT 0,
    "total_system" INTEGER NOT NULL DEFAULT 0,
    "total_actual" INTEGER NOT NULL DEFAULT 0,
    "discrepancy" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "submitted_by" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cashierreconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "menuprice_menu_id_platform_id_key" ON "menuprice"("menu_id", "platform_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_order_number_key" ON "order"("order_number");

-- CreateIndex
CREATE UNIQUE INDEX "cashierreconciliation_date_key" ON "cashierreconciliation"("date");

-- AddForeignKey
ALTER TABLE "user_activity_log" ADD CONSTRAINT "user_activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_shift" ADD CONSTRAINT "user_shift_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu" ADD CONSTRAINT "menu_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "menucategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menuprice" ADD CONSTRAINT "menuprice_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menuprice" ADD CONSTRAINT "menuprice_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "platform"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orderitem" ADD CONSTRAINT "orderitem_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orderitem" ADD CONSTRAINT "orderitem_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
