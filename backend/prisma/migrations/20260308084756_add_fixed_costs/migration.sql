-- DropForeignKey
ALTER TABLE `menu` DROP FOREIGN KEY `Menu_categoryId_fkey`;

-- DropForeignKey
ALTER TABLE `menuprice` DROP FOREIGN KEY `MenuPrice_menu_id_fkey`;

-- DropForeignKey
ALTER TABLE `menuprice` DROP FOREIGN KEY `MenuPrice_platform_id_fkey`;

-- DropForeignKey
ALTER TABLE `order` DROP FOREIGN KEY `Order_platform_id_fkey`;

-- DropForeignKey
ALTER TABLE `orderitem` DROP FOREIGN KEY `OrderItem_menu_id_fkey`;

-- DropForeignKey
ALTER TABLE `orderitem` DROP FOREIGN KEY `OrderItem_order_id_fkey`;

-- CreateTable
CREATE TABLE `fixedcost` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `frequency` ENUM('DAILY', 'WEEKLY', 'MONTHLY') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `menu` ADD CONSTRAINT `menu_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `menucategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `menuprice` ADD CONSTRAINT `menuprice_menu_id_fkey` FOREIGN KEY (`menu_id`) REFERENCES `menu`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `menuprice` ADD CONSTRAINT `menuprice_platform_id_fkey` FOREIGN KEY (`platform_id`) REFERENCES `platform`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order` ADD CONSTRAINT `order_platform_id_fkey` FOREIGN KEY (`platform_id`) REFERENCES `platform`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orderitem` ADD CONSTRAINT `orderitem_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orderitem` ADD CONSTRAINT `orderitem_menu_id_fkey` FOREIGN KEY (`menu_id`) REFERENCES `menu`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `menuprice` RENAME INDEX `MenuPrice_menu_id_platform_id_key` TO `menuprice_menu_id_platform_id_key`;

-- RenameIndex
ALTER TABLE `user` RENAME INDEX `User_email_key` TO `user_email_key`;
