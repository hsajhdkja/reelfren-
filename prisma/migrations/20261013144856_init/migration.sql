-- CreateTable
CREATE TABLE `Drama` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(200) NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    `rating` VARCHAR(10) NOT NULL,
    `description` TEXT NOT NULL,
    `image` VARCHAR(200) NOT NULL,
    `tag` VARCHAR(50) NOT NULL,

    INDEX `Drama_category_idx`(`category`),
    INDEX `Drama_title_idx`(`title`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Episode` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `number` INTEGER NOT NULL,
    `title` VARCHAR(100) NOT NULL,
    `videoUrl` VARCHAR(500) NOT NULL,
    `dramaId` INTEGER NOT NULL,

    INDEX `Episode_dramaId_idx`(`dramaId`),
    UNIQUE INDEX `Episode_dramaId_number_key`(`dramaId`, `number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Episode` ADD CONSTRAINT `Episode_dramaId_fkey` FOREIGN KEY (`dramaId`) REFERENCES `Drama`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
