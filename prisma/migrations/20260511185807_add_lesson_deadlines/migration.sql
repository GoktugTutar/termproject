-- CreateTable
CREATE TABLE "LessonDeadline" (
    "id" SERIAL NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "deadlineDate" TIMESTAMP(3) NOT NULL,
    "title" TEXT,

    CONSTRAINT "LessonDeadline_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LessonDeadline" ADD CONSTRAINT "LessonDeadline_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
