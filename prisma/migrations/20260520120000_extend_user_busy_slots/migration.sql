-- AlterTable
ALTER TABLE "UserBusySlot"
ADD COLUMN     "isRoutine" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "date" TIMESTAMP(3),
ADD COLUMN     "iconKey" TEXT NOT NULL DEFAULT 'energy';
