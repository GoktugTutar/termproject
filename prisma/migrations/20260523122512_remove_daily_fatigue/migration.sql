/*
  Warnings:

  - You are about to drop the column `fatigueLevel` on the `DailyChecklist` table. All the data in the column will be lost.
  - You are about to drop the column `avgFatigue7d` on the `StudentProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DailyChecklist" DROP COLUMN "fatigueLevel";

-- AlterTable
ALTER TABLE "StudentProfile" DROP COLUMN "avgFatigue7d";
