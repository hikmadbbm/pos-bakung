/*
  Warnings:

  - You are about to alter the column `category` on the `expense` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(1))` to `VarChar(191)`.
  - You are about to drop the column `created_at` on the `fixedcost` table. All the data in the column will be lost.
  - You are about to alter the column `frequency` on the `fixedcost` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(2))` to `VarChar(191)`.
  - Added the required column `updated_at` to the `user` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `expense` ADD COLUMN `description` VARCHAR(191) NULL,
    MODIFY `category` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `fixedcost` DROP COLUMN `created_at`,
    ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true,
    MODIFY `frequency` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `order` ADD COLUMN `created_by_user_id` INTEGER NULL,
    ADD COLUMN `customer_name` VARCHAR(191) NULL,
    ADD COLUMN `processed_by_user_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `employee_id` VARCHAR(191) NULL,
    ADD COLUMN `last_login` DATETIME(3) NULL,
    ADD COLUMN `notes` VARCHAR(191) NULL,
    ADD COLUMN `phone_number` VARCHAR(191) NULL,
    ADD COLUMN `pin` VARCHAR(191) NULL,
    ADD COLUMN `profile_photo` VARCHAR(191) NULL,
    ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL,
    MODIFY `role` ENUM('OWNER', 'MANAGER', 'CASHIER', 'KITCHEN', 'STAFF') NOT NULL DEFAULT 'CASHIER';

-- CreateTable
CREATE TABLE `user_activity_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `action_type` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `ip_address` VARCHAR(191) NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_shift` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `start_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `end_time` DATETIME(3) NULL,
    `starting_cash` INTEGER NOT NULL DEFAULT 0,
    `ending_cash` INTEGER NULL,
    `total_sales` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'OPEN',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `storeconfig` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `store_name` VARCHAR(191) NOT NULL DEFAULT 'BAKMIE YOU-TJE',
    `address` VARCHAR(191) NULL DEFAULT 'Jl. Bakung No. 123, Jakarta',
    `phone` VARCHAR(191) NULL DEFAULT '0812-3456-7890',
    `receipt_footer` VARCHAR(191) NULL DEFAULT 'Thank you for visiting!
Please come again.',
    `tax_rate` DOUBLE NOT NULL DEFAULT 0,
    `service_charge` DOUBLE NOT NULL DEFAULT 0,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cashierreconciliation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATETIME(3) NOT NULL,
    `opening_cash` INTEGER NOT NULL DEFAULT 0,
    `closing_cash` INTEGER NOT NULL DEFAULT 0,
    `total_system` INTEGER NOT NULL DEFAULT 0,
    `total_actual` INTEGER NOT NULL DEFAULT 0,
    `discrepancy` INTEGER NOT NULL DEFAULT 0,
    `notes` VARCHAR(191) NULL,
    `submitted_by` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'SUBMITTED',
    `details` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cashierreconciliation_date_key`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_activity_log` ADD CONSTRAINT `user_activity_log_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_shift` ADD CONSTRAINT `user_shift_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
