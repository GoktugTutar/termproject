-- CreateTable
CREATE TABLE "LessonPlanOverride" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "lessonId" INTEGER,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "priorityBoost" INTEGER NOT NULL DEFAULT 0,
    "preferEarlySlot" BOOLEAN NOT NULL DEFAULT false,
    "maxSessionBlocks" INTEGER,
    "multiplierOverride" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonPlanOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonPlanOverride_userId_weekStart_idx" ON "LessonPlanOverride"("userId", "weekStart");

-- AddForeignKey
ALTER TABLE "LessonPlanOverride" ADD CONSTRAINT "LessonPlanOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
