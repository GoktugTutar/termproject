-- CreateTable
CREATE TABLE "InsightAnswer" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "questionType" TEXT NOT NULL,
    "lessonId" INTEGER,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsightAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InsightAnswer_userId_questionType_idx" ON "InsightAnswer"("userId", "questionType");

-- AddForeignKey
ALTER TABLE "InsightAnswer" ADD CONSTRAINT "InsightAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
