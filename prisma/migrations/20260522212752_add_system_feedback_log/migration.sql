-- CreateTable
CREATE TABLE "SystemFeedbackLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "lessonId" INTEGER,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemFeedbackLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SystemFeedbackLog_userId_type_lessonId_idx" ON "SystemFeedbackLog"("userId", "type", "lessonId");

-- AddForeignKey
ALTER TABLE "SystemFeedbackLog" ADD CONSTRAINT "SystemFeedbackLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
