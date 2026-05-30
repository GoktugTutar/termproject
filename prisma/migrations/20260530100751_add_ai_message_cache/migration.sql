-- CreateTable
CREATE TABLE "AIMessageCache" (
    "userId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIMessageCache_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "AIMessageCache" ADD CONSTRAINT "AIMessageCache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
