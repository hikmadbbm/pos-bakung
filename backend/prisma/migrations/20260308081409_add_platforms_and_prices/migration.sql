-- AlterTable
ALTER TABLE `order` ADD COLUMN `commission` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `net_revenue` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `platform_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `Platform` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('OFFLINE', 'DELIVERY') NOT NULL DEFAULT 'OFFLINE',
    `commission_rate` DOUBLE NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MenuPrice` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `menu_id` INTEGER NOT NULL,
    `platform_id` INTEGER NOT NULL,
    `price` INTEGER NOT NULL,

    UNIQUE INDEX `MenuPrice_menu_id_platform_id_key`(`menu_id`, `platform_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MenuPrice` ADD CONSTRAINT `MenuPrice_menu_id_fkey` FOREIGN KEY (`menu_id`) REFERENCES `Menu`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MenuPrice` ADD CONSTRAINT `MenuPrice_platform_id_fkey` FOREIGN KEY (`platform_id`) REFERENCES `Platform`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_platform_id_fkey` FOREIGN KEY (`platform_id`) REFERENCES `Platform`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
