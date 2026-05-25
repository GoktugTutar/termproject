-- CreateEnum
CREATE TYPE "ExamFailReason" AS ENUM ('insufficient_preparation', 'poor_understanding', 'exam_anxiety', 'time_management_in_exam', 'poor_sleep_before', 'overwhelmed_by_workload', 'lack_of_focus');

-- AlterTable
ALTER TABLE "ChecklistItem" ADD COLUMN     "isReview" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ExamResult" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "examId" INTEGER NOT NULL,
    "grade" TEXT,
    "satisfied" BOOLEAN,
    "failReason" "ExamFailReason",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExamResult_userId_lessonId_idx" ON "ExamResult"("userId", "lessonId");

-- CreateIndex
CREATE INDEX "ExamResult_userId_examId_idx" ON "ExamResult"("userId", "examId");

-- AddForeignKey
ALTER TABLE "ExamResult" ADD CONSTRAINT "ExamResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamResult" ADD CONSTRAINT "ExamResult_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamResult" ADD CONSTRAINT "ExamResult_examId_fkey" FOREIGN KEY ("examId") REFERENCES "LessonExam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
