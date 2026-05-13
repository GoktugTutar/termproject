-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completionRate7d" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgStress7d" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "avgFatigue7d" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "dowCompletionRates" TEXT NOT NULL DEFAULT '[0,0,0,0,0,0,0]',
    "sweetSpotBlocks" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "stressNearExam" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "consistencyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSubmissions" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
