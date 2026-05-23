/*
  Warnings:

  - A unique constraint covering the columns `[userId,lessonId,weekStart]` on the table `LessonPlanOverride` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "LessonPlanOverride_userId_lessonId_weekStart_key" ON "LessonPlanOverride"("userId", "lessonId", "weekStart");
