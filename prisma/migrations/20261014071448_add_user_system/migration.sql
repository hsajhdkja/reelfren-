-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(200) NOT NULL,
    `passwordHash` VARCHAR(200) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Favorite` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `dramaId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Favorite_userId_dramaId_key`(`userId`, `dramaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WatchProgress` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `episodeId` INTEGER NOT NULL,
    `positionSec` DOUBLE NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `WatchProgress_userId_episodeId_key`(`userId`, `episodeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Favorite` ADD CONSTRAINT `Favorite_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Favorite` ADD CONSTRAINT `Favorite_dramaId_fkey` FOREIGN KEY (`dramaId`) REFERENCES `Drama`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WatchProgress` ADD CONSTRAINT `WatchProgress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WatchProgress` ADD CONSTRAINT `WatchProgress_episodeId_fkey` FOREIGN KEY (`episodeId`) REFERENCES `Episode`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
