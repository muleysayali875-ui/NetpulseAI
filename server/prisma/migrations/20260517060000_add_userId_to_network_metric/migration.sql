-- AlterTable: Add userId column to NetworkMetric (nullable first so existing rows don't break)
ALTER TABLE `NetworkMetric` ADD COLUMN `userId` INTEGER NULL;

-- Assign existing orphan metrics to user id=1 as a safe default (or delete them)
-- If there are no existing users this will be a no-op for the FK step
UPDATE `NetworkMetric` SET `userId` = (SELECT MIN(`id`) FROM `User`) WHERE `userId` IS NULL;

-- Now make the column required
ALTER TABLE `NetworkMetric` MODIFY `userId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `NetworkMetric` ADD CONSTRAINT `NetworkMetric_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX `NetworkMetric_userId_idx` ON `NetworkMetric`(`userId`);
